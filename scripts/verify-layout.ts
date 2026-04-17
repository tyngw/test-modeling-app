// scripts/verify-layout.ts
// Simple script to verify that the layout algorithm produces no overlapping elements

import { adjustElementPositionsFromHierarchy } from '../src/utils/layoutHelpers';
import { HierarchicalStructure, HierarchicalNode } from '../src/types/hierarchicalTypes';
import { Element } from '../src/types/types';

// Helper function to check if two rectangles overlap
const doElementsOverlap = (e1: Element, e2: Element): boolean => {
  // Check if horizontal ranges overlap
  const horizontalOverlap = e1.x < e2.x + e2.width && e1.x + e1.width > e2.x;

  // Check if vertical ranges overlap
  const verticalOverlap = e1.y < e2.y + e2.height && e1.y + e1.height > e2.y;

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
const findOverlappingPairs = (elements: Element[]): Array<{ e1: Element; e2: Element }> => {
  const overlaps: Array<{ e1: Element; e2: Element }> = [];

  for (let i = 0; i < elements.length; i++) {
    for (let j = i + 1; j < elements.length; j++) {
      if (doElementsOverlap(elements[i], elements[j])) {
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
): Element =>
  ({
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
  }) as Element;

// Mock getNumberOfSections function
const getNumberOfSections = () => 3;

// Test case: Complex nested structure with multiple branches (simulates the reported issue)
const testProblematicData = (): boolean => {
  console.log('Testing complex nested structure with multiple branches...');

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

  const result = adjustElementPositionsFromHierarchy(
    problematicData,
    getNumberOfSections,
    'default',
  );

  if (!result) {
    console.error('  FAIL: Result is null');
    return false;
  }

  const elements = collectAllElements(result);
  const overlaps = findOverlappingPairs(elements);

  if (overlaps.length > 0) {
    console.error(`  FAIL: Found ${overlaps.length} overlapping element pairs:`);
    overlaps.forEach(({ e1, e2 }) => {
      console.error(
        `    "${e1.texts[0]}" (x:${e1.x.toFixed(1)}-${(e1.x + e1.width).toFixed(1)}, y:${e1.y.toFixed(1)}-${(e1.y + e1.height).toFixed(1)})`,
      );
      console.error(
        `    overlaps with "${e2.texts[0]}" (x:${e2.x.toFixed(1)}-${(e2.x + e2.width).toFixed(1)}, y:${e2.y.toFixed(1)}-${(e2.y + e2.height).toFixed(1)})`,
      );
    });
    return false;
  }

  console.log('  PASS: No overlapping elements');
  return true;
};

// Test case: Two siblings with deep subtrees
const testDeepSubtrees = (): boolean => {
  console.log('Testing deep subtrees...');

  const data: HierarchicalStructure = {
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
                { data: createElement('s1-gc1', ['s1-gc1']), children: [] },
                { data: createElement('s1-gc2', ['s1-gc2']), children: [] },
              ],
            },
            {
              data: createElement('s1-child2', ['s1-child2']),
              children: [
                { data: createElement('s1-gc3', ['s1-gc3']), children: [] },
                { data: createElement('s1-gc4', ['s1-gc4']), children: [] },
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
                { data: createElement('s2-gc1', ['s2-gc1']), children: [] },
                { data: createElement('s2-gc2', ['s2-gc2']), children: [] },
              ],
            },
            {
              data: createElement('s2-child2', ['s2-child2']),
              children: [
                { data: createElement('s2-gc3', ['s2-gc3']), children: [] },
                { data: createElement('s2-gc4', ['s2-gc4']), children: [] },
              ],
            },
          ],
        },
      ],
    },
  };

  const result = adjustElementPositionsFromHierarchy(data, getNumberOfSections, 'default');

  if (!result) {
    console.error('  FAIL: Result is null');
    return false;
  }

  const elements = collectAllElements(result);
  const overlaps = findOverlappingPairs(elements);

  if (overlaps.length > 0) {
    console.error(`  FAIL: Found ${overlaps.length} overlapping element pairs`);
    overlaps.forEach(({ e1, e2 }) => {
      console.error(`    "${e1.texts[0]}" overlaps with "${e2.texts[0]}"`);
    });
    return false;
  }

  console.log('  PASS: No overlapping elements');
  return true;
};

// Test case: Parent with many children (parent gets centered on children)
const testManyChildren = (): boolean => {
  console.log('Testing parent with many children...');

  const data: HierarchicalStructure = {
    version: '1.0.0',
    root: {
      data: createElement('root', ['root']),
      children: [
        {
          data: createElement('parent1', ['parent1'], 50, 24.4),
          children: [
            { data: createElement('p1-c1', ['p1-c1']), children: [] },
            { data: createElement('p1-c2', ['p1-c2']), children: [] },
            { data: createElement('p1-c3', ['p1-c3']), children: [] },
            { data: createElement('p1-c4', ['p1-c4']), children: [] },
            { data: createElement('p1-c5', ['p1-c5']), children: [] },
          ],
        },
        {
          data: createElement('parent2', ['parent2'], 50, 24.4),
          children: [
            { data: createElement('p2-c1', ['p2-c1']), children: [] },
            { data: createElement('p2-c2', ['p2-c2']), children: [] },
            { data: createElement('p2-c3', ['p2-c3']), children: [] },
            { data: createElement('p2-c4', ['p2-c4']), children: [] },
            { data: createElement('p2-c5', ['p2-c5']), children: [] },
          ],
        },
      ],
    },
  };

  const result = adjustElementPositionsFromHierarchy(data, getNumberOfSections, 'default');

  if (!result) {
    console.error('  FAIL: Result is null');
    return false;
  }

  const elements = collectAllElements(result);
  const overlaps = findOverlappingPairs(elements);

  if (overlaps.length > 0) {
    console.error(`  FAIL: Found ${overlaps.length} overlapping element pairs`);
    overlaps.forEach(({ e1, e2 }) => {
      console.error(
        `    "${e1.texts[0]}" (y:${e1.y.toFixed(1)}-${(e1.y + e1.height).toFixed(1)}) overlaps with "${e2.texts[0]}" (y:${e2.y.toFixed(1)}-${(e2.y + e2.height).toFixed(1)})`,
      );
    });
    return false;
  }

  console.log('  PASS: No overlapping elements');
  return true;
};

// Test case: Varying heights
const testVaryingHeights = (): boolean => {
  console.log('Testing varying element heights...');

  const data: HierarchicalStructure = {
    version: '1.0.0',
    root: {
      data: createElement('root', ['root'], 50, 24.4),
      children: [
        {
          data: createElement('tall', ['tall'], 200, 100),
          children: [{ data: createElement('tall-child', ['tall-child'], 150, 80), children: [] }],
        },
        {
          data: createElement('short', ['short'], 50, 24.4),
          children: [
            { data: createElement('short-c1', ['short-c1']), children: [] },
            { data: createElement('short-c2', ['short-c2']), children: [] },
            { data: createElement('short-c3', ['short-c3']), children: [] },
          ],
        },
      ],
    },
  };

  const result = adjustElementPositionsFromHierarchy(data, getNumberOfSections, 'default');

  if (!result) {
    console.error('  FAIL: Result is null');
    return false;
  }

  const elements = collectAllElements(result);
  const overlaps = findOverlappingPairs(elements);

  if (overlaps.length > 0) {
    console.error(`  FAIL: Found ${overlaps.length} overlapping element pairs`);
    overlaps.forEach(({ e1, e2 }) => {
      console.error(`    "${e1.texts[0]}" overlaps with "${e2.texts[0]}"`);
    });
    return false;
  }

  console.log('  PASS: No overlapping elements');
  return true;
};

// Test case: Three siblings with unequal subtrees
const testThreeSiblingsUnequal = (): boolean => {
  console.log('Testing three siblings with unequal subtrees...');

  const data: HierarchicalStructure = {
    version: '1.0.0',
    root: {
      data: createElement('root', ['root']),
      children: [
        {
          data: createElement('s1', ['s1']),
          children: [{ data: createElement('s1-c1', ['s1-c1']), children: [] }],
        },
        {
          data: createElement('s2', ['s2']),
          children: [
            {
              data: createElement('s2-c1', ['s2-c1']),
              children: [
                { data: createElement('s2-gc1', ['s2-gc1']), children: [] },
                { data: createElement('s2-gc2', ['s2-gc2']), children: [] },
                { data: createElement('s2-gc3', ['s2-gc3']), children: [] },
              ],
            },
          ],
        },
        {
          data: createElement('s3', ['s3']),
          children: [
            { data: createElement('s3-c1', ['s3-c1']), children: [] },
            { data: createElement('s3-c2', ['s3-c2']), children: [] },
          ],
        },
      ],
    },
  };

  const result = adjustElementPositionsFromHierarchy(data, getNumberOfSections, 'default');

  if (!result) {
    console.error('  FAIL: Result is null');
    return false;
  }

  const elements = collectAllElements(result);
  const overlaps = findOverlappingPairs(elements);

  if (overlaps.length > 0) {
    console.error(`  FAIL: Found ${overlaps.length} overlapping element pairs`);
    overlaps.forEach(({ e1, e2 }) => {
      console.error(`    "${e1.texts[0]}" overlaps with "${e2.texts[0]}"`);
    });
    return false;
  }

  console.log('  PASS: No overlapping elements');
  return true;
};

// Run all tests
console.log('=== Layout Overlap Verification ===\n');

const results = [
  testProblematicData(),
  testDeepSubtrees(),
  testManyChildren(),
  testVaryingHeights(),
  testThreeSiblingsUnequal(),
];

const passed = results.filter((r) => r).length;
const total = results.length;

console.log(`\n=== Results: ${passed}/${total} tests passed ===`);

if (passed < total) {
  process.exit(1);
} else {
  console.log('All tests passed!');
  process.exit(0);
}
