
import React, { useState, useRef, useEffect } from 'react';
import { Contact, UserProfile, VibeType, VibePattern } from '../types.ts';
import { ChevronLeft, Heart, Plus, Trash2, X, CircleDot } from 'lucide-react';
import { triggerHaptic, PRESET_PATTERNS, generateId } from '../constants.tsx';

interface Props {
  contact: Contact;
  user: UserProfile;
  onBack: () => void;
  onSendVibe: (type: VibeType, count?: number, duration?: number, patternName?: string, patternData?: number[]) => void;
  customPatterns: VibePattern[];
  onSavePattern: (pattern: VibePattern) => void;
  onDeletePattern: (id: string) => void;
}

const VibingScreen: React.FC<Props> = ({ 
  contact, 
  user, 
  onBack, 
  onSendVibe, 
  customPatterns, 
  onSavePattern, 
  onDeletePattern 
}) => {
  const [isPressing, setIsPressing] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [status, setStatus] = useState<'idle' | 'holding' | 'tapped' | 'recording'>('idle');
  const [showRecorder, setShowRecorder] = useState(false);
  
  // Recording logic
  const [recordingData, setRecordingData] = useState<number[]>([]);
  const lastRecordTime = useRef<number | null>(null);
  const [recordingName, setRecordingName] = useState('');

  const pressStartTime = useRef<number | null>(null);
  const tapTimer = useRef<number | null>(null);

  const LONG_PRESS_THRESHOLD = 300;
  const TAP_WINDOW = 500;

  const handleStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (status === 'recording') return;
    
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
    if (status === 'recording') return;
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

  const handleRecordTap = () => {
    const now = Date.now();
    triggerHaptic(50);
    
    if (lastRecordTime.current) {
      const gap = now - lastRecordTime.current;
      // Recording a pair: [vibration_length, gap_length]
      // For simplicity in this app, we'll record it as a sequence of [50ms vibration, gap]
      setRecordingData(prev => [...prev, 50, gap]);
    } else {
      setRecordingData([50]);
    }
    lastRecordTime.current = now;
  };

  const saveRecording = () => {
    if (recordingData.length < 1) return;
    onSavePattern({
      id: generateId(),
      name: recordingName.trim() || `Pattern ${customPatterns.length + 1}`,
      data: recordingData,
      isPreset: false
    });
    setRecordingData([]);
    setRecordingName('');
    lastRecordTime.current = null;
    setShowRecorder(false);
    setStatus('idle');
  };

  useEffect(() => {
    return () => {
      if (tapTimer.current) clearTimeout(tapTimer.current);
    };
  }, []);

  const heartColor = contact.color.replace('bg-', 'text-');
  const allPatterns = [...PRESET_PATTERNS, ...customPatterns];

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden relative">
      <header className="flex items-center justify-between mb-4 z-10">
        <button onClick={onBack} className="p-2 -ml-2 text-zinc-400 active:scale-90 transition-transform">
          <ChevronLeft size={28} />
        </button>
        <div className="text-center">
          <h2 className="text-xs uppercase tracking-[0.2em] text-zinc-500 font-bold mb-0.5">Vibing with</h2>
          <h1 className="text-xl font-outfit font-semibold text-white">{contact.name}</h1>
        </div>
        <button 
          onClick={() => { setShowRecorder(true); setStatus('recording'); }}
          className="p-2 -mr-2 text-zinc-400 active:rotate-90 transition-transform"
        >
          <Plus size={24} />
        </button>
      </header>

      {/* Pattern Selector Tray */}
      <div className="flex space-x-2 overflow-x-auto pb-4 pt-2 no-scrollbar z-10">
        {allPatterns.map(pattern => (
          <div key={pattern.id} className="relative group shrink-0">
            <button
              onClick={() => {
                triggerHaptic(pattern.data);
                onSendVibe('pattern', undefined, undefined, pattern.name, pattern.data);
              }}
              className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-full text-xs font-semibold text-zinc-300 active:scale-95 transition-all hover:border-zinc-700"
            >
              {pattern.name}
            </button>
            {!pattern.isPreset && (
              <button 
                onClick={(e) => { e.stopPropagation(); onDeletePattern(pattern.id); }}
                className="absolute -top-1 -right-1 bg-zinc-800 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={10} className="text-zinc-500" />
              </button>
            )}
          </div>
        ))}
      </div>

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
          className={`relative group cursor-pointer no-select touch-none ${status === 'recording' ? 'pointer-events-none opacity-20 blur-sm' : ''}`}
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

        <div className={`absolute bottom-16 w-full flex justify-center space-x-12 px-6 transition-opacity ${status === 'recording' ? 'opacity-0' : 'opacity-100'}`}>
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

      {/* Pattern Recorder Modal */}
      {showRecorder && (
        <div className="fixed inset-0 z-50 bg-zinc-950/90 backdrop-blur-xl flex flex-col p-8 animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xl font-outfit font-semibold">New Pattern</h3>
            <button 
              onClick={() => { setShowRecorder(false); setStatus('idle'); setRecordingData([]); }}
              className="text-zinc-500 p-2"
            >
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center space-y-12">
            <div 
              onMouseDown={handleRecordTap}
              onTouchStart={handleRecordTap}
              className="w-48 h-48 rounded-[3rem] bg-zinc-900 border-4 border-zinc-800 flex items-center justify-center active:scale-95 active:border-rose-500 transition-all shadow-2xl group cursor-pointer"
            >
              <CircleDot size={64} className="text-zinc-700 group-active:text-rose-500 transition-colors" />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-zinc-400 text-sm">Tap the pad to record a rhythm</p>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-bold">
                {recordingData.length > 0 ? `${Math.floor(recordingData.length / 2) + 1} steps recorded` : 'Ready to record'}
              </p>
            </div>

            <div className="w-full space-y-4">
              <input 
                type="text" 
                placeholder="Name your pattern (e.g. Secret Code)"
                value={recordingName}
                onChange={(e) => setRecordingName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-5 py-4 text-center focus:outline-none focus:border-rose-500/50"
              />
              <button 
                onClick={saveRecording}
                disabled={recordingData.length === 0}
                className="w-full py-4 bg-rose-600 text-white font-bold rounded-2xl disabled:opacity-20 shadow-xl shadow-rose-900/10 active:scale-[0.98] transition-all"
              >
                Save Pattern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VibingScreen;
