/**
 * チャット操作の実行結果を表すドメインモデル
 */
export class ChatOperationResult {
  constructor(
    public readonly message: string,
    public readonly newSelectedElementId?: string,
    public readonly newElementId?: string,
    public readonly newElementText?: string,
  ) {}

  /**
   * 成功結果を作成
   */
  static success(
    message: string,
    newSelectedElementId?: string,
    newElementId?: string,
    newElementText?: string,
  ): ChatOperationResult {
    return new ChatOperationResult(message, newSelectedElementId, newElementId, newElementText);
  }

  /**
   * エラー結果を作成
   */
  static error(message: string): ChatOperationResult {
    return new ChatOperationResult(message);
  }

  /**
   * 新しい選択要素があるかどうか
   */
  hasNewSelection(): boolean {
    return !!this.newSelectedElementId;
  }
}
