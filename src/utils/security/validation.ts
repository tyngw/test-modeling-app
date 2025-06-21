/**
 * 入力値の検証とバリデーションユーティリティ
 * XSS攻撃やインジェクション攻撃を防ぐための検証ロジック
 */

/**
 * APIキーの形式を検証
 * @param apiKey - 検証するAPIキー
 * @returns APIキーが有効な形式の場合はtrue
 */
export function validateApiKey(apiKey: string): boolean {
  if (typeof apiKey !== 'string') {
    return false;
  }

  // 空文字列やnull値を拒否
  if (apiKey.trim().length === 0) {
    return false;
  }

  // 危険な文字が含まれていないかチェック
  const dangerousChars = /[<>'"&]/;
  const hasControlChars = apiKey.split('').some((char) => {
    const code = char.charCodeAt(0);
    return code >= 0 && code <= 31;
  });

  if (dangerousChars.test(apiKey) || hasControlChars) {
    return false;
  }

  // 一般的なAPIキーの長さ制限（8-128文字）
  if (apiKey.length < 8 || apiKey.length > 128) {
    return false;
  }

  return true;
}

/**
 * テキスト入力の長さと内容を検証
 * @param text - 検証するテキスト
 * @param maxLength - 最大文字数（デフォルト: 10000）
 * @returns テキストが有効な場合はtrue
 */
export function validateTextInput(text: string, maxLength = 10000): boolean {
  if (typeof text !== 'string') {
    return false;
  }

  // 長さチェック
  if (text.length > maxLength) {
    return false;
  }

  // 危険なパターンのチェック
  const dangerousPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/i, // スクリプトタグ
    /javascript:.*$/i, // JavaScriptプロトコル
    /data:.*$/i, // データURL
    /eval\s*\([^)]*\)/i, // eval関数
    /on\w+\s*=/i, // イベントハンドラー
    /expression\s*\([^)]*\)/i, // CSS expression
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(text)) {
      return false;
    }
  }

  // 極端に多くのHTMLタグが含まれていないかチェック
  const htmlTagCount = (text.match(/<[^>]*>/g) || []).length;
  if (htmlTagCount > 10) {
    return false;
  }

  return true;
}

/**
 * JSONデータの構造を検証
 * @param data - 検証するJSONデータ
 * @returns データが安全な場合はtrue
 */
export function validateJsonData(data: unknown): boolean {
  // 文字列の場合はJSONとしてパースを試みる
  if (typeof data === 'string') {
    if (data.trim().length === 0) {
      return false;
    }
    try {
      data = JSON.parse(data);
    } catch {
      return false;
    }
  }

  // null、undefined、プリミティブ型は安全
  if (data === null || data === undefined || typeof data !== 'object') {
    return true;
  }

  // 循環参照のチェック
  try {
    JSON.stringify(data);
  } catch {
    return false;
  }

  // 深すぎるネストを防ぐ
  const maxDepth = 10;
  function checkDepth(obj: unknown, depth = 0): boolean {
    if (depth > maxDepth) {
      return false;
    }

    if (obj && typeof obj === 'object') {
      for (const value of Object.values(obj)) {
        if (!checkDepth(value, depth + 1)) {
          return false;
        }
      }
    }

    return true;
  }

  if (!checkDepth(data)) {
    return false;
  }

  // プロトタイプ汚染を防ぐ
  if (
    Object.prototype.hasOwnProperty.call(data, '__proto__') ||
    Object.prototype.hasOwnProperty.call(data, 'constructor') ||
    Object.prototype.hasOwnProperty.call(data, 'prototype')
  ) {
    return false;
  }

  return true;
}

/**
 * ファイルの内容とサイズを検証
 * @param content - ファイル内容
 * @param maxSize - 最大サイズ（バイト）
 * @returns ファイルが安全な場合はtrue
 */
export function validateFileContent(content: string, maxSize: number = 1024 * 1024): boolean {
  if (typeof content !== 'string') {
    return false;
  }

  // サイズチェック（1MB以下）
  const contentSize = new Blob([content]).size;
  if (contentSize > maxSize) {
    return false;
  }

  // 危険なスクリプトが含まれていないかチェック
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /data:\s*[^;]*;base64/i,
    /eval\s*\(/i,
    /Function\s*\(/i,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(content)) {
      return false;
    }
  }

  return true;
}

/**
 * 設定値の型と範囲を検証
 * @param key - 設定キー
 * @param value - 設定値
 * @returns 設定が有効な場合はtrue
 */
export function validateSettingValue(key: string, value: unknown): boolean {
  if (typeof key !== 'string' || key.trim().length === 0) {
    return false;
  }

  // 設定キーのホワイトリスト
  const allowedKeys = [
    'apiKey',
    'theme',
    'language',
    'autoSave',
    'fontSize',
    'maxHistory',
    'showLineNumbers',
    'wordWrap',
    'prompt',
    'systemPromptTemplate',
    'modelType',
    'layoutMode',
    'numberOfSections',
    'markerType',
    'canvasBackgroundColor',
    'elementColor',
    'textColor',
    'strokeColor',
    'selectedStrokeColor',
    'strokeWidth',
    'connectionPathColor',
    'connectionPathStroke',
    'fontFamily',
  ];

  if (!allowedKeys.includes(key)) {
    return false;
  }

  // キーごとの値検証
  switch (key) {
    case 'apiKey':
      return typeof value === 'string' && validateApiKey(value);

    case 'theme':
      return typeof value === 'string' && ['light', 'dark', 'auto'].includes(value);

    case 'language':
      return typeof value === 'string' && ['ja', 'en'].includes(value);

    case 'autoSave':
      return typeof value === 'boolean';

    case 'fontSize':
      return typeof value === 'number' && value >= 10 && value <= 24;

    case 'maxHistory':
      return typeof value === 'number' && value >= 0 && value <= 100;

    case 'showLineNumbers':
    case 'wordWrap':
      return typeof value === 'boolean';

    case 'prompt':
    case 'systemPromptTemplate':
      // プロンプトフィールドは空文字列も許可
      return typeof value === 'string' && (value === '' || validateTextInput(value, 50000));

    case 'modelType':
      return typeof value === 'string' && ['gemini-2.0-flash', 'gemini-2.5-flash'].includes(value);

    case 'layoutMode':
      return typeof value === 'string' && ['default', 'mindmap'].includes(value);

    case 'numberOfSections': {
      const numSections = typeof value === 'string' ? parseInt(value, 10) : value;
      return (
        typeof numSections === 'number' &&
        !isNaN(numSections) &&
        numSections >= 1 &&
        numSections <= 10
      );
    }

    case 'markerType':
      return typeof value === 'string' && value.length <= 50;

    case 'canvasBackgroundColor':
    case 'elementColor':
    case 'textColor':
    case 'strokeColor':
    case 'selectedStrokeColor':
    case 'connectionPathColor':
      return typeof value === 'string' && (/^#[0-9A-Fa-f]{6}$/.test(value) || value === '');

    case 'strokeWidth':
    case 'connectionPathStroke': {
      const numStroke = typeof value === 'string' ? parseFloat(value) : value;
      return (
        typeof numStroke === 'number' && !isNaN(numStroke) && numStroke >= 0 && numStroke <= 20
      );
    }

    case 'fontFamily':
      return typeof value === 'string' && value.length <= 100;

    default:
      return false;
  }
}

/**
 * 外部URLの安全性を検証
 * @param url - 検証するURL
 * @returns URLが安全な場合はtrue
 */
export function validateExternalUrl(url: string): boolean {
  if (typeof url !== 'string' || url.trim().length === 0) {
    return false;
  }

  try {
    const urlObj = new URL(url);

    // HTTPSのみ許可（開発環境ではHTTPも許可）
    const isHttpsOrLocalhost =
      urlObj.protocol === 'https:' ||
      (urlObj.protocol === 'http:' &&
        (urlObj.hostname === 'localhost' || urlObj.hostname === '127.0.0.1'));

    if (!isHttpsOrLocalhost) {
      return false;
    }

    // プライベートIPアドレスへのアクセスを制限
    const privateIpPatterns = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^127\./,
      /^169\.254\./,
      /^::1$/,
      /^fe80:/,
    ];

    const isPrivateIp = privateIpPatterns.some((pattern) => pattern.test(urlObj.hostname));
    if (isPrivateIp && !['localhost', '127.0.0.1'].includes(urlObj.hostname)) {
      return false;
    }

    // 危険なプロトコルを拒否
    if (url.toLowerCase().includes('javascript:') || url.toLowerCase().includes('data:')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}
