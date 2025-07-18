import axios from 'axios';
import { getApiEndpoint, getSystemPromptTemplate } from '../storage/localStorageHelpers';
import { SYSTEM_PROMPT_TEMPLATE } from '../../config/systemPrompt';
import { SuggestionResponse } from './schema';
import { sanitizeApiResponse } from '../security/sanitization';
import { validateJsonData } from '../security/validation';

export const generateWithGemini = async (
  prompt: string,
  apiKey: string,
  _modelType: string,
  useOriginalSystemPrompt: boolean = false,
  customSystemPrompt?: string,
  forceJsonResponse: boolean = false,
): Promise<string> => {
  try {
    // プロンプトの長さを制限（トークン制限を回避）
    const maxPromptLength = 8000; // 約8000文字に制限
    const truncatedPrompt =
      prompt.length > maxPromptLength
        ? prompt.substring(0, maxPromptLength) + '\n...(省略)'
        : prompt;

    const endpoint = `${getApiEndpoint()}?key=${apiKey}`;
    const systemPrompt =
      customSystemPrompt ||
      (useOriginalSystemPrompt ? SYSTEM_PROMPT_TEMPLATE : getSystemPromptTemplate());

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
    console.log('[Geminiリクエスト] 送信内容:', JSON.stringify(requestPayload, null, 2));
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

    // // console.log('Sanitized response:', sanitizedResponse);
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

// 提案要素をJSON形式で取得する関数
export const generateElementSuggestions = async (
  prompt: string,
  apiKey: string,
  _modelType: string,
): Promise<SuggestionResponse> => {
  try {
    // // console.log('prompt: \n', prompt);
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
          // responseSchemaを一時的に削除してテスト
          // responseSchema: suggestionResponseSchema,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    // JSONレスポンスの取得とサニタイゼーション
    const rawJsonText =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{"suggestions":[]}';

    // JSONデータの検証
    if (!validateJsonData(rawJsonText)) {
      // // console.warn('Invalid JSON response from API, using empty suggestions');
      return { suggestions: [] };
    }

    let jsonResponse: SuggestionResponse;

    try {
      // 文字列形式の場合、JSONに変換
      if (typeof rawJsonText === 'string') {
        const parsedJson = JSON.parse(rawJsonText);
        // APIレスポンスのサニタイゼーション
        const sanitizedData = sanitizeApiResponse(parsedJson);
        jsonResponse = sanitizedData as SuggestionResponse;
      } else {
        // 既にオブジェクトの場合はサニタイゼーションを適用
        const sanitizedData = sanitizeApiResponse(rawJsonText);
        jsonResponse = sanitizedData as SuggestionResponse;
      }

      // responseにsuggestions配列が含まれていない場合は空配列を設定
      if (!jsonResponse.suggestions) {
        jsonResponse = { suggestions: [] };
      }

      // // console.log('JSON Response:', jsonResponse);
      return jsonResponse;
    } catch {
      // // console.error('JSON parse error:', parseError);
      // JSON解析エラーの場合は空の応答を返す
      return { suggestions: [] };
    }
  } catch {
    // // console.error('Gemini API Error:', error);
    throw new Error('API呼び出しに失敗しました');
  }
};
