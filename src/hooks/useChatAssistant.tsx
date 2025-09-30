'use client';

import { useCallback, useState, useMemo } from 'react';
import { debugLog } from '../utils/debugLogHelpers';
import { formatHierarchicalStructureForPrompt } from '../utils/element/elementHelpers';
import {
  getSelectedElementsFromHierarchy,
  createElementsMapFromHierarchy,
  convertHierarchicalToArray,
} from '../utils/hierarchical/hierarchicalConverter';
import { TabState } from '../types/tabTypes';
import { Action } from '../types/actionTypes';
import { Element } from '../types/types';

// DDD層のインポート
import { ChatAssistantService } from '../application/chat/ChatAssistantService';
import { ChatOperationService } from '../domain/chat/services/ChatOperationService';
import { ChatOperationAdapter } from '../presentation/adapters/ChatOperationAdapter';
import { GeminiAIRepository } from '../infrastructure/ai/GeminiAIRepository';
import { LocalStorageConfigRepository } from '../infrastructure/config/LocalStorageConfigRepository';
import { Element as DomainElement } from '../domain/element/models/Element';

interface UseChatAssistantParams {
  currentTab: TabState | undefined;
  dispatch: (action: Action) => void;
  getLatestState?: () => TabState | undefined;
}

/**
 * チャットアシスタント機能用のカスタムフック（DDD版）
 * プレゼンテーション層として、ドメインロジックを応用サービスに委譲
 */
export function useChatAssistant({ currentTab, dispatch, getLatestState }: UseChatAssistantParams) {
  const [isLoading, setIsLoading] = useState(false);

  // DI: 依存関係の注入（useMemoで最適化）
  const chatAssistantService = useMemo(() => {
    const aiRepository = new GeminiAIRepository();
    const configRepository = new LocalStorageConfigRepository();
    const chatOperationService = new ChatOperationService();
    return new ChatAssistantService(aiRepository, configRepository, chatOperationService);
  }, []);

  // 要素検索のヘルパー関数
  const findElementByText = useCallback(
    async (targetText: string): Promise<DomainElement | null> => {
      if (!currentTab?.state.hierarchicalData) {
        return null;
      }

      const allElements = convertHierarchicalToArray(currentTab.state.hierarchicalData);

      // 完全一致検索
      let found = allElements.find(
        (element) => element.texts && element.texts.some((text: string) => text === targetText),
      );

      if (found) {
        return convertToDomainElement(found);
      }

      // 部分一致検索
      found = allElements.find(
        (element) =>
          element.texts && element.texts.some((text: string) => text.includes(targetText)),
      );

      if (found) {
        return convertToDomainElement(found);
      }

      // 大文字小文字を無視した検索
      found = allElements.find(
        (element) =>
          element.texts &&
          element.texts.some((text: string) =>
            text.toLowerCase().includes(targetText.toLowerCase()),
          ),
      );

      return found ? convertToDomainElement(found) : null;
    },
    [currentTab],
  );

  // レガシー型からドメイン型への変換ヘルパー
  const convertToDomainElement = useCallback((element: Element): DomainElement => {
    return new DomainElement(
      element.id,
      element.texts,
      element.x,
      element.y,
      element.width,
      element.height,
      element.sectionHeights,
      element.editing,
      element.selected,
      element.visible,
      element.tentative,
      element.startMarker,
      element.endMarker,
      element.direction,
      element.tempParentId,
    );
  }, []);

  // 操作実行アダプターの初期化（useMemoで最適化）
  const operationAdapter = useMemo(
    () => new ChatOperationAdapter(dispatch, findElementByText),
    [dispatch, findElementByText],
  );

  const handleChatMessage = useCallback(
    async (userInput: string): Promise<string> => {
      if (isLoading) {
        throw new Error('処理中です。しばらくお待ちください。');
      }

      setIsLoading(true);

      try {
        if (!currentTab) {
          throw new Error('アクティブなタブがありません。');
        }

        // 選択された要素を取得（なければ最初の要素を自動選択）
        const selectedElements = currentTab.state.hierarchicalData
          ? getSelectedElementsFromHierarchy(currentTab.state.hierarchicalData)
          : [];

        let selectedElement: DomainElement | null = null;

        if (selectedElements.length === 0) {
          // 選択要素がない場合は階層データから最初の要素を自動選択
          const elementsMap = currentTab.state.hierarchicalData
            ? createElementsMapFromHierarchy(currentTab.state.hierarchicalData)
            : {};
          const firstId = Object.keys(elementsMap)[0];
          const firstElement = elementsMap[firstId];
          selectedElement = firstElement ? convertToDomainElement(firstElement) : null;
        } else {
          selectedElement = convertToDomainElement(selectedElements[0]);
        }

        // 現在の構造をフォーマット
        const currentStructure = currentTab.state.hierarchicalData
          ? formatHierarchicalStructureForPrompt(currentTab.state.hierarchicalData)
          : '階層構造データがありません';

        debugLog('[ChatAssistant] リクエスト開始:', {
          selectedElement: selectedElement?.texts[0] || '未選択',
          instruction: userInput,
          structureLength: currentStructure.length,
        });

        // 応用サービスを使用してチャット操作を生成
        const operations = await chatAssistantService.generateChatOperations(
          userInput,
          selectedElement,
          currentStructure,
        );

        debugLog(`[ChatAssistant] 生成された操作数: ${operations.length}`);

        // 操作を実行
        const result = await operationAdapter.executeOperations(
          operations,
          currentTab,
          getLatestState,
        );

        return result;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '不明なエラーが発生しました';

        debugLog('[ChatAssistant] エラー詳細:', {
          message: errorMessage,
          error: error,
          timestamp: new Date().toISOString(),
        });

        // ユーザーフレンドリーなエラーメッセージに変換
        const friendlyMessage = chatAssistantService.createFriendlyErrorMessage(
          error instanceof Error ? error : new Error(errorMessage),
        );

        throw new Error(friendlyMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentTab,
      isLoading,
      chatAssistantService,
      operationAdapter,
      getLatestState,
      convertToDomainElement,
    ],
  );

  return { handleChatMessage, isLoading };
}
