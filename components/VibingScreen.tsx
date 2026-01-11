
import React, { useState, useRef, useEffect } from 'react';
import { Contact, UserProfile, VibeType, VibePattern, VibeSignal } from '../types';
import { ChevronLeft, Heart, Plus, X, CircleDot, Loader2, Smile, MessageCircle, Activity, PenTool, Wind, Grid3X3, Trophy, BrainCircuit, Info } from 'lucide-react';
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
  
  // Drawing State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [drawPoints, setDrawPoints] = useState<{x: number, y: number}[]>([]);
  const [drawColor, setDrawColor] = useState('#e879f9'); // Magenta/Fuchsia default
  const lastSentTime = useRef(0);
  
  // Vibrant Colors for Drawing
  const DRAW_COLORS = ['#e879f9', '#22d3ee', '#f472b6', '#a78bfa', '#34d399', '#fbbf24', '#ffffff'];

  // Breathing State
  const [breatheVariant, setBreatheVariant] = useState<'calm' | 'meditation' | 'sad'>('calm');
  const [breathePhase, setBreathePhase] = useState<'in' | 'out'>('in');
  
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

  const pressStartTime = useRef<number | null>(null);
  const tapTimer = useRef<number | null>(null);
  const tapCountRef = useRef(0);

  const LONG_PRESS_THRESHOLD = 300;
  const TAP_WINDOW = 600;

  // Info Content Configuration
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
      answer: "Yes. This creates a live connection. Leave it running to feel their presence pulsing in the background, just like holding hands. 💓🤝",
      color: "text-rose-400"
    },
    draw: {
      title: "Touch Canvas",
      question: "What does a thought look like?",
      answer: "Trace your finger to draw. Your partner sees your strokes appear instantly. The ink fades quickly—art made only for this moment. 🎨⏳",
      color: "text-fuchsia-400"
    },
    breathe: {
      title: "Shared Breath",
      question: "Can we find peace together?",
      answer: "Synchronize your breathing rhythms. Follow the circle as it expands and contracts. Feel the vibration guide you both to a shared calm. 🌬️🧘",
      color: "text-sky-400"
    },
    matrix: {
      title: "Telepathy Game",
      question: "Are we thinking the same thing?",
      answer: "A test of intuition. Try to pick the exact same tile as your partner without speaking. If you match, your connection is confirmed. 🔮🧩",
      color: "text-cyan-400"
    }
  };

  // React to Incoming Vibes
  useEffect(() => {
    if (!incomingVibe) return;

    if (incomingVibe.type === 'breathe' && incomingVibe.breatheVariant) {
        setMode('breathe');
        setBreatheVariant(incomingVibe.breatheVariant);
    } else if (incomingVibe.type === 'draw' && incomingVibe.points) {
        setMode('draw');
        // Render points
        if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                ctx.fillStyle = incomingVibe.color || '#e879f9';
                incomingVibe.points.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x * window.innerWidth, p.y * window.innerHeight, 5, 0, Math.PI * 2);
                    ctx.fill();
                });
                // Fade effect
                setTimeout(() => {
                    if (canvasRef.current) {
                        const ctx = canvasRef.current.getContext('2d');
                        if (ctx) {
                            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
                            ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                        }
                    }
                }, 100);
            }
        }
    } else if (incomingVibe.type === 'heartbeat') {
        if (mode !== 'heartbeat') setMode('heartbeat');
        setIsHeartbeatActive(true);
        // Auto-stop receiving visual after 2.5s if no new signal comes
        const t = setTimeout(() => setIsHeartbeatActive(false), 2500);
        return () => clearTimeout(t);
    } else if (incomingVibe.type === 'game-matrix') {
        setMode('matrix');
        if (incomingVibe.matrixAction === 'invite' && incomingVibe.gridDifficulty) {
            setMatrixDifficulty(incomingVibe.gridDifficulty);
            setMatrixState('playing'); // Skip briefing if invited
            setMyMatrixSelection(null);
            setPartnerMatrixSelection(null);
        } else if (incomingVibe.matrixAction === 'select' && typeof incomingVibe.selectionIndex === 'number') {
            setPartnerMatrixSelection(incomingVibe.selectionIndex);
            // If I have already selected, go to result immediately
            if (myMatrixSelection !== null) {
                setMatrixState('result');
            }
        } else if (incomingVibe.matrixAction === 'reset') {
            setMatrixState('briefing');
            setMyMatrixSelection(null);
            setPartnerMatrixSelection(null);
        }
    }
  }, [incomingVibe]);

  // Handle Heartbeat Loop (Sender)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (mode === 'heartbeat' && isHeartbeatActive) {
        // Initial Pulse
        onSendVibe('heartbeat', undefined, 1);
        triggerHaptic([50, 100, 50]);
        
        // Loop Pulse (approx 70bpm = 850ms)
        interval = setInterval(() => {
            onSendVibe('heartbeat', undefined, 1);
            triggerHaptic([50, 100, 50]);
        }, 850);
    }
    return () => clearInterval(interval);
  }, [mode, isHeartbeatActive]);

  // Handle Breathe Animation & Vibration Loop
  useEffect(() => {
      let interval: NodeJS.Timeout;
      let vibrationTimeout: NodeJS.Timeout;
      
      if (mode === 'breathe') {
          // Duration config based on variant
          const config = {
              calm: { total: 4000, inhale: 2000 },
              meditation: { total: 6000, inhale: 3000 },
              sad: { total: 8000, inhale: 3000 }
          };
          
          const currentConfig = config[breatheVariant];
          
          const runCycle = () => {
             setBreathePhase('in');
             triggerHaptic(currentConfig.inhale); // Vibrate during inhale
             
             vibrationTimeout = setTimeout(() => {
                 setBreathePhase('out');
             }, currentConfig.inhale);
          };

          // Start immediately
          runCycle();
          // Loop
          interval = setInterval(runCycle, currentConfig.total);
          
          // Send signal to partner to sync up
          onSendVibe('breathe', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, breatheVariant);
      }
      
      return () => {
          clearInterval(interval);
          clearTimeout(vibrationTimeout);
      };
  }, [mode, breatheVariant]);

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
  };

  useEffect(() => {
      // Setup canvas size
      if (mode === 'draw' && canvasRef.current) {
          canvasRef.current.width = window.innerWidth;
          canvasRef.current.height = window.innerHeight;
      }
  }, [mode]);

  // Matrix Game Logic
  const handleMatrixTileClick = (index: number) => {
      if (matrixState !== 'playing') return;
      
      setMyMatrixSelection(index);
      triggerHaptic(50);
      
      // Send selection
      onSendVibe('game-matrix', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'select', matrixDifficulty, index);
      
      if (partnerMatrixSelection !== null) {
          setMatrixState('result');
      } else {
          setMatrixState('waiting');
      }
  };

  const startMatrixGame = () => {
      setMatrixState('playing');
      setMyMatrixSelection(null);
      setPartnerMatrixSelection(null);
      onSendVibe('game-matrix', undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, 'invite', matrixDifficulty);
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

  const renderContent = () => {
    if (mode === 'heartbeat') {
        // FLAMINGO THEME
        return (
            <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in duration-300 relative">
                 <button onClick={() => { setIsHeartbeatActive(false); setMode('default'); }} className="absolute top-4 right-4 p-2 glass-button rounded-full text-white/60 hover:text-white">
                    <X size={24} />
                 </button>

                <p className="text-orange-200/60 uppercase tracking-widest text-xs font-bold mb-12">
                    {isHeartbeatActive ? 'Sending Heartbeat...' : 'Tap to Start/Stop'}
                </p>
                <button 
                    onClick={() => setIsHeartbeatActive(!isHeartbeatActive)}
                    className={`w-72 h-72 rounded-full flex items-center justify-center relative overflow-hidden transition-all duration-300 border-4 backdrop-blur-md
                        ${isHeartbeatActive 
                            ? 'bg-rose-500/20 border-rose-400 animate-heartbeat-double shadow-[0_0_50px_rgba(251,113,133,0.4)]' 
                            : 'bg-white/5 border-white/10 hover:border-orange-400/50'
                        }`}
                >
                    {/* ECG Background Layer - FLAMINGO COLORS */}
                    <div className="absolute inset-0 flex items-center opacity-40 pointer-events-none">
                        <svg 
                            className={`w-[200%] h-32 stroke-orange-400 stroke-[3px] fill-none ${isHeartbeatActive ? 'animate-ecg' : ''}`} 
                            viewBox="0 0 400 100" 
                            preserveAspectRatio="none"
                        >
                            <path d="
                                M0 50 L20 50 L30 20 L40 80 L50 50 L90 50 
                                L110 50 L120 10 L130 90 L140 50 L180 50
                                L200 50 L220 50 L230 20 L240 80 L250 50 L290 50
                                L310 50 L320 10 L330 90 L340 50 L380 50 L400 50
                            " vectorEffect="non-scaling-stroke" />
                        </svg>
                    </div>
                    
                    {/* Center Icon Layer - Rose/Orange Mix */}
                    <div className="relative z-10 flex flex-col items-center justify-center">
                         <Heart 
                            size={100} 
                            strokeWidth={1.2}
                            className={`transition-all duration-300 ${isHeartbeatActive ? 'fill-rose-500 text-rose-500 drop-shadow-[0_0_20px_rgba(244,63,94,0.6)] scale-110' : 'fill-transparent text-white/20'}`} 
                         />
                    </div>
                </button>
            </div>
        )
    }

    if (mode === 'draw') {
        // MAGENTA THEME - WITH BLACK BACKGROUND
        return (
            <div className="fixed inset-0 z-50 bg-black animate-in fade-in duration-500">
                <canvas 
                    ref={canvasRef}
                    className="touch-none block w-full h-full"
                    onTouchMove={handleDrawMove}
                    onTouchStart={() => triggerHaptic(20)}
                />
                 <div className="absolute top-8 left-0 right-0 flex flex-col items-center pointer-events-none">
                     <p className="text-fuchsia-200/60 uppercase tracking-widest text-xs font-bold bg-fuchsia-500/10 px-4 py-1 rounded-full backdrop-blur border border-fuchsia-500/20">Touch to draw</p>
                 </div>

                 {/* Info Button for Draw Mode - Replaced HelpCircle with Info */}
                 <button onClick={() => setShowInfo(true)} className="absolute top-8 right-8 z-[60] w-10 h-10 flex items-center justify-center text-white/40 hover:text-white rounded-full bg-black/20 backdrop-blur">
                    <Info size={24} />
                 </button>
                 
                 {/* Color Palette */}
                 <div className="absolute bottom-24 left-0 right-0 flex items-center justify-center gap-4">
                    {DRAW_COLORS.map(c => (
                        <button 
                            key={c}
                            onClick={() => setDrawColor(c)}
                            className={`w-10 h-10 rounded-full border-2 transition-transform active:scale-90 ${drawColor === c ? 'border-white scale-125 shadow-lg shadow-fuchsia-500/30' : 'border-transparent'}`}
                            style={{ backgroundColor: c }}
                        />
                    ))}
                 </div>

                 <button onClick={() => setMode('default')} className="absolute bottom-8 left-1/2 -translate-x-1/2 glass-button px-8 py-3 rounded-full text-sm font-bold flex items-center gap-2 text-white hover:bg-fuchsia-500/20">
                    <X size={16} /> Close
                 </button>
            </div>
        )
    }

    if (mode === 'breathe') {
        // SKY THEME
        const durationMap = { calm: '4s', meditation: '6s', sad: '8s' };
        const activeDuration = durationMap[breatheVariant];

        return (
            <div className="flex-1 flex flex-col items-center justify-center animate-in fade-in duration-1000 relative">
                 <button onClick={() => { setMode('default'); }} className="absolute top-4 right-4 p-2 glass-button rounded-full text-white/60 hover:text-white">
                    <X size={24} />
                 </button>

                 <p className="text-sky-200/60 uppercase tracking-widest text-xs font-bold mb-32">Breathe Together</p>
                 
                 <div className="relative flex items-center justify-center mb-16">
                     {/* Breathing Animation */}
                     <div 
                        className={`w-24 h-24 bg-sky-400/30 rounded-full absolute transition-all ease-in-out`}
                        style={{ 
                            transform: breathePhase === 'in' ? 'scale(3)' : 'scale(1)',
                            opacity: breathePhase === 'in' ? 0.4 : 0,
                            transitionDuration: activeDuration 
                        }} 
                     />
                     <div 
                        className={`w-32 h-32 bg-indigo-400/20 rounded-full absolute blur-xl transition-all ease-in-out`}
                        style={{ 
                             transform: breathePhase === 'in' ? 'scale(2.5)' : 'scale(1)',
                             transitionDuration: activeDuration
                        }} 
                     />
                     
                     <div 
                        className={`w-48 h-48 border-2 border-sky-300/40 rounded-full flex items-center justify-center shadow-[0_0_60px_rgba(125,211,252,0.2)] transition-all ease-in-out backdrop-blur-sm`}
                        style={{ 
                            transform: breathePhase === 'in' ? 'scale(1.5)' : 'scale(1)',
                            transitionDuration: activeDuration 
                        }}
                     >
                         <Wind size={40} className="text-sky-300 opacity-90" />
                     </div>
                 </div>

                 {/* Mode Selectors */}
                 <div className="flex gap-2">
                    {(['calm', 'meditation', 'sad'] as const).map(m => (
                        <button 
                            key={m} 
                            onClick={() => setBreatheVariant(m)}
                            className={`px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border ${breatheVariant === m ? 'bg-sky-500/20 border-sky-400 text-sky-100' : 'glass-button text-white/40 hover:text-white'}`}
                        >
                            {m}
                        </button>
                    ))}
                 </div>
            </div>
        )
    }

    if (mode === 'matrix') {
        // CYAN THEME
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

                 {/* Briefing Screen */}
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
                                 <button
                                     key={diff}
                                     onClick={() => setMatrixDifficulty(diff)}
                                     className={`py-3 rounded-xl text-xs uppercase font-bold tracking-wider border transition-all ${matrixDifficulty === diff ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100' : 'glass-button text-white/40'}`}
                                 >
                                     {diff}
                                 </button>
                             ))}
                         </div>
                         
                         <button onClick={startMatrixGame} className="w-full bg-cyan-100/90 text-cyan-900 py-4 rounded-2xl font-bold mt-4 shadow-lg hover:bg-white transition-colors">
                             Start Game
                         </button>
                     </div>
                 )}

                 {/* Game Grid */}
                 {(matrixState === 'playing' || matrixState === 'waiting' || matrixState === 'result') && (
                     <div className="flex flex-col items-center w-full max-w-sm h-full justify-center">
                         <h3 className="text-xs uppercase tracking-widest text-cyan-300 font-bold mb-6">
                            {matrixState === 'waiting' ? 'Waiting for partner...' : matrixState === 'result' ? 'Result' : 'Pick a Tile'}
                         </h3>
                         
                         <div 
                             className="grid gap-2 w-full aspect-[3/5]" 
                             style={{ 
                                 gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
                                 gridTemplateRows: `repeat(${config.rows}, 1fr)`
                             }}
                         >
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
                                    <button
                                        key={i}
                                        disabled={matrixState !== 'playing'}
                                        onClick={() => handleMatrixTileClick(i)}
                                        className={`rounded-xl border transition-all duration-300 ${bgClass} ${matrixState === 'playing' ? 'active:scale-95 hover:border-cyan-400/40' : ''}`}
                                    />
                                 );
                             })}
                         </div>

                         {/* Result Overlay */}
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

    // DEFAULT MODE (Home)
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

                        {activeEmoji && (
                            <div className="absolute inset-0 flex items-center justify-center animate-bounce z-20 pointer-events-none">
                                <span className="text-6xl filter drop-shadow-md select-none">{activeEmoji}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="w-20 flex flex-col items-end justify-center gap-4 pr-2 z-20">
                {renderPatternSlot(3)}
                {renderPatternSlot(4)}
                {renderPatternSlot(5)}
            </div>
        </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden relative">
      <header className="flex items-center justify-between mb-2 z-10 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 text-white/50 active:scale-90 transition-transform">
          <ChevronLeft size={28} />
        </button>
        <div className="text-center">
          <h2 className="text-xs uppercase tracking-[0.2em] text-white/50 font-bold mb-0.5">Vibing with</h2>
          <h1 className="text-xl font-outfit font-semibold text-white drop-shadow-md">{contact.name}</h1>
        </div>
        
        {/* Info Button - Replaces spacer - Now using Info Icon */}
        <button 
            onClick={() => setShowInfo(true)} 
            className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-white rounded-full transition-colors"
        >
            <Info size={24} />
        </button>
      </header>
      
      {renderContent()}

      {/* Mode Switcher / Toolbar - NOW WITH VIBRANT COLORS */}
      <div className={`z-20 transition-all duration-300 pt-4 shrink-0 flex items-center justify-center gap-3 ${status === 'recording' || mode === 'draw' || mode === 'matrix' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* Heartbeat: Flamingo */}
        <button 
            onClick={() => setMode('heartbeat')}
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center relative transition-all ${mode === 'heartbeat' ? 'bg-gradient-to-br from-rose-500 to-orange-500 text-white border-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'glass-button text-white/50 hover:border-rose-400/50'}`}
        >
            <Activity size={24} className="absolute" strokeWidth={1.5} />
            <Heart size={10} className={`absolute z-10 ${mode === 'heartbeat' ? 'fill-white' : 'fill-white/50'} animate-pulse`} />
        </button>

        {/* Draw: Magenta */}
        <button 
            onClick={() => setMode('draw')}
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center relative transition-all ${mode === 'draw' ? 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white border-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.4)]' : 'glass-button text-white/50 hover:border-fuchsia-400/50'}`}
        >
            <PenTool size={20} className="mb-1" />
            <span className="absolute bottom-2 w-1 h-1 bg-current rounded-full" />
        </button>
        
        {/* Matrix: Cyan */}
        <button 
            onClick={() => setMode('matrix')}
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center relative transition-all ${mode === 'matrix' ? 'bg-gradient-to-br from-cyan-400 to-blue-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]' : 'glass-button text-white/50 hover:border-cyan-400/50'}`}
        >
             <Grid3X3 size={20} />
        </button>

        {/* Breathe: Sky/Blue */}
        <button 
            onClick={() => setMode('breathe')}
            className={`w-14 h-14 rounded-2xl border flex items-center justify-center relative transition-all ${mode === 'breathe' ? 'bg-gradient-to-br from-sky-400 to-indigo-500 text-white border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 'glass-button text-white/50 hover:border-sky-400/50'}`}
        >
             <Wind size={20} />
             <div className="absolute w-8 h-8 rounded-full border border-current opacity-30 animate-ping" />
        </button>

        {/* Chat */}
        <button 
            onClick={onOpenChat}
            className="flex items-center justify-center w-14 h-14 glass-button rounded-2xl active:scale-95 transition-all hover:bg-white/10 group"
        >
            <MessageCircle size={20} className="text-white/50 group-hover:text-white transition-colors" />
        </button>
      </div>

      {/* Info Modal ("Who am I?") */}
      {showInfo && (
        <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-300" onClick={() => setShowInfo(false)}>
            <div className="glass-panel p-8 rounded-[2rem] max-w-sm w-full space-y-6 relative border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
                <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 p-2 text-white/40 hover:text-white transition-colors">
                    <X size={20} />
                </button>
                
                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-bold">What is this?</p>
                    <h2 className={`text-3xl font-outfit font-bold ${MODE_INFO[mode].color} drop-shadow-md`}>
                        {MODE_INFO[mode].title}
                    </h2>
                </div>
                
                <div className="space-y-4 pt-2">
                    <p className="text-white font-medium text-lg italic opacity-90 leading-tight">
                        "{MODE_INFO[mode].question}"
                    </p>
                    <p className="text-white/70 text-sm leading-relaxed text-justify font-light">
                        {MODE_INFO[mode].answer}
                    </p>
                </div>
                
                <button onClick={() => setShowInfo(false)} className="w-full py-4 bg-white/10 hover:bg-white/20 rounded-xl text-white font-bold transition-colors mt-2">
                    Got it
                </button>
            </div>
        </div>
      )}

      {/* Recorder Modal */}
      {showRecorder && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-2xl flex flex-col p-8 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-outfit font-semibold text-white">Custom Vibe</h3>
            <button onClick={() => { setShowRecorder(false); setStatus('idle'); setRecordingData([]); }} className="text-white/50 p-2"><X size={24} /></button>
          </div>
          
          <div className="flex-1 flex flex-col items-center justify-center space-y-8">
            <div onMouseDown={() => { triggerHaptic(80); setRecordingData(prev => [...prev, 100, 100]); }} className="w-52 h-52 rounded-[4rem] glass-button flex items-center justify-center active:scale-95 active:border-pink-500 transition-all shadow-2xl group cursor-pointer relative">
               <CircleDot size={80} className="text-white/40 group-active:text-pink-400 transition-colors" />
            </div>
            
            <div className="text-center space-y-1">
              <p className="text-white/60 text-sm">Tap the drum to record a rhythm</p>
              <p className="text-[10px] uppercase tracking-widest text-white/40 font-bold">{recordingData.length > 0 ? `${Math.floor(recordingData.length / 2) + 1} vibes recorded` : 'Ready to record'}</p>
            </div>

            <div className="w-full space-y-3 max-w-sm">
              <div className="flex space-x-3">
                 <div className="relative group">
                    <input 
                      type="text" 
                      value={recordingEmoji} 
                      onChange={(e) => setRecordingEmoji(e.target.value.substring(0, 2))}
                      className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl text-center text-2xl focus:outline-none focus:border-pink-500 transition-all text-white"
                    />
                    <Smile className="absolute -top-2 -right-2 text-white/60" size={14} />
                 </div>
                 <div className="flex-1 space-y-2">
                    <input 
                        type="text" 
                        placeholder="Pattern Name" 
                        value={recordingName} 
                        onChange={(e) => setRecordingName(e.target.value)} 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 focus:outline-none focus:border-pink-500/50 text-sm text-white" 
                    />
                    <input 
                        type="text" 
                        placeholder="Default Message (Optional)" 
                        value={recordingDefaultMsg} 
                        onChange={(e) => setRecordingDefaultMsg(e.target.value)} 
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-3 focus:outline-none focus:border-pink-500/50 text-sm text-white" 
                    />
                 </div>
              </div>
              <button 
                onClick={() => {
                     if (recordingData.length < 1) return;
                     onSavePattern({
                       id: generateId(),
                       name: recordingName.trim() || `Pattern ${customPatterns.length + 1}`,
                       emoji: recordingEmoji,
                       data: recordingData,
                       isPreset: false,
                       defaultMessage: recordingDefaultMsg.trim() 
                     });
                     setRecordingData([]);
                     setRecordingName('');
                     setShowRecorder(false);
                     setStatus('idle');
                }} 
                disabled={recordingData.length === 0} 
                className="w-full py-4 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-bold rounded-2xl disabled:opacity-20 shadow-xl shadow-pink-900/10 active:scale-[0.98] transition-all"
              >
                Save My Pattern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VibingScreen;
