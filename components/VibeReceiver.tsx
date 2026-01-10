import React, { useEffect, useState } from 'react';
import { VibeSignal, Contact } from '../types.ts';
import { Heart } from 'lucide-react';

interface Props {
  vibe: VibeSignal;
  contacts: Contact[];
}

const VibeReceiver: React.FC<Props> = ({ vibe, contacts }) => {
  const [visible, setVisible] = useState(false);
  
  // Find sender to get their color
  const sender = contacts.find(c => c.pairCode === vibe.senderId);
  // Default to rose if not found, extract the color name (e.g., 'rose', 'emerald') from the class
  const colorClass = sender ? sender.color : 'bg-rose-500';
  const colorName = colorClass.replace('bg-', '').replace('-500', '');

  useEffect(() => {
    setVisible(true);
    // Longer visibility for immersive effect
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, [vibe]);

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center animate-in fade-in duration-700"
      onClick={() => setVisible(false)}
    >
      {/* Ambient Background Layer */}
      <div className={`absolute inset-0 ${colorClass} opacity-20 backdrop-blur-3xl`} />
      
      {/* Pulsing Core Layer */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className={`w-[150vw] h-[150vw] ${colorClass} rounded-full blur-[120px] opacity-20 animate-pulse`} style={{ animationDuration: '3s' }} />
        <div className={`absolute w-96 h-96 ${colorClass} rounded-full blur-[80px] opacity-30 animate-ping`} style={{ animationDuration: '4s' }} />
      </div>

      {/* Content Layer */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-8 p-8">
        <div className="relative">
           {/* Ripple Effect */}
           <div className={`absolute -inset-12 ${colorClass} opacity-30 rounded-full animate-ping`} style={{ animationDuration: '1.5s' }} />
           <div className={`absolute -inset-20 ${colorClass} opacity-20 rounded-full animate-pulse`} />
           
           {/* Main Icon */}
           <div className={`w-32 h-32 rounded-full ${colorClass} flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-white/10 backdrop-blur-md`}>
              {vibe.type === 'pattern' && vibe.patternEmoji ? (
                <span className="text-6xl animate-bounce">{vibe.patternEmoji}</span>
              ) : (
                <Heart size={64} className="text-white fill-white animate-bounce" />
              )}
           </div>
        </div>

        <div className="space-y-2 max-w-xs">
          <h2 className="text-4xl font-outfit font-bold text-white drop-shadow-xl tracking-tight">
            {vibe.senderName}
          </h2>
          <p className="text-white/80 text-lg font-medium uppercase tracking-widest drop-shadow-md">
            {vibe.type === 'tap' 
              ? 'is thinking of you'
              : vibe.type === 'pattern'
              ? `sent ${vibe.patternName}`
              : 'is holding you close'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default VibeReceiver;