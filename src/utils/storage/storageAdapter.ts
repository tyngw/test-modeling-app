// src/utils/storage/storageAdapter.ts
'use client';

import { isVSCodeExtension } from '../environment/environmentDetector';
import type { StyleSettings } from './localStorageHelpers';

// LocalStorage用のインポート
import * as localStorageHelpers from './localStorageHelpers';

// VSCode拡張用のインポート
import * as vscodeStorageHelpers from './vscodeStorageHelpers';

/**
 * ストレージ操作の統一インターフェース
 */
export interface StorageAdapter {
  // スタイル設定
  getStyles(): Promise<StyleSettings> | StyleSettings;
  setStyles(styles: Partial<StyleSettings>): Promise<void> | void;

  getElementColor(): Promise<string> | string;
  setElementColor(color: string): Promise<void> | void;

  getStrokeColor(): Promise<string> | string;
  setStrokeColor(color: string): Promise<void> | void;

  getStrokeWidth(): Promise<number> | number;
  setStrokeWidth(width: number): Promise<void> | void;

  getFontFamily(): Promise<string> | string;
  setFontFamily(fontFamily: string): Promise<void> | void;

  getMarkerType(): Promise<string> | string;
  setMarkerType(markerType: string): Promise<void> | void;

  getConnectionPathColor(): Promise<string> | string;
  setConnectionPathColor(color: string): Promise<void> | void;

  getConnectionPathStroke(): Promise<number> | number;
  setConnectionPathStroke(stroke: number): Promise<void> | void;

  getCanvasBackgroundColor(): Promise<string> | string;
  setCanvasBackgroundColor(color: string): Promise<void> | void;

  getTextColor(): Promise<string> | string;
  setTextColor(color: string): Promise<void> | void;

  getSelectedStrokeColor(): Promise<string> | string;
  setSelectedStrokeColor(color: string): Promise<void> | void;

  // APIキー関連
  getApiKey(): Promise<string>;
  setApiKey(value: string): Promise<void>;

  // プロンプト関連
  getPrompt(): Promise<string> | string;
  setPrompt(prompt: string): Promise<void> | void;

  getSystemPromptTemplate(): Promise<string> | string;
  setSystemPromptTemplate(value: string): Promise<void> | void;

  // モデルタイプ関連
  getModelType(): Promise<string> | string;
  setModelType(value: string): Promise<void> | void;

  getApiEndpoint(): Promise<string> | string;

  // タブの状態関連
  getTabsState(): Promise<string | null> | string | null;
  setTabsState(value: string): Promise<void> | void;

  // VSCode専用機能
  getCurrentFileName?(): Promise<string | null>;
}

/**
 * LocalStorage用のストレージアダプター
 */
class LocalStorageAdapter implements StorageAdapter {
  getStyles(): StyleSettings {
    return localStorageHelpers.getStyles();
  }

  setStyles(styles: Partial<StyleSettings>): void {
    localStorageHelpers.setStyles(styles);
  }

  getElementColor(): string {
    return localStorageHelpers.getElementColor();
  }

  setElementColor(color: string): void {
    localStorageHelpers.setElementColor(color);
  }

  getStrokeColor(): string {
    return localStorageHelpers.getStrokeColor();
  }

  setStrokeColor(color: string): void {
    localStorageHelpers.setStrokeColor(color);
  }

  getStrokeWidth(): number {
    return localStorageHelpers.getStrokeWidth();
  }

  setStrokeWidth(width: number): void {
    localStorageHelpers.setStrokeWidth(width);
  }

  getFontFamily(): string {
    return localStorageHelpers.getFontFamily();
  }

  setFontFamily(fontFamily: string): void {
    localStorageHelpers.setFontFamily(fontFamily);
  }

  getMarkerType(): string {
    return localStorageHelpers.getMarkerType();
  }

  setMarkerType(markerType: string): void {
    localStorageHelpers.setMarkerType(markerType);
  }

  getConnectionPathColor(): string {
    return localStorageHelpers.getConnectionPathColor();
  }

  setConnectionPathColor(color: string): void {
    localStorageHelpers.setConnectionPathColor(color);
  }

  getConnectionPathStroke(): number {
    return localStorageHelpers.getConnectionPathStroke();
  }

  setConnectionPathStroke(stroke: number): void {
    localStorageHelpers.setConnectionPathStroke(stroke);
  }

  getCanvasBackgroundColor(): string {
    return localStorageHelpers.getCanvasBackgroundColor();
  }

  setCanvasBackgroundColor(color: string): void {
    localStorageHelpers.setCanvasBackgroundColor(color);
  }

  getTextColor(): string {
    return localStorageHelpers.getTextColor();
  }

  setTextColor(color: string): void {
    localStorageHelpers.setTextColor(color);
  }

  getSelectedStrokeColor(): string {
    return localStorageHelpers.getSelectedStrokeColor();
  }

  setSelectedStrokeColor(color: string): void {
    localStorageHelpers.setSelectedStrokeColor(color);
  }

  async getApiKey(): Promise<string> {
    return await localStorageHelpers.getApiKey();
  }

  async setApiKey(value: string): Promise<void> {
    await localStorageHelpers.setApiKey(value);
  }

  getPrompt(): string {
    return localStorageHelpers.getPrompt();
  }

  setPrompt(prompt: string): void {
    localStorageHelpers.setPrompt(prompt);
  }

  getSystemPromptTemplate(): string {
    return localStorageHelpers.getSystemPromptTemplate();
  }

  setSystemPromptTemplate(value: string): void {
    localStorageHelpers.setSystemPromptTemplate(value);
  }

  getModelType(): string {
    return localStorageHelpers.getModelType();
  }

  setModelType(value: string): void {
    localStorageHelpers.setModelType(value);
  }

  getApiEndpoint(): string {
    return localStorageHelpers.getApiEndpoint();
  }

  getTabsState(): string | null {
    return localStorageHelpers.getTabsState();
  }

  setTabsState(value: string): void {
    localStorageHelpers.setTabsState(value);
  }
}

/**
 * VSCode拡張用のストレージアダプター
 */
class VSCodeStorageAdapter implements StorageAdapter {
  async getStyles(): Promise<StyleSettings> {
    return await vscodeStorageHelpers.getStyles();
  }

  async setStyles(styles: Partial<StyleSettings>): Promise<void> {
    await vscodeStorageHelpers.setStyles(styles);
  }

  async getElementColor(): Promise<string> {
    return await vscodeStorageHelpers.getElementColor();
  }

  async setElementColor(color: string): Promise<void> {
    await vscodeStorageHelpers.setElementColor(color);
  }

  async getStrokeColor(): Promise<string> {
    return await vscodeStorageHelpers.getStrokeColor();
  }

  async setStrokeColor(color: string): Promise<void> {
    await vscodeStorageHelpers.setStrokeColor(color);
  }

  async getStrokeWidth(): Promise<number> {
    return await vscodeStorageHelpers.getStrokeWidth();
  }

  async setStrokeWidth(width: number): Promise<void> {
    await vscodeStorageHelpers.setStrokeWidth(width);
  }

  async getFontFamily(): Promise<string> {
    return await vscodeStorageHelpers.getFontFamily();
  }

  async setFontFamily(fontFamily: string): Promise<void> {
    await vscodeStorageHelpers.setFontFamily(fontFamily);
  }

  async getMarkerType(): Promise<string> {
    return await vscodeStorageHelpers.getMarkerType();
  }

  async setMarkerType(markerType: string): Promise<void> {
    await vscodeStorageHelpers.setMarkerType(markerType);
  }

  async getConnectionPathColor(): Promise<string> {
    return await vscodeStorageHelpers.getConnectionPathColor();
  }

  async setConnectionPathColor(color: string): Promise<void> {
    await vscodeStorageHelpers.setConnectionPathColor(color);
  }

  async getConnectionPathStroke(): Promise<number> {
    return await vscodeStorageHelpers.getConnectionPathStroke();
  }

  async setConnectionPathStroke(stroke: number): Promise<void> {
    await vscodeStorageHelpers.setConnectionPathStroke(stroke);
  }

  async getCanvasBackgroundColor(): Promise<string> {
    return await vscodeStorageHelpers.getCanvasBackgroundColor();
  }

  async setCanvasBackgroundColor(color: string): Promise<void> {
    await vscodeStorageHelpers.setCanvasBackgroundColor(color);
  }

  async getTextColor(): Promise<string> {
    return await vscodeStorageHelpers.getTextColor();
  }

  async setTextColor(color: string): Promise<void> {
    await vscodeStorageHelpers.setTextColor(color);
  }

  async getSelectedStrokeColor(): Promise<string> {
    return await vscodeStorageHelpers.getSelectedStrokeColor();
  }

  async setSelectedStrokeColor(color: string): Promise<void> {
    await vscodeStorageHelpers.setSelectedStrokeColor(color);
  }

  async getApiKey(): Promise<string> {
    return await vscodeStorageHelpers.getApiKey();
  }

  async setApiKey(value: string): Promise<void> {
    await vscodeStorageHelpers.setApiKey(value);
  }

  async getPrompt(): Promise<string> {
    return await vscodeStorageHelpers.getPrompt();
  }

  async setPrompt(prompt: string): Promise<void> {
    await vscodeStorageHelpers.setPrompt(prompt);
  }

  async getSystemPromptTemplate(): Promise<string> {
    return await vscodeStorageHelpers.getSystemPromptTemplate();
  }

  async setSystemPromptTemplate(value: string): Promise<void> {
    await vscodeStorageHelpers.setSystemPromptTemplate(value);
  }

  async getModelType(): Promise<string> {
    return await vscodeStorageHelpers.getModelType();
  }

  async setModelType(value: string): Promise<void> {
    await vscodeStorageHelpers.setModelType(value);
  }

  async getApiEndpoint(): Promise<string> {
    return await vscodeStorageHelpers.getApiEndpoint();
  }

  async getTabsState(): Promise<string | null> {
    return await vscodeStorageHelpers.getTabsState();
  }

  async setTabsState(value: string): Promise<void> {
    await vscodeStorageHelpers.setTabsState(value);
  }

  async getCurrentFileName(): Promise<string | null> {
    return await vscodeStorageHelpers.getCurrentFileName();
  }
}

/**
 * 環境に応じたストレージアダプターのインスタンスを作成
 */
export function createStorageAdapter(): StorageAdapter {
  if (isVSCodeExtension()) {
    return new VSCodeStorageAdapter();
  } else {
    return new LocalStorageAdapter();
  }
}

/**
 * グローバルなストレージアダプターインスタンス
 */
export const storageAdapter = createStorageAdapter();
