import { PromptTemplates } from './promptTemplates';

export function getAgentElementGenerationPrompt(promptTemplates: PromptTemplates): string {
  return promptTemplates.system.agentElementGeneration.trim();
}

export function getAgentFullHierarchyGenerationPrompt(promptTemplates: PromptTemplates): string {
  return promptTemplates.system.agentFullHierarchyGeneration.trim();
}

export function getAgentChatPrompt(promptTemplates: PromptTemplates): string {
  return promptTemplates.system.agentChat.trim();
}

export function resolveElementGenerationSystemPrompt(promptTemplates: PromptTemplates): string {
  const customSystemPrompt = promptTemplates.system.customSystemPrompt.trim();
  if (customSystemPrompt.length > 0) return customSystemPrompt;

  return getAgentElementGenerationPrompt(promptTemplates);
}

export function resolveFullHierarchySystemPrompt(promptTemplates: PromptTemplates): string {
  const defaultPrompt = getAgentFullHierarchyGenerationPrompt(promptTemplates);
  const customSystemPrompt = promptTemplates.system.customSystemPrompt.trim();
  if (customSystemPrompt.length === 0) return defaultPrompt;

  return `${defaultPrompt}\n\n【追加のカスタム指示】\n${customSystemPrompt}\n\n${promptTemplates.system.fullHierarchyOutputAppendix.trim()}`;
}
