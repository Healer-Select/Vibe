
import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, UserProfile, Contact, VibeSignal } from './types.ts';
import SetupScreen from './components/SetupScreen.tsx';
import Dashboard from './components/Dashboard.tsx';
import PairingScreen from './components/PairingScreen.tsx';
import VibingScreen from './components/VibingScreen.tsx';
import VibeReceiver from './components/VibeReceiver.tsx';
import { triggerHaptic, generateId } from './constants.tsx';
import * as Ably from 'https://esm.sh/ably';

const App: React.FC = () => {
  const [screen, setScreen] = useState<AppScreen>(AppScreen.SETUP);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  const [incomingVibe, setIncomingVibe] = useState<VibeSignal | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');
  const [onlineContacts, setOnlineContacts] = useState<Set<string>>(new Set());
  
  const ablyRef = useRef<Ably.Realtime | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('vibe_user');
    const savedContacts = localStorage.getItem('vibe_contacts');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setScreen(AppScreen.DASHBOARD);
      initRealtime(parsedUser.pairCode);
    }
    if (savedContacts) setContacts(JSON.parse(savedContacts));

    return () => {
      if (ablyRef.current) ablyRef.current.close();
    };
  }, []);

  const initRealtime = (myCode: string) => {
    const apiKey = 'cEcwGg.Pi_Jyw:JfLxT0E1WUIDcC8ljuvIOSt0yWHcSki8gXHFvfwHOag'; 
    
    try {
      const ably = new Ably.Realtime({ key: apiKey });
      ablyRef.current = ably;

      ably.connection.on('connected', () => setConnectionStatus('connected'));
      ably.connection.on('failed', () => setConnectionStatus('error'));

      // 1. Subscribe to my own vibes
      const myChannel = ably.channels.get(`vibe-${myCode}`);
      myChannel.subscribe('vibration', (message) => {
        receiveVibe(message.data as VibeSignal);
      });

      // 2. Presence: Mark myself as online on my own channel
      myChannel.presence.enter();

      // 3. Track presence for all contacts
      const savedContacts = JSON.parse(localStorage.getItem('vibe_contacts') || '[]');
      savedContacts.forEach((c: Contact) => {
        const contactChannel = ably.channels.get(`vibe-${c.pairCode}`);
        
        const updatePresence = () => {
          contactChannel.presence.get((err, members) => {
            if (!err && members && members.length > 0) {
              setOnlineContacts(prev => new Set(prev).add(c.pairCode));
            } else {
              setOnlineContacts(prev => {
                const next = new Set(prev);
                next.delete(c.pairCode);
                return next;
              });
            }
          });
        };

        contactChannel.presence.subscribe('enter', updatePresence);
        contactChannel.presence.subscribe('leave', updatePresence);
        updatePresence(); // Initial check
      });

    } catch (err) {
      setConnectionStatus('error');
    }
  };

  const receiveVibe = (vibe: VibeSignal) => {
    if (user && vibe.senderId === user.id) return;
    setIncomingVibe(vibe);
    if (vibe.type === 'tap') {
      const pattern = Array(vibe.count || 1).fill(80).flatMap(v => [v, 60]);
      triggerHaptic(pattern);
    } else {
      triggerHaptic(vibe.duration || 1000);
    }
    setTimeout(() => setIncomingVibe(null), 4000);
  };

  const sendVibeToPartner = (targetCode: string, type: 'tap' | 'hold', count?: number, duration?: number) => {
    if (!ablyRef.current || !user) return;
    const targetChannel = ablyRef.current.channels.get(`vibe-${targetCode}`);
    targetChannel.publish('vibration', {
      id: generateId(),
      senderId: user.id,
      senderName: user.displayName,
      type,
      count,
      duration,
      timestamp: Date.now()
    });
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
    // Restart realtime to track new contact presence
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
          onAdd={() => setScreen(AppScreen.PAIRING)}
          onContactClick={(c) => { setActiveContact(c); setScreen(AppScreen.VIBING); }}
          onSimulateReceive={receiveVibe}
        />
      )}
      {screen === AppScreen.PAIRING && <PairingScreen onBack={() => setScreen(AppScreen.DASHBOARD)} onAdd={handleAddContact} />}
      {screen === AppScreen.VIBING && activeContact && user && (
        <VibingScreen 
          contact={activeContact} 
          onBack={() => setScreen(AppScreen.DASHBOARD)}
          user={user}
          onSendVibe={(type, count, dur) => sendVibeToPartner(activeContact.pairCode, type, count, dur)}
        />
      )}
      {incomingVibe && <VibeReceiver vibe={incomingVibe} />}
    </div>
  );
};

export default App;
