import { Element } from '../types/types';
import { OFFSET, DEFAULT_POSITION, SIZE, ELEMENT_DIRECTIONS } from '../constants/elementSettings';
import { debugLog } from './debugLogHelpers';
import { getChildren } from './elementHelpers';

type ElementsMap = { [key: string]: Element };

// 方向ごとのY座標を追跡する型定義
type DirectionYPositions = {
    [ELEMENT_DIRECTIONS.RIGHT]: number;
    [ELEMENT_DIRECTIONS.LEFT]: number;
    [ELEMENT_DIRECTIONS.NONE]: number;
};

const layoutNodeByDirection = (
    node: Element,
    elements: ElementsMap,
    startY: number,
    depth: number,
    getNumberOfSections: () => number,
    layoutMode: string = 'default',
    currentYbyDirection: DirectionYPositions
): { newY: number } => {
    debugLog(`[layoutNodeByDirection]「${node.texts}」 id=${node.id}, depth=${depth}, startY=${startY}, direction=${node.direction}, layoutMode=${layoutMode} ---`);

    // X座標の計算
    if (node.parentId === null) {
        node.x = DEFAULT_POSITION.X;
    } else {
        const parent = elements[node.parentId];
        // direction に応じてXオフセットの符号を決定
        const xOffsetMultiplier = node.direction === ELEMENT_DIRECTIONS.LEFT ? -1 : 1;
        // 方向に応じて親要素の幅を考慮したX座標計算
        if (node.direction === ELEMENT_DIRECTIONS.LEFT) {
            // 左方向の場合、親要素の左端からオフセットを引く
            node.x = parent.x + (OFFSET.X * xOffsetMultiplier);
        } else {
            // 右方向の場合、親要素の右端にオフセットを加える
            node.x = parent.x + parent.width + OFFSET.X;
        }
    }

    // 子要素を取得し、方向ごとに分離
    const allChildren = getChildren(node.id, elements).sort((a, b) => a.order - b.order);
    
    // 同じ方向を持つ子要素だけをフィルタリング
    const children = allChildren.filter(child => child.direction === node.direction);
    
    debugLog(`children=${children.length} (同じ方向のみ)`);
    
    let currentY = startY;
    let maxChildBottom = startY;

    if (children.length > 0) {
        const defaultHeight = SIZE.SECTION_HEIGHT * getNumberOfSections();
        const requiredOffset = Math.max((node.height - defaultHeight) * 0.5, OFFSET.Y);
        currentY = currentY + requiredOffset;

        for (const child of children) {
            // 子要素のレイアウトも同じ方向ごとのY座標を使用
            const result = layoutNodeByDirection(
                child, 
                elements, 
                currentY, 
                depth + 1, 
                getNumberOfSections, 
                layoutMode,
                currentYbyDirection
            );
            currentY = result.newY + OFFSET.Y;
            maxChildBottom = Math.max(maxChildBottom, result.newY);
        }

        if (children.length >= 2) {
            const firstChild = children[0];
            const lastChild = children[children.length - 1];
            const childrenMidY = (firstChild.y + lastChild.y + lastChild.height) / 2;
            node.y = childrenMidY - node.height / 2;
        } else if (children.length === 1) {
            // 子要素が1つの場合、親要素は子要素と同じ高さに配置
            const child = children[0];
            node.y = child.y + (child.height - node.height) / 2;
        } else {
            node.y = startY;
        }

        // Use maxChildBottom to ensure we don't overlap with any children
        currentY = Math.max(maxChildBottom, node.y + node.height);
        debugLog(`[layoutNodeByDirection](子要素あり)「${node.texts}」 id=${node.id}, y=${node.y}, maxChildBottom=${maxChildBottom}, finalY=${currentY}`);
        
        // 他の方向の子要素があれば、それも処理
        const otherDirectionChildren = allChildren.filter(child => child.direction !== node.direction);
        if (otherDirectionChildren.length > 0) {
            debugLog(`別方向の子要素が${otherDirectionChildren.length}個あります`);
            
            for (const child of otherDirectionChildren) {
                // 子要素の方向に対応するY座標を使用
                const childDirection = child.direction;
                const childStartY = currentYbyDirection[childDirection];
                
                const result = layoutNodeByDirection(
                    child, 
                    elements, 
                    childStartY, 
                    depth + 1, 
                    getNumberOfSections, 
                    layoutMode,
                    currentYbyDirection
                );
                
                // その方向のY座標を更新
                currentYbyDirection[childDirection] = result.newY + OFFSET.Y;
            }
        }
        
        return { newY: currentY };
    } else {
        node.y = startY;
        currentY = startY + node.height;
        debugLog(`[layoutNodeByDirection](子要素なし)「${node.texts}」 id=${node.id}, y=${node.y}, newY=${currentY}`);
        return { newY: currentY };
    }
};

export const adjustElementPositions = (
    elements: ElementsMap,
    getNumberOfSections: () => number,
    getLayoutMode: () => string = () => 'default'
): ElementsMap => {
    debugLog(`adjustElementPositions開始: 要素数=${Object.keys(elements).length}`);
    
    const updatedElements = { ...elements };
    const rootElements = getChildren(null, updatedElements)
        .sort((a, b) => a.order - b.order);
    
    // 方向ごとに別々のY座標を追跡
    const currentYbyDirection: DirectionYPositions = {
        [ELEMENT_DIRECTIONS.RIGHT]: DEFAULT_POSITION.Y,
        [ELEMENT_DIRECTIONS.LEFT]: DEFAULT_POSITION.Y,
        [ELEMENT_DIRECTIONS.NONE]: DEFAULT_POSITION.Y
    };
    
    const layoutMode = getLayoutMode();

    // ルート要素を順番に配置
    for (const root of rootElements) {
        // ルート要素の方向を取得（通常はnoneだが、明示的に指定されている場合もある）
        const rootDirection = root.direction || ELEMENT_DIRECTIONS.NONE;
        
        // 現在の方向に対応するY座標を使用
        const result = layoutNodeByDirection(
            root, 
            updatedElements, 
            currentYbyDirection[rootDirection], 
            0, 
            getNumberOfSections, 
            layoutMode,
            currentYbyDirection
        );
        
        // この方向のY座標を更新
        currentYbyDirection[rootDirection] = result.newY + OFFSET.Y;
    }

    debugLog(`adjustElementPositions終了: レイアウトモード=${layoutMode}`);
    return updatedElements;
};