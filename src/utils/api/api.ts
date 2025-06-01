// src/utils/api/api.ts
import axios from 'axios';
import { getApiEndpoint } from '../storage/localStorageHelpers';
import { getSystemPrompt } from '../../constants/promptHelpers';
import { SuggestionResponse, suggestionResponseSchema } from './schema';

// 複数メッセージ対応のための型定義
interface MessagePart {
  text: string;
}

interface Message {
  role: 'user' | 'model';
  parts: MessagePart[];
}

interface SystemInstruction {
  parts: MessagePart[];
}

// レスポンスのタイプを定義するジェネリック型
type ApiResponse<T = string> = T;

export const generateWithGemini = async (
  prompt: string,
  apiKey: string,
  modelType: string,
): Promise<string> => {
  try {
    console.log('prompt: \n', prompt);
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
            parts: [{ text: prompt }],
          },
        ],
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        // レスポンス形式を明示的に指定
        generationConfig: {
          temperature: 0.2, // 低い温度で一貫した結果を返す
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
          // 改行区切りリスト形式のテキストを要求する記述を追加
          // 明示的にテキスト形式を指定し、特定のフォーマットを強制
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

    // テキストレスポンスの取得
    const textResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log(textResponse);
    return textResponse;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('API呼び出しに失敗しました');
  }
};

// 提案要素をJSON形式で取得する関数
export const generateElementSuggestions = async (
  prompt: string,
  apiKey: string,
  modelType: string,
): Promise<SuggestionResponse> => {
  try {
    console.log('prompt: \n', prompt);
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
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          topK: 40,
          maxOutputTokens: 1024,
          responseMimeType: 'application/json',
          responseSchema: suggestionResponseSchema,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    // JSONレスポンスの取得
    const jsonText =
      response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{"suggestions":[]}';
    let jsonResponse: SuggestionResponse;

    try {
      // 文字列形式の場合、JSONに変換
      if (typeof jsonText === 'string') {
        jsonResponse = JSON.parse(jsonText) as SuggestionResponse;
      } else {
        // 既にオブジェクトの場合はそのまま使用
        jsonResponse = jsonText as SuggestionResponse;
      }

      // responseにsuggestions配列が含まれていない場合は空配列を設定
      if (!jsonResponse.suggestions) {
        jsonResponse = { suggestions: [] };
      }

      console.log('JSON Response:', jsonResponse);
      return jsonResponse;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      // JSON解析エラーの場合は空の応答を返す
      return { suggestions: [] };
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('API呼び出しに失敗しました');
  }
};

// JSON形式でレスポンスを受け取る関数
export const generateWithGeminiJson = async <T>(
  prompt: string,
  apiKey: string,
  modelType: string,
  responseSchema: any, // JSONスキーマ
): Promise<ApiResponse<T>> => {
  try {
    console.log('prompt: \n', prompt);
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
        system_instruction: {
          parts: [{ text: systemPrompt }],
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
    const jsonResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    // JSONをパースして返す
    try {
      // レスポンスが既にJSONオブジェクトの場合もある
      if (typeof jsonResponse === 'object') {
        return jsonResponse as T;
      }

      // 文字列の場合はパースする
      return JSON.parse(jsonResponse) as T;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('JSONの解析に失敗しました');
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('API呼び出しに失敗しました');
  }
};

// 複数メッセージ対応の拡張関数
export const generateWithGeminiMultipleMessages = async (
  messages: { role: 'user' | 'model'; text: string }[],
  systemInstruction: string,
  apiKey: string,
  modelType: string,
): Promise<string> => {
  try {
    const endpoint = `${getApiEndpoint()}?key=${apiKey}`;

    // ユーザーとモデルメッセージを変換
    const contents: Message[] = messages.map((message) => ({
      role: message.role,
      parts: [{ text: message.text }],
    }));

    console.log('messages: \n', contents);

    const response = await axios.post(
      endpoint,
      {
        contents,
        system_instruction: {
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

    // レスポンスデータの取得
    const textResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log(textResponse);
    return textResponse;
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('API呼び出しに失敗しました');
  }
};

// JSON形式で複数メッセージのレスポンスを受け取る関数
export const generateWithGeminiMultipleMessagesJson = async <T>(
  messages: { role: 'user' | 'model'; text: string }[],
  systemInstruction: string,
  apiKey: string,
  modelType: string,
  responseSchema: any, // JSONスキーマ
): Promise<ApiResponse<T>> => {
  try {
    const endpoint = `${getApiEndpoint()}?key=${apiKey}`;

    // ユーザーとモデルメッセージを変換
    const contents: Message[] = messages.map((message) => ({
      role: message.role,
      parts: [{ text: message.text }],
    }));

    console.log('messages: \n', contents);

    const response = await axios.post(
      endpoint,
      {
        contents,
        system_instruction: {
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
    const jsonResponse = response.data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';

    try {
      // レスポンスが既にJSONオブジェクトの場合もある
      if (typeof jsonResponse === 'object') {
        return jsonResponse as T;
      }

      // 文字列の場合はパースする
      return JSON.parse(jsonResponse) as T;
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('JSONの解析に失敗しました');
    }
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error('API呼び出しに失敗しました');
  }
};
