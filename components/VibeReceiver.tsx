
import React, { useEffect, useState } from 'react';
import { VibeSignal, Contact } from '../types';
import { Heart, Activity, Wind, Grid3X3, PenTool, X } from 'lucide-react';

interface Props {
  vibe: VibeSignal;
  contacts: Contact[];
  onDismiss: () => void;
}

const VibeReceiver: React.FC<Props> = ({ vibe, contacts, onDismiss }) => {
  const [visible, setVisible] = useState(false);
  
  // Find sender to get their color
  const sender = contacts.find(c => c.pairCode === vibe.senderId);
  const colorClass = sender ? sender.color : 'bg-rose-500';

  useEffect(() => {
    setVisible(true);
    // If it's a tap or pattern, fade out. If it's an invite (Matrix, Breathe), keep it until dismissed or acted upon ideally, but for now 5s.
    const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onDismiss, 500); // Wait for fade out
    }, 5000);
    return () => clearTimeout(timer);
  }, [vibe]);

  // Determine Icon & Text based on Type
  let Icon = Heart;
  let subText = "sent a vibe";
  
  if (vibe.type === 'game-matrix') {
      Icon = Grid3X3;
      subText = "Invited you to play Telepathy";
  } else if (vibe.type === 'breathe') {
      Icon = Wind;
      subText = "Invited you to Breathe";
  } else if (vibe.type === 'draw') {
      Icon = PenTool;
      subText = "Invited you to Draw";
  } else if (vibe.type === 'heartbeat') {
      Icon = Activity;
      subText = "Is sending their heartbeat";
  } else if (vibe.type === 'tap') {
      subText = "is thinking of you";
  } else if (vibe.type === 'hold') {
      subText = "is holding you close";
  } else if (vibe.type === 'pattern') {
      subText = `sent ${vibe.patternName}`;
  }

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 z-[200] flex flex-col animate-in fade-in duration-700 pointer-events-auto"
      onClick={() => { setVisible(false); setTimeout(onDismiss, 500); }}
    >
      {/* Ambient Background Layer */}
      <div className={`absolute inset-0 ${colorClass} opacity-20 backdrop-blur-3xl`} />
      
      {/* Pulsing Core Layer */}
      <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
        <div className={`w-[150vw] h-[150vw] ${colorClass} rounded-full blur-[120px] opacity-20 animate-pulse`} style={{ animationDuration: '3s' }} />
      </div>

      {/* Dismiss Button */}
      <button 
        onClick={(e) => { e.stopPropagation(); setVisible(false); setTimeout(onDismiss, 500); }} 
        className="absolute top-8 right-8 z-50 p-4 bg-black/20 rounded-full text-white/60 hover:text-white backdrop-blur-md"
      >
        <X size={24} />
      </button>

      {/* Content Layer */}
      <div className="relative z-10 flex-1 flex flex-col justify-between p-8">
        
        {/* TOP: Message (Whisper) */}
        <div className="flex-1 flex items-start justify-center pt-12">
           {vibe.text && (
            <div className="bg-white/10 backdrop-blur-md px-8 py-6 rounded-[2rem] border border-white/10 animate-in slide-in-from-top duration-700 shadow-2xl max-w-sm transform hover:scale-105 transition-transform">
                <p className="text-2xl font-outfit font-medium text-white italic text-center leading-relaxed">"{vibe.text}"</p>
            </div>
          )}
        </div>

        {/* CENTER: Visual Heart/Icon */}
        <div className="flex-1 flex items-center justify-center">
            <div className="relative">
                {/* Ripple Effect */}
                <div className={`absolute -inset-12 ${colorClass} opacity-30 rounded-full animate-ping`} style={{ animationDuration: '1.5s' }} />
                <div className={`absolute -inset-20 ${colorClass} opacity-20 rounded-full animate-pulse`} />
                
                {/* Main Icon */}
                <div className={`w-36 h-36 rounded-full ${colorClass} flex items-center justify-center shadow-[0_0_50px_rgba(0,0,0,0.5)] border-4 border-white/10 backdrop-blur-md animate-bounce`}>
                    {vibe.type === 'pattern' && vibe.patternEmoji ? (
                        <span className="text-7xl">{vibe.patternEmoji}</span>
                    ) : (
                        <Icon size={72} className="text-white fill-white/20" />
                    )}
                </div>
            </div>
        </div>

        {/* BOTTOM: Sender Info */}
        <div className="flex-1 flex flex-col items-center justify-end pb-12 space-y-2">
            <h2 className="text-4xl font-outfit font-bold text-white drop-shadow-xl tracking-tight">
                {vibe.senderName}
            </h2>
            <p className="text-white/60 text-xs font-bold uppercase tracking-[0.2em] drop-shadow-md text-center">
                {subText}
            </p>
            {/* If it's an invite, show call to action */}
            {['game-matrix', 'breathe', 'draw'].includes(vibe.type) && (
                 <p className="text-white/40 text-[10px] uppercase tracking-widest mt-2 bg-white/10 px-3 py-1 rounded-full">
                     Tap to join
                 </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default VibeReceiver;
