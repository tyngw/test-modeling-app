import promptTemplatesJson from './promptTemplates.json';

export interface PromptTemplates {
  version: number;
  system: {
    agentElementGeneration: string;
    agentFullHierarchyGeneration: string;
    agentChat: string;
    chatAssistant: string;
    fullHierarchyOutputAppendix: string;
  };
  user: {
    elementGenerationWithContext: string;
    elementGenerationWithSpecification: string;
    suggestionGeneration: string;
    chatFallback: string;
    fullHierarchyGeneration: string;
    fullHierarchyRefinement: string;
    contextInitializationFirstChunk: string;
    contextInitializationNextChunk: string;
    chatAssistant: string;
  };
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends Record<string, unknown> ? DeepPartial<T[K]> : T[K];
};

const defaultPromptTemplates = promptTemplatesJson as PromptTemplates;

function clonePromptTemplates(templates: PromptTemplates): PromptTemplates {
  return JSON.parse(JSON.stringify(templates)) as PromptTemplates;
}

function mergeStringRecord<T extends Record<string, string>>(
  base: T,
  overrides: Partial<Record<keyof T, unknown>> | undefined,
): T {
  return Object.keys(base).reduce((accumulator, key) => {
    const typedKey = key as keyof T;
    const overrideValue = overrides?.[typedKey];

    accumulator[typedKey] = (
      typeof overrideValue === 'string' ? overrideValue : base[typedKey]
    ) as T[keyof T];
    return accumulator;
  }, {} as T);
}

export function getDefaultPromptTemplates(): PromptTemplates {
  return clonePromptTemplates(defaultPromptTemplates);
}

export function normalizePromptTemplates(
  rawValue: unknown,
  _options?: { legacyCustomSystemPrompt?: string },
): PromptTemplates {
  const defaultTemplates = getDefaultPromptTemplates();
  const overrides =
    rawValue && typeof rawValue === 'object'
      ? (rawValue as DeepPartial<PromptTemplates>)
      : undefined;

  const templates: PromptTemplates = {
    version: typeof overrides?.version === 'number' ? overrides.version : defaultTemplates.version,
    system: mergeStringRecord(defaultTemplates.system, overrides?.system),
    user: mergeStringRecord(defaultTemplates.user, overrides?.user),
  };

  const rawSystemTemplates = overrides?.system;
  const hasLegacyChatOverride =
    typeof rawSystemTemplates?.chatAssistant === 'string' &&
    rawSystemTemplates.chatAssistant.trim() !== defaultTemplates.system.chatAssistant.trim();
  const hasAgentChatOverride = typeof rawSystemTemplates?.agentChat === 'string';

  if (hasLegacyChatOverride && !hasAgentChatOverride) {
    templates.system.agentChat = rawSystemTemplates.chatAssistant as string;
  }

  // 旧chatAssistantは後方互換のためagentChatと同じ内容として扱う
  templates.system.chatAssistant = templates.system.agentChat;

  return templates;
}

export function parsePromptTemplatesJson(
  promptTemplatesJsonText: string,
  options?: { legacyCustomSystemPrompt?: string },
): PromptTemplates {
  const parsedValue = JSON.parse(promptTemplatesJsonText) as unknown;
  return normalizePromptTemplates(parsedValue, options);
}

export function stringifyPromptTemplates(promptTemplates: PromptTemplates): string {
  return JSON.stringify(promptTemplates, null, 2);
}

export function renderPromptTemplate(
  template: string,
  variables: Record<string, string | number | undefined>,
): string {
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined ? '' : String(value);
  });
}
