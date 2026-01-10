import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, UserProfile, Contact, VibeSignal, VibePattern } from './types.ts';
import SetupScreen from './components/SetupScreen.tsx';
import Dashboard from './components/Dashboard.tsx';
import PairingScreen from './components/PairingScreen.tsx';
import VibingScreen from './components/VibingScreen.tsx';
import VibeReceiver from './components/VibeReceiver.tsx';
import { triggerHaptic, generateId } from './constants.tsx';
import * as Ably from 'ably';
import { requestForToken, onMessageListener } from './src/firebase.ts';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.SETUP);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [incomingVibe, setIncomingVibe] = useState<VibeSignal | null>(null);
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
      // Get FCM Token
      let fcmToken: string | undefined;
      try {
        const token = await requestForToken();
        if (token) fcmToken = token;
      } catch (e) {
        console.warn("FCM Token fetch failed", e);
      }

      // Load Local Storage
      const savedUser = localStorage.getItem('vibe_user');
      const savedContacts = localStorage.getItem('vibe_contacts');
      const savedPatterns = localStorage.getItem('vibe_custom_patterns');
      
      if (savedUser) {
        const currentUser = JSON.parse(savedUser);
        // Update user profile with new token if it changed
        if (fcmToken && currentUser.fcmToken !== fcmToken) {
           currentUser.fcmToken = fcmToken;
           localStorage.setItem('vibe_user', JSON.stringify(currentUser));
        }
        setUser(currentUser);
        setScreen(AppScreen.DASHBOARD);
        initRealtime(currentUser.pairCode, fcmToken);
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
    // Ignore my own messages
    if (user && vibe.senderId === user.pairCode) return;
    
    const savedContacts = JSON.parse(localStorage.getItem('vibe_contacts') || '[]');
    const contact = savedContacts.find((c: Contact) => c.pairCode === vibe.senderId);
    
    if (contact) {
      setIncomingVibe(vibe);
      
      // 1. Trigger Haptics
      if (vibe.type === 'tap') {
        const pattern = Array(vibe.count || 1).fill(300).flatMap(v => [v, 120]);
        triggerHaptic(pattern);
      } else if (vibe.type === 'hold') {
        triggerHaptic(vibe.duration || 1800);
      } else if (vibe.type === 'pattern' && vibe.patternData) {
        triggerHaptic(vibe.patternData);
      }

      // 2. Trigger System Notification (Fallback if Haptics fail or app is hidden)
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
         // Using Data URI for icon to avoid 404s
         const ICON_DATA_URI = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f43f5e'%3E%3Cpath d='m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E";
         
         new Notification(vibe.senderName, {
            body: vibe.type === 'tap' ? 'Sent you a tap.' : vibe.type === 'hold' ? 'Is holding you.' : `Sent ${vibe.patternName || 'a vibe'}`,
            icon: ICON_DATA_URI,
            tag: 'vibe-msg'
         });
      }

      setTimeout(() => setIncomingVibe(null), 5000);
    }
  };

  const sendVibeToPartner = async (targetCode: string, type: 'tap' | 'hold' | 'pattern', count?: number, duration?: number, patternName?: string, patternEmoji?: string, patternData?: number[]) => {
    if (!ablyRef.current || !user) return;
    
    // Optimistic UI Haptic
    triggerHaptic(40);

    const targetChannel = ablyRef.current.channels.get(`vibe-${targetCode}`);
    const payload: VibeSignal = {
      id: generateId(),
      senderId: user.pairCode,
      senderName: user.displayName,
      type,
      count,
      duration,
      patternName,
      patternEmoji,
      patternData,
      timestamp: Date.now()
    };

    try {
      await targetChannel.publish('vibration', payload);
      
      // NOTE: Real background Push Notifications require a backend.
      // If we had a backend, we would call it here:
      // await fetch('https://my-backend/send-push', { 
      //    method: 'POST', 
      //    body: JSON.stringify({ to: activeContact?.fcmToken, ...payload }) 
      // });
      
    } catch (err) {
      // Error feedback
      triggerHaptic([150, 100, 150]);
    }
  };

  const handleSetupComplete = async (profile: UserProfile) => {
    // Try to attach token if available
    const token = await requestForToken();
    if (token) profile.fcmToken = token;

    setUser(profile);
    localStorage.setItem('vibe_user', JSON.stringify(profile));
    setScreen(AppScreen.DASHBOARD);
    initRealtime(profile.pairCode, token || undefined);
  };

  const handleAddContact = (contact: Contact) => {
    const updated = [...contacts, contact];
    setContacts(updated);
    localStorage.setItem('vibe_contacts', JSON.stringify(updated));
    setScreen(AppScreen.DASHBOARD);
  };

  return (
    <div className="min-h-screen w-full bg-zinc-950 text-zinc-100 flex flex-col no-select">
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
        />
      )}
      {screen === AppScreen.PAIRING && <PairingScreen onBack={() => setScreen(AppScreen.DASHBOARD)} onAdd={handleAddContact} />}
      {screen === AppScreen.VIBING && activeContact && user && (
        <VibingScreen 
          contact={activeContact} 
          onBack={() => setScreen(AppScreen.DASHBOARD)}
          user={user}
          onSendVibe={(type, count, duration, pName, pEmoji, pData) => 
            sendVibeToPartner(activeContact.pairCode, type, count, duration, pName, pEmoji, pData)
          }
          customPatterns={customPatterns}
          onSavePattern={saveCustomPattern}
          onDeletePattern={deleteCustomPattern}
        />
      )}
      {incomingVibe && <VibeReceiver vibe={incomingVibe} contacts={contacts} />}
    </div>
  );
};

export default App;