// extension/src/syncManager.ts
import * as vscode from 'vscode';

/**
 * 同期状態を管理するクラス
 * エディタとWebview間の双方向同期を効率的に処理
 */
export class SyncManager {
  private isUpdatingFromWebview = false;
  private lastUpdateTimestamp = 0;
  private lastSyncedContentHash = '';
  private pendingUpdate: unknown = null;
  private debounceTimer: NodeJS.Timeout | null = null;

  private readonly DEBOUNCE_DELAY = 150; // デバウンス遅延（ms）
  private readonly MIN_UPDATE_INTERVAL = 50; // 最小更新間隔（ms）

  constructor(
    private readonly panel: vscode.WebviewPanel,
    private readonly document: vscode.TextDocument,
  ) {
    console.log('[SyncManager] 初期化開始');
    const initialContent = document.getText();
    console.log('[SyncManager] - 初期コンテンツ長:', initialContent.length);
    this.lastSyncedContentHash = this.computeContentHash(initialContent);
    console.log('[SyncManager] - 初期ハッシュ:', this.lastSyncedContentHash);
    console.log('[SyncManager] 初期化完了');
  }

  /**
   * 内容のハッシュ値を計算（簡易版）
   * 改行コードを正規化してからハッシュ化
   */
  private computeContentHash(content: string): string {
    const normalized = this.normalizeLineEndings(content);
    // 簡易ハッシュ関数（本格的な実装ではcrypto.createHashを使用）
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // 32bit整数に変換
    }
    return hash.toString(36);
  }

  /**
   * 改行コードを正規化
   */
  private normalizeLineEndings(text: string): string {
    return text.replace(/\r\n|\r|\n/g, '\n');
  }

  /**
   * エディタの改行設定に合わせて内容を正規化
   */
  private normalizeContentForDocument(content: string): string {
    const normalized = this.normalizeLineEndings(content);
    if (this.document.eol === vscode.EndOfLine.LF) {
      return normalized;
    }
    return normalized.replace(/\n/g, '\r\n');
  }

  /**
   * Webviewからの更新かどうかをチェック
   */
  isWebviewUpdate(): boolean {
    return this.isUpdatingFromWebview;
  }

  /**
   * 最近更新されたかどうかをチェック（デバウンス）
   */
  isRecentlyUpdated(): boolean {
    const timeSinceLastUpdate = Date.now() - this.lastUpdateTimestamp;
    return timeSinceLastUpdate < this.MIN_UPDATE_INTERVAL;
  }

  /**
   * 内容に差分があるかチェック
   */
  hasContentChanged(newContent: string): boolean {
    const newHash = this.computeContentHash(newContent);
    return newHash !== this.lastSyncedContentHash;
  }

  /**
   * エディタからWebviewへの更新をデバウンス付きで処理
   */
  scheduleWebviewUpdate(updateData: unknown): void {
    // 既存のタイマーをクリア
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // 新しいタイマーを設定
    this.debounceTimer = setTimeout(() => {
      this.sendToWebview(updateData);
      this.debounceTimer = null;
    }, this.DEBOUNCE_DELAY);
  }

  /**
   * Webviewに更新を送信
   */
  private sendToWebview(updateData: unknown): void {
    if (this.panel.active) {
      this.panel.webview.postMessage({
        type: 'documentUpdated',
        data: updateData,
      });
      this.lastUpdateTimestamp = Date.now();
    } else {
      // 非アクティブな場合は保留
      this.pendingUpdate = updateData;
    }
  }

  /**
   * 保留中の更新を送信（パネルがアクティブになった時）
   */
  flushPendingUpdate(): void {
    if (this.pendingUpdate && this.panel.active) {
      this.sendToWebview(this.pendingUpdate);
      this.pendingUpdate = null;
    }
  }

  /**
   * Webviewからエディタへの更新を開始
   */
  async startDocumentUpdate(newContent: string): Promise<boolean> {
    console.log('[SyncManager] ドキュメント更新を開始');
    console.log('[SyncManager] - 新しいコンテンツ長:', newContent.length);
    if (this.isUpdatingFromWebview) {
      console.warn('[SyncManager] Update already in progress, skipping');
      return false;
    }

    if (!this.hasContentChanged(newContent)) {
      console.log('[SyncManager] No content changes detected');
      return true; // 成功として扱う（差分なし）
    }

    try {
      console.log('[SyncManager] 更新フラグを設定');
      this.isUpdatingFromWebview = true;

      const editContent = this.normalizeContentForDocument(newContent);
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        this.document.positionAt(0),
        this.document.positionAt(this.document.getText().length),
      );

      edit.replace(this.document.uri, fullRange, editContent);
      console.log('[SyncManager] ワークスペース編集を適用中...');
      const success = await vscode.workspace.applyEdit(edit);

      if (success) {
        console.log('[SyncManager] ワークスペース編集の適用に成功');
        console.log('[SyncManager] ドキュメントを保存中...');
        await this.document.save();
        console.log('[SyncManager] ドキュメントを保存しました');
        this.updateSyncedContent(newContent);
        console.log('[SyncManager] Document updated successfully');
        return true;
      } else {
        console.error('[SyncManager] Failed to apply workspace edit');
        return false;
      }
    } catch (error) {
      console.error('[SyncManager] Error updating document:', error);
      if (error instanceof Error) {
        console.error('[SyncManager] Error stack:', error.stack);
      }
      return false;
    } finally {
      console.log('[SyncManager] 更新フラグをクリア');
      this.isUpdatingFromWebview = false;
    }
  }

  /**
   * 同期済み内容を更新
   */
  updateSyncedContent(content: string): void {
    this.lastSyncedContentHash = this.computeContentHash(content);
    this.lastUpdateTimestamp = Date.now();
  }

  /**
   * リソースをクリーンアップ
   */
  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}
