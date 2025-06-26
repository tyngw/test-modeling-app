#!/bin/bash

# VSCode拡張用のビルドスクリプト
# 既存のWebアプリをビルドし、VSCode拡張の一部として統合

echo "🚀 VSCode拡張用のビルドを開始します..."

# 1. 既存のWebアプリをビルド
echo "📦 Webアプリケーションをビルド中..."
npm run build

# 2. ビルド結果を拡張機能のwebviewディレクトリにコピー
echo "📂 拡張機能用にファイルをコピー中..."
rm -rf extension/webview
mkdir -p extension/webview
cp -r build/* extension/webview/

# 3. VSCode拡張用にHTMLを調整
echo "🔧 VSCode拡張用にHTMLを調整中..."
# index.htmlをVSCode拡張のWebview形式に変換
node scripts/prepare-webview.js

# 4. TypeScript拡張コードをコンパイル
echo "🔨 拡張機能のTypeScriptをコンパイル中..."
cd extension
npm install
npm run compile

echo "✅ VSCode拡張のビルドが完了しました！"
echo "📁 拡張機能は extension/ ディレクトリにあります"
echo "🎯 VSCodeで拡張機能をテストするには: F5キーを押してExtension Development Hostを起動してください"
