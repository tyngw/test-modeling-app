// src/utils/storage/vscodeStorageHelpers.ts
'use client';

import {
  DEFAULT_FONT_FAMILY,
  ELEM_STYLE,
  DEFAULT_MARKER_TYPE,
  DEFAULT_CONNECTION_PATH_COLOR,
  DEFAULT_CONNECTION_PATH_STROKE,
  DEFAULT_CANVAS_BACKGROUND_COLOR,
  DEFAULT_TEXT_COLOR,
} from '../../config/elementSettings';
import { SYSTEM_PROMPT_TEMPLATE } from '../../config/systemPrompt';
import { VERSION } from '../../constants/version';
import { sanitizeText } from '../security/sanitization';
import { validateSettingValue } from '../security/validation';
import type { StyleSettings } from './localStorageHelpers';

// VSCode拡張機能用の設定ファイルのパス（現在は使用されていませんが、将来の拡張用に保持）
// const SETTINGS_FILE_NAME = 'app-settings.json';

// VSCode API関連のタイプ定義
interface VSCodeAPI {
  readSettingsFile: () => Promise<any>;
  writeSettingsFile: (data: any) => Promise<void>;
  getCurrentFileName: () => Promise<string | null>;
}

// 設定データの構造定義
interface AppSettings {
  version: string;
  styles: StyleSettings;
  prompt: string;
  systemPromptTemplate: string;
  apiKey: string;
  modelType: string;
  tabsState?: string;
}

// デフォルトの設定値
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

const DEFAULT_SETTINGS: AppSettings = {
  version: VERSION,
  styles: DEFAULT_STYLES,
  prompt: '',
  systemPromptTemplate: SYSTEM_PROMPT_TEMPLATE,
  apiKey: '',
  modelType: 'gemini-2.0-flash',
};

const MODEL_ENDPOINTS: { [key: string]: string } = {
  'gemini-2.0-flash':
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
  'gemini-2.5-flash':
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
};

/**
 * VSCode拡張機能のAPIを取得
 */
function getVSCodeAPI(): VSCodeAPI | null {
  if (typeof window !== 'undefined' && (window as any).vscodeAPI) {
    return (window as any).vscodeAPI;
  }
  return null;
}

/**
 * 設定ファイルを読み込み
 */
async function loadSettings(): Promise<AppSettings> {
  try {
    const vscodeAPI = getVSCodeAPI();
    if (!vscodeAPI) {
      console.log('VSCode APIが利用できません。デフォルト設定を使用します');
      return DEFAULT_SETTINGS;
    }

    const data = await vscodeAPI.readSettingsFile();

    // バージョンチェック
    if (data?.version !== VERSION) {
      console.log('設定ファイルのバージョンが古いため、デフォルト設定でリセットします');
      return DEFAULT_SETTINGS;
    }

    // データのマージとバリデーション
    const settings: AppSettings = {
      ...DEFAULT_SETTINGS,
      ...data,
      styles: { ...DEFAULT_STYLES, ...data.styles },
    };

    return settings;
  } catch (error) {
    console.log('設定ファイルの読み込みに失敗しました。デフォルト設定を使用します:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * 設定ファイルに保存
 */
async function saveSettings(settings: Partial<AppSettings>): Promise<void> {
  try {
    const vscodeAPI = getVSCodeAPI();
    if (!vscodeAPI) {
      throw new Error('VSCode API が利用できません');
    }

    const currentSettings = await loadSettings();
    const updatedSettings = {
      ...currentSettings,
      ...settings,
      version: VERSION, // 常に最新のバージョンを設定
    };

    await vscodeAPI.writeSettingsFile(updatedSettings);
  } catch (error) {
    console.error('設定ファイルの保存に失敗しました:', error);
    throw error;
  }
}

// スタイル設定の取得・保存
export async function getStyles(): Promise<StyleSettings> {
  const settings = await loadSettings();
  return settings.styles;
}

export async function setStyles(styles: Partial<StyleSettings>): Promise<void> {
  const currentSettings = await loadSettings();
  const updatedStyles = { ...currentSettings.styles, ...styles };
  await saveSettings({ styles: updatedStyles });
}

// 個別のスタイル設定関数群
export async function getElementColor(): Promise<string> {
  const styles = await getStyles();
  return styles.elementColor;
}

export async function setElementColor(color: string): Promise<void> {
  await setStyles({ elementColor: color });
}

export async function getStrokeColor(): Promise<string> {
  const styles = await getStyles();
  return styles.strokeColor;
}

export async function setStrokeColor(color: string): Promise<void> {
  await setStyles({ strokeColor: color });
}

export async function getStrokeWidth(): Promise<number> {
  const styles = await getStyles();
  return styles.strokeWidth;
}

export async function setStrokeWidth(width: number): Promise<void> {
  await setStyles({ strokeWidth: width });
}

export async function getFontFamily(): Promise<string> {
  const styles = await getStyles();
  return styles.fontFamily;
}

export async function setFontFamily(fontFamily: string): Promise<void> {
  await setStyles({ fontFamily: fontFamily });
}

export async function getMarkerType(): Promise<string> {
  const styles = await getStyles();
  return styles.markerType;
}

export async function setMarkerType(markerType: string): Promise<void> {
  await setStyles({ markerType: markerType });
}

export async function getConnectionPathColor(): Promise<string> {
  const styles = await getStyles();
  return styles.connectionPathColor;
}

export async function setConnectionPathColor(color: string): Promise<void> {
  await setStyles({ connectionPathColor: color });
}

export async function getConnectionPathStroke(): Promise<number> {
  const styles = await getStyles();
  return styles.connectionPathStroke;
}

export async function setConnectionPathStroke(stroke: number): Promise<void> {
  await setStyles({ connectionPathStroke: stroke });
}

export async function getCanvasBackgroundColor(): Promise<string> {
  const styles = await getStyles();
  return styles.canvasBackgroundColor;
}

export async function setCanvasBackgroundColor(color: string): Promise<void> {
  await setStyles({ canvasBackgroundColor: color });
}

export async function getTextColor(): Promise<string> {
  const styles = await getStyles();
  return styles.textColor;
}

export async function setTextColor(color: string): Promise<void> {
  await setStyles({ textColor: color });
}

export async function getSelectedStrokeColor(): Promise<string> {
  const styles = await getStyles();
  return styles.selectedStrokeColor;
}

export async function setSelectedStrokeColor(color: string): Promise<void> {
  await setStyles({ selectedStrokeColor: color });
}

// APIキー関連（VSCode拡張では暗号化せずにファイルに保存）
export async function getApiKey(): Promise<string> {
  const settings = await loadSettings();
  return settings.apiKey || '';
}

export async function setApiKey(value: string): Promise<void> {
  // セキュリティ: 値をサニタイズ
  const safeValue = validateSettingValue('apiKey', value) ? value : '';
  await saveSettings({ apiKey: safeValue });
}

// プロンプト関連
export async function getPrompt(): Promise<string> {
  const settings = await loadSettings();
  return settings.prompt || '';
}

export async function setPrompt(prompt: string): Promise<void> {
  const safePrompt = sanitizeText(prompt);
  await saveSettings({ prompt: safePrompt });
}

export async function getSystemPromptTemplate(): Promise<string> {
  const settings = await loadSettings();
  return settings.systemPromptTemplate || SYSTEM_PROMPT_TEMPLATE;
}

export async function setSystemPromptTemplate(value: string): Promise<void> {
  const safeValue = sanitizeText(value);
  await saveSettings({ systemPromptTemplate: safeValue });
}

// モデルタイプ関連
export async function getModelType(): Promise<string> {
  const settings = await loadSettings();
  const currentModel = settings.modelType || Object.keys(MODEL_ENDPOINTS)[0];

  // gemini-1.5-flashが設定されている場合はgemini-2.0-flashに自動移行
  if (currentModel === 'gemini-1.5-flash') {
    await setModelType('gemini-2.0-flash');
    return 'gemini-2.0-flash';
  }

  return currentModel;
}

export async function setModelType(value: string): Promise<void> {
  await saveSettings({ modelType: value });
}

// エンドポイント取得
export async function getApiEndpoint(): Promise<string> {
  const modelType = await getModelType();
  return MODEL_ENDPOINTS[modelType] || MODEL_ENDPOINTS['gemini-2.0-flash'];
}

// タブの状態関連
export async function getTabsState(): Promise<string | null> {
  const settings = await loadSettings();
  return settings.tabsState || null;
}

export async function setTabsState(value: string): Promise<void> {
  await saveSettings({ tabsState: value });
}

// 現在のファイル名を取得（VSCode拡張機能専用）
export async function getCurrentFileName(): Promise<string | null> {
  try {
    const vscodeAPI = getVSCodeAPI();
    if (!vscodeAPI) {
      console.error('VSCode APIが利用できません');
      return null;
    }
    return await vscodeAPI.getCurrentFileName();
  } catch (error) {
    console.error('ファイル名の取得に失敗しました:', error);
    return null;
  }
}
