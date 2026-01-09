
import React, { useState, useEffect, useRef } from 'react';
import { AppScreen, UserProfile, Contact, VibeSignal, VibePattern } from './types.ts';
import SetupScreen from './components/SetupScreen.tsx';
import Dashboard from './components/Dashboard.tsx';
import PairingScreen from './components/PairingScreen.tsx';
import VibingScreen from './components/VibingScreen.tsx';
import VibeReceiver from './components/VibeReceiver.tsx';
import { triggerHaptic, generateId, getRandomColor } from './constants.tsx';
import * as Ably from 'ably';

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

  useEffect(() => {
    const savedUser = localStorage.getItem('vibe_user');
    const savedContacts = localStorage.getItem('vibe_contacts');
    const savedPatterns = localStorage.getItem('vibe_custom_patterns');
    
    let currentUser: UserProfile | null = null;
    if (savedUser) {
      currentUser = JSON.parse(savedUser);
      setUser(currentUser);
      setScreen(AppScreen.DASHBOARD);
      initRealtime(currentUser!.pairCode);
    }
    
    const parsedContacts: Contact[] = savedContacts ? JSON.parse(savedContacts) : [];
    setContacts(parsedContacts);
    if (savedPatterns) setCustomPatterns(JSON.parse(savedPatterns));

    // Better Pairing Method: Deep Links (?pair=CODE&name=User&emoji=👋)
    const params = new URLSearchParams(window.location.search);
    const pCode = params.get('pair');
    const pName = params.get('name');
    const pEmoji = params.get('emoji') || '❤️';

    if (pCode && pName && currentUser && pCode !== currentUser.pairCode) {
      const alreadyPaired = parsedContacts.some(c => c.pairCode === pCode);
      if (!alreadyPaired) {
        const newContact: Contact = {
          id: generateId(),
          name: decodeURIComponent(pName),
          emoji: pEmoji,
          pairCode: pCode,
          color: getRandomColor()
        };
        const updated = [...parsedContacts, newContact];
        setContacts(updated);
        localStorage.setItem('vibe_contacts', JSON.stringify(updated));
        triggerHaptic([150, 80, 150]);
        // Clean up URL without refreshing
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    // Resilient Sync: Reconnect whenever app is focused
    const handleFocus = () => {
      if (ablyRef.current && ablyRef.current.connection.state !== 'connected') {
        ablyRef.current.connect();
      }
    };
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleFocus);

    return () => {
      if (ablyRef.current) ablyRef.current.close();
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleFocus);
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
    if (confirm("Permanently wipe your identity and all connections?")) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const initRealtime = (myCode: string) => {
    const apiKey = 'cEcwGg.Pi_Jyw:JfLxT0E1WUIDcC8ljuvIOSt0yWHcSki8gXHFvfwHOag'; 
    try {
      if (ablyRef.current) ablyRef.current.close();
      const ably = new Ably.Realtime({ key: apiKey, autoConnect: true, clientId: myCode });
      ablyRef.current = ably;

      ably.connection.on('connected', () => setConnectionStatus('connected'));
      ably.connection.on('disconnected', () => setConnectionStatus('connecting'));
      ably.connection.on('failed', () => setConnectionStatus('error'));

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
            setOnlineContacts(prev => {
              const next = new Set(prev);
              if (members && members.length > 0) next.add(c.pairCode);
              else next.delete(c.pairCode);
              return next;
            });
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
    if (user && vibe.senderId === user.pairCode) return;
    
    const savedContacts = JSON.parse(localStorage.getItem('vibe_contacts') || '[]');
    const isPaired = savedContacts.some((c: Contact) => c.pairCode === vibe.senderId);
    
    if (isPaired) {
      setIncomingVibe(vibe);
      // Stronger reception vibrations
      if (vibe.type === 'tap') {
        const pattern = Array(vibe.count || 1).fill(300).flatMap(v => [v, 100]);
        triggerHaptic(pattern);
      } else if (vibe.type === 'hold') {
        triggerHaptic(vibe.duration || 1800);
      } else if (vibe.type === 'pattern' && vibe.patternData) {
        triggerHaptic(vibe.patternData);
      }
      setTimeout(() => setIncomingVibe(null), 5000);
    }
  };

  const sendVibeToPartner = async (targetCode: string, type: 'tap' | 'hold' | 'pattern', count?: number, duration?: number, patternName?: string, patternEmoji?: string, patternData?: number[]) => {
    if (!ablyRef.current || !user) return;
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
      triggerHaptic(50); 
    } catch (err) {
      triggerHaptic([200, 100, 200]);
    }
  };

  const handleSetupComplete = (profile: UserProfile) => {
    setUser(profile);
    localStorage.setItem('vibe_user', JSON.stringify(profile));
    setScreen(AppScreen.DASHBOARD);
    initRealtime(profile.pairCode);
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
      {incomingVibe && <VibeReceiver vibe={incomingVibe} />}
    </div>
  );
};

export default App;
