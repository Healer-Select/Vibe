
import React, { useState, useEffect } from 'react';
import { UserProfile, Contact } from '../types';
import { Plus, User, Settings, Trash2, X, Copy, Heart, Bell, Edit2, Check, AlertTriangle, BellOff } from 'lucide-react';
import { triggerHaptic } from '../constants';

interface Props {
  user: UserProfile;
  contacts: Contact[];
  status: 'connecting' | 'connected' | 'error';
  onlineContacts: Set<string>;
  onAdd: () => void;
  onContactClick: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onResetApp: () => void;
  onUpdateUser: (profile: UserProfile) => void;
}

const Dashboard: React.FC<Props> = ({ 
  user, contacts, status, onlineContacts, onAdd, onContactClick, onDeleteContact, onResetApp, onUpdateUser
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [notificationPerm, setNotificationPerm] = useState<NotificationPermission>('default');
  
  // Edit State
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [editCodeValue, setEditCodeValue] = useState(user.pairCode);

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPerm(Notification.permission);
    }
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(user.pairCode);
    triggerHaptic(50);
    alert("Pairing code copied to clipboard!");
  };

  const saveNewCode = () => {
    const cleanCode = editCodeValue.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleanCode.length < 4) {
        alert("Code must be at least 4 characters.");
        return;
    }
    
    onUpdateUser({ ...user, pairCode: cleanCode });
    setIsEditingCode(false);
    triggerHaptic(50);
  };

  const requestNotifications = () => {
    if (!('Notification' in window)) {
        alert("This browser does not support notifications.");
        return;
    }

    if (Notification.permission === 'denied') {
        alert("Notifications are currently blocked.\n\nPlease go to your browser settings (typically the Lock or Settings icon in the address bar) -> Site Settings -> Notifications, and change it to 'Allow'.");
        return;
    }

    if (Notification.permission === 'granted') {
        alert("Notifications are already active. You'll receive updates when the app is in the background.");
        return;
    }

    Notification.requestPermission().then((perm) => {
      setNotificationPerm(perm);
      if (perm === 'granted') {
        // Try to show a test notification via Service Worker to ensure it works
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then(registration => {
            try {
                registration.showNotification("Vibe Connected", {
                body: "You will now know when a Vibe arrives.",
                icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f43f5e'%3E%3Cpath d='m12 21.35-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E"
                });
            } catch (e) {
                console.warn("Notification error", e);
            }
          });
        } else {
             new Notification("Vibe Connected", { body: "Notifications enabled." });
        }
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 animate-in fade-in duration-500 relative">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full glass-button flex items-center justify-center">
              <User size={20} className="text-white/80" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-transparent ${status === 'connected' ? 'bg-emerald-400 shadow-[0_0_10px_#34d399]' : 'bg-rose-400 animate-pulse'}`} />
          </div>
          <div>
            <h1 className="text-xl font-outfit font-semibold text-white/90">{user.displayName}</h1>
            <p className="text-[9px] uppercase tracking-widest text-white/50 font-black">
              {status === 'connected' ? 'Screen Sync Active' : 'Connecting...'}
            </p>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="glass-button p-3 rounded-2xl text-white/80">
          <Settings size={20} />
        </button>
      </header>

      <div className="flex-1 flex flex-col space-y-4 overflow-y-auto pb-32 no-scrollbar">
        {contacts.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 text-center pb-12">
            <div className="space-y-2 mt-8">
                <h2 className="text-2xl font-outfit font-semibold text-white px-4 leading-tight">Pair with someone to connect</h2>
                <p className="text-white/60 text-sm max-w-[240px] mx-auto">Your private code is <span className="text-orange-300 font-mono font-bold select-all tracking-wider">{user.pairCode}</span></p>
            </div>

            <button 
              onClick={onAdd} 
              className="group relative bg-gradient-to-r from-rose-500 to-orange-500 text-white px-10 py-6 rounded-[2rem] font-bold flex flex-col items-center gap-1 active:scale-95 transition-all shadow-xl shadow-orange-900/20 overflow-hidden"
            >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-lg">Share Your Feelings</span>
                <span className="text-[10px] uppercase tracking-widest text-white/70">Enter a code to begin</span>
            </button>
            
            <button onClick={copyCode} className="text-white/40 text-xs flex items-center gap-2 hover:text-white transition-colors">
              <Copy size={14} /> Copy my pairing code
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {contacts.map((contact) => {
              const isOnline = onlineContacts.has(contact.pairCode);
              return (
                <div key={contact.id} className="relative group">
                  <button
                    onClick={() => onContactClick(contact)}
                    className="w-full glass-panel p-6 rounded-[2.5rem] flex items-center space-x-5 active:scale-[0.98] transition-all text-left relative overflow-hidden hover:bg-white/5"
                  >
                    <div className="relative shrink-0">
                      {isOnline && (
                        <div className="absolute -inset-2 rounded-2xl bg-white/20 animate-pulse" />
                      )}
                      <div className={`relative w-16 h-16 rounded-2xl ${contact.color} flex items-center justify-center shadow-lg transition-all duration-500 ${isOnline ? 'scale-105' : 'opacity-80'}`}>
                        <span className="text-white text-3xl font-bold drop-shadow-md">{contact.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-outfit font-medium text-xl text-white">{contact.name}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' : 'bg-white/30'}`} />
                        <p className={`text-[10px] uppercase tracking-widest font-black ${isOnline ? 'text-emerald-300' : 'text-white/40'}`}>
                          {isOnline ? 'Pulse Connected' : 'Away'}
                        </p>
                      </div>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Unpair from ${contact.name}?`)) onDeleteContact(contact.id); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-white/50 hover:text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={22} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-2xl animate-in fade-in duration-300 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-outfit font-semibold text-white">Profile</h2>
            <button onClick={() => setShowSettings(false)} className="p-2 text-white/60"><X size={36} /></button>
          </div>
          <div className="flex-1 space-y-10">
            <div className="glass-panel p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
               <div className="flex justify-between items-center">
                  <div>
                    <p className="text-[10px] uppercase font-black text-white/50 tracking-widest mb-1">Display Name</p>
                    <p className="text-2xl font-semibold text-white">{user.displayName}</p>
                  </div>
               </div>
               
               <div className="pt-2">
                    <div className="flex justify-between items-end mb-2">
                        <p className="text-[10px] uppercase font-black text-white/50 tracking-widest">Secret Code</p>
                        {!isEditingCode ? (
                            <button onClick={() => setIsEditingCode(true)} className="text-orange-300 text-xs font-bold flex items-center gap-1">
                                <Edit2 size={12} /> Edit
                            </button>
                        ) : (
                             <button onClick={() => setIsEditingCode(false)} className="text-white/50 text-xs font-bold flex items-center gap-1">
                                Cancel
                            </button>
                        )}
                    </div>
                    
                    {isEditingCode ? (
                        <div className="flex items-center gap-2">
                            <input 
                                type="text"
                                value={editCodeValue}
                                onChange={(e) => setEditCodeValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                                className="flex-1 bg-black/40 border border-white/20 rounded-xl px-4 py-3 font-mono text-xl text-orange-400 tracking-wider uppercase focus:outline-none focus:border-orange-400"
                                maxLength={12}
                            />
                            <button onClick={saveNewCode} className="bg-orange-500 text-white p-4 rounded-xl">
                                <Check size={20} />
                            </button>
                        </div>
                    ) : (
                        <p className="text-3xl font-mono font-bold text-orange-400 tracking-wider">{user.pairCode}</p>
                    )}
               </div>

               <div className="h-[1px] bg-white/10 w-full" />
               <button onClick={copyCode} className="w-full py-5 bg-white text-black rounded-[1.5rem] font-bold flex items-center justify-center gap-3 active:scale-95 transition-all">
                  <Copy size={20} /> Copy Pairing Code
               </button>
            </div>

            {/* Notification Permission Button */}
            <button 
                onClick={requestNotifications} 
                className={`w-full p-6 glass-panel rounded-[2.5rem] font-bold flex items-center justify-between transition-colors ${
                    notificationPerm === 'granted' 
                    ? 'border-emerald-500/50 text-emerald-300' 
                    : notificationPerm === 'denied'
                    ? 'border-red-500/50 text-red-300'
                    : 'text-white hover:bg-white/5'
                }`}
            >
                  <div className="flex items-center gap-3">
                    {notificationPerm === 'granted' ? <Check size={20} /> : notificationPerm === 'denied' ? <BellOff size={20} className="text-red-400" /> : <Bell size={20} className="text-emerald-400" />}
                    <span>
                        {notificationPerm === 'granted' ? 'Notifications Active' : notificationPerm === 'denied' ? 'Notifications Blocked' : 'Enable Notifications'}
                    </span>
                  </div>
            </button>
            
            <button onClick={onResetApp} className="w-full p-6 bg-red-500/10 border border-red-500/20 text-red-400 rounded-[2.5rem] font-bold flex items-center justify-between">
                <span>Reset Vibe Identity</span>
                <Trash2 size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Button - Updated to Flamingo/Magenta mix */}
      {contacts.length > 0 && (
        <button
          onClick={onAdd}
          className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-fuchsia-500 to-pink-600 rounded-full flex items-center justify-center shadow-2xl shadow-pink-900/40 active:scale-90 transition-all z-50 group border border-white/20"
        >
          <Plus size={32} className="text-white group-active:rotate-90 transition-transform" />
        </button>
      )}
    </div>
  );
};

export default Dashboard;
