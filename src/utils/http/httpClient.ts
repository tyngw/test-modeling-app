/**
 * src/utils/http/httpClient.ts
 *
 * axios の代替となるネイティブ fetch ベースの軽量 HTTP クライアント。
 * axios.post / axios.isAxiosError と同等のインターフェースを提供し、
 * axios の脆弱性リスクを排除する。
 *
 * 設計方針:
 * - 追加依存なし（ネイティブ fetch のみ使用）
 * - axios.post の戻り値形式 { data } を模倣
 * - HttpError は axios.AxiosError 相当のフィールドを持ちエラーハンドリングを統一
 * - コネクション拒否 / ネットワーク断など network-level エラーも処理
 */

/** HTTP エラーレスポンスの中身 */
export interface HttpErrorResponse {
  status: number;
  statusText: string;
  data: unknown;
}

/**
 * axios の AxiosError 相当のエラークラス
 *
 * フィールド互換性:
 * - error.response.status  ← axios.AxiosError.response.status
 * - error.response.data    ← axios.AxiosError.response.data
 * - error.code             ← axios.AxiosError.code ('ECONNREFUSED' | 'ERR_NETWORK' など)
 */
export class HttpError extends Error {
  readonly response?: HttpErrorResponse;
  /** ネットワークレベルのエラーコード */
  readonly code?: string;
  /** HttpError であることを確認するためのタグ（axios.AxiosError.isAxiosError 相当） */
  readonly isHttpError = true as const;

  constructor(
    message: string,
    options?: {
      response?: HttpErrorResponse;
      code?: string;
      cause?: unknown;
    },
  ) {
    super(message, { cause: options?.cause });
    this.name = 'HttpError';
    this.response = options?.response;
    this.code = options?.code;
  }
}

/**
 * axios.isAxiosError 相当
 * unknown な catch 変数が HttpError かどうかを型ガードで確認する
 */
export function isHttpError(error: unknown): error is HttpError {
  return error instanceof HttpError;
}

// ── 内部ユーティリティ ──────────────────────────────────────────

/** Content-Type に応じてレスポンスボディをパース */
async function parseBody(res: Response): Promise<unknown> {
  const contentType = res.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('application/json')) {
      return await res.json();
    }
    return await res.text();
  } catch {
    // パースに失敗したら空文字を返す（ステータスコードの方が重要）
    return '';
  }
}

/**
 * TypeError（fetch の network failure）から error code を解決する。
 *
 * Node.js 環境: cause に { code: 'ECONNREFUSED' } が付く場合がある
 * ブラウザ環境: "Failed to fetch" などのメッセージのみ
 */
function resolveNetworkErrorCode(err: unknown): string {
  if (err && typeof err === 'object') {
    // Node.js の fetch では cause に AggregateError が付き、その中に ECONNREFUSED がある
    const cause = (err as { cause?: unknown }).cause;
    if (cause && typeof cause === 'object') {
      const code = (cause as { code?: string }).code;
      if (code) return code;
      // AggregateError の場合は errors 配列の最初の要素を確認
      const errors = (cause as { errors?: unknown[] }).errors;
      if (Array.isArray(errors)) {
        const first = errors[0];
        if (first && typeof first === 'object') {
          const innerCode = (first as { code?: string }).code;
          if (innerCode) return innerCode;
        }
      }
    }
    const directCode = (err as { code?: string }).code;
    if (directCode) return directCode;
  }
  return 'ERR_NETWORK';
}

// ── パブリック API ──────────────────────────────────────────────

export interface PostConfig {
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/**
 * POST リクエストを送信し、{ data } 形式で結果を返す。
 *
 * axios.post(url, body, config) の互換実装。
 * - 2xx 以外のレスポンスは HttpError をスロー
 * - ネットワーク障害（接続拒否など）は HttpError(code='ECONNREFUSED'|'ERR_NETWORK') をスロー
 */
export async function post<T = unknown>(
  url: string,
  data: unknown,
  config?: PostConfig,
): Promise<{ data: T }> {
  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers,
      },
      body: JSON.stringify(data),
      signal: config?.signal,
    });
  } catch (cause) {
    // fetch 自体が失敗した場合（ネットワーク断・接続拒否など）
    const code = resolveNetworkErrorCode(cause);
    const message = (cause instanceof Error ? cause.message : String(cause)) || 'Network Error';
    throw new HttpError(message, { code, cause });
  }

  if (!response.ok) {
    const body = await parseBody(response);
    throw new HttpError(`HTTP ${response.status} ${response.statusText}`, {
      response: {
        status: response.status,
        statusText: response.statusText,
        data: body,
      },
    });
  }

  const body = await parseBody(response);
  return { data: body as T };
}

/** httpClient 名前空間（axios 風の使い方に合わせたエイリアス） */
export const httpClient = {
  post,
  isHttpError,
};
