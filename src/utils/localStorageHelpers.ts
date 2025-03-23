// src/utils/localStorageHelpers.ts
'use client';

import { 
  NUMBER_OF_SECTIONS, 
  DEFAULT_FONT_FAMILY, 
  ELEM_STYLE, 
  DEFAULT_MARKER_TYPE,
  DEFAULT_CONNECTION_PATH_COLOR,
  DEFAULT_CONNECTION_PATH_STROKE,
  DEFAULT_CANVAS_BACKGROUND_COLOR,
  DEFAULT_TEXT_COLOR,
} from '../constants/elementSettings';
import { SYSTEM_PROMPT_TEMPLATE } from '../constants/systemPrompt';
import { VERSION } from '../constants/version';

const ENCRYPTION_KEY = 'encryptionKey';
const TABS_STORAGE_KEY = 'tabsState';
export const VERSION_KEY = 'appVersion';
const PROMPT_KEY = 'prompt';
const SYSTEM_PROMPT_KEY = 'systemPromptTemplate';
const APIKEY_KEY = 'apiKey';
const MODEL_TYPE_KEY = 'modelType';
const CUT_ELEMENTS_KEY = 'cutElements';

const MODEL_ENDPOINTS: { [key: string]: string } = {
  'gemini-1.5-flash': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
  'gemini-2.0-flash': 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
};

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

// 汎用的な設定取得・保存関数
const getSetting = <T>(key: string, defaultValue: T): T => {
  const stored = safeLocalStorage.getItem(key);
  if (!stored) return defaultValue;
  
  if (typeof defaultValue === 'number') {
    const num = Number(stored);
    return (isNaN(num) ? defaultValue : num) as T;
  }
  return stored as T;
};

const setSetting = <T>(key: string, value: T): void => {
  if (value === undefined || value === null) return;
  safeLocalStorage.setItem(key, String(value));
};

// セクション数関連
export const getNumberOfSections = (): number => 
  getSetting('numberOfSections', NUMBER_OF_SECTIONS);

export const setNumberOfSections = (value: number): void => {
  const clampedValue = Math.max(1, Math.min(10, value));
  setSetting('numberOfSections', clampedValue);
};

// Element styling related
export const getElementColor = (): string => 
  getSetting('elementColor', ELEM_STYLE.NORMAL.COLOR);

export const setElementColor = (color: string): void => 
  setSetting('elementColor', color);

export const getStrokeColor = (): string => 
  getSetting('strokeColor', ELEM_STYLE.NORMAL.STROKE_COLOR);

export const setStrokeColor = (color: string): void => 
  setSetting('strokeColor', color);

export const getStrokeWidth = (): number => 
  getSetting('strokeWidth', ELEM_STYLE.STROKE_WIDTH);

export const setStrokeWidth = (width: number): void => 
  setSetting('strokeWidth', width);

export const getFontFamily = (): string => 
  getSetting('fontFamily', DEFAULT_FONT_FAMILY);

export const setFontFamily = (fontFamily: string): void => 
  setSetting('fontFamily', fontFamily);

export const getMarkerType = (): string => 
  getSetting('markerType', DEFAULT_MARKER_TYPE);

export const setMarkerType = (markerType: string): void => 
  setSetting('markerType', markerType);

export const getConnectionPathColor = (): string => 
  getSetting('connectionPathColor', DEFAULT_CONNECTION_PATH_COLOR);

export const setConnectionPathColor = (color: string): void => 
  setSetting('connectionPathColor', color);

export const getConnectionPathStroke = (): number => 
  getSetting('connectionPathStroke', DEFAULT_CONNECTION_PATH_STROKE);

export const setConnectionPathStroke = (stroke: number): void => 
  setSetting('connectionPathStroke', stroke);

export const getCanvasBackgroundColor = (): string => 
  getSetting('canvasBackgroundColor', DEFAULT_CANVAS_BACKGROUND_COLOR);

export const setCanvasBackgroundColor = (color: string): void => 
  setSetting('canvasBackgroundColor', color);

export const getTextColor = (): string => 
  getSetting('textColor', DEFAULT_TEXT_COLOR);

export const setTextColor = (color: string): void => 
  setSetting('textColor', color);

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

// プロンプト関連
export const getPrompt = (): string => 
  getSetting(PROMPT_KEY, '');

export const setPrompt = (prompt: string): void => 
  setSetting(PROMPT_KEY, prompt);

export const getSystemPromptTemplate = (): string => 
  getSetting(SYSTEM_PROMPT_KEY, SYSTEM_PROMPT_TEMPLATE);

export const setSystemPromptTemplate = (value: string): void => 
  setSetting(SYSTEM_PROMPT_KEY, value);

// モデルタイプ関連
export const getModelType = (): string => 
  getSetting(MODEL_TYPE_KEY, Object.keys(MODEL_ENDPOINTS)[0]);

export const setModelType = (value: string): void => 
  setSetting(MODEL_TYPE_KEY, value);

// エンドポイント取得
export const getApiEndpoint = (): string => {
  const modelType = getModelType();
  return MODEL_ENDPOINTS[modelType] || MODEL_ENDPOINTS['gemini-1.5-flash'];
};

// Cut Elements 関連
export const getCutElements = (): string | null => 
  safeLocalStorage.getItem(CUT_ELEMENTS_KEY);

export const setCutElements = (value: string): void => 
  safeLocalStorage.setItem(CUT_ELEMENTS_KEY, value);

// タブの状態関連
export const getTabsState = (): string | null => 
  safeLocalStorage.getItem(TABS_STORAGE_KEY);

export const setTabsState = (value: string): void => 
  safeLocalStorage.setItem(TABS_STORAGE_KEY, value);