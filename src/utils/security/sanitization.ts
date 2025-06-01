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
  if (typeof input !== 'string') {
    return ''
  }

  return input
    // HTMLタグを除去
    .replace(/<[^>]*>/g, '')
    // JavaScriptプロトコルを除去
    .replace(/javascript:/gi, '')
    // データURLを除去（悪意のあるbase64エンコードされたスクリプトを防ぐ）
    .replace(/data:/gi, '')
    // 改行文字を正規化（CRLFインジェクションを防ぐ）
    .replace(/[\r\n]/g, ' ')
    // 連続する空白を単一のスペースに
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * JSON文字列として安全でない文字をエスケープ
 * @param input - エスケープするテキスト
 * @returns エスケープされたテキスト
 */
export function escapeForJson(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/\\/g, '\\\\')  // バックスラッシュをエスケープ
    .replace(/"/g, '\\"')    // ダブルクォートをエスケープ
    .replace(/'/g, "\\'")    // シングルクォートをエスケープ
    .replace(/\n/g, '\\n')   // 改行をエスケープ
    .replace(/\r/g, '\\r')   // キャリッジリターンをエスケープ
    .replace(/\t/g, '\\t')   // タブをエスケープ
}

/**
 * HTML属性値として安全な文字列にエスケープ
 * @param input - エスケープするテキスト
 * @returns エスケープされたテキスト
 */
export function escapeHtmlAttribute(input: string): string {
  if (typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
}

/**
 * URLとして安全な文字列かどうかを検証
 * @param url - 検証するURL文字列
 * @returns URLが安全である場合はtrue
 */
export function isValidUrl(url: string): boolean {
  if (typeof url !== 'string' || url.length === 0) {
    return false
  }

  try {
    const urlObj = new URL(url)
    
    // 安全なプロトコルのみを許可
    const allowedProtocols = ['http:', 'https:', 'mailto:']
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return false
    }

    // JavaScriptプロトコルやデータURLを明示的に拒否
    if (url.toLowerCase().includes('javascript:') || url.toLowerCase().includes('data:')) {
      return false
    }

    return true
  } catch {
    return false
  }
}

/**
 * ファイル名として安全な文字列にサニタイズ
 * @param filename - サニタイズするファイル名
 * @returns サニタイズされたファイル名
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    return 'untitled'
  }

  return filename
    // 危険な文字を除去
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '')
    // ドットで始まるファイル名を防ぐ
    .replace(/^\.+/, '')
    // 予約語を避ける
    .replace(/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, 'file')
    .trim()
    || 'untitled'
}

/**
 * オブジェクトのプロパティを再帰的にサニタイズ
 * @param obj - サニタイズするオブジェクト
 * @returns サニタイズされたオブジェクト
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return sanitizeText(obj) as T
  }

  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as T
  }

  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      // キー名もサニタイズ
      const sanitizedKey = sanitizeText(key)
      sanitized[sanitizedKey] = sanitizeObject(value)
    }
    return sanitized as T
  }

  return obj
}

/**
 * APIレスポンスのテキストをサニタイズ
 * @param response - サニタイズするレスポンステキスト
 * @returns サニタイズされたレスポンス
 */
export function sanitizeApiResponse(response: string): string
export function sanitizeApiResponse(response: any): any
export function sanitizeApiResponse(response: any): any {
  if (typeof response === 'string') {
    // 基本的なHTMLタグは保持しつつ、危険なスクリプトを除去
    return response
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
  }

  // オブジェクトや配列の場合はsanitizeObjectを使用
  return sanitizeObject(response)
}
