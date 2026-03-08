import { AIGenerationService } from '../AIGenerationService';
import { Element } from '../../../domain/element/models/Element';
import type {
  IAIRepository,
  IConfigRepository,
} from '../../../domain/ai/repositories/IAIRepository';
import {
  resolveElementGenerationSystemPrompt,
  resolveFullHierarchySystemPrompt,
} from '../../../config/agentSystemPrompt';
import { getDefaultPromptTemplates } from '../../../config/promptTemplates';

const mockRunAgentLoop = jest.fn();

jest.mock('../../../domain/ai/agent', () => ({
  runAgentLoop: (...args: unknown[]) => mockRunAgentLoop(...args),
}));

jest.mock('../../../infrastructure/ai/OpenAIAgentCaller', () => ({
  createOpenAIAgentCaller: jest.fn(() => jest.fn()),
}));

jest.mock('../../../infrastructure/ai/GeminiAgentCaller', () => ({
  createGeminiAgentCaller: jest.fn(() => jest.fn()),
}));

function createTargetElement(): Element {
  return new Element(
    'el-1',
    ['ソフトウェアテストのパラダイム'],
    0,
    0,
    100,
    40,
    [40],
    false,
    true,
    true,
    false,
    'none',
    'none',
    'none',
    null,
  );
}

function createAiRepository(): IAIRepository {
  return {
    generateSingle: jest.fn(async () => '{"elements": []}'),
    generateWithThread: jest.fn(async () => ({ response: '{"elements": []}', updatedHistory: [] })),
  };
}

function createConfigRepository(systemPromptTemplate: string): IConfigRepository {
  const promptTemplates = getDefaultPromptTemplates();
  promptTemplates.system.customSystemPrompt = systemPromptTemplate;

  return {
    getApiKey: () => 'test-key',
    getModelType: () => 'test-model',
    getPrompt: () => '仕様書本文',
    getSystemPromptTemplate: () => systemPromptTemplate,
    getPromptTemplates: () => promptTemplates,
    getApiProvider: () => 'openai',
    getApiEndpoint: () => 'http://localhost:1234/v1/chat/completions',
    getPresetApiEndpoint: () => 'http://localhost:1234/v1/chat/completions',
  };
}

describe('AIGenerationService', () => {
  beforeEach(() => {
    mockRunAgentLoop.mockReset();
    mockRunAgentLoop.mockResolvedValue({
      finishReason: 'complete',
      response: '{"elements": ["デバッグ指向パラダイム"]}',
      steps: 1,
      messages: [],
    });
  });

  it('設定済みのシステムプロンプトを要素生成エージェントに渡す', async () => {
    const customSystemPrompt = 'カスタムの要素生成システムプロンプト';
    const service = new AIGenerationService(
      createAiRepository(),
      createConfigRepository(customSystemPrompt),
    );

    await service.generateElements(createTargetElement(), 'root');

    expect(mockRunAgentLoop).toHaveBeenCalledTimes(1);

    const [actualSystemPrompt, actualUserPrompt, actualContext, , actualOptions] =
      mockRunAgentLoop.mock.calls[0];

    expect(actualSystemPrompt).toBe(customSystemPrompt);
    expect(actualUserPrompt).toContain('ソフトウェアテストのパラダイム');
    expect(actualContext).toEqual(
      expect.objectContaining({
        structureText: 'root',
        specificationText: '仕様書本文',
      }),
    );
    expect(actualOptions).toEqual(expect.objectContaining({ maxSteps: 5 }));
  });

  it('システムプロンプト未設定時は既定のエージェントプロンプトを使う', async () => {
    const service = new AIGenerationService(createAiRepository(), createConfigRepository('   '));

    await service.generateElements(createTargetElement(), 'root');

    expect(mockRunAgentLoop).toHaveBeenCalledTimes(1);

    const [actualSystemPrompt, actualUserPrompt, actualContext, , actualOptions] =
      mockRunAgentLoop.mock.calls[0];

    expect(actualSystemPrompt).toBe(
      resolveElementGenerationSystemPrompt(createConfigRepository('   ').getPromptTemplates()),
    );
    expect(actualUserPrompt).toContain('ソフトウェアテストのパラダイム');
    expect(actualContext).toEqual(
      expect.objectContaining({
        structureText: 'root',
        specificationText: '仕様書本文',
      }),
    );
    expect(actualOptions).toEqual(expect.objectContaining({ maxSteps: 5 }));
  });

  it('全生成では専用のシステムプロンプトとワークフローを使う', async () => {
    const service = new AIGenerationService(createAiRepository(), createConfigRepository('   '));

    mockRunAgentLoop.mockResolvedValueOnce({
      finishReason: 'complete',
      response:
        '{"rootText":"リスクベースドテストは嫌いです","hierarchicalItems":[{"text":"背景","level":0,"originalLine":"- 背景"}]}',
      steps: 2,
      messages: [],
    });

    const result = await service.generateFullHierarchy(createTargetElement(), 'root', 'subtree');

    expect(mockRunAgentLoop).toHaveBeenCalledTimes(1);

    const [actualSystemPrompt, actualUserPrompt, actualContext, , actualOptions] =
      mockRunAgentLoop.mock.calls[0];

    expect(actualSystemPrompt).toBe(
      resolveFullHierarchySystemPrompt(createConfigRepository('   ').getPromptTemplates()),
    );
    expect(actualUserPrompt).toContain('配下の要素階層全体');
    expect(actualContext).toEqual(
      expect.objectContaining({
        structureText: 'root',
        selectedSubtreeText: 'subtree',
      }),
    );
    expect(actualOptions).toEqual(
      expect.objectContaining({ maxSteps: 8, workflowPreset: 'full_generation' }),
    );
    expect(result.rootText).toBe('リスクベースドテストは嫌いです');
    expect(result.hierarchicalItems).toHaveLength(1);
  });
});
