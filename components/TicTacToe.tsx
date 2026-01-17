
import React, { useState, useEffect, useRef } from 'react';
import { VibeSignal, TicTacToeSignal, VibeCategory, VibeAction } from '../types';
import { RefreshCw, X as XIcon, X } from 'lucide-react';
import { triggerHaptic } from '../constants';

interface Props {
  userCode: string;
  contactCode: string;
  onSendSignal: (type: VibeCategory, action: VibeAction, payload: Partial<VibeSignal>) => void;
  incomingVibe: VibeSignal | null;
  onClose: () => void;
}

const TicTacToe: React.FC<Props> = ({ userCode, contactCode, onSendSignal, incomingVibe, onClose }) => {
  // Deterministic Role Assignment
  // Lower pair code is always X, Higher is O.
  const myRole = userCode < contactCode ? 'X' : 'O';
  const partnerRole = myRole === 'X' ? 'O' : 'X';

  const [board, setBoard] = useState<(string | null)[]>(Array(9).fill(null));
  const [isXNext, setIsXNext] = useState(true);
  
  const hasVibratedRef = useRef(false);

  // --- GAME LOGIC ---
  const calculateWinner = (squares: (string | null)[]) => {
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
      [0, 3, 6], [1, 4, 7], [2, 5, 8], // Cols
      [0, 4, 8], [2, 4, 6]             // Diagonals
    ];
    for (let i = 0; i < lines.length; i++) {
      const [a, b, c] = lines[i];
      if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
        return { winner: squares[a], line: lines[i] };
      }
    }
    return null;
  };

  const winInfo = calculateWinner(board);
  const isDraw = !winInfo && board.every(Boolean);
  const currentPlayer = isXNext ? 'X' : 'O';
  const isMyTurn = !winInfo && !isDraw && currentPlayer === myRole;

  // --- VIBRATION EFFECT (Completion Only) ---
  useEffect(() => {
    // Only trigger if we haven't vibrated for this specific end-state yet
    if ((winInfo || isDraw) && !hasVibratedRef.current) {
        hasVibratedRef.current = true;
        if (winInfo) {
            // Win/Loss Vibration: Gentle Celebration
            triggerHaptic([40, 60, 40]); 
        } else {
            // Draw Vibration: Short single bump
            triggerHaptic(30);
        }
    } else if (!winInfo && !isDraw) {
        // Reset the ref if game restarts
        hasVibratedRef.current = false;
    }
  }, [winInfo, isDraw]);

  // --- SIGNAL HANDLING ---
  useEffect(() => {
    if (!incomingVibe || incomingVibe.category !== 'game-ttt') return;

    if (incomingVibe.action === 'reset') {
        setBoard(Array(9).fill(null));
        setIsXNext(true);
        hasVibratedRef.current = false;
    } else if (incomingVibe.action === 'data' && typeof incomingVibe.cellIndex === 'number' && incomingVibe.player) {
        const { cellIndex, player } = incomingVibe;
        
        // Prevent applying duplicate moves or moves on finished games locally
        setBoard(prev => {
            if (prev[cellIndex] || calculateWinner(prev)) return prev;
            const next = [...prev];
            next[cellIndex] = player;
            return next;
        });
        setIsXNext(player === 'X' ? false : true);
    }
  }, [incomingVibe]);

  // --- ACTIONS ---
  const handleCellClick = (index: number) => {
    if (!isMyTurn || board[index] || winInfo) return;

    // Optimistic Update
    const nextBoard = [...board];
    nextBoard[index] = myRole;
    setBoard(nextBoard);
    setIsXNext(!isXNext);

    // Send Signal
    onSendSignal('game-ttt', 'data', { cellIndex: index, player: myRole });
  };

  const handleReset = () => {
      onSendSignal('game-ttt', 'reset', {});
      setBoard(Array(9).fill(null));
      setIsXNext(true);
      hasVibratedRef.current = false;
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center animate-in zoom-in duration-300 relative w-full h-full p-4">
        {/* Header Controls */}
        <button onClick={onClose} className="absolute top-2 right-2 p-2 glass-button rounded-full text-white/60 hover:text-white z-10">
            <X size={24} />
        </button>

        {/* Status Indicator */}
        <div className="mb-8 flex flex-col items-center space-y-2">
            <h2 className="text-2xl font-outfit font-bold text-white tracking-wide">TIC TAC TOE</h2>
            <div className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border backdrop-blur-md ${
                winInfo 
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300' 
                    : isDraw 
                        ? 'bg-white/10 border-white/20 text-white/60'
                        : isMyTurn 
                            ? 'bg-fuchsia-500/20 border-fuchsia-500/50 text-fuchsia-300 animate-pulse' 
                            : 'bg-black/40 border-white/10 text-white/40'
            }`}>
                {winInfo 
                    ? (winInfo.winner === myRole ? 'You Won!' : 'Partner Won') 
                    : isDraw 
                        ? 'Draw' 
                        : isMyTurn 
                            ? 'Your Turn' 
                            : 'Waiting...'}
            </div>
        </div>

        {/* Game Grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[320px] aspect-square p-3 glass-panel rounded-3xl shadow-2xl">
            {board.map((cell, i) => {
                const isWinningCell = winInfo?.line.includes(i);
                return (
                    <button
                        key={i}
                        onClick={() => handleCellClick(i)}
                        disabled={!!cell || !!winInfo || !isMyTurn}
                        className={`
                            relative rounded-xl flex items-center justify-center text-4xl font-bold transition-all duration-300
                            ${cell ? 'bg-white/5' : 'bg-black/20 hover:bg-white/10'}
                            ${isWinningCell ? 'bg-emerald-500/20 shadow-[inset_0_0_20px_rgba(16,185,129,0.4)]' : ''}
                            ${!cell && isMyTurn && !winInfo ? 'cursor-pointer active:scale-95' : 'cursor-default'}
                        `}
                    >
                        <span className={`transform transition-all duration-300 ${cell ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}>
                            {cell === 'X' && <XIcon size={40} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
                            {cell === 'O' && <div className="w-8 h-8 rounded-full border-[5px] border-rose-400 drop-shadow-[0_0_8px_rgba(251,113,133,0.8)]" />}
                        </span>
                    </button>
                );
            })}
        </div>

        {/* Footer Actions */}
        {(winInfo || isDraw) && (
            <button 
                onClick={handleReset}
                className="mt-8 flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-white font-bold transition-all active:scale-95"
            >
                <RefreshCw size={18} />
                <span>Play Again</span>
            </button>
        )}
        
        {!winInfo && !isDraw && (
            <p className="mt-8 text-white/30 text-xs uppercase tracking-widest font-semibold">
                You are playing as <span className={myRole === 'X' ? 'text-cyan-400' : 'text-rose-400'}>{myRole}</span>
            </p>
        )}
    </div>
  );
};

export default TicTacToe;
