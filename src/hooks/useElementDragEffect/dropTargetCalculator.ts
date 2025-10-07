/**
 * ドロップターゲット計算ロジック
 *
 * ドラッグ中の要素がドロップ可能な位置を計算する関数群。
 * - 子要素としてのドロップ位置計算
 * - 兄弟要素間のドロップ位置計算
 * - 最適なドロップターゲットの検索
 */

import { Element, DirectionType } from '../../types/types';
import { HierarchicalStructure } from '../../types/hierarchicalTypes';
import { OFFSET } from '../../config/elementSettings';
import { debugLog } from '../../utils/debugLogHelpers';
import {
  getSelectedElementsFromHierarchy,
  findParentNodeInHierarchy,
  getAllVisibleElementsFromHierarchy,
  getChildrenFromHierarchy,
} from '../../utils/hierarchical/hierarchicalConverter';
import { DropTargetInfo } from './types';
import { getChildren, isRootElement } from './hierarchyHelpers';
import { filterDropCandidates, groupElementsByParent } from './candidateFilter';
import { detectGapBetweenElements, detectBottomGap } from './gapDetector';

/**
 * 子要素エリアのドロップ位置を計算
 *
 * 要素の子要素としてドロップする場合の位置を計算します。
 * 方向（left/right）に応じて、適切なX座標を計算します。
 *
 * @param element - ドロップ先の要素
 * @param mouseY - マウスのY座標
 * @param hierarchicalData - 階層構造データ
 * @returns ドロップ位置情報
 */
export const calculateChildPosition = (
  element: Element,
  mouseY: number,
  hierarchicalData: HierarchicalStructure | null,
  draggingElementWidth: number = 0,
): { position: 'child'; insertY: number; insertX?: number } => {
  const elemTop = element.y;
  const children = getChildren(element, hierarchicalData);

  // 要素の方向（ルート要素は特別扱い）
  const direction = element.direction || 'right';
  const isRootInMindmap = isRootElement(element, hierarchicalData);

  // 方向に応じてX座標を計算
  let insertX;
  if (direction === 'left') {
    // 左方向の場合は親幅と要素幅を考慮して左側のスペースを確保
    insertX = element.x - element.width - OFFSET.X - draggingElementWidth;
  } else if (direction === 'right' || isRootInMindmap) {
    // 右方向の場合、またはルート要素の場合（デフォルトで右方向）
    insertX = element.x + element.width + OFFSET.X;
  } else {
    // フォールバック: 右方向
    insertX = element.x + element.width + OFFSET.X;
  }

  // 子要素が存在しない場合は、要素の中央に配置
  if (children.length === 0) {
    return {
      position: 'child',
      insertY: elemTop + element.height / 2,
      insertX,
    };
  }

  // 子要素がある場合でも、常に親要素の中央に配置する
  // これにより、マウス位置に関わらず常に同じ位置にプレビュー表示される
  return {
    position: 'child',
    insertY: elemTop + element.height / 2,
    insertX,
  };
};

/**
 * ドロップ位置計算の結果
 */
export interface PositionAndDistanceResult {
  position: 'child' | 'between';
  distanceSq: number;
  insertY: number;
  insertX?: number;
  siblingInfo?: { prevElement?: Element; nextElement?: Element };
  direction?: DirectionType;
}

/**
 * ドロップ位置と要素中心からの距離を計算
 *
 * マウス位置に基づいて、要素に対するドロップ位置（child/between）と
 * 要素中心からの距離を計算します。
 *
 * @param element - 対象要素
 * @param mouseX - マウスのX座標
 * @param mouseY - マウスのY座標
 * @param hierarchicalData - 階層構造データ
 * @param draggingElement - ドラッグ中の要素
 * @returns ドロップ位置と距離情報
 */
export const calculatePositionAndDistance = (
  element: Element,
  mouseX: number,
  mouseY: number,
  hierarchicalData: HierarchicalStructure | null,
  draggingElement: Element | null,
): PositionAndDistanceResult => {
  const elemTop = element.y;
  const elemBottom = element.y + element.height;
  const elemLeft = element.x;
  const elemRight = element.x + element.width;

  // マインドマップのルート要素（direction: none）の場合は特別扱い
  const isRootInMindmap = isRootElement(element, hierarchicalData);

  const rightSidePadding = isRootInMindmap
    ? OFFSET.X * 2 + (draggingElement?.width ?? 0)
    : OFFSET.X + (draggingElement?.width ?? 0);
  const leftSidePadding = isRootInMindmap
    ? OFFSET.X * 2 + (draggingElement?.width ?? 0)
    : OFFSET.X + (draggingElement?.width ?? 0);

  // 要素の方向を取得
  const direction = element.direction || 'right';

  // 要素の右側/左側にあるかどうかを判定
  const isOnRightSide = mouseX >= elemRight && mouseX < elemRight + rightSidePadding;
  const isOnLeftSide = mouseX <= elemLeft && mouseX > elemLeft - leftSidePadding;

  // 要素の内側にあるかどうかを判定
  const isInsideElement =
    mouseX >= element.x && mouseX < elemRight && mouseY >= elemTop && mouseY <= elemBottom;

  // 要素の右側/左側かつY座標が要素の範囲内かどうかを判定
  const isOnRightSideInYRange = isOnRightSide && mouseY >= elemTop && mouseY <= elemBottom;
  const isOnLeftSideInYRange = isOnLeftSide && mouseY >= elemTop && mouseY <= elemBottom;

  // ルート要素の場合、左右どちらにもドロップ可能
  const isOnValidSide =
    (isRootInMindmap && (isOnRightSideInYRange || isOnLeftSideInYRange)) ||
    (direction === 'right' && isOnRightSideInYRange) ||
    (direction === 'left' && isOnLeftSideInYRange);

  if (isRootInMindmap) {
    debugLog(`[Root calc] isOnValidSide: ${isOnValidSide}, direction: ${direction}`);
  }

  let result: {
    position: 'child' | 'between';
    insertY: number;
    insertX?: number;
    siblingInfo?: { prevElement?: Element; nextElement?: Element };
    direction?: DirectionType;
  };

  // 要素の上にある場合は子要素として追加 (child mode)
  // これを最優先で処理して、要素上のドラッグは常にchildモードになるようにする
  if (isInsideElement) {
    result = calculateChildPosition(element, mouseY, hierarchicalData, draggingElement?.width ?? 0);
    // 要素の方向を設定（ルート要素の場合は、マウス位置で左右を判定）
    if (isRootInMindmap) {
      // ルート要素の場合、マウスのX座標で左右を判定し、挿入位置も更新
      const rootCenterX = element.x + element.width / 2;
      const resolvedDirection = mouseX < rootCenterX ? 'left' : 'right';
      result.direction = resolvedDirection;
      result.insertX =
        resolvedDirection === 'left'
          ? element.x - element.width - OFFSET.X - (draggingElement?.width ?? 0)
          : element.x + element.width + OFFSET.X;
    } else {
      // 通常の要素の場合は親の方向を継承（'none'でない場合）し、左方向時はX座標を調整
      const resolvedDirection = element.direction !== 'none' ? element.direction : 'right';
      result.direction = resolvedDirection;
      if (resolvedDirection === 'left') {
        result.insertX = element.x - element.width - OFFSET.X - (draggingElement?.width ?? 0);
      }
    }
    debugLog(`Drop position mode (inside element ${element.id}):`, 'child');
    debugLog(
      `[Inside element] Element ${element.id} - direction: ${result.direction}, insertX: ${result.insertX}`,
    );
  } else if (isOnValidSide) {
    // 要素の適切な側（方向に応じた）かつY座標範囲内の場合 (between mode)
    const children = getChildren(element, hierarchicalData);

    // ルート要素（direction: none）の場合、ドロップ位置に応じて子要素の方向を決定
    let childDirection: DirectionType = direction;
    if (isRootInMindmap) {
      childDirection = isOnLeftSideInYRange ? 'left' : 'right';
      debugLog(
        `[childDirection calculation] isOnLeftSideInYRange: ${isOnLeftSideInYRange}, childDirection: ${childDirection}`,
      );
    }

    if (children.length === 0) {
      // 子要素がない場合は、要素の子として追加 (childモード同様の挙動)
      // 位置は子要素モードと同じく、要素の側に表示
      const insertX =
        childDirection === 'left'
          ? element.x - element.width - OFFSET.X - (draggingElement?.width ?? 0)
          : element.x + element.width + OFFSET.X;

      // ルート要素で子要素なしの場合の位置計算完了

      result = {
        position: 'child', // betweenからchildに変更: 子要素として追加するため
        insertY: element.y + element.height / 2,
        insertX,
        siblingInfo: {}, // siblingInfoは保持
        direction: childDirection,
      };
      debugLog(`Drop position mode (${childDirection} side, no children):`, 'child');
    } else {
      // 子要素がある場合は、子要素の間に挿入
      const insertX =
        childDirection === 'left'
          ? element.x - element.width - OFFSET.X - (draggingElement?.width ?? 0)
          : element.x + element.width + OFFSET.X;

      // ルート要素の場合は、betweenモードではなくchildモードを使用
      if (isRootInMindmap) {
        result = {
          position: 'child',
          insertY: element.y + element.height / 2,
          insertX,
          siblingInfo: {},
          direction: childDirection,
        };
        debugLog(`Drop position mode (${childDirection} side, root with children):`, 'child');
        debugLog(`[Root result] direction set to: ${childDirection}, insertX: ${insertX}`);
      } else {
        let prevElement: Element | undefined;
        let nextElement: Element | undefined;

        // 同じ方向の子要素のみをフィルタリング（ルート要素の場合）
        const directionFilteredChildren = isRootInMindmap
          ? children.filter((child) => child.direction === childDirection)
          : children;

        // マウス位置に最も近い子要素を見つける
        for (let i = 0; i < directionFilteredChildren.length; i++) {
          const child = directionFilteredChildren[i];
          if (mouseY < child.y) {
            nextElement = child;
            if (i > 0) prevElement = directionFilteredChildren[i - 1];
            break;
          } else if (mouseY < child.y + child.height) {
            const midpoint = child.y + child.height / 2;
            if (mouseY < midpoint) {
              nextElement = child;
              if (i > 0) prevElement = directionFilteredChildren[i - 1];
            } else {
              prevElement = child;
              if (i < directionFilteredChildren.length - 1)
                nextElement = directionFilteredChildren[i + 1];
            }
            break;
          } else if (
            i === directionFilteredChildren.length - 1 ||
            mouseY < directionFilteredChildren[i + 1].y
          ) {
            prevElement = child;
            if (i < directionFilteredChildren.length - 1)
              nextElement = directionFilteredChildren[i + 1];
            break;
          }
        }

        if (prevElement && nextElement) {
          // 2つの子要素の間
          const gap = nextElement.y - (prevElement.y + prevElement.height);
          result = {
            position: 'between',
            insertY: prevElement.y + prevElement.height + gap / 2,
            insertX,
            siblingInfo: { prevElement, nextElement },
            direction: childDirection,
          };
        } else if (prevElement) {
          // 最後の子要素の後
          result = {
            position: 'between',
            insertY: prevElement.y + prevElement.height + OFFSET.Y,
            insertX,
            siblingInfo: { prevElement },
            direction: childDirection,
          };
        } else if (nextElement) {
          // 最初の子要素の前
          result = {
            position: 'between',
            insertY: nextElement.y - OFFSET.Y,
            insertX,
            siblingInfo: { nextElement },
            direction: childDirection,
          };
        } else {
          // このケースは通常発生しないはず
          result = {
            position: 'between',
            insertY: element.y + element.height / 2,
            insertX,
            siblingInfo: {},
            direction: childDirection,
          };
        }

        debugLog(`Drop position mode (${childDirection} side, with children):`, 'between');
      }
    }
  } else if (
    isRootInMindmap ||
    !hierarchicalData ||
    !findParentNodeInHierarchy(hierarchicalData, element.id)
  ) {
    // ルート要素の場合は兄弟判定をスキップし、デフォルトのchild位置を返す
    debugLog(`[Root element ${element.id}] Not on valid side, using default child position`);

    // ルート要素の場合、マウス位置で左右を判定
    let childDirection: DirectionType = 'right';
    if (isRootInMindmap) {
      const rootCenterX = element.x + element.width / 2;
      childDirection = mouseX < rootCenterX ? 'left' : 'right';
    } else {
      // 通常の要素の場合は親の方向を継承（'none'でない場合）
      childDirection = element.direction !== 'none' ? element.direction : 'right';
    }

    const fallbackInsertX =
      childDirection === 'left'
        ? element.x - element.width - OFFSET.X - (draggingElement?.width ?? 0)
        : element.x + element.width + OFFSET.X;

    result = {
      position: 'child',
      insertY: element.y + element.height / 2,
      insertX: fallbackInsertX,
      siblingInfo: {},
      direction: childDirection,
    };
  } else {
    // 同じ親を持つ要素（兄弟要素）を取得
    const draggingElementId = draggingElement?.id;
    const elementParentNode = hierarchicalData
      ? findParentNodeInHierarchy(hierarchicalData, element.id)
      : null;

    // 同一親を持つ兄弟要素を取得（階層構造ベース）
    const parentId = elementParentNode?.data.id || null;

    // parentIdがnullの場合（ルート要素の兄弟）は、betweenモードを使用しない
    if (!parentId) {
      debugLog(`[Sibling of root element ${element.id}] Skipping between mode for root siblings`);
      result = {
        position: 'child',
        insertY: element.y + element.height / 2,
        insertX: element.x + element.width + OFFSET.X,
        siblingInfo: {},
        direction: element.direction || 'right',
      };
    } else {
      const siblings = getChildrenFromHierarchy(hierarchicalData, parentId)
        .filter((el) => el.visible && el.id !== draggingElementId)
        .sort((a, b) => a.y - b.y);

      debugLog(
        `[calculatePositionAndDistance] Found ${siblings.length} siblings (excluding dragging element) for element ${element.id}`,
      );

      // 兄弟要素間の位置を計算
      let prevElement: Element | null = null;
      let nextElement: Element | null = null;

      for (let i = 0; i < siblings.length; i++) {
        const current = siblings[i];
        if (current.id === draggingElement?.id) continue; // ドラッグ中の要素自身は無視

        const currentBottom = current.y + current.height;

        if (mouseY < current.y) {
          nextElement = current;
          if (i > 0) prevElement = siblings[i - 1];
          break;
        } else if (mouseY < currentBottom) {
          const midpoint = current.y + current.height / 2;
          if (mouseY < midpoint) {
            nextElement = current;
            if (i > 0) prevElement = siblings[i - 1];
          } else {
            prevElement = current;
            if (i < siblings.length - 1) nextElement = siblings[i + 1];
          }
          break;
        } else {
          prevElement = current;
          if (i < siblings.length - 1) nextElement = siblings[i + 1];
        }
      }

      // between位置の計算 - 兄弟要素のdirectionを考慮してX座標を設定
      let insertX: number;
      let siblingDirection: DirectionType = 'right'; // デフォルト値

      // 兄弟要素のdirectionを取得（prevElementまたはnextElementから）
      if (prevElement && prevElement.direction) {
        siblingDirection = prevElement.direction;
      } else if (nextElement && nextElement.direction) {
        siblingDirection = nextElement.direction;
      } else if (element.direction && element.direction !== 'none') {
        siblingDirection = element.direction;
      }

      // directionに基づいてX座標を計算
      const parentNodeForInsert = hierarchicalData
        ? findParentNodeInHierarchy(hierarchicalData, element.id)
        : null;
      const parentElement = parentNodeForInsert ? parentNodeForInsert.data : null;

      // 親要素が存在する場合のみX座標を計算（ルート要素の兄弟の場合は親がないのでここには来ない）
      if (parentElement) {
        insertX =
          siblingDirection === 'left'
            ? parentElement.x - parentElement.width - OFFSET.X - (draggingElement?.width ?? 0)
            : parentElement.x + parentElement.width + OFFSET.X;
      } else {
        // このケースは上記のparentIdチェックで既に除外されているはず
        debugLog(`[Warning] Unexpected case: sibling element without parent`);
        insertX = element.x + element.width + OFFSET.X;
      }

      if (prevElement && nextElement) {
        // 2つの要素の間
        const gap = nextElement.y - (prevElement.y + prevElement.height);
        result = {
          position: 'between',
          insertY: prevElement.y + prevElement.height + gap / 2,
          insertX,
          siblingInfo: { prevElement, nextElement },
          direction: siblingDirection,
        };
      } else if (prevElement) {
        // 最後の要素の後
        result = {
          position: 'between',
          insertY: prevElement.y + prevElement.height + OFFSET.Y,
          insertX,
          siblingInfo: { prevElement },
          direction: siblingDirection,
        };
      } else if (nextElement) {
        // 最初の要素の前
        result = {
          position: 'between',
          insertY: nextElement.y - OFFSET.Y,
          insertX,
          siblingInfo: { nextElement },
          direction: siblingDirection,
        };
      } else {
        // 要素が1つしかない場合や、ドラッグ中の要素のみの場合
        result = {
          position: 'between',
          insertY: element.y + element.height + OFFSET.Y,
          insertX,
          siblingInfo: {},
          direction: siblingDirection,
        };
      }

      debugLog(
        `Drop position mode (between siblings) - direction: ${siblingDirection}, insertX: ${insertX}`,
        'between',
      );
    }
  }

  // 要素中心からの距離を計算
  const centerX = element.x + element.width / 2;
  const centerY = element.y + element.height / 2;
  const dx = mouseX - centerX;
  const dy = mouseY - centerY;
  const distanceSq = dx * dx + dy * dy;

  // デバッグログ: 詳細な判定情報を出力
  debugLog(
    `[Position calc] Element ${element.id}: mouseInside=${isInsideElement}, onValidSide=${isOnValidSide}, position=${result.position}, distanceSq=${distanceSq.toFixed(2)}`,
  );

  if (isRootInMindmap) {
    debugLog(
      `[Root calc] Final result - position: ${result.position}, distanceSq: ${distanceSq}, insertY: ${result.insertY}, direction: ${result.direction}`,
    );
  }

  return { ...result, distanceSq };
};

/**
 * ドロップターゲット検索のパラメータ
 */
export interface FindDropTargetParams {
  event: MouseEvent | TouchEvent;
  draggingElement: Element | null;
  hierarchicalData: HierarchicalStructure | null;
  zoomRatio: number;
  convertToZoomCoordinates: (
    e: MouseEvent | TouchEvent,
    zoomRatio: number,
  ) => { x: number; y: number };
}

/**
 * 最適なドロップターゲットを検索
 *
 * マウス位置から最も適切なドロップターゲットを見つけます。
 * ルート要素の左右、子要素間のギャップ、通常の要素など、
 * 様々なケースを考慮してドロップ可能な位置を判定します。
 *
 * @param params - 検索パラメータ
 * @returns ドロップターゲット情報（見つからない場合はnull）
 */
export const findDropTarget = (params: FindDropTargetParams): DropTargetInfo => {
  const {
    event: e,
    draggingElement,
    hierarchicalData,
    zoomRatio,
    convertToZoomCoordinates,
  } = params;

  if (!draggingElement) return null;

  const zoomAdjustedPos = convertToZoomCoordinates(e, zoomRatio);
  const mouseX = zoomAdjustedPos.x;
  const mouseY = zoomAdjustedPos.y;

  // 選択中の全要素のIDリストを階層構造から取得
  const selectedElements = hierarchicalData
    ? getSelectedElementsFromHierarchy(hierarchicalData)
    : [];
  const selectedElementIds = selectedElements.map((el: Element) => el.id);

  // ルート要素を階層構造から取得
  const rootElement = hierarchicalData?.root?.data || null;

  // マウス位置からドロップ先の方向を判定
  const draggingDirection = draggingElement?.direction || 'right';
  let targetDirection: 'left' | 'right' =
    draggingDirection === 'none' ? 'right' : (draggingDirection as 'left' | 'right');
  if (rootElement) {
    const rootCenterX = rootElement.x + rootElement.width / 2;
    targetDirection = mouseX < rootCenterX ? 'left' : 'right';
    debugLog(
      `[Direction detection] mouse(${mouseX}), rootCenter(${rootCenterX}), targetDirection: ${targetDirection}`,
    );
  }

  // 候補となる要素をフィルタリング
  const allElements = getAllVisibleElementsFromHierarchy(hierarchicalData);
  const candidates = filterDropCandidates(
    allElements,
    selectedElementIds,
    mouseX,
    mouseY,
    draggingElement,
    hierarchicalData,
    rootElement,
    targetDirection,
  );

  // 要素を親IDでグループ化
  const elementsByParent = groupElementsByParent(allElements, selectedElementIds, hierarchicalData);

  // ギャップ検出パラメータ
  const gapParams = {
    mouseX,
    mouseY,
    draggingElement,
    hierarchicalData,
    elementsByParent,
    targetDirection,
  };

  // 要素間のギャップを検出（最優先）
  const gapTarget = detectGapBetweenElements(gapParams);
  if (gapTarget) return gapTarget;

  // グループ最下部のギャップを検出
  const bottomTarget = detectBottomGap(gapParams);
  if (bottomTarget) return bottomTarget;

  // 要素間空間が見つからなかった場合、通常の候補要素による検索を実行

  let closestTarget: DropTargetInfo = null;
  let minSquaredDistance = Infinity;

  for (const element of candidates) {
    const { position, distanceSq, insertY, insertX, siblingInfo, direction } =
      calculatePositionAndDistance(element, mouseX, mouseY, hierarchicalData, draggingElement);

    // ルート要素への左側または右側のドロップには優先度を与える
    const isRootElement =
      element.direction === 'none' &&
      hierarchicalData &&
      findParentNodeInHierarchy(hierarchicalData, element.id) === null;

    // ルート要素の場合、betweenはルート要素の子要素間のみ許可
    // siblingInfoにprevElementまたはnextElementがあり、その親がルート要素でない場合は除外
    let isValidRootSideDrop = false;
    if (isRootElement) {
      if (position === 'child') {
        isValidRootSideDrop = true;
      } else if (position === 'between' && siblingInfo) {
        // betweenの場合、兄弟要素がルート要素の子要素であることを確認
        const sibling = siblingInfo.prevElement || siblingInfo.nextElement;
        if (sibling && hierarchicalData) {
          const siblingParent = findParentNodeInHierarchy(hierarchicalData, sibling.id);
          // 兄弟要素の親がルート要素（element）である場合のみ許可
          isValidRootSideDrop = siblingParent?.data.id === element.id;
        }
      }
    }

    debugLog(
      `[findDropTarget] Checking element ${element.id}, isRoot: ${isRootElement}, position: ${position}, distance: ${distanceSq}`,
    );

    if (isValidRootSideDrop) {
      debugLog(
        `[findDropTarget] PRIORITY: Valid root side drop detected for element ${element.id}, position: ${position}`,
      );
      // ルート要素への側面ドロップは最高優先度
      closestTarget = { element, position, insertY, insertX, siblingInfo, direction };
      debugLog(`[findDropTarget] Root side drop - direction: ${direction}, insertX: ${insertX}`);
      break; // ルート要素が見つかったら即座に選択
    } else if (distanceSq < minSquaredDistance) {
      minSquaredDistance = distanceSq;
      closestTarget = { element, position, insertY, insertX, siblingInfo, direction };
      debugLog(
        `[findDropTarget] New closest: ${element.id}, distance: ${distanceSq}, direction: ${direction}`,
      );
    }
  }

  if (closestTarget) {
    debugLog(
      `[findDropTarget] Final selection: ${closestTarget.element.id}, position: ${closestTarget.position}, direction: ${closestTarget.direction}`,
    );
  } else {
    debugLog(`[findDropTarget] No drop target found in candidates`);

    // 候補が見つからない場合、ルート要素への直接ドロップを検討
    if (rootElement) {
      const rootCenterX = rootElement.x + rootElement.width / 2;
      const dropAreaTop = rootElement.y - OFFSET.Y;
      const dropAreaBottom = rootElement.y + rootElement.height + OFFSET.Y;

      // 左側領域への直接ドロップ
      const leftAreaLeft = rootElement.x - OFFSET.X * 2 - (draggingElement?.width ?? 0);
      const leftAreaRight = rootCenterX;

      // 右側領域への直接ドロップ
      const rightAreaLeft = rootCenterX;
      const rightAreaRight =
        rootElement.x + rootElement.width + OFFSET.X * 2 + (draggingElement?.width ?? 0);

      if (mouseY >= dropAreaTop && mouseY <= dropAreaBottom) {
        if (mouseX >= leftAreaLeft && mouseX <= leftAreaRight) {
          // 左側領域への直接ドロップ
          debugLog(`[findDropTarget] Direct drop to root left area`);
          return {
            element: rootElement,
            position: 'child',
            insertY: rootElement.y + rootElement.height / 2,
            insertX: rootElement.x - rootElement.width - OFFSET.X - (draggingElement?.width ?? 0),
            direction: 'left',
          };
        } else if (mouseX >= rightAreaLeft && mouseX <= rightAreaRight) {
          // 右側領域への直接ドロップ
          debugLog(`[findDropTarget] Direct drop to root right area`);
          return {
            element: rootElement,
            position: 'child',
            insertY: rootElement.y + rootElement.height / 2,
            insertX: rootElement.x + rootElement.width + OFFSET.X,
            direction: 'right',
          };
        }
      }
    }

    debugLog(`[findDropTarget] No valid drop target found`);
  }

  return closestTarget;
};
