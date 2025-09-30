// src/infrastructure/config/LocalStorageConfigRepository.ts

import { IConfigRepository } from '../../domain/ai/repositories/IAIRepository';
import { getApiKey, getModelType, getPrompt } from '../../utils/storage';
import { getSystemPromptTemplate } from '../../utils/storage/localStorageHelpers';

/**
 * LocalStorageを使用した設定リポジトリの実装
 */
export class LocalStorageConfigRepository implements IConfigRepository {
  /**
   * APIキーを取得
   */
  getApiKey(): string | null {
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
  getPrompt(): string | null {
    return getPrompt();
  }

  /**
   * システムプロンプトテンプレートを取得
   */
  getSystemPromptTemplate(): string {
    return getSystemPromptTemplate();
  }
}
