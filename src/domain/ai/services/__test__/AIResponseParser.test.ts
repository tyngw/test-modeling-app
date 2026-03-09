import { AIResponseParser } from '../AIResponseParser';

describe('AIResponseParser', () => {
  const parser = new AIResponseParser();

  it('parseSuggestions で JSON の要素を件数制限せず全件返す', () => {
    const response = JSON.stringify({
      elements: [
        'デバッグ指向パラダイム',
        '論証指向パラダイム',
        '破壊指向パラダイム',
        '評価指向パラダイム',
        '予防指向パラダイム',
      ],
    });

    expect(parser.parseSuggestions(response)).toEqual([
      'デバッグ指向パラダイム',
      '論証指向パラダイム',
      '破壊指向パラダイム',
      '評価指向パラダイム',
      '予防指向パラダイム',
    ]);
  });

  it('extractElementsFromText で正式名称をそのまま保持する', () => {
    const response = JSON.stringify({
      elements: ['デバッグ指向パラダイム', '論証指向パラダイム'],
    });

    expect(parser.extractElementsFromText(response)).toEqual([
      'デバッグ指向パラダイム',
      '論証指向パラダイム',
    ]);
  });

  it('全生成JSONから rootText と階層を抽出できる', () => {
    const response = JSON.stringify({
      rootText: 'リスクベースドテストは嫌いです',
      hierarchicalItems: [
        { text: '嫌いな理由', level: 0, originalLine: '- 嫌いな理由' },
        {
          text: 'リスクの評価ができない',
          level: 1,
          originalLine: '  - リスクの評価ができない',
        },
      ],
    });

    expect(parser.extractFullHierarchyResultFromText(response, 'リスクベースドテスト')).toEqual({
      rootText: 'リスクベースドテストは嫌いです',
      hierarchicalItems: [
        { text: '嫌いな理由', level: 0, originalLine: '- 嫌いな理由' },
        {
          text: 'リスクの評価ができない',
          level: 1,
          originalLine: '  - リスクの評価ができない',
        },
      ],
    });
  });

  it('重複したルートを含む階層は子階層へ正規化する', () => {
    const response = JSON.stringify({
      hierarchicalItems: [
        { text: 'リスクベースドテスト', level: 0, originalLine: '- リスクベースドテスト' },
        { text: 'リスクの定義', level: 1, originalLine: '  - リスクの定義' },
        { text: 'リスク評価', level: 1, originalLine: '  - リスク評価' },
      ],
    });

    expect(parser.extractFullHierarchyResultFromText(response, 'リスクベースドテスト')).toEqual({
      rootText: 'リスクベースドテスト',
      hierarchicalItems: [
        { text: 'リスクの定義', level: 0, originalLine: '- リスクの定義' },
        { text: 'リスク評価', level: 0, originalLine: '- リスク評価' },
      ],
    });
  });
});
