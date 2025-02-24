// src/utils/promptHelpers.ts
import { getSystemPromptTemplate } from '../utils/localStorageHelpers';

interface PromptVariables {
  structureText: string;
  inputText: string;
}

export const createSystemPrompt = ({ structureText, inputText }: PromptVariables): string => {
    const systemPromptTemplate = getSystemPromptTemplate();
    return systemPromptTemplate
    .replace('{{structureText}}', structureText)
    .replace('{{inputText}}', inputText);
};
