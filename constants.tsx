
import { VibePattern } from './types';

// Updated to "Love and Light" Gradients
// Vibrant, distinct colors for contacts and UI themes
export const COLORS = [
  'bg-gradient-to-br from-rose-400 to-orange-400',    // Flamingo
  'bg-gradient-to-br from-fuchsia-500 to-purple-600', // Magenta
  'bg-gradient-to-br from-cyan-400 to-blue-500',      // Cyan
  'bg-gradient-to-br from-emerald-400 to-teal-500',   // Mint
  'bg-gradient-to-br from-amber-300 to-orange-500',   // Sunshine
  'bg-gradient-to-br from-indigo-400 to-violet-600'   // Twilight
];

export const PRESET_PATTERNS: VibePattern[] = [];

export const getRandomColor = () => {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return COLORS[array[0] % COLORS.length];
};

export const triggerHaptic = (pattern: number | number[]) => {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn('Haptic feedback failed', e);
    }
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

// --- Encryption Helpers ---

const getCryptoKey = async (code1: string, code2: string) => {
  // Create a consistent seed from the two pair codes (alphabetical order)
  const seed = [code1, code2].sort().join('-');
  const encoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(seed),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('vibe-salt-static'), // In a real app, salt should be dynamic
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
};

export const encryptMessage = async (text: string, myCode: string, theirCode: string): Promise<string> => {
  try {
    const key = await getCryptoKey(myCode, theirCode);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    // Combine IV and data for transport
    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);
    
    // Convert to Base64
    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error("Encryption failed", e);
    return "";
  }
};

export const decryptMessage = async (cipherText: string, myCode: string, theirCode: string): Promise<string> => {
  try {
    const key = await getCryptoKey(myCode, theirCode);
    
    // Convert Base64 back to Uint8Array
    const binaryString = atob(cipherText);
    const combined = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      combined[i] = binaryString.charCodeAt(i);
    }
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    const decrypted = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );
    
    return new TextDecoder().decode(decrypted);
  } catch (e) {
    console.error("Decryption failed", e);
    return "🔒 Could not decrypt message";
  }
};
