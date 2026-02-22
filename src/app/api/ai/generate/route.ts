import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * ローカルLLMサーバーへのプロキシエンドポイント
 * フロントエンドからのリクエストをバックエンドでローカルLLMに転送
 *
 * 背景:
 * - ローカルLLMサーバー（e.g., http://192.168.0.13:1234）への直接アクセスは
 *   ブラウザのセキュリティポリシーでブロックされる（CORS、CSP）
 * - バックエンド経由でアクセスすることで、セキュリティを維持しながら
 *   ローカルサーバーへのアクセスを実現する
 *
 * セキュリティ: SSRF対策
 * - 許可ホストのみをホワイトリスト方式で許可（ローカルネットワーク範囲に限定）
 */

/**
 * ホストが許可リストに含まれるかを検証
 * SSRF対策: ローカルネットワークアドレスのみを許可
 */
function isAllowedHost(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname || url.host;

    // 許可ホスト：ローカルネットワーク範囲のみ
    // ローカルLLMサーバーをサポート（SSRF対策: 内部通信のみ許可）
    const allowedPatterns = [
      /^localhost$/i,
      /^127\.\d+\.\d+\.\d+$/, // 127.0.x.x
      /^192\.168\.\d+\.\d+$/, // 192.168.x.x
      /^10\.\d+\.\d+\.\d+$/, // 10.x.x.x
      /^172\.(1[6-9]|2[0-9]|3[01])\.\d+\.\d+$/, // 172.16.x.x - 172.31.x.x
      /^169\.254\.\d+\.\d+$/, // 169.254.x.x (link-local)
    ];

    return allowedPatterns.some((pattern) => pattern.test(hostname));
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { endpoint, payload, apiKey } = body;

    // リクエスト検証
    if (!endpoint || !payload) {
      return NextResponse.json({ error: 'エンドポイントとペイロードが必須です' }, { status: 400 });
    }

    // セキュリティ: 許可ホストのみを許可（SSRF対策）
    if (!isAllowedHost(endpoint)) {
      // eslint-disable-next-line no-console
      console.error(`[API Route Security] Disallowed host attempted: ${endpoint}`);
      return NextResponse.json(
        { error: 'アクセスが許可されていないエンドポイントです' },
        { status: 403 },
      );
    }

    // ローカルLLM対応: response_formatはサポートされていないため削除
    // これはローカルLLMサーバーとの互換性を確保するための防御的な修正
    const isLocalServer =
      endpoint.startsWith('http://localhost') ||
      endpoint.startsWith('http://127.0.0.1') ||
      endpoint.startsWith('http://192.168') ||
      endpoint.startsWith('http://10.');

    if (isLocalServer && payload.response_format) {
      delete payload.response_format;
    }

    // プロンプト長のプリチェック（ローカルLLMの制限対策）
    // 入力トークン数をラフに推定：日本語は1文字≈1トークン程度
    const messages = payload.messages || [];
    const totalPromptLength = messages.reduce(
      (sum: number, msg: Record<string, unknown>) => sum + String(msg.content || '').length,
      0,
    );

    // ローカルLLM（4096トークン制限）への対応：入力+出力で6000文字程度だと危ない
    if (isLocalServer && totalPromptLength > 5000) {
      // eslint-disable-next-line no-console
      console.warn(
        `[API Route] Large prompt detected (${totalPromptLength} chars) for local LLM endpoint`,
      );
    }

    // ローカルLLMサーバーへのリクエスト
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // APIキーが提供されている場合は追加
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const response = await axios.post(endpoint, payload, { headers });

    return NextResponse.json(response.data);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[API Route Error]', error);

    if (axios.isAxiosError(error)) {
      const status = error.response?.status || 500;
      const errorMessage = error.response?.data?.error?.message || error.message;
      const errorData = error.response?.data;

      // コンテキスト超過エラーの特別対応
      if (
        errorData?.title?.includes('Cannot truncate prompt') ||
        errorMessage?.includes('exceeds the available context')
      ) {
        return NextResponse.json(
          {
            error:
              'プロンプトが長すぎます。ローカルLLMのコンテキスト制限（4096トークン）を超えています。',
            suggestion: 'システムプロンプトまたはユーザー入力を短縮してください。',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
          },
          { status: 413 }, // Payload Too Large
        );
      }

      return NextResponse.json(
        {
          error: errorMessage || 'ローカルLLMサーバーとの通信に失敗しました',
          details: process.env.NODE_ENV === 'development' ? error.message : undefined,
        },
        { status },
      );
    }

    return NextResponse.json(
      {
        error: 'リクエスト処理中にエラーが発生しました',
        details:
          process.env.NODE_ENV === 'development' && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500 },
    );
  }
}
