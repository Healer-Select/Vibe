
export type VibeType = 'tap' | 'hold';

export interface VibeSignal {
  id: string;
  senderId: string;
  senderName: string;
  type: VibeType;
  count?: number; // For tap vibes
  duration?: number; // For hold vibes (ms)
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
