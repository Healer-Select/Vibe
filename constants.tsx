
import { VibePattern } from './types';

export const COLORS = [
  'bg-gradient-to-br from-rose-400 to-orange-400',
  'bg-gradient-to-br from-fuchsia-500 to-purple-600',
  'bg-gradient-to-br from-cyan-400 to-blue-500',
  'bg-gradient-to-br from-emerald-400 to-teal-500',
  'bg-gradient-to-br from-amber-300 to-orange-500',
  'bg-gradient-to-br from-indigo-400 to-violet-600'
];

export const PRESET_PATTERNS: VibePattern[] = [];

export const getRandomColor = () => {
  const array = new Uint32Array(1);
  window.crypto.getRandomValues(array);
  return COLORS[array[0] % COLORS.length];
};

// --- VISUAL HAPTIC FALLBACK ---
export const triggerHaptic = (pattern: number | number[]) => {
  // 1. Try Native Vibration
  const hasVibration = 'vibrate' in navigator && typeof navigator.vibrate === 'function';
  let success = false;
  
  if (hasVibration) {
    try {
      success = navigator.vibrate(pattern);
    } catch (e) {
      // Ignore security errors in background
    }
  }

  // 2. iOS / Unsupported Fallback: Dispatch Event for Visual Shake
  if (!success || !hasVibration) {
    const event = new CustomEvent('vibe-visual-haptic', { 
      detail: { intensity: Array.isArray(pattern) ? 'heavy' : 'light' } 
    });
    window.dispatchEvent(event);
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

// --- SECURITY & CRYPTOGRAPHY ---

// Hash function for channel obfuscation
export const getChannelName = async (pairCode: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(pairCode + "-vibe-channel-salt-v1");
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    // Return first 16 chars of hash
    return "vibe-" + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 24);
};

const getCryptoKey = async (code1: string, code2: string) => {
  // DYNAMIC SALT: Sort codes alphabetically so both peers derive the same salt
  // without exchanging it.
  const dynamicSalt = [code1, code2].sort().join(':');
  const encoder = new TextEncoder();
  
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    encoder.encode(dynamicSalt), // Use the pair combo as the seed
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );
  
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(dynamicSalt + "static-app-pepper"), // Salt + Pepper
      iterations: 300000, // OWASP Mobile Recommendation (High Security)
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
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // Unique IV per message
    const encoded = new TextEncoder().encode(text);
    
    const encrypted = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoded
    );

    const encryptedArray = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedArray.length);
    combined.set(iv);
    combined.set(encryptedArray, iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    console.error("Encryption failed", e);
    return "";
  }
};

export const decryptMessage = async (cipherText: string, myCode: string, theirCode: string): Promise<string> => {
  try {
    const key = await getCryptoKey(myCode, theirCode);
    
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
    // Fail silently in UI, log only to console
    console.error("Decryption failed - Key mismatch or corrupt data");
    return "🔒 Decryption Error";
  }
};
