
import React, { useState, useEffect } from 'react';
import { UserProfile, Contact } from '../types.ts';
import { Plus, User, Share2, Activity, Settings, Trash2, X, Smartphone, Copy } from 'lucide-react';

interface Props {
  user: UserProfile;
  contacts: Contact[];
  status: 'connecting' | 'connected' | 'error';
  onlineContacts: Set<string>;
  onAdd: () => void;
  onContactClick: (contact: Contact) => void;
  onDeleteContact: (id: string) => void;
  onResetApp: () => void;
}

const Dashboard: React.FC<Props> = ({ 
  user, contacts, status, onlineContacts, onAdd, onContactClick, onDeleteContact, onResetApp
}) => {
  const [showSettings, setShowSettings] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsStandalone(window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone);
  }, []);

  const handleShareLink = () => {
    const url = `${window.location.origin}/?pair=${user.pairCode}&name=${encodeURIComponent(user.displayName)}`;
    if (navigator.share) {
      navigator.share({ 
        title: 'Vibe Invitation', 
        text: `Pair with ${user.displayName} to send touches across distance:`, 
        url 
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url);
      alert("Invitation link copied to clipboard!");
    }
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 animate-in fade-in duration-500 relative">
      <header className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <User size={20} className="text-zinc-400" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-zinc-950 ${status === 'connected' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 animate-pulse'}`} />
          </div>
          <div>
            <h1 className="text-xl font-outfit font-semibold">{user.displayName}</h1>
            <p className="text-[9px] uppercase tracking-widest text-zinc-500 font-black">
              {status === 'connected' ? 'Heartbeat Active' : 'Connecting...'}
            </p>
          </div>
        </div>
        <button onClick={() => setShowSettings(true)} className="bg-zinc-900 p-3 rounded-2xl border border-zinc-800 text-zinc-400 active:scale-90 transition-transform">
          <Settings size={20} />
        </button>
      </header>

      {/* Subtle PWA Instruction */}
      {!isStandalone && (
        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center space-x-3 backdrop-blur-sm">
          <Smartphone size={16} className="text-emerald-500 shrink-0" />
          <p className="text-[10px] text-zinc-400 leading-tight">
            Add to Home Screen to get <span className="text-emerald-400 font-bold">stronger vibrations</span> and background signals.
          </p>
        </div>
      )}

      <div className="flex-1 space-y-4 overflow-y-auto pb-32 no-scrollbar">
        {contacts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-6 text-center">
             <div className="bg-zinc-900 w-20 h-20 rounded-[2.5rem] flex items-center justify-center border border-zinc-800 shadow-inner">
              <Activity size={32} className="text-zinc-700" />
            </div>
            <div className="space-y-1 px-4">
                <p className="text-zinc-200 font-semibold text-lg">Send your invite link</p>
                <p className="text-zinc-500 text-xs max-w-[200px] mx-auto">Vibe works best when you share it with someone you care about.</p>
            </div>
            <button onClick={handleShareLink} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 shadow-xl shadow-rose-900/20 active:scale-95 transition-all">
                <Share2 size={18} /> Invite Someone
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
                    className="w-full bg-zinc-900/40 border border-white/5 p-6 rounded-[2.5rem] flex items-center space-x-5 active:scale-[0.98] transition-all text-left relative overflow-hidden backdrop-blur-sm shadow-xl"
                  >
                    <div className="relative shrink-0">
                      {isOnline && (
                        <div className="absolute -inset-3 rounded-2xl bg-emerald-500/20 animate-pulse blur-md" />
                      )}
                      <div className={`relative w-16 h-16 rounded-2xl ${contact.color} flex items-center justify-center shadow-2xl transition-all duration-700 ${isOnline ? 'scale-105' : 'grayscale-[0.4] opacity-70'}`}>
                        <span className="text-white text-3xl drop-shadow-md">{contact.emoji}</span>
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-outfit font-medium text-xl text-white">{contact.name}</h3>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-zinc-700'}`} />
                        <p className={`text-[9px] uppercase tracking-widest font-black ${isOnline ? 'text-emerald-500' : 'text-zinc-600'}`}>
                          {isOnline ? 'Online' : 'Disconnected'}
                        </p>
                      </div>
                    </div>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); if (confirm(`Remove connection with ${contact.name}?`)) onDeleteContact(contact.id); }}
                    className="absolute right-6 top-1/2 -translate-y-1/2 p-4 text-zinc-800 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
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
        <div className="fixed inset-0 z-[100] bg-zinc-950/98 backdrop-blur-3xl animate-in fade-in duration-300 p-8 flex flex-col">
          <div className="flex justify-between items-center mb-12">
            <h2 className="text-3xl font-outfit font-semibold text-white">Vibe Profile</h2>
            <button onClick={() => setShowSettings(false)} className="p-2 text-zinc-500 active:scale-90"><X size={36} /></button>
          </div>
          <div className="flex-1 space-y-10">
            <div className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-[2.5rem] space-y-6">
               <div>
                  <p className="text-[10px] uppercase font-black text-zinc-600 tracking-widest mb-1">Your Display Name</p>
                  <p className="text-2xl font-semibold">{user.displayName}</p>
               </div>
               <div className="h-[1px] bg-zinc-800 w-full" />
               <button onClick={handleShareLink} className="w-full py-5 bg-white text-black rounded-[1.5rem] font-bold flex items-center justify-center gap-3 active:scale-95 transition-all">
                  <Copy size={20} /> Copy Your Share Link
               </button>
            </div>
            
            <div className="space-y-4">
                <p className="text-[10px] uppercase font-black text-zinc-600 tracking-widest px-4">Danger Zone</p>
                <button onClick={onResetApp} className="w-full p-6 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-[2.5rem] font-bold flex items-center justify-between active:scale-95 transition-all">
                    <span>Reset Account</span>
                    <Trash2 size={20} />
                </button>
            </div>
          </div>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent pointer-events-none">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button onClick={onAdd} className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 w-full h-18 rounded-[2rem] active:scale-95 transition-all flex items-center justify-center space-x-3 shadow-2xl">
            <Plus size={24} className="text-rose-500" />
            <span className="font-bold text-sm uppercase tracking-widest text-zinc-200">Pair Someone</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
