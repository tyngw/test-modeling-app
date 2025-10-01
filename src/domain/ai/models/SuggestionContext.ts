// src/domain/ai/models/SuggestionContext.ts

/**
 * チャット履歴のエントリ
 */
export interface ChatHistoryEntry {
  role: 'user' | 'model';
  parts: { text: string }[];
}

/**
 * サジェスト機能のコンテキストを管理するドメインモデル
 */
export class SuggestionContext {
  private _chatHistory: ChatHistoryEntry[] = [];
  private _lastParentElementId: string | null = null;
  private _isActive = false;
  private _isExecuting = false;
  private _contextInitialized = false;
  private _lastInputText: string | null = null;

  constructor() {
    // 初期化処理は不要だが、明示的にコンストラクタを定義
  }

  get chatHistory(): ChatHistoryEntry[] {
    return [...this._chatHistory];
  }

  get lastParentElementId(): string | null {
    return this._lastParentElementId;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get isExecuting(): boolean {
    return this._isExecuting;
  }

  get contextInitialized(): boolean {
    return this._contextInitialized;
  }

  get lastInputText(): string | null {
    return this._lastInputText;
  }

  /**
   * チャット履歴を更新
   */
  updateChatHistory(history: ChatHistoryEntry[]): void {
    this._chatHistory = [...history];
  }

  /**
   * 親要素IDを更新
   */
  updateParentElementId(elementId: string): void {
    this._lastParentElementId = elementId;
  }

  /**
   * アクティブ状態を設定
   */
  setActive(active: boolean): void {
    this._isActive = active;
  }

  /**
   * 実行状態を設定
   */
  setExecuting(executing: boolean): void {
    this._isExecuting = executing;
  }

  /**
   * コンテキスト初期化状態を設定
   */
  setContextInitialized(initialized: boolean, inputText?: string): void {
    this._contextInitialized = initialized;
    if (inputText !== undefined) {
      this._lastInputText = inputText;
    }
  }

  /**
   * コンテキストをクリア
   */
  clear(): void {
    this._chatHistory = [];
    this._lastParentElementId = null;
    this._isActive = false;
    this._isExecuting = false;
    this._contextInitialized = false;
    this._lastInputText = null;
  }

  /**
   * 親要素が変更されたかどうかを判定
   */
  hasParentElementChanged(elementId: string): boolean {
    return this._lastParentElementId !== elementId;
  }

  /**
   * 入力テキストが変更されたかどうかを判定
   */
  hasInputTextChanged(inputText: string): boolean {
    return this._lastInputText !== inputText;
  }

  /**
   * コンテキスト初期化が必要かどうかを判定
   */
  needsContextInitialization(inputText: string): boolean {
    return !this._contextInitialized || this.hasInputTextChanged(inputText);
  }
}
