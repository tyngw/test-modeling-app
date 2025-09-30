import { ChatOperation } from '../models/ChatOperation';

import { Element } from '../../element/models/Element';

/**
 * チャット操作のドメインサービス
 * 操作の検証とビジネスロジックを担当
 */
export class ChatOperationService {
  /**
   * 操作リストを検証
   */
  validateOperations(operations: ChatOperation[]): void {
    if (!operations || operations.length === 0) {
      throw new Error('実行可能な操作が見つかりませんでした。');
    }

    for (const operation of operations) {
      if (!operation.isValid()) {
        throw new Error(`無効な操作です: ${operation.type}`);
      }
    }
  }

  /**
   * 要素検索の戦略を決定
   */
  determineSearchStrategy(targetText: string, availableElements: Element[]): Element | null {
    // 完全一致検索
    let found = availableElements.find((element) =>
      element.texts.some((text) => text === targetText),
    );

    if (found) return found;

    // 部分一致検索
    found = availableElements.find((element) =>
      element.texts.some((text) => text.includes(targetText)),
    );

    if (found) return found;

    // 大文字小文字を無視した検索
    found = availableElements.find((element) =>
      element.texts.some((text) => text.toLowerCase().includes(targetText.toLowerCase())),
    );

    return found || null;
  }

  /**
   * 操作の実行順序を最適化
   */
  optimizeOperationOrder(operations: ChatOperation[]): ChatOperation[] {
    // SELECT_ELEMENT操作を最初に移動
    const selectOperations = operations.filter((op) => op.type === 'SELECT_ELEMENT');
    const otherOperations = operations.filter((op) => op.type !== 'SELECT_ELEMENT');

    return [...selectOperations, ...otherOperations];
  }

  /**
   * エラーメッセージをユーザーフレンドリーに変換
   */
  createFriendlyErrorMessage(error: Error): string {
    const message = error.message;

    if (message.includes('要素が削除されている可能性があります')) {
      return '操作対象の要素が見つかりません。ページを更新するか、別の要素を選択してください。';
    }

    if (message.includes('選択された要素がありません')) {
      return '要素を選択してから操作を実行してください。';
    }

    if (message.includes('応答を解析できませんでした')) {
      return 'AIからの応答を処理できませんでした。もう一度お試しください。';
    }

    return message;
  }
}
