#!/bin/bash
set -euo pipefail

# 軽量実行用: Next.jsを本番モードで再ビルドし、VSCode拡張のWebviewと本体を同期します。
# 背景: productionビルド(npm run build:extension)はTypeScriptチェックやESLintを含むため時間がかかる。
#       デバッグでは、静的サイトの再生成と拡張TypeScriptの再コンパイルに絞り、最低限の構文チェックのみ行います。
# トレードオフ: 型検証・Lintは省略されるため、問題検知は別途 `npm run lint` や `npm run build` で実行してください。

echo "⚡️ Start quick VSCode extension sync"

# Next.jsの軽量ビルド。LintとTypeScriptチェックをスキップして高速化します。
# Next.js内部のSWCコンパイルで構文エラーは検出されます。
NEXT_TELEMETRY_DISABLED=1 \
NEXT_DISABLE_ESLINT=1 \
NEXT_SKIP_TYPE_CHECK=1 \
NEXT_DISABLE_SOURCEMAP=1 \
npx next build --no-lint

if [ ! -d build ] || [ -z "$(ls -A build)" ]; then
  echo "❌ build ディレクトリが生成されませんでした。Next.jsのビルドが失敗している可能性があります。"
  exit 1
fi

# 依存関係が未インストールのケースをフォローしつつ余分な再インストールは避けます。
if [ ! -d extension/node_modules ]; then
  echo "ℹ️ extension の依存関係が未インストールのため npm install を実行します。"
  (cd extension && npm install)
fi

echo "📂 extension/webview を更新します..."
rm -rf extension/webview
mkdir -p extension/webview
cp -r build/* extension/webview/

# Webview向けのHTML調整はデバッグ時も必要です。
echo "🔧 Webview HTML を調整します..."
node scripts/prepare-webview.js

# 拡張本体のTypeScriptのみを再コンパイルします。
echo "🔨 VSCode拡張を再コンパイルします..."
(
  cd extension
  npm run compile
)

echo "✅ 簡易ビルドが完了しました。Extension Development Hostで動作確認できます。"
