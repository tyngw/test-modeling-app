// src/utils/file/yamlHelpers.ts
import { Element, MarkerType } from '../../types/types';
import { HierarchicalNode, HierarchicalStructure } from '../../types/hierarchicalTypes';

import { createNewElement } from '../element/elementHelpers';
import { convertArrayToHierarchical } from '../hierarchical/hierarchicalConverter';

type YamlMarkerProperties = Partial<{
  startMarker: MarkerType;
  endMarker: MarkerType;
}>;

interface ParsedYamlLine {
  level: number;
  text: string;
  properties: YamlMarkerProperties;
}

const INDENT_SIZE = 2;

const VALID_MARKERS: readonly MarkerType[] = [
  'arrow',
  'filled_arrow',
  'circle',
  'filled_circle',
  'square',
  'filled_square',
  'diamond',
  'filled_diamond',
  'none',
];

const DEFAULT_MARKER: MarkerType = 'none';

const markerFromString = (value: string): MarkerType | null => {
  const normalized = value.trim();
  return (VALID_MARKERS as readonly string[]).includes(normalized)
    ? (normalized as MarkerType)
    : null;
};

const parseYamlLine = (rawLine: string): ParsedYamlLine | null => {
  if (!rawLine.trim() || rawLine.trim().startsWith('#')) {
    return null;
  }

  const dashIndex = rawLine.indexOf('-');
  if (dashIndex === -1) {
    return null;
  }

  const indent = rawLine.slice(0, dashIndex);
  const level = Math.floor(indent.replace(/\t/g, '  ').length / INDENT_SIZE);

  const content = rawLine.slice(dashIndex + 1).trim();
  if (!content) {
    return null;
  }

  const metadataMatch = content.match(/^(.*?)\s*\[(.+)]\s*$/);
  let text = content;
  const properties: YamlMarkerProperties = {};

  if (metadataMatch) {
    text = metadataMatch[1].trim();
    const metadata = metadataMatch[2]
      .split(',')
      .map((segment) => segment.trim())
      .filter(Boolean);

    metadata.forEach((pair) => {
      const separatorIndex = pair.indexOf(':');
      if (separatorIndex === -1) {
        return;
      }

      const key = pair.slice(0, separatorIndex).trim();
      const value = pair.slice(separatorIndex + 1).trim();

      if (key === 'startMarker') {
        const marker = markerFromString(value);
        if (marker) {
          properties.startMarker = marker;
        }
      }

      if (key === 'endMarker') {
        const marker = markerFromString(value);
        if (marker) {
          properties.endMarker = marker;
        }
      }
    });
  }

  if (!text) {
    return null;
  }

  return {
    level,
    text,
    properties,
  };
};

const buildElementsFromParsedLines = (lines: ParsedYamlLine[]): Element[] => {
  const elements: Element[] = [];
  const stack: Array<{ level: number; element: Element }> = [];

  lines.forEach((line) => {
    const element = createNewElement({ numSections: 1, selected: false, editing: false });
    element.texts = [line.text];
    element.startMarker = line.properties.startMarker ?? DEFAULT_MARKER;
    element.endMarker = line.properties.endMarker ?? DEFAULT_MARKER;

    while (stack.length > 0 && stack[stack.length - 1].level >= line.level) {
      stack.pop();
    }

    if (stack.length > 0) {
      const parentId = stack[stack.length - 1].element.id;
      element.tempParentId = parentId;
      (element as unknown as { parentId?: string | null }).parentId = parentId;
    } else {
      (element as unknown as { parentId?: string | null }).parentId = null;
    }

    elements.push(element);
    stack.push({ level: line.level, element });
  });

  return elements;
};

export const loadYamlAsHierarchical = (yamlText: string): HierarchicalStructure | null => {
  if (!yamlText || !yamlText.trim()) {
    return null;
  }

  const parsedLines: ParsedYamlLine[] = [];

  yamlText.split('\n').forEach((line) => {
    const parsed = parseYamlLine(line);
    if (parsed) {
      parsedLines.push(parsed);
    }
  });

  if (parsedLines.length === 0) {
    return null;
  }

  const elements = buildElementsFromParsedLines(parsedLines);
  const hierarchical = convertArrayToHierarchical(elements);

  return hierarchical;
};

const serializeNodeToYaml = (node: HierarchicalNode, depth = 0): string => {
  const indent = '  '.repeat(depth);
  const label = node.data?.texts?.[0] ?? '';
  const markers: string[] = [];

  if (node.data?.startMarker && node.data.startMarker !== DEFAULT_MARKER) {
    markers.push(`startMarker: ${node.data.startMarker}`);
  }

  if (node.data?.endMarker && node.data.endMarker !== DEFAULT_MARKER) {
    markers.push(`endMarker: ${node.data.endMarker}`);
  }

  const metadata = markers.length > 0 ? ` [${markers.join(', ')}]` : '';
  const currentLine = `${indent}- ${label}${metadata}`;

  const childLines = node.children?.map((child) => serializeNodeToYaml(child, depth + 1)) ?? [];

  return [currentLine, ...childLines].join('\n');
};

export const convertHierarchicalToYaml = (hierarchical: HierarchicalStructure | null): string => {
  if (!hierarchical?.root) {
    return '';
  }

  return serializeNodeToYaml(hierarchical.root);
};

export const createYamlSnapshotFromElements = (elements: Element[]): string => {
  const hierarchical = convertArrayToHierarchical(elements);
  return convertHierarchicalToYaml(hierarchical);
};
