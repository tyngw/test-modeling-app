// src/utils/api/api.ts
import axios from 'axios';
import { getApiEndpoint } from '../storage/localStorageHelpers';
import { getSystemPrompt } from '../../constants/promptHelpers';
import { SuggestionResponse } from './schema';
import { sanitizeApiResponse } from '../security/sanitization';
import { validateJsonData } from '../security/validation';

// 複数メッセージ対応のための型定義
interface MessagePart {
  text: string;
}

interface Message {
  role: 'user' | 'model';
  parts: MessagePart[];
}

// レスポンスのタイプを定義するジェネリック型
type ApiResponse<T = string> = T;

export const generateWithGemini = async (
  prompt: string,
  apiKey: string,
  _modelType: string,
): Promise<string> => {
  try {
    // プロンプトの長さを制限（トークン制限を回避）
    const maxPromptLength = 8000; // 約8000文字に制限
    const truncatedPrompt =
      prompt.length > maxPromptLength
        ? prompt.substring(0, maxPromptLength) + '\n...(省略)'
        : prompt;

    // // console.log('prompt: \n', truncatedPrompt);
    const endpoint = `${getApiEndpoint()}?key=${apiKey}`;
    const systemPrompt = getSystemPrompt();

    // システムプロンプトとユーザープロンプトを送信
    // 返却形式を明示的に指定（改行区切りリスト）
    const response = await axios.post(
      endpoint,
      {
        contents: [
          {
            role: 'user',
            parts: [{ text: truncatedPrompt }],
          },
        ],
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        // レスポンス形式を明示的に指定
        generationConfig: {
          temperature: 0.2, // 低い温度で一貫した結果を返す
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 2048, // トークン数を増加
          // シンプルなテキスト形式でのレスポンスを要求
          // responseMimeTypeとresponseSchemaは使わずにプロンプトで指示
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    // テキストレスポンスの取得とサニタイゼーション
    const rawTextResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // AIレスポンスのセキュリティチェックとサニタイゼーション
    const sanitizedResponse = sanitizeApiResponse(rawTextResponse);

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
    const systemPrompt = getSystemPrompt();

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
    } catch (parseError) {
      // // console.error('JSON parse error:', parseError);
      // JSON解析エラーの場合は空の応答を返す
      return { suggestions: [] };
    }
  } catch (error) {
    // // console.error('Gemini API Error:', error);
    throw new Error('API呼び出しに失敗しました');
  }
};

// JSON形式でレスポンスを受け取る関数
export const generateWithGeminiJson = async <T>(
  prompt: string,
  apiKey: string,
  _modelType: string,
  _responseSchema: any, // JSONスキーマ（現在未使用）
): Promise<ApiResponse<T>> => {
  try {
    // // console.log('prompt: \n', prompt);
    const endpoint = `${getApiEndpoint()}?key=${apiKey}`;
    const systemPrompt = getSystemPrompt();

    // JSON形式のレスポンスを要求する設定
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
          responseMimeType: 'application/json',
          // responseSchema: responseSchema, // 一時的に無効化
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    // JSONレスポンスの取得とサニタイゼーション
    const jsonResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // JSONをパースして返す
    try {
      // レスポンスが既にJSONオブジェクトの場合もある
      if (typeof jsonResponse === 'object') {
        const sanitizedResponse = sanitizeApiResponse(jsonResponse);
        return sanitizedResponse as T;
      }

      // JSONデータの検証
      if (!validateJsonData(jsonResponse)) {
        throw new Error('Invalid JSON response from API');
      }

      // 文字列の場合はパースしてサニタイズ
      const parsedResponse = JSON.parse(jsonResponse);
      const sanitizedResponse = sanitizeApiResponse(parsedResponse);
      return sanitizedResponse as T;
    } catch (parseError) {
      // console.error('JSON parse error:', parseError);
      throw new Error('JSONの解析に失敗しました');
    }
  } catch (error) {
    // console.error('Gemini API Error:', error);
    throw new Error('API呼び出しに失敗しました');
  }
};

// 複数メッセージ対応の拡張関数
export const generateWithGeminiMultipleMessages = async (
  messages: { role: 'user' | 'model'; text: string }[],
  systemInstruction: string,
  apiKey: string,
  _modelType: string,
): Promise<string> => {
  try {
    const endpoint = `${getApiEndpoint()}?key=${apiKey}`;

    // ユーザーとモデルメッセージを変換
    const contents: Message[] = messages.map((message) => ({
      role: message.role,
      parts: [{ text: message.text }],
    }));

    // console.log('messages: \n', contents);

    const response = await axios.post(
      endpoint,
      {
        contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        // レスポンス形式を明示的に指定
        generationConfig: {
          temperature: 0.2, // 低い温度で一貫した結果を返す
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
          // 改行区切りリスト形式のテキストを要求
          responseSchema: {
            type: 'string',
            format: 'text/plain',
            description:
              'A list of items, each on a new line. Do not include bullet points or numbering.',
          },
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    // レスポンスデータの取得とサニタイゼーション
    const rawTextResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // AIレスポンスのセキュリティチェックとサニタイゼーション
    const sanitizedResponse = sanitizeApiResponse(rawTextResponse);

    // console.log('Sanitized multiple messages response:', sanitizedResponse);
    return sanitizedResponse;
  } catch (error) {
    // console.error('Gemini API Error:', error);
    throw new Error('API呼び出しに失敗しました');
  }
};

// JSON形式で複数メッセージのレスポンスを受け取る関数
export const generateWithGeminiMultipleMessagesJson = async <T>(
  messages: { role: 'user' | 'model'; text: string }[],
  systemInstruction: string,
  apiKey: string,
  _modelType: string,
  responseSchema: any, // JSONスキーマ
): Promise<ApiResponse<T>> => {
  try {
    const endpoint = `${getApiEndpoint()}?key=${apiKey}`;

    // ユーザーとモデルメッセージを変換
    const contents: Message[] = messages.map((message) => ({
      role: message.role,
      parts: [{ text: message.text }],
    }));

    // console.log('messages: \n', contents);

    const response = await axios.post(
      endpoint,
      {
        contents,
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    // JSONレスポンスの取得と解析
    const rawJsonResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    try {
      // レスポンスが既にJSONオブジェクトの場合もある
      if (typeof rawJsonResponse === 'object') {
        const sanitizedResponse = sanitizeApiResponse(rawJsonResponse);
        return sanitizedResponse as T;
      }

      // JSONデータの検証
      if (!validateJsonData(rawJsonResponse)) {
        throw new Error('Invalid JSON response from API');
      }

      // 文字列の場合はパースしてサニタイズ
      const parsedResponse = JSON.parse(rawJsonResponse);
      const sanitizedResponse = sanitizeApiResponse(parsedResponse);
      return sanitizedResponse as T;
    } catch (parseError) {
      // console.error('JSON parse error:', parseError);
      throw new Error('JSONの解析に失敗しました');
    }
  } catch (error) {
    // console.error('Gemini API Error:', error);
    throw new Error('API呼び出しに失敗しました');
  }
};
