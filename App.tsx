
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

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.SETUP);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [incomingVibe, setIncomingVibe] = useState<VibeSignal | null>(null);
  const [incomingChatMessage, setIncomingChatMessage] = useState<VibeSignal | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [onlineContacts, setOnlineContacts] = useState<Set<string>>(new Set());
  const [customPatterns, setCustomPatterns] = useState<VibePattern[]>([]);
  
  const ablyRef = useRef<Ably.Realtime | null>(null);
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = async () => {
    if ('wakeLock' in navigator && contacts.length > 0) {
      try {
        if (!wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
          wakeLockRef.current.addEventListener('release', () => {
            wakeLockRef.current = null;
          });
        }
      } catch (err) {
        console.warn('Vibe: WakeLock request failed:', err);
      }
    }
  };

  useEffect(() => {
    // 1. Initialize App & Notifications
    const initApp = async () => {
      // Load Local Storage
      const savedUser = localStorage.getItem('vibe_user');
      const savedContacts = localStorage.getItem('vibe_contacts');
      const savedPatterns = localStorage.getItem('vibe_custom_patterns');
      
      let currentUser = savedUser ? JSON.parse(savedUser) : null;

      // Background: Try to refresh FCM Token
      requestForToken().then((token) => {
        if (token && currentUser && currentUser.fcmToken !== token) {
           currentUser.fcmToken = token;
           setUser(currentUser);
           localStorage.setItem('vibe_user', JSON.stringify(currentUser));
           // Re-init realtime to broadcast new token
           initRealtime(currentUser.pairCode, token);
        }
      }).catch(err => console.warn("Token background fetch failed", err));
      
      if (currentUser) {
        setUser(currentUser);
        setScreen(AppScreen.DASHBOARD);
        // Init with existing token if we have one, or undefined
        initRealtime(currentUser.pairCode, currentUser.fcmToken);
      }
      
      const parsedContacts = savedContacts ? JSON.parse(savedContacts) : [];
      setContacts(parsedContacts);
      if (savedPatterns) setCustomPatterns(JSON.parse(savedPatterns));
    };

    initApp();

    // Foreground Notification Listener
    onMessageListener().then((payload: any) => {
      console.log('Received foreground push:', payload);
    });

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        requestWakeLock();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    requestWakeLock();

    return () => {
      if (ablyRef.current) ablyRef.current.close();
      if (wakeLockRef.current) wakeLockRef.current.release();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Run once on mount

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
    if (confirm("Permanently reset your identity? This will unpair all current connections.")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const handleUpdateUser = (newProfile: UserProfile) => {
    setUser(newProfile);
    localStorage.setItem('vibe_user', JSON.stringify(newProfile));
    // Re-initialize Realtime with new code immediately
    initRealtime(newProfile.pairCode, newProfile.fcmToken);
  };

  const initRealtime = (myCode: string, myToken?: string) => {
    // Note: In production, use an auth URL instead of hardcoding the key
    const apiKey = 'cEcwGg.Pi_Jyw:JfLxT0E1WUIDcC8ljuvIOSt0yWHcSki8gXHFvfwHOag'; 
    try {
      if (ablyRef.current) ablyRef.current.close();
      
      const ably = new Ably.Realtime({ 
        key: apiKey, 
        autoConnect: true, 
        clientId: myCode 
      });
      ablyRef.current = ably;

      ably.connection.on('connected', () => setConnectionStatus('connected'));
      ably.connection.on('failed', () => setConnectionStatus('error'));

      // Subscribe to my own channel to receive Vibes
      const myChannel = ably.channels.get(`vibe-${myCode}`);
      myChannel.subscribe('vibration', (message) => {
        receiveVibe(message.data as VibeSignal);
      });

      // Enter presence to announce I am online (and share my FCM Token)
      // We pass the token in the presence data so contacts can grab it
      myChannel.presence.enter({ fcmToken: myToken });

      // Poll other contacts to see if they are online and get their tokens
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
                 
                 // CHECK FOR TOKEN UPDATE
                 // If the member has a token and we don't have it, update contact
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
            
            // If we found a new token, save it to local storage
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

  const receiveVibe = (vibe: VibeSignal) => {
    // Ignore my own messages (Self-Echo Cancellation)
    if (user) {
        if (vibe.senderUniqueId && vibe.senderUniqueId === user.id) return;
        if (!vibe.senderUniqueId && vibe.senderId === user.pairCode) return;
    }
    
    const savedContacts = JSON.parse(localStorage.getItem('vibe_contacts') || '[]');
    const contact = savedContacts.find((c: Contact) => c.pairCode === vibe.senderId);
    
    if (contact) {
      
      // --- CHAT LOGIC ---
      if (vibe.type === 'chat' || vibe.type === 'chat-clear') {
          setIncomingChatMessage(vibe);
          
          if (vibe.type === 'chat') {
            // DO NOT setIncomingVibe(vibe) here. We don't want the giant heart overlay.
            // Just haptic and maybe a small toast if implemented later.
            if (screen !== AppScreen.CHAT) {
               triggerHaptic([30, 30]); // Discrete double tap
            }
          }
          // Note: We removed 'return' here so that notifications can still trigger below
      } 
      
      // --- SPECIAL MODES (DRAW, BREATHE, HEARTBEAT, MATRIX) ---
      else if (['draw', 'breathe', 'heartbeat', 'game-matrix'].includes(vibe.type)) {
          
          setIncomingVibe(vibe); 
          
          // Specific Haptic Logic per Mode
          if (vibe.type === 'heartbeat') {
              if (vibe.count === 0) {
                 // Stop signal - no haptic
              } else {
                 triggerHaptic([50, 100, 50]);
              }
          } 
          else if (vibe.type === 'game-matrix' && vibe.matrixAction === 'invite') {
               // Invitation - Silent or very short, waiting for acceptance
               triggerHaptic(20); 
          }
          else if (vibe.type === 'draw') {
             // Drawing should be silent unless it's the very first touch of a stroke, handled by client
             // We generally disable haptic for draw stream to avoid buzzing
          }
      }
      
      // --- STANDARD VIBES (TAP, HOLD, PATTERN) ---
      else {
          setIncomingVibe(vibe);
          
          if (vibe.type === 'tap') {
            const pattern = Array(vibe.count || 1).fill(300).flatMap(v => [v, 120]);
            triggerHaptic(pattern.length > 0 ? pattern : 50);
          } else if (vibe.type === 'hold') {
            triggerHaptic(vibe.duration || 1800);
          } else if (vibe.type === 'pattern' && vibe.patternData) {
            triggerHaptic(vibe.patternData);
          }
      }

      // --- SYSTEM NOTIFICATION (BACKGROUND) ---
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted' && 'serviceWorker' in navigator) {
         const ICON_DATA_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f43f5e'%3E%3Cpath d='m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E";
         
         let bodyText = '';
         if (vibe.type === 'chat') bodyText = "Sent you a secret message";
         else if (vibe.type === 'heartbeat') bodyText = "Is sending their heartbeat";
         else if (vibe.type === 'draw') bodyText = "Is drawing something for you";
         else if (vibe.type === 'breathe') bodyText = "Invited you to breathe";
         else if (vibe.type === 'game-matrix') bodyText = "Invited you to play Telepathy";
         else if (vibe.text) bodyText = vibe.text;
         else if (vibe.type === 'tap') bodyText = 'Sent you a tap.';
         else if (vibe.type === 'hold') bodyText = 'Is holding you.';
         else bodyText = `Sent ${vibe.patternName || 'a vibe'}`;

         navigator.serviceWorker.ready.then(registration => {
             registration.showNotification(vibe.senderName, {
                body: bodyText,
                icon: ICON_DATA_URI,
                tag: 'vibe-msg',
                data: { url: window.location.href }
             });
         });
      }

      // Auto-clear signal logic moved to VibeReceiver to allow user interaction for Invites
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
    
    // Optimistic UI Haptic (only for simple local interaction)
    if (type === 'tap' || type === 'hold' || type === 'pattern') triggerHaptic(40);

    const targetChannel = ablyRef.current.channels.get(`vibe-${targetCode}`);
    
    let processedText = text;
    // Encrypt if it's a chat
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
    } catch (err) {
      if (type !== 'chat') triggerHaptic([150, 100, 150]);
    }
  };

  const handleSetupComplete = async (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('vibe_user', JSON.stringify(profile));
    setScreen(AppScreen.DASHBOARD);

    try {
      initRealtime(profile.pairCode, undefined);
      const token = await requestForToken();
      if (token) {
        const updatedProfile = { ...profile, fcmToken: token };
        setUser(updatedProfile);
        localStorage.setItem('vibe_user', JSON.stringify(updatedProfile));
        initRealtime(profile.pairCode, token);
      }
    } catch (e) {
      console.warn("Background setup failed", e);
    }
  };

  const handleAddContact = (contact: Contact) => {
    const updated = [...contacts, contact];
    setContacts(updated);
    localStorage.setItem('vibe_contacts', JSON.stringify(updated));
    setScreen(AppScreen.DASHBOARD);
  };

  // Determine if we should show the global overlay
  const shouldShowOverlay = () => {
    if (!incomingVibe) return false;
    
    // Chat handled separately via toast/haptic only
    if (incomingVibe.type === 'chat') return false; 
    
    // If we are currently IN the specific mode that is sending data, don't show overlay
    // But since App doesn't know internal VibingScreen mode state easily, we rely on VibeReceiver to be smart
    // or we just show invites.
    
    return true;
  };

  return (
    <div className="min-h-screen h-full w-full flex flex-col no-select relative overflow-hidden">
      {/* Ad Space Buffers */}
      <div className="w-full h-12 shrink-0 bg-transparent z-0 pointer-events-none" />
      
      <div className="flex-1 flex flex-col relative z-10 overflow-hidden">
          {screen === AppScreen.SETUP && <SetupScreen onComplete={handleSetupComplete} />}
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
          {screen === AppScreen.PAIRING && <PairingScreen onBack={() => setScreen(AppScreen.DASHBOARD)} onAdd={handleAddContact} />}
          
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
              onSendMessage={(text) => sendVibeToPartner(activeContact.pairCode, 'chat', text)}
              incomingMessage={incomingChatMessage}
              onDeleteHistory={() => sendVibeToPartner(activeContact.pairCode, 'chat-clear')}
            />
          )}
      </div>

      {shouldShowOverlay() && incomingVibe && (
          <VibeReceiver 
            vibe={incomingVibe} 
            contacts={contacts} 
            onDismiss={() => setIncomingVibe(null)} 
          />
      )}
      
       {/* Ad Space Buffers */}
       <div className="w-full h-12 shrink-0 bg-transparent z-0 pointer-events-none" />
    </div>
  );
};

export default App;
