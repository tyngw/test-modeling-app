// src/types/stateHelpers.ts
import { State } from '../state/state';
import { Element } from './types';
import { ElementsMap } from './elementTypes';

/**
 * 状態を取得するためのコールバック関数の型
 */
export type StateGetter = () => State;

/**
 * 要素の更新関数の型
 */
export type ElementUpdaterFunction = (element: Element, payload: unknown) => Partial<Element>;

/**
 * 要素プロパティをバッチで更新する際の型
 */
export type ElementUpdatesMap = Record<string, Partial<Element>>;

/**
 * 要素の条件フィルター関数の型
 */
export type ElementFilterFunction = (element: Element) => boolean;

/**
 * 位置調整のためのオプション
 */
export interface PositionAdjustmentOptions {
  /** セクション数取得関数 */
  getNumberOfSections?: () => number;
}

/**
 * 状態更新の結果を表す型
 */
export interface StateUpdateResult {
  elements: ElementsMap;
  [key: string]: unknown;
}

/**
 * 選択された要素のアクションハンドラの型
 */
export interface SelectedElementAction {
  (element: Element): Partial<State>;
}

/**
 * 選択された要素のプロパティ更新関数の型
 */
export interface ElementPropertyUpdater<T> {
  (element: Element, payload: T): Partial<Element>;
}

/**
 * 要素のテキスト更新情報の型
 */
export interface TextUpdateInfo {
  id: string;
  index: number;
  value: string;
}
