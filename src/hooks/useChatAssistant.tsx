import { useCallback, useState } from 'react';
import { useToast } from '../context/ToastContext';
import { generateWithGemini } from '../utils/api';
import { getApiKey, getModelType } from '../utils/storage';
import { createChatUserPrompt } from '../config/chatSystemPrompt';
import {
  formatElementsForPrompt,
  formatHierarchicalStructureForPrompt,
} from '../utils/element/elementHelpers';
import {
  getSelectedElementsFromHierarchy,
  createElementsMapFromHierarchy,
} from '../utils/hierarchical/hierarchicalConverter';
import { TabState } from '../types/tabTypes';
import { Action } from '../types/actionTypes';
import { MarkerType, DirectionType } from '../types/types';

interface UseChatAssistantParams {
  currentTab: TabState | undefined;
  dispatch: (action: Action) => void;
}

interface ChatOperation {
  operation: string;
  action: string;
  data: {
    texts?: string[];
    tentative?: boolean;
    index?: number;
    value?: string;
    startMarker?: MarkerType;
    endMarker?: MarkerType;
    targetNodeId?: string;
    targetIndex?: number;
    direction?: DirectionType;
    description?: string;
    errorType?: string;
    message?: string;
  };
  explanation: string;
}

/**
 * チャットアシスタント機能用のカスタムフック
 * ユーザーの指示に基づいて選択された要素に対して操作を実行
 */
export function useChatAssistant({ currentTab, dispatch }: UseChatAssistantParams) {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleChatMessage = useCallback(
    async (userInput: string) => {
      if (isLoading) {
        throw new Error('処理中です。しばらくお待ちください。');
      }

      setIsLoading(true);

      try {
        if (!currentTab) {
          throw new Error('アクティブなタブがありません。');
        }

        // 選択された要素を取得
        const selectedElements = currentTab.state.hierarchicalData
          ? getSelectedElementsFromHierarchy(currentTab.state.hierarchicalData)
          : [];

        if (selectedElements.length === 0) {
          throw new Error('要素が選択されていません。操作する要素を選択してください。');
        }

        const selectedElement = selectedElements[0];
        const selectedElementText = selectedElement.texts?.[0] || 'テキストなし';

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

        // チャットアシスタント用のプロンプトを作成
        const chatPrompt = createChatUserPrompt({
          selectedElement: selectedElementText,
          currentStructure: fullStructure,
          userInput,
        });

        // eslint-disable-next-line no-console
        console.log('[Chat] リクエスト:', {
          selectedElement: selectedElementText,
          instruction: userInput,
        });

        // デバッグ用：プロンプト全体をログ出力
        // eslint-disable-next-line no-console
        console.log('[Chat] プロンプト全体:', chatPrompt);

        // AI に指示を送信
        const modelType = getModelType();
        // AIレスポンスはstringまたはRecord<string, unknown>型で受け取る
        const result = await generateWithGemini(chatPrompt, decryptedApiKey, modelType);

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

          // JSON レスポンスを解析
          let operationData: ChatOperation;
          try {
            operationData = JSON.parse(cleanedResult);
          } catch (parseError) {
            // eslint-disable-next-line no-console
            console.log('[Chat] JSONパースエラー:', {
              error: parseError,
              originalResponse: result,
              cleanedResponse: result.replace(/```json\s*|```\s*/g, '').trim(),
            });
            throw new Error('AIからの応答を解析できませんでした。再度お試しください。');
          }

          // 操作を実行
          await executeOperation(operationData, selectedElement.id, dispatch);

          // eslint-disable-next-line no-console
          console.log('[Chat] 結果:', {
            operation: operationData.operation,
            explanation: operationData.explanation,
          });
          addToast(operationData.explanation, 'info');
        } else if (typeof result === 'object' && result !== null) {
          // object型として処理
          // eslint-disable-next-line no-console
          console.log('[Chat] オブジェクトレスポンス:', result);
        } else {
          // nullや予期しない型のエラー処理
          throw new Error('予期しないレスポンスの型です');
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';
        // eslint-disable-next-line no-console
        console.log('[Chat] エラー:', errorMessage);
        addToast(errorMessage, 'error');
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [currentTab, dispatch, addToast, isLoading],
  );

  return { handleChatMessage, isLoading };
}

/**
 * AIからの指示に基づいて実際の操作を実行
 */
async function executeOperation(
  operation: ChatOperation,
  selectedElementId: string,
  dispatch: (action: Action) => void,
): Promise<void> {
  const { action, data } = operation;

  switch (action) {
    case 'ADD_ELEMENTS_SILENT':
      dispatch({
        type: 'ADD_ELEMENTS_SILENT',
        payload: {
          targetNodeId: selectedElementId,
          targetPosition: 'child',
          texts: data.texts || [],
          tentative: data.tentative || false,
          onError: (errorMessage: string) => {
            throw new Error(`要素の追加に失敗しました: ${errorMessage}`);
          },
        },
      });
      break;

    case 'UPDATE_TEXT':
      dispatch({
        type: 'UPDATE_TEXT',
        payload: {
          id: selectedElementId,
          index: data.index || 0,
          value: data.value || '',
        },
      });
      break;

    case 'DELETE_ELEMENT':
      dispatch({
        type: 'DELETE_ELEMENT',
      });
      break;

    case 'UPDATE_START_MARKER':
      if (data.startMarker) {
        dispatch({
          type: 'UPDATE_START_MARKER',
          payload: {
            id: selectedElementId,
            startMarker: data.startMarker,
          },
        });
      }
      break;

    case 'UPDATE_END_MARKER':
      if (data.endMarker) {
        dispatch({
          type: 'UPDATE_END_MARKER',
          payload: {
            id: selectedElementId,
            endMarker: data.endMarker,
          },
        });
      }
      break;

    case 'DROP_ELEMENT': {
      // targetNodeId が指定されている場合はそのまま使用
      // 指定されていない場合は、現在の構造から推測を試みる
      let targetNodeId: string | null = null;
      if (data.targetNodeId !== undefined) {
        targetNodeId = data.targetNodeId;
      } else {
        // ルート要素に移動する場合
        targetNodeId = null;
      }

      // payloadのany型を厳密な型に修正
      interface DropElementPayload {
        id: string;
        targetNodeId: string | null;
        targetIndex?: number;
        direction?: string;
      }
      const payload: DropElementPayload = {
        id: selectedElementId,
        targetNodeId: targetNodeId,
      };

      // targetIndex が指定されている場合のみ追加
      if (data.targetIndex !== undefined) {
        payload.targetIndex = data.targetIndex;
      }

      // direction が指定されている場合のみ追加
      if (data.direction !== undefined) {
        payload.direction = data.direction;
      }

      dispatch({
        type: 'DROP_ELEMENT',
        payload,
      });
      break;
    }

    case 'SHOW_ERROR':
      // エラー処理：ログ出力とメッセージ表示
      // eslint-disable-next-line no-console
      console.log('[Chat] AIエラー:', data);
      throw new Error(data.message || '操作を実行できませんでした');

    default:
      throw new Error(`サポートされていない操作です: ${action}`);
  }
}
