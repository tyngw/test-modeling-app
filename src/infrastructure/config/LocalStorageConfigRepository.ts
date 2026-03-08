// src/infrastructure/config/LocalStorageConfigRepository.ts

import { IConfigRepository, ApiProvider } from '../../domain/ai/repositories/IAIRepository';
import {
  getApiKey,
  getModelType,
  getPrompt,
  getPromptTemplates,
  getSystemPromptTemplate,
  getApiProvider as getStorageApiProvider,
  getApiEndpoint as getStorageApiEndpoint,
  getPresetApiEndpoint as getStoragePresetApiEndpoint,
} from '../../utils/storage';
import { PromptTemplates } from '../../config/promptTemplates';

/**
 * LocalStorageを使用した設定リポジトリの実装
 */
export class LocalStorageConfigRepository implements IConfigRepository {
  /**
   * APIキーを取得
   */
  getApiKey(): string {
    return getApiKey();
  }

  /**
   * モデルタイプを取得
   */
  getModelType(): string {
    return getModelType();
  }

  /**
   * プロンプトを取得
   */
  getPrompt(): string {
    return getPrompt();
  }

  /**
   * システムプロンプトテンプレートを取得
   */
  getSystemPromptTemplate(): string {
    return getSystemPromptTemplate();
  }

  /**
   * プロンプトテンプレートを取得
   */
  getPromptTemplates(): PromptTemplates {
    return getPromptTemplates();
  }

  /**
   * APIプロバイダーを取得
   */
  getApiProvider(): ApiProvider {
    return getStorageApiProvider();
  }

  /**
   * APIエンドポイントURLを取得（カスタムエンドポイント対応）
   */
  getApiEndpoint(): string {
    return getStorageApiEndpoint();
  }

  /**
   * プリセットのAPIエンドポイントURLを取得
   */
  getPresetApiEndpoint(): string {
    return getStoragePresetApiEndpoint();
  }
}
