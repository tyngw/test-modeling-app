# Canvas モジュール切り出しリファクタリング方針

## 目的
- キャンバス描画・編集機能を他プロジェクトから再利用できる外部ライブラリとして提供する。
- アプリ固有の状態管理・UI・永続化への結合を分離し、ライブラリが純粋に「状態モデル + 描画/操作 API」を扱う構造に再設計する。
- 段階的に移行しつつ既存アプリの動作を維持する。

## 現状の主な結合ポイント
- **状態管理**: `CanvasArea` やカスタムフックが `CanvasContext` (`src/context/CanvasContext.tsx`) の `state`/`dispatch` に直接依存し、`hierarchicalData` などアプリ固有の構造を前提にしている。
- **副作用**: 色設定や履歴を `localStorageHelpers` に直接アクセスして取得・保存している。`ToastContext` など UI コンテキストにも依存。
- **UI 構成要素**: キャンバス描画と同じコンポーネント内にメニュー、モーダル、ショートカットの実装が混在しており、外部アプリで不要な UI まで抱き合わせになる。
- **型定義**: `CanvasElement` などの型がアプリ固有のフィールドを含むため、他アプリでの適用性が限定的。
- **ユーティリティ**: `hierarchicalConverter` や `UseElementDragEffect` などがアプリ特化のロジックと混在し、抽象化が不足。

## リファクタリングの基本方針
1. **コアとアダプターの分離**
   - キャンバスの状態・操作ロジックを「コア」として React 非依存の TypeScript モジュールに集約。
   - React コンポーネントはコアを利用する薄いアダプターとして実装し、UI や状態バインディングをアプリ側で差し込む。

2. **依存逆転**
   - ストレージ操作・通知・翻訳など副作用はコールバック/インターフェースとして受け取り、ライブラリ側から直接呼び出さない。
   - `dispatch` を直接呼ぶのではなく、ライブラリが `onStateChange` や `command` を発行し、アプリがそれを処理する形に。

3. **Composable API**
   - `useCanvas` などカスタムフックは `canvasCore` をラップする薄いフックとし、必要なコールバック・依存を props として受け取る。
   - UI コンポーネント（メニュー、モーダル、トースト連携など）は呼び出し側に委譲し、ライブラリは最小限の描画 `CanvasView` を提供。

4. **型の再設計**
   - `CanvasElement` をジェネリック化し、アプリ固有のメタデータは拡張型で扱う。
   - イベント/コマンドの型を明示し、拡張可能な union として定義。

5. **段階的移行**
   - 既存アプリ内でまず新しい抽象に置き換え、その後ライブラリとして独立リポジトリ化/パッケージ化。
   - 各ステップでテストと型チェックを整備。

## 具体的ステップ
### 1. コア状態モデルの抽出
- `src/state/state.ts` からキャンバス関連の reducer・型を抽出し、`packages/canvas-core` など新ディレクトリに移動。
- 抽出対象には: Elements の CRUD、階層管理、ズーム・ドラッグ状態など。
- 抽出後、既存アプリは新コアの API を import して利用するよう変更。

### 2. 副作用インターフェース化
- ストレージアクセス (`localStorageHelpers`) を `CanvasPersistence` インターフェースに定義し、ライブラリ利用者が実装注入する構造に変更。
- トースト・ログ出力・アナリティクスなども `CanvasEventHandlers` として外部から渡す。

### 3. React アダプターの整理
- `CanvasArea` を `CanvasView` と `CanvasController` に分割。
  - `CanvasView`: props として描画用データ（座標、接続情報など）とイベントハンドラーを受け取る純粋 UI。
  - `CanvasController`: `canvas-core` を利用して状態を更新し、`CanvasView` に渡す。
- 現在の `CanvasArea` に含まれる UI（メニュー、モーダル等）はアプリ側レイヤに移設し、必要ならライブラリ側で `render prop` や `slots` として受け取れるようにする。

### 4. カスタムフックの再設計
- `useElementDragEffect` などのフックから `CanvasContext` 依存を排除し、必要な状態とコールバックは引数で受け取る純粋フックに修正。
- ピンチ/タッチ・キーボード操作なども同様に API 化し、コアロジックをテスト可能に分離。

### 5. 型・イベントの標準化
- `src/types/types.ts` を整理し、ライブラリ側は `CanvasElement<TMeta>` のように拡張可能な型を定義。
- コマンド/イベント (例: `CanvasCommand`, `CanvasEvent`) を列挙し、アプリ側が任意処理をフックできるようにする。

### 6. 移行テスト整備
- 各ステップで `jest` + `react-testing-library` による UI テスト、および `canvas-core` のユニットテストを追加。
- 主要なドラッグ&ドロップ・接続操作を E2E で検証できるテストを検討。

### 7. パッケージ化 & 公開準備
- `pnpm workspace` などを利用し `packages/canvas-core` と `packages/canvas-react` を分割。
- README, API リファレンス、使用例を整備し、`package.json` に `exports` を定義。
- 最終的に npm への公開、もしくは Git submodule として共有できる状態を目指す。

## 段階的リリース計画
1. **内部モノレポ化**: リポジトリ内でパッケージ分割し、現行アプリから新 API に接続して動作確認。
2. **外部アプリでの PoC**: 切り出したライブラリを別アプリに組み込み、拡張ポイント・不足 API を洗い出し。
3. **安定化フェーズ**: 型・テスト・ドキュメント整備、バージョニングポリシー策定。
4. **公開**: npm or GitHub Packages に公開し、CHANGELOG 運用を開始。

## リスクと対応策
- **既存機能の退行**: 各ステップでスナップショットテスト・ストーリーブック等を活用して UI を検証。
- **パフォーマンス低下**: 状態管理を抽象化する際に不要な再レンダーが発生しないようメモ化・バッチ更新を考慮。
- **API 過剰設計**: 必要最小限の機能から切り出し、PoC を通じて実際の利用要件をフィードバックする。

## 作業体制・タスク分解例
- **アーキテクト**: API 設計、抽象化方針決定、レビュー。
- **実装担当**: コア抽出、React アダプター実装、既存アプリ改修。
- **QA/テスト**: Regression テスト、PoC アプリ検証。
- **ドキュメント**: API リファレンス、移行手順、サンプルコード作成。

## 次のアクション
1. 現行機能のドメインモデルを整理するドキュメント（エレメント種別、状態遷移など）を整える。
2. `canvas-core` のプロトタイプを作成し、最小限の API セット（要素取得・追加・移動）を実装。
3. `CanvasArea` を `CanvasView` + `CanvasController` に分割する Spike 開発を実施。
4. Spike の結果を踏まえて正式なリファクタリング計画・スケジュールを確定。


## タスク分解と検証フロー
1. **ドメインモデルの現状整理**
   - 作業内容: キャンバス要素・階層・操作フローを図解/表に整理し、`docs/canvas-domain-model.md` を作成。
   - 検証: ドキュメントレビュー + 既存の `npm run lint` と `npm run build` が成功すること。
2. **モノレポ準備とパッケージスケルトン作成**
   - 作業内容: `package.json` をワークスペース対応に変更し、`packages/canvas-core` と `packages/canvas-react` の空パッケージを追加。
   - 検証: `npm install` → `npm run build` が成功し、既存アプリが起動可能 (`npm run dev` 簡易確認)。
3. **キャンバス状態ロジック抽出 (Core 1/3)**
   - 作業内容: `src/state/state.ts` から要素定義・操作 reducer を `canvas-core` へ移動し、アプリ側は新 API を import。
   - 検証: `npm run lint`・`npm run test`・`npm run build` を実行。キャンバス主要操作（要素追加/編集）を手動確認。
4. **階層ユーティリティ抽出 (Core 2/3)**
   - 作業内容: `hierarchicalConverter`・`hierarchicalOperations` を `canvas-core` に移し、抽象化したデータ構造を採用。
   - 検証: `npm run test`（新規ユニットテストを含む）と `npm run build`。既存 E2E マニュアル手順で階層編集を確認。
5. **ドラッグ・タッチ・キーボードロジック抽出 (Core 3/3)**
   - 作業内容: `useElementDragEffect` 等を副作用レスなユーティリティとして `canvas-core` に再実装し、React フックはラッパー化。
   - 検証: `npm run test`（新規 drag 操作ユニットテスト）と `npm run build`、ブラウザでドラッグ・キーボード操作を確認。
6. **副作用インターフェース化**
   - 作業内容: ストレージ・トースト・ログ呼び出しを `CanvasPersistence`/`CanvasEventHandlers` として抽象化し、アプリ側で実装注入。
   - 検証: `npm run lint`・`npm run build`。ブラウザでテーマ保存/トースト表示が期待どおりか確認。
7. **CanvasView / Controller 分割**
   - 作業内容: `CanvasArea` を UI 表示 (`CanvasView`) と操作制御 (`CanvasController`) に分割し、ライブラリから公開。
   - 検証: `npm run lint`・`npm run test`（ビューのスナップショットテスト追加）・`npm run build`。UI崩れがないか手動確認。
8. **型・イベント API 整備**
   - 作業内容: `CanvasElement<TMeta>` などジェネリック化、`CanvasCommand`/`CanvasEvent` の型定義・ドキュメンテーション追加。
   - 検証: `npm run lint`・`npm run build` と型テスト (`tsc --project packages/canvas-core/tsconfig.json`)。
9. **サンプル/PoC アプリ実装**
   - 作業内容: `examples/basic-app` を作成し、切り出したライブラリのみで最小キャンバスを動作させる。
   - 検証: `npm run lint`・`npm run build` に加えて `npm run build:examples`（新設）を実行、PoC 上で主要操作を手動確認。
10. **公開準備とドキュメント整備**
    - 作業内容: README/API リファレンス、CHANGELOG、バージョニングポリシー策定。npm publish dry-run を実施。
    - 検証: `npm run lint`・`npm run build`・`npm run test`・`npm run publish:dry-run`（新設スクリプト）。ドキュメントレビュー。

