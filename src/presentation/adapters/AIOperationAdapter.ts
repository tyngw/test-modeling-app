// src/presentation/adapters/AIOperationAdapter.ts

import { AIOperation } from '../../domain/ai/models/AIOperation';
import { Element } from '../../domain/element/models/Element';
import { Element as LegacyElement } from '../../types/types';
import { Action } from '../../types/actionTypes';
import { ElementOperationService } from '../../application/element/ElementOperationService';

/**
 * AI操作をUI層で実行するためのアダプター
 * ビジネスロジックはElementOperationServiceに委譲し、UI操作のみを担当
 */
export class AIOperationAdapter {
  constructor(
    private elementOperationService: ElementOperationService,
    private dispatch: (action: Action) => void,
    private findElementByText: (text: string) => Promise<Element | null>,
  ) {}

  /**
   * 複数の操作を順次実行
   */
  async executeOperations(
    operations: AIOperation[],
    elementsMap: Record<string, LegacyElement>,
  ): Promise<string> {
    if (operations.length === 0) {
      throw new Error('実行可能な操作が見つかりませんでした。');
    }

    // ビジネスロジック: 操作順序の最適化
    const optimizedOperations = this.elementOperationService.optimizeOperationOrder(operations);

    const results: string[] = [];
    let currentSelectedElement: Element | null = null;

    for (let i = 0; i < optimizedOperations.length; i++) {
      const operation = optimizedOperations[i];

      // ビジネスロジック: 操作の妥当性検証
      if (!this.elementOperationService.validateOperation(operation)) {
        const errorMsg = `無効な操作: ${operation.type}`;
        results.push(errorMsg);
        continue;
      }

      try {
        const result = await this.executeOperation(
          operation,
          elementsMap,
          currentSelectedElement?.id || null,
        );
        results.push(result);

        // SELECT_ELEMENT操作の場合、選択状態を更新
        if (operation.type === 'SELECT_ELEMENT') {
          currentSelectedElement = await this.findElementByText(
            operation.parameters.targetText as string,
          );
        }

        // UI更新のための待機時間
        if (i < optimizedOperations.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (error) {
        const errorMsg = this.elementOperationService.generateResultMessage(
          operation,
          false,
          error instanceof Error ? error.message : '不明なエラー',
        );
        results.push(errorMsg);
      }
    }

    return `${results.length}個の操作を処理しました！\n\n${results.map((result, index) => `${index + 1}. ${result}`).join('\n')}`;
  }

  /**
   * 単一の操作を実行
   */
  private async executeOperation(
    operation: AIOperation,
    _elementsMap: Record<string, LegacyElement>,
    currentSelected: string | null,
  ): Promise<string> {
    // ビジネスロジック: 操作データの準備
    const operationData = this.elementOperationService.prepareOperationData(
      operation,
      currentSelected,
    );

    switch (operation.type) {
      case 'ADD_ELEMENTS':
        return await this.executeAddElements(operationData);

      case 'SELECT_ELEMENT':
        return await this.executeSelectElement(operationData);

      case 'UPDATE_TEXT':
        return await this.executeUpdateText(operationData);

      case 'DELETE_ELEMENT':
        return await this.executeDeleteElement();

      case 'ADD_SIBLING_ELEMENT':
        return await this.executeAddSiblingElement();

      case 'COPY_ELEMENT':
        return await this.executeCopyElement();

      case 'DROP_ELEMENT':
        return await this.executeDropElement(operation, currentSelected);

      case 'ERROR':
        throw new Error(String(operation.parameters.message) || '操作エラーが発生しました');

      default:
        return `未対応の操作: ${operation.type}`;
    }
  }

  /**
   * 要素追加操作を実行（UI操作のみ）
   */
  private async executeAddElements(operationData: {
    targetElementId: string | null;
    elements: string[];
  }): Promise<string> {
    if (!operationData.targetElementId) {
      throw new Error('追加先の要素が特定できませんでした。要素を選択してから操作してください。');
    }

    if (operationData.elements.length === 0) {
      throw new Error('追加する要素が指定されていません。');
    }

    // UI操作: dispatchを実行
    this.dispatch({
      type: 'ADD_ELEMENTS_SILENT',
      payload: {
        targetNodeId: operationData.targetElementId,
        targetPosition: 'child',
        texts: operationData.elements,
        tentative: true,
        onError: (errorMessage: string) => {
          throw new Error(errorMessage);
        },
      },
    });

    return `${operationData.elements.length}個の要素を追加: ${operationData.elements.join(', ')}`;
  }

  /**
   * 要素選択操作を実行（UI操作のみ）
   */
  private async executeSelectElement(operationData: {
    targetText: string | null;
  }): Promise<string> {
    if (!operationData.targetText) {
      throw new Error('選択する要素のテキストが指定されていません。');
    }

    const element = await this.findElementByText(operationData.targetText);
    if (!element) {
      throw new Error(`要素「${operationData.targetText}」が見つかりませんでした。`);
    }

    // UI操作: dispatchを実行
    this.dispatch({
      type: 'SELECT_ELEMENT',
      payload: element.id,
    });

    return `要素「${operationData.targetText}」を選択しました`;
  }

  /**
   * テキスト更新操作を実行（UI操作のみ）
   */
  private async executeUpdateText(operationData: {
    targetElementId: string | null;
    newText: string | null;
  }): Promise<string> {
    if (!operationData.targetElementId) {
      throw new Error('更新する要素が特定できませんでした。');
    }

    if (!operationData.newText) {
      throw new Error('新しいテキストが指定されていません。');
    }

    // UI操作: dispatchを実行
    this.dispatch({
      type: 'UPDATE_TEXT',
      payload: {
        id: operationData.targetElementId,
        index: 0,
        value: operationData.newText,
      },
    });

    return `要素のテキストを「${operationData.newText}」に更新しました`;
  }

  /**
   * 要素削除操作を実行（UI操作のみ）
   */
  private async executeDeleteElement(): Promise<string> {
    this.dispatch({
      type: 'DELETE_ELEMENT',
    });

    return '要素を削除しました';
  }

  /**
   * 兄弟要素追加操作を実行（UI操作のみ）
   */
  private async executeAddSiblingElement(): Promise<string> {
    this.dispatch({
      type: 'ADD_SIBLING_ELEMENT',
    });

    return '新しい兄弟要素を追加しました';
  }

  /**
   * 要素コピー操作を実行（UI操作のみ）
   */
  private async executeCopyElement(): Promise<string> {
    this.dispatch({
      type: 'COPY_ELEMENT',
    });

    return '選択された要素をコピーしました';
  }

  /**
   * 要素移動操作を実行（UI操作のみ）
   */
  private async executeDropElement(
    operation: AIOperation,
    currentSelected: string | null,
  ): Promise<string> {
    const targetNodeId = operation.parameters.targetNodeId as string;
    const targetIndex = operation.parameters.targetIndex as number;
    const description = (operation.parameters.description as string) || '指定された位置';

    if (!currentSelected) {
      throw new Error('移動する要素が選択されていません。');
    }

    // UI操作: dispatchを実行
    this.dispatch({
      type: 'DROP_ELEMENT',
      payload: {
        id: currentSelected,
        targetNodeId: targetNodeId,
        targetIndex: targetIndex,
        direction: (operation.parameters.direction as 'none' | 'right' | 'left') || 'none',
      },
    });

    return `要素を${description}に移動しました`;
  }
}
