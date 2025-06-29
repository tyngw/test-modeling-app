'use client';

import { useCallback, useState } from 'react';
import { getAllElementsFromHierarchy } from '../utils/hierarchical/hierarchicalConverter';
import { useToast } from '../context/ToastContext';
import { ToastMessages } from '../constants/toastMessages';
import { generateWithGemini } from '../utils/api';
import { getApiKey, getModelType, getPrompt } from '../utils/storage';
import { formatElementsForPrompt } from '../utils/element';
import { createUserPrompt } from '../constants/promptHelpers';
import { TabState } from '../types/tabTypes';
import { Action } from '../types/actionTypes';
import { Element } from '../types/types';
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
      const allElements = currentTab.state.hierarchicalData
        ? getAllElementsFromHierarchy(currentTab.state.hierarchicalData)
        : [];
      const selectedElement = allElements.find((el): el is Element => {
        const element = el as Element;
        return element.selected;
      });

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

      // allElementsをElementsMapに変換
      const elementsMap = allElements.reduce(
        (acc, element) => {
          acc[element.id] = element;
          return acc;
        },
        {} as Record<string, Element>,
      );

      const structureText = formatElementsForPrompt(elementsMap, targetElementId);

      // ユーザープロンプト（実際のデータ）を作成
      const userPrompt = createUserPrompt({ structureText, inputText });

      // AI生成開始ログ
      debugLog(
        `[AI] 生成開始: 対象要素="${selectedElement.texts?.[0] || 'なし'}", プロンプト="${inputText}"`,
      );

      const modelType = getModelType();
      const result = await generateWithGemini(userPrompt, decryptedApiKey, modelType);

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

  return { handleAIClick, isLoading };
}
