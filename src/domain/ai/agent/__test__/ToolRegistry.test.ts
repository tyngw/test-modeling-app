// src/domain/ai/agent/__test__/ToolRegistry.test.ts
//
// ToolRegistry のユニットテスト

import { ToolRegistry } from '../ToolRegistry';
import { AgentToolDefinition, AgentContext, ToolCall } from '../types';

const mockContext: AgentContext = {
  specificationText: 'テスト仕様',
  structureText: 'テスト構造',
};

function createMockTool(name: string): AgentToolDefinition {
  return {
    name,
    description: `${name} ツール`,
    parameters: { type: 'object', properties: {} },
    execute: () => `${name} の結果`,
  };
}

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('ツールを登録して名前一覧を取得できる', () => {
    registry.register(createMockTool('tool_a'));
    registry.register(createMockTool('tool_b'));

    expect(registry.getToolNames()).toEqual(['tool_a', 'tool_b']);
  });

  it('registerAll で一括登録できる', () => {
    registry.registerAll([createMockTool('x'), createMockTool('y')]);
    expect(registry.getToolNames()).toHaveLength(2);
  });

  it('OpenAI形式のツール定義に変換できる', () => {
    registry.register(createMockTool('test_tool'));
    const openaiTools = registry.toOpenAITools();

    expect(openaiTools).toHaveLength(1);
    expect(openaiTools[0].type).toBe('function');
    expect(openaiTools[0].function.name).toBe('test_tool');
    expect(openaiTools[0].function.description).toBeTruthy();
  });

  it('ToolCall を実行して結果を返す', () => {
    registry.register(createMockTool('my_tool'));

    const toolCall: ToolCall = {
      id: 'call_1',
      type: 'function',
      function: { name: 'my_tool', arguments: '{}' },
    };

    const result = registry.executeToolCall(toolCall, mockContext);
    expect(result).toBe('my_tool の結果');
  });

  it('存在しないツール名でエラーメッセージを返す', () => {
    const toolCall: ToolCall = {
      id: 'call_2',
      type: 'function',
      function: { name: 'nonexistent', arguments: '{}' },
    };

    const result = registry.executeToolCall(toolCall, mockContext);
    expect(result).toContain('エラー');
    expect(result).toContain('nonexistent');
  });

  it('不正な引数JSONでもエラーメッセージを返す（例外を投げない）', () => {
    registry.register(createMockTool('safe_tool'));

    const toolCall: ToolCall = {
      id: 'call_3',
      type: 'function',
      function: { name: 'safe_tool', arguments: 'invalid json' },
    };

    const result = registry.executeToolCall(toolCall, mockContext);
    expect(result).toContain('エラー');
  });
});
