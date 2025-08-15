// src/utils/storage/vscodeStorageHelpers.ts
'use client';

// src/utils/storage/vscodeStorageHelpers.ts
'use client';

// VSCode拡張機能でもLocalStorageを使用するように変更
// 全ての設定関連機能をLocalStorageベースに統一

import * as localStorageHelpers from './localStorageHelpers';
import type { StyleSettings } from './localStorageHelpers';

// VSCode拡張機能用のストレージヘルパー
// LocalStorageベースの実装を再利用してAPIを統一

// スタイル設定の取得・保存
export async function getStyles(): Promise<StyleSettings> {
  return localStorageHelpers.getStyles();
}

export async function setStyles(styles: Partial<StyleSettings>): Promise<void> {
  localStorageHelpers.setStyles(styles);
}

// 個別のスタイル設定関数群
export async function getElementColor(): Promise<string> {
  return localStorageHelpers.getElementColor();
}

export async function setElementColor(color: string): Promise<void> {
  localStorageHelpers.setElementColor(color);
}

export async function getStrokeColor(): Promise<string> {
  return localStorageHelpers.getStrokeColor();
}

export async function setStrokeColor(color: string): Promise<void> {
  localStorageHelpers.setStrokeColor(color);
}

export async function getStrokeWidth(): Promise<number> {
  return localStorageHelpers.getStrokeWidth();
}

export async function setStrokeWidth(width: number): Promise<void> {
  localStorageHelpers.setStrokeWidth(width);
}

export async function getFontFamily(): Promise<string> {
  return localStorageHelpers.getFontFamily();
}

export async function setFontFamily(fontFamily: string): Promise<void> {
  localStorageHelpers.setFontFamily(fontFamily);
}

export async function getMarkerType(): Promise<string> {
  return localStorageHelpers.getMarkerType();
}

export async function setMarkerType(markerType: string): Promise<void> {
  localStorageHelpers.setMarkerType(markerType);
}

export async function getConnectionPathColor(): Promise<string> {
  return localStorageHelpers.getConnectionPathColor();
}

export async function setConnectionPathColor(color: string): Promise<void> {
  localStorageHelpers.setConnectionPathColor(color);
}

export async function getConnectionPathStroke(): Promise<number> {
  return localStorageHelpers.getConnectionPathStroke();
}

export async function setConnectionPathStroke(stroke: number): Promise<void> {
  localStorageHelpers.setConnectionPathStroke(stroke);
}

export async function getCanvasBackgroundColor(): Promise<string> {
  return localStorageHelpers.getCanvasBackgroundColor();
}

export async function setCanvasBackgroundColor(color: string): Promise<void> {
  localStorageHelpers.setCanvasBackgroundColor(color);
}

export async function getTextColor(): Promise<string> {
  return localStorageHelpers.getTextColor();
}

export async function setTextColor(color: string): Promise<void> {
  localStorageHelpers.setTextColor(color);
}

export async function getSelectedStrokeColor(): Promise<string> {
  return localStorageHelpers.getSelectedStrokeColor();
}

export async function setSelectedStrokeColor(color: string): Promise<void> {
  localStorageHelpers.setSelectedStrokeColor(color);
}

// APIキー関連（LocalStorageの暗号化機能を使用）
export async function getApiKey(): Promise<string> {
  return await localStorageHelpers.getApiKey();
}

export async function setApiKey(value: string): Promise<void> {
  await localStorageHelpers.setApiKey(value);
}

// プロンプト関連
export async function getPrompt(): Promise<string> {
  return localStorageHelpers.getPrompt();
}

export async function setPrompt(prompt: string): Promise<void> {
  localStorageHelpers.setPrompt(prompt);
}

export async function getSystemPromptTemplate(): Promise<string> {
  return localStorageHelpers.getSystemPromptTemplate();
}

export async function setSystemPromptTemplate(value: string): Promise<void> {
  localStorageHelpers.setSystemPromptTemplate(value);
}

// モデルタイプ関連
export async function getModelType(): Promise<string> {
  return localStorageHelpers.getModelType();
}

export async function setModelType(value: string): Promise<void> {
  localStorageHelpers.setModelType(value);
}

// エンドポイント取得
export async function getApiEndpoint(): Promise<string> {
  return localStorageHelpers.getApiEndpoint();
}

// タブの状態関連
export async function getTabsState(): Promise<string | null> {
  return localStorageHelpers.getTabsState();
}

export async function setTabsState(value: string): Promise<void> {
  localStorageHelpers.setTabsState(value);
}

// 現在のファイル名を取得（VSCode拡張機能専用）
export async function getCurrentFileName(): Promise<string | null> {
  try {
    // VSCode拡張機能のAPIを通じてファイル名を取得
    const vscodeFileAPI = (
      window as typeof window & {
        vscodeFileAPI?: {
          getCurrentFileName?: () => Promise<string | null>;
        };
      }
    ).vscodeFileAPI;

    if (vscodeFileAPI?.getCurrentFileName) {
      return await vscodeFileAPI.getCurrentFileName();
    }

    return null;
  } catch (error) {
    console.error('ファイル名の取得に失敗しました:', error);
    return null;
  }
}
