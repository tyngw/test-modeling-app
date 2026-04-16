# DEVELOPMENT

開発時によく使用するnpmコマンドと、配布・リリース作業で使用するコマンドを整理しました。各コマンドはルートディレクトリで実行してください。

## 開発フェーズで使用するコマンド

- `npm run dev` : Next.js開発サーバーを起動します。UI変更を即時確認したい場合に利用します。
- `npm run lint` : TypeScript/TSXの静的解析を実行します。コミット前の破綻検知に使用します。
- `npm run test:watch` : テストをウォッチモードで実行します。挙動検証を繰り返す際に便利です。
- `npm run build:extension:quick` : Lintと型検証を省略した軽量のNext.js本番ビルドを実行し、VSCode拡張のWebviewとTypeScriptを同期します。構文エラーのみ検知されるため、型やLintの検証は必要に応じて`npm run lint`や`npm run build`で別途実施してください。

## 配布・リリースフェーズで使用するコマンド

- `npm run build` : TypeScript型チェックとNext.js本番ビルドを行います。成果物は`build/`配下に出力されます。
- `npm run build:extension` : Webアプリの本番ビルド・Webviewへのコピー・拡張コードのコンパイルまでを一括で実行します。拡張機能の配布前検証に使用してください。
- `npm run build:all` : WebアプリとVSCode拡張の本番ビルドを連続で実行します。ドキュメント生成やリリース前の最終チェックに向いています。
- `npm run deploy` : `build/`を`docs/`へ移動し、GitHub Pagesへの配布準備を行います。`npm run build`完了後に実行してください。
