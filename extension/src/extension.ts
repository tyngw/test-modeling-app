// extension/src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Webviewパネルとエディタの対応関係を管理
 * markdown-table-editor方式: シンプルな構造
 */
interface WebviewEditorPair {
  panel: vscode.WebviewPanel;
  document: vscode.TextDocument;
  isUpdatingFromWebview: boolean; // Webviewからの更新中フラグ
  lastUpdateTimestamp: number;
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

    // スタンドアロンモードではメッセージ処理は不要（Webview内で完結）
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

      // JSONファイルかチェック
      if (path.extname(targetUri.fsPath) !== '.json') {
        vscode.window.showErrorMessage('JSONファイルのみサポートされています');
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
      let fileData;
      try {
        fileData = JSON.parse(document.getText());
      } catch (error) {
        vscode.window.showErrorMessage(`JSONファイルの解析に失敗しました: ${error}`);
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

      // ペアを登録
      const pair: WebviewEditorPair = {
        panel,
        document,
        isUpdatingFromWebview: false,
        lastUpdateTimestamp: Date.now(),
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

      // ドキュメント変更の監視（editor → webview の同期）
      const fileName = path.basename(targetUri.fsPath); // クロージャ外で取得
      const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
        // このドキュメントの変更かチェック
        if (e.document.uri.toString() !== documentKey) {
          return;
        }

        // Webviewからの更新による変更はスキップ
        if (pair.isUpdatingFromWebview) {
          console.log('[Extension] Skipping document change (from webview)');
          return;
        }

        // 最近更新されたばかりの場合はスキップ（デバウンス）
        const timeSinceLastUpdate = Date.now() - pair.lastUpdateTimestamp;
        if (timeSinceLastUpdate < 100) {
          console.log('[Extension] Skipping document change (too soon)');
          return;
        }

        console.log('[Extension] Document changed, syncing to webview');

        try {
          // 変更内容をパース
          const newContent = e.document.getText();
          const data = JSON.parse(newContent);

          // Webviewに送信
          panel.webview.postMessage({
            type: 'documentUpdated',
            data: {
              fileName: fileName,
              content: data,
              timestamp: Date.now(),
            },
          });

          console.log('[Extension] ✅ Document synced to webview');
        } catch (error) {
          console.error('[Extension] Failed to sync document to webview:', error);
        }
      });

      // パネルが閉じられたときの処理
      panel.onDidDispose(() => {
        activeWebviews.delete(documentKey);
        changeDocumentSubscription.dispose();
      });
    } catch (error) {
      console.error('ファイルを開く際にエラーが発生しました:', error);
      vscode.window.showErrorMessage(`ファイルを開けませんでした: ${error}`);
    }
  }

  /**
   * エディタ連携Webviewからのメッセージを処理
   */
  async function handleEditorWebviewMessage(
    message: { type: string; data?: unknown; timestamp?: number },
    pair: WebviewEditorPair,
  ): Promise<void> {
    console.log('[Extension] ========================================');
    console.log('[Extension] Message received from webview');
    console.log('[Extension] Message type:', message?.type);
    console.log('[Extension] Has data:', !!message?.data);
    console.log('[Extension] ========================================');

    if (!message || typeof message.type !== 'string') {
      console.error('[Extension] Invalid message format');
      return;
    }

    try {
      switch (message.type) {
        case 'updateDocument':
          console.log('[Extension] Processing updateDocument');
          await handleUpdateDocument(message.data, pair);
          break;

        case 'ready':
          console.log('[Extension] Webview is ready');
          break;

        default:
          console.warn('[Extension] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[Extension] Error handling message:', error);
    }
  }

  /**
   * Webviewからの変更をエディタに反映
   * markdown-table-editor方式: 更新後に最新データを送り返す
   */
  async function handleUpdateDocument(data: unknown, pair: WebviewEditorPair): Promise<void> {
    console.log('[Extension] ----------------------------------------');
    console.log('[Extension] handleUpdateDocument START');
    console.log('[Extension] Has data:', !!data);
    console.log('[Extension] isUpdatingFromWebview:', pair.isUpdatingFromWebview);

    try {
      if (!data) {
        console.error('[Extension] No data provided');
        return;
      }

      // 循環更新を防止
      if (pair.isUpdatingFromWebview) {
        console.log('[Extension] Already updating, skipping');
        return;
      }

      // 現在のドキュメント内容と比較
      const currentContent = pair.document.getText();
      const newContent = JSON.stringify(data, null, 2);

      console.log('[Extension] Current content length:', currentContent.length);
      console.log('[Extension] New content length:', newContent.length);

      // 内容が同じ場合はスキップ
      if (currentContent === newContent) {
        console.log('[Extension] Content unchanged, skipping');
        return;
      }

      console.log('[Extension] Content differs, proceeding with update');

      // フラグを設定
      pair.isUpdatingFromWebview = true;
      pair.lastUpdateTimestamp = Date.now();

      // エディタのテキストを更新
      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        pair.document.positionAt(0),
        pair.document.positionAt(currentContent.length),
      );
      edit.replace(pair.document.uri, fullRange, newContent);

      console.log('[Extension] Applying edit...');
      const success = await vscode.workspace.applyEdit(edit);
      console.log('[Extension] Apply edit result:', success);

      if (success) {
        console.log('[Extension] Document updated successfully');
        await pair.document.save();
        console.log('[Extension] Document saved');

        // markdown-table-editor方式: 更新後に最新データをWebviewに送り返す
        const updatedData = JSON.parse(newContent);
        const responseMessage = {
          type: 'documentUpdated',
          data: {
            fileName: path.basename(pair.document.uri.fsPath),
            content: updatedData,
            timestamp: Date.now(),
          },
        };

        console.log('[Extension] Sending documentUpdated message to webview');
        console.log('[Extension] Response message type:', responseMessage.type);
        pair.panel.webview.postMessage(responseMessage);
        console.log('[Extension] ✅ Message sent to webview');
      } else {
        console.error('[Extension] ❌ Failed to apply edit');
      }
    } catch (error) {
      console.error('[Extension] ❌ Error in handleUpdateDocument:', error);
      console.error('[Extension] Error stack:', error instanceof Error ? error.stack : 'N/A');
    } finally {
      // フラグをリセット
      pair.isUpdatingFromWebview = false;
      console.log('[Extension] Flags reset');
      console.log('[Extension] handleUpdateDocument END');
      console.log('[Extension] ----------------------------------------');
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
