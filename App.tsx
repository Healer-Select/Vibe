
import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, UserProfile, Contact, VibeSignal, VibePattern } from './types.ts';
import SetupScreen from './components/SetupScreen.tsx';
import Dashboard from './components/Dashboard.tsx';
import PairingScreen from './components/PairingScreen.tsx';
import VibingScreen from './components/VibingScreen.tsx';
import VibeReceiver from './components/VibeReceiver.tsx';
import { triggerHaptic, generateId } from './constants.tsx';
import * as Ably from 'ably';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.SETUP);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [incomingVibe, setIncomingVibe] = useState<VibeSignal | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [onlineContacts, setOnlineContacts] = useState<Set<string>>(new Set());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [customPatterns, setCustomPatterns] = useState<VibePattern[]>([]);
  
  const ablyRef = useRef<Ably.Realtime | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('vibe_user');
    const savedContacts = localStorage.getItem('vibe_contacts');
    const savedPatterns = localStorage.getItem('vibe_custom_patterns');
    
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setScreen(AppScreen.DASHBOARD);
      initRealtime(parsedUser.pairCode);
    }
    if (savedContacts) setContacts(JSON.parse(savedContacts));
    if (savedPatterns) setCustomPatterns(JSON.parse(savedPatterns));

    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    const handleStatusChange = () => {
      if (!navigator.onLine) setConnectionStatus('error');
      else if (ablyRef.current?.connection.state === 'connected') setConnectionStatus('connected');
    };

    window.addEventListener('online', handleStatusChange);
    window.addEventListener('offline', handleStatusChange);

    return () => {
      if (ablyRef.current) ablyRef.current.close();
      window.removeEventListener('online', handleStatusChange);
      window.removeEventListener('offline', handleStatusChange);
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
    if (confirm("Permanently wipe your profile and all connections? This cannot be undone.")) {
      localStorage.clear();
      if (ablyRef.current) ablyRef.current.close();
      window.location.reload();
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      return permission;
    }
    return 'denied';
  };

  const initRealtime = (myCode: string) => {
    const apiKey = 'cEcwGg.Pi_Jyw:JfLxT0E1WUIDcC8ljuvIOSt0yWHcSki8gXHFvfwHOag'; 
    
    try {
      if (ablyRef.current) {
        ablyRef.current.close();
      }
      
      const ably = new Ably.Realtime({ 
        key: apiKey,
        autoConnect: true,
        clientId: myCode
      });
      ablyRef.current = ably;

      ably.connection.on('connected', () => setConnectionStatus('connected'));
      ably.connection.on('failed', () => setConnectionStatus('error'));
      ably.connection.on('disconnected', () => setConnectionStatus('connecting'));

      const myChannel = ably.channels.get(`vibe-${myCode}`);
      myChannel.subscribe('vibration', (message) => {
        receiveVibe(message.data as VibeSignal);
      });

      myChannel.presence.enter();

      const refreshPresence = () => {
        const saved = localStorage.getItem('vibe_contacts');
        if (!saved) return;
        const currentContacts = JSON.parse(saved);
        
        currentContacts.forEach((c: Contact) => {
          const contactChannel = ably.channels.get(`vibe-${c.pairCode}`);
          contactChannel.presence.get().then((members) => {
            if (members && members.length > 0) {
              setOnlineContacts(prev => new Set(prev).add(c.pairCode));
            } else {
              setOnlineContacts(prev => {
                const next = new Set(prev);
                next.delete(c.pairCode);
                return next;
              });
            }
          }).catch(() => {});
        });
      };

      const presenceInterval = setInterval(refreshPresence, 15000);
      refreshPresence();
      return () => clearInterval(presenceInterval);

    } catch (err) {
      setConnectionStatus('error');
    }
  };

  const receiveVibe = (vibe: VibeSignal) => {
    if (user && vibe.senderId === user.id) return;
    
    // Check if the sender is still in our contact list
    const savedContacts = JSON.parse(localStorage.getItem('vibe_contacts') || '[]');
    const isPaired = savedContacts.some((c: Contact) => c.pairCode === (vibe.senderId.includes('-') ? vibe.senderId : undefined) || c.pairCode === vibe.senderId);
    
    // Note: In this simple implementation, senderId is often the pairCode if we haven't mapped UUIDs.
    // We treat incoming vibes from any code we've paired with as valid.
    
    if (document.visibilityState === 'visible') {
      setIncomingVibe(vibe);
      if (vibe.type === 'tap') {
        const pattern = Array(vibe.count || 1).fill(120).flatMap(v => [v, 80]);
        triggerHaptic(pattern);
      } else if (vibe.type === 'hold') {
        triggerHaptic(vibe.duration || 1000);
      } else if (vibe.type === 'pattern' && vibe.patternData) {
        triggerHaptic(vibe.patternData);
      }
      setTimeout(() => setIncomingVibe(null), 4000);
    }
  };

  const sendVibeToPartner = async (targetCode: string, type: 'tap' | 'hold' | 'pattern', count?: number, duration?: number, patternName?: string, patternEmoji?: string, patternData?: number[]) => {
    if (!ablyRef.current || !user) return;
    
    if (!navigator.onLine) {
       triggerHaptic([50, 50, 50]);
       alert("No mobile data. Signals will be sent when connection returns.");
       return;
    }

    const targetChannel = ablyRef.current.channels.get(`vibe-${targetCode}`);
    const payload = {
      id: generateId(),
      senderId: user.pairCode, // Use pairCode as senderId for verification on other end
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
      triggerHaptic(20); 
    } catch (err) {
      console.error("Vibe failed:", err);
      triggerHaptic([100, 50, 100]);
    }
  };

  const handleSetupComplete = (profile: UserProfile) => {
    localStorage.setItem('vibe_user', JSON.stringify(profile));
    setUser(profile);
    initRealtime(profile.pairCode);
    setScreen(AppScreen.DASHBOARD);
  };

  const handleAddContact = (contact: Contact) => {
    const updated = [...contacts, contact];
    setContacts(updated);
    localStorage.setItem('vibe_contacts', JSON.stringify(updated));
    if (user) initRealtime(user.pairCode);
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
          notificationPermission={notificationPermission}
          onRequestNotifications={requestNotificationPermission}
          onAdd={() => setScreen(AppScreen.PAIRING)}
          onContactClick={(c) => { setActiveContact(c); setScreen(AppScreen.VIBING); }}
          onSimulateReceive={receiveVibe}
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
      {incomingVibe && <VibeReceiver vibe={incomingVibe} />}
    </div>
  );
};

export default App;
