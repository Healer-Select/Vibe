
import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, UserProfile, Contact, VibeSignal, VibePattern, VibeCategory, VibeAction } from './types';
import SetupScreen from './components/SetupScreen';
import Dashboard from './components/Dashboard';
import PairingScreen from './components/PairingScreen';
import VibingScreen from './components/VibingScreen';
import VibeRibbon from './components/VibeRibbon'; // Replaced VibeReceiver
import ChatScreen from './components/ChatScreen';
import { triggerHaptic, generateId, encryptMessage, getChannelName } from './constants';
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
  const [incomingChatMessage, setIncomingChatMessage] = useState<VibeSignal | null>(null);
  const [activeInvite, setActiveInvite] = useState<VibeSignal | null>(null);
  
  // Global States
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [onlineContacts, setOnlineContacts] = useState<Set<string>>(new Set());
  const [customPatterns, setCustomPatterns] = useState<VibePattern[]>([]);
  const [isGlobalHeartbeatActive, setIsGlobalHeartbeatActive] = useState(false);
  const [visualShake, setVisualShake] = useState(false);
  
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const wakeLockRef = useRef<any>(null);
  const lastInviteTime = useRef<number>(0);

  // Sync Refs
  useEffect(() => { contactsRef.current = contacts; }, [contacts]);
  useEffect(() => { userRef.current = user; }, [user]);

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

  // --- PERSISTENCE HELPERS ---
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

  // --- ABLY CONNECTION (HASHED CHANNELS) ---
  const initRealtime = async (myCode: string, myToken?: string) => {
    const apiKey = 'cEcwGg.Pi_Jyw:JfLxT0E1WUIDcC8ljuvIOSt0yWHcSki8gXHFvfwHOag'; 
    try {
      if (ablyRef.current) ablyRef.current.close();
      
      const ably = new Ably.Realtime({ key: apiKey, autoConnect: true, clientId: myCode });
      ablyRef.current = ably;

      ably.connection.on('connected', () => setConnectionStatus('connected'));
      ably.connection.on('failed', () => setConnectionStatus('error'));

      // SECURITY: Subscribe to HASHED channel name, not raw code
      const channelName = await getChannelName(myCode);
      const myChannel = ably.channels.get(channelName);
      
      myChannel.subscribe('vibration', (message) => {
        receiveVibe(message.data as VibeSignal);
      });

      if (myToken) myChannel.presence.enter({ fcmToken: myToken });

      // Refresh presence (checking hashed channels of contacts)
      const refreshPresence = async () => {
        const currentContacts = contactsRef.current; // Use Ref
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
      
      const interval = setInterval(refreshPresence, 10000); // 10s is sufficient
      refreshPresence();
      return () => clearInterval(interval);
    } catch (err) {
      setConnectionStatus('error');
    }
  };

  // --- GATEKEEPER: SECURE ROUTING LOGIC ---
  const receiveVibe = (vibe: VibeSignal) => {
    const currentUser = userRef.current;
    const currentContacts = contactsRef.current;

    // 1. Identity & Echo Check
    if (!currentUser) return;
    if (vibe.senderUniqueId && vibe.senderUniqueId === currentUser.id) return;
    if (vibe.senderId === currentUser.pairCode) return;
    
    // 2. Contact Verification
    const contact = currentContacts.find((c: Contact) => c.pairCode === vibe.senderId);
    if (!contact && vibe.senderId !== 'SYSTEM') {
        console.warn("Security: Blocked signal from unknown sender");
        return; 
    }

    // 3. Flood Control (Invites)
    if (vibe.action === 'invite') {
        const now = Date.now();
        if (now - lastInviteTime.current < 2000) return; // Drop spam invites
        lastInviteTime.current = now;
    }

    // 4. ROUTING SWITCH
    switch (vibe.category) {
        case 'chat':
            setIncomingChatMessage(vibe);
            break;

        case 'heartbeat':
            if (vibe.action === 'stop') setIsGlobalHeartbeatActive(false);
            else {
                setIsGlobalHeartbeatActive(true);
                if (vibe.count && vibe.count <= 10) triggerHaptic([50, 100, 50]);
            }
            setIncomingVibe(vibe); // Pass to screen if active
            break;
            
        case 'draw':
        case 'breathe':
        case 'matrix':
            if (vibe.action === 'invite') {
                setActiveInvite(vibe); // Trigger Ribbon
                triggerHaptic(50); // Single notify bump
                sendNotification(vibe);
            } else {
                setIncomingVibe(vibe); // Data passed to VibingScreen
            }
            break;

        case 'touch':
            setIncomingVibe(vibe);
            if (vibe.touchType === 'tap') triggerHaptic(Array(vibe.count || 1).fill(100));
            if (vibe.touchType === 'hold') triggerHaptic(vibe.duration || 500);
            if (vibe.touchType === 'pattern' && vibe.patternData) triggerHaptic(vibe.patternData);
            sendNotification(vibe);
            break;
    }
  };

  // --- NOTIFICATION HANDLER ---
  const sendNotification = (vibe: VibeSignal) => {
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
         const ICON = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f43f5e'%3E%3Cpath d='m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E";
         let body = "Sent a vibe";
         
         if (vibe.action === 'invite') body = `Invited you to ${vibe.category}`;
         else if (vibe.category === 'touch' && vibe.touchType === 'tap') body = "Thinking of you";
         else if (vibe.category === 'touch' && vibe.touchType === 'hold') body = "Holding you";
         else return;

         navigator.serviceWorker.ready.then(reg => {
             reg.showNotification(vibe.senderName, { body, icon: ICON, tag: 'vibe-msg' });
         });
    }
  };

  const sendVibeToPartner = async (targetCode: string, vibe: VibeSignal) => {
    if (!ablyRef.current || !user) return;
    
    // Encrypt if chat
    if (vibe.category === 'chat' && vibe.action === 'text' && vibe.payload) {
        vibe.payload = await encryptMessage(vibe.payload, user.pairCode, targetCode);
    }

    // Local Feedback for Touch
    if (vibe.category === 'touch') triggerHaptic(50);

    // SECURITY: Publish to HASHED channel
    const targetChannelName = await getChannelName(targetCode);
    const targetChannel = ablyRef.current.channels.get(targetChannelName);
    
    try {
      await targetChannel.publish('vibration', vibe);
    } catch (err) { console.error(err); }
  };

  // Helper for components to construct signals
  const createAndSend = async (
      type: VibeCategory, 
      action: VibeAction, 
      payload: Partial<VibeSignal>
  ) => {
      if (!activeContact || !user) return;
      
      const signal: VibeSignal = {
          id: generateId(),
          senderId: user.pairCode,
          senderUniqueId: user.id,
          senderName: user.displayName,
          timestamp: Date.now(),
          category: type,
          action: action,
          ...payload
      } as VibeSignal;

      await sendVibeToPartner(activeContact.pairCode, signal);
  };

  const handleGlobalStop = () => {
      setIsGlobalHeartbeatActive(false);
      createAndSend('heartbeat', 'stop', {});
  };

  return (
    <div className={`min-h-screen h-full w-full flex flex-col no-select relative overflow-hidden bg-zinc-950 ${visualShake ? 'animate-shake' : ''}`}>
      <div className="w-full h-safe-top shrink-0 bg-transparent pointer-events-none" />
      
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
          {screen === AppScreen.SETUP && <SetupScreen onComplete={(p) => { setUser(p); setScreen(AppScreen.DASHBOARD); localStorage.setItem('vibe_user', JSON.stringify(p)); initRealtime(p.pairCode, undefined); }} />}
          
          {screen === AppScreen.DASHBOARD && user && (
            <Dashboard 
              user={user} 
              contacts={contacts} 
              status={connectionStatus}
              onlineContacts={onlineContacts}
              onAdd={() => setScreen(AppScreen.PAIRING)}
              onContactClick={(c) => { setActiveContact(c); setScreen(AppScreen.VIBING); }}
              onDeleteContact={deleteContact}
              onResetApp={resetApp}
              onUpdateUser={handleUpdateUser}
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
              onOpenChat={() => setScreen(AppScreen.CHAT)}
              customPatterns={customPatterns}
              onSavePattern={saveCustomPattern}
              onDeletePattern={deleteCustomPattern}
            />
          )}

          {screen === AppScreen.CHAT && activeContact && user && (
            <ChatScreen 
              contact={activeContact} 
              user={user} 
              onBack={() => setScreen(AppScreen.VIBING)} 
              onSendMessage={(txt) => createAndSend('chat', 'text', { payload: txt })} 
              incomingMessage={incomingChatMessage}
              onDeleteHistory={() => createAndSend('chat', 'clear', {})}
            />
          )}
      </div>

      {isGlobalHeartbeatActive && (
          <div className="fixed bottom-24 inset-x-0 flex justify-center z-[1000] pointer-events-auto">
              <button 
                onClick={handleGlobalStop}
                className="bg-rose-500 text-white px-8 py-4 rounded-full font-bold shadow-[0_0_30px_rgba(244,63,94,0.6)] animate-pulse flex items-center gap-3 active:scale-95 transition-transform"
              >
                  <Activity className="animate-bounce" />
                  <span>STOP PULSE</span>
              </button>
          </div>
      )}

      {/* NON-BLOCKING RIBBON UI */}
      {activeInvite && (
          <VibeRibbon 
             invite={activeInvite} 
             contact={contacts.find(c => c.pairCode === activeInvite.senderId)}
             onAccept={() => {
                 const contact = contacts.find(c => c.pairCode === activeInvite.senderId);
                 if (contact) {
                     setActiveContact(contact);
                     setScreen(AppScreen.VIBING);
                     // Note: VibingScreen will check incomingVibe and switch mode automatically
                     setIncomingVibe(activeInvite); 
                 }
                 setActiveInvite(null);
             }}
             onDismiss={() => setActiveInvite(null)}
          />
      )}
      
       <div className="w-full h-safe-bottom shrink-0 bg-transparent pointer-events-none" />
    </div>
  );
};

export default App;
