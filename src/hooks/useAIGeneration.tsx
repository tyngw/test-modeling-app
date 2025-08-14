'use client';

import { useCallback, useState, useEffect, useRef } from 'react';
import {
  getSelectedElementsFromHierarchy,
  createElementsMapFromHierarchy,
} from '../utils/hierarchical/hierarchicalConverter';
import { useSuggestion } from '../context/SuggestionContext';
import { useToast } from '../context/ToastContext';
import { ToastMessages } from '../constants/toastMessages';
import { generateWithGemini, generateWithGeminiThread } from '../utils/api';
import { getApiKey, getModelType, getPrompt } from '../utils/storage';
import { getSystemPromptTemplate } from '../utils/storage/localStorageHelpers';
import { formatHierarchicalStructureForPrompt } from '../utils/element/elementHelpers';
import { createChatUserPromptOnly, getChatSystemPrompt } from '../config/chatSystemPrompt';
import { SUGGESTION_SYSTEM_PROMPT } from '../config/systemPrompt';
import { TabState } from '../types/tabTypes';
import { Element } from '../types/types';
import { Action } from '../types/actionTypes';
import { debugLog } from '../utils/debugLogHelpers';

interface UseAIGenerationParams {
  currentTab: TabState | undefined;
  dispatch: (action: Action) => void;
}

// スレッド管理用の型定義
interface ChatHistory {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// サジェスト状態管理用の型定義
interface SuggestionState {
  chatHistory: ChatHistory[];
  lastParentElementId: string | null;
  isActive: boolean;
  isExecuting: boolean; // サジェスト実行中フラグ
  contextInitialized: boolean; // コンテキスト初期化フラグ
  lastInputText: string | null; // 最後に送信したinputText
}

/**
 * AI生成機能に関するカスタムフック
 * 選択された要素に対してAIを使って子要素を生成する機能を提供します
 */
export function useAIGeneration({ currentTab, dispatch }: UseAIGenerationParams) {
  const { addToast } = useToast();
  const { isSuggestionEnabled } = useSuggestion();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestionState, setSuggestionState] = useState<SuggestionState>({
    chatHistory: [],
    lastParentElementId: null,
    isActive: false,
    isExecuting: false,
    contextInitialized: false,
    lastInputText: null,
  });

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

        // 現在の構造をフォーマット（階層構造から直接生成）
        const structureText = currentTab.state.hierarchicalData
          ? formatHierarchicalStructureForPrompt(currentTab.state.hierarchicalData)
          : '階層構造データがありません';

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

        // JSONレスポンスを解析（elementsMapが必要な場合は階層構造から生成）
        const elementsMap = currentTab.state.hierarchicalData
          ? createElementsMapFromHierarchy(currentTab.state.hierarchicalData)
          : {};
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
    _elementsMap: Record<string, Element>,
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

      const decryptedApiKey = getApiKey();

      if (!decryptedApiKey) {
        addToast(ToastMessages.noApiKey, 'warn');
        return;
      }

      const inputText = getPrompt();

      if (!inputText) {
        addToast(ToastMessages.noPrompt);
        return;
      }

      // 共通のコンテキスト初期化を実行
      await ensureContextInitialized(inputText);

      // 現在の構造をフォーマット（階層構造から直接生成）
      const structureText = currentTab.state.hierarchicalData
        ? formatHierarchicalStructureForPrompt(currentTab.state.hierarchicalData)
        : '階層構造データがありません';

      // システムプロンプトをlocalStorageから取得
      const systemPrompt = getSystemPromptTemplate();

      debugLog(`[AI] systemPrompt: ${systemPrompt}`);
      debugLog(`[AI] structureText: ${structureText}`);

      // コンテキスト初期化後は簡潔なプロンプトを使用
      const userPrompt = suggestionState.contextInitialized
        ? `[Current Structure]
\`\`\`
${structureText}
\`\`\`

選択された要素の子要素として、論理的に続くであろう要素を生成してください。
事前に送信した参考情報も考慮して、関連性の高い要素を提案してください。
各要素は1行ずつ出力してください。`
        : `[Current Structure]
\`\`\`
${structureText}
\`\`\`

[Input Information]
\`\`\`
${inputText}
\`\`\`

選択された要素の子要素として、論理的に続くであろう要素を生成してください。
入力情報も参考にして、関連性の高い要素を提案してください。
各要素は1行ずつ出力してください。`;

      debugLog(`[AI] userPrompt: ${userPrompt.substring(0, 200)}...`);
      debugLog(`[AI] コンテキスト初期化済み: ${suggestionState.contextInitialized}`);

      const modelType = getModelType();

      // コンテキスト初期化済みの場合はスレッド形式で呼び出し
      const result =
        suggestionState.contextInitialized && suggestionState.chatHistory.length > 0
          ? await generateWithGeminiThread(
              userPrompt,
              decryptedApiKey,
              modelType,
              suggestionState.chatHistory,
              systemPrompt,
              true, // forceJsonResponse
              true, // truncatePrompt
            ).then((response) => response.response)
          : await generateWithGemini(userPrompt, decryptedApiKey, modelType, true, systemPrompt);
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
  }, [currentTab, dispatch, addToast, isLoading, suggestionState]);

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

  // 兄弟ノードサジェスト機能
  const handleSiblingNodeSuggestion = useCallback(
    async (parentElementId: string, fromEndEditing = false): Promise<void> => {
      debugLog(
        `[Suggestion] handleSiblingNodeSuggestion開始: parentElementId=${parentElementId}, fromEndEditing=${fromEndEditing}`,
      );
      debugLog(
        `[Suggestion] 現在の状態 - isLoading: ${isLoading}, isExecuting: ${suggestionState.isExecuting}`,
      );

      // END_EDITING からの呼び出しの場合は、フラグをリセットしてから実行
      if (fromEndEditing && suggestionState.isExecuting) {
        debugLog('[Suggestion] END_EDITINGからの呼び出しのため、フラグをリセットして実行');
        setSuggestionState((prev) => ({ ...prev, isExecuting: false }));
        // 少し待ってから再実行
        setTimeout(() => {
          handleSiblingNodeSuggestion(parentElementId, false);
        }, 50);
        return;
      }

      if (isLoading || suggestionState.isExecuting) {
        debugLog('[Suggestion] 既にロード中またはサジェスト実行中のため、サジェストをスキップ');
        return;
      }

      setIsLoading(true);
      setSuggestionState((prev) => ({ ...prev, isExecuting: true }));

      try {
        if (!currentTab) {
          return;
        }

        const apiKey = getApiKey();
        if (!apiKey) {
          debugLog('[Suggestion] APIキーが設定されていません');
          return;
        }

        // 親要素が変わった場合はコンテキストをクリア
        const shouldClearContext = suggestionState.lastParentElementId !== parentElementId;

        if (shouldClearContext) {
          debugLog('[Suggestion] 親要素が変更されたためコンテキストをクリア');
          setSuggestionState((prev) => ({
            ...prev,
            chatHistory: [],
            lastParentElementId: parentElementId,
            isActive: true,
            isExecuting: true,
          }));
        }

        // 現在の構造をフォーマット
        const structureText = currentTab.state.hierarchicalData
          ? formatHierarchicalStructureForPrompt(currentTab.state.hierarchicalData)
          : '階層構造データがありません';

        // 親要素とその子要素の情報を抽出
        const parentElement = findElementById(parentElementId);
        const parentInfo = parentElement
          ? `親要素: ${parentElement.texts?.join(', ') || 'テキストなし'}`
          : '親要素情報が見つかりません';

        // 設定画面で設定されたinputTextを取得
        const inputText = getPrompt();

        // 共通のコンテキスト初期化を実行
        await ensureContextInitialized(inputText);

        // サジェスト用のプロンプトを生成（常に簡潔なプロンプトを使用）
        const suggestionPrompt = `現在の階層構造を分析して、適切な兄弟要素を提案してください。

${parentInfo}

[現在の構造]
\`\`\`
${structureText}
\`\`\`

最後に追加された要素の兄弟として、論理的に続くであろう要素を提案してください。
既存の要素と重複しないよう注意してください。
${suggestionState.contextInitialized ? '事前に送信した参考情報も考慮して、関連性の高い要素を提案してください。' : inputText ? '以下の参考情報も考慮して、関連性の高い要素を提案してください。' : ''}`;

        debugLog(
          `[Suggestion] プロンプト生成完了: コンテキスト初期化済み=${suggestionState.contextInitialized}`,
        );

        const modelType = getModelType();

        let result: string;
        let updatedHistory: ChatHistory[];

        // コンテキスト初期化後は、常に初期化済みの履歴を使用
        const useInitializedContext =
          suggestionState.contextInitialized && suggestionState.chatHistory.length > 0;

        if (useInitializedContext) {
          // コンテキスト初期化済みの場合はスレッド形式で呼び出し
          debugLog('[Suggestion] 初期化済みコンテキストを使用してAPI呼び出し');
          const response = await generateWithGeminiThread(
            suggestionPrompt,
            apiKey,
            modelType,
            suggestionState.chatHistory,
            SUGGESTION_SYSTEM_PROMPT,
            false,
          );
          result = response.response;
          updatedHistory = response.updatedHistory;
        } else if (shouldClearContext || suggestionState.chatHistory.length === 0) {
          // 初回またはコンテキストクリア時は通常のAPI呼び出し
          debugLog('[Suggestion] 初回API呼び出し（コンテキスト未初期化）');
          const response = await generateWithGeminiThread(
            suggestionPrompt,
            apiKey,
            modelType,
            [],
            SUGGESTION_SYSTEM_PROMPT,
            false,
          );
          result = response.response;
          updatedHistory = response.updatedHistory;
        } else {
          // その他の継続時はスレッド形式で呼び出し
          debugLog('[Suggestion] スレッド継続API呼び出し');
          const response = await generateWithGeminiThread(
            suggestionPrompt,
            apiKey,
            modelType,
            suggestionState.chatHistory,
            SUGGESTION_SYSTEM_PROMPT,
            false,
          );
          result = response.response;
          updatedHistory = response.updatedHistory;
        }

        // チャット履歴を更新
        setSuggestionState((prev) => ({
          ...prev,
          chatHistory: updatedHistory,
          lastParentElementId: parentElementId,
          isActive: true,
          isExecuting: true,
        }));

        // 結果を解析して兄弟要素として追加
        const suggestions = parseSuggestionResponse(result);

        if (suggestions.length > 0) {
          debugLog(`[Suggestion] ${suggestions.length}個の提案を生成: ${suggestions.join(', ')}`);

          // 現在選択されている要素を取得
          const selectedElements = getSelectedElementsFromHierarchy(
            currentTab.state.hierarchicalData,
          );
          const selectedElement = selectedElements[0];

          if (selectedElement) {
            // 選択された要素の兄弟要素として追加
            await addSuggestionsAsSiblings(selectedElement.id, suggestions);
          } else {
            debugLog('[Suggestion] 選択された要素がないため、サジェストをスキップ');
          }
        } else {
          debugLog('[Suggestion] 有効な提案が生成されませんでした');
        }
      } catch (error: unknown) {
        debugLog(`[Suggestion] エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      } finally {
        setIsLoading(false);
        // サジェスト実行完了後、短時間でフラグをクリア
        setTimeout(() => {
          setSuggestionState((prev) => ({ ...prev, isExecuting: false }));
          debugLog('[Suggestion] 実行フラグをクリアしました');
        }, 500); // 500ms後にフラグをクリア
      }
    },
    [currentTab, dispatch, isLoading, suggestionState],
  );

  // サジェストコンテキストをクリアする関数
  const clearSuggestionContext = useCallback(() => {
    setSuggestionState({
      chatHistory: [],
      lastParentElementId: null,
      isActive: false,
      isExecuting: false,
      contextInitialized: false,
      lastInputText: null,
    });
    debugLog('[Suggestion] コンテキストをクリアしました');
  }, []);

  // IDで要素を検索する関数
  const findElementById = useCallback(
    (elementId: string): Element | null => {
      if (!currentTab?.state.hierarchicalData) {
        return null;
      }

      const elementsMap = createElementsMapFromHierarchy(currentTab.state.hierarchicalData);
      return elementsMap[elementId] || null;
    },
    [currentTab],
  );

  // サジェストレスポンスを解析する関数
  const parseSuggestionResponse = (response: string): string[] => {
    try {
      // コードブロックから提案を抽出
      const codeBlockMatch = response.match(/```[\s\S]*?```/);
      if (codeBlockMatch) {
        const content = codeBlockMatch[0].replace(/```.*\n?|```/g, '').trim();

        return content
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('#'))
          .slice(0, 3); // 最大3個まで
      }

      // コードブロックがない場合は行ごとに分割
      return response
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith('//') && !line.startsWith('#'))
        .slice(0, 3);
    } catch (error) {
      debugLog(`[Suggestion] レスポンス解析エラー: ${error}`);
      return [];
    }
  };

  // 要素に子要素があるかチェックする関数
  const checkElementHasChildren = useCallback(
    (elementId: string, hierarchicalData: unknown): boolean => {
      if (!hierarchicalData) return false;

      const searchNode = (nodes: unknown): boolean => {
        if (!nodes) return false;

        const nodeArray = Array.isArray(nodes)
          ? nodes
          : Object.values(nodes as Record<string, unknown>);

        for (const node of nodeArray) {
          const hierarchicalNode = node as Record<string, unknown>;
          const element = (hierarchicalNode.data || hierarchicalNode) as Element;

          if (element.id === elementId) {
            return Boolean(
              hierarchicalNode.children &&
                Array.isArray(hierarchicalNode.children) &&
                (hierarchicalNode.children as unknown[]).length > 0,
            );
          }

          if (hierarchicalNode.children && Array.isArray(hierarchicalNode.children)) {
            const found = searchNode(hierarchicalNode.children);
            if (found !== false) return found; // falseでない場合は結果を返す
          }
        }

        return false;
      };

      return searchNode(hierarchicalData);
    },
    [],
  );

  // 親要素を検索する関数
  const findParentElement = useCallback(
    (elementId: string, elementsMap: Record<string, Element>): Element | null => {
      debugLog(`[EndEditingSuggestion] 親要素検索開始: elementId=${elementId}`);
      debugLog(`[EndEditingSuggestion] elementsMapのキー数: ${Object.keys(elementsMap).length}`);

      // 階層構造を再帰的に検索する関数
      const searchInHierarchy = (nodes: unknown, _parentElement?: Element): Element | null => {
        if (!nodes) return null;

        const nodeArray = Array.isArray(nodes)
          ? nodes
          : Object.values(nodes as Record<string, unknown>);

        for (const node of nodeArray) {
          const hierarchicalNode = node as Record<string, unknown>; // HierarchicalNode型として扱う
          const element = (hierarchicalNode.data || hierarchicalNode) as Element; // dataプロパティがある場合とない場合に対応

          debugLog(
            `[EndEditingSuggestion] 要素チェック: id=${element.id}, 子要素数=${(hierarchicalNode.children as unknown[])?.length || 0}`,
          );

          // 直接の子要素をチェック
          if (hierarchicalNode.children && Array.isArray(hierarchicalNode.children)) {
            for (const child of hierarchicalNode.children as Record<string, unknown>[]) {
              const childElement = (child.data || child) as Element;
              debugLog(
                `[EndEditingSuggestion] 子要素チェック: childId=${childElement.id}, 検索対象=${elementId}`,
              );
              if (childElement.id === elementId) {
                debugLog(`[EndEditingSuggestion] 親要素を発見: parentId=${element.id}`);
                return element;
              }
            }

            // 再帰的に子要素の中を検索
            const found = searchInHierarchy(hierarchicalNode.children, element);
            if (found) return found;
          }
        }

        return null;
      };

      // currentTabの階層構造から検索
      if (currentTab?.state.hierarchicalData) {
        const result = searchInHierarchy(currentTab.state.hierarchicalData);
        debugLog(`[EndEditingSuggestion] 階層構造検索結果: ${result ? result.id : 'なし'}`);
        return result;
      }

      // フォールバック: elementsMapから検索（この場合はchildrenプロパティがないので簡略化）
      debugLog('[EndEditingSuggestion] elementsMapからの検索はスキップ（階層構造が優先）');

      debugLog('[EndEditingSuggestion] 親要素が見つかりませんでした');
      return null;
    },
    [currentTab],
  );

  // サジェストを兄弟要素として追加する関数
  const addSuggestionsAsSiblings = useCallback(
    async (selectedElementId: string, suggestions: string[]): Promise<void> => {
      if (!currentTab?.state.hierarchicalData) {
        return;
      }

      debugLog(`[Suggestion] 兄弟要素として追加開始: 選択要素=${selectedElementId}`);

      // ADD_SIBLING_ELEMENTS_SILENTを使用して兄弟要素として追加
      dispatch({
        type: 'ADD_SIBLING_ELEMENTS_SILENT',
        payload: {
          targetNodeId: selectedElementId,
          position: 'after',
          texts: suggestions,
          tentative: true,
          onError: (errorMessage: string) => {
            debugLog(`[Suggestion] 兄弟要素追加エラー: ${errorMessage}`);
            // エラーの場合は子要素として追加を試行
            debugLog('[Suggestion] フォールバック: 子要素として追加');
            dispatch({
              type: 'ADD_ELEMENTS_SILENT',
              payload: {
                targetNodeId: selectedElementId,
                targetPosition: 'child',
                texts: suggestions,
                tentative: true,
                onError: (fallbackErrorMessage: string) => {
                  debugLog(`[Suggestion] フォールバック追加エラー: ${fallbackErrorMessage}`);
                },
              },
            });
          },
          onSuccess: (addedElementIds: string[]) => {
            debugLog(`[Suggestion] 兄弟要素追加成功: ${addedElementIds.join(', ')}`);
          },
        },
      });
    },
    [currentTab, dispatch],
  );

  // デバウンス用のタイマーRef
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // コンテキスト初期化関数
  const initializeContext = useCallback(
    async (inputText: string): Promise<void> => {
      debugLog('[Context] コンテキスト初期化を開始します');

      if (!currentTab?.state.hierarchicalData) {
        debugLog('[Context] hierarchicalDataが存在しません');
        return;
      }

      try {
        const apiKey = getApiKey();
        if (!apiKey) {
          debugLog('[Context] APIキーが設定されていません');
          return;
        }

        // 長いinputTextを分割して送信
        const chunks = splitTextIntoChunks(inputText, 8000); // 8000文字ずつ分割
        debugLog(`[Context] inputTextを${chunks.length}個のチャンクに分割しました`);
        debugLog(`[Context] 元のテキスト長: ${inputText.length}文字`);

        let contextHistory: ChatHistory[] = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          const isFirstChunk = i === 0;
          const isLastChunk = i === chunks.length - 1;

          debugLog(`[Context] チャンク ${i + 1}/${chunks.length}: 長さ=${chunk.length}文字`);
          debugLog(`[Context] チャンク ${i + 1} の先頭50文字: "${chunk.substring(0, 50)}..."`);

          const contextPrompt = isFirstChunk
            ? `以下の情報を今後のサジェスト生成の参考情報として記憶してください。${chunks.length > 1 ? `(${i + 1}/${chunks.length}部分)` : ''}

参考情報:
\`\`\`
${chunk}
\`\`\`

${isLastChunk ? 'この情報を基に、今後要素の編集完了時に適切なサジェストを生成してください。' : '続きの情報を次に送信します。'}`
            : `参考情報の続き(${i + 1}/${chunks.length}部分):

\`\`\`
${chunk}
\`\`\`

${isLastChunk ? 'これで参考情報の送信は完了です。この情報を基に、今後要素の編集完了時に適切なサジェストを生成してください。' : '続きの情報を次に送信します。'}`;

          debugLog(`[Context] チャンク ${i + 1}/${chunks.length} を送信中`);
          debugLog(
            `[Context] 送信するプロンプトの先頭200文字: "${contextPrompt.substring(0, 200)}..."`,
          );
          debugLog(`[Context] プロンプト全体の長さ: ${contextPrompt.length}文字`);

          const response = await generateWithGeminiThread(
            contextPrompt,
            apiKey,
            getModelType(),
            contextHistory,
            undefined, // customSystemPrompt
            false, // forceJsonResponse
            false, // truncatePrompt - 切り詰めを無効にする
          );

          contextHistory = response.updatedHistory;
          debugLog(`[Context] チャンク ${i + 1}/${chunks.length} の送信完了`);
        }

        // コンテキスト初期化完了
        setSuggestionState((prev) => ({
          ...prev,
          chatHistory: contextHistory,
          contextInitialized: true,
          lastInputText: inputText,
        }));

        debugLog('[Context] コンテキスト初期化が完了しました');
      } catch (error: unknown) {
        debugLog(
          `[Context] コンテキスト初期化エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    },
    [currentTab],
  );

  // 共通のコンテキスト初期化チェック関数
  const ensureContextInitialized = useCallback(
    async (inputText: string): Promise<void> => {
      // コンテキストが初期化されていない、またはinputTextが変更された場合は初期化
      if (!suggestionState.contextInitialized || suggestionState.lastInputText !== inputText) {
        if (inputText && inputText.trim().length > 0) {
          debugLog('[Context] 共通コンテキスト初期化を開始します');
          await initializeContext(inputText);
        }
      } else {
        debugLog('[Context] コンテキストは既に初期化済みです');
      }
    },
    [suggestionState.contextInitialized, suggestionState.lastInputText, initializeContext],
  );

  // テキストを指定した文字数で分割する関数
  const splitTextIntoChunks = useCallback((text: string, chunkSize: number): string[] => {
    const chunks: string[] = [];
    debugLog(
      `[splitTextIntoChunks] 分割開始: テキスト長=${text.length}, チャンクサイズ=${chunkSize}`,
    );

    for (let i = 0; i < text.length; i += chunkSize) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push(chunk);
      debugLog(
        `[splitTextIntoChunks] チャンク${chunks.length}: 開始位置=${i}, 長さ=${chunk.length}, 先頭20文字="${chunk.substring(0, 20)}..."`,
      );
    }

    debugLog(`[splitTextIntoChunks] 分割完了: ${chunks.length}個のチャンクを生成`);
    return chunks;
  }, []);

  // END_EDITING時にサジェストを実行する関数
  const handleEndEditingSuggestion = useCallback(async (): Promise<void> => {
    debugLog('[EndEditingSuggestion] handleEndEditingSuggestion関数が呼び出されました');

    // サジェスト機能が無効の場合はスキップ
    if (!isSuggestionEnabled) {
      debugLog('[EndEditingSuggestion] サジェスト機能が無効のため、スキップします');
      return;
    }

    // 既存のタイマーをクリア（デバウンス）
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debugLog('[EndEditingSuggestion] 既存のタイマーをクリアしました');
    }

    // デバウンス処理：500ms後に実行
    debounceTimerRef.current = setTimeout(async () => {
      debugLog('[EndEditingSuggestion] デバウンス後の実際の処理を開始します');
      debugLog(`[EndEditingSuggestion] 現在のisExecutingフラグ: ${suggestionState.isExecuting}`);

      // フラグが残っている場合は強制的にリセット（デバッグ用）
      if (suggestionState.isExecuting) {
        debugLog('[EndEditingSuggestion] フラグが残っているため、強制的にリセットします');
        setSuggestionState((prev) => ({ ...prev, isExecuting: false }));
        // 少し待ってから再実行
        setTimeout(async () => {
          debugLog('[EndEditingSuggestion] フラグリセット後、処理を再開します');
          await executeActualSuggestion();
        }, 100);
        return;
      }

      await executeActualSuggestion();

      async function executeActualSuggestion() {
        if (!currentTab?.state.hierarchicalData) {
          debugLog('[EndEditingSuggestion] hierarchicalDataが存在しません');
          return;
        }

        try {
          // フラグ設定は handleSiblingNodeSuggestion 内で行う
          debugLog('[EndEditingSuggestion] サジェスト処理を開始します（フラグ設定なし）');

          // 最後に編集された要素の親要素を特定
          const selectedElements = getSelectedElementsFromHierarchy(
            currentTab.state.hierarchicalData,
          );
          debugLog(`[EndEditingSuggestion] 選択された要素数: ${selectedElements.length}`);

          if (selectedElements.length === 0) {
            debugLog('[EndEditingSuggestion] 選択された要素がありません');
            return;
          }

          const selectedElement = selectedElements[0];
          debugLog(
            `[EndEditingSuggestion] 選択された要素: ${selectedElement.id}, テキスト: ${selectedElement.texts?.join(', ')}`,
          );

          // デバッグ用：階層構造の詳細をログ出力
          debugLog('[EndEditingSuggestion] 現在の階層構造:', currentTab.state.hierarchicalData);

          // 親要素を取得（選択された要素が子要素を持つ場合は、その親として使用）
          const elementsMap = createElementsMapFromHierarchy(currentTab.state.hierarchicalData);
          debugLog(
            `[EndEditingSuggestion] elementsMapの内容:`,
            Object.keys(elementsMap).map((key) => ({ id: key, texts: elementsMap[key].texts })),
          );

          // 選択された要素に子要素があるかチェック（階層構造から確認）
          const hasChildren = checkElementHasChildren(
            selectedElement.id,
            currentTab.state.hierarchicalData,
          );
          debugLog(`[EndEditingSuggestion] 選択された要素に子要素があるか: ${hasChildren}`);

          if (hasChildren) {
            // 子要素がある場合は、選択された要素を親として使用
            debugLog(
              `[EndEditingSuggestion] END_EDITING後のサジェスト開始: 親要素ID=${selectedElement.id}`,
            );

            // 少し遅延を入れてUIの更新を待つ
            setTimeout(() => {
              handleSiblingNodeSuggestion(selectedElement.id);
            }, 300);
          } else {
            // 子要素がない場合は、親要素を探して兄弟要素を追加
            const parentElement = findParentElement(selectedElement.id, elementsMap);
            debugLog(
              `[EndEditingSuggestion] 親要素検索結果: ${parentElement ? parentElement.id : 'なし'}`,
            );

            if (parentElement) {
              debugLog(
                `[EndEditingSuggestion] END_EDITING後のサジェスト開始: 親要素ID=${parentElement.id} (兄弟要素として追加)`,
              );

              // 即座に実行（遅延なし、END_EDITINGからの呼び出しフラグを設定）
              handleSiblingNodeSuggestion(parentElement.id, true);
            } else {
              // 親要素が見つからない場合は、選択された要素自体を親として使用（子要素を追加）
              debugLog(
                `[EndEditingSuggestion] 親要素が見つからないため、選択された要素に子要素を追加: ${selectedElement.id}`,
              );

              // 即座に実行（遅延なし、END_EDITINGからの呼び出しフラグを設定）
              handleSiblingNodeSuggestion(selectedElement.id, true);
            }

            // フラグクリアは handleSiblingNodeSuggestion 内で行う
          }
        } catch (error: unknown) {
          debugLog(
            `[EndEditingSuggestion] エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
          );
          // エラー時にもフラグをクリア
          setSuggestionState((prev) => ({ ...prev, isExecuting: false }));
        }
      } // executeActualSuggestion関数の終了
    }, 500); // 500msのデバウンス
  }, [
    currentTab,
    handleSiblingNodeSuggestion,
    checkElementHasChildren,
    findParentElement,
    suggestionState,
    isSuggestionEnabled,
  ]);

  // グローバルにサジェスト関数を登録（reducer内から呼び出すため）
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__handleEndEditingSuggestion =
        handleEndEditingSuggestion;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>).__handleEndEditingSuggestion;
      }
      // タイマーのクリーンアップ
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [handleEndEditingSuggestion]);

  return {
    handleAIClick,
    handleAIClickForChat,
    handleSiblingNodeSuggestion,
    clearSuggestionContext,
    handleEndEditingSuggestion,
    isLoading,
    suggestionState,
  };
}
