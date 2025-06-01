# セキュリティガイド

このドキュメントでは、Test Modeling Appに実装されたXSS（Cross-Site Scripting）対策について説明します。

## 実装されたセキュリティ対策

### 1. 入力サニタイゼーション (`src/utils/security/sanitization.ts`)

#### `sanitizeText(input: string): string`
- HTMLタグの除去（`<script>`, `<iframe>`, `<object>`, `<embed>`, `<form>` など）
- JavaScript プロトコルの除去（`javascript:`, `vbscript:`）
- データURLの除去（`data:`）
- イベントハンドラーの除去（`on*` 属性）

#### `escapeForJson(input: string): string`
- JSON特殊文字のエスケープ
- 制御文字のエスケープ

#### `sanitizeFilename(filename: string): string`
- パストラバーサル攻撃の防止（`../`, `..\\`）
- 危険な文字の除去（`<>"|*?`）
- ファイルシステム予約名の処理

#### `sanitizeObject(obj: any): any`
- オブジェクトの再帰的サニタイゼーション
- 文字列プロパティのHTMLタグ除去
- プロトタイプ汚染の防止

### 2. 入力検証 (`src/utils/security/validation.ts`)

#### `validateTextInput(input: string): boolean`
- 危険なスクリプトタグの検出
- JavaScript プロトコルの検出
- eval関数の使用検出
- 過度に長い入力の拒否（10,000文字制限）

#### `validateJsonData(data: string): boolean`
- JSON形式の検証
- サイズ制限（1MB）
- 空データの拒否

#### `validateFileContent(content: string): boolean`
- ファイル内容のサイズ制限（1MB）
- 危険なスクリプトタグの検出
- JavaScript プロトコルの検出

#### `validateExternalUrl(url: string): boolean`
- HTTPS プロトコルの強制
- プライベートIPアドレスの拒否
- ローカルホストの拒否

### 3. コンポーネントレベルのセキュリティ

#### `HelpModal.tsx`
- `dangerouslySetInnerHTML` の使用を廃止
- 構造化されたデータを使用した安全なレンダリング

#### `InputFields.tsx`
- リアルタイム入力検証
- 危険な入力の即座な拒否
- サニタイゼーション処理

#### `TextDisplayArea.tsx`
- 表示前のテキストサニタイゼーション
- 安全なテキストレンダリング

#### `SettingsModal.tsx`
- ファイルアップロード時の厳格な検証
- ファイル名、サイズ、内容の多層検証
- JSON構造の検証

### 4. API セキュリティ (`src/utils/api/api.ts`)

#### AI API レスポンスのサニタイゼーション
- 全てのAPI レスポンスのサニタイゼーション
- JSON レスポンスの検証
- 不正なデータの除去

### 5. ストレージセキュリティ (`src/utils/storage/localStorageHelpers.ts`)

#### localStorage 操作の安全化
- サイズ制限の実装（5MB）
- 設定値の検証とサニタイゼーション
- APIキーの暗号化保持

### 6. ファイル操作セキュリティ (`src/utils/file/fileHelpers.ts`)

#### ファイル処理の安全化
- ファイル名のサニタイゼーション
- ファイル内容の検証
- JSON データの検証

### 7. HTTP セキュリティヘッダー (`next.config.ts`)

#### Content Security Policy (CSP)
```javascript
"default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self';"
```

#### その他のセキュリティヘッダー
- `X-Frame-Options: DENY` - クリックジャッキング防止
- `X-Content-Type-Options: nosniff` - MIME スニッフィング防止
- `Referrer-Policy: origin-when-cross-origin` - リファラー情報の制御
- `X-XSS-Protection: 1; mode=block` - XSS 保護の有効化

## セキュリティのベストプラクティス

### 1. 入力処理
- 全てのユーザー入力を信頼しない
- 入力時点での検証とサニタイゼーション
- ホワイトリスト方式の採用

### 2. 出力処理
- 表示前のデータサニタイゼーション
- `dangerouslySetInnerHTML` の使用回避
- 構造化されたデータの使用

### 3. ファイル操作
- ファイル名のサニタイゼーション
- ファイルサイズ制限
- 内容の検証

### 4. API 通信
- HTTPS の強制使用
- レスポンスデータの検証
- プライベートネットワークへのアクセス制限

### 5. 設定とストレージ
- 機密情報の暗号化
- サイズ制限の実装
- データの検証

## 注意事項

### 1. パフォーマンスへの影響
- サニタイゼーション処理による軽微な処理時間の増加
- 大量データ処理時の負荷増大の可能性

### 2. 機能制限
- 一部のHTML タグの使用不可
- ファイルサイズ制限による制約
- 厳格な入力検証による利便性の低下

### 3. 定期的な見直し
- 新しい脅威への対応
- セキュリティライブラリの更新
- 定期的なセキュリティ監査の実施

## セキュリティテスト

### 手動テスト項目
1. **XSS攻撃テスト**
   - `<script>alert('XSS')</script>` の入力
   - JavaScript プロトコルの使用
   - イベントハンドラーの埋め込み

2. **ファイルアップロードテスト**
   - 悪意のあるファイル名の使用
   - 過大サイズファイルのアップロード
   - 不正なJSONファイルのアップロード

3. **設定値テスト**
   - 異常値の設定
   - SQLインジェクション試行
   - JSON インジェクション試行

### 自動テスト
- セキュリティ機能のユニットテスト
- 統合テストでのセキュリティ検証
- 継続的なセキュリティ監視

## 脆弱性報告

セキュリティ上の問題を発見した場合は、速やかに開発チームに報告してください。

---

**最終更新**: 2024年1月
**バージョン**: 1.0
**責任者**: 開発チーム
