import { PromptTemplates, renderPromptTemplate } from './promptTemplates';

/**
 * チャットアシスタント用のユーザープロンプトを作成（システムプロンプト重複を避ける）
 */
export const createChatUserPromptOnly = ({
  selectedElement,
  currentStructure,
  userInput,
  promptTemplates,
}: {
  selectedElement: string;
  currentStructure: string;
  userInput: string;
  promptTemplates: PromptTemplates;
}): string => {
  return renderPromptTemplate(promptTemplates.user.chatAssistant, {
    selectedElement,
    currentStructure,
    userInput,
  });
};

/**
 * チャットアシスタント専用のシステムプロンプトを取得
 */
export const getChatSystemPrompt = (promptTemplates: PromptTemplates): string => {
  return promptTemplates.system.chatAssistant;
};

/**
 * チャットアシスタント用のユーザープロンプトを作成（レガシー版 - 互換性のため残す）
 * @deprecated 新しいコードではcreateChatUserPromptOnlyとgetChatSystemPromptを使用してください
 */
export const createChatUserPrompt = ({
  selectedElement,
  currentStructure,
  userInput,
  promptTemplates,
}: {
  selectedElement: string;
  currentStructure: string;
  userInput: string;
  promptTemplates: PromptTemplates;
}): string => {
  return createChatUserPromptOnly({
    selectedElement,
    currentStructure,
    userInput,
    promptTemplates,
  });
};
