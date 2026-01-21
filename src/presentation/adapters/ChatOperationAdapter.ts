import { ChatOperation, ElementsTreeNode } from '../../domain/chat/models/ChatOperation';
import { ChatOperationResult } from '../../domain/chat/models/ChatOperationResult';
import { Element } from '../../domain/element/models/Element';
import { Action } from '../../types/actionTypes';
import { TabState } from '../../types/tabTypes';
import { debugLog } from '../../utils/debugLogHelpers';
import {
  findElementInHierarchy,
  convertHierarchicalToArray,
} from '../../utils/hierarchical/hierarchicalConverter';

/**
 * チャット操作をReduxアクションに変換するアダプター
 * プレゼンテーション層とドメイン層の橋渡し
 */
export class ChatOperationAdapter {
  private operationTimestamps = new Map<string, number>();

  constructor(
    private readonly dispatch: (action: Action) => void,
    private readonly findElementByText: (targetText: string) => Promise<Element | null>,
  ) {}

  /**
   * 複数の操作を順次実行
   */
  async executeOperations(
    operations: ChatOperation[],
    currentTab: TabState,
    getLatestState?: () => TabState | undefined,
  ): Promise<string> {
    const results: string[] = [];
    let currentSelectedElementId = this.getCurrentSelectedElementId(currentTab);

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];

      // 操作前に待機（状態の安定化を待つ）
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }

      const result = await this.executeOperation(
        operation,
        currentSelectedElementId,
        currentTab,
        getLatestState,
      );

      results.push(result.message);

      // 新しい選択要素IDがある場合は更新
      if (result.hasNewSelection()) {
        currentSelectedElementId = result.newSelectedElementId!;
        await new Promise((resolve) => setTimeout(resolve, 400));
      }

      // 各操作の間に待機時間
      if (i < operations.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    return results.length === 1
      ? results[0]
      : `${results.length}個の操作を実行しました:\n${results.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
  }

  /**
   * 単一の操作を実行
   */
  private async executeOperation(
    operation: ChatOperation,
    selectedElementId: string,
    currentTab: TabState,
    getLatestState?: () => TabState | undefined,
  ): Promise<ChatOperationResult> {
    // 重複実行防止チェック
    if (this.isDuplicateOperation(operation)) {
      return ChatOperationResult.success('重複実行を防止しました');
    }

    const effectiveSelectedElementId = selectedElementId || this.getFirstElementId(currentTab);

    switch (operation.type) {
      case 'ADD_ELEMENTS':
        return this.executeAddElements(
          operation,
          effectiveSelectedElementId,
          currentTab,
          getLatestState,
        );

      case 'ADD_WITH_CHILDREN':
        return this.executeAddElementsWithChildren(
          operation,
          effectiveSelectedElementId,
          currentTab,
          getLatestState,
        );

      case 'SELECT_ELEMENT':
        return this.executeSelectElement(operation, currentTab);

      case 'UPDATE_TEXT':
        return this.executeUpdateText(operation, effectiveSelectedElementId);

      case 'DELETE_ELEMENT':
        return this.executeDeleteElement();

      case 'ADD_SIBLING_ELEMENT':
        return this.executeAddSiblingElement();

      case 'COPY_ELEMENT':
        return this.executeCopyElement();

      case 'DROP_ELEMENT':
        return this.executeDropElement(
          operation,
          effectiveSelectedElementId,
          currentTab,
          getLatestState,
        );

      case 'ERROR':
        throw new Error(operation.message || '操作エラーが発生しました');

      default:
        throw new Error(`サポートされていない操作です: ${operation.type}`);
    }
  }

  /**
   * ADD_ELEMENTS操作を実行
   */
  private async executeAddElements(
    operation: ChatOperation,
    selectedElementId: string,
    currentTab: TabState,
    getLatestState?: () => TabState | undefined,
  ): Promise<ChatOperationResult> {
    const elements = operation.elements || [];
    const targetId = operation.targetId === 'current' ? selectedElementId : operation.targetId;
    const autoSelect = operation.autoSelect || false;

    const addedElementIds = await this.addElementsInternal(
      elements,
      targetId,
      currentTab,
      getLatestState,
    );

    this.markOperationComplete(operation);

    if (autoSelect && addedElementIds.length > 0) {
      const firstElementId = addedElementIds[0];
      const firstElementText = elements[0];

      setTimeout(() => {
        this.dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: firstElementId },
        });
      }, 100);

      return ChatOperationResult.success(
        `${elements.length}個の要素を追加し、「${firstElementText}」を選択しました`,
        firstElementId,
      );
    }

    return ChatOperationResult.success(
      `${elements.length}個の要素を追加しました: ${elements.join(', ')}`,
    );
  }

  private async executeAddElementsWithChildren(
    operation: ChatOperation,
    selectedElementId: string,
    currentTab: TabState,
    getLatestState?: () => TabState | undefined,
  ): Promise<ChatOperationResult> {
    const nodes: ElementsTreeNode[] = operation.elementsTree || [];
    if (nodes.length === 0) {
      this.markOperationComplete(operation);
      return ChatOperationResult.success('追加対象の親子要素がありませんでした');
    }

    const baseTargetId = operation.targetId === 'current' ? selectedElementId : operation.targetId;
    const summaries: string[] = [];
    let latestParentId: string | undefined;

    for (const node of nodes) {
      if (!node || !node.parent?.trim()) {
        continue;
      }

      const parentTargetId =
        node.targetId === 'current'
          ? selectedElementId
          : node.targetId
            ? node.targetId
            : baseTargetId;

      const parentIds = await this.addElementsInternal(
        [node.parent],
        parentTargetId,
        currentTab,
        getLatestState,
      );

      if (parentIds.length === 0) {
        continue;
      }

      const parentId = parentIds[0];
      summaries.push(`親要素「${node.parent}」を追加`);
      latestParentId = parentId;

      if (node.children && node.children.length > 0) {
        await this.addElementsInternal(node.children, parentId, currentTab, getLatestState);
        summaries.push(`  └ 子要素: ${node.children.join(', ')}`);
      }
    }

    this.markOperationComplete(operation);

    if (operation.autoSelect && latestParentId) {
      const targetId = latestParentId;
      setTimeout(() => {
        this.dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: targetId },
        });
      }, 100);
    }

    const message = summaries.length
      ? `${nodes.length}組の親子要素を追加しました:\n${summaries.join('\n')}`
      : '親子要素の追加対象が見つかりませんでした';

    return ChatOperationResult.success(message, operation.autoSelect ? latestParentId : undefined);
  }

  /**
   * SELECT_ELEMENT操作を実行
   */
  private async executeSelectElement(
    operation: ChatOperation,
    _currentTab: TabState,
  ): Promise<ChatOperationResult> {
    if (operation.targetText) {
      // テキストから要素を検索
      let selectedElement: Element | null = null;

      // 複数回試行して要素を検索
      for (let attempt = 0; attempt < 5; attempt++) {
        selectedElement = await this.findElementByText(operation.targetText);
        if (selectedElement) {
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 50));
      }

      if (selectedElement) {
        this.dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: selectedElement.id },
        });
        return ChatOperationResult.success(
          `要素「${operation.targetText}」を選択しました`,
          selectedElement.id,
        );
      } else {
        debugLog(
          `[ChatOperationAdapter] SELECT_ELEMENT: 「${operation.targetText}」が見つかりません`,
        );
        return ChatOperationResult.success(
          `要素「${operation.targetText}」が見つかりませんでした。状態更新を待機してください。`,
        );
      }
    } else if (operation.targetId) {
      this.dispatch({
        type: 'SELECT_ELEMENT',
        payload: { id: operation.targetId },
      });
      return ChatOperationResult.success('要素を選択しました', operation.targetId);
    } else {
      return ChatOperationResult.success('選択対象が指定されていません');
    }
  }

  /**
   * UPDATE_TEXT操作を実行
   */
  private executeUpdateText(
    operation: ChatOperation,
    selectedElementId: string,
  ): ChatOperationResult {
    this.dispatch({
      type: 'UPDATE_TEXT',
      payload: {
        id: selectedElementId,
        index: 0,
        value: operation.newText || '',
      },
    });
    return ChatOperationResult.success(`テキストを「${operation.newText || ''}」に更新しました`);
  }

  /**
   * DELETE_ELEMENT操作を実行
   */
  private executeDeleteElement(): ChatOperationResult {
    this.dispatch({ type: 'DELETE_ELEMENT' });
    return ChatOperationResult.success('要素を削除しました');
  }

  /**
   * ADD_SIBLING_ELEMENT操作を実行
   */
  private executeAddSiblingElement(): ChatOperationResult {
    this.dispatch({ type: 'ADD_SIBLING_ELEMENT' });
    return ChatOperationResult.success('兄弟要素を追加しました');
  }

  /**
   * COPY_ELEMENT操作を実行
   */
  private executeCopyElement(): ChatOperationResult {
    this.dispatch({ type: 'COPY_ELEMENT' });
    return ChatOperationResult.success('要素をコピーしました');
  }

  /**
   * DROP_ELEMENT操作を実行
   */
  private executeDropElement(
    operation: ChatOperation,
    selectedElementId: string,
    currentTab: TabState,
    getLatestState?: () => TabState | undefined,
  ): ChatOperationResult {
    const resolvedTargetNodeId =
      operation.targetNodeId === 'current' ? selectedElementId : operation.targetNodeId;

    // 対象要素の存在確認
    if (operation.targetNodeId === 'current' && resolvedTargetNodeId) {
      const latestState = getLatestState ? getLatestState() : currentTab;

      if (latestState?.state.hierarchicalData) {
        const targetElement = findElementInHierarchy(
          latestState.state.hierarchicalData,
          resolvedTargetNodeId,
        );

        if (!targetElement) {
          const allElements = convertHierarchicalToArray(latestState.state.hierarchicalData);
          const allElementIds = allElements.map((el) => el.id);
          debugLog(`[ChatOperationAdapter] 利用可能な要素ID: ${allElementIds.join(', ')}`);
          throw new Error(`新しい親 current が見つかりません。ID: ${resolvedTargetNodeId}`);
        }
      }
    }

    interface DropElementPayload {
      id: string;
      targetNodeId: string | null;
      targetIndex?: number;
      direction?: 'left' | 'right' | 'none';
    }

    const payload: DropElementPayload = {
      id: selectedElementId,
      targetNodeId: resolvedTargetNodeId || null,
    };

    if (operation.targetIndex !== undefined) {
      payload.targetIndex = operation.targetIndex;
    }

    if (operation.direction !== undefined) {
      payload.direction = operation.direction;
    }

    this.dispatch({
      type: 'DROP_ELEMENT',
      payload,
    });

    return ChatOperationResult.success('要素を移動しました');
  }

  /**
   * 重複実行をチェック
   */
  private isDuplicateOperation(operation: ChatOperation, threshold = 2000): boolean {
    const operationKey = operation.getOperationKey();
    const now = Date.now();
    const lastExecution = this.operationTimestamps.get(operationKey);

    if (lastExecution && now - lastExecution < threshold) {
      debugLog(
        `[ChatOperationAdapter] 重複実行を防止しました (前回実行: ${
          now - lastExecution
        }ms前, key: ${operationKey})`,
      );
      return true;
    }

    this.operationTimestamps.set(operationKey, now);
    return false;
  }

  private async addElementsInternal(
    elements: string[],
    targetId: string | undefined,
    _currentTab: TabState,
    _getLatestState?: () => TabState | undefined,
  ): Promise<string[]> {
    if (elements.length === 0) {
      return [];
    }

    return await new Promise<string[]>((resolve, reject) => {
      this.dispatch({
        type: 'ADD_ELEMENTS_SILENT',
        payload: {
          targetNodeId: targetId,
          targetPosition: 'child',
          texts: elements,
          tentative: false,
          onSuccess: (addedElementIds: string[]) => {
            resolve(addedElementIds);
          },
          onError: (errorMessage: string) => {
            reject(new Error(`要素の追加に失敗しました: ${errorMessage}`));
          },
        },
      });
    });
  }

  /**
   * 操作完了をマーク
   */
  private markOperationComplete(operation: ChatOperation): void {
    const operationKey = operation.getOperationKey();
    this.operationTimestamps.delete(operationKey);
    debugLog(`[ChatOperationAdapter] 操作完了、重複防止キーをクリア: ${operationKey}`);
  }

  /**
   * 現在選択されている要素のIDを取得
   */
  private getCurrentSelectedElementId(currentTab: TabState): string {
    if (!currentTab.state.hierarchicalData) {
      return '';
    }

    const allElements = convertHierarchicalToArray(currentTab.state.hierarchicalData);
    const selectedElement = allElements.find((el) => el.selected);
    return selectedElement?.id || this.getFirstElementId(currentTab);
  }

  /**
   * 最初の要素のIDを取得
   */
  private getFirstElementId(currentTab: TabState): string {
    if (!currentTab.state.hierarchicalData) {
      return '';
    }

    const allElements = convertHierarchicalToArray(currentTab.state.hierarchicalData);
    return allElements[0]?.id || '';
  }
}
