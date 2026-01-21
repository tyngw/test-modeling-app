#!/bin/bash
set -euo pipefail

# VSCode拡張のビルドとパッケージング統合スクリプト
# 機能:
#   1. Webアプリケーションとテンプレートアセットをビルド
#   2. VSCode拡張本体をコンパイル
#   3. Webviewを統合
#   4. VSIX形式でパッケージ化

echo "🚀 VSCode拡張のビルドとパッケージングを開始します..."

# 1. Webアプリケーションをビルド
echo "📦 Webアプリケーションをビルド中..."
npm run build

# 2. ビルド結果を拡張機能のwebviewディレクトリにコピー
echo "📂 拡張機能用にファイルをコピー中..."
rm -rf extension/webview
mkdir -p extension/webview
cp -r build/* extension/webview/

# 3. VSCode拡張用にHTMLを調整
echo "🔧 Webview HTMLを調整中..."
node scripts/prepare-webview.js

# 4. 拡張機能ディレクトリで依存関係をインストール
echo "📥 拡張機能の依存関係をインストール中..."
(
  cd extension
  npm install
)

# 5. TypeScript拡張コードをコンパイル
echo "🔨 拡張機能のTypeScriptをコンパイル中..."
(
  cd extension
  npm run compile
)

# 6. VSIX形式でパッケージ化（vseが必要）
echo "📦 VSIX形式にパッケージ化中..."
(
  cd extension
  
  # vsceがローカルにない場合はインストール
  if ! command -v vsce &> /dev/null; then
    echo "ℹ️ vsce がインストールされていないため、npm で一時インストールします..."
    npx vsce package --out ../test-modeling-app.vsix
  else
    vsce package --out ../test-modeling-app.vsix
  fi
)

echo "✅ ビルドとパッケージングが完了しました！"
echo "📁 VSIX ファイル: test-modeling-app.vsix"
echo "🎯 インストール方法:"
echo "   - VS Code で: Ctrl+Shift+P (Cmd+Shift+P on Mac) → 'Extensions: Install from VSIX'"
echo "   - または: code --install-extension test-modeling-app.vsix"
