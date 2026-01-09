
import { VibePattern } from './types';

export const COLORS = [
  'bg-rose-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-fuchsia-500'
];

export const PRESET_PATTERNS: VibePattern[] = [
  { id: 'p1', name: 'Heartbeat', emoji: '❤️', data: [350, 180, 350, 800, 350, 180, 350], isPreset: true },
  { id: 'p2', name: 'SOS', emoji: '🆘', data: [300, 100, 300, 100, 300, 400, 600, 100, 600, 100, 600, 400, 300, 100, 300, 100, 300], isPreset: true },
  { id: 'p3', name: 'Calm', emoji: '🌊', data: [1800, 1000, 1800], isPreset: true },
  { id: 'p4', name: 'Nudge', emoji: '👊', data: [250, 150, 250, 150, 250], isPreset: true }
];

export const getRandomColor = () => {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return COLORS[array[0] % COLORS.length];
};

export const triggerHaptic = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    // Longer durations feel "stronger" on mobile motors
    navigator.vibrate(pattern);
  }
};

export const generatePairCode = () => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  const values = new Uint32Array(6);
  window.crypto.getRandomValues(values);
  for (let i = 0; i < 6; i++) {
    result += charset[values[i] % charset.length];
  }
  return result;
};

export const generateId = () => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => dec.toString(16).padStart(2, '0')).join('');
};

export const sanitizeInput = (input: string) => {
  return input.replace(/[^a-zA-Z0-9\s\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}]/gu, '').trim();
};
