// src/utils/api/api.ts
import axios from 'axios';
import { getApiEndpoint } from '../storage/localStorageHelpers';
import { getSystemPrompt } from '../../constants/promptHelpers';

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

export const generateWithGemini = async (prompt: string, apiKey: string, modelType: string) => {
    try {
        console.log('prompt: \n', prompt)
        const endpoint = `${getApiEndpoint()}?key=${apiKey}`;
        const systemPrompt = getSystemPrompt();
        
        // 正しいフォーマット：system_instructionを使用
        const response = await axios.post(
            endpoint,
            {
                contents: [
                    {
                        role: 'user',
                        parts: [{ text: prompt }]
                    }
                ],
                system_instruction: {
                    parts: [{ text: systemPrompt }]
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
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

// 複数メッセージ対応の拡張関数（修正版）
export const generateWithGeminiMultipleMessages = async (
    messages: { role: 'user' | 'model'; text: string }[], 
    systemInstruction: string,
    apiKey: string, 
    modelType: string
) => {
    try {
        const endpoint = `${getApiEndpoint()}?key=${apiKey}`;
        
        // ユーザーとモデルメッセージを変換
        const contents: Message[] = messages.map(message => ({
            role: message.role,
            parts: [{ text: message.text }]
        }));
        
        console.log('messages: \n', contents);
        
        const response = await axios.post(
            endpoint,
            {
                contents,
                system_instruction: {
                    parts: [{ text: systemInstruction }]
                }
            },
            {
                headers: {
                    'Content-Type': 'application/json'
                }
            }
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