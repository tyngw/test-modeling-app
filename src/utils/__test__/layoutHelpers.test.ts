// src/utils/__test__/layoutHelpers.test.ts
import { adjustElementPositionsFromHierarchy } from '../layoutHelpers';
import { HierarchicalStructure, HierarchicalNode } from '../../types/hierarchicalTypes';
import { Element } from '../../types/types';

// Helper function to check if two rectangles overlap
const doElementsOverlap = (
  e1: Element,
  e2: Element,
  minGap: number = 0,
): boolean => {
  // Check if horizontal ranges overlap
  const horizontalOverlap =
    e1.x < e2.x + e2.width + minGap && e1.x + e1.width + minGap > e2.x;

  // Check if vertical ranges overlap
  const verticalOverlap =
    e1.y < e2.y + e2.height + minGap && e1.y + e1.height + minGap > e2.y;

  return horizontalOverlap && verticalOverlap;
};

// Helper function to collect all elements from hierarchical structure
const collectAllElements = (hierarchical: HierarchicalStructure): Element[] => {
  const elements: Element[] = [];

  const traverse = (node: HierarchicalNode) => {
    elements.push(node.data);
    if (node.children) {
      node.children.forEach(traverse);
    }
  };

  traverse(hierarchical.root);
  return elements;
};

// Helper function to find all overlapping pairs
const findOverlappingPairs = (
  elements: Element[],
  minGap: number = 0,
): Array<{ e1: Element; e2: Element }> => {
  const overlaps: Array<{ e1: Element; e2: Element }> = [];

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      if (doElementsOverlap(elements[i], elements[j], minGap)) {
        overlaps.push({ e1: elements[i], e2: elements[j] });
      }
    }
  }

  return overlaps;
};

// Helper function to create a basic element
const createElement = (
  id: string,
  texts: string[] = ['text'],
  width: number = 50,
  height: number = 24.4,
): Element => ({
  id,
  texts,
  x: 0,
  y: 0,
  width,
  height,
  sectionHeights: [height],
  editing: false,
  selected: false,
  visible: true,
  tentative: false,
  startMarker: 'none',
  endMarker: 'none',
  direction: 'right',
  parentId: null,
});

// Mock getNumberOfSections function
const getNumberOfSections = () => 3;

describe('Layout Helpers - Element Overlap Prevention', () => {
  describe('adjustElementPositionsFromHierarchy', () => {
    test('should not produce overlapping elements for the reported problematic JSON', () => {
      // The exact JSON that was reported as having overlap issues
      const problematicData: HierarchicalStructure = {
        version: '1.0.0',
        root: {
          data: {
            id: '1',
            texts: ['root'],
            x: 50,
            y: 50,
            width: 50,
            height: 24.4,
            sectionHeights: [24.4],
            editing: false,
            selected: false,
            visible: true,
            tentative: false,
            startMarker: 'none',
            endMarker: 'none',
            direction: 'right',
            parentId: null,
          },
          children: [
            {
              data: {
                id: '1763856268586qtp44a857',
                texts: ['child'],
                x: 200,
                y: 50,
                width: 50,
                height: 24.4,
                sectionHeights: [24.4],
                editing: false,
                selected: false,
                visible: true,
                tentative: false,
                startMarker: 'none',
                endMarker: 'none',
                direction: 'right',
                parentId: 'dd2be669-82de-4a8b-9d1b-443241281566',
              },
              children: [
                {
                  data: {
                    id: '1763856268586epk453ksv',
                    texts: [
                      'B-Park-004-R001-A002: 連続タッチ時でも、操作が正しく処理されることを確認する',
                    ],
                    x: 350,
                    y: -23.999999999999986,
                    width: 300,
                    height: 69.19999999999999,
                    sectionHeights: [69.19999999999999],
                    editing: false,
                    selected: false,
                    visible: true,
                    tentative: false,
                    startMarker: 'none',
                    endMarker: 'none',
                    direction: 'right',
                    parentId: '51fa9883-4c7d-41a7-a782-c2701ad41248',
                  },
                  children: [
                    {
                      data: {
                        id: '17638562685869dp2c4600',
                        texts: ['ユーザーインタラクションの正確性'],
                        x: 750,
                        y: -1.5999999999999943,
                        width: 262,
                        height: 24.4,
                        sectionHeights: [24.4],
                        editing: false,
                        selected: false,
                        visible: true,
                        tentative: false,
                        startMarker: 'none',
                        endMarker: 'none',
                        direction: 'right',
                        parentId: '8af2070a-1e14-46a5-86ce-49cb7cad52c5',
                      },
                      children: [
                        {
                          data: {
                            id: '176385626858666nigjy7d',
                            texts: ['入力処理メカニズム'],
                            x: 1112,
                            y: -27.39999999999999,
                            width: 150,
                            height: 24.4,
                            sectionHeights: [24.4],
                            editing: false,
                            selected: false,
                            visible: true,
                            tentative: false,
                            startMarker: 'none',
                            endMarker: 'none',
                            direction: 'right',
                            parentId: '2987b552-5b65-407f-9b5c-b896dca2fa39',
                          },
                          children: [
                            {
                              data: {
                                id: '1763856268586bi17ukj4f',
                                texts: ['入力キューイング'],
                                x: 1362,
                                y: -27.39999999999999,
                                width: 134,
                                height: 24.4,
                                sectionHeights: [24.4],
                                editing: false,
                                selected: false,
                                visible: true,
                                tentative: false,
                                startMarker: 'none',
                                endMarker: 'none',
                                direction: 'right',
                                parentId: '1d56932b-6477-44ed-b4dc-c54329e10151',
                              },
                              children: [],
                            },
                          ],
                        },
                        {
                          data: {
                            id: '1763856268586ou6xfahux',
                            texts: ['枚数指定処理の整合性'],
                            x: 1112,
                            y: 24.200000000000017,
                            width: 166,
                            height: 24.4,
                            sectionHeights: [24.4],
                            editing: false,
                            selected: false,
                            visible: true,
                            tentative: false,
                            startMarker: 'none',
                            endMarker: 'none',
                            direction: 'right',
                            parentId: '2987b552-5b65-407f-9b5c-b896dca2fa39',
                          },
                          children: [
                            {
                              data: {
                                id: '1763856268586pf2fuic7i',
                                texts: ['意図した操作回数の正確なカウント'],
                                x: 1378,
                                y: 7.000000000000014,
                                width: 262,
                                height: 24.4,
                                sectionHeights: [24.4],
                                editing: false,
                                selected: false,
                                visible: true,
                                tentative: false,
                                startMarker: 'none',
                                endMarker: 'none',
                                direction: 'right',
                                parentId: 'cadf8174-deda-4264-83a9-d235c8398111',
                              },
                              children: [],
                            },
                            {
                              data: {
                                id: '1763856268586k4ig5dn10',
                                texts: ['誤入力の防止'],
                                x: 1378,
                                y: 41.40000000000002,
                                width: 102,
                                height: 24.4,
                                sectionHeights: [24.4],
                                editing: false,
                                selected: false,
                                visible: true,
                                tentative: false,
                                startMarker: 'none',
                                endMarker: 'none',
                                direction: 'right',
                                parentId: 'cadf8174-deda-4264-83a9-d235c8398111',
                              },
                              children: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  data: {
                    id: '1763856268586szexs4jh1',
                    texts: [
                      'B-Park-004-R002-A001: 大量枚数購入時でも、金額計算が正確に行われることを確認する',
                    ],
                    x: 350,
                    y: 79.20000000000003,
                    width: 300,
                    height: 69.19999999999999,
                    sectionHeights: [69.19999999999999],
                    editing: false,
                    selected: false,
                    visible: true,
                    tentative: false,
                    startMarker: 'none',
                    endMarker: 'none',
                    direction: 'right',
                    parentId: '51fa9883-4c7d-41a7-a782-c2701ad41248',
                  },
                  children: [
                    {
                      data: {
                        id: '1763856268586ucunyxn0g',
                        texts: ['金額計算の正確性保証'],
                        x: 750,
                        y: 101.60000000000001,
                        width: 166,
                        height: 24.4,
                        sectionHeights: [24.4],
                        editing: false,
                        selected: false,
                        visible: true,
                        tentative: false,
                        startMarker: 'none',
                        endMarker: 'none',
                        direction: 'right',
                        parentId: 'fec1eb1a-7713-417c-820d-61bf6d24255b',
                      },
                      children: [
                        {
                          data: {
                            id: '1763856268586r444l0zdq',
                            texts: ['演算処理の信頼性'],
                            x: 1016,
                            y: 32.800000000000026,
                            width: 134,
                            height: 24.4,
                            sectionHeights: [24.4],
                            editing: false,
                            selected: false,
                            visible: true,
                            tentative: false,
                            startMarker: 'none',
                            endMarker: 'none',
                            direction: 'right',
                            parentId: 'fa0b4b37-e6e4-42ab-a2c0-02834c8283c2',
                          },
                          children: [
                            {
                              data: {
                                id: '1763856268586zqf9s98bu',
                                texts: ['整数演算 vs 浮動小数点演算'],
                                x: 1250,
                                y: 15.600000000000009,
                                width: 207,
                                height: 24.4,
                                sectionHeights: [24.4],
                                editing: false,
                                selected: false,
                                visible: true,
                                tentative: false,
                                startMarker: 'none',
                                endMarker: 'none',
                                direction: 'right',
                                parentId: '11b261f6-0362-4dce-9bc9-7ba99a805ed6',
                              },
                              children: [],
                            },
                            {
                              data: {
                                id: '17638562685864a55jh56s',
                                texts: ['オーバーフロー対策'],
                                x: 1250,
                                y: 50.000000000000014,
                                width: 150,
                                height: 24.4,
                                sectionHeights: [24.4],
                                editing: false,
                                selected: false,
                                visible: true,
                                tentative: false,
                                startMarker: 'none',
                                endMarker: 'none',
                                direction: 'right',
                                parentId: '11b261f6-0362-4dce-9bc9-7ba99a805ed6',
                              },
                              children: [],
                            },
                          ],
                        },
                        {
                          data: {
                            id: '1763856268586uzh1kdv2d',
                            texts: ['境界値の取り扱い'],
                            x: 1016,
                            y: 101.60000000000004,
                            width: 134,
                            height: 24.4,
                            sectionHeights: [24.4],
                            editing: false,
                            selected: false,
                            visible: true,
                            tentative: false,
                            startMarker: 'none',
                            endMarker: 'none',
                            direction: 'right',
                            parentId: 'fa0b4b37-e6e4-42ab-a2c0-02834c8283c2',
                          },
                          children: [
                            {
                              data: {
                                id: '1763856268586wer5b0krc',
                                texts: ['購入枚数上限（10枚）'],
                                x: 1250,
                                y: 84.40000000000002,
                                width: 167,
                                height: 24.4,
                                sectionHeights: [24.4],
                                editing: false,
                                selected: false,
                                visible: true,
                                tentative: false,
                                startMarker: 'none',
                                endMarker: 'none',
                                direction: 'right',
                                parentId: '26a3f96c-5c19-4308-85ab-f210d5d0fe5d',
                              },
                              children: [],
                            },
                            {
                              data: {
                                id: '1763856268586smk8zor22',
                                texts: ['区分ごとの料金単価'],
                                x: 1250,
                                y: 118.80000000000003,
                                width: 150,
                                height: 24.4,
                                sectionHeights: [24.4],
                                editing: false,
                                selected: false,
                                visible: true,
                                tentative: false,
                                startMarker: 'none',
                                endMarker: 'none',
                                direction: 'right',
                                parentId: '26a3f96c-5c19-4308-85ab-f210d5d0fe5d',
                              },
                              children: [],
                            },
                          ],
                        },
                        {
                          data: {
                            id: '1763856268586wcswduhv8',
                            texts: ['ビジネスロジックの正確性'],
                            x: 1016,
                            y: 170.39999999999998,
                            width: 198,
                            height: 24.4,
                            sectionHeights: [24.4],
                            editing: false,
                            selected: false,
                            visible: true,
                            tentative: false,
                            startMarker: 'none',
                            endMarker: 'none',
                            direction: 'right',
                            parentId: 'fa0b4b37-e6e4-42ab-a2c0-02834c8283c2',
                          },
                          children: [
                            {
                              data: {
                                id: '1763856268586m6p6f3e5s',
                                texts: ['料金計算式の実装'],
                                x: 1314,
                                y: 153.2,
                                width: 134,
                                height: 24.4,
                                sectionHeights: [24.4],
                                editing: false,
                                selected: false,
                                visible: true,
                                tentative: false,
                                startMarker: 'none',
                                endMarker: 'none',
                                direction: 'right',
                                parentId: '9a4c6f69-55f7-4822-85d1-cf28c2c7bebf',
                              },
                              children: [],
                            },
                            {
                              data: {
                                id: '1763856268586o34egkfll',
                                texts: ['区分（おとな/こども）ごとの単価適用'],
                                x: 1314,
                                y: 187.59999999999997,
                                width: 283,
                                height: 24.4,
                                sectionHeights: [24.4],
                                editing: false,
                                selected: false,
                                visible: true,
                                tentative: false,
                                startMarker: 'none',
                                endMarker: 'none',
                                direction: 'right',
                                parentId: '9a4c6f69-55f7-4822-85d1-cf28c2c7bebf',
                              },
                              children: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      // Apply layout algorithm
      const result = adjustElementPositionsFromHierarchy(
        problematicData,
        getNumberOfSections,
        'default',
      );

      expect(result).not.toBeNull();

      if (result) {
        const elements = collectAllElements(result);
        const overlaps = findOverlappingPairs(elements);

        // If there are overlaps, provide detailed error message
        if (overlaps.length > 0) {
          const overlapDetails = overlaps.map(
            ({ e1, e2 }) =>
              `"${e1.texts[0]}" (x:${e1.x}-${e1.x + e1.width}, y:${e1.y}-${e1.y + e1.height}) ` +
              `overlaps with "${e2.texts[0]}" (x:${e2.x}-${e2.x + e2.width}, y:${e2.y}-${e2.y + e2.height})`,
          );
          console.error('Found overlapping elements:\n' + overlapDetails.join('\n'));
        }

        expect(overlaps.length).toBe(0);
      }
    });

    test('should not produce overlaps for simple two-sibling case', () => {
      const simpleData: HierarchicalStructure = {
        version: '1.0.0',
        root: {
          data: createElement('root', ['root']),
          children: [
            {
              data: createElement('child1', ['child1']),
              children: [],
            },
            {
              data: createElement('child2', ['child2']),
              children: [],
            },
          ],
        },
      };

      const result = adjustElementPositionsFromHierarchy(
        simpleData,
        getNumberOfSections,
        'default',
      );

      expect(result).not.toBeNull();
      if (result) {
        const elements = collectAllElements(result);
        const overlaps = findOverlappingPairs(elements);
        expect(overlaps.length).toBe(0);
      }
    });

    test('should not produce overlaps when siblings have deep subtrees', () => {
      // Create a structure where two siblings each have deep subtrees
      const deepSubtreeData: HierarchicalStructure = {
        version: '1.0.0',
        root: {
          data: createElement('root', ['root']),
          children: [
            {
              data: createElement('sibling1', ['sibling1']),
              children: [
                {
                  data: createElement('s1-child1', ['s1-child1']),
                  children: [
                    {
                      data: createElement('s1-grandchild1', ['s1-grandchild1']),
                      children: [],
                    },
                    {
                      data: createElement('s1-grandchild2', ['s1-grandchild2']),
                      children: [],
                    },
                  ],
                },
                {
                  data: createElement('s1-child2', ['s1-child2']),
                  children: [
                    {
                      data: createElement('s1-grandchild3', ['s1-grandchild3']),
                      children: [],
                    },
                    {
                      data: createElement('s1-grandchild4', ['s1-grandchild4']),
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              data: createElement('sibling2', ['sibling2']),
              children: [
                {
                  data: createElement('s2-child1', ['s2-child1']),
                  children: [
                    {
                      data: createElement('s2-grandchild1', ['s2-grandchild1']),
                      children: [],
                    },
                    {
                      data: createElement('s2-grandchild2', ['s2-grandchild2']),
                      children: [],
                    },
                  ],
                },
                {
                  data: createElement('s2-child2', ['s2-child2']),
                  children: [
                    {
                      data: createElement('s2-grandchild3', ['s2-grandchild3']),
                      children: [],
                    },
                    {
                      data: createElement('s2-grandchild4', ['s2-grandchild4']),
                      children: [],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const result = adjustElementPositionsFromHierarchy(
        deepSubtreeData,
        getNumberOfSections,
        'default',
      );

      expect(result).not.toBeNull();
      if (result) {
        const elements = collectAllElements(result);
        const overlaps = findOverlappingPairs(elements);

        if (overlaps.length > 0) {
          const overlapDetails = overlaps.map(
            ({ e1, e2 }) =>
              `"${e1.texts[0]}" (x:${e1.x}-${e1.x + e1.width}, y:${e1.y}-${e1.y + e1.height}) ` +
              `overlaps with "${e2.texts[0]}" (x:${e2.x}-${e2.x + e2.width}, y:${e2.y}-${e2.y + e2.height})`,
          );
          console.error('Found overlapping elements:\n' + overlapDetails.join('\n'));
        }

        expect(overlaps.length).toBe(0);
      }
    });

    test('should not produce overlaps when elements have varying heights', () => {
      // Create a structure with elements of varying heights
      const varyingHeightData: HierarchicalStructure = {
        version: '1.0.0',
        root: {
          data: createElement('root', ['root'], 50, 24.4),
          children: [
            {
              data: createElement('tall-sibling', ['tall sibling with long text'], 200, 100),
              children: [
                {
                  data: createElement('tall-child', ['tall child'], 150, 80),
                  children: [],
                },
              ],
            },
            {
              data: createElement('short-sibling', ['short'], 50, 24.4),
              children: [
                {
                  data: createElement('short-child1', ['short child 1'], 50, 24.4),
                  children: [],
                },
                {
                  data: createElement('short-child2', ['short child 2'], 50, 24.4),
                  children: [],
                },
                {
                  data: createElement('short-child3', ['short child 3'], 50, 24.4),
                  children: [],
                },
              ],
            },
          ],
        },
      };

      const result = adjustElementPositionsFromHierarchy(
        varyingHeightData,
        getNumberOfSections,
        'default',
      );

      expect(result).not.toBeNull();
      if (result) {
        const elements = collectAllElements(result);
        const overlaps = findOverlappingPairs(elements);

        if (overlaps.length > 0) {
          const overlapDetails = overlaps.map(
            ({ e1, e2 }) =>
              `"${e1.texts[0]}" (y:${e1.y}-${e1.y + e1.height}) ` +
              `overlaps with "${e2.texts[0]}" (y:${e2.y}-${e2.y + e2.height})`,
          );
          console.error('Found overlapping elements:\n' + overlapDetails.join('\n'));
        }

        expect(overlaps.length).toBe(0);
      }
    });

    test('should not produce overlaps when parent is smaller than children total height', () => {
      // This is the key case: parent centered on children can move up
      const smallParentData: HierarchicalStructure = {
        version: '1.0.0',
        root: {
          data: createElement('root', ['root']),
          children: [
            {
              data: createElement('parent1', ['parent1'], 50, 24.4),
              children: [
                {
                  data: createElement('p1-child1', ['child1'], 50, 24.4),
                  children: [],
                },
                {
                  data: createElement('p1-child2', ['child2'], 50, 24.4),
                  children: [],
                },
                {
                  data: createElement('p1-child3', ['child3'], 50, 24.4),
                  children: [],
                },
                {
                  data: createElement('p1-child4', ['child4'], 50, 24.4),
                  children: [],
                },
                {
                  data: createElement('p1-child5', ['child5'], 50, 24.4),
                  children: [],
                },
              ],
            },
            {
              data: createElement('parent2', ['parent2'], 50, 24.4),
              children: [
                {
                  data: createElement('p2-child1', ['child1'], 50, 24.4),
                  children: [],
                },
                {
                  data: createElement('p2-child2', ['child2'], 50, 24.4),
                  children: [],
                },
                {
                  data: createElement('p2-child3', ['child3'], 50, 24.4),
                  children: [],
                },
                {
                  data: createElement('p2-child4', ['child4'], 50, 24.4),
                  children: [],
                },
                {
                  data: createElement('p2-child5', ['child5'], 50, 24.4),
                  children: [],
                },
              ],
            },
          ],
        },
      };

      const result = adjustElementPositionsFromHierarchy(
        smallParentData,
        getNumberOfSections,
        'default',
      );

      expect(result).not.toBeNull();
      if (result) {
        const elements = collectAllElements(result);
        const overlaps = findOverlappingPairs(elements);

        if (overlaps.length > 0) {
          const overlapDetails = overlaps.map(
            ({ e1, e2 }) =>
              `"${e1.texts[0]}" (y:${e1.y}-${e1.y + e1.height}) ` +
              `overlaps with "${e2.texts[0]}" (y:${e2.y}-${e2.y + e2.height})`,
          );
          console.error('Found overlapping elements:\n' + overlapDetails.join('\n'));
        }

        expect(overlaps.length).toBe(0);
      }
    });

    test('should not produce overlaps for deeply nested structure', () => {
      // Create a very deep nested structure (6 levels)
      const deepNestedData: HierarchicalStructure = {
        version: '1.0.0',
        root: {
          data: createElement('root', ['root']),
          children: [
            {
              data: createElement('level1', ['level1']),
              children: [
                {
                  data: createElement('level2', ['level2']),
                  children: [
                    {
                      data: createElement('level3', ['level3']),
                      children: [
                        {
                          data: createElement('level4', ['level4']),
                          children: [
                            {
                              data: createElement('level5a', ['level5a']),
                              children: [],
                            },
                            {
                              data: createElement('level5b', ['level5b']),
                              children: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      };

      const result = adjustElementPositionsFromHierarchy(
        deepNestedData,
        getNumberOfSections,
        'default',
      );

      expect(result).not.toBeNull();
      if (result) {
        const elements = collectAllElements(result);
        const overlaps = findOverlappingPairs(elements);
        expect(overlaps.length).toBe(0);
      }
    });

    test('should not produce overlaps for three siblings with unequal subtrees', () => {
      const unequalSubtreesData: HierarchicalStructure = {
        version: '1.0.0',
        root: {
          data: createElement('root', ['root']),
          children: [
            {
              data: createElement('sibling1', ['sibling1']),
              children: [
                {
                  data: createElement('s1-c1', ['s1-c1']),
                  children: [],
                },
              ],
            },
            {
              data: createElement('sibling2', ['sibling2']),
              children: [
                {
                  data: createElement('s2-c1', ['s2-c1']),
                  children: [
                    {
                      data: createElement('s2-gc1', ['s2-gc1']),
                      children: [],
                    },
                    {
                      data: createElement('s2-gc2', ['s2-gc2']),
                      children: [],
                    },
                    {
                      data: createElement('s2-gc3', ['s2-gc3']),
                      children: [],
                    },
                  ],
                },
              ],
            },
            {
              data: createElement('sibling3', ['sibling3']),
              children: [
                {
                  data: createElement('s3-c1', ['s3-c1']),
                  children: [],
                },
                {
                  data: createElement('s3-c2', ['s3-c2']),
                  children: [],
                },
              ],
            },
          ],
        },
      };

      const result = adjustElementPositionsFromHierarchy(
        unequalSubtreesData,
        getNumberOfSections,
        'default',
      );

      expect(result).not.toBeNull();
      if (result) {
        const elements = collectAllElements(result);
        const overlaps = findOverlappingPairs(elements);

        if (overlaps.length > 0) {
          const overlapDetails = overlaps.map(
            ({ e1, e2 }) =>
              `"${e1.texts[0]}" (y:${e1.y}-${e1.y + e1.height}) ` +
              `overlaps with "${e2.texts[0]}" (y:${e2.y}-${e2.y + e2.height})`,
          );
          console.error('Found overlapping elements:\n' + overlapDetails.join('\n'));
        }

        expect(overlaps.length).toBe(0);
      }
    });
  });
});
