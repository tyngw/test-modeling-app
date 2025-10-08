// src/utils/file/markdownHelpers.ts
import { Element, MarkerType } from '../../types/types';
import { HierarchicalNode, HierarchicalStructure } from '../../types/hierarchicalTypes';

import { createNewElement } from '../element/elementHelpers';
import { convertArrayToHierarchical } from '../hierarchical/hierarchicalConverter';
import { getIndentSpacesPerLevel, setIndentSpacesPerLevel } from '../storage/localStorageHelpers';
import { debugLog } from '../debugLogHelpers';

type MarkdownMarkerProperties = Partial<{
  startMarker: MarkerType;
  endMarker: MarkerType;
}>;

interface ParsedMarkdownLine {
  level: number;
  text: string;
  properties: MarkdownMarkerProperties;
}

const DEFAULT_MARKER: MarkerType = 'none';

/**
 * Markdownテキストからインデントパターンを検出し、設定に反映する
 * @param markdownText 解析対象のMarkdownテキスト
 * @returns 検出されたインデント数（2または4、検出できない場合は現在の設定値）
 */
const detectAndApplyIndentPattern = (markdownText: string): number => {
  const lines = markdownText.split('\n');
  const indentCounts: number[] = [];

  // インデントされた行を検出
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) {
      continue;
    }

    const dashIndex = line.indexOf('-');
    if (dashIndex === -1) {
      continue;
    }

    const indent = line.slice(0, dashIndex);
    const spaceCount = indent.replace(/\t/g, '  ').length;

    // インデントがある行のみ記録
    if (spaceCount > 0) {
      indentCounts.push(spaceCount);
    }
  }

  if (indentCounts.length === 0) {
    return getIndentSpacesPerLevel(); // インデントが検出されない場合は現在の設定を維持
  }

  // 最小のインデント数を基準とする（通常は最初のレベルのインデント）
  const minIndent = Math.min(...indentCounts);

  // 2または4に正規化
  let detectedIndent: number;
  if (minIndent <= 2) {
    detectedIndent = 2;
  } else {
    detectedIndent = 4;
  }

  // 現在の設定と異なる場合のみ更新
  const currentSetting = getIndentSpacesPerLevel();
  if (detectedIndent !== currentSetting) {
    setIndentSpacesPerLevel(detectedIndent);
    debugLog(
      `Markdownファイルのインデントパターンを検出し、設定を${detectedIndent}スペースに更新しました`,
    );
  }

  return detectedIndent;
};

const parseMarkdownLine = (rawLine: string, spacesPerLevel: number): ParsedMarkdownLine | null => {
  if (!rawLine.trim() || rawLine.trim().startsWith('#')) {
    return null;
  }

  const dashIndex = rawLine.indexOf('-');
  if (dashIndex === -1) {
    return null;
  }

  const indent = rawLine.slice(0, dashIndex);
  const level = Math.floor(indent.replace(/\t/g, '  ').length / spacesPerLevel);

  const content = rawLine.slice(dashIndex + 1).trim();
  if (!content) {
    return null;
  }

  const metadataMatch = content.match(/^(.*?)\s*\[(.+)]\s*$/);
  let text = content;
  const properties: MarkdownMarkerProperties = {};

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
        // TypeScriptの型システムに依存し、無効な値は無視される
        properties.startMarker = value as MarkerType;
      }

      if (key === 'endMarker') {
        // TypeScriptの型システムに依存し、無効な値は無視される
        properties.endMarker = value as MarkerType;
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

const buildElementsFromParsedLines = (lines: ParsedMarkdownLine[]): Element[] => {
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

export const loadMarkdownAsHierarchical = (markdownText: string): HierarchicalStructure | null => {
  if (!markdownText || !markdownText.trim()) {
    return null;
  }

  // インデントパターンを検出し、設定に反映
  const spacesPerLevel = detectAndApplyIndentPattern(markdownText);

  const parsedLines: ParsedMarkdownLine[] = [];

  markdownText.split('\n').forEach((line) => {
    const parsed = parseMarkdownLine(line, spacesPerLevel);
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

const serializeNodeToMarkdown = (node: HierarchicalNode, depth = 0): string => {
  const spacesPerLevel = getIndentSpacesPerLevel();
  const indent = ' '.repeat(depth * spacesPerLevel);
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

  const childLines = node.children?.map((child) => serializeNodeToMarkdown(child, depth + 1)) ?? [];

  return [currentLine, ...childLines].join('\n');
};

export const convertHierarchicalToMarkdown = (
  hierarchical: HierarchicalStructure | null,
): string => {
  if (!hierarchical?.root) {
    return '';
  }

  return serializeNodeToMarkdown(hierarchical.root);
};

export const createMarkdownSnapshotFromElements = (elements: Element[]): string => {
  const hierarchical = convertArrayToHierarchical(elements);
  return convertHierarchicalToMarkdown(hierarchical);
};
