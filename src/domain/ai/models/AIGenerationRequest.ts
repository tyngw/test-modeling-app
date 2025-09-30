// src/domain/ai/models/AIGenerationRequest.ts

import { Element } from '../../element/models/Element';

/**
 * AI生成リクエストを表すドメインモデル
 */
export class AIGenerationRequest {
  constructor(
    public readonly targetElement: Element,
    public readonly prompt: string,
    public readonly systemPrompt: string,
    public readonly currentStructure: string,
    public readonly modelType: string,
    public readonly apiKey: string,
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.targetElement) {
      throw new Error('対象要素が指定されていません');
    }
    if (!this.prompt.trim()) {
      throw new Error('プロンプトが空です');
    }
    if (!this.apiKey.trim()) {
      throw new Error('APIキーが設定されていません');
    }
  }

  /**
   * チャット用のリクエストを作成
   */
  static forChat(
    message: string,
    currentStructure: string,
    apiKey: string,
    modelType: string,
  ): Omit<AIGenerationRequest, 'targetElement'> & { targetElement?: Element } {
    return {
      targetElement: undefined,
      prompt: message,
      systemPrompt: '',
      currentStructure,
      modelType,
      apiKey,
    };
  }

  /**
   * 要素生成用のリクエストを作成
   */
  static forElementGeneration(
    targetElement: Element,
    prompt: string,
    systemPrompt: string,
    currentStructure: string,
    apiKey: string,
    modelType: string,
  ): AIGenerationRequest {
    return new AIGenerationRequest(
      targetElement,
      prompt,
      systemPrompt,
      currentStructure,
      modelType,
      apiKey,
    );
  }
}
