import { getDefaultPromptTemplates, normalizePromptTemplates } from '../promptTemplates';

describe('promptTemplates legacy chat integration', () => {
  it('legacy chatAssistant override is migrated to agentChat', () => {
    const defaults = getDefaultPromptTemplates();
    const migrated = normalizePromptTemplates({
      system: {
        chatAssistant: 'legacy custom chat prompt',
      },
    });

    expect(migrated.system.agentChat).toBe('legacy custom chat prompt');
    expect(migrated.system.chatAssistant).toBe('legacy custom chat prompt');
    expect(migrated.system.agentElementGeneration).toBe(defaults.system.agentElementGeneration);
  });

  it('agentChat override takes precedence over legacy chatAssistant', () => {
    const migrated = normalizePromptTemplates({
      system: {
        agentChat: 'new agent chat prompt',
        chatAssistant: 'legacy custom chat prompt',
      },
    });

    expect(migrated.system.agentChat).toBe('new agent chat prompt');
    expect(migrated.system.chatAssistant).toBe('new agent chat prompt');
  });
});
