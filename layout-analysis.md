# レイアウト配置処理の分析結果

## 対象データ概要

- **レイアウトモード**: default
- **要素数**: 6個
- **階層構造**: 3階層（root → child → grandchild）

## Y座標分析

### 各要素の座標データ

| 要素名 | ID | Y座標 | 高さ | 階層レベル |
|--------|----|----- |------|-----------|
| root | 1 | 109.4 | 24.4 | 0 |
| child1 | 1751628896193 | 87.2 | 24.4 | 1 |
| grandchild1-1 | 1751628906303 | 70.0 | 24.4 | 2 |
| grandchild1-2 | 1751628915153 | 104.4 | 24.4 | 2 |
| child2 | 1751628900163 | 131.6 | 24.4 | 1 |
| grandchild2-1 | 1751628931966 | 131.6 | 24.4 | 2 |

## 配置処理の分析

### 1. 親要素の中央配置アルゴリズム

#### ルート要素の中央配置
```
child1のY座標: 87.2
child2のY座標: 131.6
子要素群の中央: (87.2 + 131.6) / 2 = 109.4
→ root要素のY座標: 109.4 ✓ 一致
```

#### child1要素の中央配置
```
grandchild1-1のY座標: 70.0
grandchild1-2のY座標: 104.4
子要素群の中央: (70.0 + 104.4) / 2 = 87.2
→ child1要素のY座標: 87.2 ✓ 一致
```

**結論**: 親要素は常に**子要素群の中央位置**に配置される

### 2. 子要素の垂直配置パターン

#### 兄弟要素間の間隔
- grandchild1-1 → grandchild1-2: 104.4 - 70.0 = 34.4px
- child1 → child2: 131.6 - 87.2 = 44.4px

#### 計算式
```
要素間の実際の間隔 = 次要素Y座標 - (現要素Y座標 + 現要素高さ)
grandchild1-1 → grandchild1-2: 104.4 - (70.0 + 24.4) = 10.0px
```

**結論**: 兄弟要素間には**一定の余白（約10px）**が確保される

### 3. 特殊ケース：単一子要素の配置

#### child2 → grandchild2-1
```
child2のY座標: 131.6
grandchild2-1のY座標: 131.6
→ 完全に同じ位置
```

**結論**: 子要素が1つしかない場合、**親要素と同じY座標**に配置される

## 配置アルゴリズムの言語化

### 基本原則

1. **階層順配置**: 子要素を配列順（children配列の順序）で上から下に配置
2. **中央揃え**: 親要素は子要素群の垂直中央に自動調整
3. **間隔確保**: 兄弟要素間に一定の余白を維持
4. **単一子特例**: 子要素が1つの場合は親と同じY座標

### 処理フロー

```
1. 葉要素（子を持たない要素）から配置開始
2. 兄弟要素を配列順で垂直に配置（間隔: 要素高さ + 約10px）
3. 親要素を子要素群の中央位置に調整
4. 上位階層へ再帰的に同じ処理を適用
```

## X座標配置

- **水平方向**: 階層レベルに応じて右方向に固定間隔で配置
- **間隔**: 150px（親要素の右端 + OFFSET.X）

## X座標配置の修正履歴

### 修正前の問題
1. **X軸オフセット不足**: OFFSET.X = 100px（階層間の間隔が狭い）
2. **Y軸オフセット不足**: OFFSET.Y = 10px（要素間の垂直間隔が狭い）
3. **マインドマップモードの左側配置未実装**: 左側の子要素のX座標設定が不完全
4. **右側配置の不整合**: 固定値計算ではなく親要素基準の相対配置が必要

### 修正後の実装

#### 1. X軸オフセットの調整
```typescript
// elementSettings.ts
export const OFFSET = {
  X: 350, // 要素の最大幅(300px) + 適切な間隔(50px)を考慮
  Y: 20,  // 10px → 20px に増加（視覚的余白改善）
};
```

#### 2. マインドマップモードでの左右配置の統一
```typescript
// layoutNodeFromHierarchy内での修正

// 左側の子要素配置
child.data.x = element.x - child.data.width - OFFSET.X;

// 右側の子要素配置  
child.data.x = element.x + element.width + OFFSET.X;
```

#### 3. 配置ルールの明確化
- **通常モード**: `DEFAULT_POSITION.X + level * OFFSET.X` (階層レベル × 150px)
- **マインドマップ左側**: `親X座標 - 子要素幅 - OFFSET.X`
- **マインドマップ右側**: `親X座標 + 親要素幅 + OFFSET.X`

### 期待される効果
1. **階層間の視覚的な間隔改善**（100px → 150px）
2. **要素間の垂直間隔改善**（10px → 20px）
3. **マインドマップモードでの左右対称な配置**
4. **親子関係の視覚的明確性向上**

## 動的オフセット計算の実装

### 問題の特定
固定オフセット値では、要素の幅が大きい場合に以下の問題が発生：
1. **要素の重なり**: 親要素の幅が大きい場合、固定オフセットでは子要素が重なる
2. **視覚的バランスの悪化**: 小さい要素では間隔が空きすぎ、大きい要素では間隔が不足
3. **階層の深さでの配置問題**: 深い階層での累積的な配置ずれ

### 動的オフセット計算の実装

#### 1. マインドマップモードでの左右配置
```typescript
// 要素幅を考慮した動的オフセット計算
const dynamicOffsetX = Math.max(OFFSET.X, element.width * 0.3);

// 左側配置
child.data.x = element.x - child.data.width - dynamicOffsetX;

// 右側配置  
child.data.x = element.x + element.width + dynamicOffsetX;
```

#### 2. 通常モードでの階層配置
```typescript
// 階層レベルに応じた追加オフセット
const baseOffsetX = level * OFFSET.X;
const additionalOffset = level > 1 ? (level - 1) * 50 : 0;
element.x = DEFAULT_POSITION.X + baseOffsetX + additionalOffset;
```

#### 3. layoutNode関数での親子関係配置
```typescript
// 親要素の幅に応じた動的オフセット
const dynamicOffsetX = Math.max(OFFSET.X, parent.width * 0.2);
```

### 計算式の詳細

#### X軸動的オフセット
```
動的オフセットX = max(固定オフセット, 親要素幅 × 係数)
- マインドマップモード: 親要素幅の30%または最小150px
- layoutNode関数: 親要素幅の20%または最小150px
```

#### Y軸動的オフセット（既存実装）
```
requiredOffset = max((要素高さ - 標準高さ) × 0.5, 固定オフセットY)
```

### 期待される改善効果
1. **要素サイズに応じた適切な間隔**: 大きい要素では広い間隔、小さい要素では適度な間隔
2. **重なり問題の解決**: 要素幅を考慮することで重なりを防止
3. **視覚的バランスの向上**: 親子関係がより明確に表現される
4. **スケーラビリティ**: 様々なサイズの要素に対応可能

## 要素幅を考慮した動的オフセット計算の改善

### 修正内容
固定オフセットから「要素の動的な幅 + 固定OFFSET.X」の計算に変更

#### 1. マインドマップモードでの左右配置
```typescript
// 右側配置
child.data.x = element.x + element.width + OFFSET.X;

// 左側配置  
child.data.x = element.x - child.data.width - (element.width + OFFSET.X);
```

#### 2. 通常モードでの階層配置
```typescript
// 各階層で要素の最大幅 + OFFSET.X を考慮した配置
const maxElementWidth = SIZE.WIDTH.MAX; // 300px
element.x = DEFAULT_POSITION.X + level * (maxElementWidth + OFFSET.X);
```

### 計算式の詳細

#### X座標配置の基本ルール
```
右側子要素X座標 = 親X座標 + 親要素幅 + OFFSET.X
左側子要素X座標 = 親X座標 - 子要素幅 - (親要素幅 + OFFSET.X)
通常モード階層X座標 = 基準X座標 + レベル × (最大要素幅 + OFFSET.X)
```

### 改善効果
1. **確実な重なり防止**: 要素の実際の幅に基づいた配置
2. **一貫性のある間隔**: どんなサイズの要素でも適切な間隔を維持
3. **予測可能なレイアウト**: 要素幅 + 100px の明確なルール
4. **スケーラビリティ**: 階層が深くなっても適切な配置を維持

## Y座標オフセット計算の修正

### 修正前の問題
兄弟要素間のY座標計算で、実際の要素の高さとOFFSET.Yが正しく考慮されていなかった。

**期待される計算**:
```
次の兄弟要素のY座標 = 前の兄弟要素のY座標 + 前の兄弟要素の高さ + OFFSET.Y
```

**問題のあった実装**:
```typescript
currentY = result.newY; // 要素の高さ + OFFSET.Y が不足
```

### 修正後の実装

#### 1. 通常モードでの兄弟要素配置
```typescript
// 修正後：正確な兄弟要素間隔
currentY = child.data.y + child.data.height + OFFSET.Y;
```

#### 2. マインドマップモードでの左右配置
```typescript
// 左側の子要素
leftCurrentY = child.data.y + child.data.height + OFFSET.Y;

// 右側の子要素
rightCurrentY = child.data.y + child.data.height + OFFSET.Y;
```

### 計算式の詳細

#### Y座標配置の基本ルール
```
兄弟要素のY座標 = 前の兄弟要素Y + 前の兄弟要素height + OFFSET.Y(10px)
```

#### OFFSET.Yの調整
```typescript
// elementSettings.ts
export const OFFSET = {
  Y: 10, // 兄弟要素間の垂直間隔を10pxに統一
};
```

### 改善効果
1. **正確な要素間隔**: 要素の実際の高さを考慮した配置
2. **予測可能なレイアウト**: 要素高さ + 10px の明確なルール
3. **一貫性**: layoutNode関数との動作統一
4. **視覚的改善**: 適切な間隔による読みやすさ向上

## 実装における重要な特徴

### 1. 双方向調整
- 子要素の配置変更 → 親要素の位置自動調整
- 親要素の中央配置により、バランスの取れた階層表示

### 2. 配列順序の重要性
- 階層構造の`children`配列の順序が表示順序を決定
- Y座標ではなく配列インデックスが正式な順序

### 3. 動的レイアウト
- 要素の追加・削除・移動時に全体のレイアウトが再計算
- 親要素の位置は常に子要素群に従って動的に調整

## コードとの対応関係

このY座標パターンは以下の処理で実現されています：

1. **layoutHelpers.ts**: `adjustElementPositionsFromHierarchy`関数
2. **中央配置処理**: 子要素の最上位と最下位の中点計算
3. **階層構造**: `getChildrenFromHierarchy`で配列順序を保持

```typescript
// 中央配置の計算例
const childrenMidY = (firstChild.y + lastChild.y + lastChild.height) / 2;
const newParentY = childrenMidY - parent.height / 2;
```

## ✅ 修正履歴 - 最終実装 (2024-12-XX)

### 4. levelMaxYの完全実装とY座標間隔の最適化

#### 問題
- `levelMaxY`の再帰呼び出しでの伝播が不完全だった
- Y座標のオフセット（10px）が小さすぎて視覚的に重なって見える状態
- 階層レベル0（ルート要素）で`levelMaxY`が更新されていなかった

#### 修正内容

**1. levelMaxYの再帰伝播修正**
```typescript
// 全ての再帰呼び出しでlevelMaxYを正しく渡すよう修正
const result = layoutNodeFromHierarchy(
  child,
  currentY,
  level + 1,
  getNumberOfSections,
  layoutMode,
  node, // 親要素の情報を渡す
  levelMaxY, // ✅ levelMaxYを再帰呼び出しに渡す
);
```

**2. Y座標間隔の最適化**
```typescript
// elementSettings.ts
export const OFFSET = {
  X: 100,
  Y: 20, // ✅ 10px → 20px に増加（重なり回避のため）
};
```

**3. 階層レベルトラッキングの改善**
```typescript
// 全ての階層レベル（ルート要素も含む）でlevelMaxYを更新
if (levelMaxY) {
  levelMaxY[level] = Math.max(levelMaxY[level] || 0, startY + element.height);
}
```

#### 期待される効果
1. **階層間の重なり解消**: 同じ階層レベルの要素同士が重ならない
2. **兄弟要素間の適切な間隔**: Y座標オフセットが20pxで視覚的に分離
3. **再帰処理の一貫性**: 全ての子要素でlevelMaxYが正しく管理される
4. **グローバル衝突回避**: 異なる親を持つ要素同士も適切に配置される

#### 確認方法
1. 複数階層のデータ（parent1-child1, parent2-child2など）で重なりがないか
2. Y座標の値が適切な間隔（要素高さ + 20px）で配置されているか
3. `grandchild2-4` (Y: 290.2) と `重なり` (Y: 297.4) の様な近接要素の分離

