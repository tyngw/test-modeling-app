// src/utils/environment/environmentDetector.ts

/**
 * 実行環境を検出するユーティリティ
 */
export interface EnvironmentInfo {
  isVSCodeExtension: boolean;
  isBrowser: boolean;
  isServer: boolean;
}

/**
 * 現在の実行環境を検出
 */
export function detectEnvironment(): EnvironmentInfo {
  // サーバーサイド（Next.js SSR）の場合
  if (typeof window === 'undefined') {
    return {
      isVSCodeExtension: false,
      isBrowser: false,
      isServer: true,
    };
  }

  // VSCode拡張環境の場合
  if (typeof window !== 'undefined' && (window as any).isVSCodeExtension) {
    return {
      isVSCodeExtension: true,
      isBrowser: false,
      isServer: false,
    };
  }

  // 通常のブラウザ環境の場合
  return {
    isVSCodeExtension: false,
    isBrowser: true,
    isServer: false,
  };
}

/**
 * VSCode拡張環境かどうかを判定
 */
export function isVSCodeExtension(): boolean {
  return detectEnvironment().isVSCodeExtension;
}

/**
 * ブラウザ環境かどうかを判定
 */
export function isBrowser(): boolean {
  return detectEnvironment().isBrowser;
}

/**
 * サーバー環境かどうかを判定
 */
export function isServer(): boolean {
  return detectEnvironment().isServer;
}
