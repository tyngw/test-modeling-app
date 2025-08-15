// src/utils/url/urlHelpers.ts

/**
 * URLを検出するための正規表現パターン
 * http://, https://, www. で始まるURLを検出
 */
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

/**
 * テキスト内のURLを検出する関数
 * @param text - 検索対象のテキスト
 * @returns 検出されたURLの配列
 */
export function detectUrls(text: string): string[] {
  const matches = text.match(URL_REGEX) || [];
  return matches.map((url) => {
    // www.で始まる場合はhttps://を付加
    if (url.startsWith('www.')) {
      return `https://${url}`;
    }
    return url;
  });
}

/**
 * URLが有効かチェックする関数
 * @param url - チェック対象のURL
 * @returns URLが有効かどうか
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * テキスト内の指定位置がURL内かどうかを判定する関数
 * @param text - テキスト全体
 * @param position - チェック対象の位置
 * @returns URLの情報（URL文字列、開始位置、終了位置）またはnull
 */
export function getUrlAtPosition(
  text: string,
  position: number,
): { url: string; start: number; end: number } | null {
  // URLマッチを全て取得
  const urlMatches = Array.from(text.matchAll(URL_REGEX));

  for (const match of urlMatches) {
    if (!match.index) continue;

    const startIndex = match.index;
    const endIndex = startIndex + match[0].length;

    if (position >= startIndex && position <= endIndex) {
      const rawUrl = match[0];
      const normalizedUrl = rawUrl.startsWith('www.') ? `https://${rawUrl}` : rawUrl;

      return {
        url: normalizedUrl,
        start: startIndex,
        end: endIndex,
      };
    }
  }

  return null;
}

/**
 * 新しいタブでURLを開く関数
 * @param url - 開くURL
 */
export function openUrlInNewTab(url: string): void {
  if (!isValidUrl(url)) {
    return;
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * モバイル端末かどうかを判定する関数
 * @returns モバイル端末かどうか
 */
export function isMobileDevice(): boolean {
  // より包括的なモバイル検出
  const userAgent = navigator.userAgent;
  const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    userAgent,
  );

  // タッチスクリーンの検出
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // 画面サイズでの判定（幅が768px以下をモバイルとする）
  const isSmallScreen = window.innerWidth <= 768;

  return isMobileUserAgent || (hasTouchScreen && isSmallScreen);
}
