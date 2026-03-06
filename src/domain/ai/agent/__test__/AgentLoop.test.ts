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
});
