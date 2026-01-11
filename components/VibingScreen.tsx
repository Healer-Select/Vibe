
import React, { useState, useRef, useEffect } from 'react';
import { Contact, UserProfile, VibeType, VibePattern, VibeSignal } from '../types';
import { ChevronLeft, Heart, Plus, X, CircleDot, Loader2, Smile, MessageCircle, Activity, PenTool, Wind, Grid3X3, Trophy, BrainCircuit, Info, Play, Pause, Square } from 'lucide-react';
import { triggerHaptic, generateId } from '../constants';

interface Props {
  contact: Contact;
  user: UserProfile;
  onBack: () => void;
  incomingVibe: VibeSignal | null;
  onSendVibe: (type: VibeType, text?: string, count?: number, duration?: number, patternName?: string, patternEmoji?: string, patternData?: number[], points?: {x:number, y:number}[], color?: string, breatheVariant?: 'calm' | 'meditation' | 'sad', matrixAction?: 'invite' | 'select' | 'reveal' | 'reset', gridDifficulty?: 'easy' | 'medium' | 'hard', selectionIndex?: number) => Promise<void>;
  onOpenChat: () => void;
  customPatterns: VibePattern[];
  onSavePattern: (pattern: VibePattern) => void;
  onDeletePattern: (id: string) => void;
}

const VibingScreen: React.FC<Props> = ({ 
  contact, 
  user, 
  onBack, 
  incomingVibe,
  onSendVibe, 
  onOpenChat, 
  customPatterns, 
  onSavePattern, 
  onDeletePattern 
}) => {
  const [mode, setMode] = useState<'default' | 'heartbeat' | 'draw' | 'breathe' | 'matrix'>('default');
  const [isPressing, setIsPressing] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [status, setStatus] = useState<'idle' | 'holding' | 'tapped' | 'recording' | 'sending'>('idle');
  const [showRecorder, setShowRecorder] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [activeEmoji, setActiveEmoji] = useState<string | null>(null);
  
  // Heartbeat State
  const [isHeartbeatActive, setIsHeartbeatActive] = useState(false);
  const heartbeatCountRef = useRef(0);
  
  // Drawing State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawPoints, setDrawPoints] = useState<{x: number, y: number}[]>([]);
  const [drawColor, setDrawColor] = useState('#e879f9'); 
  const lastSentTime = useRef(0);
  
  const DRAW_COLORS = ['#e879f9', '#22d3ee', '#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#ffffff'];

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
  const [recordingName, setRecordingName] = useState('');
  const [recordingEmoji, setRecordingEmoji] = useState('✨');
  const [recordingDefaultMsg, setRecordingDefaultMsg] = useState('');
  const drumStartTime = useRef<number>(0);

  const pressStartTime = useRef<number | null>(null);
  const tapTimer = useRef<number | null>(null);
  const tapCountRef = useRef(0);

  const MODE_INFO = {
    default: {
      title: "The Pulse",
      question: "How do I say 'I'm here' without words?",
      answer: "Tap the heart for a quick pulse, or hold it for a warm embrace. Use the side patterns to express specific feelings. 🏠💖✨",
      color: "text-white"
    },
    heartbeat: {
      title: "Shared Heartbeat",
      question: "Can I hold your hand from miles away?",
      answer: "Sends 10 gentle beats to your partner. Both phones pulse in sync.",
      color: "text-rose-400"
    },
    draw: {
      title: "Touch Canvas",
      question: "What does a thought look like?",
      answer: "Trace your finger to draw. Your strokes appear instantly on their screen and slowly fade away. Silent and smooth.",
      color: "text-fuchsia-400"
    },
    breathe: {
      title: "Shared Breath",
      question: "Can we find peace together?",
      answer: "Press Play to synchronize your rhythms. Follow the circle as it expands and contracts.",
      color: "text-sky-400"
    },
    matrix: {
      title: "Telepathy Game",
      question: "Are we thinking the same thing?",
      answer: "Try to pick the exact same tile as your partner without speaking. Matches create a long vibration!",
      color: "text-cyan-400"
    }
  };

  const LONG_PRESS_THRESHOLD = 500; // Increased threshold to prevent accidental holds
  const TAP_WINDOW = 600;

  // React to Incoming Vibes
  useEffect(() => {
    if (!incomingVibe) return;

    if (incomingVibe.type === 'breathe') {
        if (mode === 'breathe') {
             if (incomingVibe.breatheVariant) setBreatheVariant(incomingVibe.breatheVariant);
             if (incomingVibe.count === 0) setIsBreatheActive(false); 
             else setIsBreatheActive(true);
        }
    } else if (incomingVibe.type === 'draw' && incomingVibe.points) {
        if (mode === 'draw') {
            if (canvasRef.current) {
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
    } else if (incomingVibe.type === 'heartbeat') {
        if (mode === 'heartbeat') {
            if (incomingVibe.count === 0) {
                setIsHeartbeatActive(false);
            } else {
                setIsHeartbeatActive(true);
            }
        }
    } else if (incomingVibe.type === 'game-matrix') {
        if (mode === 'matrix') {
            if (incomingVibe.matrixAction === 'invite' && incomingVibe.gridDifficulty) {
                setMatrixDifficulty(incomingVibe.gridDifficulty);
                setMatrixState('playing');
                setMyMatrixSelection(null);
                setPartnerMatrixSelection(null);
            } else if (incomingVibe.matrixAction === 'select' && typeof incomingVibe.selectionIndex === 'number') {
                setPartnerMatrixSelection(incomingVibe.selectionIndex);
                if (myMatrixSelection !== null) {
                    setMatrixState('result');
                }
            } else if (incomingVibe.matrixAction === 'reset') {
                setMatrixState('briefing');
                setMyMatrixSelection(null);
                setPartnerMatrixSelection(null);
            }
        }
    }
  }, [incomingVibe, mode]);

  // Handle Heartbeat Loop (Sender)
  // FIXED: Limit to 10 beats
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (mode === 'heartbeat' && isHeartbeatActive) {
        // Reset count on start
        heartbeatCountRef.current = 0;
        
        const beat = () => {
            heartbeatCountRef.current += 1;
            
            // Check limit
            if (heartbeatCountRef.current > 10) {
                // STOP automatically
                setIsHeartbeatActive(false);
                onSendVibe('heartbeat', undefined, 0);
                clearInterval(interval);
                return;
            }

            onSendVibe('heartbeat', undefined, 1);
            triggerHaptic([50, 100, 50]);
        };

        // First beat immediately
        beat();
        
        // Loop Pulse (60bpm)
        interval = setInterval(beat, 1000);
    }
    return () => clearInterval(interval);
  }, [mode, isHeartbeatActive]);

  const toggleHeartbeat = () => {
      if (isHeartbeatActive) {
          onSendVibe('heartbeat', undefined, 0); // STOP
          setIsHeartbeatActive(false);
      } else {
          setIsHeartbeatActive(true);
      }
  };

  const toggleBreathe = () => {
    if (isBreatheActive) {
        onSendVibe('breathe', undefined, 0);
        setIsBreatheActive(false);
    } else {
        onSendVibe('breathe', undefined, 1, undefined, undefined, undefined, undefined, undefined, undefined, breatheVariant); // Invite/Start
        setIsBreatheActive(true);
    }
  };

  useEffect(() => {
      let interval: NodeJS.Timeout;
      let vibrationTimeout: NodeJS.Timeout;
      
      if (mode === 'breathe' && isBreatheActive) {
          const config = {
              calm: { total: 4000, inhale: 2000 },
              meditation: { total: 6000, inhale: 3000 },
              sad: { total: 8000, inhale: 3000 }
          };
          const currentConfig = config[breatheVariant];
          const runCycle = () => {
             setBreathePhase('in');
             triggerHaptic(currentConfig.inhale); 
             vibrationTimeout = setTimeout(() => {
                 setBreathePhase('out');
             }, currentConfig.inhale);
          };
          runCycle();
          interval = setInterval(runCycle, currentConfig.total);
      }
      return () => {
          clearInterval(interval);
          clearTimeout(vibrationTimeout);
      };
  }, [mode, breatheVariant, isBreatheActive]);

  // Handle Default Mode Touches
  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    if (status === 'recording' || status === 'sending') return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    setIsPressing(true);
    setStatus('holding');
    pressStartTime.current = Date.now();
    if (tapTimer.current) {
      clearTimeout(tapTimer.current);
      tapTimer.current = null;
    }
    triggerHaptic(60);
  };

  const handleEnd = () => {
    if (status === 'recording' || status === 'sending') return;
    if (!isPressing || !pressStartTime.current) return;

    const duration = Date.now() - pressStartTime.current;
    setIsPressing(false);
    pressStartTime.current = null;

    if (duration > LONG_PRESS_THRESHOLD) {
      setStatus('sending');
      onSendVibe('hold', "I am Holding u right now", undefined, duration).finally(() => setStatus('idle'));
      triggerHaptic([100, 200, 100]);
    } else {
      // It was a tap
      tapCountRef.current += 1;
      setTapCount(tapCountRef.current);
      setStatus('tapped');
      triggerHaptic(80);
      
      tapTimer.current = window.setTimeout(() => {
        const finalCount = tapCountRef.current;
        setStatus('sending');
        onSendVibe('tap', "I Miss U", finalCount).finally(() => {
          setStatus('idle');
          setTapCount(0);
          tapCountRef.current = 0;
        });
      }, TAP_WINDOW);
    }
  };

  // Drawing Logic
  const handleDrawMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    const x = touch.clientX;
    const y = touch.clientY;
    
    // Draw locally
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
            ctx.fillStyle = drawColor;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Add to buffer
    const normalizedPoint = { x: x / window.innerWidth, y: y / window.innerHeight };
    setDrawPoints(prev => [...prev, normalizedPoint]);

    // Throttle send
    const now = Date.now();
    if (now - lastSentTime.current > 100 && drawPoints.length > 0) {
        onSendVibe('draw', undefined, undefined, undefined, undefined, undefined, undefined, [...drawPoints, normalizedPoint], drawColor);
        setDrawPoints([]);
        lastSentTime.current = now;
    }
    // FIXED: NO HAPTIC TRIGGER HERE for drawing
  };

  useEffect(() => {
      let interval: NodeJS.Timeout;
      if (mode === 'draw') {
          if (canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
          }
          interval = setInterval(() => {
              if (canvasRef.current) {
                  const ctx = canvasRef.current.getContext('2d');
                  if (ctx) {
                      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)'; 
                      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                  }
              }
          }, 100);
      }
      return () => clearInterval(interval);
  }, [mode]);

  // Matrix Game Logic
  const handleMatrixTileClick = (index: number) => {
      if (matrixState !== 'playing') return;
      
      setMyMatrixSelection(index);
      triggerHaptic(50);
      
      onSendVibe('game-matrix', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'select', matrixDifficulty, index);
      
      if (partnerMatrixSelection !== null) {
          setMatrixState('result');
      } else {
          setMatrixState('waiting');
      }
  };

  useEffect(() => {
    if (matrixState === 'result' && myMatrixSelection !== null && partnerMatrixSelection !== null) {
        if (myMatrixSelection === partnerMatrixSelection) {
            // MATCH FOUND! Long vibration
            triggerHaptic(1000); 
        } else {
            // No vibe or very subtle for fail
            triggerHaptic([50]); 
        }
    }
  }, [matrixState, myMatrixSelection, partnerMatrixSelection]);

  const startMatrixGame = () => {
      setMatrixState('playing');
      setMyMatrixSelection(null);
      setPartnerMatrixSelection(null);
      // Fixed: Send invite only
      onSendVibe('game-matrix', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'invite', matrixDifficulty);
  };

  // Drum Recorder Logic
  const handleDrumStart = (e: React.SyntheticEvent) => {
    drumStartTime.current = Date.now();
    triggerHaptic(30);
  };

  const handleDrumEnd = (e: React.SyntheticEvent) => {
    if (drumStartTime.current === 0) return;
    const duration = Date.now() - drumStartTime.current;
    drumStartTime.current = 0;
    const isLong = duration > 250;
    const vibe = isLong ? Math.min(duration, 3000) : 100;
    const pause = 150; 
    triggerHaptic(vibe);
    setRecordingData(prev => [...prev, vibe, pause]);
  };

  const renderPatternSlot = (index: number) => {
    const pattern = customPatterns[index];
    const isEmpty = !pattern;
    if (isEmpty) {
      return (
        <button
          key={`slot-${index}`}
          onClick={() => { setShowRecorder(true); setStatus('recording'); }}
          className={`w-14 h-14 rounded-2xl border border-dashed border-white/20 hover:border-pink-300 flex items-center justify-center text-white/40 hover:text-pink-300 transition-all ${status === 'sending' || status === 'recording' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
          <Plus size={18} />
        </button>
      );
    }
    return (
      <div key={pattern.id} className={`relative group w-16 h-16 ${status === 'sending' || status === 'recording' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button
          onClick={() => {
            setStatus('sending');
            setActiveEmoji(pattern.emoji);
            setTimeout(() => setActiveEmoji(null), 1500);
            triggerHaptic(pattern.data);
            onSendVibe('pattern', pattern.defaultMessage, undefined, undefined, pattern.name, pattern.emoji, pattern.data).finally(() => setStatus('idle'));
          }}
          className={`glass-button w-full h-full rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-90 overflow-hidden relative shadow-lg`}
        >
          <span className="text-xl filter drop-shadow-md">{pattern.emoji}</span>
        </button>
        <button 
            onClick={(e) => { e.stopPropagation(); if(confirm('Delete pattern?')) onDeletePattern(pattern.id); }}
            className={`absolute -top-1 -right-1 w-5 h-5 bg-black rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-red-400 z-10 opacity-0 group-hover:opacity-100 transition-opacity`}
        >
            <X size={10} />
        </button>
      </div>
    );
  };

  // SEND INVITATION HELPER
  // When clicking a mode button, we send a vibe signal. 
  // If the receiver is not in that mode, they see a "Invited to X" heart.
  const handleModeSwitch = (newMode: 'heartbeat' | 'draw' | 'breathe' | 'matrix') => {
      setMode(newMode);
      
      // Notify partner that I am entering this mode (Sending an Invite)
      if (newMode === 'heartbeat') onSendVibe('heartbeat', undefined, 0); // Init
      else if (newMode === 'draw') onSendVibe('draw', undefined, undefined, undefined, undefined, undefined, undefined, []); // Init
      else if (newMode === 'breathe') onSendVibe('breathe', undefined, 0); // Init
      else if (newMode === 'matrix') onSendVibe('game-matrix', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'invite', matrixDifficulty);
  };

  const renderContent = () => {
    if (mode === 'heartbeat') {
        return (
            <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in duration-300 relative">
                 <button onClick={() => { setIsHeartbeatActive(false); onSendVibe('heartbeat', undefined, 0); setMode('default'); }} className="absolute top-4 right-4 p-2 glass-button rounded-full text-white/60 hover:text-white">
                    <X size={24} />
                 </button>

                <p className="text-orange-200/60 uppercase tracking-widest text-xs font-bold mb-12">
                    {isHeartbeatActive ? 'Sending 10 pulses...' : 'Heartbeat Ready'}
                </p>
                
                <button 
                    onClick={toggleHeartbeat}
                    className={`relative group active:scale-95 transition-all duration-300 rounded-[3rem] p-1 flex items-center shadow-2xl ${isHeartbeatActive ? 'bg-rose-500 shadow-rose-900/40' : 'bg-white/10 hover:bg-white/20'}`}
                >
                    <div className="flex items-center gap-4 px-6 py-4">
                        {isHeartbeatActive ? (
                            <>
                                <Pause size={32} className="text-white fill-white" />
                                <span className="text-white font-bold tracking-widest uppercase text-sm">Stop</span>
                            </>
                        ) : (
                            <>
                                <Play size={32} className="text-white fill-white ml-1" />
                                <span className="text-white font-bold tracking-widest uppercase text-sm">Start Pulse</span>
                            </>
                        )}
                    </div>
                </button>

                <div className={`mt-12 w-64 h-64 flex items-center justify-center transition-all duration-500 ${isHeartbeatActive ? 'animate-heartbeat-double opacity-100' : 'opacity-50 grayscale-[0.5]'}`}>
                    <Heart size={180} strokeWidth={0.5} className={`transition-all duration-300 ${isHeartbeatActive ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_50px_rgba(244,63,94,0.6)]' : 'fill-white/10 text-white/20'}`} />
                </div>
            </div>
        )
    }

    if (mode === 'draw') {
        return (
            <div className="fixed inset-0 z-50 bg-black animate-in fade-in duration-500">
                <canvas 
                    ref={canvasRef}
                    className="touch-none block w-full h-full"
                    onTouchMove={handleDrawMove}
                />
                 <div className="absolute top-8 left-0 right-0 flex flex-col items-center pointer-events-none">
                     <p className="text-fuchsia-200/60 uppercase tracking-widest text-xs font-bold bg-fuchsia-500/10 px-4 py-1 rounded-full backdrop-blur border border-fuchsia-500/20">Touch to draw</p>
                 </div>
                 <button onClick={() => setShowInfo(true)} className="absolute top-8 right-8 z-[60] w-10 h-10 flex items-center justify-center text-white/40 hover:text-white rounded-full bg-black/20 backdrop-blur">
                    <Info size={24} />
                 </button>
                 <div className="absolute bottom-24 left-0 right-0 flex items-center justify-center gap-4">
                    {DRAW_COLORS.map(c => (
                        <button key={c} onClick={() => setDrawColor(c)} className={`w-10 h-10 rounded-full border-2 transition-transform active:scale-90 ${drawColor === c ? 'border-white scale-125 shadow-lg shadow-fuchsia-500/30' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                 </div>
                 <button onClick={() => setMode('default')} className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-button px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 text-white hover:bg-fuchsia-500/20">
                    <X size={16} /> Close
                 </button>
            </div>
        )
    }

    if (mode === 'breathe') {
        const durationMap = { calm: '4s', meditation: '6s', sad: '8s' };
        const activeDuration = durationMap[breatheVariant];
        return (
            <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-1000 relative">
                 <button onClick={() => { setMode('default'); setIsBreatheActive(false); onSendVibe('breathe', undefined, 0); }} className="absolute top-4 right-4 p-2 glass-button rounded-full text-white/60 hover:text-white">
                    <X size={24} />
                 </button>
                 <p className="text-sky-200/60 uppercase tracking-widest text-xs font-bold mb-12">Breathe Together</p>
                 <div className="relative flex items-center justify-center mb-16">
                     <div className={`w-24 h-24 bg-sky-400/30 rounded-full absolute transition-all ease-in-out`} style={{ transform: (breathePhase === 'in' && isBreatheActive) ? 'scale(3)' : 'scale(1)', opacity: (breathePhase === 'in' && isBreatheActive) ? 0.4 : 0.1, transitionDuration: activeDuration }} />
                     <div className={`w-48 h-48 border-2 ${isBreatheActive ? 'border-sky-300/40 shadow-[0_0_60px_rgba(125,211,252,0.2)]' : 'border-white/10'} rounded-full flex items-center justify-center transition-all ease-in-out backdrop-blur-sm`} style={{ transform: (breathePhase === 'in' && isBreatheActive) ? 'scale(1.5)' : 'scale(1)', transitionDuration: activeDuration }}>
                         <button onClick={toggleBreathe} className="p-4 rounded-full bg-white/5 hover:bg-white/20 transition-colors">
                             {isBreatheActive ? <Square size={32} className="text-white fill-white" /> : <Play size={40} className="text-white fill-white ml-2" />}
                         </button>
                     </div>
                 </div>
                 <div className="flex gap-2">
                    {(['calm', 'meditation', 'sad'] as const).map(m => (
                        <button key={m} onClick={() => setBreatheVariant(m)} className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${breatheVariant === m ? 'bg-sky-500/20 border-sky-400 text-sky-100' : 'glass-button text-white/40 hover:text-white'}`}>{m}</button>
                    ))}
                 </div>
            </div>
        )
    }

    if (mode === 'matrix') {
        const difficultyConfig = {
            easy: { rows: 3, cols: 3, size: 9 },
            medium: { rows: 5, cols: 3, size: 15 },
            hard: { rows: 6, cols: 3, size: 18 }
        };
        const config = difficultyConfig[matrixDifficulty];
        return (
            <div className="flex-1 flex flex-col items-center justify-center animate-in slide-in-from-bottom duration-500 relative w-full h-full p-4">
                 <button onClick={() => { setMode('default'); onSendVibe('game-matrix', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'reset'); }} className="absolute top-2 right-2 p-2 glass-button rounded-full text-white/60 hover:text-white z-10">
                    <X size={24} />
                 </button>

                 {matrixState === 'briefing' && (
                     <div className="flex flex-col items-center justify-center text-center space-y-6 max-w-sm">
                         <div className="w-20 h-20 bg-cyan-500/20 rounded-3xl flex items-center justify-center mb-2 shadow-lg backdrop-blur-md border border-cyan-500/30">
                             <BrainCircuit size={40} className="text-cyan-300" />
                         </div>
                         <h2 className="text-2xl font-outfit font-bold text-white">Telepathy Test</h2>
                         <p className="text-white/60 text-sm">
                             Try to pick the same tile as your partner without communicating.
                             <br/><br/>
                             If you match, your phones will sync.
                         </p>
                         <div className="grid grid-cols-3 gap-2 w-full pt-4">
                             {(['easy', 'medium', 'hard'] as const).map(diff => (
                                 <button key={diff} onClick={() => setMatrixDifficulty(diff)} className={`py-3 rounded-xl text-xs uppercase font-bold tracking-wider border transition-all ${matrixDifficulty === diff ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100' : 'glass-button text-white/40'}`}>{diff}</button>
                             ))}
                         </div>
                         <button onClick={startMatrixGame} className="w-full bg-cyan-100/90 text-cyan-900 py-4 rounded-2xl font-bold mt-4 shadow-lg hover:bg-white transition-colors">
                             Start Game
                         </button>
                     </div>
                 )}

                 {(matrixState === 'playing' || matrixState === 'waiting' || matrixState === 'result') && (
                     <div className="flex flex-col items-center w-full max-w-sm h-full justify-center">
                         <h3 className="text-xs uppercase tracking-widest text-cyan-300 font-bold mb-6">
                            {matrixState === 'waiting' ? 'Waiting for partner...' : matrixState === 'result' ? 'Result' : 'Pick a Tile'}
                         </h3>
                         <div className="grid gap-2 w-full aspect-[3/5]" style={{ gridTemplateColumns: `repeat(${config.cols}, 1fr)`, gridTemplateRows: `repeat(${config.rows}, 1fr)` }}>
                             {Array.from({ length: config.size }).map((_, i) => {
                                 const isSelected = myMatrixSelection === i;
                                 const isPartnerSelected = partnerMatrixSelection === i && matrixState === 'result';
                                 let bgClass = "glass-button border-white/10";
                                 if (matrixState === 'result') {
                                     if (isSelected && isPartnerSelected) bgClass = "bg-cyan-400 border-cyan-300 shadow-[0_0_20px_#22d3ee] animate-pulse"; // Match
                                     else if (isSelected) bgClass = "bg-rose-400 border-rose-300"; // My mismatch
                                     else if (isPartnerSelected) bgClass = "bg-purple-400 border-purple-300"; // Partner mismatch
                                     else bgClass = "bg-white/5 opacity-10";
                                 } else {
                                     if (isSelected) bgClass = "bg-cyan-500/40 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]";
                                 }
                                 return (
                                    <button key={i} disabled={matrixState !== 'playing'} onClick={() => handleMatrixTileClick(i)} className={`rounded-xl border transition-all duration-300 ${bgClass} ${matrixState === 'playing' ? 'active:scale-95 hover:border-cyan-400/40' : ''}`} />
                                 );
                             })}
                         </div>
                         {matrixState === 'result' && (
                             <div className="absolute inset-x-0 bottom-8 flex flex-col items-center animate-in slide-in-from-bottom">
                                 {myMatrixSelection === partnerMatrixSelection ? (
                                     <div className="flex flex-col items-center space-y-2">
                                         <Trophy size={48} className="text-amber-300 mb-2 drop-shadow-[0_0_10px_rgba(252,211,77,0.5)] animate-bounce" />
                                         <h2 className="text-3xl font-outfit font-bold text-white">Telepathy!</h2>
                                         <p className="text-cyan-300 text-sm font-bold uppercase tracking-widest">You synced perfectly</p>
                                     </div>
                                 ) : (
                                     <div className="flex flex-col items-center space-y-2">
                                         <div className="flex gap-4 items-center">
                                             <div className="w-4 h-4 rounded-full bg-rose-400" /> <span className="text-xs text-white/60">You</span>
                                             <div className="w-4 h-4 rounded-full bg-purple-400" /> <span className="text-xs text-white/60">Partner</span>
                                         </div>
                                         <p className="text-white/60 text-lg font-medium mt-2">Not in sync this time.</p>
                                     </div>
                                 )}
                                 <button onClick={startMatrixGame} className="mt-8 px-8 py-3 glass-button rounded-full font-bold text-sm hover:bg-white/10 text-white">
                                     Play Again
                                 </button>
                             </div>
                         )}
                     </div>
                 )}
            </div>
        )
    }

    return (
        <div className="flex-1 flex flex-row items-center justify-between relative overflow-hidden">
            <div className="w-20 flex flex-col items-start justify-center gap-4 pl-2 z-20">
                {renderPatternSlot(0)}
                {renderPatternSlot(1)}
                {renderPatternSlot(2)}
            </div>

            <div className="flex-1 flex flex-col items-center justify-center relative h-full">
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-700 pointer-events-none ${isPressing ? 'opacity-100 scale-125' : 'opacity-20 scale-100'}`}>
                <div className={`w-80 h-80 rounded-full blur-[100px] ${contact.color} opacity-40`} />
                </div>

                <div className="absolute top-4 text-center z-20 h-16 pointer-events-none w-full flex flex-col items-center justify-center">
                    {status === 'sending' ? (
                        <div className="flex flex-col items-center animate-pulse">
                        <Loader2 className="animate-spin text-white/50 mb-2" size={20} />
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/60 font-bold">Sending Pulse</p>
                        </div>
                    ) : tapCount > 0 ? (
                        <div className="animate-bounce">
                        <p className="text-5xl font-outfit font-bold text-white drop-shadow-lg">{tapCount}</p>
                        <p className="text-white/60 text-xs uppercase tracking-widest font-bold">Pulses</p>
                        </div>
                    ) : status === 'holding' ? (
                        <p className="text-white text-sm font-medium animate-pulse tracking-wide italic">"I am Holding u right now"</p>
                    ) : null}
                </div>

                <div 
                    onMouseDown={handleStart}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={handleStart}
                    onTouchEnd={handleEnd}
                    className={`relative group cursor-pointer no-select touch-none transition-opacity z-10 flex flex-col items-center ${status === 'recording' ? 'pointer-events-none opacity-20 blur-sm' : ''} ${status === 'sending' ? 'opacity-50' : ''}`}
                >
                    <div className={`transition-all duration-300 transform ${isPressing ? 'scale-110' : 'scale-100'} relative flex items-center justify-center`}>
                        {isPressing && (
                            <>
                            <div className={`absolute inset-0 rounded-full animate-ping opacity-20 ${contact.color}`} style={{ animationDuration: '1.5s' }} />
                            <div className={`absolute -inset-10 rounded-full animate-pulse opacity-10 ${contact.color}`} />
                            </>
                        )}
                        
                        <Heart 
                            size={140} 
                            strokeWidth={1.2}
                            className={`${contact.color.replace('bg-', 'text-').replace('from-', 'text-')} transition-all duration-500 ${isPressing ? 'fill-white/20' : 'fill-transparent'}`}
                        />
                    </div>
                </div>
            </div>

            <div className="w-20 flex flex-col items-end justify-center gap-4 pr-2 z-20">
                {renderPatternSlot(3)}
                {renderPatternSlot(4)}
                {renderPatternSlot(5)}
            </div>

            {/* Mode Switcher / Toolbar - NOW WITH VIBRANT COLORS */}
            {/* FIXED: Using handleModeSwitch to trigger invites */}
            <div className={`absolute bottom-6 left-0 right-0 z-20 transition-all duration-300 flex items-center justify-center gap-3 ${status === 'recording' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
                
                <button onClick={() => handleModeSwitch('heartbeat')} className="w-14 h-14 rounded-2xl border flex items-center justify-center relative transition-all glass-button text-white/50 hover:border-rose-400/50">
                    <Activity size={24} className="absolute" strokeWidth={1.5} />
                    <Heart size={10} className="absolute z-10 fill-white/50 animate-pulse" />
                </button>

                <button onClick={() => handleModeSwitch('draw')} className="w-14 h-14 rounded-2xl border flex items-center justify-center relative transition-all glass-button text-white/50 hover:border-fuchsia-400/50">
                    <PenTool size={20} className="mb-1" />
                </button>
                
                <button onClick={() => handleModeSwitch('matrix')} className="w-14 h-14 rounded-2xl border flex items-center justify-center relative transition-all glass-button text-white/50 hover:border-cyan-400/50">
                     <Grid3X3 size={20} />
                </button>

                <button onClick={() => handleModeSwitch('breathe')} className="w-14 h-14 rounded-2xl border flex items-center justify-center relative transition-all glass-button text-white/50 hover:border-sky-400/50">
                     <Wind size={20} />
                </button>

                <button onClick={onOpenChat} className="flex items-center justify-center w-14 h-14 glass-button rounded-2xl active:scale-95 transition-all hover:bg-white/10 group">
                    <MessageCircle size={20} className="text-white/50 group-hover:text-white transition-colors" />
                </button>
            </div>
            
            {showInfo && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setShowInfo(false)}>
                    <div className="glass-panel p-8 rounded-[2rem] max-w-sm w-full space-y-6 relative border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h2 className={`text-3xl font-outfit font-bold ${MODE_INFO[mode].color} drop-shadow-md`}>{MODE_INFO[mode].title}</h2>
                        <p className="text-white/70 text-sm">{MODE_INFO[mode].answer}</p>
                        <button onClick={() => setShowInfo(false)} className="w-full py-4 bg-white/10 rounded-xl text-white font-bold">Got it</button>
                    </div>
                </div>
            )}
            
            {showRecorder && (
                <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-2xl flex flex-col p-8">
                     <div className="flex items-center justify-between mb-8">
                        <h3 className="text-xl font-outfit font-semibold text-white">Custom Vibe</h3>
                        <button onClick={() => { setShowRecorder(false); setStatus('idle'); setRecordingData([]); }} className="text-white/50 p-2"><X size={24} /></button>
                     </div>
                     <div className="flex-1 flex flex-col items-center justify-center space-y-8">
                        <div onMouseDown={handleDrumStart} onMouseUp={handleDrumEnd} onMouseLeave={handleDrumEnd} onTouchStart={handleDrumStart} onTouchEnd={handleDrumEnd} className="w-52 h-52 rounded-[4rem] glass-button flex items-center justify-center active:scale-95 active:border-pink-500 transition-all shadow-2xl group cursor-pointer relative touch-none select-none">
                           <CircleDot size={80} className="text-white/40 group-active:text-pink-400 transition-colors pointer-events-none" />
                        </div>
                        <p className="text-white/60 text-sm">Tap for short, Hold for long</p>
                        <button onClick={() => { 
                             if (recordingData.length < 1) return;
                             onSavePattern({ id: generateId(), name: recordingName.trim() || `Pattern`, emoji: recordingEmoji, data: recordingData, isPreset: false, defaultMessage: recordingDefaultMsg.trim() });
                             setRecordingData([]); setShowRecorder(false); setStatus('idle');
                        }} disabled={recordingData.length === 0} className="w-full py-4 bg-pink-600 text-white font-bold rounded-2xl disabled:opacity-20">Save</button>
                     </div>
                </div>
            )}
        </div>
    );
  };
  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden relative">
      <header className="flex items-center justify-between mb-2 z-10 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 text-white/50 active:scale-90 transition-transform"><ChevronLeft size={28} /></button>
        <div className="text-center">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/50 font-bold mb-0.5">Vibing with</h2>
          <h1 className="text-xl font-outfit font-semibold text-white drop-shadow-md">{contact.name}</h1>
        </div>
        <button onClick={() => setShowInfo(true)} className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white rounded-full transition-colors"><Info size={24} /></button>
      </header>
      {renderContent()}
    </div>
  );
};

export default VibingScreen;
