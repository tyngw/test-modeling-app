# AI生成機能のDDDリファクタリング

## 概要

`useAIGeneration.tsx`をドメイン駆動設計（DDD）の原則に従ってリファクタリングしました。これにより、ビジネスロジックとUIロジックが明確に分離され、保守性と拡張性が向上しました。

## リファクタリング前の問題点

1. **責務の混在**: UIロジック、ビジネスロジック、インフラストラクチャロジックが1つのフックに混在
2. **テストの困難性**: 外部依存が多く、単体テストが困難
3. **再利用性の低さ**: 特定のUIコンポーネントに依存したロジック
4. **保守性の問題**: 1つのファイルが1000行を超える巨大なファイル

## リファクタリング後の構造

### ドメイン層 (`src/domain/`)

#### モデル
- **`AIGenerationRequest`**: AI生成リクエストを表現するドメインモデル
- **`AIOperation`**: AI操作を表現するドメインモデル
- **`SuggestionContext`**: サジェスト機能のコンテキストを管理
- **`Element`**: 要素のドメインモデル（不変オブジェクト）

#### サービス
- **`AIResponseParser`**: AIレスポンスの解析を担当
- **`PromptBuilder`**: プロンプト構築を担当

#### リポジトリインターフェース
- **`IAIRepository`**: AI API呼び出しの抽象化
- **`IConfigRepository`**: 設定情報取得の抽象化

### 応用層 (`src/application/`)

#### サービス
- **`AIGenerationService`**: AI生成機能のユースケースを実装
- **`AIOperationExecutor`**: AI操作の実行を担当

### インフラ層 (`src/infrastructure/`)

#### リポジトリ実装
- **`GeminiAIRepository`**: Gemini APIを使用したAI機能の実装
- **`LocalStorageConfigRepository`**: LocalStorageを使用した設定管理

### プレゼンテーション層 (`src/hooks/`)

#### フック
- **`useAIGenerationRefactored`**: UIロジックのみに特化したフック

## 主な改善点

### 1. 関心事の分離

**Before:**
```typescript
// 全てが1つのフックに混在
export function useAIGeneration() {
  // UI状態管理
  // ビジネスロジック
  // API呼び出し
  // レスポンス解析
  // 操作実行
}
```

**After:**
```typescript
// ドメイン層: ビジネスルール
export class AIGenerationRequest { /* ... */ }
export class SuggestionContext { /* ... */ }

// 応用層: ユースケース
export class AIGenerationService { /* ... */ }

// インフラ層: 技術的詳細
export class GeminiAIRepository { /* ... */ }

// プレゼンテーション層: UIロジック
export function useAIGenerationRefactored() { /* ... */ }
```

### 2. 依存性の逆転

**Before:**
```typescript
// 直接的な依存
import { generateWithGemini } from '../utils/api';
import { getApiKey } from '../utils/storage';
```

**After:**
```typescript
// インターフェースを通じた依存
constructor(
  private aiRepository: IAIRepository,
  private configRepository: IConfigRepository
) {}
```

### 3. テスタビリティの向上

**Before:**
```typescript
// テストが困難（外部依存が多い）
const result = await generateWithGemini(prompt, apiKey, modelType);
```

**After:**
```typescript
// モックしやすい構造
const mockAIRepository = {
  generateSingle: jest.fn().mockResolvedValue('mock response')
};
const service = new AIGenerationService(mockAIRepository, mockConfigRepository);
```

### 4. ビジネスルールの明確化

**Before:**
```typescript
// ロジックが散在
if (!apiKey) {
  throw new Error('APIキーが設定されていません');
}
// ... 他の場所でも同様のバリデーション
```

**After:**
```typescript
// ドメインモデルでルールを集約
export class AIGenerationRequest {
  private validate(): void {
    if (!this.apiKey.trim()) {
      throw new Error('APIキーが設定されていません');
    }
  }
}
```

## 使用方法

### 基本的な使用方法

```typescript
// 従来と同じインターフェース
const {
  handleAIClick,
  handleAIClickForChat,
  handleSiblingNodeSuggestion,
  clearSuggestionContext,
  isLoading,
  suggestionState
} = useAIGenerationRefactored({ currentTab, dispatch });
```

### 依存性注入のカスタマイズ

```typescript
// テスト用のモック実装
const mockAIRepository = new MockAIRepository();
const mockConfigRepository = new MockConfigRepository();
const aiService = new AIGenerationService(mockAIRepository, mockConfigRepository);
```

## 今後の拡張性

### 1. 新しいAIプロバイダーの追加

```typescript
// 新しいAIプロバイダーを簡単に追加可能
export class OpenAIRepository implements IAIRepository {
  async generateSingle(prompt: string): Promise<string> {
    // OpenAI APIの実装
  }
}
```

### 2. 新しい操作タイプの追加

```typescript
// 新しい操作を簡単に追加
export class AIOperation {
  static moveElement(elementId: string, targetId: string): AIOperation {
    return new AIOperation('MOVE_ELEMENT', { elementId, targetId });
  }
}
```

### 3. 複雑なビジネスルールの追加

```typescript
// ドメインサービスで複雑なロジックを管理
export class AIGenerationPolicy {
  canGenerateForElement(element: Element): boolean {
    // 複雑な生成可否判定ロジック
  }
}
```

## マイグレーション戦略

1. **段階的移行**: 既存のフックと並行して新しい実装を導入
2. **機能単位での移行**: 各機能を個別にテストしながら移行
3. **後方互換性**: 既存のインターフェースを維持

## 結論

このリファクタリングにより、以下の利益が得られます：

- **保守性の向上**: 各層の責務が明確になり、変更の影響範囲が限定される
- **テスタビリティの向上**: 依存性注入により単体テストが容易になる
- **拡張性の向上**: 新機能の追加や既存機能の変更が安全に行える
- **再利用性の向上**: ビジネスロジックが他のUIコンポーネントからも利用可能

DDDの原則に従うことで、長期的な保守性と拡張性を確保できる設計になりました。