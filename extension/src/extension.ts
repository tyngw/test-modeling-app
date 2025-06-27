// extension/src/extension.ts
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * VSCode拡張機能のメインエントリーポイント
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Test Modeling App extension が起動しました');

  // Webviewパネル参照を保持
  let currentPanel: vscode.WebviewPanel | undefined = undefined;
  let currentFileName: string | null = null;
  let settingsFilePath: string | null = null;

  // コマンドの登録
  const openModelerCommand = vscode.commands.registerCommand('testModelingApp.openModeler', () => {
    if (currentPanel) {
      // 既存のパネルがある場合は前面に表示
      currentPanel.reveal();
      return;
    }

    // 新しいWebviewパネルを作成
    currentPanel = vscode.window.createWebviewPanel(
      'testModelingApp',
      'Test Modeling App',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview'))],
      },
    );

    // Webviewのコンテンツを設定
    currentPanel.webview.html = getWebviewContent(currentPanel.webview, context);

    // 設定ファイルのパスを設定
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (workspaceFolder) {
      const extensionFolder = path.join(workspaceFolder.uri.fsPath, '.vscode', 'test-modeling-app');
      settingsFilePath = path.join(extensionFolder, 'app-settings.json');
    }

    // Webviewからのメッセージを処理
    currentPanel.webview.onDidReceiveMessage(
      async (message) => {
        await handleWebviewMessage(message);
      },
      undefined,
      context.subscriptions,
    );

    // パネルが閉じられたときの処理
    currentPanel.onDidDispose(() => {
      currentPanel = undefined;
      currentFileName = null;
    });
  });

  context.subscriptions.push(openModelerCommand);

  /**
   * Webviewからのメッセージを処理
   */
  async function handleWebviewMessage(message: {
    type: string;
    data?: unknown;
    fileName?: string;
    config?: unknown;
    message?: string;
  }): Promise<void> {
    switch (message.type) {
      case 'saveFile':
        await handleSaveFile(message.data, message.fileName);
        break;

      case 'loadFile':
        await handleLoadFile(message.fileName);
        break;

      case 'getConfig':
        await handleGetConfig();
        break;

      case 'setConfig':
        await handleSetConfig(message.config);
        break;

      case 'showError':
        if (message.message) {
          vscode.window.showErrorMessage(message.message);
        }
        break;

      case 'showInfo':
        if (message.message) {
          vscode.window.showInformationMessage(message.message);
        }
        break;

      case 'readSettingsFile':
        await handleReadSettingsFile();
        break;

      case 'writeSettingsFile':
        await handleWriteSettingsFile(message.data);
        break;

      case 'getCurrentFileName':
        await handleGetCurrentFileName();
        break;

      default:
        console.error('未知のメッセージタイプ:', message.type);
    }
  }

  /**
   * ファイル保存処理
   */
  async function handleSaveFile(data: unknown, fileName?: string): Promise<void> {
    try {
      // 型ガード
      if (!data || typeof data !== 'object' || !('type' in data) || !('content' in data)) {
        throw new Error('無効なデータ形式です');
      }

      const saveData = data as { type: string; content: unknown };
      let saveFileName = fileName;

      // ファイル保存ダイアログを表示
      const filters: { [name: string]: string[] } = {};
      if (saveData.type === 'elements') {
        filters['JSON Files'] = ['json'];
      } else if (saveData.type === 'svg') {
        filters['SVG Files'] = ['svg'];
      }

      // デフォルトファイル名を生成
      let defaultFileName = fileName || 'modeling-diagram';
      if (saveData.type === 'elements' && !defaultFileName.endsWith('.json')) {
        defaultFileName += '.json';
      } else if (saveData.type === 'svg' && !defaultFileName.endsWith('.svg')) {
        defaultFileName += '.svg';
      }

      // 保存ダイアログを表示
      const saveUri = await vscode.window.showSaveDialog({
        filters,
        defaultUri: vscode.workspace.workspaceFolders?.[0]
          ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, defaultFileName)
          : undefined,
      });

      if (!saveUri) {
        // キャンセルをWebviewに通知
        currentPanel?.webview.postMessage({
          type: 'saveCompleted',
          success: false,
          cancelled: true,
        });
        return;
      }

      saveFileName = path.basename(saveUri.fsPath);

      // ファイル内容を準備
      let content: string;
      if (saveData.type === 'elements') {
        // JSON要素データの場合
        const jsonData = {
          fileName: saveFileName,
          elements: saveData.content,
          version: '0.1.0',
          createdAt: new Date().toISOString(),
        };
        content = JSON.stringify(jsonData, null, 2);
      } else if (saveData.type === 'svg') {
        // SVGデータの場合
        content = saveData.content as string;
      } else {
        throw new Error('サポートされていないファイルタイプです');
      }

      // VSCode APIを使ってファイルシステムに保存
      await vscode.workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf8'));

      // 要素データの場合は現在のファイル名を更新
      if (saveData.type === 'elements') {
        currentFileName = saveFileName;

        // Webviewにファイル名変更を通知
        currentPanel?.webview.postMessage({
          type: 'fileNameChanged',
          fileName: saveFileName,
        });
      }

      // 保存完了をWebviewに通知
      currentPanel?.webview.postMessage({
        type: 'saveCompleted',
        success: true,
        fileName: saveFileName,
      });

      vscode.window.showInformationMessage(`ファイルが保存されました: ${saveFileName}`);
    } catch (error) {
      console.error('ファイル保存エラー:', error);

      // エラーをWebviewに通知
      currentPanel?.webview.postMessage({
        type: 'saveCompleted',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });

      vscode.window.showErrorMessage(`ファイルの保存に失敗しました: ${error}`);
    }
  }

  /**
   * ファイル読み込み処理
   */
  async function handleLoadFile(fileName?: string): Promise<void> {
    try {
      let loadUri: vscode.Uri;

      if (fileName) {
        // ファイル名が指定されている場合
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          throw new Error('ワークスペースフォルダが見つかりません');
        }
        loadUri = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, fileName));
      } else {
        // ファイルダイアログで選択
        const openUris = await vscode.window.showOpenDialog({
          filters: {
            'JSON Files': ['json'],
          },
          canSelectMany: false,
          defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri,
        });

        if (!openUris || openUris.length === 0) {
          return; // ユーザーがキャンセルした場合
        }

        loadUri = openUris[0];
      }

      // ファイルを読み込み
      const content = await fs.promises.readFile(loadUri.fsPath, 'utf8');
      const data = JSON.parse(content);

      // ファイル名を更新
      const loadedFileName = path.basename(loadUri.fsPath);
      currentFileName = loadedFileName;

      // Webviewにデータを送信（アプリ側の期待する形式に合わせる）
      currentPanel?.webview.postMessage({
        type: 'fileLoaded',
        data: {
          fileName: loadedFileName,
          content: data.elements || data, // elementsプロパティがあればそれを、なければ全体を送信
        },
      });

      vscode.window.showInformationMessage(`ファイルが読み込まれました: ${loadedFileName}`);
    } catch (error) {
      console.error('ファイル読み込みエラー:', error);
      vscode.window.showErrorMessage(`ファイルの読み込みに失敗しました: ${error}`);
    }
  }

  /**
   * 設定ファイル読み込み処理
   */
  async function handleReadSettingsFile(): Promise<void> {
    try {
      if (!settingsFilePath) {
        // 設定ファイルが存在しない場合はデフォルト設定を返す
        currentPanel?.webview.postMessage({
          type: 'settingsLoaded',
          data: null,
        });
        return;
      }

      // ディレクトリが存在しない場合は作成
      const settingsDir = path.dirname(settingsFilePath);
      if (!fs.existsSync(settingsDir)) {
        await fs.promises.mkdir(settingsDir, { recursive: true });
      }

      // ファイルが存在しない場合はnullを返す
      if (!fs.existsSync(settingsFilePath)) {
        currentPanel?.webview.postMessage({
          type: 'settingsLoaded',
          data: null,
        });
        return;
      }

      const content = await fs.promises.readFile(settingsFilePath, 'utf8');
      const settings = JSON.parse(content);

      currentPanel?.webview.postMessage({
        type: 'settingsLoaded',
        data: settings,
      });
    } catch (error) {
      console.error('設定ファイル読み込みエラー:', error);
      currentPanel?.webview.postMessage({
        type: 'settingsLoaded',
        data: null,
      });
    }
  }

  /**
   * 設定ファイル書き込み処理
   */
  async function handleWriteSettingsFile(data: unknown): Promise<void> {
    try {
      if (!settingsFilePath) {
        throw new Error('設定ファイルのパスが設定されていません');
      }

      // ディレクトリが存在しない場合は作成
      const settingsDir = path.dirname(settingsFilePath);
      if (!fs.existsSync(settingsDir)) {
        await fs.promises.mkdir(settingsDir, { recursive: true });
      }

      const content = JSON.stringify(data, null, 2);
      await fs.promises.writeFile(settingsFilePath, content, 'utf8');

      currentPanel?.webview.postMessage({
        type: 'settingsWritten',
        success: true,
      });
    } catch (error) {
      console.error('設定ファイル書き込みエラー:', error);
      currentPanel?.webview.postMessage({
        type: 'settingsWritten',
        success: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 現在のファイル名を取得
   */
  async function handleGetCurrentFileName(): Promise<void> {
    currentPanel?.webview.postMessage({
      type: 'currentFileName',
      fileName: currentFileName,
    });
  }

  /**
   * 設定取得処理
   */
  async function handleGetConfig(): Promise<void> {
    try {
      const config = vscode.workspace.getConfiguration('testModelingApp');
      const configData = {
        theme: config.get('theme'),
        autoSave: config.get('autoSave'),
        autoSaveInterval: config.get('autoSaveInterval'),
        defaultFileName: config.get('defaultFileName'),
        canvasBackgroundColor: config.get('canvasBackgroundColor'),
        elementColor: config.get('elementColor'),
      };

      currentPanel?.webview.postMessage({
        type: 'configLoaded',
        config: configData,
      });
    } catch (error) {
      console.error('Get config error:', error);
      vscode.window.showErrorMessage(`設定取得エラー: ${error}`);
    }
  }

  /**
   * 設定更新処理
   */
  async function handleSetConfig(configUpdate: unknown): Promise<void> {
    try {
      if (!configUpdate || typeof configUpdate !== 'object') {
        throw new Error('無効な設定データです');
      }

      const config = vscode.workspace.getConfiguration('testModelingApp');
      for (const [key, value] of Object.entries(configUpdate as Record<string, unknown>)) {
        await config.update(key, value, vscode.ConfigurationTarget.Workspace);
      }
      vscode.window.showInformationMessage('設定を更新しました');
    } catch (error) {
      console.error('Set config error:', error);
      vscode.window.showErrorMessage(`設定更新エラー: ${error}`);
    }
  }
}

/**
 * WebviewのHTMLコンテンツを生成
 */
function getWebviewContent(webview: vscode.Webview, context: vscode.ExtensionContext): string {
  const webviewPath = path.join(context.extensionPath, 'webview');

  // ビルド済みのindex.htmlを読み込み
  const htmlPath = path.join(webviewPath, 'index.html');

  if (!fs.existsSync(htmlPath)) {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Error</title>
</head>
<body>
    <h1>Error: Webview content not found</h1>
    <p>Path: ${htmlPath}</p>
</body>
</html>`;
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  // Webview URIを生成（extensionディレクトリをベースにする）
  const extensionPath = path.dirname(webviewPath); // webviewの親ディレクトリ（extension）
  const webviewBaseUri = webview.asWebviewUri(vscode.Uri.file(extensionPath));

  // デバッグ: 置換前のHTMLの一部を確認
  console.log('🔍 Original HTML snippet:', html.substring(0, 200));
  console.log('🔧 Extension path:', extensionPath);
  console.log('🔧 Webview base URI:', webviewBaseUri.toString());

  // Step 1: プレースホルダーを置換（一度だけ実行するため、既存の置換をチェック）
  const webviewResourceBase = `${webviewBaseUri}/webview`;
  console.log('🎯 Target replacement URI:', webviewResourceBase);

  // プレースホルダーが存在し、かつまだ置換されていない場合のみ置換
  if (html.includes('{{WEBVIEW_CSPURI}}') && !html.includes(webviewResourceBase)) {
    html = html.replace(/{{WEBVIEW_CSPURI}}/g, webviewResourceBase);
    console.log('✅ Placeholder replacement completed');
  } else if (html.includes(webviewResourceBase)) {
    console.log('⚠️ HTML already contains webview URI - skipping replacement');
  } else {
    console.log('❌ No placeholder found in HTML');
  }

  // デバッグ: プレースホルダー置換後
  console.log('📝 After placeholder replacement:', html.substring(0, 300));

  // Step 2: 残りの /_next/ パスを処理（念のため、まだ置換されていない場合のみ）
  if (html.includes('/_next/') && !html.includes(`${webviewResourceBase}/_next/`)) {
    html = html.replace(/\/_next\//g, `${webviewResourceBase}/_next/`);
    html = html.replace(/href="\/_next\//g, `href="${webviewResourceBase}/_next/`);
    html = html.replace(/src="\/_next\//g, `src="${webviewResourceBase}/_next/`);
    console.log('✅ Additional _next/ paths processed');
  }

  // デバッグ情報をログ出力
  console.log('🔧 Webview URI:', webviewBaseUri.toString());
  console.log('📁 Webview path:', webviewPath);
  console.log('📝 HTML length:', html.length);

  // 静的リソースのサンプルファイルが存在するかチェック
  const sampleCssPath = path.join(webviewPath, '_next', 'static', 'css', '1c266b06614faa9a.css');
  console.log('🎨 CSS file exists:', fs.existsSync(sampleCssPath));
  if (fs.existsSync(sampleCssPath)) {
    console.log('🎨 CSS file size:', fs.statSync(sampleCssPath).size, 'bytes');
  }

  // サンプルURIを生成してテスト
  const sampleUri = webview.asWebviewUri(vscode.Uri.file(sampleCssPath));
  console.log('🎨 Sample CSS URI:', sampleUri.toString());

  // HTML置換後の最初の数行をデバッグ出力
  const htmlPreview = html.substring(0, 600);
  console.log('📄 HTML Preview:', htmlPreview);

  // CSPを修正（Next.jsアプリ用）
  const cspContent = [
    `default-src 'none'`,
    `img-src ${webview.cspSource} data: blob:`,
    `script-src ${webview.cspSource} 'unsafe-inline' 'unsafe-eval'`,
    `style-src ${webview.cspSource} 'unsafe-inline'`,
    `font-src ${webview.cspSource}`,
    `connect-src ${webview.cspSource}`,
  ].join('; ');

  // 既存のCSPがあれば置き換え、なければ追加
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

/**
 * 拡張機能の非アクティブ化処理
 */
export function deactivate() {
  console.log('Test Modeling App extension が非アクティブ化されました');
}
