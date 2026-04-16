// src/domain/ai/agent/__test__/AgentLoop.test.ts
//
// Agent ループのユニットテスト
// callLLM をモックして、ツールコール→最終回答のフローをテスト

import { runAgentLoop } from '../AgentLoop';
import { AgentContext, LLMCallerFn, ToolCall, OpenAIToolDefinition } from '../types';

const MOCK_CONTEXT: AgentContext = {
  specificationText: '# テスト仕様\nテスト内容です。\n\n## 機能A\n機能Aの説明',
  structureText: 'ルート\n  要素1',
  selectedElement: { id: 'el-1', texts: ['要素1'] },
  hierarchyDraftText: '',
};

describe('AgentLoop - runAgentLoop', () => {
  it('ツールコールなしで即座に最終回答を返す', async () => {
    // LLMがいきなりテキストレスポンスを返す場合
    const mockCallLLM: LLMCallerFn = async () => ({
      content: '{"elements": ["子A", "子B"]}',
      toolCalls: undefined,
    });

    const result = await runAgentLoop(
      'システムプロンプト',
      'ユーザープロンプト',
      MOCK_CONTEXT,
      mockCallLLM,
    );

    expect(result.finishReason).toBe('complete');
    expect(result.steps).toBe(1);
    expect(result.response).toContain('子A');
  });

  it('ツールコール後に最終回答を返す', async () => {
    let callCount = 0;

    const mockCallLLM: LLMCallerFn = async (_messages, _tools: OpenAIToolDefinition[]) => {
      callCount++;

      // 1回目: ツールコールを返す
      if (callCount === 1) {
        const toolCall: ToolCall = {
          id: 'call_1',
          type: 'function',
          function: {
            name: 'get_spec_overview',
            arguments: '{}',
          },
        };
        return { content: '', toolCalls: [toolCall] };
      }

      // 2回目: 最終回答
      return {
        content: '{"elements": ["機能A"]}',
        toolCalls: undefined,
      };
    };

    const result = await runAgentLoop(
      'システムプロンプト',
      '子要素を生成してください',
      MOCK_CONTEXT,
      mockCallLLM,
    );

    expect(result.finishReason).toBe('complete');
    expect(result.steps).toBe(2);
    expect(result.response).toContain('機能A');
    expect(callCount).toBe(2);
  });

  it('search_spec ツールを呼び出してコンテキストを収集する', async () => {
    let callCount = 0;

    const mockCallLLM: LLMCallerFn = async () => {
      callCount++;

      if (callCount === 1) {
        return {
          content: '',
          toolCalls: [
            {
              id: 'call_search',
              type: 'function' as const,
              function: {
                name: 'search_spec',
                arguments: JSON.stringify({ query: '機能A' }),
              },
            },
          ],
        };
      }

      return {
        content: '{"elements": ["機能Aの詳細"]}',
        toolCalls: undefined,
      };
    };

    const result = await runAgentLoop('テスト', 'テスト', MOCK_CONTEXT, mockCallLLM);

    expect(result.finishReason).toBe('complete');
    // toolメッセージがメッセージ履歴に含まれる
    const toolMessages = result.messages.filter((m) => m.role === 'tool');
    expect(toolMessages.length).toBeGreaterThan(0);
    expect(toolMessages[0].content).toContain('機能A');
  });

  it('maxSteps に到達するとループを終了する', async () => {
    // 常にツールコールを返すLLM（ループが終了しない場合のテスト）
    const mockCallLLM: LLMCallerFn = async (_messages, tools: OpenAIToolDefinition[]) => {
      // ツールがない場合（最終ステップ）はテキストを返す
      if (!tools || tools.length === 0) {
        return { content: '{"elements": ["強制回答"]}', toolCalls: undefined };
      }
      return {
        content: '',
        toolCalls: [
          {
            id: `call_${Date.now()}`,
            type: 'function' as const,
            function: { name: 'get_structure', arguments: '{}' },
          },
        ],
      };
    };

    const result = await runAgentLoop('テスト', 'テスト', MOCK_CONTEXT, mockCallLLM, {
      maxSteps: 3,
    });

    // 最終ステップ（3回目）ではツールなしで呼び出されるため complete になる
    expect(result.steps).toBeLessThanOrEqual(3);
    expect(result.response).toContain('強制回答');
  });

  it('LLMエラー時はerror理由で即終了する', async () => {
    const mockCallLLM: LLMCallerFn = async () => {
      throw new Error('API接続エラー');
    };

    const result = await runAgentLoop('テスト', 'テスト', MOCK_CONTEXT, mockCallLLM);

    expect(result.finishReason).toBe('error');
    expect(result.response).toBe('');
  });

  it('onStepComplete コールバックが各ステップで呼ばれる', async () => {
    const stepLog: number[] = [];

    const mockCallLLM: LLMCallerFn = async () => ({
      content: '{"elements": []}',
      toolCalls: undefined,
    });

    await runAgentLoop('テスト', 'テスト', MOCK_CONTEXT, mockCallLLM, {
      onStepComplete: (step) => stepLog.push(step),
    });

    expect(stepLog).toContain(1);
  });

  it('ワークフロープリセット指定時は段階指示をメッセージに含める', async () => {
    const messageSnapshots: string[][] = [];
    let callCount = 0;

    const mockCallLLM: LLMCallerFn = async (messages) => {
      callCount += 1;
      messageSnapshots.push(
        messages.filter((message) => message.role === 'user').map((message) => message.content),
      );

      if (callCount === 1) {
        return {
          content: '',
          toolCalls: [
            {
              id: 'call_1',
              type: 'function',
              function: {
                name: 'get_selected_subtree',
                arguments: '{}',
              },
            },
          ],
        };
      }

      return {
        content:
          '{"rootText": "要素1の再整理", "hierarchicalItems": [{"text": "分類", "level": 0, "originalLine": "- 分類"}]}',
        toolCalls: undefined,
      };
    };

    await runAgentLoop('システム', '全生成', MOCK_CONTEXT, mockCallLLM, {
      maxSteps: 3,
      workflowPreset: 'full_generation',
    });

    expect(
      messageSnapshots[0].some((message) => message.includes('【ワークフロー: Explore】')),
    ).toBe(true);
    expect(
      messageSnapshots[1].some((message) => message.includes('【ワークフロー: Analyze】')),
    ).toBe(true);
  });

  it('set_hierarchy_draft で保存したドラフトを後続ツールで参照できる', async () => {
    let callCount = 0;

    const draftContext: AgentContext = {
      ...MOCK_CONTEXT,
      hierarchyDraftText: '',
    };

    const mockCallLLM: LLMCallerFn = async (_messages, tools) => {
      callCount += 1;

      if (callCount === 1) {
        return {
          content: '',
          toolCalls: [
            {
              id: 'call_set_draft',
              type: 'function',
              function: {
                name: 'set_hierarchy_draft',
                arguments: JSON.stringify({ draft: '- 章\n  - 項目' }),
              },
            },
          ],
        };
      }

      if (callCount === 2) {
        expect(tools.some((tool) => tool.function.name === 'get_hierarchy_draft')).toBe(true);
        return {
          content: '',
          toolCalls: [
            {
              id: 'call_get_draft',
              type: 'function',
              function: {
                name: 'get_hierarchy_draft',
                arguments: '{}',
              },
            },
          ],
        };
      }

      return {
        content:
          '{"rootText": "要素1の再整理", "hierarchicalItems": [{"text": "章", "level": 0, "originalLine": "- 章"},{"text":"項目","level":1,"originalLine":"  - 項目"}]}',
        toolCalls: undefined,
      };
    };

    const result = await runAgentLoop('システム', '全生成', draftContext, mockCallLLM, {
      maxSteps: 4,
      workflowPreset: 'full_generation',
    });

    expect(result.finishReason).toBe('complete');
    expect(draftContext.hierarchyDraftText).toBe('- 章\n  - 項目');
    expect(callCount).toBe(3);
  });
});
