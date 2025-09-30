# DDD原則に基づくリファクタリング提案

## 1. はじめに

このドキュメントは、現在のアプリケーションのコードベースをドメイン駆動設計（DDD）の原則に沿ってリファクタリングするための分析と提案をまとめたものです。目的は、ドメインロジックをUIやインフラストラクチャから分離し、コードの保守性、拡張性、テスト容易性を向上させることです。

## 2. DDDの基本概念とレイヤードアーキテクチャ

DDDでは、関心事の分離を徹底するために、一般的に以下の4つのレイヤーでアプリケーションを構成します。

1.  **Presentation Layer (UI層)**: ユーザーとのインターフェースを担当。現在の`components`, `app`, `hooks`の一部が該当します。
2.  **Application Layer (応用層)**: UIからのリクエストを受け取り、ドメインオブジェクトを操作してビジネスユースケースを実行します。
3.  **Domain Layer (ドメイン層)**: ビジネスの概念、ルール、ロジックを表現する中心的なレイヤー。エンティティ、値オブジェクト、ドメインサービス、リポジトリ（インターフェース）などが含まれます。
4.  **Infrastructure Layer (インフラ層)**: データベース、外部API、ファイルシステムなど、技術的な詳細を実装します。ドメイン層で定義されたリポジトリの具象クラスなどが含まれます。

## 3. 現状のコードベース分析

現在のコードベースは、React/Next.jsの一般的な構成（feature-based or component-based）に従っています。

-   **ロジックの混在**: ビジネスロジック、状態管理、UIレンダリングのロジックがカスタムフック (`hooks/`) やコンポーネント (`components/`) 内に密接に結合しています。
    -   例: `useAIGeneration.tsx` は、AI生成のロジックと状態管理を含んでおり、ドメインロジックと応用ロジックが混在しています。
    -   例: `state/state.ts` や `utils/hierarchical/` には純粋なドメインロジックが含まれていますが、他の場所からも直接利用されており、境界が曖昧です。
-   **関心の分散**: 1つのビジネス機能（例: 要素の操作）に関連するコードが、`components`, `hooks`, `utils`, `state` など複数のディレクトリに分散しています。

これにより、ビジネスルールの全体像を把握しにくく、変更が広範囲に影響を及ぼす可能性があります。

## 4. リファクタリング提案

上記の分析に基づき、DDDのレイヤードアーキテクチャに沿ったディレクトリ構造への移行を提案します。

### 提案するディレクトリ構造

```
src/
├── domain/         # ドメイン層: ビジネスルールの中核
│   ├── canvas/
│   ├── element/
│   ├── history/      # Undo/Redo
│   └── tab/
├── application/    # 応用層: ユースケース
│   ├── CanvasService.ts
│   ├── TabService.ts
│   └── AIService.ts
├── infrastructure/ # インフラ層: 外部システムとの連携
│   ├── storage/      # LocalStorage, FileSystem
│   └── api/          # 外部APIクライアント
├── presentation/   # UI層: 表示とユーザー入力
│   ├── components/
│   ├── hooks/        # UI状態管理専用フック
│   ├── app/
│   └── ...
└── ... (既存の utils など)
```

### 4.1. Domain Layer の分離

`src/domain` ディレクトリを新設し、アプリケーションの中核となるビジネスロジックを集約します。

-   **対象**:
    -   `state/state.ts`, `state/undoredo.ts`
    -   `utils/hierarchical/*`
    -   `utils/element/*`
    -   `types/` 内のドメインオブジェクトの型定義 (`element.ts`, `hierarchicalTypes.ts` など)
-   **リファクタリング方針**:
    1.  **エンティティと値オブジェクトの定義**:
        -   `domain/element/model.ts`: `IdeaElement` や `Connection` などの中心的なオブジェクトをクラスとして定義します。不変性やIDによる同一性をここで表現します。
        -   `domain/canvas/model.ts`: `Canvas` を、要素の集合を管理する「集約（Aggregate）」として定義します。要素の追加、削除、接続などのビジネスルールをメソッドとして実装します。
    2.  **ドメインサービスの抽出**:
        -   特定のエンティティに属さないドメインロジック（例: 複雑なレイアウト計算）を `domain/canvas/service.ts` のようなドメインサービスに抽出します。
    3.  **リポジトリインターフェースの定義**:
        -   `domain/canvas/repository.ts`: `ICanvasRepository` のようなインターフェースを定義します。これにより、ドメイン層は永続化の具体的な方法（LocalStorage, FileSystem）に依存しなくなります。

### 4.2. Application Layer の構築

`src/application` ディレクトリを新設し、UIからの要求を処理するユースケースを記述します。

-   **対象**:
    -   `hooks/` 内のビジネスロジック（`useAIGeneration`, `useFileOperations`, `useTabManagement` など）
-   **リファクタリング方針**:
    1.  **ユースケースの分離**:
        -   `application/CanvasService.ts`: 要素の追加、更新、AIによる生成指示など、キャンバス操作に関連するユースケースを記述します。
        -   `application/TabService.ts`: タブの追加、保存、切り替えなどのユースケースを記述します。
    2.  **実装**:
        -   Application Serviceは、ドメイン層で定義されたリポジトリインターフェースを通じてドメインオブジェクト（例: `Canvas` 集約）を取得します。
        -   ドメインオブジェクトのメソッドを呼び出してビジネスロジックを実行します。
        -   結果をリポジトリ経由で永続化し、必要に応じてUIに返すデータを生成します。

### 4.3. Infrastructure Layer の整理

`src/infrastructure` ディレクトリを新設し、外部システムとの具体的な連携を実装します。

-   **対象**:
    -   `utils/api/*`
    -   `utils/storage/*`
    -   `utils/file/*`
-   **リファクタリング方針**:
    1.  **リポジトリの具象クラス実装**:
        -   `infrastructure/storage/CanvasRepository.ts`: `domain/canvas/repository.ts` で定義した `ICanvasRepository` インターフェースを、LocalStorageやIndexedDBを使って実装します。
    2.  **外部サービスの隔離**:
        -   `infrastructure/api/GeminiClient.ts`: AI生成のための外部API呼び出しロジックをここに集約します。

### 4.4. Presentation Layer の責務限定

`src/components`, `src/hooks`, `src/app` はUIの表示とユーザー入力の受付に特化させます。

-   **リファクタリング方針**:
    1.  **ビジネスロジックの削除**: コンポーネントやカスタムフックから、Application Serviceへ移動したビジネスロジックを削除します。
    2.  **Application Serviceの呼び出し**: UIイベント（ボタンクリックなど）をトリガーに、DIコンテナなどを通じて取得したApplication Serviceのメソッドを呼び出します。
    3.  **UI専用フック**: `useState`, `useEffect` などを用いた純粋なUIの状態管理（例: モーダルの開閉、アニメーション）のみをカスタムフックに残します。

## 5. リファクタリングの進め方（推奨）

1.  **ドメインの特定**: まずは `element` や `canvas` といった中核ドメインから着手します。`src/domain/element/model.ts` を作成し、型定義をクラスに置き換えることから始めます。
2.  **集約の構築**: `src/domain/canvas/model.ts` に `Canvas` 集約を作成し、`state.ts` にあるロジックをメソッドとして移植します。
3.  **リポジトリの導入**: `ICanvasRepository` インターフェースを定義し、既存の保存ロジックを `infrastructure` 層に隔離します。
4.  **応用サービスの作成**: `application/CanvasService.ts` を作成し、UIから呼び出すためのメソッドを準備します。
5.  **UIの接続**: 最後に、既存のコンポーネントやフックから、新しく作成したApplication Serviceを呼び出すように変更します。

このプロセスをドメインごとに繰り返すことで、段階的かつ安全にリファクタリングを進めることができます。
