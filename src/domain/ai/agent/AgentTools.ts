// src/domain/ai/agent/AgentTools.ts
//
// Agentic Search 用のツール定義
// 仕様書テキストと階層構造データに対して自律検索するツール群を定義
//
// 設計意図:
// - 仕様書全文を一度に渡すのではなく、Agentが必要な部分だけを検索・参照
// - ローカルLLMのトークン制約下でも、関連コンテキストを段階的に収集可能

import { AgentToolDefinition, AgentContext } from './types';

// --- ヘルパー関数 ---

/** テキストを段落（見出し区切り or 空行区切り）に分割 */
function splitIntoParagraphs(text: string): string[] {
  // 見出し(#)、空行で分割
  const sections = text.split(/\n(?=#{1,6}\s)|\n\n+/).filter((s) => s.trim().length > 0);

  // 長すぎるセクションはさらに分割（トークン節約）
  const result: string[] = [];
  for (const section of sections) {
    if (section.length > 1000) {
      for (let i = 0; i < section.length; i += 500) {
        const chunk = section.slice(i, i + 500);
        if (chunk.trim().length > 0) result.push(chunk.trim());
      }
    } else {
      result.push(section.trim());
    }
  }
  return result;
}

// --- ツール実装 ---

/**
 * 仕様書テキストをキーワードで検索
 * GrepTool に相当
 */
function searchSpec(args: { query: string; maxResults?: number }, context: AgentContext): string {
  const { query, maxResults = 5 } = args;
  const spec = context.specificationText;

  if (!spec || spec.trim().length === 0) {
    return '仕様書が設定されていません。';
  }

  const paragraphs = splitIntoParagraphs(spec);
  const keywords = query
    .toLowerCase()
    .split(/[\s,、]+/)
    .filter((k) => k.length > 0);

  // 各段落をキーワードでスコアリング
  const scored = paragraphs.map((para, index) => {
    const lowerPara = para.toLowerCase();
    let score = 0;
    for (const keyword of keywords) {
      const matches = lowerPara.match(new RegExp(escapeRegExp(keyword), 'gi'));
      if (matches) score += matches.length * 2;
    }
    return { text: para, index, score };
  });

  const matches = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  if (matches.length === 0) {
    return `「${query}」に一致する内容は見つかりませんでした。別のキーワードで検索してください。`;
  }

  return matches
    .map((m, i) => `[結果${i + 1}] (セクション${m.index})\n${m.text}`)
    .join('\n\n---\n\n');
}

/** 正規表現の特殊文字をエスケープ */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 仕様書の特定セクションを取得
 */
function getSpecSection(
  args: { sectionIndex?: number; offset?: number; length?: number },
  context: AgentContext,
): string {
  const spec = context.specificationText;
  if (!spec || spec.trim().length === 0) return '仕様書が設定されていません。';

  // セクション番号指定
  if (args.sectionIndex !== undefined) {
    const paragraphs = splitIntoParagraphs(spec);
    if (args.sectionIndex < 0 || args.sectionIndex >= paragraphs.length) {
      return `セクション${args.sectionIndex}は存在しません。有効範囲: 0〜${paragraphs.length - 1}`;
    }
    // 前後セクションも含めてコンテキストを提供
    const start = Math.max(0, args.sectionIndex - 1);
    const end = Math.min(paragraphs.length, args.sectionIndex + 2);
    return paragraphs
      .slice(start, end)
      .map((p, i) => `[セクション${start + i}]\n${p}`)
      .join('\n\n');
  }

  // offset/length 指定（大きな仕様書のブラウジング用）
  const offset = args.offset || 0;
  const length = Math.min(args.length || 2000, 3000);
  const section = spec.slice(offset, offset + length);

  return `[仕様書 offset=${offset}, total=${spec.length}]\n${section}${
    offset + length < spec.length ? '\n...(続きあり)' : ''
  }`;
}

/**
 * 仕様書の概要を取得（文字数・セクション数・見出し一覧）
 * Agent が最初に全体像を把握するために使用
 */
function getSpecOverview(_args: Record<string, unknown>, context: AgentContext): string {
  const spec = context.specificationText;
  if (!spec || spec.trim().length === 0) return '仕様書が設定されていません。';

  const paragraphs = splitIntoParagraphs(spec);
  const headings = spec.match(/^#{1,6}\s+.+$/gm) || [];

  let overview = `仕様書概要:\n- 文字数: ${spec.length}\n- セクション数: ${paragraphs.length}\n`;

  if (headings.length > 0) {
    overview += `\n見出し一覧:\n${headings.map((h, i) => `${i}. ${h}`).join('\n')}`;
  } else {
    overview += `\nセクション先頭一覧:\n${paragraphs
      .map((p, i) => `${i}. ${p.slice(0, 80)}${p.length > 80 ? '...' : ''}`)
      .join('\n')}`;
  }

  return overview;
}

/** 現在の階層構造を取得 */
function getStructure(_args: Record<string, unknown>, context: AgentContext): string {
  return context.structureText || '階層構造データがありません。';
}

/** 選択中の要素の詳細を取得 */
function getElementDetails(_args: Record<string, unknown>, context: AgentContext): string {
  if (!context.selectedElement) {
    return '現在選択されている要素はありません。';
  }

  const el = context.selectedElement;
  let result = `選択要素:\n- ID: ${el.id}\n- テキスト: ${el.texts.join(', ')}`;

  if (el.parentTexts) {
    result += `\n- 親要素テキスト: ${el.parentTexts.join(', ')}`;
  }

  if (context.parentElement) {
    result += `\n\n親要素:\n- ID: ${context.parentElement.id}`;
    result += `\n- テキスト: ${context.parentElement.texts.join(', ')}`;
  }

  return result;
}

// --- ツール定義をまとめて生成 ---

/** 全Agentツール定義の配列を生成 */
export function createAgentTools(): AgentToolDefinition[] {
  return [
    {
      name: 'search_spec',
      description:
        '仕様書テキストをキーワードで検索し、関連する段落を返します。' +
        'まず get_spec_overview で概要を確認してから検索することを推奨します。',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '検索キーワード（スペース区切りで複数指定可能）',
          },
          maxResults: {
            type: 'number',
            description: '最大結果数（デフォルト: 5）',
          },
        },
        required: ['query'],
      },
      execute: (args, ctx) => searchSpec(args as { query: string; maxResults?: number }, ctx),
    },
    {
      name: 'get_spec_section',
      description:
        '仕様書の特定セクションを取得します。' +
        'sectionIndex でセクション番号を指定するか、offset/length で文字位置を指定します。',
      parameters: {
        type: 'object',
        properties: {
          sectionIndex: { type: 'number', description: 'セクション番号（0始まり）' },
          offset: { type: 'number', description: '開始文字位置' },
          length: { type: 'number', description: '取得文字数（最大3000）' },
        },
      },
      execute: (args, ctx) =>
        getSpecSection(args as { sectionIndex?: number; offset?: number; length?: number }, ctx),
    },
    {
      name: 'get_spec_overview',
      description:
        '仕様書の概要（文字数・セクション数・見出し一覧）を取得します。' +
        '最初にこのツールで全体像を把握してから検索してください。',
      parameters: { type: 'object', properties: {} },
      execute: (args, ctx) => getSpecOverview(args, ctx),
    },
    {
      name: 'get_structure',
      description: '現在のアプリケーション上の要素階層構造を取得します。',
      parameters: { type: 'object', properties: {} },
      execute: (args, ctx) => getStructure(args, ctx),
    },
    {
      name: 'get_element_details',
      description: '現在選択されている要素の詳細情報（ID・テキスト・親要素）を取得します。',
      parameters: { type: 'object', properties: {} },
      execute: (args, ctx) => getElementDetails(args, ctx),
    },
  ];
}
