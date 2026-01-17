
import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, UserProfile, Contact, VibeSignal, VibePattern, VibeCategory, VibeAction, ChatMessage } from './types';
import SetupScreen from './components/SetupScreen';
import Dashboard from './components/Dashboard';
import PairingScreen from './components/PairingScreen';
import VibingScreen from './components/VibingScreen';
import { triggerHaptic, generateId, encryptMessage, decryptMessage, getChannelName } from './constants';
import * as Ably from 'ably';
import { requestForToken } from './src/firebase';
import { Activity } from 'lucide-react';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.SETUP);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  
  // Refs for Event Listener State Stability
  const contactsRef = useRef<Contact[]>([]);
  const userRef = useRef<UserProfile | null>(null);

  // Signals
  const [incomingVibe, setIncomingVibe] = useState<VibeSignal | null>(null);
  
  // Chat State (Hoisted)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Global States
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [onlineContacts, setOnlineContacts] = useState<Set<string>>(new Set());
  const [customPatterns, setCustomPatterns] = useState<VibePattern[]>([]);
  const [isGlobalHeartbeatActive, setIsGlobalHeartbeatActive] = useState(false);
  const [visualShake, setVisualShake] = useState(false);
  
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const wakeLockRef = useRef<any>(null);
  
  // Ref for chat open status to be accessible in callbacks
  const isChatOpenRef = useRef(false);

  // Sync Refs
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);
  useEffect(() => { userRef.current = user; }, [user]);
  useEffect(() => { isChatOpenRef.current = isChatOpen; }, [isChatOpen]);

  // Chat Message Pruning (5m TTL)
  useEffect(() => {
    const interval = setInterval(() => {
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        setChatMessages(prev => prev.filter(m => m.timestamp > fiveMinutesAgo));
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // --- INITIALIZATION ---
  useEffect(() => {
    const initApp = async () => {
      const savedUser = localStorage.getItem('vibe_user');
      const savedContacts = localStorage.getItem('vibe_contacts');
      const savedPatterns = localStorage.getItem('vibe_custom_patterns');
      
      let currentUser = savedUser ? JSON.parse(savedUser) : null;

      requestForToken().then((token) => {
        if (token && currentUser && currentUser.fcmToken !== token) {
           currentUser.fcmToken = token;
           setUser(currentUser); 
           localStorage.setItem('vibe_user', JSON.stringify(currentUser));
           initRealtime(currentUser.pairCode, token);
        }
      }).catch(err => console.warn("Token background fetch failed", err));
      
      if (currentUser) {
        setUser(currentUser); 
        setScreen(AppScreen.DASHBOARD);
        initRealtime(currentUser.pairCode, currentUser.fcmToken);
      }
      
      const parsedContacts = savedContacts ? JSON.parse(savedContacts) : [];
      setContacts(parsedContacts); 
      if (savedPatterns) setCustomPatterns(JSON.parse(savedPatterns));
    };

    initApp();

    // --- WAKELOCK & VISIBILITY ---
    const requestWakeLock = async () => {
      if ('wakeLock' in navigator && document.visibilityState === 'visible') {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) { /* Silent fail */ }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };

    // --- VISUAL HAPTIC LISTENER ---
    const handleVisualHaptic = () => {
       setVisualShake(true);
       setTimeout(() => setVisualShake(false), 200);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('vibe-visual-haptic', handleVisualHaptic);
    requestWakeLock();

    return () => {
      if (ablyRef.current) ablyRef.current.close();
      if (wakeLockRef.current) wakeLockRef.current.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('vibe-visual-haptic', handleVisualHaptic);
    };
  }, []);

  // --- HELPERS ---
  const saveCustomPattern = (pattern: VibePattern) => {
    const updated = [...customPatterns, pattern];
    setCustomPatterns(updated);
    localStorage.setItem('vibe_custom_patterns', JSON.stringify(updated));
  };

  const deleteCustomPattern = (id: string) => {
    const updated = customPatterns.filter(p => p.id !== id);
    setCustomPatterns(updated);
    localStorage.setItem('vibe_custom_patterns', JSON.stringify(updated));
  };

  const deleteContact = (id: string) => {
    const updated = contacts.filter(c => c.id !== id);
    setContacts(updated);
    localStorage.setItem('vibe_contacts', JSON.stringify(updated));
  };

  const resetApp = () => {
    if (confirm("Permanently reset your identity?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleUpdateUser = (newProfile: UserProfile) => {
    setUser(newProfile);
    localStorage.setItem('vibe_user', JSON.stringify(newProfile));
    initRealtime(newProfile.pairCode, newProfile.fcmToken);
  };

  // --- ABLY CONNECTION ---
  const initRealtime = async (myCode: string, myToken?: string) => {
    const apiKey = 'cEcwGg.Pi_Jyw:JfLxT0E1WUIDcC8ljuvIOSt0yWHcSki8gXHFvfwHOag'; 
    try {
      if (ablyRef.current) ablyRef.current.close();
      
      const ably = new Ably.Realtime({ key: apiKey, autoConnect: true, clientId: myCode });
      ablyRef.current = ably;

      ably.connection.on('connected', () => setConnectionStatus('connected'));
      ably.connection.on('failed', () => setConnectionStatus('error'));

      const channelName = await getChannelName(myCode);
      const myChannel = ably.channels.get(channelName);
      
      myChannel.subscribe('vibration', (message) => {
        receiveVibe(message.data as VibeSignal);
      });

      if (myToken) myChannel.presence.enter({ fcmToken: myToken });

      const refreshPresence = async () => {
        const currentContacts = contactsRef.current;
        let contactsUpdated = false;

        for (const c of currentContacts) {
           const contactChannelName = await getChannelName(c.pairCode);
           const contactChannel = ably.channels.get(contactChannelName);
           
           contactChannel.presence.get().then((members) => {
            setOnlineContacts(prev => {
              const next = new Set(prev);
              if (members && members.length > 0) {
                 next.add(c.pairCode);
                 const memberData = members[0].data;
                 if (memberData && memberData.fcmToken && memberData.fcmToken !== c.fcmToken) {
                    c.fcmToken = memberData.fcmToken;
                    contactsUpdated = true;
                 }
              } else {
                 next.delete(c.pairCode);
              }
              return next;
            });
            if (contactsUpdated) {
                localStorage.setItem('vibe_contacts', JSON.stringify(currentContacts));
                setContacts([...currentContacts]);
            }
          }).catch(() => {});
        }
      };
      
      const interval = setInterval(refreshPresence, 10000); 
      refreshPresence();
      return () => clearInterval(interval);
    } catch (err) {
      setConnectionStatus('error');
    }
  };

  // --- SIGNAL HANDLING LOGIC ---
  const receiveVibe = async (vibe: VibeSignal) => {
    const currentUser = userRef.current;
    const currentContacts = contactsRef.current;

    if (!currentUser) return;
    if (vibe.senderUniqueId && vibe.senderUniqueId === currentUser.id) return;
    if (vibe.senderId === currentUser.pairCode) return;
    
    const contact = currentContacts.find((c: Contact) => c.pairCode === vibe.senderId);
    if (!contact && vibe.senderId !== 'SYSTEM') return;

    // --- CHAT & SYSTEM MESSAGES ---
    if (vibe.category === 'chat') {
        if (vibe.action === 'text' && vibe.payload && contact) {
            const decrypted = await decryptMessage(vibe.payload, currentUser.pairCode, contact.pairCode);
            addChatMessage(vibe.id, vibe.senderId, decrypted, 'user', vibe.timestamp);
        } else if (vibe.action === 'clear') {
            setChatMessages([]);
        }
        return; // No vibration for chat
    }

    // --- INVITATIONS (CONVERT TO CHAT SYSTEM MESSAGE) ---
    if (vibe.action === 'invite') {
        const inviteText = `${vibe.senderName} invited you to ${vibe.category === 'matrix' ? 'Telepathy' : vibe.category}`;
        addChatMessage(vibe.id, 'SYSTEM', inviteText, 'system', vibe.timestamp);
        sendNotification(vibe);
        // PASS THROUGH: We still want the VibingScreen to see the invite to update mode if needed,
        // but strictly NO VIBRATION here.
    }

    // --- SIGNAL ROUTING ---
    switch (vibe.category) {
        case 'heartbeat':
            if (vibe.action === 'stop') setIsGlobalHeartbeatActive(false);
            else {
                setIsGlobalHeartbeatActive(true);
                // Vibrate only on data, not invites
                if (vibe.action === 'data' && vibe.count && vibe.count <= 10) triggerHaptic([50, 100, 50]);
            }
            setIncomingVibe(vibe);
            break;
            
        case 'draw':
        case 'breathe':
        case 'matrix':
            // No vibration for these modes' signals except touch interactions within them
            setIncomingVibe(vibe); 
            break;

        case 'touch':
            setIncomingVibe(vibe);
            // STRICT VIBRATION CHECK: Only Touch Data vibrates
            if (vibe.action === 'data') {
                if (vibe.touchType === 'tap') triggerHaptic(Array(vibe.count || 1).fill(100));
                if (vibe.touchType === 'hold') triggerHaptic(vibe.duration || 500);
                if (vibe.touchType === 'pattern' && vibe.patternData) triggerHaptic(vibe.patternData);
                sendNotification(vibe);
            }
            break;
    }
  };

  const addChatMessage = (id: string, senderId: string, text: string, type: 'user' | 'system', timestamp: number) => {
      setChatMessages(prev => [...prev, { id, senderId, text, timestamp, type }]);
      if (!isChatOpenRef.current) {
          setUnreadChatCount(prev => prev + 1);
      }
  };

  const handleToggleChat = (open: boolean) => {
      setIsChatOpen(open);
      if (open) setUnreadChatCount(0);
  };

  const sendNotification = (vibe: VibeSignal) => {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
         // Simple notification, non-intrusive
         if (vibe.action === 'invite' || vibe.category === 'touch') {
             const body = vibe.action === 'invite' ? `Invite: ${vibe.category}` : "Thinking of you";
             navigator.serviceWorker.ready.then(reg => {
                 reg.showNotification(vibe.senderName, { body, tag: 'vibe-msg' });
             });
         }
    }
  };

  const sendVibeToPartner = async (targetCode: string, vibe: VibeSignal) => {
    if (!ablyRef.current || !user) return;
    
    if (vibe.category === 'chat' && vibe.action === 'text' && vibe.payload) {
        vibe.payload = await encryptMessage(vibe.payload, user.pairCode, targetCode);
    }
    // Local Feedback
    if (vibe.category === 'touch' && vibe.action === 'data') triggerHaptic(50);

    const targetChannelName = await getChannelName(targetCode);
    const targetChannel = ablyRef.current.channels.get(targetChannelName);
    try { await targetChannel.publish('vibration', vibe); } catch (err) { console.error(err); }
  };

  const createAndSend = async (type: VibeCategory, action: VibeAction, payload: Partial<VibeSignal>) => {
      if (!activeContact || !user) return;
      const signal: VibeSignal = {
          id: generateId(), senderId: user.pairCode, senderUniqueId: user.id, senderName: user.displayName,
          timestamp: Date.now(), category: type, action: action, ...payload
      } as VibeSignal;
      await sendVibeToPartner(activeContact.pairCode, signal);
  };

  const handleGlobalStop = () => {
      setIsGlobalHeartbeatActive(false);
      createAndSend('heartbeat', 'stop', {});
  };

  const handleSendMessage = (text: string) => {
      if (!user) return;
      createAndSend('chat', 'text', { payload: text });
      addChatMessage(Date.now().toString(), user.pairCode, text, 'user', Date.now());
  };

  return (
    <div className={`min-h-screen h-full w-full flex flex-col no-select relative overflow-hidden bg-zinc-950 ${visualShake ? 'animate-shake' : ''}`}>
      <div className="w-full h-safe-top shrink-0 bg-transparent pointer-events-none" />
      
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
          {screen === AppScreen.SETUP && <SetupScreen onComplete={(p) => { setUser(p); setScreen(AppScreen.DASHBOARD); localStorage.setItem('vibe_user', JSON.stringify(p)); initRealtime(p.pairCode, undefined); }} />}
          
          {screen === AppScreen.DASHBOARD && user && (
            <Dashboard 
              user={user} contacts={contacts} status={connectionStatus} onlineContacts={onlineContacts}
              onAdd={() => setScreen(AppScreen.PAIRING)}
              onContactClick={(c) => { setActiveContact(c); setScreen(AppScreen.VIBING); }}
              onDeleteContact={deleteContact} onResetApp={resetApp} onUpdateUser={handleUpdateUser}
            />
          )}

          {screen === AppScreen.PAIRING && <PairingScreen onBack={() => setScreen(AppScreen.DASHBOARD)} onAdd={(c) => { const u = [...contacts, c]; setContacts(u); localStorage.setItem('vibe_contacts', JSON.stringify(u)); setScreen(AppScreen.DASHBOARD); }} />}
          
          {screen === AppScreen.VIBING && activeContact && user && (
            <VibingScreen 
              contact={activeContact} 
              user={user}
              onBack={() => setScreen(AppScreen.DASHBOARD)}
              incomingVibe={incomingVibe}
              onSendVibe={createAndSend}
              customPatterns={customPatterns}
              onSavePattern={saveCustomPattern}
              onDeletePattern={deleteCustomPattern}
              
              // Chat Props
              chatMessages={chatMessages}
              isChatOpen={isChatOpen}
              unreadCount={unreadChatCount}
              onToggleChat={handleToggleChat}
              onSendMessage={handleSendMessage}
              onClearChat={() => { setChatMessages([]); createAndSend('chat', 'clear', {}); }}
            />
          )}
      </div>

      {isGlobalHeartbeatActive && (
          <div className="fixed bottom-24 inset-x-0 flex justify-center z-[1000] pointer-events-auto">
              <button onClick={handleGlobalStop} className="bg-rose-500 text-white px-8 py-4 rounded-full font-bold shadow-[0_0_30px_rgba(244,63,94,0.6)] animate-pulse flex items-center gap-3 active:scale-95 transition-transform">
                  <Activity className="animate-bounce" /> <span>STOP PULSE</span>
              </button>
          </div>
      )}
      
      <div className="w-full h-safe-bottom shrink-0 bg-transparent pointer-events-none" />
    </div>
  );
};

export default App;
