import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

/**
 * VSCode拡張のメインエントリーポイント
 * 既存のWebアプリをVSCode拡張として動作させる
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Test Modeling App extension is now active!');

  // モデリングエディターを開くコマンドを登録
  const openEditorCommand = vscode.commands.registerCommand('testModelingApp.openEditor', () => {
    openModelingEditor(context);
  });

  context.subscriptions.push(openEditorCommand);

  // ファイル保存の監視（自動保存機能用）
  const saveWatcher = vscode.workspace.onDidSaveTextDocument((document) => {
    if (document.fileName.endsWith('.modeling.json')) {
      console.log('Modeling file saved:', document.fileName);
    }
  });

  context.subscriptions.push(saveWatcher);
}

/**
 * モデリングエディターのWebviewを作成・表示
 */
function openModelingEditor(context: vscode.ExtensionContext) {
  // Webviewパネルを作成
  const panel = vscode.window.createWebviewPanel(
    'testModelingApp',
    'Modeling Editor',
    vscode.ViewColumn.One,
    {
      // Webviewでスクリプトの実行を許可
      enableScripts: true,
      // ローカルリソースへのアクセスを許可
      localResourceRoots: [vscode.Uri.file(path.join(context.extensionPath, 'webview'))],
      // パネルが非表示になってもWebviewの状態を保持
      retainContextWhenHidden: true,
    },
  );

  // Webviewのコンテンツを設定
  panel.webview.html = getWebviewContent(panel.webview, context);

  // Webviewからのメッセージを処理
  panel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.type) {
        case 'saveFile':
          await handleSaveFile(message.data);
          break;
        case 'loadFile':
          await handleLoadFile(message.fileName, panel.webview);
          break;
        case 'getConfig':
          await handleGetConfig(panel.webview);
          break;
        case 'setConfig':
          await handleSetConfig(message.config);
          break;
        case 'showError':
          vscode.window.showErrorMessage(message.message);
          break;
        case 'showInfo':
          vscode.window.showInformationMessage(message.message);
          break;
      }
    },
    undefined,
    context.subscriptions,
  );

  // パネルが破棄された時の処理
  panel.onDidDispose(
    () => {
      console.log('Modeling editor panel disposed');
    },
    null,
    context.subscriptions,
  );
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
 * ファイル保存処理
 */
async function handleSaveFile(data: any): Promise<void> {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('ワークスペースフォルダが見つかりません');
      return;
    }

    // ファイル名の入力を求める
    const fileName = await vscode.window.showInputBox({
      prompt: 'ファイル名を入力してください',
      value: 'modeling-diagram.json',
      validateInput: (input) => {
        if (!input.trim()) {
          return 'ファイル名は必須です';
        }
        if (!input.endsWith('.json')) {
          return 'ファイル拡張子は.jsonである必要があります';
        }
        return null;
      },
    });

    if (!fileName) {
      return;
    }

    // ファイルパスを構築
    const filePath = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, fileName));

    // JSONデータを文字列に変換
    const jsonContent = JSON.stringify(data, null, 2);
    const uint8Array = Buffer.from(jsonContent, 'utf8');

    // ファイルに書き込み
    await vscode.workspace.fs.writeFile(filePath, uint8Array);
    vscode.window.showInformationMessage(`ファイルを保存しました: ${fileName}`);
  } catch (error) {
    console.error('Save file error:', error);
    vscode.window.showErrorMessage(`ファイル保存エラー: ${error}`);
  }
}

/**
 * ファイル読み込み処理
 */
async function handleLoadFile(fileName: string, webview: vscode.Webview): Promise<void> {
  try {
    let filePath: vscode.Uri;

    if (fileName) {
      // 指定されたファイル名のファイルを読み込み
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (!workspaceFolder) {
        vscode.window.showErrorMessage('ワークスペースフォルダが見つかりません');
        return;
      }
      filePath = vscode.Uri.file(path.join(workspaceFolder.uri.fsPath, fileName));
    } else {
      // ファイル選択ダイアログを表示
      const selectedFiles = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        filters: {
          'JSON Files': ['json'],
        },
      });

      if (!selectedFiles || selectedFiles.length === 0) {
        return;
      }

      filePath = selectedFiles[0];
    }

    // ファイルを読み込み
    const fileContent = await vscode.workspace.fs.readFile(filePath);
    const jsonContent = Buffer.from(fileContent).toString('utf8');
    const data = JSON.parse(jsonContent);

    // Webviewにファイルデータを送信
    webview.postMessage({
      type: 'fileLoaded',
      data: data,
      fileName: path.basename(filePath.fsPath),
    });

    vscode.window.showInformationMessage(
      `ファイルを読み込みました: ${path.basename(filePath.fsPath)}`,
    );
  } catch (error) {
    console.error('Load file error:', error);
    vscode.window.showErrorMessage(`ファイル読み込みエラー: ${error}`);
  }
}

/**
 * 設定取得処理
 */
async function handleGetConfig(webview: vscode.Webview): Promise<void> {
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

    webview.postMessage({
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
async function handleSetConfig(configUpdate: any): Promise<void> {
  try {
    const config = vscode.workspace.getConfiguration('testModelingApp');

    for (const [key, value] of Object.entries(configUpdate)) {
      await config.update(key, value, vscode.ConfigurationTarget.Workspace);
    }

    vscode.window.showInformationMessage('設定を更新しました');
  } catch (error) {
    console.error('Set config error:', error);
    vscode.window.showErrorMessage(`設定更新エラー: ${error}`);
  }
}

/**
 * 拡張機能の非アクティブ化時の処理
 */
export function deactivate() {
  console.log('Test Modeling App extension is now deactivated');
}
