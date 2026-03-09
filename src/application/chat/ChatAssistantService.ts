import { ChatOperation, ElementsTreeNode } from '../../domain/chat/models/ChatOperation';
import { ChatOperationService } from '../../domain/chat/services/ChatOperationService';
import { Element } from '../../domain/element/models/Element';
import { IAIRepository, IConfigRepository } from '../../domain/ai/repositories/IAIRepository';
import { ChatHistoryEntry } from '../../domain/ai/models/SuggestionContext';
import { createChatUserPromptOnly, getChatSystemPrompt } from '../../config/chatSystemPrompt';
import { debugLog } from '../../utils/debugLogHelpers';

/**
 * チャットアシスタント機能の応用サービス
 * ドメインサービスとインフラストラクチャを調整
 */
export class ChatAssistantService {
  private chatHistory: ChatHistoryEntry[] = [];
  private hasSentInitialSystemInstruction = false;

  constructor(
    private readonly aiRepository: IAIRepository,
    private readonly configRepository: IConfigRepository,
    private readonly chatOperationService: ChatOperationService,
  ) {}

  /**
   * ユーザーの指示からチャット操作を生成
   */
  async generateChatOperations(
    userInput: string,
    selectedElement: Element | null,
    currentStructure: string,
  ): Promise<ChatOperation[]> {
    // APIキーを取得
    const apiKey = this.configRepository.getApiKey();
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('APIキーが設定されていません。設定画面からAPIキーを設定してください。');
    }

    // プロンプトを作成
    const selectedElementText = selectedElement?.texts[0] || '未選択';
    const promptTemplates = this.configRepository.getPromptTemplates();
    const chatUserPrompt = createChatUserPromptOnly({
      selectedElement: selectedElementText,
      currentStructure,
      userInput,
      promptTemplates,
    });

    const chatSystemPrompt = getChatSystemPrompt(promptTemplates);
    const isFirstTurn = this.chatHistory.length === 0;

    // AI に指示を送信
    const modelType = this.configRepository.getModelType();
    const shouldIncludeSystemInstruction = !this.hasSentInitialSystemInstruction;
    const { response, updatedHistory } = await this.aiRepository.generateWithThread(
      chatUserPrompt,
      apiKey,
      modelType,
      this.chatHistory,
      shouldIncludeSystemInstruction ? chatSystemPrompt : undefined,
      true,
      true,
      shouldIncludeSystemInstruction,
    );

    if (shouldIncludeSystemInstruction && isFirstTurn) {
      const systemEntry: ChatHistoryEntry = {
        role: 'user',
        parts: [{ text: chatSystemPrompt }],
      };
      this.chatHistory = [systemEntry, ...updatedHistory];
    } else {
      this.chatHistory = updatedHistory;
    }
    if (shouldIncludeSystemInstruction) {
      this.hasSentInitialSystemInstruction = true;
    }

    // レスポンスを解析
    const operations = this.parseAIResponse(response);

    // 操作を検証
    this.chatOperationService.validateOperations(operations);

    // 操作順序を最適化
    return this.chatOperationService.optimizeOperationOrder(operations);
  }

  /**
   * AIレスポンスを解析してChatOperation配列に変換
   */
  private parseAIResponse(result: string | Record<string, unknown>): ChatOperation[] {
    if (typeof result !== 'string') {
      throw new Error('予期しないレスポンスの型です');
    }

    if (!result.trim()) {
      throw new Error('AIからの応答が空でした。プロンプトを確認してください。');
    }

    const cleanedResult = result.replace(/```json\s*|```\s*/g, '').trim();

    let operationsData: { operations: unknown[] };
    try {
      operationsData = JSON.parse(cleanedResult);
    } catch (parseError) {
      debugLog('[ChatAssistant] JSONパースエラー:', {
        error: parseError,
        originalResponse: result,
        cleanedResponse: cleanedResult,
      });
      throw new Error('AIからの応答を解析できませんでした。再度お試しください。');
    }

    const operations = operationsData.operations;
    if (!operations || operations.length === 0) {
      throw new Error('実行可能な操作が見つかりませんでした。');
    }

    // ChatOperationオブジェクトに変換
    return operations.map((op) => {
      const operation = op as Record<string, unknown>;
      return new ChatOperation(
        operation.type as string,
        operation.targetId as string | undefined,
        operation.elements as string[] | undefined,
        operation.autoSelect as boolean | undefined,
        operation.targetText as string | undefined,
        operation.newText as string | undefined,
        operation.targetNodeId as string | undefined,
        operation.targetIndex as number | undefined,
        operation.message as string | undefined,
        operation.direction as 'left' | 'right' | 'none' | undefined,
        operation.elementsTree as ElementsTreeNode[] | undefined,
      );
    });
  }

  /**
   * チャット履歴をリセットする（新しい会話を開始するとき）
   */
  clearHistory(): void {
    this.chatHistory = [];
    this.hasSentInitialSystemInstruction = false;
  }

  /**
   * エラーメッセージをユーザーフレンドリーに変換
   */
  createFriendlyErrorMessage(error: Error): string {
    return this.chatOperationService.createFriendlyErrorMessage(error);
  }
}
