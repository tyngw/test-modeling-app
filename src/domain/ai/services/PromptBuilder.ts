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
   * 全生成用のプロンプトを構築
   */
  buildFullHierarchyGenerationPrompt(
    selectedElement: Element,
    inputText: string,
    structureText: string,
    selectedSubtreeText: string,
  ): string {
    const selectedElementText = selectedElement.texts?.join(', ') || selectedElement.id;

    return `以下の仕様書に基づいて、選択された要素「${selectedElementText}」配下の階層全体を一貫した分類軸で再設計してください。

[現在の階層構造]
\`\`\`
${structureText}
\`\`\`

[対象サブツリー]
\`\`\`
${selectedSubtreeText || '対象サブツリー情報なし'}
\`\`\`

【重要】以下の仕様書に従って階層構造を作成することが目的です：
\`\`\`
${inputText}
\`\`\`

**要求事項：**
1. 必要であれば選択要素名自体も、仕様書全体をより正確に表す名称へ更新してください
2. 明示的な見出しがある場合は、抽象的な要約よりも原文の見出しを優先して採用してください
3. 選択要素の直下から始まる全体階層を、一つの分類方針で再構成してください
4. 同一階層では粒度と切り口を統一してください
5. 既存構造に分類のぶれがある場合は、仕様書優先で整理し直してください
6. 深さや件数に制限を設けず、本文中の論点・理由・例・補足を可能な限り階層上に配置してください
7. 見出し → 番号付き項目 → 段落論点、のように原文が深い場合は3階層以上に自然に掘り下げてください

**出力形式：**
必ずJSON形式で回答してください：
{
  "rootText": "更新後のルート名",
  "hierarchicalItems": [
    { "text": "分類A", "level": 0, "originalLine": "- 分類A" },
    { "text": "項目A-1", "level": 1, "originalLine": "  - 項目A-1" }
  ]
}`;
  }

  /**
   * 全生成の再試行用プロンプトを構築
   */
  buildFullHierarchyRefinementPrompt(selectedElement: Element, currentDraftText: string): string {
    const selectedElementText = selectedElement.texts?.join(', ') || selectedElement.id;

    return `前回の全生成案では、階層の深さまたは網羅性が不足していました。選択要素「${selectedElementText}」配下の案を見直してください。

[現在のドラフト]
\`\`\`
${currentDraftText || 'ドラフトなし'}
\`\`\`

**再検討ポイント：**
1. 原文の見出し・番号付き項目・論点を優先し、要約しすぎないでください
2. 入力文の情報が未配置のまま残らないよう、必要ならより深い階層へ分解してください
3. 見出し → 節 → 論点 の3階層以上が成立する文書では、その深さを維持してください
4. ルート名は、原文に明示見出しがあるならその見出しを優先して見直してください
5. 必要なら get_hierarchy_draft / get_spec_section / search_spec を使って不足箇所を補ってください

**出力形式：**
必ずJSON形式で回答してください：
{
  "rootText": "更新後のルート名",
  "hierarchicalItems": [
    { "text": "分類A", "level": 0, "originalLine": "- 分類A" },
    { "text": "項目A-1", "level": 1, "originalLine": "  - 項目A-1" },
    { "text": "論点A-1-1", "level": 2, "originalLine": "    - 論点A-1-1" }
  ]
}`;
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
4. ソースに明示された列挙・分類・番号付き項目がある場合は、子要素を全件抽出してください
5. ソースにある正式名称をそのまま使い、省略・言い換え・要約をしないでください
6. 子要素数を3件などに制限せず、ソースに根拠がある要素は漏れなく含めてください
7. **番号付き箇条書きリストが出現した場合は全項目を出力する**。最初の3項目だけで終わらない

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
4. ソースに明示された列挙・分類・番号付き項目がある場合は、子要素を全件抽出してください
5. ソースにある正式名称をそのまま使い、省略・言い換え・要約をしないでください
6. 子要素数を3件などに制限せず、ソースに根拠がある要素は漏れなく含めてください
7. **番号付き箇条書きリストが出現した場合は全項目を出力する**。最初の3項目だけで終わらない

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
