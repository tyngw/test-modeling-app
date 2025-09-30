# DDDに基づく推奨ディレクトリ構成

## 現在の問題点と改善提案

### 問題点
1. **ドメイン境界の混在**: AI生成と操作実行が同じディレクトリに配置
2. **責務の分離不足**: `AIOperationExecutor`がUI操作を直接実行
3. **スケーラビリティの課題**: 今後他のドメインが追加された際の構成が不明確

## 推奨構成

### Option 1: ドメイン別の垂直分割（推奨）

```
src/
├── domain/
│   ├── ai/                    # AI生成ドメイン
│   │   ├── models/
│   │   ├── services/
│   │   └── repositories/
│   ├── element/               # 要素管理ドメイン
│   │   ├── models/
│   │   ├── services/
│   │   └── repositories/
│   └── canvas/                # キャンバス管理ドメイン
│       ├── models/
│       ├── services/
│       └── repositories/
├── application/
│   ├── ai/                    # AI関連のユースケース
│   │   ├── AIGenerationService.ts
│   │   └── AIContextService.ts
│   ├── element/               # 要素関連のユースケース
│   │   ├── ElementOperationService.ts
│   │   └── ElementValidationService.ts
│   └── canvas/                # キャンバス関連のユースケース
│       ├── CanvasManagementService.ts
│       └── LayoutService.ts
├── infrastructure/
│   ├── ai/
│   ├── storage/
│   └── api/
└── presentation/
    ├── components/
    ├── hooks/
    └── adapters/              # アプリケーション層とUI層の橋渡し
        ├── AIOperationAdapter.ts
        └── ElementOperationAdapter.ts
```

### Option 2: レイヤー別の水平分割（現在の構成を改善）

```
src/
├── domain/
│   ├── ai/
│   ├── element/
│   └── canvas/
├── application/
│   ├── services/
│   │   ├── ai/
│   │   │   ├── AIGenerationService.ts
│   │   │   └── AIContextService.ts
│   │   ├── element/
│   │   │   └── ElementOperationService.ts
│   │   └── canvas/
│   │       └── CanvasManagementService.ts
│   └── adapters/              # UI層との橋渡し
│       ├── AIOperationAdapter.ts
│       └── ElementOperationAdapter.ts
├── infrastructure/
└── presentation/
```

## 具体的な改善提案

### 1. AIOperationExecutorの分離

現在の`AIOperationExecutor`は以下のように分離すべきです：

```typescript
// src/application/ai/AIOperationService.ts (純粋なビジネスロジック)
export class AIOperationService {
  validateOperation(operation: AIOperation): boolean { /* ... */ }
  prepareOperationData(operation: AIOperation): OperationData { /* ... */ }
}

// src/presentation/adapters/AIOperationAdapter.ts (UI層との橋渡し)
export class AIOperationAdapter {
  constructor(
    private operationService: AIOperationService,
    private dispatch: (action: Action) => void
  ) {}
  
  async executeOperations(operations: AIOperation[]): Promise<string> {
    // ビジネスロジックはサービスに委譲
    // UI操作のみここで実行
  }
}
```

### 2. サービスの責務明確化

```typescript
// src/application/ai/AIGenerationService.ts
export class AIGenerationService {
  // AI生成に関するユースケースのみ
  async generateElements(): Promise<string[]> { /* ... */ }
  async generateSuggestions(): Promise<string[]> { /* ... */ }
}

// src/application/ai/AIContextService.ts
export class AIContextService {
  // コンテキスト管理に特化
  async initializeContext(): Promise<void> { /* ... */ }
  clearContext(): void { /* ... */ }
}
```

## 推奨アプローチ

### Phase 1: 現在の構成を改善（短期）
1. `AIOperationExecutor`を`AIOperationAdapter`として`presentation/adapters/`に移動
2. 純粋なビジネスロジックを`application/ai/AIOperationService.ts`に抽出
3. `application/services/`内をドメイン別にサブディレクトリで整理

### Phase 2: ドメイン別分割（中長期）
1. 各ドメインの境界を明確化
2. ドメイン別の垂直分割に移行
3. 依存関係の整理とインターフェース定義

## メリット

### Option 1 (ドメイン別分割) のメリット
- **凝集度の向上**: 関連する機能が同じディレクトリに集約
- **変更の局所化**: 特定ドメインの変更が他に影響しにくい
- **チーム開発**: ドメイン別にチームを分けやすい
- **マイクロサービス化**: 将来的な分割が容易

### Option 2 (レイヤー別分割) のメリット
- **移行コスト**: 現在の構成からの変更が少ない
- **理解しやすさ**: 従来のレイヤードアーキテクチャに慣れた開発者には分かりやすい
- **横断的関心事**: ログ、認証などの横断的機能を扱いやすい

## 結論

**推奨**: Option 1（ドメイン別分割）を段階的に導入

1. **短期**: 現在の`application/services/`をドメイン別サブディレクトリで整理
2. **中期**: `AIOperationExecutor`をアダプターパターンで分離
3. **長期**: 完全なドメイン別垂直分割に移行

これにより、保守性、拡張性、テスタビリティが大幅に向上します。