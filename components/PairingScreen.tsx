
import React, { useState } from 'react';
import { Contact } from '../types.ts';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';
import { generateId, getRandomColor, sanitizeInput } from '../constants.tsx';

interface Props {
  onBack: () => void;
  onAdd: (contact: Contact) => void;
}

const PairingScreen: React.FC<Props> = ({ onBack, onAdd }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = code.toUpperCase().trim();
    const cleanName = sanitizeInput(name);

    if (cleanCode.length !== 6 || !cleanName) return;

    setIsVerifying(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    onAdd({
      id: generateId(),
      name: cleanName.substring(0, 20),
      pairCode: cleanCode,
      color: getRandomColor()
    });
    
    setIsVerifying(false);
  };

  return (
    <div className="flex-1 flex flex-col p-6 animate-in slide-in-from-right duration-300">
      <header className="flex items-center space-x-4 mb-10">
        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400">
          <ChevronLeft size={28} />
        </button>
        <h1 className="text-xl font-outfit font-semibold">Pair with someone</h1>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 space-y-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold ml-1">Pairing Code</label>
            <input
              disabled={isVerifying}
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE"
              maxLength={6}
              className="w-full bg-zinc-900 border-zinc-800 border rounded-2xl px-5 py-5 text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-rose-500 disabled:opacity-50"
            />
            <p className="text-xs text-zinc-600 px-1">Verification adds a layer of safety.</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs uppercase tracking-widest text-zinc-500 font-bold ml-1">Label</label>
            <input
              disabled={isVerifying}
              type="text"
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mom, Partner"
              className="w-full bg-zinc-900 border-zinc-800 border rounded-2xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-rose-500/50 text-zinc-100 disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex-1" />

        <button
          type="submit"
          disabled={code.length !== 6 || !name.trim() || isVerifying}
          className="w-full h-16 bg-rose-600 disabled:opacity-30 text-white font-bold rounded-2xl flex items-center justify-center space-x-2 transition-all active:scale-[0.97] shadow-xl shadow-rose-900/10"
        >
          {isVerifying ? (
            <Loader2 className="animate-spin" size={24} />
          ) : (
            <>
              <Check size={24} />
              <span>Confirm Connection</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default PairingScreen;
