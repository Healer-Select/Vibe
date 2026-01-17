
export type VibeCategory = 'heartbeat' | 'draw' | 'breathe' | 'matrix' | 'touch' | 'chat' | 'game-ttt';
export type VibeAction = 'invite' | 'accept' | 'data' | 'stop' | 'sync' | 'text' | 'clear' | 'select' | 'reveal' | 'reset';

// Base interface for all signals
interface BaseSignal {
  id: string;
  senderId: string; // The Pair Code
  senderUniqueId?: string; // Device UUID
  senderName: string;
  timestamp: number;
  category: VibeCategory;
  action: VibeAction;
}

// 1. Touch Signals (Tap, Hold, Pattern)
export interface TouchSignal extends BaseSignal {
  category: 'touch';
  action: 'data';
  touchType: 'tap' | 'hold' | 'pattern';
  count?: number; 
  duration?: number; 
  patternName?: string; 
  patternEmoji?: string; 
  patternData?: number[];
  whisperText?: string; // New: Text to display on heart
}

// 2. Chat Signals
export interface ChatSignal extends BaseSignal {
  category: 'chat';
  action: 'text' | 'clear';
  payload?: string; // Encrypted text
}

// 3. Heartbeat Signals
export interface HeartbeatSignal extends BaseSignal {
  category: 'heartbeat';
  action: 'invite' | 'data' | 'stop';
  bpm?: number;
  count?: number; // 1-10 sequence
}

// 4. Drawing Signals
export interface DrawSignal extends BaseSignal {
  category: 'draw';
  action: 'invite' | 'data' | 'stop';
  points?: { x: number, y: number }[]; 
  color?: string; 
}

// 5. Breathe Signals
export interface BreatheSignal extends BaseSignal {
  category: 'breathe';
  action: 'invite' | 'sync' | 'stop';
  variant?: 'calm' | 'meditation' | 'sad';
}

// 6. Matrix Game Signals
export interface MatrixSignal extends BaseSignal {
  category: 'matrix';
  action: 'invite' | 'select' | 'reveal' | 'reset';
  difficulty?: 'easy' | 'medium' | 'hard';
  selectionIndex?: number;
}

// 7. Tic Tac Toe Signals
export interface TicTacToeSignal extends BaseSignal {
  category: 'game-ttt';
  action: 'invite' | 'data' | 'reset';
  cellIndex?: number;
  player?: 'X' | 'O';
}

// Discriminated Union
export type VibeSignal = TouchSignal | ChatSignal | HeartbeatSignal | DrawSignal | BreatheSignal | MatrixSignal | TicTacToeSignal;

export interface VibePattern {
  id: string;
  name: string;
  emoji: string;
  data: number[];
  isPreset?: boolean;
  defaultMessage?: string;
}

export interface Contact {
  id: string;
  name: string;
  pairCode: string;
  color: string;
  fcmToken?: string; 
}

export interface UserProfile {
  id: string;
  displayName: string;
  pairCode: string;
  fcmToken?: string; 
}

export enum AppScreen {
  SETUP = 'setup',
  DASHBOARD = 'dashboard',
  PAIRING = 'pairing',
  VIBING = 'vibing'
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  type: 'user' | 'system' | 'whisper';
}
