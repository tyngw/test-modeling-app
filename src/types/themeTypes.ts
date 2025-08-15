// src/types/themeTypes.ts

/**
 * カラーテーマの型定義
 */
export interface Theme {
  /** タブバー関連の色設定 */
  TAB_BAR: {
    /** タブバーの背景色 */
    BACKGROUND: string;
    /** アクティブなタブの背景色 */
    ACTIVE_TAB_BACKGROUND: string;
    /** 非アクティブなタブの背景色 */
    INACTIVE_TAB_BACKGROUND: string;
    /** アクティブなタブのボーダー色 */
    ACTIVE_TAB_BORDER: string;
    /** タブ内のテキスト色 */
    TAB_TEXT: string;
    /** 閉じるボタンの色 */
    CLOSE_BUTTON_COLOR: string;
    /** 閉じるボタンのホバー時の色 */
    CLOSE_BUTTON_HOVER_COLOR?: string;
    /** タブ追加ボタンの背景色 */
    ADD_BUTTON_BACKGROUND: string;
    /** タブ追加ボタンのテキスト色 */
    ADD_BUTTON_TEXT: string;
  };

  /** キャンバス関連の色設定 */
  CANVAS: {
    /** キャンバス背景色 */
    BACKGROUND: string;
    /** 選択時の色 */
    SELECTION: string;
  };

  /** 要素関連の色設定 */
  ELEMENTS: {
    /** 通常時の背景色 */
    BACKGROUND: string;
    /** 選択時の背景色 */
    SELECTED_BACKGROUND: string;
    /** ボーダー色 */
    BORDER: string;
    /** 選択時のボーダー色 */
    SELECTED_BORDER: string;
    /** テキスト色 */
    TEXT: string;
  };

  /** その他のUI要素の色設定 */
  UI: {
    /** プライマリカラー */
    PRIMARY: string;
    /** セカンダリカラー */
    SECONDARY: string;
    /** 警告色 */
    WARNING: string;
    /** エラー色 */
    ERROR: string;
    /** 成功色 */
    SUCCESS: string;
  };
}
