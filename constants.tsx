
import { Contact } from './types';

export const COLORS = [
  'bg-rose-500',
  'bg-violet-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-sky-500',
  'bg-fuchsia-500'
];

export const getRandomColor = () => {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return COLORS[array[0] % COLORS.length];
};

export const triggerHaptic = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    navigator.vibrate(pattern);
  }
};

export const generatePairCode = () => {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No O, 0, I, 1 for clarity
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

// Input Sanitization helper
export const sanitizeInput = (input: string) => {
  return input.replace(/[^a-zA-Z0-9\s]/g, '').trim();
};
