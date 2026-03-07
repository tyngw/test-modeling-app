import axios from 'axios';
import {
  getApiEndpoint,
  getSystemPromptTemplate,
  getApiProvider,
} from '../storage/localStorageHelpers';
import { SuggestionResponse } from './schema';
import { sanitizeApiResponse } from '../security/sanitization';
import { validateJsonData } from '../security/validation';
import { debugLog } from '../debugLogHelpers';
import { OpenAIApiAdapter, convertGeminiToOpenAIHistory } from './openaiApiAdapter';

// スレッド管理用の型定義（Gemini形式）
interface ChatHistory {
  role: 'user' | 'model';
  parts: { text: string }[];
}

// スレッド形式でのAPI呼び出し（プロバイダーに応じた分岐処理）
export const generateWithGeminiThread = async (
  prompt: string,
  apiKey: string,
  modelType: string,
  chatHistory: ChatHistory[] = [],
  customSystemPrompt?: string,
  forceJsonResponse = false,
  truncatePrompt = true,
  includeSystemInstruction = true,
): Promise<{ response: string; updatedHistory: ChatHistory[] }> => {
  const provider = getApiProvider();

  // OpenAI互換APIの場合
  if (provider === 'openai') {
    const endpoint = getApiEndpoint();
    const systemPrompt = customSystemPrompt || getSystemPromptTemplate() || undefined;

    // Gemini形式のチャット履歴をOpenAI形式に変換
    const openaiHistory = convertGeminiToOpenAIHistory(chatHistory);

    const result = await OpenAIApiAdapter.generateWithThread(
      prompt,
      apiKey,
      modelType,
      endpoint,
      openaiHistory,
      systemPrompt,
      forceJsonResponse,
      truncatePrompt,
      includeSystemInstruction,
    );

    // OpenAI形式のレスポンスを処理
    // 戻り値はOpenAI形式だが、他のコード互換性のためGemini形式に変換して返す必要がある
    const geminiHistory: ChatHistory[] = result.updatedHistory
      .filter((msg) => msg.role !== 'system')
      .map((msg) => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

    return {
      response: result.response,
      updatedHistory: geminiHistory,
    };
  }

  // Gemini API（デフォルト）
  return generateWithGeminiThreadInternal(
    prompt,
    apiKey,
    modelType,
    chatHistory,
    customSystemPrompt,
    forceJsonResponse,
    truncatePrompt,
    includeSystemInstruction,
  );
};

// Gemini API実装（内部用）
const generateWithGeminiThreadInternal = async (
  prompt: string,
  apiKey: string,
  _modelType: string,
  chatHistory: ChatHistory[] = [],
  customSystemPrompt?: string,
  forceJsonResponse = false,
  truncatePrompt = true,
  includeSystemInstruction = true,
): Promise<{ response: string; updatedHistory: ChatHistory[] }> => {
  try {
    const maxPromptLength = 8000;
    const truncatedPrompt =
      truncatePrompt && prompt.length > maxPromptLength
        ? prompt.substring(0, maxPromptLength) + '\n...(省略)'
        : prompt;

    if (truncatePrompt && prompt.length > maxPromptLength) {
      debugLog(
        `[generateWithGeminiThread] 警告: プロンプトが切り詰められました (${prompt.length} -> ${truncatedPrompt.length})`,
      );
    }

    const endpoint = `${getApiEndpoint()}?key=${apiKey}`;
    const generationConfig: Record<string, unknown> = {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    };
    if (forceJsonResponse) {
      generationConfig.responseMimeType = 'application/json';
    }

    // チャット履歴に新しいユーザーメッセージを追加
    const updatedHistory: ChatHistory[] = [
      ...chatHistory,
      {
        role: 'user',
        parts: [{ text: truncatedPrompt }],
      },
    ];

    const requestPayload: {
      contents: ChatHistory[];
      generationConfig: Record<string, unknown>;
      systemInstruction?: { parts: { text: string }[] };
    } = {
      contents: updatedHistory,
      generationConfig,
    };
    if (includeSystemInstruction) {
      const systemPrompt = customSystemPrompt || getSystemPromptTemplate();
      requestPayload.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    if (process.env.NODE_ENV === 'development') {
      debugLog('[Geminiスレッドリクエスト] 送信内容:', JSON.stringify(requestPayload, null, 2));
    }

    const response = await axios.post(endpoint, requestPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const rawTextResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const sanitizedResponse = sanitizeApiResponse(rawTextResponse) as string;

    // レスポンスを履歴に追加
    const finalHistory: ChatHistory[] = [
      ...updatedHistory,
      {
        role: 'model',
        parts: [{ text: sanitizedResponse }],
      },
    ];

    return {
      response: sanitizedResponse,
      updatedHistory: finalHistory,
    };
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 400) {
        throw new Error(
          `API リクエストエラー: ${error.response?.data?.error?.message || 'リクエストの形式が正しくありません'}`,
        );
      }
    }
    throw new Error('API呼び出しに失敗しました');
  }
};

export const generateWithGemini = async (
  prompt: string,
  apiKey: string,
  modelType: string,
  useOriginalSystemPrompt = false,
  customSystemPrompt?: string,
  forceJsonResponse = false,
): Promise<string> => {
  const provider = getApiProvider();

  // OpenAI互換APIの場合
  if (provider === 'openai') {
    const endpoint = getApiEndpoint();
    const systemPrompt = customSystemPrompt || getSystemPromptTemplate() || undefined;

    return OpenAIApiAdapter.generateSingle(
      prompt,
      apiKey,
      modelType,
      endpoint,
      forceJsonResponse,
      systemPrompt,
    );
  }

  // Gemini API（デフォルト）
  return generateWithGeminiInternal(
    prompt,
    apiKey,
    modelType,
    useOriginalSystemPrompt,
    customSystemPrompt,
    forceJsonResponse,
  );
};

// Gemini API実装（内部用）
const generateWithGeminiInternal = async (
  prompt: string,
  apiKey: string,
  _modelType: string,
  _useOriginalSystemPrompt = false,
  customSystemPrompt?: string,
  forceJsonResponse = false,
): Promise<string> => {
  try {
    // プロンプトの長さを制限（トークン制限を回避）
    const maxPromptLength = 8000; // 約8000文字に制限
    const truncatedPrompt =
      prompt.length > maxPromptLength
        ? prompt.substring(0, maxPromptLength) + '\n...(省略)'
        : prompt;

    const endpoint = `${getApiEndpoint()}?key=${apiKey}`;
    const systemPrompt = customSystemPrompt || getSystemPromptTemplate();

    // generationConfigの構築
    const generationConfig: Record<string, unknown> = {
      temperature: 0.2,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    };
    if (forceJsonResponse) {
      generationConfig.responseMimeType = 'application/json';
    }

    // リクエスト内容を一つの変数にまとめて管理
    const requestPayload = {
      contents: [
        {
          role: 'user',
          parts: [{ text: truncatedPrompt }],
        },
      ],
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      generationConfig,
    };
    if (process.env.NODE_ENV === 'development') {
      debugLog('[Geminiリクエスト] 送信内容:', JSON.stringify(requestPayload, null, 2));
    }
    // API送信
    const response = await axios.post(endpoint, requestPayload, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // テキストレスポンスの取得とサニタイゼーション
    const rawTextResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // AIレスポンスのセキュリティチェックとサニタイゼーション
    const sanitizedResponse = sanitizeApiResponse(rawTextResponse) as string;

    // debugLog('Sanitized response:', sanitizedResponse);
    return sanitizedResponse;
  } catch (error) {
    // // console.error('Gemini API Error:', error);

    // より詳細なエラー情報を表示
    if (axios.isAxiosError(error)) {
      // // console.error('Response status:', error.response?.status);
      // // console.error('Response data:', error.response?.data);
      // // console.error('Request config:', {
      //   url: error.config?.url,
      //   method: error.config?.method,
      //   headers: error.config?.headers,
      // });

      if (error.response?.status === 400) {
        throw new Error(
          `API リクエストエラー: ${error.response?.data?.error?.message || 'リクエストの形式が正しくありません'}`,
        );
      }
    }

    throw new Error('API呼び出しに失敗しました');
  }
};

// 提案要素をJSON形式で取得する関数（プロバイダーに応じた分岐処理）
export const generateElementSuggestions = async (
  prompt: string,
  apiKey: string,
  modelType: string,
): Promise<SuggestionResponse> => {
  try {
    const provider = getApiProvider();

    // OpenAI互換APIの場合
    if (provider === 'openai') {
      const endpoint = getApiEndpoint();
      const systemPrompt = getSystemPromptTemplate();

      const response = await OpenAIApiAdapter.generateSingle(
        prompt,
        apiKey,
        modelType,
        endpoint,
        true, // forceJsonResponse
        systemPrompt,
      );

      return parseJsonSuggestionResponse(response);
    }

    // Gemini API（デフォルト）
    return generateElementSuggestionsGemini(prompt, apiKey, modelType);
  } catch (error) {
    debugLog('Error generating suggestions:', error);
    throw new Error('API呼び出しに失敗しました');
  }
};

// Gemini用の提案要素生成（内部用）
const generateElementSuggestionsGemini = async (
  prompt: string,
  apiKey: string,
  _modelType: string,
): Promise<SuggestionResponse> => {
  try {
    // カスタムエンドポイント対応: getApiEndpoint()を使用してカスタム値を考慮
    // generateWithGemini*系と統一し、プロキシ経由での利用に対応
    const endpoint = `${getApiEndpoint()}?key=${apiKey}`;
    const systemPrompt = getSystemPromptTemplate();

    // JSON形式のレスポンスを要求するリクエスト
    const response = await axios.post(
      endpoint,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const rawJsonText =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{"suggestions":[]}';

    return parseJsonSuggestionResponse(rawJsonText);
  } catch (error) {
    debugLog('Error in generateElementSuggestionsGemini:', error);
    throw new Error('API呼び出しに失敗しました');
  }
};

// JSON形式の提案レスポンスをパース（共通処理）
const parseJsonSuggestionResponse = (responseText: string): SuggestionResponse => {
  // JSONデータの検証
  if (!validateJsonData(responseText)) {
    return { suggestions: [] };
  }

  try {
    // 文字列形式の場合、JSONに変換
    if (typeof responseText === 'string') {
      const parsedJson = JSON.parse(responseText);
      const sanitizedData = sanitizeApiResponse(parsedJson);
      let jsonResponse = sanitizedData as unknown as SuggestionResponse;

      // responseにsuggestions配列が含まれていない場合は空配列を設定
      if (!jsonResponse.suggestions) {
        jsonResponse = { suggestions: [] };
      }

      return jsonResponse;
    } else {
      // 既にオブジェクトの場合はサニタイゼーションを適用
      const sanitizedData = sanitizeApiResponse(responseText);
      let jsonResponse = sanitizedData as unknown as SuggestionResponse;

      if (!jsonResponse.suggestions) {
        jsonResponse = { suggestions: [] };
      }

      return jsonResponse;
    }
  } catch (error) {
    debugLog('JSON parse error:', error);
    return { suggestions: [] };
  }
};
