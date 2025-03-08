// src/utils/localStorageHelpers.ts
'use client';

import { NUMBER_OF_SECTIONS } from '../constants/elementSettings';
import { SYSTEM_PROMPT_TEMPLATE } from '../constants/systemPrompt';
import { VERSION } from '../constants/version';

const ENCRYPTION_KEY = 'encryptionKey';
const TABS_STORAGE_KEY = 'tabsState';
const LAST_SAVED_FILE_KEY = 'lastSavedFileName';
export const VERSION_KEY = 'appVersion';
const PROMPT_KEY = 'prompt';
const SYSTEM_PROMPT_KEY = 'systemPromptTemplate';
const APIKEY_KEY = 'apiKey';

// CryptoJS動的ローダー
const loadCryptoJS = async () => {
  if (typeof window !== 'undefined') {
    return await import('crypto-js');
  }
  return null;
};

// 暗号化処理ラッパー
const withCryptoJS = async <T,>(callback: (crypto: typeof import('crypto-js')) => T): Promise<T | null> => {
  try {
    const crypto = await loadCryptoJS();
    if (!crypto) return null;
    return callback(crypto);
  } catch (e) {
    console.error('CryptoJS load failed:', e);
    return null;
  }
};

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.error('localStorage access failed:', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.error('localStorage access failed:', e);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.error('localStorage access failed:', e);
    }
  }
};

// バージョンチェックと初期化
const checkAndUpdateVersion = () => {
  if (typeof window === 'undefined') return;

  const storedVersion = safeLocalStorage.getItem(VERSION_KEY);
  if (storedVersion !== VERSION) {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key !== TABS_STORAGE_KEY && key !== APIKEY_KEY && key !== PROMPT_KEY) {
        safeLocalStorage.removeItem(key);
      }
    });
    safeLocalStorage.setItem(VERSION_KEY, VERSION);
  }
};

checkAndUpdateVersion();

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
export const getApiKey = async (): Promise<string> => {
  const result = await withCryptoJS((CryptoJS) => {
    try {
      const stored = safeLocalStorage.getItem(APIKEY_KEY);
      if (!stored) return '';
      const bytes = CryptoJS.AES.decrypt(stored, ENCRYPTION_KEY);
      return bytes.toString(CryptoJS.enc.Utf8);
    } catch (e) {
      console.error('API key decryption failed:', e);
      return '';
    }
  });
  return result ?? '';
};

export const setApiKey = async (value: string): Promise<void> => {
  await withCryptoJS((CryptoJS) => {
    try {
      const encrypted = CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
      safeLocalStorage.setItem(APIKEY_KEY, encrypted);
    } catch (e) {
      console.error('API key encryption failed:', e);
    }
  });
};

// その他の関数（変更なし）
export const getApiEndpoint = (): string => safeLocalStorage.getItem('apiEndpoint') || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
export const setApiEndpoint = (endpoint: string) => safeLocalStorage.setItem('apiEndpoint', endpoint);

export const getPrompt = (): string => safeLocalStorage.getItem(PROMPT_KEY) || '';
export const setPrompt = (prompt: string) => safeLocalStorage.setItem(PROMPT_KEY, prompt);

export const getSystemPromptTemplate = (): string => safeLocalStorage.getItem(SYSTEM_PROMPT_KEY) || SYSTEM_PROMPT_TEMPLATE;
export const setSystemPromptTemplate = (systemPromptTemplate: string) => safeLocalStorage.setItem(SYSTEM_PROMPT_KEY, systemPromptTemplate);

export const getTabsState = (): string | null => safeLocalStorage.getItem(TABS_STORAGE_KEY);
export const setTabsState = (value: string): void => safeLocalStorage.setItem(TABS_STORAGE_KEY, value);

export const getLastSavedFileName = (): string | null => safeLocalStorage.getItem(LAST_SAVED_FILE_KEY);
export const setLastSavedFileName = (name: string): void => {
  const cleanedName = name.replace('.json', '');
  safeLocalStorage.setItem(LAST_SAVED_FILE_KEY, cleanedName);
};