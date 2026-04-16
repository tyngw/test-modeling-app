// src/infrastructure/ai/GeminiAgentCaller.ts
//
// Gemini API 用の Agent LLM Caller
// AgentLoop に注入する callLLM コールバックを生成する
//
// Gemini native function calling を使用:
//   リクエスト: tools: [{ functionDeclarations: [{name, description, parameters}] }]
//   レスポンス: parts[0].functionCall = { name, args }
//   ツール結果: {role:'user', parts:[{functionResponse:{name, response:{result}}}]}
//
// OpenAIAgentCaller との違い:
//   - プロキシ不要（Gemini は直接 REST API を叩く）
//   - メッセージフォーマット変換が必要（user/model/functionCall/functionResponse）
//   - API キーはクエリパラメータに付与

import { post } from '../../utils/http/httpClient';
import {
  AgentMessage,
  ToolCall,
  OpenAIToolDefinition,
  LLMCallerFn,
  ToolResultMessage,
} from '../../domain/ai/agent/types';
import { sanitizeApiResponse } from '../../utils/security/sanitization';
import { debugLog } from '../../utils/debugLogHelpers';

/** Gemini API のベース URL */
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

/** Gemini の contents 要素型 */
interface GeminiPart {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

/**
 * AgentMessage[] を Gemini contents 形式に変換
 * - system メッセージは除外（systemInstruction で渡す）
 * - tool ロールは直前の assistant (functionCall) に続く user/parts として結合
 */
function convertToGeminiContents(messages: AgentMessage[]): GeminiContent[] {
  const contents: GeminiContent[] = [];
  let i = 0;

  while (i < messages.length) {
    const msg = messages[i];

    if (msg.role === 'system') {
      // systemInstruction で渡すためスキップ
      i++;
      continue;
    }

    if (msg.role === 'user') {
      contents.push({ role: 'user', parts: [{ text: msg.content }] });
      i++;
      continue;
    }

    if (msg.role === 'assistant') {
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        // モデルからのファンクションコール
        contents.push({
          role: 'model',
          parts: msg.toolCalls.map((tc) => ({
            functionCall: {
              name: tc.function.name,
              args: (() => {
                try {
                  return JSON.parse(tc.function.arguments || '{}');
                } catch {
                  return {};
                }
              })(),
            },
          })),
        });

        // 直後に続く tool メッセージをまとめて functionResponse にする
        const toolResponseParts: GeminiPart[] = [];
        while (i + 1 < messages.length && messages[i + 1].role === 'tool') {
          i++;
          const toolMsg = messages[i] as ToolResultMessage;
          toolResponseParts.push({
            functionResponse: {
              name: toolMsg.toolName,
              response: { result: toolMsg.content },
            },
          });
        }

        if (toolResponseParts.length > 0) {
          contents.push({ role: 'user', parts: toolResponseParts });
        }
      } else {
        // 通常テキスト応答
        contents.push({ role: 'model', parts: [{ text: msg.content || '' }] });
      }
      i++;
      continue;
    }

    // tool ロール単独（通常は assistant のループで消費されるが念のため）
    if (msg.role === 'tool') {
      const toolMsg = msg as ToolResultMessage;
      contents.push({
        role: 'user',
        parts: [
          {
            functionResponse: {
              name: toolMsg.toolName,
              response: { result: toolMsg.content },
            },
          },
        ],
      });
      i++;
      continue;
    }

    i++;
  }

  return contents;
}

/**
 * Gemini API 用の LLM Caller ファクトリ
 *
 * @param apiKey    - Gemini API キー
 * @param modelType - モデル名（例: gemini-1.5-flash, gemini-2.0-flash-exp）
 * @returns AgentLoop に渡す callLLM 関数
 */
export function createGeminiAgentCaller(apiKey: string, modelType: string): LLMCallerFn {
  return async (
    messages: AgentMessage[],
    tools: OpenAIToolDefinition[],
  ): Promise<{ content: string; toolCalls?: ToolCall[] }> => {
    // system メッセージを systemInstruction として抽出
    const systemMsg = messages.find((m) => m.role === 'system');
    const contents = convertToGeminiContents(messages);

    // OpenAI 形式のツール定義を Gemini functionDeclarations に変換
    const functionDeclarations = tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      parameters: t.function.parameters,
    }));

    // リクエストボディを構築
    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: 0.2,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 2048,
      },
    };

    if (systemMsg) {
      requestBody.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    // ツールがある場合のみ追加（空配列の場合は最終回答を強制）
    if (functionDeclarations.length > 0) {
      requestBody.tools = [{ functionDeclarations }];
      // AUTO モードで Function Calling を有効化
      requestBody.toolConfig = { functionCallingConfig: { mode: 'AUTO' } };
    }

    if (process.env.NODE_ENV === 'development') {
      debugLog('[GeminiAgentCaller] リクエスト:', {
        model: modelType,
        contentsCount: contents.length,
        toolsCount: functionDeclarations.length,
      });

      // デバッグ用: 実際に送信するリクエストボディのプレビュー
      try {
        const preview = {
          systemInstruction: systemMsg ? (systemMsg.content || '').slice(0, 400) : undefined,
          contentsPreview: contents.slice(0, 6).map((c) => ({
            role: c.role,
            partsPreview: c.parts.slice(0, 3).map((p) => ({
              text: p.text ? String(p.text).slice(0, 300) : undefined,
              functionCall: p.functionCall
                ? {
                    name: p.functionCall.name,
                    argsPreview: JSON.stringify(p.functionCall.args).slice(0, 300),
                  }
                : undefined,
            })),
          })),
          functions: functionDeclarations.map((f) => f.name),
          generationConfig: requestBody.generationConfig,
        };
        debugLog('[GeminiAgentCaller] Request preview:', preview);
      } catch (e) {
        debugLog('[GeminiAgentCaller] Request preview error', String(e));
      }
    }

    const endpoint = `${GEMINI_BASE_URL}/${modelType}:generateContent?key=${apiKey}`;

    const response = await post(endpoint, requestBody);

    const candidate = (response.data as any)?.candidates?.[0];
    const parts: GeminiPart[] = candidate?.content?.parts || [];

    // ファンクションコールが含まれている場合
    const functionCallPart = parts.find((p) => p.functionCall);
    if (functionCallPart?.functionCall) {
      const fc = functionCallPart.functionCall;
      const toolCall: ToolCall = {
        id: `gemini-tc-${Date.now()}`,
        type: 'function',
        function: {
          name: fc.name,
          arguments: JSON.stringify(fc.args ?? {}),
        },
      };

      debugLog(`[GeminiAgentCaller] ファンクションコール検出: ${fc.name}`);

      return {
        content: '',
        toolCalls: [toolCall],
      };
    }

    // テキストレスポンス
    const rawText = parts.find((p) => p.text)?.text || '';
    const sanitized = sanitizeApiResponse(rawText) as string;

    debugLog(`[GeminiAgentCaller] テキスト応答: ${sanitized.slice(0, 100)}...`);

    return { content: sanitized };
  };
}
