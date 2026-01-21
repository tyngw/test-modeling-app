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
  // webview map initialized

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
    // open file in modeling view
    try {
      let targetUri = uri;

      // URIが指定されていない場合は、アクティブエディタから取得
      if (!targetUri) {
        const activeEditor = vscode.window.activeTextEditor;
        if (!activeEditor) {
          console.error('[Extension] アクティブエディタが見つかりません');
          vscode.window.showErrorMessage('開くファイルが見つかりません');
          return;
        }
        targetUri = activeEditor.document.uri;
        // using active editor URI
      }

      // サポートされているファイル形式かチェック
      const fileExtension = path.extname(targetUri.fsPath).toLowerCase();
      // fileExtension determined
      if (!['.json', '.md', '.markdown'].includes(fileExtension)) {
        console.error('[Extension] サポートされていないファイル形式:', fileExtension);
        vscode.window.showErrorMessage('JSON、Markdownファイルのみサポートされています');
        return;
      }

      const documentKey = targetUri.toString();
      // documentKey set

      // 既に開いているWebviewがあるかチェック
      const existingPair = activeWebviews.get(documentKey);
      if (existingPair) {
        // reveal existing webview
        existingPair.panel.reveal();
        return;
      }

      // ドキュメントを開く
      const document = await vscode.workspace.openTextDocument(targetUri);
      // document opened

      // ファイル内容を読み込み・検証
      let fileData: unknown;
      let fileType: 'json' | 'markdown';
      const initialDocumentContent = document.getText();
      try {
        if (fileExtension === '.md' || fileExtension === '.markdown') {
          fileData = initialDocumentContent;
          fileType = 'markdown';
        } else {
          // parse JSON
          fileData = JSON.parse(initialDocumentContent);
          fileType = 'json';
        }
      } catch (error) {
        console.error('[Extension] ファイル解析エラー:', error);
        console.error('[Extension] 内容のプレビュー:', initialDocumentContent.substring(0, 200));
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
      // syncHandler created

      // ペアを登録
      const pair: WebviewEditorPair = {
        panel,
        document,
        syncHandler,
      };
      activeWebviews.set(documentKey, pair);

      // Webviewコンテンツを設定（エディタ連携モード）
      panel.webview.html = getWebviewContent(panel.webview, context, true);
      // webview content set

      // 初期データ送信用の関数
      // 背景: クロージャで必要な変数をキャプチャ
      const fileName = path.basename(targetUri.fsPath);
      const sendInitialData = () => {
        // send initial data
        panel.webview.postMessage({
          type: 'initializeWithFile',
          data: {
            fileName,
            content: fileData,
            fileType,
            isEditorMode: true,
          },
        });
      };

      // Webviewからのメッセージを処理
      // 背景: Webviewの準備完了を待ってから初期データを送信する必要がある
      // 前提: Reactアプリが初期化され、メッセージハンドラーが設定された後に'ready'メッセージが送られる
      let isInitialized = false;
      panel.webview.onDidReceiveMessage(
        async (message) => {
          // ready メッセージを受け取ったら初期データを送信
          if (message.type === 'ready' && !isInitialized) {
            isInitialized = true;
            sendInitialData();
            return;
          }
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
      // finished opening view
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
  // generate webview content

  const webviewPath = path.join(context.extensionPath, 'webview');
  const htmlPath = path.join(webviewPath, 'index.html');
  // html path

  if (!fs.existsSync(htmlPath)) {
    console.error('[Extension] HTMLファイルが見つかりません:', htmlPath);
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

  // 背景: Next.jsの静的エクスポートでは、全てのパスが/_next/から始まる
  // 前提: HTMLに含まれる相対パスを完全なVS Code Webview URIに置き換える
  // トレードオフ: HTMLが大きくなるが、明示的で分かりやすい
  html = html.replace(/(['"])\/_next\//g, `$1${webviewResourceBase}/_next/`);

  // Bootstrap script を追加（最初の<script>タグの前に挿入）
  // 背景: Webpackのpublic pathを実行時に設定する必要がある
  // 前提: __webpack_public_path__はwebpack起動前に設定する必要があり、どのscriptよりも先に実行される必要がある
  // トレードオフ: グローバル変数を使うが、これがwebpackの標準的な手法
  const environmentScript = `<script>
      // Webpackのpublic pathを設定（webpack起動前に実行される必要がある）
      __webpack_public_path__ = '${webviewResourceBase}/_next/';
      window.isVSCodeExtension = true;
      window.isVSCodeEditorMode = ${isEditorMode};
      
      // VSCode APIを取得してキャッシュ
      (function() {
        try {
          if (typeof acquireVsCodeApi === 'function') {
            const api = acquireVsCodeApi();
            window.vscode = api;
            window.__testModelingAppVscodeApi = api;
            // VSCode API acquired
          }
        } catch (error) {
          console.error('Failed to acquire VSCode API:', error);
        }
      })();
    </script>`;

  // 最初の<script>タグの直前に挿入（webpackが読み込まれる前に実行されるように）
  html = html.replace(/<script/, `${environmentScript}<script`);

  // さらに、webpackランタイムが読み込まれた直後にpublic pathを上書きする
  // 背景: __webpack_public_path__が効かない場合の保険として、__webpack_require__.pを直接上書き
  const webpackOverrideScript = `<script>
    // webpackランタイムが初期化された直後にpublic pathを上書き
    (function() {
      const checkAndOverride = () => {
        // __webpack_require__ (通常は 'r' として難読化されている) を探す
        if (typeof __webpack_require__ !== 'undefined' && __webpack_require__.p) {
          __webpack_require__.p = '${webviewResourceBase}/_next/';
          return true;
        }
        return false;
      };
      
      // 即座に試みる
      if (!checkAndOverride()) {
        // webpackがまだ読み込まれていない場合、少し待ってから再試行
        setTimeout(checkAndOverride, 0);
      }
    })();
  </script>`;

  // webpack-*.jsが読み込まれた直後（</body>の前）に挿入
  html = html.replace('</body>', `${webpackOverrideScript}</body>`);

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

  console.log('[Extension] getWebviewContent: 完了。最終的なHTMLサイズ:', html.length);
  return html;
}

export function deactivate() {
  console.log('[Extension] ===== Test Modeling App extension が非アクティブ化されました =====');
}
