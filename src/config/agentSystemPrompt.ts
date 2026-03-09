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
  return getAgentElementGenerationPrompt(promptTemplates);
}

export function resolveFullHierarchySystemPrompt(promptTemplates: PromptTemplates): string {
  const defaultPrompt = getAgentFullHierarchyGenerationPrompt(promptTemplates);
  return `${defaultPrompt}\n\n${promptTemplates.system.fullHierarchyOutputAppendix.trim()}`;
}
