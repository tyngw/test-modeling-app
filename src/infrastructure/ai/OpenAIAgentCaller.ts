// src/infrastructure/ai/OpenAIAgentCaller.ts
//
// OpenAI互換API用の Agent LLM Caller
// AgentLoop に注入する callLLM コールバックを生成する
//
// - メッセージ配列とツール定義を受け取り、OpenAI Chat Completions API を呼ぶ
// - tool_calls がある場合はパースして返す
// - テキスト応答のみの場合は content を返す
//
// すべてのリクエストは /api/ai/generate（Next.js API Route）を経由し、
// CORS/CSP 制約を回避する（既存アーキテクチャを踏襲）

import { post } from '../../utils/http/httpClient';
import {
  AgentMessage,
  ToolCall,
  OpenAIToolDefinition,
  LLMCallerFn,
} from '../../domain/ai/agent/types';
import { sanitizeApiResponse } from '../../utils/security/sanitization';
import { debugLog } from '../../utils/debugLogHelpers';

/**
 * OpenAI互換API用のツールコール対応レスポンス型
 * choices[0].message に tool_calls が含まれる場合がある
 */
interface OpenAIToolCallResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      // eslint-disable-next-line camelcase
      tool_calls?: ToolCall[];
    };
    finish_reason?: string;
  }>;
}

/**
 * OpenAI互換APIの LLM Caller ファクトリ
 *
 * @param apiKey    - APIキー（空の場合はヘッダーに付与しない、ローカルLLM用）
 * @param modelType - モデル名（gpt-4o, qwen2.5 等）
 * @param endpoint  - APIエンドポイントURL
 * @returns AgentLoop に渡す callLLM 関数
 */
export function createOpenAIAgentCaller(
  apiKey: string,
  modelType: string,
  endpoint: string,
): LLMCallerFn {
  return async (
    messages: AgentMessage[],
    tools: OpenAIToolDefinition[],
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> => {
    // AgentMessage（camelCase）→ OpenAI API 形式（snake_case）に変換
    const openaiMessages = messages.map((m) => {
      if ('toolCallId' in m) {
        return {
          role: 'tool' as const,
          // eslint-disable-next-line
          tool_call_id: m.toolCallId,
          content: m.content,
        };
      }
      if (m.role === 'assistant' && 'toolCalls' in m && m.toolCalls) {
        return {
          role: 'assistant' as const,
          content: m.content || '',
          // eslint-disable-next-line
          tool_calls: m.toolCalls,
        };
      }
      return { role: m.role, content: m.content };
    });

    // リクエストペイロード構築
    // eslint-disable-next-line
    const payload: Record<string, unknown> = {
      model: modelType,
      messages: openaiMessages,
      temperature: 0.2,
      // eslint-disable-next-line
      max_tokens: 2048,
    };

    // ツール定義がある場合のみ追加
    // 空配列の場合はツールなし（最終回答を強制）
    if (tools && tools.length > 0) {
      payload.tools = tools;
    }

    if (process.env.NODE_ENV === 'development') {
      debugLog('[OpenAIAgentCaller] リクエスト:', {
        model: modelType,
        messagesCount: openaiMessages.length,
        toolsCount: tools?.length || 0,
      });

      // デバッグ用: 実際に送るメッセージ内容のプレビューを出力（長すぎる場合は切り詰め）
      try {
        const preview = openaiMessages.map((m) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content.slice(0, 400) : m.content,
          // If the snake_case key exists, read it via bracket access and expose under camelCase
          // to avoid linting camelcase rules on identifiers
          toolCallId: (m as any)['tool_call_id'] as string | undefined,
        }));
        debugLog('[OpenAIAgentCaller] Message preview:', preview);
      } catch (e) {
        debugLog('[OpenAIAgentCaller] Message preview error', String(e));
      }
    }

    // /api/ai/generate プロキシ経由で送信
    const response = await post<OpenAIToolCallResponse>('/api/ai/generate', {
      endpoint,
      payload,
      apiKey,
    });

    const choice = response.data.choices?.[0];
    const message = choice?.message;

    if (!message) {
      throw new Error('LLM からの応答が空です');
    }

    // tool_calls がある場合はツールコールとして返す
    if (message.tool_calls && message.tool_calls.length > 0) {
      debugLog(
        `[OpenAIAgentCaller] ツールコール検出: ${message.tool_calls.map((tc) => tc.function.name).join(', ')}`,
      );
      return {
        content: message.content || '',
        toolCalls: message.tool_calls,
      };
    }

    // テキストレスポンスのみ
    const rawContent = message.content || '';
    const sanitized = sanitizeApiResponse(rawContent) as string;

    debugLog(`[OpenAIAgentCaller] テキスト応答: ${sanitized.slice(0, 100)}...`);

    return {
      content: sanitized,
      toolCalls: undefined,
    };
  };
}
