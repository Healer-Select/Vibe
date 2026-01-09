
export type VibeType = 'tap' | 'hold' | 'pattern';

export interface VibePattern {
  id: string;
  name: string;
  data: number[];
  isPreset?: boolean;
}

export interface VibeSignal {
  id: string;
  senderId: string;
  senderName: string;
  type: VibeType;
  count?: number; // For tap vibes
  duration?: number; // For hold vibes (ms)
  patternName?: string; // For pattern vibes
  patternData?: number[]; // For pattern vibes
  timestamp: number;
}

export interface Contact {
  id: string;
  name: string;
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
