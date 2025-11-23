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
    test('should not produce overlapping elements for complex nested structure', () => {
      // Create a structure that can cause overlap issues:
      // - Two sibling branches with deep subtrees
      // - Each branch has nodes with multiple children at various levels
      const problematicData: HierarchicalStructure = {
        version: '1.0.0',
        root: {
          data: createElement('root', ['root']),
          children: [
            {
              data: createElement('child', ['child']),
              children: [
                {
                  // First branch with deep nested structure
                  data: createElement('branch1', ['branch1-item'], 300, 69.2),
                  children: [
                    {
                      data: createElement('b1-level2', ['b1-level2'], 262, 24.4),
                      children: [
                        {
                          data: createElement('b1-level3a', ['b1-level3a'], 150, 24.4),
                          children: [
                            {
                              data: createElement('b1-level4a', ['b1-level4a'], 134, 24.4),
                              children: [],
                            },
                          ],
                        },
                        {
                          data: createElement('b1-level3b', ['b1-level3b'], 166, 24.4),
                          children: [
                            {
                              data: createElement('b1-level4b1', ['b1-level4b1'], 262, 24.4),
                              children: [],
                            },
                            {
                              data: createElement('b1-level4b2', ['b1-level4b2'], 102, 24.4),
                              children: [],
                            },
                          ],
                        },
                      ],
                    },
                  ],
                },
                {
                  // Second branch with deep nested structure
                  data: createElement('branch2', ['branch2-item'], 300, 69.2),
                  children: [
                    {
                      data: createElement('b2-level2', ['b2-level2'], 166, 24.4),
                      children: [
                        {
                          data: createElement('b2-level3a', ['b2-level3a'], 134, 24.4),
                          children: [
                            {
                              data: createElement('b2-level4a1', ['b2-level4a1'], 207, 24.4),
                              children: [],
                            },
                            {
                              data: createElement('b2-level4a2', ['b2-level4a2'], 150, 24.4),
                              children: [],
                            },
                          ],
                        },
                        {
                          data: createElement('b2-level3b', ['b2-level3b'], 134, 24.4),
                          children: [
                            {
                              data: createElement('b2-level4b1', ['b2-level4b1'], 167, 24.4),
                              children: [],
                            },
                            {
                              data: createElement('b2-level4b2', ['b2-level4b2'], 150, 24.4),
                              children: [],
                            },
                          ],
                        },
                        {
                          data: createElement('b2-level3c', ['b2-level3c'], 198, 24.4),
                          children: [
                            {
                              data: createElement('b2-level4c1', ['b2-level4c1'], 134, 24.4),
                              children: [],
                            },
                            {
                              data: createElement('b2-level4c2', ['b2-level4c2'], 283, 24.4),
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
