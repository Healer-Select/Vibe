
export type VibeType = 'tap' | 'hold' | 'pattern';

export interface VibePattern {
  id: string;
  name: string;
  emoji: string;
  data: number[];
  isPreset?: boolean;
  defaultMessage?: string; // New: Optional default message for the pattern
}

export interface VibeSignal {
  id: string;
  senderId: string;
  senderName: string;
  type: VibeType;
  text?: string; // New: Message text attached to the vibe
  count?: number; // For tap vibes
  duration?: number; // For hold vibes (ms)
  patternName?: string; // For pattern vibes
  patternEmoji?: string; // For pattern vibes
  patternData?: number[]; // For pattern vibes
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
  VIBING = 'vibing'
}
