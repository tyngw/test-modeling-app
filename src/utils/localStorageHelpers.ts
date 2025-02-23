// src/utils/localStorageHelpers.ts
import CryptoJS from 'crypto-js';
import { NUMBER_OF_SECTIONS } from '../constants/ElementSettings';

const ENCRYPTION_KEY = 'encryptionKey';
const TABS_STORAGE_KEY = 'tabsState';
const LAST_SAVED_FILE_KEY = 'lastSavedFileName';

const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window !== 'undefined' ? localStorage.getItem(key) : null;
    } catch (e) {
      console.error('localStorage access failed:', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(key, value);
      }
    } catch (e) {
      console.error('localStorage access failed:', e);
    }
  }
};

// セクション数関連
export const getNumberOfSections = (): number => {
  const stored = safeLocalStorage.getItem('numberOfSections');
  return stored ? parseInt(stored, 10) || NUMBER_OF_SECTIONS : NUMBER_OF_SECTIONS;
};

export const setNumberOfSections = (value: number): void => {
  const clampedValue = Math.max(1, Math.min(10, value));
  safeLocalStorage.setItem('numberOfSections', clampedValue.toString());
};

// APIキー関連
export const getApiKey = (): string => {
  try {
    const stored = safeLocalStorage.getItem('apiKey');
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
    safeLocalStorage.setItem('apiKey', encrypted);
  } catch (e) {
    console.error('API key encryption failed:', e);
  }
};

// タブ状態関連
export const getTabsState = (): string | null => {
  return safeLocalStorage.getItem(TABS_STORAGE_KEY);
};

export const setTabsState = (value: string): void => {
  safeLocalStorage.setItem(TABS_STORAGE_KEY, value);
};

// ファイル名関連
export const getLastSavedFileName = (): string | null => {
  return safeLocalStorage.getItem(LAST_SAVED_FILE_KEY);
};

export const setLastSavedFileName = (name: string): void => {
  const cleanedName = name.replace('.json', '');
  safeLocalStorage.setItem(LAST_SAVED_FILE_KEY, cleanedName);
};