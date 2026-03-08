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
});
