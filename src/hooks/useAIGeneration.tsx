'use client';

import { useCallback, useState } from 'react';
import {
  getSelectedElementsFromHierarchy,
  createElementsMapFromHierarchy,
} from '../utils/hierarchical/hierarchicalConverter';
import { useToast } from '../context/ToastContext';
import { ToastMessages } from '../constants/toastMessages';
import { generateWithGemini } from '../utils/api';
import { getApiKey, getModelType, getPrompt } from '../utils/storage';
import { getSystemPromptTemplate } from '../utils/storage/localStorageHelpers';
import { formatElementsForPrompt } from '../utils/element/elementHelpers';
import { createChatUserPromptOnly, getChatSystemPrompt } from '../config/chatSystemPrompt';
import { TabState } from '../types/tabTypes';
import { Element } from '../types/types';
import { Action } from '../types/actionTypes';
import { debugLog } from '../utils/debugLogHelpers';

interface UseAIGenerationParams {
  currentTab: TabState | undefined;
  dispatch: (action: Action) => void;
}

/**
 * AI生成機能に関するカスタムフック
 * 選択された要素に対してAIを使って子要素を生成する機能を提供します
 */
export function useAIGeneration({ currentTab, dispatch }: UseAIGenerationParams) {
  const { addToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // チャットアシスタント用: 複数操作対応版
  const handleAIClickForChat = useCallback(
    async (message: string): Promise<string> => {
      if (isLoading) {
        throw new Error('AI処理中です。しばらくお待ちください。');
      }

      setIsLoading(true);

      try {
        if (!currentTab) {
          throw new Error('タブが選択されていません。');
        }

        const apiKey = getApiKey();
        if (!apiKey) {
          throw new Error('APIキーが設定されていません。設定から登録してください。');
        }

        // 要素マップを作成
        const elementsMap = currentTab.state.hierarchicalData
          ? createElementsMapFromHierarchy(currentTab.state.hierarchicalData)
          : {};

        // 現在の構造をフォーマット
        const structureText = formatElementsForPrompt(
          elementsMap,
          Object.keys(elementsMap)[0] || '',
        );

        // 統一プロンプト生成関数を利用（システムプロンプト重複を避ける）
        const userPrompt = createChatUserPromptOnly({
          selectedElement: '', // 必要に応じて選択要素のテキストを渡す
          currentStructure: structureText,
          userInput: message,
        });
        const chatSystemPrompt = getChatSystemPrompt();
        const modelType = getModelType();

        debugLog(`[AI Chat] 複数操作API呼び出し開始`);
        debugLog(`[AI Chat] 送信プロンプト: ${userPrompt.substring(0, 200)}...`);
        const result = await generateWithGemini(
          userPrompt,
          apiKey,
          modelType,
          false,
          chatSystemPrompt,
        );
        debugLog(`[AI Chat] API結果: ${result?.length}文字`);
        debugLog(`[AI Chat] クリーンアップ後のレスポンス: ${result}`);

        if (!result || result.trim() === '') {
          throw new Error('AIから有効な結果が得られませんでした。');
        }

        // JSONレスポンスを解析
        const operationsResult = await executeMultipleOperations(result, elementsMap);

        return operationsResult;
      } catch (error: unknown) {
        debugLog(`[AI Chat] エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [currentTab, dispatch, isLoading],
  );

  // 複数操作を順次実行する関数
  const executeMultipleOperations = async (
    aiResponse: string,
    elementsMap: Record<string, Element>,
  ): Promise<string> => {
    try {
      debugLog(`[AI Chat] 生のレスポンス: ${aiResponse}`);

      // レスポンスをクリーンアップ
      const cleanedResponse = aiResponse.trim();

      // JSON部分を抽出（複数のパターンに対応）
      let jsonMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        // ```なしでJSONが含まれている場合
        jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonMatch[1] = jsonMatch[0];
        }
      }

      if (!jsonMatch) {
        debugLog(`[AI Chat] JSONフォーマットが見つからない、フォールバック処理実行`);
        return await executeSingleAddOperation(aiResponse, elementsMap);
      }

      debugLog(`[AI Chat] 抽出されたJSON: ${jsonMatch[1]}`);

      let operationsData;
      try {
        operationsData = JSON.parse(jsonMatch[1]);
      } catch (parseError) {
        debugLog(`[AI Chat] JSONパースエラー: ${parseError}`);
        return await executeSingleAddOperation(aiResponse, elementsMap);
      }

      // operations配列を取得（統一された形式）
      const operations = operationsData.operations;

      if (!operations || operations.length === 0) {
        debugLog(`[AI Chat] 操作が見つからない`);
        throw new Error('実行可能な操作が見つかりませんでした。');
      }

      debugLog(`[AI Chat] 実行する操作数: ${operations.length}`);

      const results: string[] = [];
      let currentSelectedElement = currentTab?.state.hierarchicalData
        ? getSelectedElementsFromHierarchy(currentTab.state.hierarchicalData)[0]
        : null;

      for (let i = 0; i < operations.length; i++) {
        const operation = operations[i];
        debugLog(`[AI Chat] 操作 ${i + 1}/${operations.length}: ${operation.type}`);

        const result = await executeOperation(
          operation,
          elementsMap,
          currentSelectedElement?.id || null,
        );
        results.push(result);

        // SELECT_ELEMENT操作の場合、選択状態を更新
        if (operation.type === 'SELECT_ELEMENT') {
          currentSelectedElement = await findElementByText(operation.targetText);
        }

        // 少し間を空けて次の操作を実行（UIの更新を待つため）
        if (i < operations.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return `${results.length}個の操作を実行しました！\n\n${results.map((result, index) => `${index + 1}. ${result}`).join('\n')}`;
    } catch (error) {
      debugLog(`[AI Chat] 操作解析エラー: ${error}`);
      // エラーの場合もフォールバック処理を試行
      return await executeSingleAddOperation(aiResponse, elementsMap);
    }
  };

  // 個別操作を実行する関数
  const executeOperation = async (
    operation: Record<string, unknown>,
    elementsMap: Record<string, Element>,
    currentSelected: string | null,
  ): Promise<string> => {
    switch (operation.type) {
      case 'ADD_ELEMENTS':
        return await executeAddElements(operation, currentSelected);

      case 'SELECT_ELEMENT':
        return await executeSelectElement(operation);

      case 'UPDATE_TEXT':
        return await executeUpdateText(operation, currentSelected);

      case 'DELETE_ELEMENT':
        return await executeDeleteElement(currentSelected);

      case 'ADD_SIBLING_ELEMENT':
        return await executeAddSiblingElement();

      case 'COPY_ELEMENT':
        return await executeCopyElement();

      case 'DROP_ELEMENT':
        return await executeDropElement(operation, currentSelected);

      case 'ERROR':
        throw new Error(String(operation.message) || '操作エラーが発生しました');

      default:
        return `未対応の操作: ${operation.type}`;
    }
  };

  // 要素追加操作
  const executeAddElements = async (
    operation: Record<string, unknown>,
    currentSelected: string | null,
  ): Promise<string> => {
    let targetElementId = operation.targetId as string;

    // "root"の場合は実際のルート要素IDを取得
    if (targetElementId === 'root' && currentTab?.state.hierarchicalData) {
      const elementsMap = createElementsMapFromHierarchy(currentTab.state.hierarchicalData);
      const rootKeys = Object.keys(elementsMap);
      if (rootKeys.length > 0) {
        targetElementId = rootKeys[0]; // 最初のルート要素を使用
      }
    }

    // targetIdが指定されていない場合は現在選択中の要素を使用
    if (!targetElementId && currentSelected) {
      targetElementId = currentSelected;
    }

    if (!targetElementId) {
      throw new Error('追加先の要素が特定できませんでした。要素を選択してから操作してください。');
    }

    const elements = (operation.elements as string[]) || [];
    if (elements.length === 0) {
      throw new Error('追加する要素が指定されていません。');
    }

    debugLog(`[AI Chat] 要素追加: ${targetElementId} に ${elements.join(', ')}`);

    dispatch({
      type: 'ADD_ELEMENTS_SILENT',
      payload: {
        targetNodeId: targetElementId,
        targetPosition: 'child',
        texts: elements,
        tentative: true,
        onError: (errorMessage: string) => {
          throw new Error(errorMessage);
        },
      },
    });

    return `${elements.length}個の要素を追加: ${elements.join(', ')}`;
  };

  // 要素選択操作
  const executeSelectElement = async (operation: Record<string, unknown>): Promise<string> => {
    const targetText = operation.targetText as string;
    if (!targetText) {
      throw new Error('選択する要素のテキストが指定されていません。');
    }

    // 要素を検索して選択
    const element = await findElementByText(targetText);
    if (!element) {
      throw new Error(`要素「${targetText}」が見つかりませんでした。`);
    }

    dispatch({
      type: 'SELECT_ELEMENT',
      payload: element.id,
    });

    return `要素「${targetText}」を選択しました`;
  };

  // テキスト更新操作
  const executeUpdateText = async (
    operation: Record<string, unknown>,
    currentSelected: string | null,
  ): Promise<string> => {
    const targetElementId = (operation.targetId as string) || currentSelected;
    const newText = operation.newText as string;

    if (!targetElementId) {
      throw new Error('更新する要素が特定できませんでした。');
    }

    if (!newText) {
      throw new Error('新しいテキストが指定されていません。');
    }

    dispatch({
      type: 'UPDATE_TEXT',
      payload: {
        id: targetElementId,
        index: 0, // 最初のテキストを更新
        value: newText,
      },
    });

    return `要素のテキストを「${newText}」に更新しました`;
  };

  // テキストで要素を検索する関数
  const findElementByText = async (targetText: string): Promise<Element | null> => {
    if (!currentTab?.state.hierarchicalData) {
      return null;
    }

    const findInHierarchy = (nodes: unknown): Element | null => {
      // HierarchicalStructureは配列ではなくオブジェクトの場合があるので対応
      const nodeArray = Array.isArray(nodes)
        ? nodes
        : Object.values(nodes as Record<string, unknown>);

      for (const node of nodeArray) {
        const nodeData = node as Element;
        if (nodeData.texts && nodeData.texts.some((text: string) => text.includes(targetText))) {
          return nodeData;
        }
        if ((node as Record<string, unknown>).children) {
          const found = findInHierarchy((node as Record<string, unknown>).children);
          if (found) return found;
        }
      }
      return null;
    };

    return findInHierarchy(currentTab.state.hierarchicalData);
  };

  // 従来の単一追加操作（フォールバック）
  const executeSingleAddOperation = async (
    result: string,
    _elementsMap: Record<string, Element>,
  ): Promise<string> => {
    const selectedElements = currentTab?.state.hierarchicalData
      ? getSelectedElementsFromHierarchy(currentTab.state.hierarchicalData)
      : [];
    const selectedElement = selectedElements[0];

    if (!selectedElement) {
      throw new Error(
        '要素が選択されていません。要素を選択してからAIアシスタントを使用してください。',
      );
    }

    const targetElementId = selectedElement.id;

    // 結果をクリーンアップ
    const cleanedResult = result.replace(/^\s*[\n\r]+|[\n\r]+\s*$/g, '').trim();

    let childNodes: string[] = [];

    // マークダウンのコードブロックを検出して処理
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = cleanedResult.match(codeBlockRegex);

    if (codeBlocks && codeBlocks.length > 0) {
      childNodes = codeBlocks.flatMap((block: string) => {
        return block
          .replace(/```.*\n?|```/g, '') // 言語指定付きのマークダウンにも対応
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0 && line !== '```'); // ```だけの行を除外
      });
    } else {
      // コードブロックがない場合は、テキスト全体を行ごとに分割して処理
      childNodes = cleanedResult
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0 && line !== '```'); // ```だけの行を除外
    }

    // 生成された要素が0件の場合
    if (childNodes.length === 0) {
      throw new Error('AIから有効な要素が生成されませんでした。');
    }

    // 処理した結果を要素として追加
    dispatch({
      type: 'ADD_ELEMENTS_SILENT',
      payload: {
        targetNodeId: targetElementId,
        targetPosition: 'child',
        texts: childNodes,
        tentative: true,
        onError: (errorMessage: string) => {
          debugLog(`[AI Chat] リデューサーエラー: ${errorMessage}`);
          throw new Error(errorMessage);
        },
      },
    });

    debugLog(`[AI Chat] 生成完了: ${childNodes.length}個の要素を追加`);
    return `${childNodes.length}個の要素を追加しました！\n追加された要素:\n${childNodes.map((node, index) => `${index + 1}. ${node}`).join('\n')}`;
  };

  const handleAIClick = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);

    try {
      if (!currentTab) {
        return;
      }

      // AI生成開始時点での選択要素を固定
      const selectedElements = currentTab.state.hierarchicalData
        ? getSelectedElementsFromHierarchy(currentTab.state.hierarchicalData)
        : [];
      const selectedElement = selectedElements[0];

      if (!selectedElement) {
        addToast(ToastMessages.noSelect);
        return;
      }

      // 生成開始時点での要素IDを固定
      const targetElementId = selectedElement.id;

      const decryptedApiKey = await getApiKey();

      if (!decryptedApiKey) {
        addToast(ToastMessages.noApiKey, 'warn');
        return;
      }

      const inputText = getPrompt();

      if (!inputText) {
        addToast(ToastMessages.noPrompt);
        return;
      }

      const elementsMap = currentTab.state.hierarchicalData
        ? createElementsMapFromHierarchy(currentTab.state.hierarchicalData)
        : {};
      const structureText = formatElementsForPrompt(elementsMap, targetElementId);

      // システムプロンプトをlocalStorageから取得
      const systemPrompt = getSystemPromptTemplate();

      debugLog(`[AI] systemPrompt: ${systemPrompt}`);
      debugLog(`[AI] structureText: ${structureText}`);
      debugLog(`[AI] inputText: ${inputText}`);

      // ユーザープロンプトを生成（元のSYSTEM_PROMPT_TEMPLATEに対応した形式）
      const userPrompt = `
[Current Structure]
\`\`\`
${structureText}
\`\`\`

[Input Information]
\`\`\`
${inputText}
\`\`\`
`;
      debugLog(`[AI] userPrompt: ${userPrompt.substring(0, 200)}...`);
      const modelType = getModelType();
      const result = await generateWithGemini(userPrompt, decryptedApiKey, modelType, true);
      debugLog(`[AI] Geminiレスポンス: ${result?.substring(0, 200)}...`);

      let childNodes: string[] = [];

      // 文字列の処理（generateWithGeminiは常に文字列を返す）
      const cleanedResult = result.replace(/^```/g, '').replace(/```$/g, '');

      // コードブロックが適切に存在する場合 (```で囲まれたもの)
      const codeBlocks = cleanedResult.match(/```[\s\S]*?```/g);

      if (codeBlocks && codeBlocks.length > 0) {
        // コードブロック形式のレスポンスを処理
        childNodes = codeBlocks.flatMap((block: string) => {
          return block
            .replace(/```.*\n?|```/g, '') // 言語指定付きのマークダウンにも対応
            .split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0 && line !== '```'); // ```だけの行を除外
        });
      } else {
        // コードブロックがない場合は、テキスト全体を行ごとに分割して処理
        childNodes = cleanedResult
          .split('\n')
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0 && line !== '```'); // ```だけの行を除外
      }

      // 生成された要素が0件の場合
      if (childNodes.length === 0) {
        addToast(ToastMessages.aiNoResults, 'info');
        return;
      }

      // 処理した結果を要素として追加
      dispatch({
        type: 'ADD_ELEMENTS_SILENT',
        payload: {
          targetNodeId: targetElementId,
          targetPosition: 'child',
          texts: childNodes,
          tentative: true,
          onError: (errorMessage: string) => {
            debugLog(`[AI] リデューサーエラー: ${errorMessage}`);
            addToast(errorMessage, 'warn');
          },
        },
      });

      debugLog(`[AI] 生成完了: ${childNodes.length}個の要素を追加`);
    } catch (error: unknown) {
      // ここは予期しないシステムエラーのみを処理（API呼び出しエラーなど）
      debugLog(`[AI] 予期しないエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      const message =
        error instanceof Error
          ? `予期しないエラーが発生しました: ${error.message}`
          : '予期しないエラーが発生しました';
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentTab, dispatch, addToast, isLoading]);

  // 要素削除操作
  const executeDeleteElement = async (currentSelected: string | null): Promise<string> => {
    if (!currentSelected) {
      throw new Error('削除する要素が選択されていません。');
    }

    dispatch({
      type: 'DELETE_ELEMENT',
    });

    return `要素を削除しました`;
  };

  // 兄弟要素追加操作
  const executeAddSiblingElement = async (): Promise<string> => {
    dispatch({
      type: 'ADD_SIBLING_ELEMENT',
    });

    return '新しい兄弟要素を追加しました';
  };

  // 要素コピー操作
  const executeCopyElement = async (): Promise<string> => {
    dispatch({
      type: 'COPY_ELEMENT',
    });

    return '選択された要素をコピーしました';
  };

  // 要素移動操作
  const executeDropElement = async (
    operation: Record<string, unknown>,
    currentSelected: string | null,
  ): Promise<string> => {
    const targetNodeId = operation.targetNodeId as string;
    const targetIndex = operation.targetIndex as number;
    const description = (operation.description as string) || '指定された位置';

    if (!currentSelected) {
      throw new Error('移動する要素が選択されていません。');
    }

    dispatch({
      type: 'DROP_ELEMENT',
      payload: {
        id: currentSelected,
        targetNodeId: targetNodeId,
        targetIndex: targetIndex,
        direction: (operation.direction as 'none' | 'right' | 'left') || 'none',
      },
    });

    return `要素を${description}に移動しました`;
  };

  return { handleAIClick, handleAIClickForChat, isLoading };
}
