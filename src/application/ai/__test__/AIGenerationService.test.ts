import { AIGenerationService } from '../AIGenerationService';
import { Element } from '../../../domain/element/models/Element';
import type {
  IAIRepository,
  IConfigRepository,
} from '../../../domain/ai/repositories/IAIRepository';
import { AGENT_ELEMENT_GENERATION_PROMPT } from '../../../config/agentSystemPrompt';

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
  return {
    getApiKey: () => 'test-key',
    getModelType: () => 'test-model',
    getPrompt: () => '仕様書本文',
    getSystemPromptTemplate: () => systemPromptTemplate,
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

    expect(actualSystemPrompt).toBe(AGENT_ELEMENT_GENERATION_PROMPT);
    expect(actualUserPrompt).toContain('ソフトウェアテストのパラダイム');
    expect(actualContext).toEqual(
      expect.objectContaining({
        structureText: 'root',
        specificationText: '仕様書本文',
      }),
    );
    expect(actualOptions).toEqual(expect.objectContaining({ maxSteps: 5 }));
  });
});
