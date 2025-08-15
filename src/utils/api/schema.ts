// src/utils/api/schema.ts
export interface SuggestionResponse {
  suggestions: string[];
}

// Gemini APIに渡すレスポンススキーマの定義
export const suggestionResponseSchema = {
  type: 'object',
  properties: {
    suggestions: {
      type: 'array',
      items: {
        type: 'string',
      },
      description: '提案された要素の配列。各要素は1行のテキスト。',
    },
  },
  required: ['suggestions'],
  additionalProperties: false,
};
