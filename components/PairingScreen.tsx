
import React, { useState } from 'react';
import { Contact } from '../types.ts';
import { ChevronLeft, Check, Loader2, Smile } from 'lucide-react';
import { generateId, getRandomColor, sanitizeInput } from '../constants.tsx';

interface Props {
  onBack: () => void;
  onAdd: (contact: Contact) => void;
}

const EMOJIS = ['❤️', '🔥', '🌸', '🦊', '🐨', '☁️', '👫', '🫂', '🍀', '🦋'];

const PairingScreen: React.FC<Props> = ({ onBack, onAdd }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('❤️');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.toUpperCase().trim();
    const cleanName = sanitizeInput(name);
    if (cleanCode.length !== 6 || !cleanName) return;

    setIsVerifying(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    onAdd({
      id: generateId(),
      name: cleanName.substring(0, 20),
      emoji: emoji,
      pairCode: cleanCode,
      color: getRandomColor()
    });
    setIsVerifying(false);
  };

  return (
    <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-right duration-300">
      <header className="flex items-center space-x-4 mb-10">
        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400"><ChevronLeft size={28} /></button>
        <h1 className="text-2xl font-outfit font-semibold">Pairing</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col space-y-10">
        <div className="space-y-8">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-black ml-1">Pairing Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="6-CHAR CODE"
              maxLength={6}
              className="w-full bg-zinc-900 border-white/5 border rounded-[1.5rem] px-6 py-6 text-3xl font-mono tracking-[0.3em] focus:outline-none focus:border-rose-500/50 text-rose-500 placeholder:opacity-20"
            />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-black ml-1">Their Name</label>
            <input
              type="text"
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full bg-zinc-900 border-white/5 border rounded-[1.5rem] px-6 py-5 text-xl focus:outline-none focus:border-rose-500/50 placeholder:opacity-20"
            />
          </div>

          <div className="space-y-4">
             <label className="text-[10px] uppercase tracking-widest text-zinc-600 font-black ml-1 flex items-center gap-2">
                Soul Emoji
             </label>
             <div className="grid grid-cols-5 gap-3">
                {EMOJIS.map(e => (
                   <button
                     key={e}
                     type="button"
                     onClick={() => setEmoji(e)}
                     className={`h-14 rounded-2xl text-2xl flex items-center justify-center transition-all duration-300 ${emoji === e ? 'bg-rose-600 shadow-lg scale-110' : 'bg-zinc-900 border border-white/5 opacity-40 hover:opacity-100'}`}
                   >
                    {e}
                   </button>
                ))}
             </div>
          </div>
        </div>

        <div className="flex-1" />

        <button
          type="submit"
          disabled={code.length !== 6 || !name.trim() || isVerifying}
          className="w-full h-18 bg-white text-black font-black text-sm uppercase tracking-widest rounded-[2rem] flex items-center justify-center space-x-2 transition-all active:scale-[0.96] disabled:opacity-20 shadow-2xl"
        >
          {isVerifying ? <Loader2 className="animate-spin" size={24} /> : <span>Start Vibing</span>}
        </button>
      </form>
    </div>
  );
};

export default PairingScreen;
