// src/utils/vscode/vscodeMessaging.ts
'use client';

import { isVSCodeEditorMode } from '../environment/environmentDetector';
import { debugLog } from '../debugLogHelpers';

export interface DocumentUpdatePayload {
  hierarchicalData?: unknown;
  fileType?: 'json' | 'markdown';
  serializedContent?: string;
  fileName?: string;
  content?: unknown;
  skipStateUpdate?: boolean;
}

export interface DocumentUpdatedMessagePayload extends DocumentUpdatePayload {
  fileName: string;
}

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
let pendingUpdatePayload: DocumentUpdatePayload | null = null;

/**
 * ドキュメントの更新をVSCodeに通知
 * markdown-table-editor方式: 状態変更を即座に送信
 */
export function notifyDocumentUpdate(payload: DocumentUpdatePayload): void {
  debugLog('[vscodeMessaging] notifyDocumentUpdate called');
  debugLog('[vscodeMessaging] isVSCodeEditorMode:', isVSCodeEditorMode());

  if (!isVSCodeEditorMode()) {
    debugLog('[vscodeMessaging] Not in editor mode, skipping');
    return;
  }

  const vscode = getVSCodeAPI();
  debugLog('[vscodeMessaging] VSCode API available:', !!vscode);

  if (!vscode) {
    debugLog('[vscodeMessaging] VSCode API not available');
    debugLog('[vscodeMessaging] window.vscode:', !!window.vscode);
    debugLog(
      '[vscodeMessaging] window.__testModelingAppVscodeApi:',
      !!window.__testModelingAppVscodeApi,
    );
    return;
  }

  if (isUpdating) {
    debugLog('[vscodeMessaging] Update in progress, queueing latest payload');
    pendingUpdatePayload = { ...payload };
    return;
  }

  pendingUpdatePayload = null;
  isUpdating = true;

  const message = {
    type: 'updateDocument',
    data: payload,
    timestamp: Date.now(),
  };

  debugLog('[vscodeMessaging] Sending updateDocument message');
  debugLog('[vscodeMessaging] Message type:', message.type);
  debugLog('[vscodeMessaging] Has data:', !!message.data);

  try {
    vscode.postMessage(message);
    debugLog('[vscodeMessaging] ✅ Message sent successfully');
  } catch (error) {
    debugLog('[vscodeMessaging] ❌ Error sending message:', error);
    isUpdating = false;
    pendingUpdatePayload = null;
  }
}

/**
 * VSCodeからのメッセージを受信するリスナーを設定
 */
export function setupVSCodeMessageListener(
  onInitializeWithFile: (data: {
    fileName: string;
    content: unknown;
    fileType?: 'json' | 'markdown';
    isEditorMode: boolean;
  }) => void,
  onDocumentUpdated: (data: DocumentUpdatedMessagePayload) => void,
): () => void {
  const vscode = getVSCodeAPI();

  if (vscode) {
    debugLog('[vscodeMessaging] VSCode API initialized');
    // 準備完了を通知
    setTimeout(() => {
      vscode.postMessage({ type: 'ready' });
    }, 100);
  }

  const messageHandler = (event: MessageEvent) => {
    const message = event.data;

    debugLog('[vscodeMessaging] Message received from extension');
    debugLog('[vscodeMessaging] Message:', message);

    if (!message || typeof message.type !== 'string') {
      debugLog('[vscodeMessaging] Invalid message format');
      return;
    }

    debugLog('[vscodeMessaging] Processing message type:', message.type);

    switch (message.type) {
      case 'initializeWithFile':
        debugLog('[vscodeMessaging] Initializing with file');
        if (message.data) {
          onInitializeWithFile(message.data);
        }
        break;

      case 'documentUpdated':
        // markdown-table-editor方式: 更新後の最新データを受信
        debugLog('[vscodeMessaging] Document updated from extension');
        isUpdating = false; // 更新完了
        if (message.data) {
          debugLog('[vscodeMessaging] Calling onDocumentUpdated');
          onDocumentUpdated(message.data as DocumentUpdatedMessagePayload);
        }

        if (pendingUpdatePayload) {
          const nextPayload = pendingUpdatePayload;
          pendingUpdatePayload = null;
          notifyDocumentUpdate(nextPayload);
        }
        break;

      case 'updateError':
        debugLog('[vscodeMessaging] Update error from extension:', message.message);
        isUpdating = false;
        pendingUpdatePayload = null;
        break;

      default:
        debugLog('[vscodeMessaging] Unknown message type:', message.type);
        break;
    }
  };

  window.addEventListener('message', messageHandler);

  return () => {
    window.removeEventListener('message', messageHandler);
  };
}
