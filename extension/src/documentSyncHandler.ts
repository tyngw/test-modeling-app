// extension/src/documentSyncHandler.ts
import * as vscode from 'vscode';
import * as path from 'path';
import { SyncManager } from './syncManager';

/**
 * ドキュメント更新のペイロード
 */
export interface DocumentUpdatePayload {
  fileName?: string;
  hierarchicalData?: unknown;
  serializedContent?: string;
  fileType?: 'json' | 'markdown';
  content?: unknown;
  skipStateUpdate?: boolean;
}

/**
 * ファイル形式を検出
 */
export function detectFileTypeFromUri(uri: vscode.Uri): 'json' | 'markdown' {
  const extension = path.extname(uri.fsPath).toLowerCase();
  const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown']);
  return MARKDOWN_EXTENSIONS.has(extension) ? 'markdown' : 'json';
}

/**
 * ドキュメント同期を処理するクラス
 */
export class DocumentSyncHandler {
  private syncManager: SyncManager;
  private changeSubscription: vscode.Disposable | null = null;
  private viewStateSubscription: vscode.Disposable | null = null;

  constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly document: vscode.TextDocument,
  ) {
    this.syncManager = new SyncManager(panel, document);
    this.setupEventListeners();
  }

  /**
   * イベントリスナーを設定
   */
  private setupEventListeners(): void {
    // ドキュメント変更の監視
    this.changeSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      this.handleDocumentChange(e);
    });

    // パネルの表示状態変更の監視
    this.viewStateSubscription = this.panel.onDidChangeViewState(() => {
      if (this.panel.active) {
        this.syncManager.flushPendingUpdate();
      }
    });
  }

  /**
   * ドキュメント変更を処理
   */
  private handleDocumentChange(event: vscode.TextDocumentChangeEvent): void {
    // このドキュメントの変更かチェック
    if (event.document.uri.toString() !== this.document.uri.toString()) {
      return;
    }

    // Webviewからの更新による変更はスキップ
    if (this.syncManager.isWebviewUpdate()) {
      return;
    }

    // 最近更新されたばかりの場合はスキップ（デバウンス）
    if (this.syncManager.isRecentlyUpdated()) {
      return;
    }

    // 差分がない場合はスキップ
    const newContent = event.document.getText();
    if (!this.syncManager.hasContentChanged(newContent)) {
      return;
    }

    console.log('[DocumentSyncHandler] Document changed, syncing to webview');

    try {
      const fileName = path.basename(this.document.uri.fsPath);
      const fileType = detectFileTypeFromUri(this.document.uri);

      let updatePayload: DocumentUpdatePayload;

      if (fileType === 'markdown') {
        updatePayload = {
          fileName,
          content: newContent,
          serializedContent: newContent,
          fileType: 'markdown',
        };
      } else {
        const data = JSON.parse(newContent);
        updatePayload = {
          fileName,
          content: data,
          fileType: 'json',
        };
      }

      // デバウンス付きでWebviewに更新を送信
      this.syncManager.scheduleWebviewUpdate(updatePayload);
      this.syncManager.updateSyncedContent(newContent);
    } catch (error) {
      console.error('[DocumentSyncHandler] Failed to sync document to webview:', error);
    }
  }

  /**
   * ```tree コードブロック内の内容を更新し、コードブロック外の文字列を保持
   * @param originalContent 元のマークダウンファイルの内容
   * @param newTreeContent 新しいツリー構造のマークダウン（コードブロックなし）
   * @returns 更新後のマークダウンファイルの内容
   */
  private updateTreeCodeBlock(
    originalContent: string,
    newTreeContent: string,
  ): string {
    // ```tree で始まるコードブロックを検索
    const treeBlockRegex = /(```tree\s*\n)([\s\S]*?)(```)/g;
    const match = treeBlockRegex.exec(originalContent);

    if (match) {
      // コードブロックが見つかった場合、内容だけを更新
      const beforeBlock = originalContent.substring(0, match.index);
      const afterBlock = originalContent.substring(match.index + match[0].length);
      return `${beforeBlock}${match[1]}${newTreeContent}\n${match[3]}${afterBlock}`;
    } else {
      // コードブロックが見つからない場合、新しく追加
      // 既存の内容の最後に追加
      const trimmedOriginal = originalContent.trimEnd();
      const separator = trimmedOriginal && !trimmedOriginal.endsWith('\n') ? '\n\n' : '\n';
      return `${trimmedOriginal}${separator}\`\`\`tree\n${newTreeContent}\n\`\`\``;
    }
  }

  /**
   * Webviewからの更新を処理
   */
  async handleWebviewUpdate(data: unknown): Promise<void> {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid update payload');
    }

    const payload = data as DocumentUpdatePayload;
    const fileType = detectFileTypeFromUri(this.document.uri);

    let contentToWrite = '';

    if (fileType === 'markdown') {
      const markdownSource =
        typeof payload.serializedContent === 'string'
          ? payload.serializedContent
          : typeof payload.content === 'string'
            ? payload.content
            : undefined;

      if (typeof markdownSource !== 'string') {
        throw new Error('Markdown payload missing serialized content');
      }

      // 背景: VSCode拡張機能として動作している場合、```tree コードブロック内の内容だけを更新
      // 前提: 元のファイル内容を読み取り、コードブロック外の文字列を保持
      // トレードオフ: コードブロックが見つからない場合は新しく作成する
      const originalContent = this.document.getText();
      contentToWrite = this.updateTreeCodeBlock(originalContent, markdownSource);
    } else {
      if (typeof payload.serializedContent === 'string') {
        contentToWrite = payload.serializedContent;
      } else if (typeof payload.content !== 'undefined') {
        contentToWrite = JSON.stringify(payload.content, null, 2);
      } else {
        throw new Error('JSON payload is empty');
      }
    }

    const success = await this.syncManager.startDocumentUpdate(contentToWrite);

    if (!success) {
      throw new Error('Failed to update document');
    }

    // 成功応答をWebviewに送信
    this.sendUpdateAcknowledgment(payload, fileType, contentToWrite);
  }

  /**
   * 更新確認をWebviewに送信
   */
  private sendUpdateAcknowledgment(
    originalPayload: DocumentUpdatePayload,
    fileType: 'json' | 'markdown',
    contentText: string,
  ): void {
    const responsePayload: DocumentUpdatePayload = {
      fileName: path.basename(this.document.uri.fsPath),
      fileType,
      skipStateUpdate: true, // 状態更新をスキップ（確認応答のため）
    };

    if (fileType === 'markdown') {
      responsePayload.content = contentText;
      responsePayload.serializedContent = contentText;
    } else {
      try {
        const jsonData = JSON.parse(contentText);
        responsePayload.hierarchicalData = jsonData;
        responsePayload.content = jsonData;
        responsePayload.serializedContent = contentText;
      } catch (error) {
        console.error('[DocumentSyncHandler] Failed to parse JSON for acknowledgment:', error);
        return;
      }
    }

    this.panel.webview.postMessage({
      type: 'documentUpdated',
      data: responsePayload,
    });
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    this.syncManager.dispose();
    this.changeSubscription?.dispose();
    this.viewStateSubscription?.dispose();
  }
}
