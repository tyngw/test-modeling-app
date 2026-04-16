/**
 * src/utils/api/__test__/openaiApiAdapter.test.ts
 *
 * OpenAIApiAdapter の振る舞いをロックするテスト（移行後: fetch モック版）。
 */

const mockFetch = jest.fn();
Object.defineProperty(global, 'fetch', { writable: true, value: mockFetch });

jest.mock('../../security/sanitization', () => ({
  sanitizeApiResponse: (v: unknown) => v,
}));

import { OpenAIApiAdapter } from '../openaiApiAdapter';

function makeFetchSuccess(data: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: (name: string) => (name === 'content-type' ? 'application/json' : null) },
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

function makeFetchError(status: number, data: unknown = {}) {
  return {
    ok: false,
    status,
    statusText: 'Error',
    headers: { get: (name: string) => (name === 'content-type' ? 'application/json' : null) },
    json: async () => data,
    text: async () => JSON.stringify(data),
  };
}

function makeOpenAIData(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

describe('OpenAIApiAdapter.generateSingle', () => {
  beforeEach(() => jest.clearAllMocks());

  it('/api/ai/generate プロキシへ POST する', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess(makeOpenAIData('generated text')));
    await OpenAIApiAdapter.generateSingle('prompt', 'apiKey', 'gpt-4o', 'https://api.openai.com');
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/generate',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"endpoint":"https://api.openai.com"'),
      }),
    );
  });

  it('レスポンスのテキストを返す', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess(makeOpenAIData('hello')));
    const result = await OpenAIApiAdapter.generateSingle('p', 'k', 'm', 'https://api.openai.com');
    expect(result).toBe('hello');
  });

  it('401 → "API認証エラー" をスローする', async () => {
    mockFetch.mockResolvedValue(makeFetchError(401, {}));
    await expect(
      OpenAIApiAdapter.generateSingle('p', 'k', 'm', 'https://api.openai.com'),
    ).rejects.toThrow('API認証エラー');
  });

  it('429 → "レート制限エラー" をスローする', async () => {
    mockFetch.mockResolvedValue(makeFetchError(429, {}));
    await expect(
      OpenAIApiAdapter.generateSingle('p', 'k', 'm', 'https://api.openai.com'),
    ).rejects.toThrow('レート制限エラー');
  });

  it('ECONNREFUSED → "接続エラー" をスローする', async () => {
    const cause = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });
    mockFetch.mockRejectedValue(Object.assign(new TypeError('fetch failed'), { cause }));
    await expect(
      OpenAIApiAdapter.generateSingle('p', 'k', 'm', 'http://localhost:1234'),
    ).rejects.toThrow('接続エラー');
  });

  it('ERR_NETWORK → "ネットワークエラー" をスローする', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(
      OpenAIApiAdapter.generateSingle('p', 'k', 'm', 'https://api.openai.com'),
    ).rejects.toThrow('ネットワークエラー');
  });
});

describe('OpenAIApiAdapter.generateWithThread', () => {
  beforeEach(() => jest.clearAllMocks());

  it('チャット履歴 + 新しいユーザーメッセージを送信し updatedHistory を返す', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess(makeOpenAIData('reply')));
    const history = [{ role: 'user' as const, content: 'hi' }];
    const result = await OpenAIApiAdapter.generateWithThread(
      'new prompt',
      'apiKey',
      'gpt-4o',
      'https://api.openai.com',
      history,
    );
    expect(result.response).toBe('reply');
    // updatedHistory: 元の履歴(1) + 新しいuser(1) + assistant(1) = 3
    expect(result.updatedHistory.length).toBe(3);
    expect(result.updatedHistory.at(-1)?.role).toBe('assistant');
  });

  it('空の履歴でも正常に動作する', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess(makeOpenAIData('first')));
    const result = await OpenAIApiAdapter.generateWithThread(
      'hello',
      'apiKey',
      'gpt-4o',
      'https://api.openai.com',
      [],
    );
    expect(result.response).toBe('first');
    expect(result.updatedHistory.length).toBe(2); // user + assistant
  });
});
