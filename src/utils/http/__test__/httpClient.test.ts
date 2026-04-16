/**
 * src/utils/http/__test__/httpClient.test.ts
 *
 * httpClient の振る舞いを網羅するユニットテスト。
 * テスト環境: jsdom (jest.config.ts) + global.fetch を jest.fn() でモック
 */

import { post, isHttpError, HttpError } from '../httpClient';

// ── fetch モックユーティリティ ────────────────────────────────────

function mockFetchSuccess(body: unknown, status = 200, contentType = 'application/json') {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status,
    statusText: 'OK',
    headers: { get: () => contentType },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(String(body)),
  } as unknown as Response);
}

function mockFetchError(status: number, body: unknown, statusText = 'Error') {
  global.fetch = jest.fn().mockResolvedValue({
    ok: false,
    status,
    statusText,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response);
}

function mockFetchNetworkFailure(code?: string) {
  const cause = code ? Object.assign(new Error('connection refused'), { code }) : undefined;
  const err = new TypeError('fetch failed');
  Object.defineProperty(err, 'cause', { value: cause });
  global.fetch = jest.fn().mockRejectedValue(err);
}

// ── テスト ────────────────────────────────────────────────────────

describe('post()', () => {
  afterEach(() => jest.restoreAllMocks());

  // 正常系

  it('200 OK: { data } 形式でレスポンスを返す', async () => {
    mockFetchSuccess({ foo: 'bar' });
    const result = await post('/api/test', { key: 'value' });
    expect(result.data).toEqual({ foo: 'bar' });
  });

  it('リクエストを POST / JSON ヘッダー付きで送信する', async () => {
    mockFetchSuccess({});
    await post('/api/test', { hello: 'world' });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ hello: 'world' }),
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('追加 headers を上書きマージできる', async () => {
    mockFetchSuccess({});
    await post('/api/test', {}, { headers: { Authorization: 'Bearer token' } });
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer token' }),
      }),
    );
  });

  // HTTP エラー系

  it('401 → HttpError (response.status === 401)', async () => {
    mockFetchError(401, { error: { message: 'Unauthorized' } }, 'Unauthorized');
    await expect(post('/api/test', {})).rejects.toMatchObject({
      isHttpError: true,
      response: { status: 401 },
    });
  });

  it('429 → HttpError (response.status === 429)', async () => {
    mockFetchError(429, {}, 'Too Many Requests');
    await expect(post('/api/test', {})).rejects.toMatchObject({
      isHttpError: true,
      response: { status: 429 },
    });
  });

  it('400 → HttpError で response.data を保持する', async () => {
    const errBody = { error: { message: 'bad request detail' } };
    mockFetchError(400, errBody, 'Bad Request');
    let caught: HttpError | undefined;
    try {
      await post('/api/test', {});
    } catch (e) {
      caught = e as HttpError;
    }
    expect(caught?.isHttpError).toBe(true);
    expect(caught?.response?.status).toBe(400);
    expect(caught?.response?.data).toEqual(errBody);
  });

  it('500 → HttpError (response.status === 500)', async () => {
    mockFetchError(500, {}, 'Internal Server Error');
    await expect(post('/api/test', {})).rejects.toMatchObject({
      isHttpError: true,
      response: { status: 500 },
    });
  });

  // ネットワーク障害系

  it('ECONNREFUSED → HttpError (code === ECONNREFUSED)', async () => {
    mockFetchNetworkFailure('ECONNREFUSED');
    await expect(post('http://localhost:1234/v1/chat', {})).rejects.toMatchObject({
      isHttpError: true,
      code: 'ECONNREFUSED',
    });
  });

  it('ネットワーク断（コードなし）→ HttpError (code === ERR_NETWORK)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(post('/api/test', {})).rejects.toMatchObject({
      isHttpError: true,
      code: 'ERR_NETWORK',
    });
  });
});

describe('isHttpError()', () => {
  it('HttpError インスタンスに対して true を返す', () => {
    expect(isHttpError(new HttpError('test'))).toBe(true);
  });

  it('response 付き HttpError でも true を返す', () => {
    const e = new HttpError('test', {
      response: { status: 400, statusText: 'Bad Request', data: {} },
    });
    expect(isHttpError(e)).toBe(true);
  });

  it('通常の Error インスタンスに対して false を返す', () => {
    expect(isHttpError(new Error('normal'))).toBe(false);
  });

  it('null に対して false を返す', () => {
    expect(isHttpError(null)).toBe(false);
  });

  it('文字列に対して false を返す', () => {
    expect(isHttpError('error string')).toBe(false);
  });
});
