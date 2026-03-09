// src/utils/storage/localStorageHelpers.ts
'use client';

import CryptoJS from 'crypto-js';
import {
  DEFAULT_FONT_FAMILY,
  ELEM_STYLE,
  DEFAULT_MARKER_TYPE,
  DEFAULT_CONNECTION_PATH_COLOR,
  DEFAULT_CONNECTION_PATH_STROKE,
  DEFAULT_CANVAS_BACKGROUND_COLOR,
  DEFAULT_TEXT_COLOR,
} from '../../config/elementSettings';
import {
  PromptTemplates,
  getDefaultPromptTemplates,
  parsePromptTemplatesJson,
  stringifyPromptTemplates,
} from '../../config/promptTemplates';
import { VERSION } from '../../constants/version';
import { sanitizeText } from '../security/sanitization';
import { validateSettingValue } from '../security/validation';
import { debugLog } from '../debugLogHelpers';

// Style settings interface to define structure of the "styles" key
export interface StyleSettings {
  canvasBackgroundColor: string;
  connectionPathColor: string;
  elementColor: string;
  fontFamily: string;
  markerType: string;
  strokeColor: string;
  strokeWidth: number;
  textColor: string;
  connectionPathStroke: number;
  selectedStrokeColor: string;
}

// Default style settings
const DEFAULT_STYLES: StyleSettings = {
  canvasBackgroundColor: DEFAULT_CANVAS_BACKGROUND_COLOR,
  connectionPathColor: DEFAULT_CONNECTION_PATH_COLOR,
  elementColor: ELEM_STYLE.NORMAL.COLOR,
  fontFamily: DEFAULT_FONT_FAMILY,
  markerType: DEFAULT_MARKER_TYPE,
  strokeColor: ELEM_STYLE.NORMAL.STROKE_COLOR,
  strokeWidth: ELEM_STYLE.STROKE_WIDTH,
  textColor: DEFAULT_TEXT_COLOR,
  connectionPathStroke: DEFAULT_CONNECTION_PATH_STROKE,
  selectedStrokeColor: ELEM_STYLE.SELECTED.STROKE_COLOR,
};

const STYLES_KEY = 'styles';
const TABS_STORAGE_KEY = 'tabsState';
export const VERSION_KEY = 'appVersion';
const PROMPT_KEY = 'prompt';
const SYSTEM_PROMPT_KEY = 'systemPromptTemplate';
const PROMPT_TEMPLATES_KEY = 'promptTemplates';
const APIKEY_KEY = 'apiKey';
const MODEL_TYPE_KEY = 'modelType';
const API_PROVIDER_KEY = 'apiProvider';
const API_ENDPOINT_CUSTOM_KEY = 'apiEndpointCustom';

// API provider type
export type ApiProvider = 'gemini' | 'openai';

// Preset endpoints for each provider and model
const GEMINI_ENDPOINTS: { [key: string]: string } = {
  'gemini-2.0-flash':
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  'gemini-2.5-flash':
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
};

// For backward compatibility
const MODEL_ENDPOINTS: { [key: string]: string } = GEMINI_ENDPOINTS;

// 暗号化キー（実際の本番環境ではより安全な方法を使用）
const ENCRYPTION_KEY = 'test-modeling-app-key-2024';

export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const value = localStorage.getItem(key);
      if (value === null) return null;

      // 取得したデータの基本的な安全性チェック
      if (value.length > 1024 * 1024) {
        // 1MB制限
        debugLog(`LocalStorage値が大きすぎます: ${key}`);
        return null;
      }

      return value;
    } catch (e) {
      debugLog('localStorage access failed:', e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;

    // キーの検証
    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      debugLog('無効なlocalStorageキー:', key);
      return;
    }

    // 値の検証とサニタイズ
    if (typeof value !== 'string') {
      debugLog('localStorageの値は文字列である必要があります');
      return;
    }

    // サイズ制限チェック（1MB）
    if (value.length > 1024 * 1024) {
      debugLog('localStorageの値が大きすぎます');
      return;
    }

    try {
      localStorage.setItem(key, value);
    } catch (e) {
      debugLog('localStorage access failed:', e);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(key);
    } catch (e) {
      debugLog('localStorage access failed:', e);
    }
  },
};

// バージョンチェックと初期化
const checkAndUpdateVersion = () => {
  if (typeof window === 'undefined') return;
  const storedVersion = safeLocalStorage.getItem(VERSION_KEY);
  if (storedVersion !== VERSION) {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (
        key !== TABS_STORAGE_KEY &&
        key !== APIKEY_KEY &&
        key !== PROMPT_KEY &&
        key !== SYSTEM_PROMPT_KEY &&
        key !== PROMPT_TEMPLATES_KEY
      ) {
        safeLocalStorage.removeItem(key);
      }
    });
    safeLocalStorage.setItem(VERSION_KEY, VERSION);
  }
  // 非推奨のnumberOfSectionsキーを削除
  safeLocalStorage.removeItem('numberOfSections');
};

checkAndUpdateVersion();

// 汎用的な設定取得・保存関数
const getSetting = <T>(key: string, defaultValue: T): T => {
  const stored = safeLocalStorage.getItem(key);
  if (!stored) return defaultValue;

  // 取得したデータのサニタイゼーション
  if (typeof defaultValue === 'string') {
    return sanitizeText(stored) as T;
  }

  if (typeof defaultValue === 'number') {
    const num = Number(stored);
    return (isNaN(num) ? defaultValue : num) as T;
  }

  return stored as T;
};

const setSetting = <T extends Record<string, unknown> | string | number | boolean>(
  key: string,
  value: T,
): void => {
  if (value === undefined || value === null) return;

  // APIキーの場合は専用の暗号化ストレージを使用
  if (key === APIKEY_KEY) {
    setApiKey(String(value));
    return;
  }

  // 設定値の検証
  if (!validateSettingValue(key, value)) {
    debugLog(`設定値が無効です: ${key} = ${value}`);
    return;
  }

  // 文字列の場合はサニタイズ
  let safeValue = value;
  if (typeof value === 'string') {
    safeValue = sanitizeText(value) as unknown as T;
  }

  safeLocalStorage.setItem(key, String(safeValue));
};

// Get all style settings
export const getStyles = (): StyleSettings => {
  const storedStyles = safeLocalStorage.getItem(STYLES_KEY);
  if (!storedStyles) {
    // Migrate old settings to new format if they exist
    const migratedStyles = migrateLegacyStyles();

    // Force save the default styles to localStorage on first load
    // This ensures all properties including selectedStrokeColor are properly initialized
    if (!migratedStyles.selectedStrokeColor) {
      migratedStyles.selectedStrokeColor = ELEM_STYLE.SELECTED.STROKE_COLOR;
      safeLocalStorage.setItem(STYLES_KEY, JSON.stringify(migratedStyles));
    }

    return migratedStyles;
  }

  try {
    const parsedStyles = JSON.parse(storedStyles);
    // Ensure selectedStrokeColor is set if missing in stored settings
    if (!parsedStyles.selectedStrokeColor) {
      parsedStyles.selectedStrokeColor = ELEM_STYLE.SELECTED.STROKE_COLOR;
      safeLocalStorage.setItem(STYLES_KEY, JSON.stringify(parsedStyles));
    }
    return { ...DEFAULT_STYLES, ...parsedStyles };
  } catch (e) {
    debugLog('Failed to parse styles:', e);
    return DEFAULT_STYLES;
  }
};

// Set all style settings
export const setStyles = (styles: Partial<StyleSettings>): void => {
  const currentStyles = getStyles();
  const newStyles = { ...currentStyles, ...styles };
  safeLocalStorage.setItem(STYLES_KEY, JSON.stringify(newStyles));
};

// Migrate legacy style settings to the new format
const migrateLegacyStyles = (): StyleSettings => {
  const migrated: StyleSettings = { ...DEFAULT_STYLES };

  // Get old individual settings if they exist
  const keys: (keyof StyleSettings)[] = [
    'canvasBackgroundColor',
    'connectionPathColor',
    'elementColor',
    'fontFamily',
    'markerType',
    'strokeColor',
    'strokeWidth',
    'textColor',
    'connectionPathStroke',
    'selectedStrokeColor',
  ];

  let hasLegacySettings = false;

  keys.forEach((key) => {
    const oldValue = safeLocalStorage.getItem(key);
    if (oldValue !== null) {
      hasLegacySettings = true;
      if (key === 'strokeWidth' || key === 'connectionPathStroke') {
        migrated[key] = parseFloat(oldValue);
      } else {
        // 型安全に値を設定
        migrated[key] = oldValue as StyleSettings[typeof key];
      }

      // Remove old individual settings
      safeLocalStorage.removeItem(key);
    }
  });

  // Save migrated settings if any legacy settings were found
  if (hasLegacySettings) {
    safeLocalStorage.setItem(STYLES_KEY, JSON.stringify(migrated));
  }

  return migrated;
};

// Element styling related - updated to use styles object
export const getElementColor = (): string => getStyles().elementColor;

export const setElementColor = (color: string): void => setStyles({ elementColor: color });

export const getStrokeColor = (): string => getStyles().strokeColor;

export const setStrokeColor = (color: string): void => setStyles({ strokeColor: color });

export const getStrokeWidth = (): number => getStyles().strokeWidth;

export const setStrokeWidth = (width: number): void => setStyles({ strokeWidth: width });

export const getFontFamily = (): string => getStyles().fontFamily;

export const setFontFamily = (fontFamily: string): void => setStyles({ fontFamily: fontFamily });

export const getMarkerType = (): string => getStyles().markerType;

export const setMarkerType = (markerType: string): void => setStyles({ markerType: markerType });

export const getConnectionPathColor = (): string => getStyles().connectionPathColor;

export const setConnectionPathColor = (color: string): void =>
  setStyles({ connectionPathColor: color });

export const getConnectionPathStroke = (): number => getStyles().connectionPathStroke;

export const setConnectionPathStroke = (stroke: number): void =>
  setStyles({ connectionPathStroke: stroke });

export const getCanvasBackgroundColor = (): string => getStyles().canvasBackgroundColor;

export const setCanvasBackgroundColor = (color: string): void =>
  setStyles({ canvasBackgroundColor: color });

export const getTextColor = (): string => getStyles().textColor;

export const setTextColor = (color: string): void => setStyles({ textColor: color });

// Selected stroke color functions
export const getSelectedStrokeColor = (): string => getStyles().selectedStrokeColor;

export const setSelectedStrokeColor = (color: string): void =>
  setStyles({ selectedStrokeColor: color });

// APIキー関連
export const getApiKey = (): string => {
  try {
    const stored = safeLocalStorage.getItem(APIKEY_KEY);
    if (!stored) return '';
    const bytes = CryptoJS.AES.decrypt(stored, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    debugLog('API key decryption failed:', e);
    return '';
  }
};

export const setApiKey = (value: string): void => {
  try {
    const encrypted = CryptoJS.AES.encrypt(value, ENCRYPTION_KEY).toString();
    safeLocalStorage.setItem(APIKEY_KEY, encrypted);
  } catch (e) {
    debugLog('API key encryption failed:', e);
  }
};

// プロンプト関連
export const getPrompt = (): string => getSetting(PROMPT_KEY, '');

export const setPrompt = (prompt: string): void => setSetting(PROMPT_KEY, prompt);

function readLegacyCustomSystemPrompt(): string {
  return getSetting(SYSTEM_PROMPT_KEY, '');
}

export const getPromptTemplates = (): PromptTemplates => {
  const storedPromptTemplates = safeLocalStorage.getItem(PROMPT_TEMPLATES_KEY);
  const legacyCustomSystemPrompt = readLegacyCustomSystemPrompt();

  if (!storedPromptTemplates) {
    const migratedPromptTemplates = getDefaultPromptTemplates();
    if (legacyCustomSystemPrompt.trim().length > 0)
      migratedPromptTemplates.system.customSystemPrompt = legacyCustomSystemPrompt;

    safeLocalStorage.setItem(
      PROMPT_TEMPLATES_KEY,
      stringifyPromptTemplates(migratedPromptTemplates),
    );
    return migratedPromptTemplates;
  }

  try {
    return parsePromptTemplatesJson(storedPromptTemplates, {
      legacyCustomSystemPrompt,
    });
  } catch (error) {
    debugLog('promptTemplates parse failed:', error);
    const fallbackPromptTemplates = getDefaultPromptTemplates();
    if (legacyCustomSystemPrompt.trim().length > 0)
      fallbackPromptTemplates.system.customSystemPrompt = legacyCustomSystemPrompt;

    safeLocalStorage.setItem(
      PROMPT_TEMPLATES_KEY,
      stringifyPromptTemplates(fallbackPromptTemplates),
    );
    return fallbackPromptTemplates;
  }
};

export const getPromptTemplatesJson = (): string => stringifyPromptTemplates(getPromptTemplates());

export const setPromptTemplatesJson = (value: string): void => {
  const normalizedPromptTemplates = parsePromptTemplatesJson(value, {
    legacyCustomSystemPrompt: readLegacyCustomSystemPrompt(),
  });

  setSetting(PROMPT_TEMPLATES_KEY, stringifyPromptTemplates(normalizedPromptTemplates));
};

export const getSystemPromptTemplate = (): string => getPromptTemplates().system.customSystemPrompt;

export const setSystemPromptTemplate = (value: string): void =>
  setPromptTemplatesJson(
    stringifyPromptTemplates({
      ...getPromptTemplates(),
      system: {
        ...getPromptTemplates().system,
        customSystemPrompt: value,
      },
    }),
  );

/**
 * 編集可能なシステムプロンプトのキーを取得
 */
export const getSystemPromptKeys = (): (keyof PromptTemplates['system'])[] => [
  'agentElementGeneration',
  'agentFullHierarchyGeneration',
  'agentChat',
  'fullHierarchyOutputAppendix',
];

/**
 * 指定されたキーのシステムプロンプトを取得
 */
export const getSystemPromptByKey = (key: keyof PromptTemplates['system']): string => {
  const promptTemplates = getPromptTemplates();

  if (key === 'chatAssistant') {
    return promptTemplates.system.agentChat || '';
  }

  return promptTemplates.system[key] || '';
};

/**
 * 指定されたキーのシステムプロンプトを設定
 */
export const setSystemPromptByKey = (key: keyof PromptTemplates['system'], value: string): void => {
  const promptTemplates = getPromptTemplates();
  const normalizedKey = key === 'chatAssistant' ? 'agentChat' : key;

  setPromptTemplatesJson(
    stringifyPromptTemplates({
      ...promptTemplates,
      system: {
        ...promptTemplates.system,
        [normalizedKey]: value,
        chatAssistant: normalizedKey === 'agentChat' ? value : promptTemplates.system.chatAssistant,
      },
    }),
  );
};

// API provider関連
export const getApiProvider = (): ApiProvider => {
  const stored = getSetting(API_PROVIDER_KEY, 'gemini') as unknown;
  // APIプロバイダーの値を検証して型安全にする
  if (stored === 'openai') {
    return 'openai';
  }
  return 'gemini'; // デフォルトはGemini
};

export const setApiProvider = (provider: ApiProvider): void => {
  setSetting(API_PROVIDER_KEY, provider);
};

// エンドポイント取得（カスタムエンドポイント対応）
export const getApiEndpoint = (): string => {
  // カスタムエンドポイントが設定されている場合はそれを使用
  const customEndpoint = safeLocalStorage.getItem(API_ENDPOINT_CUSTOM_KEY);
  if (customEndpoint && customEndpoint.trim().length > 0) {
    return customEndpoint;
  }

  // プリセットエンドポイントを取得
  return getPresetApiEndpoint();
};

// プリセットエンドポイント取得（プロバイダーとモデルに基づく）
export const getPresetApiEndpoint = (): string => {
  const provider = getApiProvider();
  const modelType = getModelType();

  if (provider === 'openai') {
    // OpenAI互換API: モデル名に関わらず固定エンドポイント
    return 'https://api.openai.com/v1/chat/completions';
  }

  // Gemini API: モデル名を含めたエンドポイント
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelType}:generateContent`;
};

// カスタムエンドポイント操作
export const getCustomApiEndpoint = (): string => {
  const custom = safeLocalStorage.getItem(API_ENDPOINT_CUSTOM_KEY);
  return custom || '';
};

export const setCustomApiEndpoint = (endpoint: string): void => {
  if (endpoint && endpoint.trim().length > 0) {
    const trimmedEndpoint = endpoint.trim();
    // URLの基本的な検証
    try {
      new URL(trimmedEndpoint);
      safeLocalStorage.setItem(API_ENDPOINT_CUSTOM_KEY, trimmedEndpoint);
      debugLog('[CustomEndpoint] Set:', trimmedEndpoint);
    } catch {
      debugLog('Invalid URL format for custom endpoint:', trimmedEndpoint);
    }
  } else {
    // 空の場合はカスタムエンドポイントをクリア
    safeLocalStorage.removeItem(API_ENDPOINT_CUSTOM_KEY);
  }
};

// モデルタイプ関連
export const getModelType = (): string => {
  const currentModel = getSetting(MODEL_TYPE_KEY, Object.keys(MODEL_ENDPOINTS)[0]);

  // gemini-1.5-flashが設定されている場合はgemini-2.0-flashに自動移行
  if (currentModel === 'gemini-1.5-flash') {
    setModelType('gemini-2.0-flash');
    return 'gemini-2.0-flash';
  }

  return currentModel;
};

export const setModelType = (value: string): void => setSetting(MODEL_TYPE_KEY, value);

// タブの状態関連
export const getTabsState = (): string | null => safeLocalStorage.getItem(TABS_STORAGE_KEY);

export const setTabsState = (value: string): void =>
  safeLocalStorage.setItem(TABS_STORAGE_KEY, value);

// インデント設定関連
const INDENT_SPACES_KEY = 'indentSpacesPerLevel';

export const getIndentSpacesPerLevel = (): number => {
  const stored = getSetting(INDENT_SPACES_KEY, '4');
  const value = parseInt(stored, 10);
  return value === 2 || value === 4 ? value : 4; // デフォルトは4
};

export const setIndentSpacesPerLevel = (value: number): void => {
  if (value === 2 || value === 4) {
    setSetting(INDENT_SPACES_KEY, value.toString());
  }
};
