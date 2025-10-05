// extension/src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Webviewパネルとエディタの対応関係を管理
 * markdown-table-editor方式: シンプルな構造
 */
interface DocumentUpdatePayload {
  fileName?: string;
  hierarchicalData?: unknown;
  serializedContent?: string;
  fileType?: 'json' | 'yaml';
  content?: unknown;
  skipStateUpdate?: boolean;
}

interface SaveFileData {
  type: 'svg' | 'elements' | 'hierarchical' | 'yaml';
  content: unknown;
}

interface LoadFileResult {
  fileName: string;
  content: unknown;
  fileType?: 'json' | 'yaml';
}

interface WebviewEditorPair {
  panel: vscode.WebviewPanel;
  document: vscode.TextDocument;
  isUpdatingFromWebview: boolean; // Webviewからの更新中フラグ
  lastUpdateTimestamp: number;
  pendingDocumentUpdate: DocumentUpdatePayload | null;
  lastSyncedContent: string;
}

const YAML_EXTENSIONS = new Set(['.yaml', '.yml']);

const normalizeLineEndings = (text: string): string => text.replace(/\r\n|\r|\n/g, '\n');

const detectFileTypeFromUri = (uri: vscode.Uri): 'json' | 'yaml' => {
  const extension = path.extname(uri.fsPath).toLowerCase();
  return YAML_EXTENSIONS.has(extension) ? 'yaml' : 'json';
};

const normalizeContentForDocument = (content: string, document: vscode.TextDocument): string => {
  const normalized = normalizeLineEndings(content);
  if (document.eol === vscode.EndOfLine.LF) {
    return normalized;
  }
  return normalized.replace(/\n/g, '\r\n');
};

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
      if (!['.json', '.yaml', '.yml'].includes(fileExtension)) {
        vscode.window.showErrorMessage('JSON、YAMLファイルのみサポートされています');
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
      let fileType: 'json' | 'yaml';
      const initialDocumentContent = document.getText();
      try {
        if (fileExtension === '.yaml' || fileExtension === '.yml') {
          fileData = initialDocumentContent;
          fileType = 'yaml';
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

      // ペアを登録
      const pair: WebviewEditorPair = {
        panel,
        document,
        isUpdatingFromWebview: false,
        lastUpdateTimestamp: Date.now(),
        pendingDocumentUpdate: null,
        lastSyncedContent: normalizeLineEndings(initialDocumentContent),
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

      const flushPendingDocumentUpdate = () => {
        if (!pair.pendingDocumentUpdate) {
          return;
        }

        if (!pair.panel.active) {
          return;
        }

        pair.panel.webview.postMessage({
          type: 'documentUpdated',
          data: pair.pendingDocumentUpdate,
        });

        pair.pendingDocumentUpdate = null;
        pair.lastUpdateTimestamp = Date.now();
      };

      const queueDocumentUpdate = (payload: DocumentUpdatePayload) => {
        pair.pendingDocumentUpdate = payload;
        if (pair.panel.active) {
          flushPendingDocumentUpdate();
        }
      };

      const viewStateSubscription = panel.onDidChangeViewState((event) => {
        if (event.webviewPanel.active) {
          flushPendingDocumentUpdate();
        }
      });

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
          const documentFileType = detectFileTypeFromUri(e.document.uri);
          const normalizedNewContent = normalizeLineEndings(newContent);

          if (normalizedNewContent === pair.lastSyncedContent) {
            console.log('[Extension] Skipping document change (no diff from last synced)');
            return;
          }

          if (documentFileType === 'yaml') {
            queueDocumentUpdate({
              fileName,
              content: newContent,
              serializedContent: newContent,
              fileType: 'yaml',
            });
            pair.lastSyncedContent = normalizedNewContent;
          } else {
            const data = JSON.parse(newContent);
            queueDocumentUpdate({
              fileName,
              content: data,
              fileType: 'json',
            });
            pair.lastSyncedContent = normalizedNewContent;
          }

          if (!pair.pendingDocumentUpdate) {
            console.log('[Extension] ✅ Document synced to webview');
          }
        } catch (error) {
          console.error('[Extension] Failed to sync document to webview:', error);
        }
      });

      // パネルが閉じられたときの処理
      panel.onDidDispose(() => {
        activeWebviews.delete(documentKey);
        changeDocumentSubscription.dispose();
        viewStateSubscription.dispose();
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
        case 'yaml':
          content =
            typeof data.content === 'string' ? data.content : JSON.stringify(data.content, null, 2);
          defaultExtension = '.yaml';
          filters = { 'YAML Files': ['yaml', 'yml'] };
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
          'Supported Files': ['json', 'yaml', 'yml'],
          'JSON Files': ['json'],
          'YAML Files': ['yaml', 'yml'],
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
      let fileType: 'json' | 'yaml';

      if (fileExtension === '.yaml' || fileExtension === '.yml') {
        parsedContent = contentString;
        fileType = 'yaml';
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

    const notifyUpdateError = (message: string) => {
      console.error('[Extension] ❌', message);
      void pair.panel.webview.postMessage({
        type: 'updateError',
        message,
      });
    };

    try {
      if (!data || typeof data !== 'object') {
        console.error('[Extension] Invalid update payload');
        return;
      }

      const payload = data as DocumentUpdatePayload;
      const fileType = detectFileTypeFromUri(pair.document.uri);

      const sendAcknowledgeToWebview = (options: {
        contentText?: string;
        jsonData?: unknown;
        logMessage?: string;
        skipStateUpdate?: boolean;
      }) => {
        const responsePayload: DocumentUpdatePayload = {
          fileName: path.basename(pair.document.uri.fsPath),
          fileType,
          skipStateUpdate: Boolean(options.skipStateUpdate),
        };

        if (!responsePayload.skipStateUpdate) {
          if (fileType === 'yaml') {
            responsePayload.content = options.contentText;
            responsePayload.serializedContent = options.contentText;
          } else {
            const jsonPayload =
              typeof options.jsonData !== 'undefined'
                ? options.jsonData
                : (payload.hierarchicalData ?? payload.content);

            responsePayload.hierarchicalData = jsonPayload;
            responsePayload.content = jsonPayload;
            responsePayload.serializedContent = options.contentText;
          }
        }

        pair.pendingDocumentUpdate = null;
        pair.lastUpdateTimestamp = Date.now();
        if (typeof options.contentText === 'string') {
          pair.lastSyncedContent = options.contentText;
        }
        console.log(options.logMessage ?? '[Extension] ✅ Message sent to webview');
        void pair.panel.webview.postMessage({
          type: 'documentUpdated',
          data: responsePayload,
        });
      };

      // 循環更新を防止
      if (pair.isUpdatingFromWebview) {
        console.log('[Extension] Already updating, skipping');
        return;
      }

      const currentContentRaw = pair.document.getText();
      const currentContentNormalized = normalizeLineEndings(currentContentRaw);

      let incomingContentNormalized = '';
      let jsonContentForResponse: unknown = payload.hierarchicalData ?? payload.content;

      if (fileType === 'yaml') {
        const yamlSource =
          typeof payload.serializedContent === 'string'
            ? payload.serializedContent
            : typeof payload.content === 'string'
              ? payload.content
              : undefined;

        if (typeof yamlSource !== 'string') {
          notifyUpdateError('YAML payload missing serialized content');
          return;
        }

        incomingContentNormalized = normalizeLineEndings(yamlSource);
      } else {
        if (typeof payload.serializedContent === 'string') {
          incomingContentNormalized = normalizeLineEndings(payload.serializedContent);

          if (typeof jsonContentForResponse === 'undefined') {
            try {
              jsonContentForResponse = JSON.parse(incomingContentNormalized);
            } catch (error) {
              notifyUpdateError(`Failed to parse JSON payload: ${error}`);
              return;
            }
          }
        } else if (typeof jsonContentForResponse !== 'undefined') {
          try {
            incomingContentNormalized = normalizeLineEndings(
              JSON.stringify(jsonContentForResponse, null, 2),
            );
          } catch (error) {
            notifyUpdateError(`Failed to serialize JSON payload: ${error}`);
            return;
          }
        } else {
          notifyUpdateError('JSON payload is empty');
          return;
        }
      }

      if (fileType === 'json' && typeof jsonContentForResponse === 'undefined') {
        try {
          jsonContentForResponse = JSON.parse(incomingContentNormalized);
        } catch (error) {
          notifyUpdateError(`Failed to parse JSON payload: ${error}`);
          return;
        }
      }

      console.log('[Extension] Current content length:', currentContentNormalized.length);
      console.log('[Extension] New content length:', incomingContentNormalized.length);

      if (currentContentNormalized === incomingContentNormalized) {
        sendAcknowledgeToWebview({
          contentText: incomingContentNormalized,
          jsonData: jsonContentForResponse,
          logMessage: '[Extension] Content unchanged, acknowledged webview update',
          skipStateUpdate: true,
        });
        return;
      }

      console.log('[Extension] Content differs, proceeding with update');

      pair.isUpdatingFromWebview = true;
      pair.lastUpdateTimestamp = Date.now();

      const editContent = normalizeContentForDocument(incomingContentNormalized, pair.document);

      const edit = new vscode.WorkspaceEdit();
      const fullRange = new vscode.Range(
        pair.document.positionAt(0),
        pair.document.positionAt(currentContentRaw.length),
      );
      edit.replace(pair.document.uri, fullRange, editContent);

      console.log('[Extension] Applying edit...');
      const success = await vscode.workspace.applyEdit(edit);
      console.log('[Extension] Apply edit result:', success);

      if (success) {
        console.log('[Extension] Document updated successfully');
        await pair.document.save();
        console.log('[Extension] Document saved');

        sendAcknowledgeToWebview({
          contentText: normalizeLineEndings(editContent),
          jsonData: jsonContentForResponse,
          skipStateUpdate: true,
        });
      } else {
        notifyUpdateError('Failed to apply workspace edit');
      }
    } catch (error) {
      console.error('[Extension] ❌ Error in handleUpdateDocument:', error);
      console.error('[Extension] Error stack:', error instanceof Error ? error.stack : 'N/A');
      notifyUpdateError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
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
