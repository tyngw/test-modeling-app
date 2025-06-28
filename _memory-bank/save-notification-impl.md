# メモリバンク: VSCode拡張・Webアプリの保存通知仕様の実装履歴

## 目的
- ファイル保存時のユーザー通知を「Webアプリでは非表示」「VSCode拡張ではVSCode通知APIでのみ表示」に統一し、UXを最適化する。

## 実装内容

### 1. 保存完了トーストの分岐表示
- `src/hooks/useFileOperations.tsx` の `handleSaveSvg` および `handleSaveElements` 内で、保存完了時の通知処理を分岐。
  - **Webアプリ**: 保存完了時のトースト（addToast）は一切表示しない。
  - **VSCode拡張**: `window.vscodeFileAPI.showInfo` を通じてVSCodeの通知APIで保存完了メッセージを表示。
- 型エラー回避のため、`window as typeof window & { vscodeFileAPI?: { showInfo?: (msg: string) => void } }` で型アサーションを追加。

### 2. VSCode拡張APIの設計
- `extension/webview/index.html` で `window.vscodeFileAPI.showInfo` を定義し、`vscode.postMessage({ type: 'showInfo', message })` を送信。
- `extension/src/extension.ts` で `showInfo` メッセージを受信し、`vscode.window.showInformationMessage` で通知を表示。

### 3. 既存のaddToast呼び出しの整理
- 保存成功時のaddToast呼び出しはWeb/VSCodeともに削除し、エラー時のみaddToastで通知。
- これによりWebアプリでは保存時に静かに完了、VSCode拡張では保存完了が明示的に分かるUXを実現。

### 4. その他
- 既存のファイル操作抽象化（fileOperationAdapter）はそのまま利用。
- 既存の型安全性・エラーハンドリングも維持。

### 5. 【失敗の記録】fsモジュールによる保存の試行
- 過去にVSCode拡張のWebView側やフロントエンドから直接`fs`モジュールを使って保存しようとしたが、
  - WebViewやブラウザ環境ではNode.jsの`fs`は利用できず、エラーとなった。
  - VSCode拡張の保存処理は必ず`vscode.postMessage`で拡張本体に委譲し、拡張本体（extension.ts）で`fs`を使う必要がある。
- この失敗を経て、WebView→拡張本体→ファイル保存という責務分離の設計に統一。

### 6. ビルド統合の実現
- `package.json` に `build:all` スクリプトを追加し、WebAppと拡張機能を一括ビルドできるよう改善。
- `npm run build:all` コマンド一つで、Webアプリビルド → 拡張機能ビルド → WebView準備が完了。
- これにより開発効率が大幅に向上し、毎回別々にコマンドを実行する手間を解消。

---

## 今後の運用・注意点
- 通知仕様の変更や追加が必要な場合は、この分岐ロジックを一元管理すること。
- VSCode拡張APIのインターフェースが変わった場合は、window.vscodeFileAPIの型定義も更新すること。
- エラー時の通知は引き続きaddToastで行い、ユーザーの気づきを担保する。
- VSCode拡張のファイル保存は必ず拡張本体で行い、WebViewやフロントエンドから直接`fs`を使わないこと。
- ビルド時は `npm run build:all` を使用し、一括でWebApp・拡張機能両方をビルドすること。

---

（最終更新: 2025-06-28）
