// src/domain/ai/services/AIResponseParser.ts

import { AIOperation, AIOperationType } from '../models/AIOperation';

export interface HierarchicalGenerationItem {
  text: string;
  level: number;
  originalLine: string;
}

export interface FullHierarchyGenerationResult {
  rootText: string;
  hierarchicalItems: HierarchicalGenerationItem[];
}

/**
 * AIレスポンスを解析するドメインサービス
 */
export class AIResponseParser {
  /**
   * AIレスポンスから操作リストを解析
   */
  parseOperations(response: string): AIOperation[] {
    try {
      const operations = this.parseJsonOperations(response);
      if (operations.length > 0) {
        return operations;
      }

      // フォールバック: 単純なテキスト形式として解析
      return this.parseTextOperations(response);
    } catch {
      // AIレスポンス解析エラー
      return [AIOperation.error('AIレスポンスの解析に失敗しました')];
    }
  }

  /**
   * JSON形式の操作を解析
   */
  private parseJsonOperations(response: string): AIOperation[] {
    const cleanedResponse = response.trim();

    // JSON部分を抽出
    let jsonMatch = cleanedResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonMatch[1] = jsonMatch[0];
      }
    }

    if (!jsonMatch) {
      return [];
    }

    try {
      const operationsData = JSON.parse(jsonMatch[1]);
      const operations = operationsData.operations;

      if (!operations || !Array.isArray(operations)) {
        return [];
      }

      return operations
        .map((op: Record<string, unknown>) => new AIOperation(op.type as AIOperationType, op))
        .filter((op) => op.isValid());
    } catch {
      return [];
    }
  }

  /**
   * テキスト形式の操作を解析（フォールバック）
   */
  private parseTextOperations(response: string): AIOperation[] {
    const elements = this.extractElementsFromText(response);
    if (elements.length === 0) {
      return [AIOperation.error('有効な要素が見つかりませんでした')];
    }

    return [AIOperation.addElements('', elements)];
  }

  /**
   * サジェスト用のレスポンスを解析
   */
  parseSuggestions(response: string): string[] {
    try {
      // JSON形式として解析を試行
      const jsonElements = this.parseJsonElements(response);
      if (jsonElements.length > 0) {
        return jsonElements;
      }
    } catch {
      // サジェストのJSON解析失敗、テキスト形式で解析
    }

    // フォールバック: テキスト形式として解析
    return this.parseTextElements(response);
  }

  /**
   * テキストから要素を抽出（公開メソッド）
   */
  extractElementsFromText(text: string): string[] {
    try {
      // JSON形式として解析を試行
      const jsonElements = this.parseJsonElements(text);
      if (jsonElements.length > 0) {
        return jsonElements;
      }
    } catch {
      // JSON解析失敗、テキスト形式で解析
    }

    // フォールバック: テキスト形式として解析
    return this.parseTextElements(text);
  }

  /**
   * テキストから階層要素を抽出
   */
  extractHierarchicalItemsFromText(text: string): HierarchicalGenerationItem[] {
    const jsonItems = this.parseJsonHierarchicalItems(text);
    if (jsonItems.length > 0) {
      return jsonItems;
    }

    return this.parseTextHierarchy(text);
  }

  /**
   * 全生成結果からルート名と階層要素を抽出
   */
  extractFullHierarchyResultFromText(
    text: string,
    currentRootText: string,
  ): FullHierarchyGenerationResult {
    const parsedJsonResult = this.parseJsonFullHierarchyResult(text, currentRootText);
    if (parsedJsonResult) {
      return parsedJsonResult;
    }

    return {
      rootText: currentRootText,
      hierarchicalItems: this.normalizeHierarchyItemsForRoot(
        this.parseTextHierarchy(text),
        currentRootText,
      ),
    };
  }

  /**
   * JSON形式の要素を解析
   */
  private parseJsonElements(text: string): string[] {
    const cleanedResult = text.replace(/^\s*[\n\r]+|[\n\r]+\s*$/g, '').trim();

    // 直接JSON解析を試行
    try {
      const jsonData = JSON.parse(cleanedResult);

      // オブジェクト形式 {elements: [...]} の場合
      if (jsonData.elements && Array.isArray(jsonData.elements)) {
        return jsonData.elements.filter(
          (element: unknown): element is string =>
            typeof element === 'string' && element.trim().length > 0,
        );
      }

      // 配列形式 [...] の場合
      if (Array.isArray(jsonData)) {
        return jsonData.filter(
          (element: unknown): element is string =>
            typeof element === 'string' && element.trim().length > 0,
        );
      }
    } catch {
      // コードブロック内のJSONを抽出して解析
      let jsonMatch = cleanedResult.match(/```json\s*([\s\S]*?)\s*```/);
      if (!jsonMatch) {
        jsonMatch = cleanedResult.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonMatch[1] = jsonMatch[0];
        }
      }

      if (jsonMatch) {
        try {
          const jsonData = JSON.parse(jsonMatch[1]);

          // オブジェクト形式 {elements: [...]} の場合
          if (jsonData.elements && Array.isArray(jsonData.elements)) {
            return jsonData.elements.filter(
              (element: unknown): element is string =>
                typeof element === 'string' && element.trim().length > 0,
            );
          }

          // 配列形式 [...] の場合
          if (Array.isArray(jsonData)) {
            return jsonData.filter(
              (element: unknown): element is string =>
                typeof element === 'string' && element.trim().length > 0,
            );
          }
        } catch {
          // JSON解析失敗
        }
      }
    }

    return [];
  }

  /**
   * テキスト形式の要素を解析（フォールバック）
   */
  private parseTextElements(text: string): string[] {
    const cleanedResult = text.replace(/^\s*[\n\r]+|[\n\r]+\s*$/g, '').trim();

    // マークダウンのコードブロックを検出
    const codeBlockRegex = /```[\s\S]*?```/g;
    const codeBlocks = cleanedResult.match(codeBlockRegex);

    if (codeBlocks && codeBlocks.length > 0) {
      return codeBlocks.flatMap((block: string) => {
        const content = block
          .replace(/```[a-zA-Z]*\n?/g, '')
          .replace(/```$/g, '')
          .trim();

        return this.parseElementLines(content);
      });
    }

    // コードブロックがない場合は、全体をテキストとして処理
    return this.parseElementLines(cleanedResult);
  }

  private parseJsonHierarchicalItems(text: string): HierarchicalGenerationItem[] {
    const cleanedResult = text.replace(/^\s*[\n\r]+|[\n\r]+\s*$/g, '').trim();

    const candidates: string[] = [cleanedResult];
    const codeBlockMatch = cleanedResult.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch?.[1]) {
      candidates.push(codeBlockMatch[1]);
    }

    const jsonObjectMatch = cleanedResult.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch?.[0]) {
      candidates.push(jsonObjectMatch[0]);
    }

    for (const candidate of candidates) {
      try {
        const jsonData = JSON.parse(candidate);
        const fromHierarchicalItems = this.parseHierarchicalItemsArray(jsonData?.hierarchicalItems);
        if (fromHierarchicalItems.length > 0) {
          return fromHierarchicalItems;
        }

        const fromTree = this.flattenTreeNodes(jsonData?.tree ?? jsonData);
        if (fromTree.length > 0) {
          return fromTree;
        }
      } catch {
        // 次の候補を試す
      }
    }

    return [];
  }

  private parseJsonFullHierarchyResult(
    text: string,
    currentRootText: string,
  ): FullHierarchyGenerationResult | null {
    const cleanedResult = text.replace(/^\s*[\n\r]+|[\n\r]+\s*$/g, '').trim();
    const candidates: string[] = [cleanedResult];
    const codeBlockMatch = cleanedResult.match(/```json\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch?.[1]) {
      candidates.push(codeBlockMatch[1]);
    }

    const jsonObjectMatch = cleanedResult.match(/\{[\s\S]*\}/);
    if (jsonObjectMatch?.[0]) {
      candidates.push(jsonObjectMatch[0]);
    }

    for (const candidate of candidates) {
      try {
        const jsonData = JSON.parse(candidate);
        const rootText = this.extractRootText(jsonData, currentRootText);
        const hierarchicalItems = this.extractHierarchicalItemsFromJsonData(
          jsonData,
          currentRootText,
        );

        if (rootText || hierarchicalItems.length > 0) {
          return {
            rootText: rootText || currentRootText,
            hierarchicalItems,
          };
        }
      } catch {
        // 次の候補を試す
      }
    }

    return null;
  }

  private extractRootText(jsonData: unknown, currentRootText: string): string {
    if (typeof jsonData !== 'object' || jsonData === null) {
      return currentRootText;
    }

    const record = jsonData as Record<string, unknown>;
    const rootTextCandidates = [record.rootText, record.rootNodeText, record.title, record.rootName]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter((value) => value.length > 0);

    if (rootTextCandidates.length > 0) {
      return rootTextCandidates[0];
    }

    const tree = record.tree;
    if (tree && typeof tree === 'object' && !Array.isArray(tree)) {
      const treeText = String((tree as Record<string, unknown>).text || '').trim();
      if (treeText) {
        return treeText;
      }
    }

    return currentRootText;
  }

  private extractHierarchicalItemsFromJsonData(
    jsonData: unknown,
    currentRootText: string,
  ): HierarchicalGenerationItem[] {
    if (typeof jsonData !== 'object' || jsonData === null) {
      return [];
    }

    const record = jsonData as Record<string, unknown>;
    const directItems = this.parseHierarchicalItemsArray(record.hierarchicalItems);
    if (directItems.length > 0) {
      return this.normalizeHierarchyItemsForRoot(directItems, currentRootText);
    }

    const tree = record.tree ?? record.root;
    if (tree && typeof tree === 'object' && !Array.isArray(tree)) {
      const treeRecord = tree as Record<string, unknown>;
      const childItems = this.flattenTreeNodes(treeRecord.children, 0);
      if (childItems.length > 0) {
        return childItems;
      }
    }

    const flattened = this.flattenTreeNodes(record.tree ?? jsonData);
    return this.normalizeHierarchyItemsForRoot(flattened, currentRootText);
  }

  private normalizeHierarchyItemsForRoot(
    items: HierarchicalGenerationItem[],
    currentRootText: string,
  ): HierarchicalGenerationItem[] {
    if (items.length === 0) {
      return [];
    }

    const normalizedRootText = currentRootText.trim();
    const firstItem = items[0];
    const hasNestedItems = items.some((item, index) => index > 0 && item.level > firstItem.level);
    const hasSingleTopLevel = items.filter((item) => item.level === firstItem.level).length === 1;
    const isDuplicatedRoot =
      normalizedRootText.length > 0 &&
      (firstItem.text === normalizedRootText ||
        firstItem.text.includes(normalizedRootText) ||
        normalizedRootText.includes(firstItem.text));

    if (!isDuplicatedRoot || !hasNestedItems || !hasSingleTopLevel) {
      return items;
    }

    return items.slice(1).map((item) => {
      const nextLevel = Math.max(0, item.level - firstItem.level - 1);
      return {
        ...item,
        level: nextLevel,
        originalLine: `${'  '.repeat(nextLevel)}- ${item.text}`,
      };
    });
  }

  private parseHierarchicalItemsArray(items: unknown): HierarchicalGenerationItem[] {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map((item) => {
        if (typeof item !== 'object' || item === null) return null;

        const text = String((item as Record<string, unknown>).text || '').trim();
        const levelValue = Number((item as Record<string, unknown>).level ?? 0);
        const level = Number.isFinite(levelValue) ? Math.max(0, Math.floor(levelValue)) : 0;
        const originalLineValue = (item as Record<string, unknown>).originalLine;
        const originalLine = typeof originalLineValue === 'string' ? originalLineValue : '';

        if (!text) return null;

        return {
          text,
          level,
          originalLine: originalLine || `${'  '.repeat(level)}- ${text}`,
        } satisfies HierarchicalGenerationItem;
      })
      .filter((item): item is HierarchicalGenerationItem => item !== null);
  }

  private flattenTreeNodes(tree: unknown, depth = 0): HierarchicalGenerationItem[] {
    if (!tree) return [];

    if (Array.isArray(tree)) {
      return tree.flatMap((item) => this.flattenTreeNodes(item, depth));
    }

    if (typeof tree !== 'object') {
      return [];
    }

    const record = tree as Record<string, unknown>;
    const text = String(record.text || record.parent || '').trim();
    const children = record.children;

    const currentItems = text
      ? [
          {
            text,
            level: depth,
            originalLine: `${'  '.repeat(depth)}- ${text}`,
          } satisfies HierarchicalGenerationItem,
        ]
      : [];

    return [...currentItems, ...this.flattenTreeNodes(children, depth + (text ? 1 : 0))];
  }

  private parseTextHierarchy(text: string): HierarchicalGenerationItem[] {
    const cleanedResult = text.replace(/^\s*[\n\r]+|[\n\r]+\s*$/g, '').trim();

    const content = cleanedResult.includes('```')
      ? cleanedResult
          .replace(/```[a-zA-Z]*\n?/g, '')
          .replace(/```/g, '')
          .trim()
      : cleanedResult;

    const lines = content
      .split('\n')
      .map((line) => line.replace(/\t/g, '  '))
      .filter((line) => line.trim().length > 0)
      .filter((line) => !line.trim().startsWith('{') && !line.trim().startsWith('['));

    if (lines.length === 0) {
      return [];
    }

    const parsed = lines
      .map((line) => {
        const match = line.match(/^(\s*)(?:[-*+]\s+|\d+\.\s+)?(.+)$/);
        if (!match) return null;

        const text = match[2].trim().replace(/^['"`]+|['"`]+$/g, '');
        if (!text || text === 'hierarchicalItems') return null;

        const level = Math.max(0, Math.floor(match[1].length / 2));
        return {
          text,
          level,
          originalLine: `${'  '.repeat(level)}- ${text}`,
        } satisfies HierarchicalGenerationItem;
      })
      .filter((item): item is HierarchicalGenerationItem => item !== null);

    const firstLevel = parsed[0]?.level ?? 0;

    return parsed.map((item) => ({
      ...item,
      level: Math.max(0, item.level - firstLevel),
      originalLine: `${'  '.repeat(Math.max(0, item.level - firstLevel))}- ${item.text}`,
    }));
  }

  /**
   * テキストの行を解析して要素を抽出
   */
  private parseElementLines(content: string): string[] {
    return content
      .split('\n')
      .map((line: string) => line.trim())
      .filter((line: string) => {
        // 空行、コメント行、JSON記号を除外
        return (
          line.length > 0 &&
          line !== '```' &&
          !line.startsWith('//') &&
          !line.startsWith('#') &&
          !line.startsWith('[') &&
          !line.startsWith(']') &&
          line !== '[' &&
          line !== ']' &&
          line !== '{' &&
          line !== '}' &&
          !line.match(/^["'[\]{}]+$/) // JSON記号のみの行を除外
        );
      })
      .map((line: string) => {
        // 行頭の番号やマーカーを削除
        return line
          .replace(/^\d+\.\s*/, '') // "1. " のような番号を削除
          .replace(/^[-*+]\s*/, '') // "- " のようなリストマーカーを削除
          .replace(/^["'`]+|["'`]+$/g, '') // 引用符を削除
          .trim();
      })
      .filter((line: string) => line.length > 0);
  }
}
