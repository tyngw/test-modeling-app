// src/utils/environment/environmentDetector.ts

/**
 * VSCode拡張機能として動作しているかを判定
 * HTMLの data-vscode-extension 属性で判定
 */
export function isVSCodeExtension(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const htmlElement = document.documentElement;
  return htmlElement.getAttribute('data-vscode-extension') === 'true';
}

/**
 * VSCodeエディタ連携モード（1ファイル = 1 Webview）かを判定
 * HTMLの data-vscode-editor-mode 属性で判定
 */
export function isVSCodeEditorMode(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const htmlElement = document.documentElement;
  return htmlElement.getAttribute('data-vscode-editor-mode') === 'true';
}
