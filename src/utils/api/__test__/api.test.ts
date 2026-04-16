/**
 * src/utils/api/__test__/api.test.ts
 *
 * api.ts の Gemini呼び出し関数の振る舞いをロックするテスト。
 * fetch をモックして実際の HTTP 通信なしに動作を検証する。
 */

const mockFetch = jest.fn()
Object.defineProperty(global, 'fetch', { writable: true, value: mockFetch })

// localStorageHelpers をモック（テスト環境で localStorage が使えないため）
jest.mock('../../storage/localStorageHelpers', () => ({
  getApiEndpoint: () => 'https://generativelanguage.googleapis.com/v1beta/models/test:generateContent',
  getPromptTemplates: () => ({}),
  getApiProvider: () => 'gemini',
}))

// agentSystemPrompt をモック
jest.mock('../../../config/agentSystemPrompt', () => ({
  resolveElementGenerationSystemPrompt: () => 'system prompt',
}))

// sanitization / validation をモック（実装内部の副作用を除外）
jest.mock('../../security/sanitization', () => ({
  sanitizeApiResponse: (v: unknown) => v,
}))
jest.mock('../../security/validation', () => ({
  validateJsonData: () => true,
}))

import { generateWithGemini, generateWithGeminiThread, generateElementSuggestions } from '../api'

function makeFetchSuccess(data: unknown) {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: { get: (name: string) => name === 'content-type' ? 'application/json' : null },
    json: async () => data,
    text: async () => JSON.stringify(data),
  }
}

function makeFetchError(status: number, data: unknown = {}) {
  return {
    ok: false,
    status,
    statusText: 'Error',
    headers: { get: (name: string) => name === 'content-type' ? 'application/json' : null },
    json: async () => data,
    text: async () => JSON.stringify(data),
  }
}

function makeGeminiData(text: string) {
  return {
    candidates: [
      {
        content: {
          parts: [{ text }],
        },
      },
    ],
  }
}

describe('generateWithGemini (Gemini プロバイダー)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('APIキーをクエリパラメータに付与して POST する', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess(makeGeminiData('result text')))
    await generateWithGemini('test prompt', 'MY_API_KEY', 'gemini-1.5-flash')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const [calledUrl] = mockFetch.mock.calls[0]
    expect(calledUrl).toContain('MY_API_KEY')
  })

  it('レスポンスのテキストをそのまま返す', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess(makeGeminiData('hello from gemini')))
    const result = await generateWithGemini('prompt', 'key', 'model')
    expect(result).toBe('hello from gemini')
  })

  it('400 エラー時に適切なメッセージの Error をスローする', async () => {
    mockFetch.mockResolvedValue(makeFetchError(400, { error: { message: 'invalid key' } }))
    await expect(generateWithGemini('p', 'k', 'm')).rejects.toThrow('API リクエストエラー')
  })

  it('ネットワークエラー時に汎用エラーをスローする', async () => {
    mockFetch.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(generateWithGemini('p', 'k', 'm')).rejects.toThrow('API呼び出しに失敗しました')
  })
})

describe('generateWithGeminiThread (Gemini プロバイダー)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('チャット履歴を含むリクエストを送信し、updatedHistory を返す', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess(makeGeminiData('reply')))
    const history = [{ role: 'user' as const, parts: [{ text: 'previous' }] }]
    const result = await generateWithGeminiThread('new message', 'key', 'model', history)
    expect(result.response).toBe('reply')
    // updatedHistory は元の履歴 + user + model の計3件
    expect(result.updatedHistory.length).toBe(3)
    expect(result.updatedHistory.at(-1)?.role).toBe('model')
  })

  it('空の履歴でも正常に動作する', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess(makeGeminiData('first reply')))
    const result = await generateWithGeminiThread('hello', 'key', 'model', [])
    expect(result.response).toBe('first reply')
    expect(result.updatedHistory.length).toBe(2)
  })
})

describe('generateElementSuggestions (Gemini プロバイダー)', () => {
  beforeEach(() => jest.clearAllMocks())

  it('レスポンスの JSON をパースして SuggestionResponse を返す', async () => {
    const suggestionsJson = JSON.stringify({ suggestions: [{ label: 'A' }] })
    mockFetch.mockResolvedValue(makeFetchSuccess(makeGeminiData(suggestionsJson)))
    const result = await generateElementSuggestions('prompt', 'key', 'model')
    expect(result.suggestions).toHaveLength(1)
    expect(result.suggestions[0].label).toBe('A')
  })

  it('空のレスポンス時は suggestions: [] を返す', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess(makeGeminiData('{"suggestions":[]}')))
    const result = await generateElementSuggestions('prompt', 'key', 'model')
    expect(result.suggestions).toHaveLength(0)
  })
})
