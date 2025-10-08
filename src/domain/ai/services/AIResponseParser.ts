// src/domain/ai/services/AIResponseParser.ts

import { AIOperation, AIOperationType } from '../models/AIOperation';

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
        return jsonElements.slice(0, 3); // 最大3個まで
      }
    } catch {
      // サジェストのJSON解析失敗、テキスト形式で解析
    }

    // フォールバック: テキスト形式として解析
    return this.parseTextElements(response).slice(0, 3);
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
