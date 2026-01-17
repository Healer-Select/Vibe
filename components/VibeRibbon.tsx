
import React, { useEffect, useState } from 'react';
import { VibeSignal, Contact } from '../types';
import { Wind, Grid3X3, PenTool, X, ArrowRight, Heart } from 'lucide-react';

interface Props {
  invite: VibeSignal;
  contact?: Contact;
  onAccept: () => void;
  onDismiss: () => void;
}

const VibeRibbon: React.FC<Props> = ({ invite, contact, onAccept, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setIsVisible(true));

    // Auto-dismiss after 10 seconds to respect user attention
    const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Allow animation to finish
    }, 10000);

    return () => clearTimeout(timer);
  }, [invite, onDismiss]);

  const handleDismiss = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsVisible(false);
      setTimeout(onDismiss, 300);
  };

  const handleAccept = () => {
      setIsVisible(false);
      setTimeout(onAccept, 300);
  };

  // Determine Context
  let Icon = Heart;
  let actionText = "sent a vibe";
  let colorClass = contact?.color || "bg-rose-500";
  
  if (invite.category === 'matrix') {
      Icon = Grid3X3;
      actionText = "wants to play Telepathy";
  } else if (invite.category === 'breathe') {
      Icon = Wind;
      actionText = "wants to Breathe with you";
  } else if (invite.category === 'draw') {
      Icon = PenTool;
      actionText = "invited you to Draw";
  }

  return (
    <div 
        className={`fixed top-safe left-4 right-4 z-[200] transition-all duration-500 transform ${isVisible ? 'translate-y-4 opacity-100' : '-translate-y-full opacity-0'}`}
    >
        <div className="glass-panel p-2 rounded-full flex items-center shadow-2xl backdrop-blur-xl border border-white/20 bg-black/40">
            {/* Icon */}
            <div className={`w-10 h-10 rounded-full ${colorClass} flex items-center justify-center shrink-0 shadow-lg`}>
                <Icon size={18} className="text-white fill-white/20" />
            </div>

            {/* Text */}
            <div className="flex-1 ml-3 flex flex-col justify-center cursor-pointer" onClick={handleAccept}>
                <span className="text-sm font-bold text-white leading-tight">{contact?.name || invite.senderName}</span>
                <span className="text-[10px] text-white/70 uppercase tracking-wide font-medium">{actionText}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 pr-1">
                <button 
                    onClick={handleAccept}
                    className="bg-white text-black px-4 py-2 rounded-full text-xs font-bold hover:bg-white/90 active:scale-95 transition-all flex items-center gap-1"
                >
                    <span>Join</span>
                    <ArrowRight size={12} />
                </button>
                <button 
                    onClick={handleDismiss}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    </div>
  );
};

export default VibeRibbon;
