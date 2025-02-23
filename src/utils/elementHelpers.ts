// src/utils/elementHelpers.ts
export const formatElementsForPrompt = (elements: { [key: string]: any }, selectedElementId: string): string => {
    // 型定義を明確化
    type ElementInfo = {
        id: string;
        text: string;
        parentId: string | null;
        depth: number;
    };

    const elementMap: { [key: string]: ElementInfo } = {};

    // 要素情報のマッピング
    Object.values(elements).forEach((element: any) => {
        elementMap[element.id] = {
            id: element.id, // idを明示的に追加
            text: element.texts[0] || '',
            parentId: element.parentId,
            depth: element.depth
        };
    });

    // 階層構造取得関数
    const getHierarchy = (elementId: string): string[] => {
        const path: string[] = [];
        let currentId: string | null = elementId;
        while (currentId) {
            const element: ElementInfo | undefined = elementMap[currentId];
            if (!element) break;
            path.unshift(element.text);
            currentId = element.parentId;
        }
        return path;
    };

    // ツリー構築関数
    const buildTree = (parentId: string | null, depth: number): string[] => {
        return Object.values(elementMap)
            .filter((e): e is ElementInfo => e.parentId === parentId)
            .sort((a, b) => a.depth - b.depth)
            .flatMap(element => {
                const indent = '  '.repeat(element.depth - 1);
                const node = `${indent}- ${element.text}${element.id === selectedElementId ? ' (selected)' : ''}`;
                const children = buildTree(element.id, depth + 1);
                return [node, ...children];
            });
    };

    return buildTree(null, 0).join('\n');
};