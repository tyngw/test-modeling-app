// src/utils/localStorageHelpers.ts
import CryptoJS from 'crypto-js';
import { NUMBER_OF_SECTIONS } from '../constants/ElementSettings';

const ENCRYPTION_KEY = 'encryptionKey';

export const getNumberOfSections = (): number => {
  try {
    if (typeof window === 'undefined') return NUMBER_OF_SECTIONS;
    const stored = localStorage.getItem('numberOfSections');
    return stored ? parseInt(stored, 10) || NUMBER_OF_SECTIONS : NUMBER_OF_SECTIONS;
  } catch (e) {
    console.error('localStorage access failed:', e);
    return NUMBER_OF_SECTIONS;
  }
};

export const setNumberOfSections = (value: number): void => {
  try {
    localStorage.setItem('numberOfSections', Math.max(1, Math.min(10, value)).toString());
  } catch (e) {
    console.error('localStorage access failed:', e);
  }
};

export const getApiKey = (): string => {
  try {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem('apiKey');
    if (!stored) return '';
    const bytes = CryptoJS.AES.decrypt(stored, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    console.error('API key decryption failed:', e);
    return '';
  }
};

export const setApiKey = (value: string): void => {
  try {
    const encrypted = CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
    localStorage.setItem('apiKey', encrypted);
  } catch (e) {
    console.error('API key encryption failed:', e);
  }
};