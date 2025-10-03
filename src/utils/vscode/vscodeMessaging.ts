// src/utils/vscode/vscodeMessaging.ts
'use client';

import { isVSCodeEditorMode } from '../environment/environmentDetector';

/**
 * VSCode APIの型定義
 */
interface VSCodeAPI {
  postMessage(message: unknown): void;
  setState(state: unknown): void;
  getState(): unknown;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VSCodeAPI;
    vscode?: VSCodeAPI;
    __testModelingAppVscodeApi?: VSCodeAPI;
  }
}

// VSCode APIのシングルトンインスタンス
let vscodeApiInstance: VSCodeAPI | null = null;

/**
 * VSCode APIを取得（シンプル版）
 */
function getVSCodeAPI(): VSCodeAPI | null {
  if (vscodeApiInstance) {
    return vscodeApiInstance;
  }

  // window.vscodeが既に存在する場合（extension.tsで設定済み）
  if (window.vscode) {
    vscodeApiInstance = window.vscode;
    return vscodeApiInstance;
  }

  // window.__testModelingAppVscodeApiをチェック
  if (window.__testModelingAppVscodeApi) {
    vscodeApiInstance = window.__testModelingAppVscodeApi;
    window.vscode = vscodeApiInstance;
    return vscodeApiInstance;
  }

  return null;
}

// 更新中フラグ（送信中の重複防止）
let isUpdating = false;

/**
 * ドキュメントの更新をVSCodeに通知
 * markdown-table-editor方式: 状態変更を即座に送信
 */
export function notifyDocumentUpdate(hierarchicalData: unknown): void {
  console.log('[vscodeMessaging] notifyDocumentUpdate called');
  console.log('[vscodeMessaging] isVSCodeEditorMode:', isVSCodeEditorMode());

  if (!isVSCodeEditorMode()) {
    console.log('[vscodeMessaging] Not in editor mode, skipping');
    return;
  }

  if (isUpdating) {
    console.log('[vscodeMessaging] Update in progress, skipping');
    return;
  }

  const vscode = getVSCodeAPI();
  console.log('[vscodeMessaging] VSCode API available:', !!vscode);

  if (!vscode) {
    console.error('[vscodeMessaging] VSCode API not available');
    console.error('[vscodeMessaging] window.vscode:', !!window.vscode);
    console.error(
      '[vscodeMessaging] window.__testModelingAppVscodeApi:',
      !!window.__testModelingAppVscodeApi,
    );
    return;
  }

  isUpdating = true;

  const message = {
    type: 'updateDocument',
    data: hierarchicalData,
    timestamp: Date.now(),
  };

  console.log('[vscodeMessaging] Sending updateDocument message');
  console.log('[vscodeMessaging] Message type:', message.type);
  console.log('[vscodeMessaging] Has data:', !!message.data);

  try {
    vscode.postMessage(message);
    console.log('[vscodeMessaging] ✅ Message sent successfully');
  } catch (error) {
    console.error('[vscodeMessaging] ❌ Error sending message:', error);
    isUpdating = false;
  }
}

/**
 * VSCodeからのメッセージを受信するリスナーを設定
 */
export function setupVSCodeMessageListener(
  onInitializeWithFile: (data: {
    fileName: string;
    content: unknown;
    isEditorMode: boolean;
  }) => void,
  onDocumentUpdated: (data: { fileName: string; content: unknown }) => void,
): () => void {
  const vscode = getVSCodeAPI();

  if (vscode) {
    console.log('[vscodeMessaging] VSCode API initialized');
    // 準備完了を通知
    setTimeout(() => {
      vscode.postMessage({ type: 'ready' });
    }, 100);
  }

  const messageHandler = (event: MessageEvent) => {
    const message = event.data;

    console.log('[vscodeMessaging] Message received from extension');
    console.log('[vscodeMessaging] Message:', message);

    if (!message || typeof message.type !== 'string') {
      console.warn('[vscodeMessaging] Invalid message format');
      return;
    }

    console.log('[vscodeMessaging] Processing message type:', message.type);

    switch (message.type) {
      case 'initializeWithFile':
        console.log('[vscodeMessaging] Initializing with file');
        if (message.data) {
          onInitializeWithFile(message.data);
        }
        break;

      case 'documentUpdated':
        // markdown-table-editor方式: 更新後の最新データを受信
        console.log('[vscodeMessaging] Document updated from extension');
        if (message.data) {
          isUpdating = false; // 更新完了
          console.log('[vscodeMessaging] Calling onDocumentUpdated');
          onDocumentUpdated(message.data);
        }
        break;

      default:
        console.warn('[vscodeMessaging] Unknown message type:', message.type);
        break;
    }
  };

  window.addEventListener('message', messageHandler);

  return () => {
    window.removeEventListener('message', messageHandler);
  };
}
