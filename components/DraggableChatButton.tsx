
import React, { useRef, useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';

interface Props {
  onClick: () => void;
  unreadCount: number;
  isOpen: boolean;
}

const DraggableChatButton: React.FC<Props> = ({ onClick, unreadCount, isOpen }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 80, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  
  // Refs for drag calculation
  const dragStartRef = useRef({ x: 0, y: 0 });
  const initialPosRef = useRef({ x: 0, y: 0 });
  const hasMovedRef = useRef(false);

  useEffect(() => {
    // Load persisted position
    const savedPos = localStorage.getItem('vibe_chat_pos');
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        // Basic bounds check
        const safeX = Math.min(Math.max(0, parsed.x), window.innerWidth - 60);
        const safeY = Math.min(Math.max(0, parsed.y), window.innerHeight - 60);
        setPosition({ x: safeX, y: safeY });
      } catch (e) {}
    }
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag with primary button
    if (e.button !== 0) return;
    
    (e.target as Element).setPointerCapture(e.pointerId);
    
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    initialPosRef.current = { ...position };
    setIsDragging(true);
    hasMovedRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        hasMovedRef.current = true;
    }

    setPosition({
      x: initialPosRef.current.x + dx,
      y: initialPosRef.current.y + dy
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    (e.target as Element).releasePointerCapture(e.pointerId);

    if (!hasMovedRef.current) {
      onClick();
      // Snap back to initial if it was just a tap
      setPosition(initialPosRef.current);
    } else {
      // Snap logic
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const buttonSize = 64; 
      const margin = 16;

      let finalX = position.x;
      let finalY = position.y;

      // Snap to Left or Right edge
      if (position.x + buttonSize / 2 < screenW / 2) {
        finalX = margin;
      } else {
        finalX = screenW - buttonSize - margin;
      }

      // Clamp Y
      finalY = Math.max(margin, Math.min(finalY, screenH - buttonSize - margin));

      setPosition({ x: finalX, y: finalY });
      localStorage.setItem('vibe_chat_pos', JSON.stringify({ x: finalX, y: finalY }));
    }
  };

  return (
    <button
      ref={buttonRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: `translate(${position.x}px, ${position.y}px)`,
        touchAction: 'none' 
      }}
      className={`fixed top-0 left-0 z-[60] p-4 rounded-full text-white shadow-2xl transition-transform active:scale-95 active:cursor-grabbing cursor-grab flex items-center justify-center
        ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}
        ${isDragging ? 'bg-zinc-800 scale-105' : 'glass-button bg-white/5 backdrop-blur-md border border-white/10 hover:bg-white/10'}
      `}
    >
      <MessageCircle size={24} className="pointer-events-none" />
      {unreadCount > 0 && (
        <div className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-zinc-950 shadow-sm pointer-events-none animate-in zoom-in">
            {unreadCount}
        </div>
      )}
    </button>
  );
};

export default DraggableChatButton;
