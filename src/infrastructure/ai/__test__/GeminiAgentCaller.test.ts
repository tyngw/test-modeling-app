/**
 * src/infrastructure/ai/__test__/GeminiAgentCaller.test.ts
 *
 * createGeminiAgentCaller の振る舞いをロックするテスト（移行後: fetch モック版）。
 */

const mockFetch = jest.fn();
Object.defineProperty(global, 'fetch', { writable: true, value: mockFetch });

jest.mock('../../../utils/security/sanitization', () => ({
  sanitizeApiResponse: (v: unknown) => v,
}));

import { createGeminiAgentCaller } from '../GeminiAgentCaller';

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

const userMsg = { role: 'user' as const, content: 'hello' };

function makeGeminiData(text: string) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }],
        },
      },
    ],
  };
}

function makeGeminiFunctionCallData(name: string, args: Record<string, unknown>) {
  return {
    candidates: [
      {
        content: {
          parts: [{ functionCall: { name, args } }],
        },
      },
    ],
  };
}

describe('createGeminiAgentCaller', () => {
  beforeEach(() => jest.clearAllMocks());

  it('Gemini エンドポイントへ API キー付きで直接 POST する', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess(makeGeminiData('hi')));
    const caller = createGeminiAgentCaller('MY_API_KEY', 'gemini-1.5-flash');
    await caller([userMsg], []);
    const [calledUrl] = mockFetch.mock.calls[0];
    expect(calledUrl).toContain('MY_API_KEY');
    expect(calledUrl).toContain('gemini-1.5-flash');
    // プロキシ（/api/ai/generate）は使わない
    expect(calledUrl).not.toBe('/api/ai/generate');
  });

  it('テキスト応答を content として返す', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess(makeGeminiData('hello response')));
    const caller = createGeminiAgentCaller('key', 'model');
    const result = await caller([userMsg], []);
    expect(result.content).toBe('hello response');
    expect(result.toolCalls).toBeUndefined();
  });

  it('functionCall を持つ応答を toolCalls として返す', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess(makeGeminiFunctionCallData('my_func', { a: 1 })));
    const caller = createGeminiAgentCaller('key', 'model');
    const result = await caller([userMsg], []);
    expect(result.toolCalls).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(result.toolCalls![0].function.name).toBe('my_func');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const parsedArgs = JSON.parse(result.toolCalls![0].function.arguments);
    expect(parsedArgs).toEqual({ a: 1 });
  });

  it('POST エラー時 Error をスローする', async () => {
    mockFetch.mockRejectedValue(new Error('Gemini error'));
    const caller = createGeminiAgentCaller('key', 'model');
    await expect(caller([userMsg], [])).rejects.toThrow('Gemini error');
  });
});
