
import React, { useEffect, useState } from 'react';
import { VibeSignal } from '../types.ts';
import { Heart } from 'lucide-react';

interface Props {
  vibe: VibeSignal;
}

const VibeReceiver: React.FC<Props> = ({ vibe }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 4500);
    return () => clearTimeout(timer);
  }, [vibe]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 top-12 flex justify-center z-[150] px-6 pointer-events-none animate-in fade-in slide-in-from-top-10 duration-500">
      <div className="bg-zinc-900/95 backdrop-blur-2xl border border-white/10 px-6 py-4 rounded-[2.5rem] shadow-3xl flex items-center space-x-4 max-w-sm w-full">
        <div className="relative">
          <div className="absolute inset-0 bg-rose-500 rounded-full blur-md opacity-50 animate-pulse" />
          <div className="relative w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-xl">
            {vibe.type === 'pattern' && vibe.patternEmoji ? (
              <span className="animate-bounce">{vibe.patternEmoji}</span>
            ) : (
              <Heart size={24} className="text-white fill-white animate-bounce" />
            )}
          </div>
        </div>
        <div className="flex-1">
          <h4 className="text-zinc-100 font-semibold font-outfit text-base">{vibe.senderName}</h4>
          <p className="text-zinc-400 text-[11px] leading-tight">
            {vibe.type === 'tap' 
              ? `Sent ${vibe.count} intense ${vibe.count === 1 ? 'tap' : 'taps'}`
              : vibe.type === 'pattern'
              ? `Sent the "${vibe.patternName}" vibe`
              : `Sent a long, deep hold`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VibeReceiver;
