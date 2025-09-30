// src/domain/ai/models/AIOperation.ts

/**
 * AI操作の種類
 */
export type AIOperationType =
  | 'ADD_ELEMENTS'
  | 'SELECT_ELEMENT'
  | 'UPDATE_TEXT'
  | 'DELETE_ELEMENT'
  | 'ADD_SIBLING_ELEMENT'
  | 'COPY_ELEMENT'
  | 'DROP_ELEMENT'
  | 'ERROR';

/**
 * AI操作を表すドメインモデル
 */
export class AIOperation {
  constructor(
    public readonly type: AIOperationType,
    public readonly parameters: Record<string, unknown>,
  ) {}

  /**
   * 要素追加操作を作成
   */
  static addElements(targetId: string, elements: string[]): AIOperation {
    return new AIOperation('ADD_ELEMENTS', {
      targetId,
      elements,
    });
  }

  /**
   * 要素選択操作を作成
   */
  static selectElement(targetText: string): AIOperation {
    return new AIOperation('SELECT_ELEMENT', {
      targetText,
    });
  }

  /**
   * テキスト更新操作を作成
   */
  static updateText(targetId: string, newText: string): AIOperation {
    return new AIOperation('UPDATE_TEXT', {
      targetId,
      newText,
    });
  }

  /**
   * エラー操作を作成
   */
  static error(message: string): AIOperation {
    return new AIOperation('ERROR', {
      message,
    });
  }

  /**
   * 操作が有効かどうかを判定
   */
  isValid(): boolean {
    switch (this.type) {
      case 'ADD_ELEMENTS':
        return Boolean(this.parameters.elements && Array.isArray(this.parameters.elements));
      case 'SELECT_ELEMENT':
        return Boolean(this.parameters.targetText);
      case 'UPDATE_TEXT':
        return Boolean(this.parameters.newText);
      case 'ERROR':
        return Boolean(this.parameters.message);
      default:
        return true;
    }
  }
}
