'use client';

import { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import {
  getSelectedElementsFromHierarchy,
  createElementsMapFromHierarchy,
} from '../utils/hierarchical/hierarchicalConverter';
import { useSuggestion } from '../context/SuggestionContext';
import { useToast } from '../context/ToastContext';
import { ToastMessages } from '../constants/toastMessages';
import { formatHierarchicalStructureForPrompt } from '../utils/element/elementHelpers';
import { formatSelectedSubtreeForPrompt } from '../utils/element/elementHelpers';
import { TabState } from '../types/tabTypes';
import { Element } from '../types/types';
import { Action } from '../types/actionTypes';
import { debugLog } from '../utils/debugLogHelpers';

// DDD層のインポート
import { AIGenerationService } from '../application/ai/AIGenerationService';
import { ElementOperationService } from '../application/element/ElementOperationService';
import { AIOperationAdapter } from '../presentation/adapters/AIOperationAdapter';
import { GeminiAIRepository } from '../infrastructure/ai/GeminiAIRepository';
import { LocalStorageConfigRepository } from '../infrastructure/config/LocalStorageConfigRepository';
import { Element as DomainElement } from '../domain/element/models/Element';

interface UseAIGenerationParams {
  currentTab: TabState | undefined;
  dispatch: (action: Action) => void;
}

/**
 * AI生成機能に関するカスタムフック（DDD版）
 * プレゼンテーション層として、ドメインロジックを応用サービスに委譲
 */
export function useAIGeneration({ currentTab, dispatch }: UseAIGenerationParams) {
  const { addToast } = useToast();
  const { isSuggestionEnabled } = useSuggestion();
  const [isLoading, setIsLoading] = useState(false);
  const [manualGenerationMode, setManualGenerationMode] = useState<'child' | 'full' | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // DI: 依存関係の注入（useMemoで最適化）
  const aiGenerationService = useMemo(() => {
    const aiRepository = new GeminiAIRepository();
    const configRepository = new LocalStorageConfigRepository();
    return new AIGenerationService(aiRepository, configRepository);
  }, []);

  const elementOperationService = useMemo(() => new ElementOperationService(), []);

  // 要素検索のヘルパー関数
  const findElementByText = useCallback(
    async (targetText: string): Promise<DomainElement | null> => {
      if (!currentTab?.state.hierarchicalData) {
        return null;
      }

      const findInHierarchy = (nodes: unknown): Element | null => {
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

      const element = findInHierarchy(currentTab.state.hierarchicalData);
      if (!element) return null;

      // レガシー型からドメイン型に変換
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
    },
    [currentTab],
  );

  // 操作実行アダプターの初期化（useMemoで最適化）
  const operationAdapter = useMemo(
    () => new AIOperationAdapter(elementOperationService, dispatch, findElementByText),
    [elementOperationService, dispatch, findElementByText],
  );

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

  // サジェストを子要素として追加する関数
  const addSuggestionsAsChildren = useCallback(
    async (selectedElementId: string, suggestions: string[]): Promise<void> => {
      if (!currentTab?.state.hierarchicalData) {
        return;
      }

      debugLog(`[Suggestion] 子要素として追加開始: 選択要素=${selectedElementId}`);

      dispatch({
        type: 'ADD_ELEMENTS_SILENT',
        payload: {
          targetNodeId: selectedElementId,
          targetPosition: 'child',
          texts: suggestions,
          tentative: true,
          onError: (errorMessage: string) => {
            debugLog(`[Suggestion] 子要素追加エラー: ${errorMessage}`);
          },
          onSuccess: (addedElementIds: string[]) => {
            debugLog(`[Suggestion] 子要素追加成功: ${addedElementIds.join(', ')}`);
          },
        },
      });
    },
    [currentTab, dispatch],
  );

  // サジェストを兄弟要素として追加する関数
  const addSuggestionsAsSiblings = useCallback(
    async (selectedElementId: string, suggestions: string[]): Promise<void> => {
      if (!currentTab?.state.hierarchicalData) {
        return;
      }

      debugLog(`[Suggestion] 兄弟要素として追加開始: 選択要素=${selectedElementId}`);

      dispatch({
        type: 'ADD_SIBLING_ELEMENTS_SILENT',
        payload: {
          targetNodeId: selectedElementId,
          position: 'after',
          texts: suggestions,
          tentative: true,
          onError: (errorMessage: string) => {
            debugLog(`[Suggestion] 兄弟要素追加エラー: ${errorMessage}`);
            // フォールバック: 子要素として追加
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

        // 現在の構造をフォーマット
        const structureText = currentTab.state.hierarchicalData
          ? formatHierarchicalStructureForPrompt(currentTab.state.hierarchicalData)
          : '階層構造データがありません';

        // 選択要素のテキストを取得
        const selectedElements = currentTab.state.hierarchicalData
          ? getSelectedElementsFromHierarchy(currentTab.state.hierarchicalData)
          : [];
        const selectedElement = selectedElements[0]?.texts?.join(', ') || '';

        debugLog(`[AI Chat] 複数操作API呼び出し開始`);

        // 応用サービスを使用してAI生成を実行
        const operations = await aiGenerationService.generateForChat(
          message,
          structureText,
          selectedElement,
        );

        debugLog(`[AI Chat] 生成された操作数: ${operations.length}`);

        // 操作を実行
        const elementsMap = currentTab.state.hierarchicalData
          ? createElementsMapFromHierarchy(currentTab.state.hierarchicalData)
          : {};

        const result = await operationAdapter.executeOperations(operations, elementsMap);

        return result;
      } catch (error: unknown) {
        debugLog(`[AI Chat] エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [currentTab, isLoading, aiGenerationService, operationAdapter],
  );

  // 従来の要素生成機能
  const handleAIClick = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setManualGenerationMode('child');

    try {
      if (!currentTab) {
        return;
      }

      // 選択要素を取得
      const selectedElements = currentTab.state.hierarchicalData
        ? getSelectedElementsFromHierarchy(currentTab.state.hierarchicalData)
        : [];
      const selectedElement = selectedElements[0];

      if (!selectedElement) {
        addToast(ToastMessages.noSelect);
        return;
      }

      // レガシー型からドメイン型に変換
      const domainElement = new DomainElement(
        selectedElement.id,
        selectedElement.texts,
        selectedElement.x,
        selectedElement.y,
        selectedElement.width,
        selectedElement.height,
        selectedElement.sectionHeights,
        selectedElement.editing,
        selectedElement.selected,
        selectedElement.visible,
        selectedElement.tentative,
        selectedElement.startMarker,
        selectedElement.endMarker,
        selectedElement.direction,
        selectedElement.tempParentId,
      );

      // 現在の構造をフォーマット
      const structureText = currentTab.state.hierarchicalData
        ? formatHierarchicalStructureForPrompt(currentTab.state.hierarchicalData)
        : '階層構造データがありません';
      const selectedSubtreeText = currentTab.state.hierarchicalData
        ? formatSelectedSubtreeForPrompt(currentTab.state.hierarchicalData, selectedElement.id)
        : '対象サブツリー情報がありません';

      debugLog(`[AI] 要素生成開始`);

      // 応用サービスを使用して要素生成
      const childNodes = await aiGenerationService.generateElements(
        domainElement,
        structureText,
        selectedSubtreeText,
      );

      if (childNodes.length === 0) {
        addToast(ToastMessages.aiNoResults, 'info');
        return;
      }

      // 要素を追加
      dispatch({
        type: 'ADD_ELEMENTS_SILENT',
        payload: {
          targetNodeId: selectedElement.id,
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
      debugLog(`[AI] 予期しないエラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      const message =
        error instanceof Error
          ? `予期しないエラーが発生しました: ${error.message}`
          : '予期しないエラーが発生しました';
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
      setManualGenerationMode(null);
    }
  }, [currentTab, dispatch, addToast, isLoading, aiGenerationService]);

  const handleAIFullGenerationClick = useCallback(async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setManualGenerationMode('full');

    try {
      if (!currentTab) {
        return;
      }

      const selectedElements = currentTab.state.hierarchicalData
        ? getSelectedElementsFromHierarchy(currentTab.state.hierarchicalData)
        : [];
      const selectedElement = selectedElements[0];

      if (!selectedElement) {
        addToast(ToastMessages.noSelect);
        return;
      }

      const domainElement = new DomainElement(
        selectedElement.id,
        selectedElement.texts,
        selectedElement.x,
        selectedElement.y,
        selectedElement.width,
        selectedElement.height,
        selectedElement.sectionHeights,
        selectedElement.editing,
        selectedElement.selected,
        selectedElement.visible,
        selectedElement.tentative,
        selectedElement.startMarker,
        selectedElement.endMarker,
        selectedElement.direction,
        selectedElement.tempParentId,
      );

      const structureText = currentTab.state.hierarchicalData
        ? formatHierarchicalStructureForPrompt(currentTab.state.hierarchicalData)
        : '階層構造データがありません';
      const selectedSubtreeText = currentTab.state.hierarchicalData
        ? formatSelectedSubtreeForPrompt(currentTab.state.hierarchicalData, selectedElement.id)
        : '対象サブツリー情報がありません';

      const generationResult = await aiGenerationService.generateFullHierarchy(
        domainElement,
        structureText,
        selectedSubtreeText,
      );

      if (generationResult.hierarchicalItems.length === 0) {
        addToast(ToastMessages.aiNoResults, 'info');
        return;
      }

      dispatch({
        type: 'REPLACE_CHILDREN_WITH_HIERARCHY',
        payload: {
          targetNodeId: selectedElement.id,
          rootText: generationResult.rootText,
          hierarchicalItems: generationResult.hierarchicalItems,
          onError: (message: string) => {
            debugLog(`[AI Full] リデューサーエラー: ${message}`);
            addToast(message, 'warn');
          },
          onSuccess: () => {
            addToast('AI全生成で配下の要素を更新しました。必要なら元に戻すで復元できます。', 'info');
          },
        },
      });
    } catch (error: unknown) {
      debugLog(
        `[AI Full] 予期しないエラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
      );
      const message =
        error instanceof Error
          ? `予期しないエラーが発生しました: ${error.message}`
          : '予期しないエラーが発生しました';
      addToast(message, 'error');
    } finally {
      setIsLoading(false);
      setManualGenerationMode(null);
    }
  }, [currentTab, dispatch, addToast, isLoading, aiGenerationService]);

  // ヘルパー関数（既存のロジックを保持）
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
            if (found !== false) return found;
          }
        }

        return false;
      };

      return searchNode(hierarchicalData);
    },
    [],
  );

  // 兄弟ノードサジェスト機能
  const handleSiblingNodeSuggestion = useCallback(
    async (parentElementId: string, fromEndEditing = false): Promise<void> => {
      debugLog(`[Suggestion] handleSiblingNodeSuggestion開始: parentElementId=${parentElementId}`);

      // END_EDITING からの呼び出しの場合の処理
      if (fromEndEditing && aiGenerationService.getSuggestionState().isExecuting) {
        debugLog('[Suggestion] END_EDITINGからの呼び出しのため、フラグをリセットして実行');
        aiGenerationService.setSuggestionExecuting(false);
        setTimeout(() => {
          handleSiblingNodeSuggestion(parentElementId, false);
        }, 50);
        return;
      }

      if (isLoading || aiGenerationService.getSuggestionState().isExecuting) {
        debugLog('[Suggestion] 既にロード中またはサジェスト実行中のため、サジェストをスキップ');
        return;
      }

      setIsLoading(true);
      aiGenerationService.setSuggestionExecuting(true);

      try {
        if (!currentTab) {
          return;
        }

        // 親要素が変わった場合はコンテキストをクリア
        const suggestionState = aiGenerationService.getSuggestionState();
        const shouldClearContext = suggestionState.lastParentElementId !== parentElementId;

        if (shouldClearContext) {
          debugLog('[Suggestion] 親要素が変更されたためコンテキストをクリア');
          aiGenerationService.updateParentElementId(parentElementId);
        }

        // 現在の構造をフォーマット
        const structureText = currentTab.state.hierarchicalData
          ? formatHierarchicalStructureForPrompt(currentTab.state.hierarchicalData)
          : '階層構造データがありません';

        // 選択された要素を取得
        const selectedElements = getSelectedElementsFromHierarchy(
          currentTab.state.hierarchicalData,
        );
        const selectedElement = selectedElements[0];

        // 親要素を取得
        const parentElement = findElementById(parentElementId);

        // ドメイン型に変換
        const domainSelectedElement = selectedElement
          ? new DomainElement(
              selectedElement.id,
              selectedElement.texts,
              selectedElement.x,
              selectedElement.y,
              selectedElement.width,
              selectedElement.height,
              selectedElement.sectionHeights,
              selectedElement.editing,
              selectedElement.selected,
              selectedElement.visible,
              selectedElement.tentative,
              selectedElement.startMarker,
              selectedElement.endMarker,
              selectedElement.direction,
              selectedElement.tempParentId,
            )
          : null;

        const domainParentElement = parentElement
          ? new DomainElement(
              parentElement.id,
              parentElement.texts,
              parentElement.x,
              parentElement.y,
              parentElement.width,
              parentElement.height,
              parentElement.sectionHeights,
              parentElement.editing,
              parentElement.selected,
              parentElement.visible,
              parentElement.tentative,
              parentElement.startMarker,
              parentElement.endMarker,
              parentElement.direction,
              parentElement.tempParentId,
            )
          : null;

        debugLog('[Suggestion] サジェスト生成開始');

        // 応用サービスを使用してサジェスト生成
        const suggestions = await aiGenerationService.generateSuggestions(
          domainSelectedElement,
          domainParentElement,
          structureText,
        );

        if (suggestions.length > 0) {
          debugLog(`[Suggestion] ${suggestions.length}個の提案を生成: ${suggestions.join(', ')}`);

          if (selectedElement) {
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
        setTimeout(() => {
          aiGenerationService.setSuggestionExecuting(false);
          debugLog('[Suggestion] 実行フラグをクリアしました');
        }, 500);
      }
    },
    [currentTab, isLoading, aiGenerationService, addSuggestionsAsSiblings, findElementById],
  );

  // サジェストコンテキストをクリアする関数
  const clearSuggestionContext = useCallback(() => {
    aiGenerationService.clearSuggestionContext();
    debugLog('[Suggestion] コンテキストをクリアしました');
  }, [aiGenerationService]);

  // END_EDITING時にサジェストを実行する関数
  const handleEndEditingSuggestion = useCallback(async (): Promise<void> => {
    debugLog('[EndEditingSuggestion] handleEndEditingSuggestion関数が呼び出されました');

    if (!isSuggestionEnabled) {
      debugLog('[EndEditingSuggestion] サジェスト機能が無効のため、スキップします');
      return;
    }

    // デバウンス処理
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      if (!currentTab?.state.hierarchicalData) {
        return;
      }

      try {
        const selectedElements = getSelectedElementsFromHierarchy(
          currentTab.state.hierarchicalData,
        );

        if (selectedElements.length === 0) {
          return;
        }

        const selectedElement = selectedElements[0];

        // 子要素があるかチェック
        const hasChildren = checkElementHasChildren(
          selectedElement.id,
          currentTab.state.hierarchicalData,
        );

        if (hasChildren) {
          // 子要素がある場合: 兄弟要素をサジェスト
          setTimeout(() => {
            handleSiblingNodeSuggestion(selectedElement.id);
          }, 300);
        } else {
          // 子要素がない場合（新規追加要素）: その要素の子要素をサジェスト生成
          debugLog(
            '[EndEditingSuggestion] 子要素がない新規要素のため、子要素をサジェストして追加します',
          );
          try {
            setIsLoading(true);
            aiGenerationService.setSuggestionExecuting(true);

            if (!currentTab) {
              return;
            }

            // 現在の構造をフォーマット
            const structureText = currentTab.state.hierarchicalData
              ? formatHierarchicalStructureForPrompt(currentTab.state.hierarchicalData)
              : '階層構造データがありません';

            // ドメイン型に変換
            const domainSelectedElement = new DomainElement(
              selectedElement.id,
              selectedElement.texts,
              selectedElement.x,
              selectedElement.y,
              selectedElement.width,
              selectedElement.height,
              selectedElement.sectionHeights,
              selectedElement.editing,
              selectedElement.selected,
              selectedElement.visible,
              selectedElement.tentative,
              selectedElement.startMarker,
              selectedElement.endMarker,
              selectedElement.direction,
              selectedElement.tempParentId,
            );

            debugLog('[EndEditingSuggestion] 子要素生成開始');

            // generateElements を使用して、選択要素の子要素を生成
            const childSuggestions = await aiGenerationService.generateElements(
              domainSelectedElement,
              structureText,
            );

            if (childSuggestions.length > 0) {
              debugLog(
                `[EndEditingSuggestion] ${childSuggestions.length}個の子要素の提案を生成: ${childSuggestions.join(', ')}`,
              );
              // 提案を子要素として追加
              await addSuggestionsAsChildren(selectedElement.id, childSuggestions);
            } else {
              debugLog('[EndEditingSuggestion] 子要素の提案が生成されませんでした');
            }
          } catch (error: unknown) {
            debugLog(
              `[EndEditingSuggestion] 子要素生成エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
            );
          } finally {
            setIsLoading(false);
            setTimeout(() => {
              aiGenerationService.setSuggestionExecuting(false);
              debugLog('[EndEditingSuggestion] 実行フラグをクリアしました');
            }, 500);
          }
        }
      } catch (error: unknown) {
        debugLog(
          `[EndEditingSuggestion] エラー: ${error instanceof Error ? error.message : '不明なエラー'}`,
        );
      }
    }, 500);
  }, [
    currentTab,
    handleSiblingNodeSuggestion,
    isSuggestionEnabled,
    checkElementHasChildren,
    aiGenerationService,
    addSuggestionsAsChildren,
  ]);

  // グローバルにサジェスト関数を登録
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as Record<string, unknown>).__handleEndEditingSuggestion =
        handleEndEditingSuggestion;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>).__handleEndEditingSuggestion;
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [handleEndEditingSuggestion]);

  return {
    handleAIClick,
    handleAIFullGenerationClick,
    handleAIClickForChat,
    handleSiblingNodeSuggestion,
    clearSuggestionContext,
    handleEndEditingSuggestion,
    isLoading,
    isChildGenerationLoading: isLoading && manualGenerationMode === 'child',
    isFullGenerationLoading: isLoading && manualGenerationMode === 'full',
    isAIBusy: isLoading,
    suggestionState: aiGenerationService.getSuggestionState(),
  };
}
