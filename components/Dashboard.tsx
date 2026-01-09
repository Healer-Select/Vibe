
import React from 'react';
import { UserProfile, Contact, VibeSignal } from '../types.ts';
import { Plus, User, Share2, Activity } from 'lucide-react';
import { generateId } from '../constants.tsx';

interface Props {
  user: UserProfile;
  contacts: Contact[];
  status: 'connecting' | 'connected' | 'error';
  onlineContacts: Set<string>;
  onAdd: () => void;
  onContactClick: (contact: Contact) => void;
  onSimulateReceive: (vibe: VibeSignal) => void;
}

const Dashboard: React.FC<Props> = ({ user, contacts, status, onlineContacts, onAdd, onContactClick, onSimulateReceive }) => {
  const handleShareCode = () => {
    const text = `Connect with me on Vibe! My code is: ${user.pairCode}`;
    if (navigator.share) {
      navigator.share({ title: 'Vibe Pairing', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(user.pairCode);
      alert('Pairing code copied!');
    }
  };

  const statusColors = {
    connected: 'bg-emerald-500',
    connecting: 'bg-amber-500 animate-pulse',
    error: 'bg-rose-500'
  };

  return (
    <div className="flex-1 flex flex-col p-6 space-y-8 animate-in fade-in duration-500">
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
            <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
              {status === 'connected' ? 'Vibe Engine Active' : 'Connecting...'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleShareCode}
          className="bg-zinc-900 p-3 rounded-full border border-zinc-800 active:scale-90 transition-transform"
        >
          <Share2 size={18} className="text-rose-500" />
        </button>
      </header>

      <div className="flex-1 space-y-4 overflow-y-auto pb-24">
        {contacts.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="bg-zinc-900 w-16 h-16 rounded-3xl flex items-center justify-center border border-zinc-800">
              <Activity size={32} className="text-zinc-700" />
            </div>
            <p className="text-zinc-500 text-sm max-w-[200px]">Waiting for a connection...</p>
            <button onClick={onAdd} className="text-rose-500 font-bold text-sm">Pair Now</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {contacts.map((contact) => {
              const isOnline = onlineContacts.has(contact.pairCode);
              return (
                <button
                  key={contact.id}
                  onClick={() => onContactClick(contact)}
                  className="w-full bg-zinc-900/50 border border-zinc-800/50 p-5 rounded-[2.5rem] flex items-center space-x-4 active:scale-[0.98] transition-all text-left relative overflow-hidden group"
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
                      <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-zinc-700'}`} />
                      <p className={`text-[10px] uppercase tracking-widest font-bold ${isOnline ? 'text-emerald-500' : 'text-zinc-600'}`}>
                        {isOnline ? 'Live Now' : 'Away'}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <footer className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-zinc-950 via-zinc-950 to-transparent">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between mb-4 shadow-2xl">
          <div>
            <p className="text-zinc-500 text-[9px] uppercase tracking-widest font-bold">Your Pair Code</p>
            <p className="text-xl font-mono font-bold text-rose-500 tracking-wider">{user.pairCode}</p>
          </div>
          <div className="h-8 w-[1px] bg-zinc-800" />
          <button onClick={onAdd} className="flex flex-col items-center justify-center px-4">
            <Plus size={20} className="text-white" />
            <span className="text-[9px] uppercase font-bold text-zinc-500">Add</span>
          </button>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
