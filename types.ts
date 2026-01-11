
export type VibeType = 'tap' | 'hold' | 'pattern' | 'chat' | 'heartbeat' | 'draw' | 'breathe' | 'game-matrix';

export interface VibePattern {
  id: string;
  name: string;
  emoji: string;
  data: number[];
  isPreset?: boolean;
  defaultMessage?: string;
}

export interface VibeSignal {
  id: string;
  senderId: string;
  senderName: string;
  type: VibeType;
  text?: string; // Encrypted string if type is 'chat'
  count?: number; 
  duration?: number; 
  patternName?: string; 
  patternEmoji?: string; 
  patternData?: number[]; 
  points?: { x: number, y: number }[]; // For drawing
  color?: string; // For drawing color
  breatheVariant?: 'calm' | 'meditation' | 'sad'; // For breathe mode
  
  // Matrix Game Props
  matrixAction?: 'invite' | 'select' | 'reveal' | 'reset';
  gridDifficulty?: 'easy' | 'medium' | 'hard';
  selectionIndex?: number;
  
  timestamp: number;
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
  VIBING = 'vibing',
  CHAT = 'chat'
}
