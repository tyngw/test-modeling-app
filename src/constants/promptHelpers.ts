// src/utils/promptHelpers.ts
import { SYSTEM_PROMPT_TEMPLATE } from '../constants/systemPrompt';

interface PromptVariables {
  structureText: string;
  inputText: string;
}

export const createSystemPrompt = ({ structureText, inputText }: PromptVariables): string => {
  return SYSTEM_PROMPT_TEMPLATE
    .replace('{{structureText}}', structureText)
    .replace('{{inputText}}', inputText);
};
