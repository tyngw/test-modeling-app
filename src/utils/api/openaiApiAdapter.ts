// src/utils/api/openaiApiAdapter.ts
import { post, isHttpError } from '../http/httpClient';
import { sanitizeApiResponse } from '../security/sanitization';
import { debugLog } from '../debugLogHelpers';

// OpenAI形式のチャット履歴型定義
interface OpenAIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Thinking modelの思考過程をレスポンスから削除
 * OpenAI のthinking models (o1, o3など)、またはローカルLLMの思考モデルを使用する場合、
 * レスポンスに思考過程が含まれることがあり、それをフィルタリングする必要があります
 *
 * 対応する思考内容フォーマット：
 * - <thinking>...</thinking> OpenAI o1/o3形式
 * - "Thinking Process:" で始まる思考ブロック（LM Studioなど）
 * - JSON形式の回答前の説明的なテキスト
 *
 * @param content APIからのレスポンス内容
 * @returns フィルタリング後のテキスト（実際のレスポンスのみ）
 */
function filterThinkingContent(content: string): string {
  if (!content) return content;

  let filtered = content;

  // パターン1: <thinking>...</thinking> ブロックを削除（OpenAI o1/o3形式）
  filtered = filtered.replace(/<thinking>[\s\S]*?<\/thinking>/g, '').trim();

  // パターン2: "Thinking Process:" で始まるブロックを削除（LM Studioなど）
  // "Thinking Process:" か "Thinking:" で始まり、次の重要なセクション（##または{）まで削除
  const thinkingMatch = filtered.match(
    /^[\s\n]*(Thinking[^:]*Process|Thinking):[\s\S]*?(?=\n##|\n\{|^##|^\{|Output Format|Please respond|\n\n|$)/m,
  );
  if (thinkingMatch && thinkingMatch.index !== undefined) {
    // マッチした思考テキストの後ろを抽出
    const beforeThinking = filtered.substring(0, thinkingMatch.index);
    const afterThinking = filtered.substring(thinkingMatch.index + thinkingMatch[0].length);
    filtered = (beforeThinking + afterThinking).trim();
  }

  // パターン3: 複数の数字で始まるリスト形式の思考テキストをスキップ
  // 例：1. 2. 3. という形式の分析テキスト
  // JSON形式（{で始まる）や実際の回答が見つかるまでスキップ
  if (filtered.match(/^\d+\.\s+\*\*[^*]*\*\*/)) {
    // 思考プロセスリスト形式の場合、最初のセクション区切りまでを削除
    const jsonStart = filtered.indexOf('{');
    const sectionStart = filtered.indexOf('\n##');
    const answerStart = filtered.indexOf('\n\n{');

    // 最も早く出現する有効な区切りを探す
    const validStarts = [jsonStart, sectionStart, answerStart].filter((i) => i >= 0);
    if (validStarts.length > 0) {
      const firstValidStart = Math.min(...validStarts);
      filtered = filtered.substring(firstValidStart).trim();
    }
  }

  // パターン4: 最初の重要なセクションマーカーの前のテキストを削除
  // "Output Format", "[Output Format]", "##" などで実際の回答が始まる場合
  const importantMarkers = ['Output Format', '[Output', 'Please respond', '```json', '{'];
  for (const marker of importantMarkers) {
    const idx = filtered.indexOf(marker);
    if (idx > 0 && idx < filtered.length / 2) {
      // マーカーが前半にある場合、それまでのテキストは思考の可能性が高い
      filtered = filtered.substring(idx).trim();
      break;
    }
  }

  return filtered;
}

/**
 * ローカルLLMサーバーかどうかを判定
 * ローカル開発環境のLLMサーバー向けリクエストはAPI Route経由で処理
 */
function isLocalLLMEndpoint(endpoint: string): boolean {
  return (
    endpoint.startsWith('http://localhost') ||
    endpoint.startsWith('http://127.0.0.1') ||
    endpoint.startsWith('http://192.168') ||
    endpoint.startsWith('http://10.')
  );
}

// OpenAI互換APIアダプター
// OpenAI API互換のエンドポイント（OpenAI、LM Studio等）に対応
// eslint-disable-next-line camelcase
export class OpenAIApiAdapter {
  /**
   * OpenAI互換APIで単発のテキスト生成を実行
   */
  static async generateSingle(
    prompt: string,
    apiKey: string,
    modelType: string,
    endpoint: string,
    forceJsonResponse = false,
    systemPrompt?: string,
  ): Promise<string> {
    try {
      const maxPromptLength = 8000;
      const truncatedPrompt =
        prompt.length > maxPromptLength
          ? prompt.substring(0, maxPromptLength) + '\n...(省略)'
          : prompt;

      if (prompt.length > maxPromptLength) {
        debugLog(
          `[OpenAI] Warning: Prompt was truncated (${prompt.length} -> ${truncatedPrompt.length})`,
        );
      }

      const messages: OpenAIMessage[] = [];

      // システムプロンプトがある場合は最初に追加
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      // ユーザープロンプトを追加
      messages.push({
        role: 'user',
        content: truncatedPrompt,
      });

      const requestPayload: Record<string, unknown> = {
        model: modelType,
        messages,
        temperature: 0.2,
        // eslint-disable-next-line camelcase
        top_p: 0.8,
        // eslint-disable-next-line camelcase
        max_tokens: 2048,
      };

      // JSON形式の応答を強制する場合
      // ローカルLLMはresponse_formatをサポートしないため、クラウドAPIの場合のみ追加
      if (forceJsonResponse && !isLocalLLMEndpoint(endpoint)) {
        // eslint-disable-next-line camelcase
        requestPayload.response_format = { type: 'json_object' };
      }

      if (process.env.NODE_ENV === 'development') {
        debugLog('[OpenAI Request]:', JSON.stringify(requestPayload, null, 2));
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // APIキーが提供されない場合（ローカルAPIサーバー等）
      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      if (process.env.NODE_ENV === 'development') {
        debugLog('[OpenAI API Call]', {
          endpoint,
          hasApiKey: !!apiKey,
          model: modelType,
        });
      }

      // セキュリティ: すべてのリクエストをAPI Route経由で実行
      // - ローカルLLM: CORS/CSP制約を回避
      // - クラウドAPI(OpenAI等): CSP制約を回避し、ブラウザから直接アクセスすることで引き起こされる
      //   セキュリティ問題を防止（api.openai.com等がCSPでブロックされる可能性）
      const response = await post<{ choices?: Array<{ message?: { content?: string } }> }>('/api/ai/generate', {
        endpoint,
        payload: requestPayload,
        apiKey,
      });

      const rawTextResponse = response.data.choices?.[0]?.message?.content || '';
      // Thinking modelの場合、responseの中に思考過程が含まれているので、フィルタリング
      const filteredResponse = filterThinkingContent(rawTextResponse);
      const sanitizedResponse = sanitizeApiResponse(filteredResponse) as string;

      if (process.env.NODE_ENV === 'development') {
        debugLog('[OpenAI Response]:', sanitizedResponse);
      }

      return sanitizedResponse;
    } catch (error) {
      if (isHttpError(error)) {
        const errorMessage =
          (error.response?.data as any)?.error?.message || error.message || 'Unknown error';
        const status = error.response?.status;

        if (process.env.NODE_ENV === 'development') {
          debugLog('[OpenAI Error Details]', {
            status,
            endpoint,
            errorMessage,
            hasResponse: !!error.response,
          });
        }

        if (status === 401) {
          throw new Error('API認証エラー: APIキーが無効です');
        }
        if (status === 429) {
          throw new Error('API レート制限エラー: しばらく待ってから再度お試しください');
        }
        if (status === 400) {
          throw new Error(`APIリクエストエラー: ${errorMessage}`);
        }
        if (!status && error.code === 'ECONNREFUSED') {
          throw new Error(
            `接続エラー: エンドポイント(${endpoint})に接続できません。サーバーが起動しているか確認してください。`,
          );
        }
        if (!status && error.code === 'ERR_NETWORK') {
          throw new Error(
            `ネットワークエラー: ${endpoint}にアクセスできません。ローカルサーバーの起動状況やCORS設定を確認してください。`,
          );
        }

        throw new Error(`API通信エラー: ${errorMessage}`);
      }

      throw new Error(
        `API呼び出しに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * OpenAI互換APIでスレッド形式のテキスト生成を実行
   */
  static async generateWithThread(
    prompt: string,
    apiKey: string,
    modelType: string,
    endpoint: string,
    chatHistory: OpenAIMessage[] = [],
    systemPrompt?: string,
    forceJsonResponse = false,
    truncatePrompt = true,
    includeSystemInstruction = true,
  ): Promise<{ response: string; updatedHistory: OpenAIMessage[] }> {
    try {
      const maxPromptLength = 8000;
      const truncatedPrompt =
        truncatePrompt && prompt.length > maxPromptLength
          ? prompt.substring(0, maxPromptLength) + '\n...(省略)'
          : prompt;

      if (truncatePrompt && prompt.length > maxPromptLength) {
        debugLog(
          `[OpenAI Thread] Warning: Prompt was truncated (${prompt.length} -> ${truncatedPrompt.length})`,
        );
      }

      const messages: OpenAIMessage[] = [];

      // システムプロンプトを最初に追加
      if (includeSystemInstruction && systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      // 既存のチャット履歴を追加（システムプロンプト除外）
      chatHistory.forEach((msg) => {
        if (msg.role !== 'system') {
          messages.push(msg);
        }
      });

      // 新しいユーザーメッセージを追加
      messages.push({
        role: 'user',
        content: truncatedPrompt,
      });

      const requestPayload: Record<string, unknown> = {
        model: modelType,
        messages,
        temperature: 0.2,
        // eslint-disable-next-line camelcase
        top_p: 0.8,
        // eslint-disable-next-line camelcase
        max_tokens: 2048,
      };

      // JSON形式の応答を強制する場合
      // ローカルLLMはresponse_formatをサポートしないため、クラウドAPIの場合のみ追加
      if (forceJsonResponse && !isLocalLLMEndpoint(endpoint)) {
        // eslint-disable-next-line camelcase
        requestPayload.response_format = { type: 'json_object' };
      }

      if (process.env.NODE_ENV === 'development') {
        debugLog('[OpenAI Thread Request]:', JSON.stringify(requestPayload, null, 2));
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey) {
        headers.Authorization = `Bearer ${apiKey}`;
      }

      if (process.env.NODE_ENV === 'development') {
        debugLog('[OpenAI Thread API Call]', {
          endpoint,
          hasApiKey: !!apiKey,
          model: modelType,
          messagesCount: messages.length,
          isLocalLLM: isLocalLLMEndpoint(endpoint),
        });
      }

      // セキュリティ: すべてのリクエストをAPI Route経由で実行
      // - ローカルLLM: CORS/CSP制約を回避
      // - クラウドAPI(OpenAI等): CSP制約を回避し、ブラウザから直接アクセスすることで引き起こされる
      //   セキュリティ問題を防止（api.openai.com等がCSPでブロックされる可能性）
      const response = await post<{ choices?: Array<{ message?: { content?: string } }> }>('/api/ai/generate', {
        endpoint,
        payload: requestPayload,
        apiKey,
      });

      const rawTextResponse = response.data.choices?.[0]?.message?.content || '';
      // Thinking modelの場合、responseの中に思考過程が含まれているので、フィルタリング
      const filteredResponse = filterThinkingContent(rawTextResponse);
      const sanitizedResponse = sanitizeApiResponse(filteredResponse) as string;

      // チャット履歴を更新（新しいアシスタントメッセージを追加）
      const updatedMessages: OpenAIMessage[] = [...messages];
      updatedMessages.push({
        role: 'assistant',
        content: sanitizedResponse,
      });

      return {
        response: sanitizedResponse,
        updatedHistory: updatedMessages,
      };
    } catch (error) {
      if (isHttpError(error)) {
        const errorMessage =
          (error.response?.data as any)?.error?.message || error.message || 'Unknown error';
        const status = error.response?.status;

        if (process.env.NODE_ENV === 'development') {
          debugLog('[OpenAI Thread Error Details]', {
            status,
            endpoint,
            errorMessage,
            hasResponse: !!error.response,
          });
        }

        if (status === 401) {
          throw new Error('API認証エラー: APIキーが無効です');
        }
        if (status === 429) {
          throw new Error('API レート制限エラー: しばらく待ってから再度お試しください');
        }
        if (!status && error.code === 'ECONNREFUSED') {
          throw new Error(
            `接続エラー: エンドポイント(${endpoint})に接続できません。サーバーが起動しているか確認してください。`,
          );
        }
        if (!status && error.code === 'ERR_NETWORK') {
          throw new Error(
            `ネットワークエラー: ${endpoint}にアクセスできません。ローカルサーバーの起動状況やCORS設定を確認してください。`,
          );
        }

        throw new Error(`APIリクエストエラー: ${errorMessage}`);
      }

      throw new Error(
        `API呼び出しに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}

/**
 * Gemini形式のチャット履歴をOpenAI形式に変換
 */
export function convertGeminiToOpenAIHistory(
  geminiHistory: Array<{ role: 'user' | 'model'; parts: { text: string }[] }>,
): OpenAIMessage[] {
  return geminiHistory.map((msg) => ({
    role: msg.role === 'model' ? 'assistant' : 'user',
    content: msg.parts.map((p) => p.text).join(''),
  }));
}

/**
 * OpenAI形式のチャット履歴をGemini形式に変換
 */
export function convertOpenAIToGeminiHistory(
  openaiHistory: OpenAIMessage[],
): Array<{ role: 'user' | 'model'; parts: { text: string }[] }> {
  return openaiHistory
    .filter((msg) => msg.role !== 'system') // システムメッセージは除外
    .map((msg) => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));
}
