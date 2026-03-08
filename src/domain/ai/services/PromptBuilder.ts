// src/domain/ai/services/PromptBuilder.ts

import { PromptTemplates, renderPromptTemplate } from '../../../config/promptTemplates';
import { Element } from '../../element/models/Element';

/**
 * プロンプト構築を担当するドメインサービス
 */
export class PromptBuilder {
  /**
   * 要素生成用のプロンプトを構築
   */
  buildElementGenerationPrompt(
    selectedElement: Element,
    inputText: string,
    structureText: string,
    contextInitialized: boolean,
    promptTemplates: PromptTemplates,
  ): string {
    const selectedElementText = selectedElement.texts?.join(', ') || '';

    if (contextInitialized) {
      return this.buildContextualizedPrompt(selectedElementText, structureText, promptTemplates);
    }

    return this.buildFullPrompt(selectedElementText, inputText, structureText, promptTemplates);
  }

  /**
   * サジェスト用のプロンプトを構築
   */
  buildSuggestionPrompt(
    selectedElement: Element | null,
    parentElement: Element | null,
    inputText: string,
    structureText: string,
    contextInitialized: boolean,
    promptTemplates: PromptTemplates,
  ): string {
    const selectedElementInfo = selectedElement
      ? `現在選択されている要素: ${selectedElement.texts?.join(', ') || 'テキストなし'} (ID: ${selectedElement.id})`
      : '選択されている要素がありません';

    const parentInfo = parentElement
      ? `親要素: ${parentElement.texts?.join(', ') || 'テキストなし'}`
      : '親要素情報が見つかりません';

    const specificationSection = contextInitialized
      ? '（仕様書の詳細は事前に送信済みです。その情報を基に判断してください）'
      : inputText
        ? `\n仕様書:\n\`\`\`\n${inputText}\n\`\`\`\n`
        : '';

    return renderPromptTemplate(promptTemplates.user.suggestionGeneration, {
      specificationSection,
      selectedElementInfo,
      parentInfo,
      structureText,
      selectedElementLabel: selectedElement?.texts?.join(', ') || '',
    });
  }

  /**
   * チャット用のプロンプトを構築
   */
  buildChatPrompt(
    message: string,
    structureText: string,
    promptTemplates: PromptTemplates,
    selectedElement?: string,
  ): string {
    return renderPromptTemplate(promptTemplates.user.chatFallback, {
      selectedElementText: selectedElement || '',
      structureText,
      message,
    });
  }

  /**
   * 全生成用のプロンプトを構築
   */
  buildFullHierarchyGenerationPrompt(
    selectedElement: Element,
    inputText: string,
    structureText: string,
    selectedSubtreeText: string,
    promptTemplates: PromptTemplates,
  ): string {
    const selectedElementText = selectedElement.texts?.join(', ') || selectedElement.id;

    return renderPromptTemplate(promptTemplates.user.fullHierarchyGeneration, {
      selectedElementText,
      structureText,
      selectedSubtreeText: selectedSubtreeText || '対象サブツリー情報なし',
      inputText,
    });
  }

  /**
   * 全生成の再試行用プロンプトを構築
   */
  buildFullHierarchyRefinementPrompt(
    selectedElement: Element,
    currentDraftText: string,
    promptTemplates: PromptTemplates,
  ): string {
    const selectedElementText = selectedElement.texts?.join(', ') || selectedElement.id;

    return renderPromptTemplate(promptTemplates.user.fullHierarchyRefinement, {
      selectedElementText,
      currentDraftText: currentDraftText || 'ドラフトなし',
    });
  }

  /**
   * コンテキスト初期化用のプロンプトを構築
   */
  buildContextInitializationPrompt(
    inputText: string,
    chunkIndex: number,
    totalChunks: number,
    chunk: string,
    promptTemplates: PromptTemplates,
  ): string {
    const isFirstChunk = chunkIndex === 0;
    const isLastChunk = chunkIndex === totalChunks - 1;
    const chunkProgress = totalChunks > 1 ? `(${chunkIndex + 1}/${totalChunks}部分)` : '';
    const continuationMessage = isLastChunk
      ? 'この仕様書を基に、今後要素の編集完了時に仕様に沿った適切なサジェストを生成してください。仕様書で定義されている機能や項目を階層化するための提案をしてください。'
      : '続きの仕様書を次に送信します。';

    if (isFirstChunk) {
      return renderPromptTemplate(promptTemplates.user.contextInitializationFirstChunk, {
        inputText,
        chunk,
        chunkProgress,
        continuationMessage,
      });
    }

    return renderPromptTemplate(promptTemplates.user.contextInitializationNextChunk, {
      inputText,
      chunk,
      chunkProgress,
      continuationMessage: isLastChunk
        ? 'これで仕様書の送信は完了です。この仕様書を基に、今後要素の編集完了時に仕様に沿った適切なサジェストを生成してください。仕様書で定義されている機能や項目を階層化するための提案をしてください。'
        : continuationMessage,
    });
  }

  /**
   * コンテキスト初期化済みの場合の簡潔なプロンプト
   */
  private buildContextualizedPrompt(
    selectedElementText: string,
    structureText: string,
    promptTemplates: PromptTemplates,
  ): string {
    return renderPromptTemplate(promptTemplates.user.elementGenerationWithContext, {
      selectedElementText,
      structureText,
    });
  }

  /**
   * 完全な仕様書を含むプロンプト
   */
  private buildFullPrompt(
    selectedElementText: string,
    inputText: string,
    structureText: string,
    promptTemplates: PromptTemplates,
  ): string {
    return renderPromptTemplate(promptTemplates.user.elementGenerationWithSpecification, {
      selectedElementText,
      inputText,
      structureText,
    });
  }
}
