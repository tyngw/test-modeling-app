// src/domain/ai/agent/types.ts
//
// Agentic Search 関連の型定義
// - AgentContext: ツール実行時に参照するアプリケーション状態
// - AgentToolDefinition: ツール定義（名前・説明・パラメータ・実行関数）
// - ToolCall / ToolResultMessage: OpenAI function calling 形式のメッセージ
// - AgentLoopConfig / AgentResult: ループ制御と結果

/** ツール実行に必要なコンテキスト（仕様書・階層構造・選択要素） */
export interface AgentContext {
  /** 仕様書テキスト（全文、LocalStorageから取得） */
  specificationText: string;
  /** 現在の階層構造テキスト（formatHierarchicalStructureForPrompt の出力） */
  structureText: string;
  /** 選択中の要素情報 */
  selectedElement?: {
    id: string;
    texts: string[];
    parentTexts?: string[];
  };
  /** 親要素情報 */
  parentElement?: {
    id: string;
    texts: string[];
  };
}

/** ツール定義 **/
export interface AgentToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  execute: (args: Record<string, unknown>, context: AgentContext) => string;
}

/** OpenAI 形式のツールコール（レスポンスに含まれる） */
export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON文字列
  };
}

/** ツール結果メッセージ（OpenAI tool role） */
export interface ToolResultMessage {
  role: 'tool';
  toolCallId: string;
  /** ツール名（Gemini function calling の functionResponse に必要） */
  toolName: string;
  content: string;
}

/** Agent がやり取りするメッセージ（OpenAI Chat Completions 形式を踏襲） */
export type AgentMessage =
  | { role: 'system'; content: string }
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; toolCalls?: ToolCall[] }
  | ToolResultMessage;

/** LLM呼び出し関数の型（AgentLoopに注入するコールバック） */
export type LLMCallerFn = (
  messages: AgentMessage[],
  tools: OpenAIToolDefinition[],
) => Promise<{ content: string; toolCalls?: ToolCall[] }>;

/** OpenAI API 形式のツール定義 */
export interface OpenAIToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/** Agent ループの設定 */
export interface AgentLoopConfig {
  /** ループ最大ステップ数（デフォルト: 5） */
  maxSteps: number;
  /** ステップ完了時のコールバック（デバッグ・進捗表示用） */
  onStepComplete?: (step: number, message: AgentMessage) => void;
}

/** Agent ループの実行結果 */
export interface AgentResult {
  /** 最終的なテキストレスポンス */
  response: string;
  /** ループ中のメッセージ履歴 */
  messages: AgentMessage[];
  /** 実行したステップ数 */
  steps: number;
  /** ループ終了理由 */
  finishReason: 'complete' | 'max_steps' | 'error';
}
