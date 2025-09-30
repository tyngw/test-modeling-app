// src/domain/ai/repositories/IAIRepository.ts

import { ChatHistoryEntry } from '../models/SuggestionContext';

/**
 * AI API呼び出しのリポジトリインターフェース
 */
export interface IAIRepository {
  /**
   * 単発のAI生成を実行
   */
  generateSingle(
    prompt: string,
    apiKey: string,
    modelType: string,
    forceJsonResponse?: boolean,
    systemPrompt?: string,
  ): Promise<string>;

  /**
   * スレッド形式のAI生成を実行
   */
  generateWithThread(
    prompt: string,
    apiKey: string,
    modelType: string,
    chatHistory: ChatHistoryEntry[],
    systemPrompt?: string,
    forceJsonResponse?: boolean,
    truncatePrompt?: boolean,
  ): Promise<{
    response: string;
    updatedHistory: ChatHistoryEntry[];
  }>;
}

/**
 * 設定情報を取得するリポジトリインターフェース
 */
export interface IConfigRepository {
  /**
   * APIキーを取得
   */
  getApiKey(): string;

  /**
   * モデルタイプを取得
   */
  getModelType(): string;

  /**
   * プロンプトを取得
   */
  getPrompt(): string;

  /**
   * システムプロンプトテンプレートを取得
   */
  getSystemPromptTemplate(): string;
}
