// src/domain/ai/agent/ToolRegistry.ts
//
// Agentツールの中央レジストリ
// ツール登録・実行・API形式変換を管理
//
// 役割:
// - AgentToolDefinition を登録し、名前引きで実行
// - OpenAI function calling 形式への変換（toOpenAITools）
// - ToolCall の受け付けと安全な実行

import { AgentToolDefinition, AgentContext, ToolCall, OpenAIToolDefinition } from './types';

/**
 * ツールレジストリ
 * ファイルシステムではなくインメモリデータ（仕様書・階層構造）を操作する
 */
export class ToolRegistry {
  private tools: Map<string, AgentToolDefinition> = new Map();

  /** ツールを登録 */
  register(tool: AgentToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /** 複数ツールを一括登録 */
  registerAll(tools: AgentToolDefinition[]): void {
    for (const tool of tools) {
      this.register(tool);
    }
  }

  /**
   * OpenAI function calling 形式のツール定義配列に変換
   * この配列を LLM API の `tools` パラメータにそのまま渡す
   */
  toOpenAITools(): OpenAIToolDefinition[] {
    return Array.from(this.tools.values()).map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  /**
   * ToolCall を実行して結果文字列を返す
   * - ツール名が無効な場合はエラーメッセージを返す（例外は投げない）
   * - 引数パースエラーも安全にハンドリング
   */
  executeToolCall(toolCall: ToolCall, context: AgentContext): string {
    const tool = this.tools.get(toolCall.function.name);
    if (!tool) {
      return `エラー: ツール「${toolCall.function.name}」は存在しません。利用可能: ${this.getToolNames().join(', ')}`;
    }

    try {
      const args = JSON.parse(toolCall.function.arguments);
      return tool.execute(args, context);
    } catch (error) {
      const message = error instanceof Error ? error.message : '不明なエラー';
      return `エラー: ツール「${toolCall.function.name}」の実行に失敗しました: ${message}`;
    }
  }

  /** 登録済みツール名の一覧を返す */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}
