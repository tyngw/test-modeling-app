import { useCallback, useState, useRef } from 'react';
import { generateWithGemini } from '../utils/api';
import { getApiKey, getModelType } from '../utils/storage';
import { createChatUserPromptOnly, getChatSystemPrompt } from '../config/chatSystemPrompt';
import {
  formatElementsForPrompt,
  formatHierarchicalStructureForPrompt,
} from '../utils/element/elementHelpers';
import {
  getSelectedElementsFromHierarchy,
  createElementsMapFromHierarchy,
  findElementInHierarchy,
  convertHierarchicalToArray,
} from '../utils/hierarchical/hierarchicalConverter';
import { TabState } from '../types/tabTypes';
import { Action } from '../types/actionTypes';
import { Element } from '../types/types';
import { HierarchicalNode } from '../types/hierarchicalTypes';

interface UseChatAssistantParams {
  currentTab: TabState | undefined;
  dispatch: (action: Action) => void;
  getLatestState?: () => TabState | undefined; // 最新の状態を取得する関数
}

/**
 * チャット操作を表すインターフェース
 */
interface Operation {
  type: string;
  targetId?: string;
  elements?: string[];
  autoSelect?: boolean;
  targetText?: string;
  newText?: string;
  targetNodeId?: string;
  targetIndex?: number;
  message?: string;
  [key: string]: unknown;
}

/**
 * チャットアシスタント機能用のカスタムフック
 * ユーザーの指示に基づいて選択された要素に対して操作を実行
 */
export function useChatAssistant({ currentTab, dispatch, getLatestState }: UseChatAssistantParams) {
  const [isLoading, setIsLoading] = useState(false);
  const [lastOperationTimestamp, setLastOperationTimestamp] = useState<number>(0);

  // 重複実行防止のための状態 - より詳細な操作コンテキストで管理
  const operationTimestamps = useRef<Map<string, number>>(new Map());

  // 重複実行チェック関数 - より厳密なチェック
  const isDuplicateOperation = (
    operation: string,
    details?: Record<string, unknown>,
    threshold = 2000,
  ): boolean => {
    const operationKey = details ? `${operation}_${JSON.stringify(details)}` : operation;
    const now = Date.now();
    const lastExecution = operationTimestamps.current.get(operationKey);

    if (lastExecution && now - lastExecution < threshold) {
      console.log(
        `[${operation}] 重複実行を防止しました (前回実行: ${
          now - lastExecution
        }ms前, key: ${operationKey})`,
      );
      return true;
    }

    operationTimestamps.current.set(operationKey, now);
    return false;
  };

  // 操作完了後のクリーンアップ
  const markOperationComplete = (operation: string, details?: Record<string, unknown>) => {
    const operationKey = details ? `${operation}_${JSON.stringify(details)}` : operation;
    operationTimestamps.current.delete(operationKey);
    console.log(`[${operation}] 操作完了、重複防止キーをクリア: ${operationKey}`);
  };

  const handleChatMessage = useCallback(
    async (userInput: string) => {
      if (isLoading) {
        throw new Error('処理中です。しばらくお待ちください。');
      }
      setIsLoading(true);
      let selectedElement: Element | null = null;
      try {
        if (!currentTab) {
          throw new Error('アクティブなタブがありません。');
        }
        // 選択された要素を取得（なければルートや最初の要素を自動選択）
        const selectedElements = currentTab.state.hierarchicalData
          ? getSelectedElementsFromHierarchy(currentTab.state.hierarchicalData)
          : [];
        if (selectedElements.length === 0) {
          // 選択要素がない場合は階層データから最初の要素を自動選択
          const elementsMap = currentTab.state.hierarchicalData
            ? createElementsMapFromHierarchy(currentTab.state.hierarchicalData)
            : {};
          const firstId = Object.keys(elementsMap)[0];
          selectedElement = elementsMap[firstId] || null;
        } else {
          selectedElement = selectedElements[0];
        }
        const selectedElementText = selectedElement?.texts?.[0] || '未選択';

        // 現在の構造を取得
        const elementsMap = currentTab.state.hierarchicalData
          ? createElementsMapFromHierarchy(currentTab.state.hierarchicalData)
          : {};

        // 現在の全体構造をAIに渡すために、階層構造から詳細な情報を生成
        const fullStructure = currentTab.state.hierarchicalData
          ? formatHierarchicalStructureForPrompt(currentTab.state.hierarchicalData)
          : formatElementsForPrompt(elementsMap);

        // デバッグ用：構造情報をログ出力
        // eslint-disable-next-line no-console
        console.log('[Chat] 構造情報:', {
          hasHierarchicalData: !!currentTab.state.hierarchicalData,
          elementsMapSize: Object.keys(elementsMap).length,
          fullStructure,
        });

        // APIキーを取得
        const decryptedApiKey = await getApiKey();
        if (!decryptedApiKey) {
          throw new Error('APIキーが設定されていません。設定画面からAPIキーを設定してください。');
        }

        // チャットアシスタント用のプロンプトを作成（システムプロンプト重複を避ける）
        const chatUserPrompt = createChatUserPromptOnly({
          selectedElement: selectedElementText,
          currentStructure: fullStructure,
          userInput,
        });

        const chatSystemPrompt = getChatSystemPrompt();

        // eslint-disable-next-line no-console
        console.log('[Chat] リクエスト:', {
          selectedElement: selectedElementText,
          instruction: userInput,
        });

        // デバッグ用：プロンプト全体をログ出力
        // eslint-disable-next-line no-console
        console.log('[Chat] ユーザープロンプト:', chatUserPrompt);
        // eslint-disable-next-line no-console
        console.log('[Chat] システムプロンプト:', chatSystemPrompt);

        // AI に指示を送信（チャット専用のシステムプロンプトを使用）
        const modelType = getModelType();
        // AIレスポンスはstringまたはRecord<string, unknown>型で受け取る
        const result = await generateWithGemini(
          chatUserPrompt,
          decryptedApiKey,
          modelType,
          false,
          chatSystemPrompt,
        );

        // any型を完全排除し、関数引数や戻り値も厳密な型指定に修正
        // 例: (response: { data: string | object | null })
        if (typeof result === 'string') {
          // string型として処理
          if (!result.trim()) {
            throw new Error('AIからの応答が空でした。プロンプトを確認してください。');
          }
          const cleanedResult = result.replace(/```json\s*|```\s*/g, '').trim();
          // eslint-disable-next-line no-console
          console.log('[Chat] クリーンアップ後のレスポンス:', cleanedResult);

          // 新しい統一形式のJSONレスポンスを解析
          let operationsData: { operations: Operation[] };
          try {
            operationsData = JSON.parse(cleanedResult);
          } catch (parseError) {
            // eslint-disable-next-line no-console
            console.log('[Chat] JSONパースエラー:', {
              error: parseError,
              originalResponse: result,
              cleanedResponse: cleanedResult,
            });
            throw new Error('AIからの応答を解析できませんでした。再度お試しください。');
          }

          // operations配列を取得
          const operations = operationsData.operations;
          if (!operations || operations.length === 0) {
            throw new Error('実行可能な操作が見つかりませんでした。');
          }

          // 各操作を順次実行（選択要素IDを追跡）
          const results: string[] = [];
          let currentSelectedElementId = selectedElement.id; // 現在の選択要素IDを追跡

          for (let i = 0; i < operations.length; i++) {
            const operation = operations[i];

            // 操作前に待機（状態の安定化を待つ）
            if (i > 0) {
              await new Promise((resolve) => setTimeout(resolve, 300));
            }

            // eslint-disable-next-line no-console
            console.log(
              `[Chat] 操作 ${i + 1}/${operations.length} 実行中: ${operation.type}, currentSelectedElementId=${currentSelectedElementId}`,
            );

            const result = await executeOperation(
              operation,
              currentSelectedElementId,
              dispatch,
              currentTab,
              getLatestState,
              lastOperationTimestamp,
              setLastOperationTimestamp,
              isDuplicateOperation,
              markOperationComplete,
            );
            results.push(result.message);

            // SELECT_ELEMENT操作やADD_ELEMENTS(autoSelect)の場合、新しい選択要素IDに更新
            if (result.newSelectedElementId) {
              currentSelectedElementId = result.newSelectedElementId;
              // eslint-disable-next-line no-console
              console.log(`[Chat] 選択要素IDを更新: ${currentSelectedElementId}`);

              // 選択要素更新後は、より長い待機時間を設ける
              await new Promise((resolve) => setTimeout(resolve, 400));
            }

            // 各操作の間に待機時間
            if (i < operations.length - 1) {
              await new Promise((resolve) => setTimeout(resolve, 200));
            }
          }

          // eslint-disable-next-line no-console
          console.log('[Chat] 結果:', {
            operationsCount: operations.length,
            results: results,
          });

          return results.length === 1
            ? results[0]
            : `${results.length}個の操作を実行しました:\n${results.map((r, i) => `${i + 1}. ${r}`).join('\n')}`;
        } else if (typeof result === 'object' && result !== null) {
          // object型として処理
          // eslint-disable-next-line no-console
          console.log('[Chat] オブジェクトレスポンス:', result);
          return 'オブジェクトレスポンスを受信しました';
        } else {
          // nullや予期しない型のエラー処理
          throw new Error('予期しないレスポンスの型です');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
        // eslint-disable-next-line no-console
        console.error('[Chat] エラー詳細:', {
          message: errorMessage,
          error: error,
          selectedElementId: selectedElement?.id,
          selectedElementText: selectedElement?.texts?.[0],
          timestamp: new Date().toISOString(),
        });

        // ユーザーフレンドリーなエラーメッセージに変換
        let friendlyMessage = errorMessage;
        if (errorMessage.includes('要素が削除されている可能性があります')) {
          friendlyMessage =
            '操作対象の要素が見つかりません。ページを更新するか、別の要素を選択してください。';
        } else if (errorMessage.includes('選択された要素がありません')) {
          friendlyMessage = '要素を選択してから操作を実行してください。';
        } else if (errorMessage.includes('応答を解析できませんでした')) {
          friendlyMessage = 'AIからの応答を処理できませんでした。もう一度お試しください。';
        }

        throw new Error(friendlyMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentTab,
      dispatch,
      isLoading,
      getLatestState,
      lastOperationTimestamp,
      setLastOperationTimestamp,
    ],
  );

  return { handleChatMessage, isLoading };
}

/**
 * 操作結果を表すインターフェース
 */
interface ExecuteOperationResult {
  message: string;
  newSelectedElementId?: string; // 新しく選択された要素のID（SELECT_ELEMENT操作の場合）
  newElementId?: string; // 新しく追加された要素のID（ADD_ELEMENTS操作の場合）
  newElementText?: string; // 新しく追加された要素のテキスト（ADD_ELEMENTS操作の場合）
}

/**
 * AIからの指示に基づいて実際の操作を実行
 */
async function executeOperation(
  operation: Operation,
  selectedElementId: string,
  dispatch: (action: Action) => void,
  currentTab: TabState,
  getLatestState?: () => TabState | undefined,
  lastOperationTimestamp?: number,
  setLastOperationTimestamp?: (timestamp: number) => void,
  isDuplicateOperation?: (
    operation: string,
    details?: Record<string, unknown>,
    threshold?: number,
  ) => boolean,
  markOperationComplete?: (operation: string, details?: Record<string, unknown>) => void,
): Promise<ExecuteOperationResult> {
  const { type } = operation;
  // 選択要素IDが未定義の場合は階層データから最初の要素IDを自動選択
  let effectiveSelectedElementId = selectedElementId;
  if (!effectiveSelectedElementId && currentTab.state.hierarchicalData) {
    const elementsMap = createElementsMapFromHierarchy(currentTab.state.hierarchicalData);
    const firstId = Object.keys(elementsMap)[0];
    effectiveSelectedElementId = firstId;
  }

  switch (type) {
    case 'ADD_ELEMENTS': {
      const elements = operation.elements || [];
      const targetId =
        operation.targetId === 'current' ? effectiveSelectedElementId : operation.targetId;
      const autoSelect = operation.autoSelect || false; // 新しいオプション

      // 重複実行防止チェック（より厳密に）
      const operationKey = `ADD_ELEMENTS_${targetId}_${elements.join('_')}`;
      if (
        isDuplicateOperation &&
        isDuplicateOperation(operationKey, { targetId, elements }, 2000)
      ) {
        return Promise.resolve({
          message: '重複実行を防止しました',
        });
      }

      // eslint-disable-next-line no-console
      console.log(
        `[Chat] ADD_ELEMENTS: targetId=${targetId}, selectedElementId=${effectiveSelectedElementId}, operation.targetId=${operation.targetId}`,
      );

      // 現在の階層データの状態をログ
      if (currentTab.state.hierarchicalData) {
        const allElements = convertHierarchicalToArray(currentTab.state.hierarchicalData);
        // eslint-disable-next-line no-console
        console.log(`[Chat] 現在の要素数: ${allElements.length}`);
      }

      // 対象要素の存在確認（'current'の場合は既に解決済みのIDをチェック）
      if (targetId) {
        const targetElementExists = findElementInHierarchy(
          currentTab.state.hierarchicalData,
          targetId,
        );

        if (!targetElementExists) {
          // eslint-disable-next-line no-console
          console.error(
            `[Chat] 要素が見つかりません: targetId=${targetId}, hierarchicalData exists=${!!currentTab.state.hierarchicalData}`,
          );

          // より詳細なデバッグ情報
          if (currentTab.state.hierarchicalData) {
            const allElements = convertHierarchicalToArray(currentTab.state.hierarchicalData);
            const allElementIds = allElements.map((el) => el.id);
            // eslint-disable-next-line no-console
            console.log(`[Chat] 利用可能な要素ID: ${allElementIds.join(', ')}`);
          }

          throw new Error(
            `対象要素（ID: ${targetId}）が見つかりません。要素が削除されている可能性があります。`,
          );
        }
      }

      // 新しいアクションを使用してIDを取得
      return new Promise<ExecuteOperationResult>((resolve, reject) => {
        dispatch({
          type: 'ADD_ELEMENTS_SILENT',
          payload: {
            targetNodeId: targetId,
            targetPosition: 'child',
            texts: elements,
            tentative: false,
            onSuccess: (addedElementIds: string[]) => {
              // eslint-disable-next-line no-console
              console.log(`[Chat] 要素追加成功: ${addedElementIds.join(', ')}`);

              // 操作完了をマーク
              if (markOperationComplete) {
                markOperationComplete(operationKey, { targetId, elements });
              }

              // autoSelectの処理 - polling不要でそのまま実行
              if (autoSelect && addedElementIds.length > 0) {
                const firstElementId = addedElementIds[0];
                const firstElementText = elements[0];

                // eslint-disable-next-line no-console
                console.log(
                  `[Chat] autoSelect: 「${firstElementText}」(ID: ${firstElementId})を選択します`,
                );

                // onSuccessコールバック内で確実に実行 - より短い遅延で確実に実行
                setTimeout(() => {
                  dispatch({
                    type: 'SELECT_ELEMENT',
                    payload: { id: firstElementId },
                  });
                }, 100); // より短い遅延

                resolve({
                  message: `${elements.length}個の要素を追加し、「${firstElementText}」を選択しました`,
                  newSelectedElementId: firstElementId,
                });
              } else {
                resolve({
                  message: `${elements.length}個の要素を追加しました: ${elements.join(', ')}`,
                });
              }
            },
            onError: (errorMessage: string) => {
              reject(new Error(`要素の追加に失敗しました: ${errorMessage}`));
            },
          },
        });
      });
    }

    case 'SELECT_ELEMENT': {
      // targetTextまたはtargetIdから要素を見つけて選択
      const targetText = operation.targetText;
      const targetId = operation.targetId;

      if (targetText) {
        // より積極的な検索戦略
        let selectedElementFromText: { id: string } | null = null;

        // 複数回試行して要素を検索
        for (let attempt = 0; attempt < 5; attempt++) {
          selectedElementFromText = findElementByText(currentTab, targetText);
          if (selectedElementFromText) {
            break;
          }
          // 短い待機時間
          await new Promise((resolve) => setTimeout(resolve, 50));
        }

        if (selectedElementFromText) {
          dispatch({
            type: 'SELECT_ELEMENT',
            payload: { id: selectedElementFromText.id },
          });
          return {
            message: `要素「${targetText}」を選択しました`,
            newSelectedElementId: selectedElementFromText.id,
          };
        } else {
          // より詳細なデバッグ情報を提供
          // eslint-disable-next-line no-console
          console.log(`[Chat] SELECT_ELEMENT: 「${targetText}」が見つかりません`);
          return {
            message: `要素「${targetText}」が見つかりませんでした。状態更新を待機してください。`,
          };
        }
      } else if (targetId) {
        dispatch({
          type: 'SELECT_ELEMENT',
          payload: { id: targetId },
        });
        return {
          message: `要素を選択しました`,
          newSelectedElementId: targetId,
        };
      } else {
        return { message: '選択対象が指定されていません' };
      }
    }

    case 'UPDATE_TEXT': {
      dispatch({
        type: 'UPDATE_TEXT',
        payload: {
          id: effectiveSelectedElementId,
          index: 0,
          value: operation.newText || '',
        },
      });
      return { message: `テキストを「${operation.newText || ''}」に更新しました` };
    }

    case 'DELETE_ELEMENT': {
      dispatch({
        type: 'DELETE_ELEMENT',
      });
      return { message: '要素を削除しました' };
    }

    case 'ADD_SIBLING_ELEMENT': {
      dispatch({
        type: 'ADD_SIBLING_ELEMENT',
      });
      return { message: '兄弟要素を追加しました' };
    }

    case 'COPY_ELEMENT': {
      dispatch({
        type: 'COPY_ELEMENT',
      });
      return { message: '要素をコピーしました' };
    }

    case 'DROP_ELEMENT': {
      // "current"を解決するために、現在の状態を最新にする
      const resolvedTargetNodeId =
        operation.targetNodeId === 'current' ? effectiveSelectedElementId : operation.targetNodeId;

      // eslint-disable-next-line no-console
      console.log(
        `[Chat] DROP_ELEMENT: operation.targetNodeId=${operation.targetNodeId}, resolvedTargetNodeId=${resolvedTargetNodeId}, selectedElementId=${effectiveSelectedElementId}`,
      );

      // targetNodeIdが"current"の場合、状態更新を待機してから実行
      if (operation.targetNodeId === 'current' && resolvedTargetNodeId) {
        // 最新の状態を取得
        const latestState = getLatestState ? getLatestState() : currentTab;

        // 現在の階層データを確認
        if (latestState?.state.hierarchicalData) {
          const targetElement = findElementInHierarchy(
            latestState.state.hierarchicalData,
            resolvedTargetNodeId,
          );

          if (!targetElement) {
            // eslint-disable-next-line no-console
            console.error(
              `[Chat] DROP_ELEMENT: 新しい親 ${resolvedTargetNodeId} が階層データに見つかりません`,
            );

            // 階層データの詳細をログ出力
            const allElements = convertHierarchicalToArray(latestState.state.hierarchicalData);
            const allElementIds = allElements.map((el) => el.id);
            // eslint-disable-next-line no-console
            console.log(`[Chat] 利用可能な要素ID: ${allElementIds.join(', ')}`);

            throw new Error(`新しい親 current が見つかりません。ID: ${resolvedTargetNodeId}`);
          }
        }
      }

      // payloadのany型を厳密な型に修正
      interface DropElementPayload {
        id: string;
        targetNodeId: string | null;
        targetIndex?: number;
        direction?: 'left' | 'right' | 'none';
      }
      const payload: DropElementPayload = {
        id: effectiveSelectedElementId,
        targetNodeId: resolvedTargetNodeId || null,
      };

      // targetIndex が指定されている場合のみ追加
      if (operation.targetIndex !== undefined) {
        payload.targetIndex = operation.targetIndex;
      }

      // direction が指定されている場合のみ追加
      if (
        operation.direction !== undefined &&
        (operation.direction === 'left' ||
          operation.direction === 'right' ||
          operation.direction === 'none')
      ) {
        payload.direction = operation.direction;
      }

      dispatch({
        type: 'DROP_ELEMENT',
        payload,
      });
      return { message: '要素を移動しました' };
    }

    case 'ERROR': {
      throw new Error(operation.message || '操作エラーが発生しました');
    }

    default:
      throw new Error(`サポートされていない操作です: ${type}`);
  }
}

/**
 * テキストから要素を検索するヘルパー関数
 */
function findElementByText(currentTab: TabState, targetText: string): { id: string } | null {
  if (!currentTab.state.hierarchicalData) {
    return null;
  }

  // 階層構造を再帰的に検索
  function searchInNode(node: HierarchicalNode): { id: string } | null {
    // 現在のノードのテキストをチェック
    if (node.data?.texts?.includes(targetText)) {
      return { id: node.data.id };
    }

    // 子ノードを再帰的に検索
    if (node.children) {
      for (const child of node.children) {
        const result = searchInNode(child);
        if (result) {
          return result;
        }
      }
    }

    return null;
  }

  return searchInNode(currentTab.state.hierarchicalData.root);
}
