
import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, UserProfile, Contact, VibeSignal, VibePattern, VibeType } from './types';
import SetupScreen from './components/SetupScreen';
import Dashboard from './components/Dashboard';
import PairingScreen from './components/PairingScreen';
import VibingScreen from './components/VibingScreen';
import VibeReceiver from './components/VibeReceiver';
import ChatScreen from './components/ChatScreen';
import { triggerHaptic, generateId, encryptMessage } from './constants';
import * as Ably from 'ably';
import { requestForToken, onMessageListener } from './src/firebase';
import { Activity } from 'lucide-react';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.SETUP);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  
  // Signals
  const [incomingVibe, setIncomingVibe] = useState<VibeSignal | null>(null);
  const [incomingChatMessage, setIncomingChatMessage] = useState<VibeSignal | null>(null);
  
  // Global States
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [onlineContacts, setOnlineContacts] = useState<Set<string>>(new Set());
  const [customPatterns, setCustomPatterns] = useState<VibePattern[]>([]);
  const [isGlobalHeartbeatActive, setIsGlobalHeartbeatActive] = useState(false);
  
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const wakeLockRef = useRef<any>(null);

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

    const requestWakeLock = async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        } catch (err) { console.warn('WakeLock failed', err); }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') requestWakeLock();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    requestWakeLock();

    return () => {
      if (ablyRef.current) ablyRef.current.close();
      if (wakeLockRef.current) wakeLockRef.current.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

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

  const initRealtime = (myCode: string, myToken?: string) => {
    const apiKey = 'cEcwGg.Pi_Jyw:JfLxT0E1WUIDcC8ljuvIOSt0yWHcSki8gXHFvfwHOag'; 
    try {
      if (ablyRef.current) ablyRef.current.close();
      
      const ably = new Ably.Realtime({ key: apiKey, autoConnect: true, clientId: myCode });
      ablyRef.current = ably;

      ably.connection.on('connected', () => setConnectionStatus('connected'));
      ably.connection.on('failed', () => setConnectionStatus('error'));

      const myChannel = ably.channels.get(`vibe-${myCode}`);
      myChannel.subscribe('vibration', (message) => {
        receiveVibe(message.data as VibeSignal, myCode);
      });

      myChannel.presence.enter({ fcmToken: myToken });

      const refreshPresence = () => {
        const currentContacts = JSON.parse(localStorage.getItem('vibe_contacts') || '[]');
        let contactsUpdated = false;

        currentContacts.forEach((c: Contact) => {
          const contactChannel = ably.channels.get(`vibe-${c.pairCode}`);
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
                setContacts(currentContacts);
            }
          }).catch(() => {});
        });
      };
      
      const interval = setInterval(refreshPresence, 8000);
      refreshPresence();
      return () => clearInterval(interval);
    } catch (err) {
      setConnectionStatus('error');
    }
  };

  // --- GATEKEEPER: THE CORE ROUTING LOGIC ---
  const receiveVibe = (vibe: VibeSignal, myCode: string) => {
    // 1. Identity Check
    if (user) {
        if (vibe.senderUniqueId && vibe.senderUniqueId === user.id) return;
        if (!vibe.senderUniqueId && vibe.senderId === user.pairCode) return;
    }
    
    const contact = contacts.find((c: Contact) => c.pairCode === vibe.senderId);
    if (!contact && vibe.senderId !== 'SYSTEM') return; // Only process known contacts or system

    // 2. Chat Routing (Silent, No Notification)
    if (vibe.type === 'chat' || vibe.type === 'chat-clear') {
        setIncomingChatMessage(vibe);
        // STRICT: No haptic, No notification for chat
        return;
    }

    // 3. Heartbeat Routing (Global)
    if (vibe.type === 'heartbeat') {
        if (vibe.count === 0) {
            setIsGlobalHeartbeatActive(false); // STOP signal
        } else {
            setIsGlobalHeartbeatActive(true); // START signal
            if ((vibe.count || 0) <= 10) triggerHaptic([50, 100, 50]);
        }
        setIncomingVibe(vibe);
        // STRICT: No notification for heartbeat pulses
        return; 
    }

    // 4. Data Routing (Draw/Breathe) - STRICT ISOLATION
    if (['draw', 'breathe'].includes(vibe.type)) {
        // Invite Logic
        const isInvite = (vibe.type === 'draw' && (!vibe.points || vibe.points.length === 0)) ||
                         (vibe.type === 'breathe' && vibe.count === 1); 
        
        if (isInvite) {
            setIncomingVibe(vibe); // Show Receiver Overlay
            triggerHaptic(50);
            sendNotification(vibe); // Notify for Invite
        } else {
            // Raw Data -> Only if on Vibing Screen
            if (screen === AppScreen.VIBING) {
                setIncomingVibe(vibe);
            }
        }
        return;
    }

    // 5. Game Routing
    if (vibe.type === 'game-matrix') {
        if (vibe.matrixAction === 'invite') {
            setIncomingVibe(vibe);
            triggerHaptic(50);
            sendNotification(vibe); // Notify for Invite
        } else if (screen === AppScreen.VIBING) {
            setIncomingVibe(vibe);
        }
        return;
    }

    // 6. Standard Vibes (Tap/Hold/Pattern)
    setIncomingVibe(vibe);
    if (vibe.type === 'tap') triggerHaptic(Array(vibe.count || 1).fill(100));
    if (vibe.type === 'hold') triggerHaptic(vibe.duration || 500);
    if (vibe.type === 'pattern') triggerHaptic(vibe.patternData || []);
    
    sendNotification(vibe);
  };

  // --- NOTIFICATION HANDLER ---
  const sendNotification = (vibe: VibeSignal) => {
    // STRICT RULE: Only Tap, Hold, Pattern, and INVITES
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
         
         const ICON_DATA_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f43f5e'%3E%3Cpath d='m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E";
         
         let bodyText = '';
         if (vibe.type === 'tap') bodyText = 'Sent you a tap.';
         else if (vibe.type === 'hold') bodyText = 'Is holding you.';
         else if (vibe.type === 'pattern') bodyText = `Sent ${vibe.patternName || 'a vibe'}`;
         else if (vibe.type === 'draw' && (!vibe.points || vibe.points.length === 0)) bodyText = "Invited you to Draw";
         else if (vibe.type === 'breathe' && vibe.count === 1) bodyText = "Invited you to Breathe";
         else if (vibe.type === 'game-matrix' && vibe.matrixAction === 'invite') bodyText = "Invited you to play Telepathy";
         else return; // IGNORE EVERYTHING ELSE

         navigator.serviceWorker.ready.then(registration => {
             registration.showNotification(vibe.senderName, {
                body: bodyText,
                icon: ICON_DATA_URI,
                tag: 'vibe-msg',
                data: { url: window.location.href }
             });
         });
    }
  };

  const sendVibeToPartner = async (
    targetCode: string, 
    type: VibeType, 
    text?: string,
    count?: number, 
    duration?: number, 
    patternName?: string, 
    patternEmoji?: string, 
    patternData?: number[],
    points?: {x: number, y: number}[],
    color?: string,
    breatheVariant?: 'calm' | 'meditation' | 'sad',
    matrixAction?: 'invite' | 'select' | 'reveal' | 'reset',
    gridDifficulty?: 'easy' | 'medium' | 'hard',
    selectionIndex?: number
  ) => {
    if (!ablyRef.current || !user) return;
    
    // Local Feedback
    if (['tap', 'hold', 'pattern'].includes(type)) triggerHaptic(50);

    const targetChannel = ablyRef.current.channels.get(`vibe-${targetCode}`);
    
    let processedText = text;
    if (type === 'chat' && text) {
        processedText = await encryptMessage(text, user.pairCode, targetCode);
    }

    const payload: VibeSignal = {
      id: generateId(),
      senderId: user.pairCode,
      senderUniqueId: user.id,
      senderName: user.displayName,
      type,
      text: processedText,
      count,
      duration,
      patternName,
      patternEmoji,
      patternData,
      points,
      color,
      breatheVariant,
      matrixAction,
      gridDifficulty,
      selectionIndex,
      timestamp: Date.now()
    };

    try {
      await targetChannel.publish('vibration', payload);
    } catch (err) { console.error(err); }
  };

  const handleGlobalStop = () => {
      if (!activeContact) return;
      setIsGlobalHeartbeatActive(false);
      sendVibeToPartner(activeContact.pairCode, 'heartbeat', undefined, 0); // Send STOP signal
  };

  const shouldShowOverlay = () => {
      if (!incomingVibe) return false;
      if (incomingVibe.type === 'chat' || incomingVibe.type === 'chat-clear') return false;
      return true;
  };

  return (
    <div className="min-h-screen h-full w-full flex flex-col no-select relative overflow-hidden bg-zinc-950">
      <div className="w-full h-12 shrink-0 bg-transparent pointer-events-none" />
      
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
              onSendVibe={(type, text, count, duration, pName, pEmoji, pData, points, color, breatheVariant, matrixAction, gridDiff, selIdx) => 
                sendVibeToPartner(activeContact.pairCode, type, text, count, duration, pName, pEmoji, pData, points, color, breatheVariant, matrixAction, gridDiff, selIdx)
              }
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
              onSendMessage={(txt) => sendVibeToPartner(activeContact.pairCode, 'chat', txt)} 
              incomingMessage={incomingChatMessage}
              onDeleteHistory={() => sendVibeToPartner(activeContact.pairCode, 'chat-clear')}
            />
          )}
      </div>

      {/* GLOBAL HEARTBEAT STOP BUTTON */}
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

      {shouldShowOverlay() && incomingVibe && (
          <VibeReceiver vibe={incomingVibe} contacts={contacts} onDismiss={() => setIncomingVibe(null)} />
      )}
      
       <div className="w-full h-12 shrink-0 bg-transparent pointer-events-none" />
    </div>
  );
};

export default App;
