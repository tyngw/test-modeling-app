// src/application/element/ElementOperationService.ts

import { AIOperation } from '../../domain/ai/models/AIOperation';

/**
 * 要素操作に関するビジネスロジックを担当するサービス
 */
export class ElementOperationService {
  /**
   * 操作の妥当性を検証
   */
  validateOperation(operation: AIOperation): boolean {
    return operation.isValid();
  }

  /**
   * 複数操作の実行順序を最適化
   */
  optimizeOperationOrder(operations: AIOperation[]): AIOperation[] {
    // SELECT_ELEMENT操作を先に実行するなどの最適化
    return operations.sort((a, b) => {
      const priority = {
        SELECT_ELEMENT: 1,
        ADD_ELEMENTS: 2,
        UPDATE_TEXT: 3,
        DELETE_ELEMENT: 4,
        COPY_ELEMENT: 5,
        DROP_ELEMENT: 6,
        ADD_SIBLING_ELEMENT: 7,
        ERROR: 999,
      };

      return (priority[a.type] || 999) - (priority[b.type] || 999);
    });
  }

  /**
   * 操作実行のためのデータを準備
   */
  prepareOperationData(
    operation: AIOperation,
    currentSelected: string | null,
  ): {
    targetElementId: string | null;
    elements: string[];
    newText: string | null;
    targetText: string | null;
  } {
    switch (operation.type) {
      case 'ADD_ELEMENTS': {
        return {
          targetElementId: (operation.parameters.targetId as string) || currentSelected,
          elements: (operation.parameters.elements as string[]) || [],
          newText: null,
          targetText: null,
        };
      }

      case 'SELECT_ELEMENT': {
        return {
          targetElementId: null,
          elements: [],
          newText: null,
          targetText: operation.parameters.targetText as string,
        };
      }

      case 'UPDATE_TEXT': {
        return {
          targetElementId: (operation.parameters.targetId as string) || currentSelected,
          elements: [],
          newText: operation.parameters.newText as string,
          targetText: null,
        };
      }

      default: {
        return {
          targetElementId: currentSelected,
          elements: [],
          newText: null,
          targetText: null,
        };
      }
    }
  }

  /**
   * 操作結果のメッセージを生成
   */
  generateResultMessage(operation: AIOperation, success: boolean, details?: string): string {
    if (!success) {
      return `操作「${operation.type}」が失敗しました: ${details || '不明なエラー'}`;
    }

    switch (operation.type) {
      case 'ADD_ELEMENTS': {
        const elements = operation.parameters.elements as string[];
        return `${elements.length}個の要素を追加: ${elements.join(', ')}`;
      }

      case 'SELECT_ELEMENT': {
        const targetText = operation.parameters.targetText as string;
        return `要素「${targetText}」を選択しました`;
      }

      case 'UPDATE_TEXT': {
        const newText = operation.parameters.newText as string;
        return `要素のテキストを「${newText}」に更新しました`;
      }

      case 'DELETE_ELEMENT':
        return '要素を削除しました';

      case 'ADD_SIBLING_ELEMENT':
        return '新しい兄弟要素を追加しました';

      case 'COPY_ELEMENT':
        return '選択された要素をコピーしました';

      case 'DROP_ELEMENT': {
        const description = (operation.parameters.description as string) || '指定された位置';
        return `要素を${description}に移動しました`;
      }

      default:
        return `操作「${operation.type}」を実行しました`;
    }
  }

  /**
   * 要素検索のためのクエリを構築
   */
  buildSearchQuery(targetText: string): {
    exactMatch: boolean;
    searchTerms: string[];
  } {
    // 完全一致と部分一致の戦略を決定
    return {
      exactMatch: targetText.length < 50, // 短いテキストは完全一致を優先
      searchTerms: targetText.split(/\s+/).filter((term) => term.length > 2),
    };
  }
}
