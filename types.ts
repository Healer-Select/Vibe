
export type VibeType = 'tap' | 'hold' | 'pattern';

export interface VibePattern {
  id: string;
  name: string;
  emoji: string;
  data: number[];
  isPreset?: boolean;
}

export interface VibeSignal {
  id: string;
  senderId: string;
  senderName: string;
  senderEmoji?: string;
  type: VibeType;
  count?: number;
  duration?: number;
  patternName?: string;
  patternEmoji?: string;
  patternData?: number[];
  timestamp: number;
}

export interface Contact {
  id: string;
  name: string;
  emoji: string;
  pairCode: string;
  color: string;
}

export interface UserProfile {
  id: string;
  displayName: string;
  pairCode: string;
}

export enum AppScreen {
  SETUP = 'setup',
  DASHBOARD = 'dashboard',
  PAIRING = 'pairing',
  VIBING = 'vibing'
}
