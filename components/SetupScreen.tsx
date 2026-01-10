
import React, { useState } from 'react';
import { UserProfile } from '../types.ts';
import { generateId, generatePairCode, sanitizeInput } from '../constants.tsx';
import { Loader2 } from 'lucide-react';

interface Props {
  onComplete: (profile: UserProfile) => void;
}

const SetupScreen: React.FC<Props> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeInput(name);
    
    if (!cleanName || cleanName.length < 2) return;

    setIsLoading(true);
    
    // Slight delay for UX so it doesn't feel jerky
    setTimeout(() => {
        onComplete({
        id: generateId(),
        displayName: cleanName.substring(0, 20),
        pairCode: generatePairCode()
        });
    }, 500);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 bg-zinc-950">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-2">
          <h1 className="text-4xl font-outfit font-semibold tracking-tight text-white">Vibe</h1>
          <p className="text-zinc-400 text-sm">Replace words with touch.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="text-left">
            <label className="block text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-2 ml-1">
              What's your name?
            </label>
            <input
              autoFocus
              type="text"
              maxLength={20}
              value={name}
              disabled={isLoading}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex"
              className="w-full bg-zinc-900 border-zinc-800 border rounded-2xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-rose-500/50 transition-all text-zinc-100 disabled:opacity-50"
            />
            <p className="text-[10px] text-zinc-600 mt-3 px-1">
              This is how you'll appear to your partners.
            </p>
          </div>

          <button
            type="submit"
            disabled={name.trim().length < 2 || isLoading}
            className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl shadow-lg shadow-rose-900/20 transition-all active:scale-[0.98] flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupScreen;
