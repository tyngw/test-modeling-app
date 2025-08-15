/**
 * AIプロンプト関連の制限値定数
 */

/**
 * 階層構造プロンプト用の制限値
 */
export const PROMPT_LIMITS = {
  /** 一つの要素のテキストの最大文字数 */
  MAX_ELEMENT_TEXT_LENGTH: 20,
  /** 構造データ全体の最大文字数（必要に応じて将来追加） */
  MAX_STRUCTURE_TEXT_LENGTH: 10000,
} as const;
