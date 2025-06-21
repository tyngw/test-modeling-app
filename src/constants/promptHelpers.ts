// src/utils/promptHelpers.ts
import { getSystemPromptTemplate } from '../utils/storage/localStorageHelpers';
import { USER_PROMPT_FORMAT } from '../config/systemPrompt';

interface PromptVariables {
  structureText: string;
  inputText: string;
}

// システムプロンプトをそのまま取得する関数
export const getSystemPrompt = (): string => {
  return getSystemPromptTemplate();
};

// 構造テキストを含んだユーザープロンプトを生成する関数
export const createUserPrompt = ({ structureText, inputText }: PromptVariables): string => {
  return USER_PROMPT_FORMAT.replace('{{structureText}}', structureText).replace(
    '{{inputText}}',
    inputText,
  );
};

// 従来の方式との互換性のために残す
export const createSystemPrompt = ({ structureText, inputText }: PromptVariables): string => {
  const systemPromptTemplate = getSystemPromptTemplate();
  // console.log('[DEBUG] System prompt template:', systemPromptTemplate);
  // console.log('[DEBUG] Input text:', inputText);
  // console.log('[DEBUG] Structure text length:', structureText.length);

  const finalPrompt = systemPromptTemplate
    .replace('{{structureText}}', structureText)
    .replace('{{inputText}}', inputText);

  // console.log('[DEBUG] Final prompt after template substitution:', finalPrompt.substring(0, 500) + '...');
  return finalPrompt;
};
