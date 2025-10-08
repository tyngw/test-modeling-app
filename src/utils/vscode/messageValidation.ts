// src/utils/vscode/messageValidation.ts
'use client';

import { debugLog } from '../debugLogHelpers';

/**
 * VSCodeメッセージの検証ユーティリティ
 */

export interface VSCodeMessage {
  type: string;
  data?: unknown;
  message?: string;
  timestamp?: number;
}

/**
 * メッセージの基本構造を検証
 */
export function validateBasicMessageStructure(message: unknown): message is VSCodeMessage {
  if (!message || typeof message !== 'object') {
    debugLog('[messageValidation] Message is not an object');
    return false;
  }

  const msg = message as Record<string, unknown>;

  if (typeof msg.type !== 'string') {
    debugLog('[messageValidation] Message type is not a string');
    return false;
  }

  return true;
}

/**
 * メッセージタイプを検証
 */
export function validateMessageType(message: VSCodeMessage): boolean {
  const validTypes = [
    'initializeWithFile',
    'documentChanged',
    'documentUpdated', // editor → webview の同期用
    'updateDocument',
    'updateSuccess',
    'updateError',
    'ping',
    'pong',
    'ready',
    'showError',
    'showInfo',
  ];

  if (!validTypes.includes(message.type)) {
    debugLog('[messageValidation] Unknown message type:', message.type);
    return false;
  }

  return true;
}

/**
 * メッセージデータを検証
 */
export function validateMessageData(message: VSCodeMessage): boolean {
  switch (message.type) {
    case 'initializeWithFile':
    case 'documentChanged':
    case 'documentUpdated':
      if (!message.data || typeof message.data !== 'object') {
        debugLog('[messageValidation] Invalid data for', message.type);
        return false;
      }
      break;

    case 'updateDocument':
      if (!message.data) {
        debugLog('[messageValidation] No data provided for updateDocument');
        return false;
      }
      break;

    case 'showError':
    case 'showInfo':
      if (!message.message || typeof message.message !== 'string') {
        debugLog('[messageValidation] Invalid message for', message.type);
        return false;
      }
      break;

    case 'ping':
    case 'pong':
      if (message.timestamp && typeof message.timestamp !== 'number') {
        debugLog('[messageValidation] Invalid timestamp for', message.type);
        return false;
      }
      break;
  }

  return true;
}

/**
 * メッセージ全体を検証
 */
export function validateMessage(message: unknown): message is VSCodeMessage {
  if (!validateBasicMessageStructure(message)) {
    return false;
  }

  if (!validateMessageType(message)) {
    return false;
  }

  if (!validateMessageData(message)) {
    return false;
  }

  return true;
}
