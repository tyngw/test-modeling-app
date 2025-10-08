// src/infrastructure/ai/GeminiAIRepository.ts

import { IAIRepository } from '../../domain/ai/repositories/IAIRepository';
import { ChatHistoryEntry } from '../../domain/ai/models/SuggestionContext';
import { generateWithGemini, generateWithGeminiThread } from '../../utils/api';

/**
 * Gemini APIを使用したAIリポジトリの実装
 */
export class GeminiAIRepository implements IAIRepository {
  /**
   * 単発のAI生成を実行
   */
  async generateSingle(
    prompt: string,
    apiKey: string,
    modelType: string,
    forceJsonResponse = false,
    systemPrompt?: string,
  ): Promise<string> {
    return await generateWithGemini(prompt, apiKey, modelType, forceJsonResponse, systemPrompt);
  }

  /**
   * スレッド形式のAI生成を実行
   */
  async generateWithThread(
    prompt: string,
    apiKey: string,
    modelType: string,
    chatHistory: ChatHistoryEntry[],
    systemPrompt?: string,
    forceJsonResponse = false,
    truncatePrompt = true,
  ): Promise<{
    response: string;
    updatedHistory: ChatHistoryEntry[];
  }> {
    return await generateWithGeminiThread(
      prompt,
      apiKey,
      modelType,
      chatHistory,
      systemPrompt,
      forceJsonResponse,
      truncatePrompt,
    );
  }
}
