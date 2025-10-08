export interface ElementsTreeNode {
  parent: string;
  children?: string[];
  targetId?: string;
}

/**
 * チャット操作を表すドメインモデル
 */
export class ChatOperation {
  constructor(
    public readonly type: string,
    public readonly targetId?: string,
    public readonly elements?: string[],
    public readonly autoSelect?: boolean,
    public readonly targetText?: string,
    public readonly newText?: string,
    public readonly targetNodeId?: string,
    public readonly targetIndex?: number,
    public readonly message?: string,
    public readonly direction?: 'left' | 'right' | 'none',
    public readonly elementsTree?: ElementsTreeNode[],
  ) {}

  /**
   * 操作が有効かどうかを判定
   */
  isValid(): boolean {
    switch (this.type) {
      case 'ADD_ELEMENTS':
        return !!(this.elements && this.elements.length > 0);
      case 'SELECT_ELEMENT':
        return !!(this.targetText || this.targetId);
      case 'UPDATE_TEXT':
        return this.newText !== undefined;
      case 'DELETE_ELEMENT':
      case 'ADD_SIBLING_ELEMENT':
      case 'COPY_ELEMENT':
        return true;
      case 'DROP_ELEMENT':
        return !!this.targetNodeId;
      case 'ADD_WITH_CHILDREN':
        return !!(
          this.elementsTree &&
          this.elementsTree.length > 0 &&
          this.elementsTree.every((node) => typeof node.parent === 'string' && node.parent.trim())
        );
      case 'ERROR':
        return !!this.message;
      default:
        return false;
    }
  }

  /**
   * 操作の一意キーを生成（重複実行防止用）
   */
  getOperationKey(): string {
    const details = {
      targetId: this.targetId,
      elements: this.elements,
      targetText: this.targetText,
      newText: this.newText,
      targetNodeId: this.targetNodeId,
      elementsTree: this.elementsTree,
    };
    return `${this.type}_${JSON.stringify(details)}`;
  }
}
