// extension/src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

import { DocumentSyncHandler } from './documentSyncHandler';

/**
 * ファイル保存データの形式
 */
interface SaveFileData {
  type: 'svg' | 'elements' | 'hierarchical' | 'markdown';
  content: unknown;
}

/**
 * ファイル読み込み結果の形式
 */
interface LoadFileResult {
  fileName: string;
  content: unknown;
  fileType?: 'json' | 'markdown';
}

/**
 * Webviewとエディタのペア管理
 */
interface WebviewEditorPair {
  panel: vscode.WebviewPanel;
  document: vscode.TextDocument;
  syncHandler: DocumentSyncHandler;
}

/**
 * VSCode拡張機能のメインエントリーポイント
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Test Modeling App extension が起動しました');

  // アクティブなWebview-エディタペアを管理
  const activeWebviews = new Map<string, WebviewEditorPair>();

  // スタンドアロンモードでWebviewを開くコマンド
  const openModelerCommand = vscode.commands.registerCommand('testModelingApp.openModeler', () => {
    createStandaloneWebview();
  });

  // エディタ連携モードでWebviewを開くコマンド
  const openInModelingViewCommand = vscode.commands.registerCommand(
    'testModelingApp.openInModelingView',
    (uri?: vscode.Uri) => {
      openFileInModelingView(uri);
    },
  );

  context.subscriptions.push(openModelerCommand, openInModelingViewCommand);

  /**
   * スタンドアロンWebviewを作成（従来の動作）
   */
  function createStandaloneWebview() {
    const panel = vscode.window.createWebviewPanel(
      'testModelingApp',
      'Test Modeling App',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview'))],
      },
    );

    panel.webview.html = getWebviewContent(panel.webview, context, false);

    panel.webview.onDidReceiveMessage(
      async (message) => {
        await handleStandaloneWebviewMessage(message, panel);
      },
      undefined,
      context.subscriptions,
    );
  }

  /**
   * ファイルをTest Modeling Viewで開く
   */
  async function openFileInModelingView(uri?: vscode.Uri) {
    try {
      let targetUri = uri;

      // URIが指定されていない場合は、アクティブエディタから取得
      if (!targetUri) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
          vscode.window.showErrorMessage('開くファイルが見つかりません');
          return;
        }
        targetUri = activeEditor.document.uri;
      }

      // サポートされているファイル形式かチェック
      const fileExtension = path.extname(targetUri.fsPath).toLowerCase();
      if (!['.json', '.md', '.markdown'].includes(fileExtension)) {
        vscode.window.showErrorMessage('JSON、Markdownファイルのみサポートされています');
        return;
      }

      const documentKey = targetUri.toString();

      // 既に開いているWebviewがあるかチェック
      const existingPair = activeWebviews.get(documentKey);
      if (existingPair) {
        existingPair.panel.reveal();
        return;
      }

      // ドキュメントを開く
      const document = await vscode.workspace.openTextDocument(targetUri);

      // ファイル内容を読み込み・検証
      let fileData: unknown;
      let fileType: 'json' | 'markdown';
      const initialDocumentContent = document.getText();
      try {
        if (fileExtension === '.md' || fileExtension === '.markdown') {
          fileData = initialDocumentContent;
          fileType = 'markdown';
        } else {
          fileData = JSON.parse(initialDocumentContent);
          fileType = 'json';
        }
      } catch (error) {
        vscode.window.showErrorMessage(`ファイルの解析に失敗しました: ${error}`);
        return;
      }

      // Webviewパネルを作成
      const panel = vscode.window.createWebviewPanel(
        'testModelingAppEditor',
        `Test Modeling - ${path.basename(targetUri.fsPath)}`,
        vscode.ViewColumn.Beside,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
          localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview'))],
        },
      );

      // 同期ハンドラーを作成
      const syncHandler = new DocumentSyncHandler(panel, document);

      // ペアを登録
      const pair: WebviewEditorPair = {
        panel,
        document,
        syncHandler,
      };
      activeWebviews.set(documentKey, pair);

      // Webviewコンテンツを設定（エディタ連携モード）
      panel.webview.html = getWebviewContent(panel.webview, context, true);

      // 初期データをWebviewに送信
      panel.webview.postMessage({
        type: 'initializeWithFile',
        data: {
          fileName: path.basename(targetUri.fsPath),
          content: fileData,
          fileType,
          isEditorMode: true,
        },
      });

      // Webviewからのメッセージを処理
      panel.webview.onDidReceiveMessage(
        async (message) => {
          await handleEditorWebviewMessage(message, pair);
        },
        undefined,
        context.subscriptions,
      );

      // パネルが閉じられたときの処理
      panel.onDidDispose(() => {
        activeWebviews.delete(documentKey);
        pair.syncHandler.dispose();
      });
    } catch (error) {
      console.error('ファイルを開く際にエラーが発生しました:', error);
      vscode.window.showErrorMessage(`ファイルを開けませんでした: ${error}`);
    }
  }

  /**
   * スタンドアロンWebviewからのメッセージを処理
   */
  async function handleStandaloneWebviewMessage(
    message: { type: string; data?: unknown; fileName?: string },
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    if (!message || typeof message.type !== 'string') {
      console.error('[Extension] Invalid message format');
      return;
    }

    try {
      switch (message.type) {
        case 'saveFile':
          await handleSaveFile(message.data as SaveFileData, message.fileName || 'untitled', panel);
          break;
        case 'loadFile':
          await handleLoadFile(message.fileName, panel);
          break;
        default:
          console.warn('[Extension] Unknown standalone message type:', message.type);
      }
    } catch (error) {
      console.error('[Extension] Error handling standalone message:', error);
    }
  }

  /**
   * ファイル保存処理
   */
  async function handleSaveFile(
    data: SaveFileData,
    fileName: string,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    try {
      let content: string;
      let defaultExtension: string;
      let filters: Record<string, string[]>;

      switch (data.type) {
        case 'svg':
          content = String(data.content ?? '');
          defaultExtension = '.svg';
          filters = { 'SVG Files': ['svg'] };
          break;
        case 'markdown':
          content =
            typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2);
          defaultExtension = '.md';
          filters = { 'Markdown Files': ['md', 'markdown'] };
          break;
        case 'hierarchical':
        case 'elements':
        default:
          content = JSON.stringify(data.content, null, 2);
          defaultExtension = '.json';
          filters = { 'JSON Files': ['json'] };
          break;
      }

      let finalFileName = fileName;
      if (!path.extname(finalFileName)) {
        finalFileName += defaultExtension;
      }

      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(finalFileName),
        filters,
      });

      if (!saveUri) {
        panel.webview.postMessage({
          type: 'saveCompleted',
          success: false,
          cancelled: true,
        });
        return;
      }

      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf8'));
      panel.webview.postMessage({
        type: 'saveCompleted',
        success: true,
      });

      vscode.window.showInformationMessage(
        `ファイルを保存しました: ${path.basename(saveUri.fsPath)}`,
      );
    } catch (error) {
      console.error('[Extension] Save file error:', error);
      panel.webview.postMessage({
        type: 'saveCompleted',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * ファイル読み込み処理
   */
  async function handleLoadFile(
    fileName: string | undefined,
    panel: vscode.WebviewPanel,
  ): Promise<void> {
    try {
      const openUri = await vscode.window.showOpenDialog({
        canSelectMany: false,
        filters: {
          'Supported Files': ['json', 'md', 'markdown'],
          'JSON Files': ['json'],
          'Markdown Files': ['md', 'markdown'],
        },
      });

      if (!openUri || !openUri[0]) {
        return;
      }

      const fileUri = openUri[0];
      const fileExtension = path.extname(fileUri.fsPath).toLowerCase();
      const fileContent = await vscode.workspace.fs.readFile(fileUri);
      const contentString = Buffer.from(fileContent).toString('utf8');

      let parsedContent: unknown;
      let fileType: 'json' | 'markdown';

      if (fileExtension === '.md' || fileExtension === '.markdown') {
        parsedContent = contentString;
        fileType = 'markdown';
      } else {
        parsedContent = JSON.parse(contentString);
        fileType = 'json';
      }

      const result: LoadFileResult = {
        fileName: path.basename(fileUri.fsPath),
        content: parsedContent,
        fileType,
      };

      panel.webview.postMessage({
        type: 'fileLoaded',
        data: result,
      });
    } catch (error) {
      console.error('[Extension] Load file error:', error);
      vscode.window.showErrorMessage(
        `ファイルの読み込みに失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * エディタ連携Webviewからのメッセージを処理
   */
  async function handleEditorWebviewMessage(
    message: { type: string; data?: unknown; timestamp?: number },
    pair: WebviewEditorPair,
  ): Promise<void> {
    if (!message || typeof message.type !== 'string') {
      console.error('[Extension] Invalid message format');
      return;
    }

    try {
      switch (message.type) {
        case 'updateDocument':
          await pair.syncHandler.handleWebviewUpdate(message.data);
          break;

        case 'ready':
          console.log('[Extension] Webview is ready');
          break;

        default:
          console.warn('[Extension] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[Extension] Error handling message:', error);

      // エラーをWebviewに通知
      pair.panel.webview.postMessage({
        type: 'updateError',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

/**
 * WebviewのHTMLコンテンツを生成
 */
function getWebviewContent(
  webview: vscode.Webview,
  context: vscode.ExtensionContext,
  isEditorMode: boolean = false,
): string {
  const webviewPath = path.join(context.extensionPath, 'webview');
  const htmlPath = path.join(webviewPath, 'index.html');

  if (!fs.existsSync(htmlPath)) {
    return `<!DOCTYPE html>
<html>
<head><title>Error</title></head>
<body><h1>Error: Webview content not found</h1></body>
</html>`;
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  // HTMLタグにVSCode環境フラグを埋め込む
  const htmlTagRegex = /<html([^>]*)>/i;
  html = html.replace(htmlTagRegex, (match, attrs = '') => {
    let updatedAttrs = attrs;

    if (!/data-vscode-extension=/i.test(updatedAttrs)) {
      updatedAttrs += ' data-vscode-extension="true"';
    }

    const editorModeValue = isEditorMode ? 'true' : 'false';
    if (!/data-vscode-editor-mode=/i.test(updatedAttrs)) {
      updatedAttrs += ` data-vscode-editor-mode="${editorModeValue}"`;
    }

    return `<html${updatedAttrs}>`;
  });

  // Webview URIを生成
  const extensionPath = path.dirname(webviewPath);
  const webviewBaseUri = webview.asWebviewUri(vscode.Uri.file(extensionPath));
  const webviewResourceBase = `${webviewBaseUri}/webview`;

  // プレースホルダーを置換
  html = html.replace(/{{WEBVIEW_CSPURI}}/g, webviewResourceBase);

  // Bootstrap script を追加
  const environmentScript = `
    <script>
      window.isVSCodeExtension = true;
      window.isVSCodeEditorMode = ${isEditorMode};
      
      // VSCode APIを取得してキャッシュ
      (function() {
        try {
          if (typeof acquireVsCodeApi === 'function') {
            const api = acquireVsCodeApi();
            window.vscode = api;
            window.__testModelingAppVscodeApi = api;
            console.log('[Bootstrap] VSCode API acquired');
          }
        } catch (error) {
          console.error('[Bootstrap] Failed to acquire VSCode API:', error);
        }
      })();
    </script>
  `;

  html = html.replace('</head>', `${environmentScript}\n</head>`);

  // CSPを設定
  const cspContent = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} data: blob:`,
    `script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource}`,
    `connect-src ${webview.cspSource}`,
  ].join('; ');

  if (html.includes('Content-Security-Policy')) {
    html = html.replace(
      /content="[^"]*"(?=.*Content-Security-Policy)/gi,
      `content="${cspContent}"`,
    );
  } else {
    html = html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="${cspContent}">`,
    );
  }

  return html;
}

export function deactivate() {
  console.log('Test Modeling App extension が非アクティブ化されました');
}
