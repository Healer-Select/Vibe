
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { generateId, generatePairCode, sanitizeInput } from '../constants';
import { Loader2, Sparkles } from 'lucide-react';

interface Props {
  onComplete: (profile: UserProfile) => void;
}

const SetupScreen: React.FC<Props> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState(generatePairCode());
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = sanitizeInput(name);
    const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    
    if (!cleanName || cleanName.length < 2) return;
    if (!cleanCode || cleanCode.length < 4) return;

    setIsLoading(true);
    
    // Slight delay for UX so it doesn't feel jerky
    setTimeout(() => {
        onComplete({
            id: generateId(),
            displayName: cleanName.substring(0, 20),
            pairCode: cleanCode
        });
    }, 500);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-md space-y-8 text-center animate-in zoom-in duration-500">
        <div className="space-y-2">
          <h1 className="text-5xl font-outfit font-bold tracking-tight text-white drop-shadow-lg">Vibe</h1>
          <p className="text-white/60 text-sm">Replace words with touch.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 glass-panel p-8 rounded-[2.5rem] shadow-2xl">
          <div className="text-left space-y-4">
            <div>
                <label className="block text-xs uppercase tracking-widest text-white/50 font-semibold mb-2 ml-1">
                Your Name
                </label>
                <input
                autoFocus
                type="text"
                maxLength={20}
                value={name}
                disabled={isLoading}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full bg-white/5 border-white/10 border rounded-2xl px-5 py-4 text-lg focus:outline-none focus:ring-2 focus:ring-fuchsia-400/50 transition-all text-white disabled:opacity-50 placeholder-white/20"
                />
            </div>

            <div>
                <label className="block text-xs uppercase tracking-widest text-white/50 font-semibold mb-2 ml-1">
                Create Your Secret Code
                </label>
                <div className="relative">
                    <input
                        type="text"
                        maxLength={12}
                        value={code}
                        disabled={isLoading}
                        onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                        className="w-full bg-white/5 border-white/10 border rounded-2xl px-5 py-4 text-xl font-mono tracking-widest text-fuchsia-300 focus:outline-none focus:ring-2 focus:ring-fuchsia-400/50 transition-all disabled:opacity-50 uppercase"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                         <Sparkles size={16} className="text-fuchsia-300" />
                    </div>
                </div>
                <p className="text-[10px] text-white/40 mt-2 px-1">
                Share this code with your partner to connect. Make it unique!
                </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={name.trim().length < 2 || code.length < 4 || isLoading}
            className="w-full bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl shadow-lg shadow-fuchsia-900/20 transition-all active:scale-[0.98] flex items-center justify-center"
          >
            {isLoading ? <Loader2 className="animate-spin" /> : 'Get Started'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupScreen;
