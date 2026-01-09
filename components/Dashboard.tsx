
import React, { useState, useEffect } from 'react';
import { UserProfile, Contact, VibeSignal } from '../types.ts';
import { Plus, User, Share2, Activity, Bell, BellOff, Settings, Trash2, X, RefreshCw, Smartphone, Download } from 'lucide-react';

interface Props {
  user: UserProfile;
  contacts: Contact[];
  status: 'connecting' | 'connected' | 'error';
  onlineContacts: Set<string>;
  notificationPermission: NotificationPermission;
  onRequestNotifications: () => void;
  onAdd: () => void;
  onContactClick: (contact: Contact) => void;
  onSimulateReceive: (vibe: VibeSignal) => void;
  onDeleteContact: (id: string) => void;
  onResetApp: () => void;
}

const Dashboard: React.FC<Props> = ({ 
  user, 
  contacts, 
  status, 
  onlineContacts, 
  notificationPermission,
  onRequestNotifications,
  onAdd, 
  onContactClick,
  onDeleteContact,
  onResetApp
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Check if running as a standalone app (PWA)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsPWA(true);
    } else {
      setShowInstallGuide(true);
    }
  }, []);

  const handleShareCode = () => {
    const text = `Connect with me on Vibe! My code is: ${user.pairCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Vibe Pairing', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(user.pairCode);
    }
  };

  const statusColors = {
    connected: 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]',
    connecting: 'bg-amber-500 animate-pulse',
    error: 'bg-rose-500'
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 animate-in fade-in duration-500 relative">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center`}>
              <User size={18} className="text-zinc-400" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-zinc-950 ${statusColors[status]}`} />
          </div>
          <div>
            <h1 className="text-xl font-outfit font-semibold">{user.displayName}</h1>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold flex items-center gap-1">
              {status === 'connected' ? (
                <>
                  <RefreshCw size={8} className="animate-spin-slow" />
                  Live Sync
                </>
              ) : status === 'error' ? 'Offline' : 'Connecting...'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {!isPWA && (
            <button 
              onClick={() => setShowInstallGuide(true)}
              className="bg-zinc-900 p-3 rounded-full border border-zinc-800 text-zinc-400"
            >
              <Download size={18} />
            </button>
          )}
          <button 
            onClick={() => setShowSettings(true)}
            className="bg-zinc-900 p-3 rounded-full border border-zinc-800 active:rotate-90 transition-transform"
          >
            <Settings size={18} className="text-zinc-400" />
          </button>
        </div>
      </header>

      {/* Install Guide Banner */}
      {showInstallGuide && !isPWA && (
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center space-x-4 animate-in slide-in-from-top-4 relative overflow-hidden">
          <div className="bg-blue-500/20 p-2 rounded-xl">
            <Smartphone size={20} className="text-blue-500" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white">Add Vibe to Home Screen</h4>
            <p className="text-[10px] text-zinc-400">Remove the browser bar for a full experience.</p>
          </div>
          <button 
            onClick={() => setShowInstallGuide(false)}
            className="text-zinc-500 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto pb-24">
        {contacts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-zinc-900 w-16 h-16 rounded-3xl flex items-center justify-center border border-zinc-800">
              <Activity size={32} className="text-zinc-700" />
            </div>
            <p className="text-zinc-500 text-sm max-w-[200px]">Waiting for your first connection...</p>
            <button onClick={onAdd} className="text-rose-500 font-bold text-sm">Pair Now</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {contacts.map((contact) => {
              const isOnline = onlineContacts.has(contact.pairCode);
              return (
                <div key={contact.id} className="relative group">
                  <button
                    onClick={() => onContactClick(contact)}
                    className="w-full bg-zinc-900/50 border border-zinc-800/50 p-5 rounded-[2.5rem] flex items-center space-x-4 active:scale-[0.98] transition-all text-left relative overflow-hidden"
                  >
                    <div className="relative">
                      {isOnline && (
                        <div className="absolute -inset-1 rounded-2xl bg-emerald-500/20 animate-pulse" />
                      )}
                      <div className={`relative w-14 h-14 rounded-2xl ${contact.color} flex items-center justify-center shadow-lg transition-transform ${isOnline ? 'scale-105' : ''}`}>
                        <span className="text-white text-xl font-bold">{contact.name.charAt(0)}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-outfit font-medium text-lg text-white">{contact.name}</h3>
                      <div className="flex items-center space-x-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                        <p className={`text-[10px] uppercase tracking-widest font-bold ${isOnline ? 'text-emerald-500' : 'text-zinc-600'}`}>
                          {isOnline ? 'Active' : 'Offline'}
                        </p>
                      </div>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Unpair from ${contact.name}?`)) onDeleteContact(contact.id);
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-4 text-zinc-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-zinc-950/90 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-10">
            <h2 className="text-2xl font-outfit font-semibold text-white">Settings</h2>
            <button onClick={() => setShowSettings(false)} className="p-2 text-zinc-500">
              <X size={28} />
            </button>
          </div>

          <div className="flex-1 space-y-8 overflow-y-auto">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Your Identity</p>
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{user.displayName}</p>
                  <p className="text-xs text-zinc-500">Pair Code: {user.pairCode}</p>
                </div>
                <button onClick={handleShareCode} className="p-2 text-rose-500 bg-rose-500/10 rounded-lg">
                  <Share2 size={16} />
                </button>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-900">
               <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">Connections</p>
               <button 
                onClick={onAdd}
                className="w-full flex items-center justify-between p-4 bg-zinc-900 border border-zinc-800 text-white rounded-2xl font-bold active:scale-95 transition-all"
               >
                 <span>Add Connection</span>
                 <Plus size={18} />
               </button>
            </div>

            <div className="space-y-4 pt-4 border-t border-zinc-900">
               <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold">App Data</p>
               <button 
                onClick={onResetApp}
                className="w-full flex items-center justify-between p-4 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-2xl font-bold active:scale-95 transition-all"
               >
                 <span>Reset Profile</span>
                 <Trash2 size={18} />
               </button>
               <p className="text-[10px] text-zinc-600 leading-relaxed italic">
                 Warning: This will delete your name, your code, and all connections.
               </p>
            </div>
          </div>
        </div>
      )}

      {/* PWA Install Instructions Modal */}
      {showInstallGuide && !isPWA && (
        <div className="fixed inset-0 z-[110] bg-zinc-950/90 backdrop-blur-xl p-8 flex flex-col justify-center animate-in fade-in duration-300">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 text-center space-y-6 shadow-3xl">
            <div className="w-16 h-16 bg-rose-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-900/30">
              <Download size={32} className="text-white" />
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-outfit font-semibold">Install Vibe</h2>
              <p className="text-zinc-400 text-sm">To feel vibrations properly and avoid the browser bars, add Vibe to your home screen.</p>
            </div>
            
            <div className="space-y-4 text-left bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/50">
              <div className="flex items-start space-x-3">
                <div className="bg-zinc-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-rose-500 shrink-0 mt-0.5">1</div>
                <p className="text-xs text-zinc-300">Tap the <span className="text-white font-bold">Share</span> button (iOS) or <span className="text-white font-bold">Menu</span> (Android).</p>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-zinc-800 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-rose-500 shrink-0 mt-0.5">2</div>
                <p className="text-xs text-zinc-300">Select <span className="text-white font-bold">"Add to Home Screen"</span>.</p>
              </div>
            </div>

            <button 
              onClick={() => setShowInstallGuide(false)}
              className="w-full py-4 bg-white text-black font-bold rounded-2xl active:scale-95 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pointer-events-none">
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] p-4 flex items-center justify-between mb-4 shadow-2xl pointer-events-auto max-w-sm mx-auto">
          <div className="pl-2">
            <p className="text-zinc-500 text-[9px] uppercase tracking-widest font-bold">Your Pair Code</p>
            <p className="text-xl font-mono font-bold text-rose-500 tracking-wider">{user.pairCode}</p>
          </div>
          <button onClick={onAdd} className="bg-rose-600 p-4 rounded-2xl active:scale-90 transition-transform flex items-center space-x-2">
            <Plus size={20} className="text-white" />
            <span className="text-xs font-bold uppercase tracking-widest">Connect</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
