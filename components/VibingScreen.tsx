
import React, { useState, useRef, useEffect } from 'react';
import { Contact, UserProfile, VibeCategory, VibeAction, VibePattern, VibeSignal, ChatMessage } from '../types';
import { ChevronLeft, Heart, Plus, X, CircleDot, Activity, PenTool, Wind, Grid3X3, Play, Pause, Square, MessageCircle } from 'lucide-react';
import { triggerHaptic, generateId } from '../constants';
import ChatDrawer from './ChatScreen'; 

interface Props {
  contact: Contact;
  user: UserProfile;
  onBack: () => void;
  incomingVibe: VibeSignal | null;
  onSendVibe: (type: VibeCategory, action: VibeAction, payload: Partial<VibeSignal>) => Promise<void>;
  customPatterns: VibePattern[];
  onSavePattern: (pattern: VibePattern) => void;
  onDeletePattern: (id: string) => void;
  
  // Chat Props
  chatMessages: ChatMessage[];
  isChatOpen: boolean;
  unreadCount: number;
  onToggleChat: (open: boolean) => void;
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
}

const VibingScreen: React.FC<Props> = ({ 
  contact, user, onBack, incomingVibe, onSendVibe, customPatterns, onSavePattern, onDeletePattern,
  chatMessages, isChatOpen, unreadCount, onToggleChat, onSendMessage, onClearChat
}) => {
  const [mode, setMode] = useState<'default' | 'heartbeat' | 'draw' | 'breathe' | 'matrix'>('default');
  const [isPressing, setIsPressing] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [status, setStatus] = useState<'idle' | 'holding' | 'tapped' | 'recording' | 'sending'>('idle');
  const [showRecorder, setShowRecorder] = useState(false);
  
  // Heartbeat State
  const [isHeartbeatActive, setIsHeartbeatActive] = useState(false);
  const heartbeatCountRef = useRef(0);
  
  // Drawing State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawPoints, setDrawPoints] = useState<{x: number, y: number}[]>([]);
  const [drawColor, setDrawColor] = useState('#e879f9'); 
  const lastSentTime = useRef(0);
  
  // Breathing State
  const [breatheVariant, setBreatheVariant] = useState<'calm' | 'meditation' | 'sad'>('calm');
  const [breathePhase, setBreathePhase] = useState<'in' | 'out'>('in');
  const [isBreatheActive, setIsBreatheActive] = useState(false);
  
  // Matrix Game State
  const [matrixState, setMatrixState] = useState<'briefing' | 'playing' | 'waiting' | 'result'>('briefing');
  const [matrixDifficulty, setMatrixDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [myMatrixSelection, setMyMatrixSelection] = useState<number | null>(null);
  const [partnerMatrixSelection, setPartnerMatrixSelection] = useState<number | null>(null);
  
  // Recorder State
  const [recordingData, setRecordingData] = useState<number[]>([]);
  const drumStartTime = useRef<number>(0);
  const pressStartTime = useRef<number | null>(null);
  const tapTimer = useRef<number | null>(null);
  const tapCountRef = useRef(0);

  // --- INCOMING SIGNAL HANDLER ---
  useEffect(() => {
    if (!incomingVibe) return;

    if (incomingVibe.category === 'breathe') {
        if (mode === 'breathe' || incomingVibe.action === 'invite') {
             if (mode !== 'breathe') setMode('breathe');
             if (incomingVibe.variant) setBreatheVariant(incomingVibe.variant);
             if (incomingVibe.action === 'stop') setIsBreatheActive(false); 
             else if (incomingVibe.action === 'sync' || incomingVibe.action === 'invite') setIsBreatheActive(true);
        }
    } else if (incomingVibe.category === 'draw' && incomingVibe.points) {
        if (mode === 'draw' || incomingVibe.action === 'invite') {
            if (mode !== 'draw') setMode('draw');
            if (canvasRef.current && incomingVibe.action === 'data') {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = incomingVibe.color || '#e879f9';
                    incomingVibe.points.forEach(p => {
                        ctx.beginPath();
                        ctx.arc(p.x * window.innerWidth, p.y * window.innerHeight, 5, 0, Math.PI * 2);
                        ctx.fill();
                    });
                }
            }
        }
    } else if (incomingVibe.category === 'heartbeat') {
        if (mode === 'heartbeat' || incomingVibe.action === 'invite') {
            if (mode !== 'heartbeat') setMode('heartbeat');
            setIsHeartbeatActive(incomingVibe.action !== 'stop');
        }
    } else if (incomingVibe.category === 'matrix') {
        if (mode === 'matrix' || incomingVibe.action === 'invite') {
            if (mode !== 'matrix') setMode('matrix');
            if (incomingVibe.action === 'invite') {
                setMatrixState('playing'); setMyMatrixSelection(null); setPartnerMatrixSelection(null);
            } else if (incomingVibe.action === 'select' && typeof incomingVibe.selectionIndex === 'number') {
                setPartnerMatrixSelection(incomingVibe.selectionIndex);
                if (myMatrixSelection !== null) setMatrixState('result');
            } else if (incomingVibe.action === 'reset') {
                setMatrixState('briefing'); setMyMatrixSelection(null); setPartnerMatrixSelection(null);
            }
        }
    }
  }, [incomingVibe, mode]);

  // --- LOOPS (Heartbeat, Breathe, Draw) ---
  useEffect(() => {
    let interval: number;
    if (mode === 'heartbeat' && isHeartbeatActive) {
        heartbeatCountRef.current = 0;
        const beat = () => {
            heartbeatCountRef.current += 1;
            if (heartbeatCountRef.current > 10) {
                setIsHeartbeatActive(false); onSendVibe('heartbeat', 'stop', {}); 
                window.clearInterval(interval); return;
            }
            onSendVibe('heartbeat', 'data', { count: heartbeatCountRef.current });
            triggerHaptic([50, 100, 50]);
        };
        beat(); interval = window.setInterval(beat, 1000);
    }
    return () => window.clearInterval(interval);
  }, [mode, isHeartbeatActive]);

  useEffect(() => {
      let interval: number; let vibrationTimeout: number;
      if (mode === 'breathe' && isBreatheActive) {
          const config = { calm: { total: 4000, inhale: 2000 }, meditation: { total: 6000, inhale: 3000 }, sad: { total: 8000, inhale: 3000 } };
          const currentConfig = config[breatheVariant];
          const runCycle = () => {
             setBreathePhase('in'); triggerHaptic(currentConfig.inhale); 
             vibrationTimeout = window.setTimeout(() => { setBreathePhase('out'); }, currentConfig.inhale);
          };
          runCycle(); interval = window.setInterval(runCycle, currentConfig.total);
      }
      return () => { window.clearInterval(interval); window.clearTimeout(vibrationTimeout); };
  }, [mode, breatheVariant, isBreatheActive]);

  useEffect(() => {
      let interval: number;
      if (mode === 'draw') {
          if (canvasRef.current) { canvasRef.current.width = window.innerWidth; canvasRef.current.height = window.innerHeight; }
          interval = window.setInterval(() => {
              if (canvasRef.current) {
                  const ctx = canvasRef.current.getContext('2d');
                  if (ctx) { ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height); }
              }
          }, 100);
      }
      return () => window.clearInterval(interval);
  }, [mode]);

  // --- ACTIONS ---
  const toggleHeartbeat = () => {
      if (isHeartbeatActive) { onSendVibe('heartbeat', 'stop', {}); setIsHeartbeatActive(false); } 
      else setIsHeartbeatActive(true);
  };
  const toggleBreathe = () => {
    if (isBreatheActive) { onSendVibe('breathe', 'stop', {}); setIsBreatheActive(false); } 
    else { onSendVibe('breathe', 'invite', { variant: breatheVariant }); setIsBreatheActive(true); }
  };
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (status === 'recording' || status === 'sending') return;
    const target = e.target as HTMLElement; if (target.closest('button')) return;
    setIsPressing(true); setStatus('holding'); pressStartTime.current = Date.now();
    if (tapTimer.current) { window.clearTimeout(tapTimer.current); tapTimer.current = null; }
    triggerHaptic(60);
  };
  const handleEnd = () => {
    if (status === 'recording' || status === 'sending') return;
    if (!isPressing || !pressStartTime.current) return;
    const duration = Date.now() - pressStartTime.current; setIsPressing(false); pressStartTime.current = null;
    if (duration > 500) {
      setStatus('sending'); onSendVibe('touch', 'data', { touchType: 'hold', duration }).finally(() => setStatus('idle')); triggerHaptic([100, 200, 100]);
    } else {
      tapCountRef.current += 1; setTapCount(tapCountRef.current); setStatus('tapped'); triggerHaptic(80);
      tapTimer.current = window.setTimeout(() => {
        const finalCount = tapCountRef.current; setStatus('sending');
        onSendVibe('touch', 'data', { touchType: 'tap', count: finalCount }).finally(() => { setStatus('idle'); setTapCount(0); tapCountRef.current = 0; });
      }, 600);
    }
  };
  const handleDrawMove = (e: React.TouchEvent) => {
    e.stopPropagation(); const touch = e.touches[0]; const x = touch.clientX; const y = touch.clientY;
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) { ctx.fillStyle = drawColor; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill(); }
    }
    const normalizedPoint = { x: x / window.innerWidth, y: y / window.innerHeight };
    setDrawPoints(prev => [...prev, normalizedPoint]);
    const now = Date.now();
    if (now - lastSentTime.current > 100 && drawPoints.length > 0) {
        onSendVibe('draw', 'data', { points: [...drawPoints, normalizedPoint], color: drawColor });
        setDrawPoints([]); lastSentTime.current = now;
    }
  };
  const handleMatrixTileClick = (index: number) => {
      if (matrixState !== 'playing') return;
      setMyMatrixSelection(index); triggerHaptic(50); onSendVibe('matrix', 'select', { selectionIndex: index });
      if (partnerMatrixSelection !== null) setMatrixState('result'); else setMatrixState('waiting');
  };
  useEffect(() => {
    if (matrixState === 'result' && myMatrixSelection !== null && partnerMatrixSelection !== null) {
        if (myMatrixSelection === partnerMatrixSelection) triggerHaptic(1000); else triggerHaptic([50]); 
    }
  }, [matrixState, myMatrixSelection, partnerMatrixSelection]);
  const startMatrixGame = () => {
      setMatrixState('playing'); setMyMatrixSelection(null); setPartnerMatrixSelection(null);
      onSendVibe('matrix', 'invite', { difficulty: matrixDifficulty });
  };
  const handleDrumStart = () => { drumStartTime.current = Date.now(); triggerHaptic(30); };
  const handleDrumEnd = () => {
    if (drumStartTime.current === 0) return; const duration = Date.now() - drumStartTime.current; drumStartTime.current = 0;
    const vibe = duration > 250 ? Math.min(duration, 3000) : 100; triggerHaptic(vibe); setRecordingData(prev => [...prev, vibe, 150]);
  };
  const renderPatternSlot = (index: number) => {
    const pattern = customPatterns[index];
    if (!pattern) return ( <button key={`slot-${index}`} onClick={() => { setShowRecorder(true); setStatus('recording'); }} className={`w-14 h-14 rounded-2xl border border-dashed border-white/20 hover:border-pink-300 flex items-center justify-center text-white/40 hover:text-pink-300 transition-all ${status === 'sending' || status === 'recording' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}><Plus size={18} /></button> );
    return (
      <div key={pattern.id} className={`relative group w-16 h-16 ${status === 'sending' || status === 'recording' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button onClick={() => { setStatus('sending'); triggerHaptic(pattern.data); onSendVibe('touch', 'data', { touchType: 'pattern', patternData: pattern.data, patternEmoji: pattern.emoji, patternName: pattern.name }).finally(() => setStatus('idle')); }} className={`glass-button w-full h-full rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-90 overflow-hidden relative shadow-lg`}><span className="text-xl filter drop-shadow-md">{pattern.emoji}</span></button>
        <button onClick={(e) => { e.stopPropagation(); if(confirm('Delete pattern?')) onDeletePattern(pattern.id); }} className="absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-red-400 z-10 opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
      </div>
    );
  };
  const handleModeSwitch = (newMode: 'heartbeat' | 'draw' | 'breathe' | 'matrix') => {
      setMode(newMode);
      if (newMode === 'heartbeat') onSendVibe('heartbeat', 'invite', {});
      else if (newMode === 'draw') onSendVibe('draw', 'invite', {});
      else if (newMode === 'breathe') onSendVibe('breathe', 'invite', {});
      else if (newMode === 'matrix') onSendVibe('matrix', 'invite', {});
  };

  let content;
  if (mode === 'heartbeat') {
      content = (
          <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in duration-300 relative">
               <button onClick={() => { setIsHeartbeatActive(false); onSendVibe('heartbeat', 'stop', {}); setMode('default'); }} className="absolute top-4 right-4 p-2 glass-button rounded-full text-white/60 hover:text-white"><X size={24} /></button>
              <p className="text-orange-200/60 uppercase tracking-widest text-xs font-bold mb-12">{isHeartbeatActive ? 'Sending Pulse...' : 'Heartbeat Ready'}</p>
              <button onClick={toggleHeartbeat} className={`relative group active:scale-95 transition-all duration-300 rounded-[3rem] p-1 flex items-center shadow-2xl ${isHeartbeatActive ? 'bg-rose-500 shadow-rose-900/40' : 'bg-white/10 hover:bg-white/20'}`}>
                  <div className="flex items-center gap-4 px-6 py-4">{isHeartbeatActive ? (<><Pause size={32} className="text-white fill-white" /><span className="text-white font-bold tracking-widest uppercase text-sm">Stop</span></>) : (<><Play size={32} className="text-white fill-white ml-1" /><span className="text-white font-bold tracking-widest uppercase text-sm">Start Pulse</span></>)}</div>
              </button>
              <div className={`mt-12 w-64 h-64 flex items-center justify-center transition-all duration-500 ${isHeartbeatActive ? 'animate-heartbeat-double opacity-100' : 'opacity-50 grayscale-[0.5]'}`}><Heart size={180} strokeWidth={0.5} className={`transition-all duration-300 ${isHeartbeatActive ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_50px_rgba(244,63,94,0.6)]' : 'fill-white/10 text-white/20'}`} /></div>
          </div>
      )
  } else if (mode === 'draw') {
      content = (
          <div className="fixed inset-0 z-50 bg-black animate-in fade-in duration-500">
              <canvas ref={canvasRef} className="touch-none block w-full h-full" onTouchMove={handleDrawMove} />
               <div className="absolute top-8 left-0 right-0 flex flex-col items-center pointer-events-none"><p className="text-fuchsia-200/60 uppercase tracking-widest text-xs font-bold bg-fuchsia-500/10 px-4 py-1 rounded-full backdrop-blur border border-fuchsia-500/20">Touch to draw</p></div>
               <div className="absolute bottom-24 left-0 right-0 flex items-center justify-center gap-4">{['#e879f9', '#22d3ee', '#f472b6', '#a78bfa'].map(c => (<button key={c} onClick={() => setDrawColor(c)} className={`w-10 h-10 rounded-full border-2 transition-transform active:scale-90 ${drawColor === c ? 'border-white scale-125 shadow-lg shadow-fuchsia-500/30' : 'border-transparent'}`} style={{ backgroundColor: c }} />))}</div>
               <button onClick={() => setMode('default')} className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-button px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 text-white hover:bg-fuchsia-500/20"><X size={16} /> Close</button>
          </div>
      )
  } else if (mode === 'breathe') {
      content = (
          <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-1000 relative">
               <button onClick={() => { setMode('default'); setIsBreatheActive(false); onSendVibe('breathe', 'stop', {}); }} className="absolute top-4 right-4 p-2 glass-button rounded-full text-white/60 hover:text-white"><X size={24} /></button>
               <p className="text-sky-200/60 uppercase tracking-widest text-xs font-bold mb-12">Breathe Together</p>
               <div className="relative flex items-center justify-center mb-16">
                   <div className={`w-24 h-24 bg-sky-400/30 rounded-full absolute transition-all ease-in-out`} style={{ transform: (breathePhase === 'in' && isBreatheActive) ? 'scale(3)' : 'scale(1)', opacity: (breathePhase === 'in' && isBreatheActive) ? 0.4 : 0.1, transitionDuration: '4s' }} />
                   <div className={`w-48 h-48 border-2 ${isBreatheActive ? 'border-sky-300/40 shadow-[0_0_60px_rgba(125,211,252,0.2)]' : 'border-white/10'} rounded-full flex items-center justify-center transition-all ease-in-out backdrop-blur-sm`} style={{ transform: (breathePhase === 'in' && isBreatheActive) ? 'scale(1.5)' : 'scale(1)', transitionDuration: '4s' }}><button onClick={toggleBreathe} className="p-4 rounded-full bg-white/5 hover:bg-white/20 transition-colors">{isBreatheActive ? <Square size={32} className="text-white fill-white" /> : <Play size={40} className="text-white fill-white ml-2" />}</button></div>
               </div>
          </div>
      )
  } else if (mode === 'matrix') {
      content = (
          <div className="flex-1 flex flex-col items-center justify-center animate-in slide-in-from-bottom duration-500 relative w-full h-full p-4">
               <button onClick={() => { setMode('default'); onSendVibe('matrix', 'reset', {}); }} className="absolute top-2 right-2 p-2 glass-button rounded-full text-white/60 hover:text-white z-10"><X size={24} /></button>
               {matrixState === 'briefing' ? ( <div className="text-center space-y-4"><h2 className="text-2xl font-outfit font-bold text-white">Telepathy</h2><button onClick={startMatrixGame} className="bg-cyan-100/90 text-cyan-900 py-3 px-8 rounded-full font-bold">Start</button></div>
               ) : ( <div className="grid gap-2 w-full max-w-sm aspect-[3/5]" style={{ gridTemplateColumns: `repeat(3, 1fr)` }}>{Array.from({ length: 9 }).map((_, i) => (<button key={i} onClick={() => handleMatrixTileClick(i)} className={`rounded-xl border border-white/10 ${myMatrixSelection === i ? 'bg-cyan-500' : 'bg-white/5'}`} />))}</div>)}
          </div>
      )
  } else {
      content = (
          <div className="flex-1 flex flex-row items-center justify-between relative overflow-hidden">
              <div className="w-20 flex flex-col items-start justify-center gap-4 pl-2 z-20">{renderPatternSlot(0)}{renderPatternSlot(1)}{renderPatternSlot(2)}</div>
              <div className="flex-1 flex flex-col items-center justify-center relative h-full">
                  <div onMouseDown={handleStart} onMouseUp={handleEnd} onMouseLeave={handleEnd} onTouchStart={handleStart} onTouchEnd={handleEnd} className={`relative group cursor-pointer no-select touch-none transition-opacity z-10 flex flex-col items-center ${status === 'recording' ? 'pointer-events-none opacity-20 blur-sm' : ''} ${status === 'sending' ? 'opacity-50' : ''}`}>
                       <Heart size={140} strokeWidth={1.2} className={`${contact.color.replace('bg-', 'text-').replace('from-', 'text-')} ${isPressing ? 'fill-white/20' : 'fill-transparent'}`} />
                  </div>
              </div>
              <div className="w-20 flex flex-col items-end justify-center gap-4 pr-2 z-20">{renderPatternSlot(3)}{renderPatternSlot(4)}{renderPatternSlot(5)}</div>
              <div className="absolute bottom-6 inset-x-0 flex justify-center gap-3">
                  <button onClick={() => handleModeSwitch('heartbeat')} className="w-14 h-14 glass-button rounded-2xl flex items-center justify-center"><Activity size={20} /></button>
                  <button onClick={() => handleModeSwitch('draw')} className="w-14 h-14 glass-button rounded-2xl flex items-center justify-center"><PenTool size={20} /></button>
                  <button onClick={() => handleModeSwitch('matrix')} className="w-14 h-14 glass-button rounded-2xl flex items-center justify-center"><Grid3X3 size={20} /></button>
                  <button onClick={() => handleModeSwitch('breathe')} className="w-14 h-14 glass-button rounded-2xl flex items-center justify-center"><Wind size={20} /></button>
              </div>
              {showRecorder && (
                  <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-2xl flex flex-col p-8 items-center justify-center">
                       <div onMouseDown={handleDrumStart} onMouseUp={handleDrumEnd} onTouchStart={handleDrumStart} onTouchEnd={handleDrumEnd} className="w-52 h-52 rounded-[4rem] glass-button flex items-center justify-center"><CircleDot size={80} className="text-white/40" /></div>
                       <button onClick={() => { if (recordingData.length > 0) { onSavePattern({ id: generateId(), name: 'Pattern', emoji: '✨', data: recordingData }); setRecordingData([]); setShowRecorder(false); setStatus('idle'); }}} className="mt-8 py-4 px-12 bg-pink-600 text-white font-bold rounded-2xl">Save</button>
                       <button onClick={() => setShowRecorder(false)} className="mt-4 text-white/50">Cancel</button>
                  </div>
              )}
          </div>
      );
  }

  return (
      <div className="flex-1 flex flex-col h-full w-full relative">
          {/* Nav & Chat Button Overlay */}
          <div className="absolute top-4 inset-x-4 flex justify-between z-50 pointer-events-none">
              <button onClick={onBack} className="p-4 glass-button rounded-full text-white/60 hover:text-white pointer-events-auto">
                  <ChevronLeft size={24} />
              </button>
              
              <button 
                  onClick={() => onToggleChat(!isChatOpen)} 
                  className={`p-4 rounded-full text-white pointer-events-auto relative shadow-xl transition-all ${isChatOpen ? 'bg-zinc-800' : 'glass-button hover:bg-white/10'}`}
              >
                  <MessageCircle size={24} />
                  {unreadCount > 0 && !isChatOpen && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-zinc-950">
                          {unreadCount}
                      </div>
                  )}
              </button>
          </div>

          {/* Main Vibe Content */}
          {content}

          {/* Chat Drawer Overlay */}
          <ChatDrawer 
              contact={contact} 
              user={user} 
              isOpen={isChatOpen} 
              onClose={() => onToggleChat(false)}
              messages={chatMessages}
              onSendMessage={onSendMessage}
              onClear={onClearChat}
          />
      </div>
  );
};

export default VibingScreen;
