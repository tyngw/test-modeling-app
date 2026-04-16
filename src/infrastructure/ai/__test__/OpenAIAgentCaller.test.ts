/**
 * src/infrastructure/ai/__test__/OpenAIAgentCaller.test.ts
 *
 * createOpenAIAgentCaller の振る舞いをロックするテスト（移行後: fetch モック版）。
 */

const mockFetch = jest.fn()
Object.defineProperty(global, 'fetch', { writable: true, value: mockFetch })

jest.mock('../../../utils/security/sanitization', () => ({
  sanitizeApiResponse: (v: unknown) => v,
}))

import { createOpenAIAgentCaller } from '../OpenAIAgentCaller'

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

const userMsg = { role: 'user' as const, content: 'hello' }

describe('createOpenAIAgentCaller', () => {
  beforeEach(() => jest.clearAllMocks())

  it('/api/ai/generate プロキシへ POST する', async () => {
    // eslint-disable-next-line camelcase
    mockFetch.mockResolvedValue(makeFetchSuccess({
      choices: [{ message: { content: 'ok', tool_calls: undefined } }],
    }))
    const caller = createOpenAIAgentCaller('apiKey', 'gpt-4o', 'https://api.openai.com')
    await caller([userMsg], [])
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/ai/generate',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"endpoint":"https://api.openai.com"'),
      }),
    )
  })

  it('テキスト応答を content として返す', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess({
      choices: [{ message: { content: 'response text' } }],
    }))
    const caller = createOpenAIAgentCaller('k', 'model', 'endpoint')
    const result = await caller([userMsg], [])
    expect(result.content).toBe('response text')
    expect(result.toolCalls).toBeUndefined()
  })

  it('tool_calls を持つ応答を toolCalls として返す', async () => {
    const toolCalls = [
      { id: 'tc1', type: 'function', function: { name: 'my_tool', arguments: '{"x":1}' } },
    ]
    // eslint-disable-next-line camelcase
    mockFetch.mockResolvedValue(makeFetchSuccess({
      choices: [{ message: { content: null, tool_calls: toolCalls } }],
    }))
    const caller = createOpenAIAgentCaller('k', 'model', 'endpoint')
    const result = await caller([userMsg], [])
    expect(result.toolCalls).toEqual(toolCalls)
  })

  it('LLM からの応答が空の場合 Error をスローする', async () => {
    mockFetch.mockResolvedValue(makeFetchSuccess({ choices: [] }))
    const caller = createOpenAIAgentCaller('k', 'model', 'endpoint')
    await expect(caller([userMsg], [])).rejects.toThrow('LLM からの応答が空です')
  })

  it('fetch エラー時は Error をスローする', async () => {
    mockFetch.mockRejectedValue(new Error('Internal error'))
    const caller = createOpenAIAgentCaller('k', 'model', 'endpoint')
    await expect(caller([userMsg], [])).rejects.toThrow('Internal error')
  })
})
