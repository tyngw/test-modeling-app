// src/utils/api/api.ts
import axios from 'axios';
import { getApiEndpoint } from '../storage/localStorageHelpers';

export const generateWithGemini = async (prompt: string, apiKey: string, modelType: string) => {
    try {
        console.log('prompt: \n', prompt)
        const endpoint = `${getApiEndpoint()}?key=${apiKey}`;
        const response = await axios.post(
            endpoint,
            {
                contents: [
                    {
                        parts: [{ text: prompt }]
                    }
                ]
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