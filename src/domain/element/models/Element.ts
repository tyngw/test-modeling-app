// src/domain/element/models/Element.ts

/**
 * 要素の方向タイプ
 */
export type DirectionType = 'right' | 'left' | 'none';

/**
 * マーカータイプ
 */
export type MarkerType =
  | 'arrow'
  | 'filled_arrow'
  | 'circle'
  | 'filled_circle'
  | 'square'
  | 'filled_square'
  | 'diamond'
  | 'filled_diamond'
  | 'none';

/**
 * 要素のドメインモデル
 */
export class Element {
  constructor(
    public readonly id: string,
    public readonly texts: string[],
    public readonly x: number,
    public readonly y: number,
    public readonly width: number,
    public readonly height: number,
    public readonly sectionHeights: number[],
    public readonly editing: boolean,
    public readonly selected: boolean,
    public readonly visible: boolean,
    public readonly tentative: boolean,
    public readonly startMarker: MarkerType,
    public readonly endMarker: MarkerType,
    public readonly direction: DirectionType,
    public readonly tempParentId?: string | null,
  ) {}

  /**
   * 要素が選択されているかどうか
   */
  isSelected(): boolean {
    return this.selected;
  }

  /**
   * 要素が編集中かどうか
   */
  isEditing(): boolean {
    return this.editing;
  }

  /**
   * 要素が仮置き状態かどうか
   */
  isTentative(): boolean {
    return this.tentative;
  }

  /**
   * 要素が表示されているかどうか
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * 要素のテキストを取得
   */
  getTexts(): string[] {
    return [...this.texts];
  }

  /**
   * 要素の主要テキストを取得（最初のテキスト）
   */
  getPrimaryText(): string {
    return this.texts[0] || '';
  }

  /**
   * 要素のテキストが指定されたテキストを含むかどうか
   */
  containsText(searchText: string): boolean {
    return this.texts.some((text) => text.includes(searchText));
  }

  /**
   * 要素の位置情報を取得
   */
  getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * 要素のサイズ情報を取得
   */
  getSize(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * 要素を選択状態に変更
   */
  select(): Element {
    return new Element(
      this.id,
      this.texts,
      this.x,
      this.y,
      this.width,
      this.height,
      this.sectionHeights,
      this.editing,
      true, // selected
      this.visible,
      this.tentative,
      this.startMarker,
      this.endMarker,
      this.direction,
      this.tempParentId,
    );
  }

  /**
   * 要素の選択を解除
   */
  deselect(): Element {
    return new Element(
      this.id,
      this.texts,
      this.x,
      this.y,
      this.width,
      this.height,
      this.sectionHeights,
      this.editing,
      false, // selected
      this.visible,
      this.tentative,
      this.startMarker,
      this.endMarker,
      this.direction,
      this.tempParentId,
    );
  }

  /**
   * 要素のテキストを更新
   */
  updateText(index: number, newText: string): Element {
    const newTexts = [...this.texts];
    newTexts[index] = newText;

    return new Element(
      this.id,
      newTexts,
      this.x,
      this.y,
      this.width,
      this.height,
      this.sectionHeights,
      this.editing,
      this.selected,
      this.visible,
      this.tentative,
      this.startMarker,
      this.endMarker,
      this.direction,
      this.tempParentId,
    );
  }

  /**
   * 要素を仮置き状態に変更
   */
  makeTentative(): Element {
    return new Element(
      this.id,
      this.texts,
      this.x,
      this.y,
      this.width,
      this.height,
      this.sectionHeights,
      this.editing,
      this.selected,
      this.visible,
      true, // tentative
      this.startMarker,
      this.endMarker,
      this.direction,
      this.tempParentId,
    );
  }

  /**
   * 要素の仮置き状態を解除
   */
  confirmTentative(): Element {
    return new Element(
      this.id,
      this.texts,
      this.x,
      this.y,
      this.width,
      this.height,
      this.sectionHeights,
      this.editing,
      this.selected,
      this.visible,
      false, // tentative
      this.startMarker,
      this.endMarker,
      this.direction,
      this.tempParentId,
    );
  }
}
