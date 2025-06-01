// src/types/settings.ts
/**
 * このファイルは後方互換性のために維持されています。
 * 新しい実装では、以下のファイルを直接使用することをお勧めします：
 * - 型定義: src/types/settingsTypes.ts
 * - 設定データ: src/config/settingsConfig.ts
 */
import { SettingValue, SettingField, SettingTab } from './settingsTypes';
import { SETTINGS_TABS } from '../config/settingsConfig';

// 型定義の再エクスポート
export type { SettingValue, SettingField, SettingTab };

// 設定データの再エクスポート
export { SETTINGS_TABS };
