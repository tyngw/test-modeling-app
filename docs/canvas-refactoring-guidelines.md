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
1. **ステップ0: 複雑フックの事前分解**
   - `useElementDragEffect` をはじめとした巨大フックは、コンテキスト依存と UI 副作用の混在が深刻。`state`/`dispatch` ではなく最小限のデータとコールバック (`onDrop`, `onDrag`, `onDragPreviewChange` など) を引数で受け取る純粋ロジックへ段階的に変換する。
   - 分解後は純粋関数をユニットテストで検証し、React 依存部分を薄いラッパーに閉じ込める。

2. **コアとアダプターの明確な境界定義**
   - コア: 階層構造や要素 CRUD、整合性ルール、履歴管理、イベント発行（`onStateChange`）を担当。React 非依存の TypeScript モジュールとして `canvas-core` に配置。
   - アダプター: React コンポーネント/フック側でコアの状態を購読し、`CanvasView` への描画データ化、レイアウト計算のスケジューリング、UI フィードバック（プレビュー・ハイライト）を担当。状態同期には `useSyncExternalStore` などを検討し、再レンダリングを制御する。

3. **依存逆転と副作用インターフェース化**
   - ストレージ、トースト、AI 呼び出しなどの副作用はコアの外側に押し出し、インターフェース越しに注入する。コアは副作用を持たず、コマンド発行に徹する。
   - 高頻度更新（ドラッグ等）はアダプター側でバッチ処理または `requestAnimationFrame` による間引きを検討する。

4. **Composable API と UI 分離**
   - `useCanvas` などのフックは、コアから提供される store / dispatcher を薄くラップする構成へ移行し、必要な依存は props/オプションとして注入する。
   - UI コンポーネント（メニュー、モーダル、トースト）は呼び出し側で組み合わせる「シェル」とし、ライブラリは描画と状態操作の API を提供する。

5. **型レイヤの再設計**
   - `CanvasElement` から `selected` や `editing` など UI 状態を分離し、`CanvasElement<TMeta>` のようにドメインデータをジェネリクスで拡張できる構造にする。
   - UI 状態は React 側で保持する `ViewState` 等へ移し、コアは純粋なドメイン情報のみ扱う。イベント/コマンドの union 型も整理して拡張可能にする。

6. **段階的移行と検証**
   - 既存アプリで新しい抽象を導入→ユニット/統合テストとブラウザ検証で退行を防止→安定後にライブラリとして抽出。
   - 各ステップで `npm run lint`・`npm run test`・`npm run build` に加え、対象機能の手動検証を計画に組み込む。

## 具体的ステップ
### 0. 巨大フックの事前リファクタリング
- `useElementDragEffect`, `UseTouchHandlers`, `UseKeyboardHandler` を調査し、必要データ/副作用を洗い出す。
- コアロジックと UI 副作用を分離し、純粋関数 + コールバック注入パターンへ書き換え。React 依存部は薄いラッパーに限定。
- 変更後、フックロジック用のユニットテストを追加して `npm run test` で検証。

### 1. 型レイヤの分離と UI 状態の外出し
- `CanvasElement` から UI 状態 (`selected`, `editing`, `hover` 等) を除去し、`CanvasElement<TMeta>` でドメインデータのみを保持。
- UI 状態は `ViewState`（React 側の store / context）として別管理し、既存コードを段階的に移行。
- 型の分離後に `tsc --noEmit` と主要操作の手動確認を実施。

### 2. コア状態モデルの抽出
- `src/state/state.ts` から要素 CRUD、階層管理、履歴機能を `packages/canvas-core` に移動。
- 抽出時にレイアウト計算など UI/副作用的処理をフックできるイベント (`onStateChange`) として切り出す。
- 既存アプリはコア API 経由で状態更新を行うよう変更し、`npm run lint`・`npm run test`・`npm run build` を成功させる。

### 3. レイアウト計算のアダプター化
- `adjustElementPositionsFromHierarchy` などレイアウト処理を React アダプター層に移し、state 変更後にスケジュールして実行。
- 高頻度更新時のバッチ処理や `requestAnimationFrame` 最適化を導入。
- 手動検証として大規模データでドラッグ操作を確認。

### 4. 副作用インターフェース化
- ストレージ・トースト・ロギング・AI 呼び出しを `CanvasPersistence`, `CanvasEventHandlers`, `CanvasExternalServices` といったインターフェースに整理。
- コアはこれらのインターフェースを引数で受け取る設計とし、モック可能な構造でユニットテストを追加。

### 5. React アダプターと CanvasView の分割
- `CanvasArea` を `CanvasController`（状態購読・イベント橋渡し）と `CanvasView`（純粋描画）に分割。
- `useSyncExternalStore` やメモ化を活用して再レンダリングを制御し、Storybook 等で UI を検証。
- 既存 UI（メニュー/モーダル/トースト）との通信は props/イベント経由に統一。

### 6. API・イベントの標準化
- `CanvasCommand`, `CanvasEvent` を整理し、アダプターからコアへの入力・コアからの通知を明確にする。
- 新 API に合わせてドキュメントと型定義を更新し、`tsc` / `eslint` / `jest` を通す。

### 7. 移行テスト整備
- `canvas-core` のユニットテスト、React アダプターの統合テスト、主要操作の E2E/手動検証手順を整備。
- CI で `npm run lint`, `npm run test`, `npm run build`, `npm run build:extension` を通すパイプラインを構築。

### 8. パッケージ化 & 公開準備
- `packages/canvas-core` / `packages/canvas-react` / `examples/basic-app` を整備し、ワークスペース化。
- README, API リファレンス、CHANGELOG、バージョニング方針を整備し、`npm run publish:dry-run` で検証。

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


## タスクリスト
- [ ] **0. ドメインモデルの現状整理**
  - 作業内容: キャンバス要素・階層・操作フローを図解/表に整理し、`docs/canvas-domain-model.md` を作成。
  - 検証: ドキュメントレビュー + 既存の `npm run lint` と `npm run build` が成功すること。
- [ ] **1. 巨大フックの事前リファクタリング**
  - `useElementDragEffect`, `UseTouchHandlers`, `UseKeyboardHandler` を調査し、必要データ/副作用を洗い出す。
  - コアロジックと UI 副作用を分離し、純粋関数 + コールバック注入パターンへ書き換え。React 依存部は薄いラッパーに限定。
  - 変更後、フックロジック用のユニットテストを追加して `npm run test` で検証。
- [ ] **2. 型レイヤの分離と UI 状態の外出し**
  - `CanvasElement` から UI 状態 (`selected`, `editing`, `hover` 等) を除去し、`CanvasElement<TMeta>` でドメインデータのみを保持。
  - UI 状態は `ViewState`（React 側の store / context）として別管理し、既存コードを段階的に移行。
  - 型の分離後に `tsc --noEmit` と主要操作の手動確認を実施。
- [ ] **3. コア状態モデルの抽出**
  - `src/state/state.ts` から要素 CRUD、階層管理、履歴機能を `packages/canvas-core` に移動。
  - 抽出時にレイアウト計算など UI/副作用的処理をフックできるイベント (`onStateChange`) として切り出す。
  - 既存アプリはコア API 経由で状態更新を行うよう変更し、`npm run lint`・`npm run test`・`npm run build` を成功させる。
- [ ] **4. レイアウト計算のアダプター化**
  - `adjustElementPositionsFromHierarchy` などレイアウト処理を React アダプター層に移し、state 変更後にスケジュールして実行。
  - 高頻度更新時のバッチ処理や `requestAnimationFrame` 最適化を導入。
  - 手動検証として大規模データでドラッグ操作を確認。
- [ ] **5. 副作用インターフェース化**
  - ストレージ・トースト・ロギング・AI 呼び出しを `CanvasPersistence`, `CanvasEventHandlers`, `CanvasExternalServices` といったインターフェースに整理。
  - コアはこれらのインターフェースを引数で受け取る設計とし、モック可能な構造でユニットテストを追加。
- [ ] **6. React アダプターと CanvasView の分割**
  - `CanvasArea` を `CanvasController`（状態購読・イベント橋渡し）と `CanvasView`（純粋描画）に分割。
  - `useSyncExternalStore` やメモ化を活用して再レンダリングを制御し、Storybook 等で UI を検証。
  - 既存 UI（メニュー/モーダル/トースト）との通信は props/イベント経由に統一。
- [ ] **7. API・イベントの標準化**
  - `CanvasCommand`, `CanvasEvent` を整理し、アダプターからコアへの入力・コアからの通知を明確にする。
  - 新 API に合わせてドキュメントと型定義を更新し、`tsc` / `eslint` / `jest` を通す。
- [ ] **8. 移行テスト整備**
  - `canvas-core` のユニットテスト、React アダプターの統合テスト、主要操作の E2E/手動検証手順を整備。
  - CI で `npm run lint`, `npm run test`, `npm run build`, `npm run build:extension` を通すパイプラインを構築。
- [ ] **9. パッケージ化 & 公開準備**
  - `packages/canvas-core` / `packages/canvas-react` / `examples/basic-app` を整備し、ワークスペース化。
  - README, API リファレンス、CHANGELOG、バージョニング方針を整備し、`npm run publish:dry-run` で検証。
