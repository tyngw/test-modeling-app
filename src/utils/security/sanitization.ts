/**
 * XSS攻撃を防ぐためのサニタイゼーションユーティリティ
 * セキュリティを強化し、悪意のあるスクリプトの実行を防ぎます
 */

/**
 * HTMLタグとスクリプトを除去してテキストをサニタイズ
 * @param input - サニタイズするテキスト
 * @returns サニタイズされたテキスト
 */
export function sanitizeText(input: string): string {
  if (typeof input !== 'string') return '';
  const result = input
    .replace(/data:[^,]*,/gi, ',') // data:からカンマまでを「,」に置換
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // 必ずスクリプトタグを消す
    .replace(/<[^>]*>/g, '') // その他のタグも消す
    .replace(/eval\s*\([^)]*\)/gi, '') // evalも消す
    .replace(/javascript:.*$/gi, ''); // javascript:も消す
  // 空白正規化は行わない（改行・スペース・タブはそのまま）
  return result;
}

/**
 * JSON文字列として安全でない文字をエスケープ
 * @param input - エスケープするテキスト
 * @returns エスケープされたテキスト
 */
export function escapeForJson(input: string): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/[\b]/g, '\\b')
    .replace(/\f/g, '\\f')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * HTML属性値として安全な文字列にエスケープ
 * @param input - エスケープするテキスト
 * @returns エスケープされたテキスト
 */
export function escapeHtmlAttribute(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * URLとして安全な文字列かどうかを検証
 * @param url - 検証するURL文字列
 * @returns URLが安全である場合はtrue
 */
export function isValidUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) {
    return false;
  }

  try {
    const urlObj = new URL(url);

    // 安全なプロトコルのみを許可
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return false;
    }

    // JavaScriptプロトコルやデータURLを明示的に拒否
    if (url.toLowerCase().includes('javascript:') || url.toLowerCase().includes('data:')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * ファイル名として安全な文字列にサニタイズ
 * @param filename - サニタイズするファイル名
 * @returns サニタイズされたファイル名
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'untitled';
  }

  // まずHTMLタグを除去
  let result = filename
    .replace(/<[^>]*>/g, '') // HTMLタグを除去
    // 危険な文字を除去（制御文字、特殊文字）
    .replace(/[<>:"/\\|?*]/g, '');

  // 制御文字を文字コードで除去
  result = result
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return !(code >= 0 && code <= 31) && !(code >= 127 && code <= 159);
    })
    .join('');

  result = result
    // ドットで始まるファイル名を防ぐ
    .replace(/^\.+/, '')
    // 予約語を避ける
    .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, 'file')
    // 連続するドットを単一のドットに
    .replace(/\.{2,}/g, '.')
    // 末尾のドットを除去
    .replace(/\.+$/, '')
    .trim();

  return result || 'untitled';
}

/**
 * オブジェクトのプロパティを再帰的にサニタイズ
 * @param obj - サニタイズするオブジェクト
 * @returns サニタイズされたオブジェクト
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    return sanitizeText(obj) as T;
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as T;
  }

  if (typeof obj === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // キー名もサニタイズ
      const sanitizedKey = sanitizeText(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized as T;
  }

  return obj;
}

/**
 * APIレスポンスのテキストをサニタイズ
 * @param response - サニタイズするレスポンステキスト
 * @returns サニタイズされたレスポンス
 */
export function sanitizeApiResponse(response: string): string;
export function sanitizeApiResponse(response: unknown): unknown;
export function sanitizeApiResponse(response: unknown): unknown {
  if (typeof response === 'string') {
    // 基本的なHTMLタグは保持しつつ、危険なスクリプトを除去
    return (
      response
        // スクリプトタグを完全に除去
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        // イベントハンドラー属性を除去
        .replace(/\bon\w+\s*=\s*[^>]*/gi, '')
        // JavaScriptプロトコルを除去
        .replace(/javascript:/gi, '')
        // データURLを除去
        .replace(/data:\s*[^;]*;base64/gi, '')
        // style属性内のexpression()を除去（IE向け）
        .replace(/expression\s*\([^)]*\)/gi, '')
    );
  }

  // オブジェクトや配列の場合はsanitizeObjectを使用
  return sanitizeObject(response);
}
