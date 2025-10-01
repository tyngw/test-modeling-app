// src/domain/ai/services/PromptBuilder.ts

import { Element } from '../../element/models/Element';

/**
 * プロンプト構築を担当するドメインサービス
 */
export class PromptBuilder {
  /**
   * 要素生成用のプロンプトを構築
   */
  buildElementGenerationPrompt(
    selectedElement: Element,
    inputText: string,
    structureText: string,
    contextInitialized: boolean,
  ): string {
    const selectedElementText = selectedElement.texts?.join(', ') || '';

    if (contextInitialized) {
      return this.buildContextualizedPrompt(selectedElementText, structureText);
    }

    return this.buildFullPrompt(selectedElementText, inputText, structureText);
  }

  /**
   * サジェスト用のプロンプトを構築
   */
  buildSuggestionPrompt(
    selectedElement: Element | null,
    parentElement: Element | null,
    inputText: string,
    structureText: string,
    contextInitialized: boolean,
  ): string {
    const selectedElementInfo = selectedElement
      ? `現在選択されている要素: ${selectedElement.texts?.join(', ') || 'テキストなし'} (ID: ${selectedElement.id})`
      : '選択されている要素がありません';

    const parentInfo = parentElement
      ? `親要素: ${parentElement.texts?.join(', ') || 'テキストなし'}`
      : '親要素情報が見つかりません';

    const specificationSection = contextInitialized
      ? '（仕様書の詳細は事前に送信済みです。その情報を基に判断してください）'
      : inputText
        ? `\n仕様書:\n\`\`\`\n${inputText}\n\`\`\`\n`
        : '';

    return `以下の仕様書の情報に基づいて、現在選択されている要素に関連する適切な兄弟要素を提案してください。

【重要】以下の仕様書に従って階層構造を作成することが目的です：
${specificationSection}

${selectedElementInfo}
${parentInfo}

[現在の階層構造]
\`\`\`
${structureText}
\`\`\`

**要求事項：**
1. 仕様書の内容に基づいて、選択された要素「${selectedElement?.texts?.join(', ') || ''}」に関連する兄弟要素を提案してください
2. 仕様書で定義されている機能や項目を階層化する際の、論理的に並ぶべき要素を生成してください
3. 既存の要素と重複しないよう注意してください
4. 仕様書の構造や分類に従って、適切な粒度で要素を提案してください

提案する要素は、仕様書の内容を反映した具体的で意味のあるものにしてください。`;
  }

  /**
   * チャット用のプロンプトを構築
   */
  buildChatPrompt(message: string, structureText: string, selectedElement?: string): string {
    return `以下の仕様書に基づいて、選択された要素「${selectedElement || ''}」に対する操作を実行してください。

[Current Structure]
\`\`\`
${structureText}
\`\`\`

ユーザーからの指示: ${message}

**出力形式：**
以下のJSON形式で操作を指定してください：

\`\`\`json
{
  "operations": [
    {
      "type": "ADD_ELEMENTS",
      "targetId": "要素ID または null",
      "elements": ["要素1", "要素2", "要素3"]
    }
  ]
}
\`\`\`

**利用可能な操作タイプ：**
- ADD_ELEMENTS: 要素を追加
- SELECT_ELEMENT: 要素を選択 (targetText: "選択する要素のテキスト")
- UPDATE_TEXT: テキストを更新 (targetId: "要素ID", newText: "新しいテキスト")
- DELETE_ELEMENT: 要素を削除
- ADD_SIBLING_ELEMENT: 兄弟要素を追加
- COPY_ELEMENT: 要素をコピー
- DROP_ELEMENT: 要素を移動 (targetNodeId: "移動先ID", targetIndex: 位置)

**要求事項：**
1. ユーザーの指示に基づいて適切な操作を選択してください
2. 複数の操作が必要な場合は、operations配列に複数の操作を含めてください
3. 要素の追加時は、仕様書の内容に基づいた具体的で意味のある要素名を使用してください`;
  }

  /**
   * コンテキスト初期化用のプロンプトを構築
   */
  buildContextInitializationPrompt(
    inputText: string,
    chunkIndex: number,
    totalChunks: number,
    chunk: string,
  ): string {
    const isFirstChunk = chunkIndex === 0;
    const isLastChunk = chunkIndex === totalChunks - 1;

    if (isFirstChunk) {
      return `以下の仕様書を今後のサジェスト生成の基準として記憶してください。${totalChunks > 1 ? `(${chunkIndex + 1}/${totalChunks}部分)` : ''}

【重要】これは仕様書です。この仕様書に基づいて階層構造を作成することが目的です：
\`\`\`
${chunk}
\`\`\`

${isLastChunk ? 'この仕様書を基に、今後要素の編集完了時に仕様に沿った適切なサジェストを生成してください。仕様書で定義されている機能や項目を階層化するための提案をしてください。' : '続きの仕様書を次に送信します。'}`;
    }

    return `仕様書の続き(${chunkIndex + 1}/${totalChunks}部分):

\`\`\`
${chunk}
\`\`\`

${isLastChunk ? 'これで仕様書の送信は完了です。この仕様書を基に、今後要素の編集完了時に仕様に沿った適切なサジェストを生成してください。仕様書で定義されている機能や項目を階層化するための提案をしてください。' : '続きの仕様書を次に送信します。'}`;
  }

  /**
   * コンテキスト初期化済みの場合の簡潔なプロンプト
   */
  private buildContextualizedPrompt(selectedElementText: string, structureText: string): string {
    return `以下の仕様書に基づいて、選択された要素「${selectedElementText}」の子要素を生成してください。

[Current Structure]
\`\`\`
${structureText}
\`\`\`

**要求事項：**
1. 事前に送信した仕様書の内容に従って、選択された要素の子要素を生成してください
2. 仕様書で定義されている機能や項目を階層化する際の、論理的な子要素を生成してください
3. 仕様書の構造や分類に従って、適切な粒度で要素を提案してください

**出力形式：**
必ずJSON形式で回答してください：
{
  "elements": [
    "提案要素1",
    "提案要素2",
    "提案要素3"
  ]
}`;
  }

  /**
   * 完全な仕様書を含むプロンプト
   */
  private buildFullPrompt(
    selectedElementText: string,
    inputText: string,
    structureText: string,
  ): string {
    return `以下の仕様書に基づいて、選択された要素「${selectedElementText}」の子要素を生成してください。

[Current Structure]
\`\`\`
${structureText}
\`\`\`

【重要】以下の仕様書に従って階層構造を作成することが目的です：
\`\`\`
${inputText}
\`\`\`

**要求事項：**
1. 仕様書の内容に基づいて、選択された要素の子要素を生成してください
2. 仕様書で定義されている機能や項目を階層化する際の、論理的な子要素を生成してください
3. 仕様書の構造や分類に従って、適切な粒度で要素を提案してください

**出力形式：**
必ずJSON形式で回答してください：
{
  "elements": [
    "提案要素1",
    "提案要素2",
    "提案要素3"
  ]
}`;
  }
}
