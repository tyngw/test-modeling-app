// scripts/prepare-webview.js
// Next.jsのビルド結果をVSCode拡張のWebview形式に変換

const fs = require('fs');
const path = require('path');

function prepareWebviewHTML() {
  const htmlPath = path.join(__dirname, '../extension/webview/index.html');

  if (!fs.existsSync(htmlPath)) {
    console.error('❌ index.html が見つかりません');
    process.exit(1);
  }

  let html = fs.readFileSync(htmlPath, 'utf8');

  // 既に処理済みかチェック（冪等性を保つため）
  if (html.includes('window.isVSCodeExtension = true')) {
    console.log('✅ HTMLファイルは既に処理済みです');
    return;
  }

  // VSCode拡張用のスクリプトを追加
  const vscodeScript = `
    <script>
      // VSCode拡張環境であることを示すフラグ
      // 注意: VSCode APIの取得はextension.tsのBootstrapスクリプトで行います
      window.isVSCodeExtension = true;
      
      // VSCode拡張向けのファイル操作API
      // 注意: vscodeオブジェクトはextension.tsのBootstrapスクリプトで設定されます
      window.vscodeFileAPI = {
        saveFile: (data, fileName) => {
          if (window.vscode) {
            window.vscode.postMessage({
              type: 'saveFile',
              data: data,
              fileName: fileName
            });
          }
        },
        
        loadFile: (fileName) => {
          if (window.vscode) {
            window.vscode.postMessage({
              type: 'loadFile',
              fileName: fileName
            });
          }
        },
        
        showError: (message) => {
          if (window.vscode) {
            window.vscode.postMessage({
              type: 'showError',
              message: message
            });
          }
        },
        
        showInfo: (message) => {
          if (window.vscode) {
            window.vscode.postMessage({
              type: 'showInfo',
              message: message
            });
          }
        },

        getCurrentFileName: () => {
          return new Promise((resolve) => {
            if (window.vscode) {
              window.vscode.postMessage({
                type: 'getCurrentFileName'
              });
            }
            // レスポンス待ちの処理は省略（現在のファイル名取得用）
            resolve(null);
          });
        }
      };
      
      // メッセージ受信処理
      window.addEventListener('message', event => {
        const message = event.data;
        switch (message.type) {
          case 'fileLoaded':
            if (window.handleFileLoaded) {
              window.handleFileLoaded(message.data);
            }
            break;
          case 'configLoaded':
            if (window.handleConfigLoaded) {
              window.handleConfigLoaded(message.config);
            }
            break;
        }
      });
      
      // デバッグ用: JavaScriptエラーをVSCodeのコンソールに出力
      window.addEventListener('error', (event) => {
        console.error('🔥 JavaScript Error:', event.error);
        console.error('🔥 Stack:', event.error?.stack);
        console.error('🔥 Source:', event.filename + ':' + event.lineno);
      });
      
      // Promise rejectionも捕捉
      window.addEventListener('unhandledrejection', (event) => {
        console.error('🔥 Unhandled Promise Rejection:', event.reason);
      });
      
      // Reactの準備状況をチェック
      const checkReactReady = () => {
        const nextElement = document.querySelector('#__next');
        const appElement = document.querySelector('.App');
        
        if (window.React || (nextElement && nextElement.children.length > 0) || appElement) {
          console.log('✅ React アプリが読み込まれました');
        } else {
          console.log('⏳ React アプリを待機中...');
          console.log('🔍 DOM状態:', {
            nextElement: !!nextElement,
            appElement: !!appElement,
            bodyChildren: document.body.children.length
          });
          setTimeout(checkReactReady, 2000);
        }
      };
      
      // DOM読み込み完了後にチェック開始
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkReactReady);
      } else {
        checkReactReady();
      }
      
      // リソース読み込み状況を追跡
      let loadedResources = 0;
      let totalResources = 0;
      
      // 全ての script と link タグをカウント
      document.querySelectorAll('script[src], link[href]').forEach((element) => {
        totalResources++;
        
        element.addEventListener('load', () => {
          loadedResources++;
          console.log('📦 Resource loaded: ' + loadedResources + '/' + totalResources);
        });
        
        element.addEventListener('error', (e) => {
          console.error('❌ Resource failed to load:', element.src || element.href);
        });
      });
      
      console.log('📊 Total resources to load: ' + totalResources);
      
      // アプリケーション初期化の完了を待つ
      document.addEventListener('DOMContentLoaded', () => {
        console.log('VSCode拡張環境でのモデリングアプリを初期化');
      });
    </script>
  `;

  // </head>タグの直前にスクリプトを挿入
  html = html.replace('</head>', vscodeScript + '\n</head>');

  // CSPを削除（extension.tsで設定するため）
  html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/gi, '');

  // 背景: VS Code拡張では、静的リソースのパスを実行時に動的に生成する必要がある
  // 前提: ビルド時はNext.jsのデフォルトパス（/_next/）をそのまま残す
  // トレードオフ: extension.tsで実行時に全パスを完全なWebview URIに置き換えることで、
  //              webpackの内部実装に依存せず、堅牢なパス解決を実現
  // 注意: ここでは意図的にパスを書き換えない（extension.tsで処理）

  // VSCodeテーマ変数を追加
  const vscodeStyles = `
    <style>
      :root {
        --vscode-background: var(--vscode-editor-background, #ffffff);
        --vscode-foreground: var(--vscode-editor-foreground, #000000);
      }
      
      body {
        background-color: var(--vscode-background) !important;
        color: var(--vscode-foreground) !important;
      }
      
      /* Next.jsアプリが完全に読み込まれるまでのローディング表示を改善 */
      #__next:empty::before {
        content: "モデリングエディターを読み込み中...";
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        font-size: 18px;
        color: var(--vscode-foreground);
      }
    </style>
  `;

  html = html.replace('</head>', vscodeStyles + '\n</head>');

  fs.writeFileSync(htmlPath, html);
  console.log('✅ Webview HTML が正常に変換されました');
}

/**
 * webpack runtimeのJavaScriptファイル内のハードコードされたパスを動的パスに変換
 * 背景: webpackはJSコード内にr.p="/_next/"のようなハードコードされたパスを持っている
 * 前提: これを実行時に取得できるようにwindow.__webpack_public_path__を参照するコードに変更
 * トレードオフ: ビルド時にファイルを書き換えるが、これが最も確実な方法
 */
function patchWebpackRuntime() {
  const chunksDir = path.join(__dirname, '../extension/webview/_next/static/chunks');

  if (!fs.existsSync(chunksDir)) {
    return;
  }

  // webpack-*.js ファイルを検索
  const files = fs.readdirSync(chunksDir);
  const webpackFiles = files.filter((f) => f.startsWith('webpack-') && f.endsWith('.js'));

  if (webpackFiles.length === 0) {
    return;
  }

  webpackFiles.forEach((filename) => {
    const filePath = path.join(chunksDir, filename);
    let content = fs.readFileSync(filePath, 'utf8');

    // r.p="/_next/" を window.__webpack_public_path__ || "/_next/" に置換
    // これにより、グローバル変数が設定されていればそれを使い、なければデフォルト値を使う
    const originalPattern = /r\.p\s*=\s*"\/(_next\/)"/;
    if (content.match(originalPattern)) {
      content = content.replace(originalPattern, 'r.p=window.__webpack_public_path__||"/$1"');
      fs.writeFileSync(filePath, content);
    }
  });
}

// スクリプト実行
prepareWebviewHTML();
patchWebpackRuntime();
