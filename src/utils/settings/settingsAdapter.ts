// src/utils/settings/settingsAdapter.ts

import { isVSCodeExtension } from '../environment/environmentDetector';
import {
  getStyles as getWebStyles,
  setStyles as setWebStyles,
  StyleSettings,
} from '../storage/localStorageHelpers';

/**
 * 設定操作の抽象化インターフェース
 */
export interface SettingsAdapter {
  getStyles: () => Promise<StyleSettings>;
  setStyles: (styles: Partial<StyleSettings>) => Promise<void>;
  getSetting: <T>(key: string, defaultValue: T) => Promise<T>;
  setSetting: <T>(key: string, value: T) => Promise<void>;
}

/**
 * ブラウザ環境での設定操作実装
 */
class BrowserSettingsAdapter implements SettingsAdapter {
  async getStyles(): Promise<StyleSettings> {
    return getWebStyles();
  }

  async setStyles(styles: Partial<StyleSettings>): Promise<void> {
    setWebStyles(styles);
  }

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    const value = localStorage.getItem(key);
    if (value === null) {
      return defaultValue;
    }
    try {
      return JSON.parse(value);
    } catch {
      return value as unknown as T;
    }
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

/**
 * VSCode拡張環境での設定操作実装
 */
class VSCodeSettingsAdapter implements SettingsAdapter {
  private vscodeConfig: any = null;

  private getVSCodeAPI(): any {
    if (typeof window !== 'undefined' && (window as any).vscodeFileAPI) {
      return (window as any).vscodeFileAPI;
    }
    throw new Error('VSCode API が利用できません');
  }

  private async loadConfig(): Promise<void> {
    if (this.vscodeConfig !== null) {
      return;
    }

    return new Promise((resolve) => {
      const vscodeAPI = this.getVSCodeAPI();

      // 設定読み込み完了時のコールバックを設定
      (window as any).handleConfigLoaded = (config: any) => {
        this.vscodeConfig = config;
        resolve();
      };

      // VSCode拡張の設定取得APIを呼び出し
      vscodeAPI.getConfig();
    });
  }

  async getStyles(): Promise<StyleSettings> {
    await this.loadConfig();

    // VSCodeの設定から対応する値を取得
    const styles: StyleSettings = {
      canvasBackgroundColor: this.vscodeConfig?.canvasBackgroundColor || '#ffffff',
      elementColor: this.vscodeConfig?.elementColor || '#000000',
      connectionPathColor: '#666666',
      fontFamily: 'Arial, sans-serif',
      markerType: 'arrow',
      strokeColor: '#000000',
      strokeWidth: 2,
      textColor: '#000000',
      connectionPathStroke: 2,
      selectedStrokeColor: '#0066cc',
    };

    return styles;
  }

  async setStyles(styles: Partial<StyleSettings>): Promise<void> {
    await this.loadConfig();

    const vscodeAPI = this.getVSCodeAPI();

    // VSCode設定にマッピング
    const configUpdate: any = {};

    if (styles.canvasBackgroundColor !== undefined) {
      configUpdate.canvasBackgroundColor = styles.canvasBackgroundColor;
    }
    if (styles.elementColor !== undefined) {
      configUpdate.elementColor = styles.elementColor;
    }

    // VSCode拡張の設定更新APIを呼び出し
    vscodeAPI.setConfig(configUpdate);

    // ローカルキャッシュも更新
    this.vscodeConfig = { ...this.vscodeConfig, ...configUpdate };
  }

  async getSetting<T>(key: string, defaultValue: T): Promise<T> {
    await this.loadConfig();
    return this.vscodeConfig?.[key] ?? defaultValue;
  }

  async setSetting<T>(key: string, value: T): Promise<void> {
    await this.loadConfig();

    const vscodeAPI = this.getVSCodeAPI();
    const configUpdate = { [key]: value };

    vscodeAPI.setConfig(configUpdate);
    this.vscodeConfig = { ...this.vscodeConfig, ...configUpdate };
  }
}

/**
 * 環境に応じた設定操作インスタンスを取得
 */
export function createSettingsAdapter(): SettingsAdapter {
  if (isVSCodeExtension()) {
    return new VSCodeSettingsAdapter();
  } else {
    return new BrowserSettingsAdapter();
  }
}

/**
 * グローバルな設定操作インスタンス
 */
export const settingsAdapter = createSettingsAdapter();
