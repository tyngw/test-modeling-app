# レイアウト配置処理の実装分析ドキュメント

## 概要

このドキュメントでは、`adjustElementPositionsFromHierarchy`関数と`layoutNodeFromHierarchy`関数（内部で使用される`layoutNode`関数も含む）の実装を分析し、どのような配置ロジックを実現しようとしているのかを日本語で詳しく説明します。

## 主要な関数の役割

### 1. `adjustElementPositionsFromHierarchy`関数

**目的**: 階層構造全体の要素配置を調整するメイン関数

**処理の流れ**:
1. 階層構造データのディープコピーを作成
2. レイアウトモードに応じてルート要素の初期配置を決定
3. `layoutNodeFromHierarchy`を呼び出して子要素を再帰的に配置
4. 更新された階層構造を返却

**レイアウトモード別の処理**:
- **通常モード**: ルート要素を`DEFAULT_POSITION.Y`から開始
- **マインドマップモード**: ルート要素をキャンバス中央に配置し、方向を`'none'`に設定

### 2. `layoutNodeFromHierarchy`関数

**目的**: 個別のノードとその子要素を配置する再帰関数

**基本的な配置ロジック**:

#### X座標の配置
```typescript
// ルート要素（レベル0）
element.x = DEFAULT_POSITION.X;

// 子要素（レベル1以上）
element.x = parent.x + parent.width + OFFSET.X;
```

#### Y座標の配置
```typescript
// 基本位置
element.y = startY;

// 兄弟要素間の間隔
nextY = currentElement.y + currentElement.height + OFFSET.Y;
```

## 配置アルゴリズムの詳細分析

### 1. 階層レベル別X座標配置

**ルート要素（レベル0）**:
- 固定位置: `DEFAULT_POSITION.X`（通常は50px）

**子要素（レベル1以上）**:
- 親要素の右端 + 親要素の幅 + オフセット
- 計算式: `親X座標 + 親要素幅 + OFFSET.X`

**マインドマップモードの特殊処理**:
- **左側の子要素**: `親X座標 - 子要素幅 - (親要素幅 + OFFSET.X)`
- **右側の子要素**: `親X座標 + 親要素幅 + OFFSET.X`
- **方向の継承**: 親の`direction`プロパティに基づいて子要素の配置方向を決定

### 2. Y座標配置とグローバル衝突回避

**基本的なY座標配置**:
```typescript
element.y = startY;
currentY = startY + element.height;
```

**グローバル衝突回避システム**:
```typescript
// 同じ階層レベルまたは隣接レベルとの衝突をチェック
const potentialConflicts = globalElementRanges.filter(
  (range) => Math.abs(range.level - level) <= 1
);

// 衝突が検出された場合、安全な位置に調整
if (proposedMinY < conflict.maxY + margin && proposedMaxY + margin > conflict.minY) {
  startY = conflict.maxY + margin;
}
```

### 3. 兄弟要素間の配置

**通常モード**:
- 兄弟要素を縦に順番に配置
- 各要素間にOFFSET.Y（20px）の間隔を確保

**マインドマップモード**:
- 左右の子要素を別々に管理
- 左側と右側それぞれで独立したY座標進行

### 4. 親要素の中央配置アルゴリズム

**単一子要素の場合**:
```typescript
// 親要素と子要素を同じY座標に配置
element.y = singleChild.y;
```

**複数子要素の場合**:
```typescript
// 子要素群の範囲を計算
const childrenTopY = firstChild.y;
const childrenBottomY = lastChild.y + lastChild.height;
const childrenMidY = (childrenTopY + childrenBottomY) / 2;

// 親要素を中央に配置
const newParentY = childrenMidY - element.height / 2;
element.y = newParentY;
```

## 実装の特徴と設計思想

### 1. 階層構造ベースの設計

**利点**:
- ElementsMapに依存しない純粋な階層構造操作
- 親子関係が明確に保持される
- 配列順序による要素順序の管理

**実装方法**:
- `HierarchicalNode`構造を直接操作
- `node.children`配列の順序を配置順序として使用

### 2. 動的な親要素配置

**設計思想**:
- 親要素は子要素群の中央に自動調整される
- 子要素の追加・削除・移動時に親要素も連動して移動
- バランスの取れた視覚的階層表現

### 3. グローバル衝突回避システム

**目的**:
- 異なる親を持つ要素同士の重なりを防止
- 階層レベル間での適切な間隔確保

**実装**:
```typescript
// 要素の占有範囲をグローバルに追跡
globalElementRanges.push({
  minY: element.y,
  maxY: element.y + element.height,
  level: level,
});
```

### 4. レイアウトモード対応

**通常モード**:
- 縦方向の階層表示
- 左から右への階層進行

**マインドマップモード**:
- ルート要素を中心とした放射状配置
- 左右への分散配置
- 方向プロパティによる配置制御

## 設定値とその影響

### OFFSET設定
```typescript
export const OFFSET = {
  X: 100, // 要素間の水平間隔
  Y: 20,  // 要素間の垂直間隔
};
```

### DEFAULT_POSITION設定
```typescript
export const DEFAULT_POSITION = {
  X: 50,  // ルート要素の初期X座標
  Y: 50,  // ルート要素の初期Y座標
};
```

## 処理フローの詳細

### 1. 初期化フェーズ
1. 階層構造のディープコピー作成
2. グローバル要素範囲トラッキング配列の初期化
3. レイアウトモードに応じたルート要素配置

### 2. 再帰配置フェーズ
1. 現在ノードのX座標計算（親要素基準）
2. グローバル衝突回避チェック
3. Y座標の初期設定
4. 子要素の再帰的配置
5. 親要素の中央配置調整

### 3. 最終調整フェーズ
1. 親要素位置の衝突再チェック
2. グローバル要素範囲の更新
3. 最終的なレイアウト結果の返却

## 実装上の課題と改善点

### 現在の課題

1. **複雑な衝突回避ロジック**:
   - グローバル衝突回避が複雑で理解しにくい
   - デバッグが困難

2. **親要素の位置調整タイミング**:
   - 子要素配置後の親要素調整で追加の衝突が発生する可能性

3. **マインドマップモードの方向制御**:
   - 方向の自動決定ロジックが複雑
   - 明示的な方向指定との整合性

### 改善の方向性

1. **段階的配置アプローチ**:
   - 全要素の基本配置 → 衝突解決 → 親要素調整の順序

2. **シンプルな衝突回避**:
   - レベル別の最大Y座標管理による単純な衝突回避

3. **予測可能な配置ルール**:
   - より明確で一貫性のある配置ルールの確立

## まとめ

現在の実装は、階層構造を維持しながら視覚的にバランスの取れたレイアウトを実現することを目指しています。特に親要素の中央配置機能により、階層関係が直感的に理解できる配置を実現しています。

ただし、グローバル衝突回避システムの複雑さや、マインドマップモードでの方向制御など、改善の余地がある部分も存在します。これらの課題を解決することで、より安定で予測可能なレイアウトシステムを構築できると考えられます。