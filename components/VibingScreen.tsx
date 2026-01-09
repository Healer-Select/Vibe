
import React, { useState, useRef, useEffect } from 'react';
import { Contact, UserProfile, VibeType } from '../types.ts';
import { ChevronLeft, Info, Heart } from 'lucide-react';
import { triggerHaptic } from '../constants.tsx';

interface Props {
  contact: Contact;
  user: UserProfile;
  onBack: () => void;
  onSendVibe: (type: VibeType, count?: number, duration?: number) => void;
}

const VibingScreen: React.FC<Props> = ({ contact, user, onBack, onSendVibe }) => {
  const [isPressing, setIsPressing] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [status, setStatus] = useState<'idle' | 'holding' | 'tapped'>('idle');
  
  const pressStartTime = useRef<number | null>(null);
  const tapTimer = useRef<number | null>(null);

  const LONG_PRESS_THRESHOLD = 300;
  const TAP_WINDOW = 500;

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsPressing(true);
    setStatus('holding');
    pressStartTime.current = Date.now();
    
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }

    triggerHaptic(40);
  };

  const handleEnd = () => {
    if (!isPressing || !pressStartTime.current) return;

    const duration = Date.now() - pressStartTime.current;
    setIsPressing(false);
    pressStartTime.current = null;

    if (duration > LONG_PRESS_THRESHOLD) {
      onSendVibe('hold', undefined, duration);
      setStatus('idle');
      triggerHaptic([60, 100, 60]);
    } else {
      setTapCount(prev => prev + 1);
      setStatus('tapped');
      triggerHaptic(40);
      
      tapTimer.current = window.setTimeout(() => {
        setTapCount(current => {
          onSendVibe('tap', current);
          return 0;
        });
        setStatus('idle');
      }, TAP_WINDOW);
    }
  };

  useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, []);

  const heartColor = contact.color.replace('bg-', 'text-');

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      <header className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 active:scale-90 transition-transform">
          <ChevronLeft size={28} />
        </button>
        <div className="text-center">
          <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-bold mb-0.5">Vibing with</h2>
          <h1 className="text-xl font-outfit font-semibold text-white">{contact.name}</h1>
        </div>
        <div className="w-10" />
      </header>

      <div className="flex-1 flex flex-col items-center justify-center relative">
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-all duration-700 pointer-events-none ${
            isPressing ? 'opacity-100 scale-125' : 'opacity-20 scale-100'
          }`}
        >
          <div className={`w-80 h-80 rounded-full blur-[100px] ${contact.color} opacity-30`} />
        </div>

        <div className="absolute top-10 text-center z-20 h-20">
          {tapCount > 0 ? (
            <div className="animate-bounce">
               <p className="text-5xl font-outfit font-bold text-white drop-shadow-lg">{tapCount}</p>
               <p className="text-zinc-400 text-xs uppercase tracking-widest font-bold">Pulses</p>
            </div>
          ) : status === 'holding' ? (
            <p className="text-white text-sm font-medium animate-pulse tracking-wide italic">"I'm here..."</p>
          ) : null}
        </div>

        <div 
          onMouseDown={handleStart}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchStart={handleStart}
          onTouchEnd={handleEnd}
          className="relative group cursor-pointer no-select touch-none"
        >
          {isPressing && (
            <>
              <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${contact.color}`} style={{ animationDuration: '1.5s' }} />
              <div className={`absolute -inset-10 rounded-full animate-pulse opacity-10 ${contact.color}`} />
            </>
          )}

          <div className={`transition-all duration-300 transform ${isPressing ? 'scale-110' : 'scale-100'}`}>
            <Heart 
              size={180} 
              strokeWidth={1.2}
              className={`${heartColor} transition-all duration-500 ${isPressing ? 'fill-current' : 'fill-transparent'}`}
            />
          </div>
        </div>

        <div className="absolute bottom-16 w-full flex justify-center space-x-12 px-6">
          <div className={`flex flex-col items-center space-y-2 transition-opacity duration-300 ${status === 'holding' ? 'opacity-20' : 'opacity-100'}`}>
             <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Tap</p>
             <p className="text-zinc-300 text-xs">A quick pulse</p>
          </div>
          <div className={`flex flex-col items-center space-y-2 transition-opacity duration-300 ${status === 'tapped' ? 'opacity-20' : 'opacity-100'}`}>
             <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Hold</p>
             <p className="text-zinc-300 text-xs">A long hug</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VibingScreen;
