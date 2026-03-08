// src/application/ai/AIGenerationService.ts
//
// AI生成機能の応用サービス
//
// モデル・プロバイダーによらず Agentic Search を使用する:
//   Gemini   → GeminiAgentCaller（native function calling）
//   OpenAI互換 → OpenAIAgentCaller（/api/ai/generate プロキシ経由）
//
// チャット・要素生成・サジェストのすべてをエージェントループで処理し、
// 失敗時はフォールバックとして単発呼び出しを使用する。

import { Element } from '../../domain/element/models/Element';
import { AIOperation } from '../../domain/ai/models/AIOperation';
import { SuggestionContext } from '../../domain/ai/models/SuggestionContext';
import { AIResponseParser } from '../../domain/ai/services/AIResponseParser';
import { PromptBuilder } from '../../domain/ai/services/PromptBuilder';
import { IAIRepository, IConfigRepository } from '../../domain/ai/repositories/IAIRepository';
import { runAgentLoop, AgentContext, LLMCallerFn } from '../../domain/ai/agent';
import { createOpenAIAgentCaller } from '../../infrastructure/ai/OpenAIAgentCaller';
import { createGeminiAgentCaller } from '../../infrastructure/ai/GeminiAgentCaller';
import { AGENT_ELEMENT_GENERATION_PROMPT, AGENT_CHAT_PROMPT } from '../../config/agentSystemPrompt';
import { debugLog } from '../../utils/debugLogHelpers';

/** エージェントループの最大ステップ数 */
const AGENT_MAX_STEPS = 5;

/**
 * AI生成機能の応用サービス
 * すべての生成操作でエージェントループを使用する（Gemini / OpenAI互換どちらでも動作）
 */
export class AIGenerationService {
  private suggestionContext: SuggestionContext;
  private responseParser: AIResponseParser;
  private promptBuilder: PromptBuilder;

  constructor(
    private aiRepository: IAIRepository,
    private configRepository: IConfigRepository,
  ) {
    this.suggestionContext = new SuggestionContext();
    this.responseParser = new AIResponseParser();
    this.promptBuilder = new PromptBuilder();
  }

  // ---------------------------------------------------------------------------
  // 公開メソッド
  // ---------------------------------------------------------------------------

  /**
   * 要素生成を実行
   * ターゲット要素の子要素を仕様書を基に生成する
   */
  async generateElements(targetElement: Element, currentStructure: string): Promise<string[]> {
    const apiKey = this.configRepository.getApiKey();
    const prompt = this.configRepository.getPrompt();
    const systemPrompt = this.configRepository.getSystemPromptTemplate();
    const modelType = this.configRepository.getModelType();
    const apiProvider = this.configRepository.getApiProvider();

    if (!apiKey && apiProvider === 'gemini') {
      throw new Error('APIキーが設定されていません。Gemini API キーを設定から登録してください。');
    }
    if (!prompt) {
      throw new Error('プロンプトが設定されていません。');
    }

    // 選択要素に関連するセクションを抽出して、仕様書を事前加工
    const focusedPrompt = this.extractFocusedSpecification(prompt, targetElement.texts);

    const context = this.buildAgentContext(focusedPrompt, currentStructure, {
      id: targetElement.id,
      texts: targetElement.texts,
    });

    try {
      const callLLM = this.createAgentCaller(apiKey, modelType, apiProvider);
      const result = await runAgentLoop(
        this.resolveElementGenerationSystemPrompt(systemPrompt),
        `選択要素「${targetElement.texts[0] || targetElement.id}」の子要素を仕様書に基づいて生成してください。`,
        context,
        callLLM,
        { maxSteps: AGENT_MAX_STEPS },
      );

      if (result.finishReason === 'error' || !result.response) {
        debugLog('[AIGenerationService] 要素生成エージェントエラー: フォールバック実行');
        return this.generateElementsFallback(
          targetElement,
          currentStructure,
          prompt,
          apiKey,
          modelType,
          systemPrompt,
        );
      }

      return this.responseParser.extractElementsFromText(result.response);
    } catch (err) {
      debugLog('[AIGenerationService] 要素生成エージェント例外: フォールバック実行', err);
      return this.generateElementsFallback(
        targetElement,
        currentStructure,
        prompt,
        apiKey,
        modelType,
        systemPrompt,
      );
    }
  }

  /**
   * チャット形式でのAI生成を実行
   * ユーザーの自然言語指示をエージェントが解釈し操作コマンドに変換する
   */
  async generateForChat(
    message: string,
    currentStructure: string,
    selectedElement?: string,
  ): Promise<AIOperation[]> {
    const apiKey = this.configRepository.getApiKey();
    const prompt = this.configRepository.getPrompt();
    const modelType = this.configRepository.getModelType();
    const apiProvider = this.configRepository.getApiProvider();

    if (!apiKey && apiProvider === 'gemini') {
      throw new Error('APIキーが設定されていません。Gemini API キーを設定から登録してください。');
    }

    // 仕様書テキスト（prompt）をコンテキストに含める
    const context = this.buildAgentContext(
      prompt || '',
      currentStructure,
      selectedElement ? { id: 'current', texts: [selectedElement] } : undefined,
    );

    try {
      const callLLM = this.createAgentCaller(apiKey, modelType, apiProvider);
      const result = await runAgentLoop(AGENT_CHAT_PROMPT, message, context, callLLM, {
        maxSteps: AGENT_MAX_STEPS,
      });

      if (result.finishReason === 'error' || !result.response) {
        debugLog('[AIGenerationService] チャットエージェントエラー: フォールバック実行');
        return this.generateForChatFallback(
          message,
          currentStructure,
          selectedElement,
          apiKey,
          modelType,
        );
      }

      return this.responseParser.parseOperations(result.response);
    } catch (err) {
      debugLog('[AIGenerationService] チャットエージェント例外: フォールバック実行', err);
      return this.generateForChatFallback(
        message,
        currentStructure,
        selectedElement,
        apiKey,
        modelType,
      );
    }
  }

  /**
   * サジェスト生成を実行
   * 選択要素の兄弟要素を仕様書に基づいてサジェストする
   */
  async generateSuggestions(
    selectedElement: Element | null,
    parentElement: Element | null,
    currentStructure: string,
  ): Promise<string[]> {
    const apiKey = this.configRepository.getApiKey();
    const prompt = this.configRepository.getPrompt();
    const modelType = this.configRepository.getModelType();
    const apiProvider = this.configRepository.getApiProvider();

    if (!apiKey && apiProvider === 'gemini') {
      return [];
    }
    if (!prompt) return [];

    const context = this.buildAgentContext(
      prompt,
      currentStructure,
      selectedElement ? { id: selectedElement.id, texts: selectedElement.texts } : undefined,
      parentElement ? { id: parentElement.id, texts: parentElement.texts } : undefined,
    );

    const userPrompt = selectedElement
      ? `「${selectedElement.texts[0] || selectedElement.id}」の兄弟要素をサジェストしてください。`
      : '現在の階層に追加できる要素をサジェストしてください。';

    try {
      const callLLM = this.createAgentCaller(apiKey, modelType, apiProvider);
      const result = await runAgentLoop(
        this.resolveElementGenerationSystemPrompt(this.configRepository.getSystemPromptTemplate()),
        userPrompt,
        context,
        callLLM,
        {
          maxSteps: AGENT_MAX_STEPS,
        },
      );

      if (result.finishReason === 'error' || !result.response) {
        debugLog('[AIGenerationService] サジェストエージェントエラー: フォールバック実行');
        return this.generateSuggestionsFallback(
          selectedElement,
          parentElement,
          currentStructure,
          prompt,
          apiKey,
          modelType,
        );
      }

      return this.responseParser.parseSuggestions(result.response);
    } catch (err) {
      debugLog('[AIGenerationService] サジェストエージェント例外: フォールバック実行', err);
      return this.generateSuggestionsFallback(
        selectedElement,
        parentElement,
        currentStructure,
        prompt,
        apiKey,
        modelType,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 状態管理（後方互換性のために維持）
  // ---------------------------------------------------------------------------

  getSuggestionState() {
    return {
      chatHistory: this.suggestionContext.chatHistory,
      lastParentElementId: this.suggestionContext.lastParentElementId,
      isActive: this.suggestionContext.isActive,
      isExecuting: this.suggestionContext.isExecuting,
      contextInitialized: this.suggestionContext.contextInitialized,
      lastInputText: this.suggestionContext.lastInputText,
    };
  }

  clearSuggestionContext(): void {
    this.suggestionContext.clear();
  }

  setSuggestionExecuting(executing: boolean): void {
    this.suggestionContext.setExecuting(executing);
  }

  updateParentElementId(elementId: string): void {
    this.suggestionContext.updateParentElementId(elementId);
  }

  // ---------------------------------------------------------------------------
  // プライベートメソッド
  // ---------------------------------------------------------------------------

  /**
   * プロバイダーに応じた LLM Caller を生成する
   */
  private createAgentCaller(apiKey: string, modelType: string, apiProvider: string): LLMCallerFn {
    if (apiProvider === 'openai') {
      const endpoint = this.configRepository.getApiEndpoint();
      return createOpenAIAgentCaller(apiKey, modelType, endpoint);
    }
    // gemini（デフォルト）
    return createGeminiAgentCaller(apiKey, modelType);
  }

  /**
   * ツール実行に渡す AgentContext を構築する
   */
  private buildAgentContext(
    specificationText: string,
    structureText: string,
    selectedElement?: { id: string; texts: string[] },
    parentElement?: { id: string; texts: string[] },
  ): AgentContext {
    return { specificationText, structureText, selectedElement, parentElement };
  }

  /**
   * 要素生成エージェント用のシステムプロンプトを解決する
   * 設定画面で保存されたプロンプトがあればそれを優先し、未設定時は既定値を使う
   */
  private resolveElementGenerationSystemPrompt(systemPrompt: string): string {
    const trimmedSystemPrompt = systemPrompt.trim();
    return trimmedSystemPrompt.length > 0 ? trimmedSystemPrompt : AGENT_ELEMENT_GENERATION_PROMPT;
  }

  /**
   * 選択要素に関連するセクションを抽出して、仕様書を事前加工する
   * エージェント検索の精度を向上させるため、関連セクションを優先配置
   */
  private extractFocusedSpecification(fullSpec: string, selectedTexts: string[]): string {
    if (!fullSpec || !selectedTexts || selectedTexts.length === 0) return fullSpec;

    const targetText = selectedTexts[0].toLowerCase();

    // 見出し（#）またはマーク（≣）で分割
    const sections = fullSpec.split(/\n(?=#{1,6}\s|≣\s)/);

    // 各セクションをスコアリング
    const scored = sections.map((section) => {
      const lowerSection = section.toLowerCase();
      // 見出し行
      const firstLine = section.split('\n')[0];
      const isHeading = firstLine.startsWith('#') || firstLine.startsWith('≣');

      let score = 0;
      // 見出しに対象テキストが含まれたら大幅加点
      if (isHeading && lowerSection.includes(targetText)) score += 100;
      // セクション内に対象テキストが含まれたら加点
      if (lowerSection.includes(targetText)) score += 10;
      // 対象テキストの各単語の出現によるスコアリング
      const words = targetText.split(/\s+/).filter((w) => w.length > 2);
      for (const word of words) {
        const matches = lowerSection.match(new RegExp(word, 'g'));
        if (matches) score += matches.length;
      }

      return { text: section, score };
    });

    // 関連度の高いセクションを前に配置
    const sorted = scored.sort((a, b) => b.score - a.score);

    if (sorted.some((s) => s.score > 0)) {
      return sorted
        .map((s) => s.text)
        .filter((s) => s.trim().length > 0)
        .join('\n\n');
    }

    return fullSpec;
  }

  // ---------------------------------------------------------------------------
  // フォールバック（エージェント失敗時の単発呼び出し）
  // ---------------------------------------------------------------------------

  private async generateElementsFallback(
    targetElement: Element,
    currentStructure: string,
    prompt: string,
    apiKey: string,
    modelType: string,
    systemPrompt: string,
  ): Promise<string[]> {
    // 関連セクションに仕様書を事前加工
    const focusedPrompt = this.extractFocusedSpecification(prompt, targetElement.texts);

    const userPrompt = this.promptBuilder.buildElementGenerationPrompt(
      targetElement,
      focusedPrompt,
      currentStructure,
      false,
    );
    const result = await this.aiRepository.generateSingle(
      userPrompt,
      apiKey,
      modelType,
      true,
      systemPrompt,
    );
    return this.responseParser.extractElementsFromText(result);
  }

  private async generateForChatFallback(
    message: string,
    currentStructure: string,
    selectedElement: string | undefined,
    apiKey: string,
    modelType: string,
  ): Promise<AIOperation[]> {
    const userPrompt = this.promptBuilder.buildChatPrompt(
      message,
      currentStructure,
      selectedElement,
    );
    const result = await this.aiRepository.generateSingle(userPrompt, apiKey, modelType, true);
    return this.responseParser.parseOperations(result);
  }

  private async generateSuggestionsFallback(
    selectedElement: Element | null,
    parentElement: Element | null,
    currentStructure: string,
    prompt: string,
    apiKey: string,
    modelType: string,
  ): Promise<string[]> {
    const suggestionPrompt = this.promptBuilder.buildSuggestionPrompt(
      selectedElement,
      parentElement,
      prompt,
      currentStructure,
      false,
    );
    const response = await this.aiRepository.generateWithThread(
      suggestionPrompt,
      apiKey,
      modelType,
      [],
      undefined,
      true,
    );
    return this.responseParser.parseSuggestions(response.response);
  }
}
