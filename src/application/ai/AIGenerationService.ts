// src/application/ai/AIGenerationService.ts

import { Element } from '../../domain/element/models/Element';
import { AIOperation } from '../../domain/ai/models/AIOperation';
import { SuggestionContext, ChatHistoryEntry } from '../../domain/ai/models/SuggestionContext';
import { AIResponseParser } from '../../domain/ai/services/AIResponseParser';
import { PromptBuilder } from '../../domain/ai/services/PromptBuilder';
import { IAIRepository, IConfigRepository } from '../../domain/ai/repositories/IAIRepository';

/**
 * AI生成機能の応用サービス
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

  /**
   * 要素生成を実行
   */
  async generateElements(targetElement: Element, currentStructure: string): Promise<string[]> {
    const apiKey = this.configRepository.getApiKey();
    const prompt = this.configRepository.getPrompt();
    const systemPrompt = this.configRepository.getSystemPromptTemplate();
    const modelType = this.configRepository.getModelType();

    if (!apiKey) {
      throw new Error('APIキーが設定されていません。設定から登録してください。');
    }

    if (!prompt) {
      throw new Error('プロンプトが設定されていません。');
    }

    // コンテキスト初期化を確認
    await this.ensureContextInitialized(prompt);

    // プロンプトを構築
    const userPrompt = this.promptBuilder.buildElementGenerationPrompt(
      targetElement,
      prompt,
      currentStructure,
      this.suggestionContext.contextInitialized,
    );

    // AI生成を実行（JSON形式を強制）
    let result: string;
    if (
      this.suggestionContext.contextInitialized &&
      this.suggestionContext.chatHistory.length > 0
    ) {
      const response = await this.aiRepository.generateWithThread(
        userPrompt,
        apiKey,
        modelType,
        this.suggestionContext.chatHistory,
        systemPrompt,
        true, // forceJsonResponse
        true,
      );
      result = response.response;
    } else {
      result = await this.aiRepository.generateSingle(
        userPrompt,
        apiKey,
        modelType,
        true, // forceJsonResponse
        systemPrompt,
      );
    }

    // レスポンスを解析
    return this.responseParser.extractElementsFromText(result);
  }

  /**
   * チャット形式でのAI生成を実行
   */
  async generateForChat(
    message: string,
    currentStructure: string,
    selectedElement?: string,
  ): Promise<AIOperation[]> {
    const apiKey = this.configRepository.getApiKey();
    const modelType = this.configRepository.getModelType();

    if (!apiKey) {
      throw new Error('APIキーが設定されていません。設定から登録してください。');
    }

    // プロンプトを構築
    const userPrompt = this.promptBuilder.buildChatPrompt(
      message,
      currentStructure,
      selectedElement,
    );

    // AI生成を実行（JSON形式のレスポンスを期待）
    const result = await this.aiRepository.generateSingle(
      userPrompt,
      apiKey,
      modelType,
      true, // JSON形式を強制
    );

    // レスポンスを解析
    return this.responseParser.parseOperations(result);
  }

  /**
   * サジェスト生成を実行
   */
  async generateSuggestions(
    selectedElement: Element | null,
    parentElement: Element | null,
    currentStructure: string,
  ): Promise<string[]> {
    const apiKey = this.configRepository.getApiKey();
    const prompt = this.configRepository.getPrompt();
    const modelType = this.configRepository.getModelType();

    if (!apiKey) {
      return [];
    }

    // コンテキスト初期化を確認
    if (prompt) {
      await this.ensureContextInitialized(prompt);
    }

    // プロンプトを構築
    const suggestionPrompt = this.promptBuilder.buildSuggestionPrompt(
      selectedElement,
      parentElement,
      prompt || '',
      currentStructure,
      this.suggestionContext.contextInitialized,
    );

    // AI生成を実行
    let result: string;
    let updatedHistory: ChatHistoryEntry[];

    const useInitializedContext =
      this.suggestionContext.contextInitialized && this.suggestionContext.chatHistory.length > 0;

    if (useInitializedContext) {
      const response = await this.aiRepository.generateWithThread(
        suggestionPrompt,
        apiKey,
        modelType,
        this.suggestionContext.chatHistory,
        undefined,
        true, // JSON形式を強制
      );
      result = response.response;
      updatedHistory = response.updatedHistory;
    } else {
      const response = await this.aiRepository.generateWithThread(
        suggestionPrompt,
        apiKey,
        modelType,
        [],
        undefined,
        true, // JSON形式を強制
      );
      result = response.response;
      updatedHistory = response.updatedHistory;
    }

    // チャット履歴を更新
    this.suggestionContext.updateChatHistory(updatedHistory);

    // レスポンスを解析
    return this.responseParser.parseSuggestions(result);
  }

  /**
   * サジェストコンテキストの状態を取得
   */
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

  /**
   * サジェストコンテキストをクリア
   */
  clearSuggestionContext(): void {
    this.suggestionContext.clear();
  }

  /**
   * サジェスト実行状態を設定
   */
  setSuggestionExecuting(executing: boolean): void {
    this.suggestionContext.setExecuting(executing);
  }

  /**
   * 親要素IDを更新
   */
  updateParentElementId(elementId: string): void {
    this.suggestionContext.updateParentElementId(elementId);
  }

  /**
   * コンテキスト初期化を確認・実行
   */
  private async ensureContextInitialized(inputText: string): Promise<void> {
    if (!this.suggestionContext.needsContextInitialization(inputText)) {
      return;
    }

    if (inputText && inputText.trim().length > 0) {
      await this.initializeContext(inputText);
    }
  }

  /**
   * コンテキストを初期化
   */
  private async initializeContext(inputText: string): Promise<void> {
    const apiKey = this.configRepository.getApiKey();
    const modelType = this.configRepository.getModelType();

    if (!apiKey) {
      return;
    }

    // 長いテキストを分割
    const chunks = this.splitTextIntoChunks(inputText, 8000);
    let contextHistory: ChatHistoryEntry[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const contextPrompt = this.promptBuilder.buildContextInitializationPrompt(
        inputText,
        i,
        chunks.length,
        chunk,
      );

      const response = await this.aiRepository.generateWithThread(
        contextPrompt,
        apiKey,
        modelType,
        contextHistory,
        undefined,
        false,
        false,
      );

      contextHistory = response.updatedHistory;
    }

    // コンテキスト初期化完了
    this.suggestionContext.updateChatHistory(contextHistory);
    this.suggestionContext.setContextInitialized(true, inputText);
  }

  /**
   * テキストを指定した文字数で分割
   */
  private splitTextIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
