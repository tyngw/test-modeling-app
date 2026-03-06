// src/domain/ai/agent/AgentLoop.ts
//
// Agentic Search のメインループ
//
// while (step < maxSteps):
//   1. LLM を呼び出し（ツール定義付き）
//   2. tool_calls がある → ツール実行 → 結果をメッセージに追加 → ループ継続
//   3. テキスト応答のみ    → 最終回答として返却
//   4. maxSteps 到達       → ツール無しで最終回答を強制
import { AgentContext, AgentMessage, AgentResult, AgentLoopConfig, LLMCallerFn } from './types';
import { ToolRegistry } from './ToolRegistry';
import { createAgentTools } from './AgentTools';
import { debugLog } from '../../../utils/debugLogHelpers';

/** デフォルトのループ設定 */
const DEFAULT_CONFIG: AgentLoopConfig = {
  maxSteps: 5,
};

/** ツール結果の最大文字数（トークン節約） */
const MAX_TOOL_RESULT_LENGTH = 3000;

/**
 * Agent ループを実行
 *
 * @param systemPrompt - Agentシステムプロンプト（ツールの使い方を指示）
 * @param userPrompt   - ユーザーの要求（「子要素を生成して」等）
 * @param context      - ツール実行時に参照するアプリケーション状態
 * @param callLLM      - LLM API 呼び出し関数（DI: プロバイダー依存を分離）
 * @param config       - ループ設定（maxSteps 等）
 */
export async function runAgentLoop(
  systemPrompt: string,
  userPrompt: string,
  context: AgentContext,
  callLLM: LLMCallerFn,
  config: Partial<AgentLoopConfig> = {},
): Promise<AgentResult> {
  const { maxSteps, onStepComplete } = { ...DEFAULT_CONFIG, ...config };

  // ツールレジストリの初期化
  const registry = new ToolRegistry();
  registry.registerAll(createAgentTools());
  const openAITools = registry.toOpenAITools();

  // メッセージ履歴の初期化
  const messages: AgentMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ];

  let step = 0;

  while (step < maxSteps) {
    step++;
    debugLog(`[AgentLoop] ステップ ${step}/${maxSteps} 開始`);

    try {
      const isLastStep = step === maxSteps;

      // 最終ステップではツール無しで最終回答を強制
      if (isLastStep) {
        messages.push({
          role: 'user',
          content:
            '【指示】これまでに収集した情報を基に、最終的な回答を生成してください。' +
            'これ以上ツールを使用せず、必ず指定されたJSON形式で回答してください。',
        });
      }

      const tools = isLastStep ? [] : openAITools;
      const result = await callLLM(messages, tools);

      // ツールコールがある場合: ツールを実行してループ継続
      if (result.toolCalls && result.toolCalls.length > 0) {
        debugLog(`[AgentLoop] ステップ ${step}: ${result.toolCalls.length}個のツールコール`);

        // アシスタントメッセージ（ツールコール付き）を履歴に追加
        const assistantMsg: AgentMessage = {
          role: 'assistant',
          content: result.content || '',
          toolCalls: result.toolCalls,
        };
        messages.push(assistantMsg);

        // 各ツールを実行し結果を追加
        for (const toolCall of result.toolCalls) {
          debugLog(`[AgentLoop] ツール実行: ${toolCall.function.name}`);
          const toolResult = registry.executeToolCall(toolCall, context);

          // 結果をトランケート（トークン節約）
          const truncated =
            toolResult.length > MAX_TOOL_RESULT_LENGTH
              ? toolResult.slice(0, MAX_TOOL_RESULT_LENGTH) + '\n...(結果が長いため省略)'
              : toolResult;

          messages.push({
            role: 'tool',
            toolCallId: toolCall.id,
            toolName: toolCall.function.name,
            content: truncated,
          });
        }

        onStepComplete?.(step, assistantMsg);
        continue;
      }

      // テキストレスポンスのみ: 最終回答
      debugLog(`[AgentLoop] ステップ ${step}: 最終回答を受信`);
      onStepComplete?.(step, { role: 'assistant', content: result.content });

      return {
        response: result.content,
        messages,
        steps: step,
        finishReason: 'complete',
      };
    } catch (error) {
      debugLog(
        `[AgentLoop] ステップ ${step} エラー: ${error instanceof Error ? error.message : '不明'}`,
      );
      return {
        response: '',
        messages,
        steps: step,
        finishReason: 'error',
      };
    }
  }

  // maxSteps 到達: 最後のアシスタントメッセージを返却
  debugLog(`[AgentLoop] 最大ステップ(${maxSteps})に到達`);
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');

  return {
    response: lastAssistant?.content || '',
    messages,
    steps: maxSteps,
    finishReason: 'max_steps',
  };
}
