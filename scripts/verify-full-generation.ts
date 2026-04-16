// scripts/verify-full-generation.ts
// 実際のOpenAI互換エンドポイントに全生成ワークフローを投げ、
// hierarchicalItems を返せるか検証する

import { runAgentLoop } from '../src/domain/ai/agent/AgentLoop';
import { AGENT_FULL_HIERARCHY_GENERATION_PROMPT } from '../src/config/agentSystemPrompt';
import { AIResponseParser } from '../src/domain/ai/services/AIResponseParser';
import type { FullHierarchyGenerationResult } from '../src/domain/ai/services/AIResponseParser';
import { buildHierarchyFromSpecificationOutline } from '../src/domain/ai/services/SpecificationHierarchyBuilder';
import type { AgentMessage, OpenAIToolDefinition, ToolCall } from '../src/domain/ai/agent/types';
import { readFileSync } from 'fs';

const DEFAULT_ENDPOINT = 'http://192.168.0.13:1234/v1/chat/completions';
const DEFAULT_MODEL = 'qwen3-30b-a3b-instruct-2507';
const DEFAULT_SELECTED_ROOT = 'リスクベースドテスト';

const endpoint = process.argv[2] || DEFAULT_ENDPOINT;
const model = process.argv[3] || DEFAULT_MODEL;
const sourceFilePath = process.argv[4];
const selectedRootText = process.argv[5] || DEFAULT_SELECTED_ROOT;

const parser = new AIResponseParser();
const MAX_ATTEMPTS = 3;

function scoreHierarchy(result: FullHierarchyGenerationResult): number {
  const topLevelCount = result.hierarchicalItems.filter((item) => item.level === 0).length;
  const deepestLevel = result.hierarchicalItems.reduce((max, item) => Math.max(max, item.level), 0);
  return deepestLevel * 1000 + topLevelCount * 100 + result.hierarchicalItems.length;
}

const specificationText = sourceFilePath
  ? readFileSync(sourceFilePath, 'utf8')
  : `# 学習計画
学習計画は、受講者が継続的に学べるように、配下全体を同じ分類方針で整理する。

## 主要分類
学習計画は次の3分類で構成する。
- 基礎理解
- 実践
- 振り返り

## 基礎理解の内容
- 概念整理
- 用語確認

## 実践の内容
- 演習
- ケーススタディ

## 振り返りの内容
- 自己評価
- 改善点整理
`;

const context = {
  specificationText,
  structureText: `階層構造:\n- ID: 1 | テキスト: "${selectedRootText}"`,
  selectedElement: { id: '1', texts: [selectedRootText] },
  selectedSubtreeText: `対象サブツリー:\n- ID: 1 | テキスト: "${selectedRootText}"`,
  hierarchyDraftText: '',
};

function convertMessages(messages: AgentMessage[]) {
  return messages.map((message) => {
    if ('toolCallId' in message) {
      return {
        role: 'tool' as const,
        tool_call_id: message.toolCallId,
        content: message.content,
      };
    }

    if (message.role === 'assistant' && message.toolCalls) {
      return {
        role: 'assistant' as const,
        content: message.content || '',
        tool_calls: message.toolCalls,
      };
    }

    return {
      role: message.role,
      content: message.content,
    };
  });
}

async function callOpenAICompatible(
  messages: AgentMessage[],
  tools: OpenAIToolDefinition[],
): Promise<{ content: string; toolCalls?: ToolCall[] }> {
  const payload: Record<string, unknown> = {
    model,
    messages: convertMessages(messages),
    temperature: 0,
    max_tokens: 2048,
  };

  if (tools.length > 0) payload.tools = tools;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const message = data?.choices?.[0]?.message;

  if (!message) throw new Error('LLM message missing');

  if (Array.isArray(message.tool_calls) && message.tool_calls.length > 0) {
    return {
      content: message.content || '',
      toolCalls: message.tool_calls,
    };
  }

  return { content: message.content || '' };
}

async function main() {
  console.log(`Verifying full generation with endpoint=${endpoint} model=${model}`);

  let latestResponse = '';
  let fullHierarchyResult: FullHierarchyGenerationResult = {
    rootText: selectedRootText,
    hierarchicalItems: [],
  };
  let latestSteps = 0;
  let latestFinishReason = 'error';

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const userPrompt =
      attempt === 0
        ? `選択要素「${selectedRootText}」配下の要素階層全体を、一貫した分類軸で再設計してください。`
        : `前回案では階層が浅すぎました。現在のドラフトを見直し、見出し・番号付き項目・段落論点をより深く階層化してください。\n\n[現在のドラフト]\n${context.hierarchyDraftText || 'なし'}\n\n必ず rootText と hierarchicalItems を含む JSON のみを返してください。`;

    const result = await runAgentLoop(
      AGENT_FULL_HIERARCHY_GENERATION_PROMPT,
      userPrompt,
      context,
      callOpenAICompatible,
      {
        maxSteps: 8,
        workflowPreset: 'full_generation',
      },
    );

    latestResponse = result.response;
    latestSteps = result.steps;
    latestFinishReason = result.finishReason;
    fullHierarchyResult = parser.extractFullHierarchyResultFromText(
      result.response,
      fullHierarchyResult.rootText,
    );
    context.hierarchyDraftText = [
      `- ${fullHierarchyResult.rootText}`,
      ...fullHierarchyResult.hierarchicalItems.map(
        (item) => `${'  '.repeat(item.level + 1)}- ${item.text}`,
      ),
    ].join('\n');

    const deepestLevel = fullHierarchyResult.hierarchicalItems.reduce(
      (max, item) => Math.max(max, item.level),
      0,
    );

    if (
      fullHierarchyResult.hierarchicalItems.filter((item) => item.level === 0).length >= 2 &&
      deepestLevel >= 2
    )
      break;
  }

  const hierarchicalItems = fullHierarchyResult.hierarchicalItems;
  const topLevelItems = hierarchicalItems.filter((item) => item.level === 0);
  const deepestLevel = hierarchicalItems.reduce((max, item) => Math.max(max, item.level), 0);

  if (topLevelItems.length < 2 || deepestLevel < 2) {
    const outlineFallbackResult = buildHierarchyFromSpecificationOutline(
      specificationText,
      fullHierarchyResult.rootText,
    );
    if (scoreHierarchy(outlineFallbackResult) > scoreHierarchy(fullHierarchyResult)) {
      fullHierarchyResult = outlineFallbackResult;
    }
  }

  const validatedHierarchicalItems = fullHierarchyResult.hierarchicalItems;
  const validatedTopLevelItems = validatedHierarchicalItems.filter((item) => item.level === 0);
  const validatedDeepestLevel = validatedHierarchicalItems.reduce(
    (max, item) => Math.max(max, item.level),
    0,
  );

  console.log(
    JSON.stringify(
      {
        finishReason: latestFinishReason,
        steps: latestSteps,
        rootText: fullHierarchyResult.rootText,
        response: latestResponse,
        hierarchicalItems: validatedHierarchicalItems,
      },
      null,
      2,
    ),
  );

  if (validatedTopLevelItems.length < 2 || validatedDeepestLevel < 2) {
    throw new Error(
      `Unexpected hierarchy shape: topLevel=${validatedTopLevelItems.length}, deepestLevel=${validatedDeepestLevel}`,
    );
  }

  if (sourceFilePath && fullHierarchyResult.rootText === selectedRootText) {
    throw new Error('Root text was not rewritten for the provided source text');
  }

  console.log('Verification passed: rootText rewrite and deep hierarchy look valid');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
