// src/types/tabTypes.ts
import { State } from '../state/state';

/**
 * テーマ設定の型定義（簡略版）
 * themeTypes.tsに定義されている完全な型と将来的に統合する
 */
export interface Theme {
  TAB_BAR: {
    BACKGROUND: string;
    ACTIVE_TAB_BACKGROUND: string;
    INACTIVE_TAB_BACKGROUND: string;
    ACTIVE_TAB_BORDER: string;
    TAB_TEXT: string;
    CLOSE_BUTTON_COLOR: string;
    CLOSE_BUTTON_HOVER_COLOR?: string;
    ADD_BUTTON_BACKGROUND: string;
    ADD_BUTTON_TEXT: string;
  };
  [key: string]: any;
}

/**
 * タブの状態を表す型
 */
export interface TabState {
  /** タブのユニークID */
  id: string;
  /** タブの表示名 */
  name: string;
  /** タブが保持する状態 */
  state: State;
}

/**
 * タブのローカルストレージ保存形式
 */
export type TabsStorage = {
  /** 全タブのリスト */
  tabs: TabState[];
  /** アクティブなタブID */
  currentTabId: string;
};

/**
 * タブヘッダーコンポーネントのプロパティ
 */
export interface TabHeadersProps {
  /** 全タブのリスト */
  tabs: TabState[];
  /** アクティブなタブID */
  currentTabId: string;
  /** 新規タブ追加コールバック */
  addTab: () => string;
  /** タブ閉じるコールバック */
  closeTab: (id: string) => void;
  /** タブ切り替えコールバック */
  switchTab: (id: string) => void;
}

/**
 * 個別タブヘッダーコンポーネントのプロパティ
 */
export interface TabHeaderProps {
  /** タブ情報 */
  tab: TabState;
  /** このタブがアクティブかどうか */
  isCurrent: boolean;
  /** タブ閉じるコールバック */
  closeTab: (id: string) => void;
  /** タブ切り替えコールバック */
  switchTab: (id: string) => void;
  /** テーマ設定 */
  theme: Theme;
}

/**
 * TabsContext の値の型定義
 */
export interface TabsContextValue {
  /** 全タブのリスト */
  tabs: TabState[];
  /** アクティブなタブID */
  currentTabId: string;
  /** 新規タブ追加コールバック - タブIDを返す */
  addTab: () => string;
  /** タブ閉じるコールバック */
  closeTab: (id: string) => void;
  /** タブ切り替えコールバック */
  switchTab: (id: string) => void;
  /** タブの状態更新コールバック */
  updateTabState: (tabId: string, updater: (prevState: State) => State) => void;
  /** タブ名更新コールバック */
  updateTabName: (tabId: string, newName: string) => void;
  /** 現在のタブ状態取得関数 */
  getCurrentTabState: () => State | undefined;
  /** 現在のタブのセクション数取得関数 */
  getCurrentTabNumberOfSections: () => number;
  /** 現在のタブのセクション数更新関数 */
  updateCurrentTabNumberOfSections: (value: number) => void;
}
