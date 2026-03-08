import {
  FullHierarchyGenerationResult,
  HierarchicalGenerationItem,
} from './AIResponseParser';

function normalizeText(text: string): string {
  return text.replace(/\s+/g, '').trim().toLowerCase();
}

function extractHeadingText(line: string): string {
  return line.replace(/^(#{1,6}\s+|≣\s+)/, '').trim();
}

function shouldSkipLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed)
    return true;

  return (
    /^@/.test(trimmed) ||
    /^\d{4}年\d{1,2}月\d{1,2}日$/.test(trimmed) ||
    trimmed === '·' ||
    trimmed === '画像' ||
    /^https?:\/\//.test(trimmed) ||
    /^(qiita\.com|[a-z0-9.-]+\.[a-z]{2,})$/i.test(trimmed)
  );
}

function summarizeParagraph(line: string): string {
  const firstSentence = line.split(/。|\.(?:\s|$)/)[0]?.trim() || line.trim();
  return firstSentence.slice(0, 60).trim();
}

function selectRelevantSpecificationText(specificationText: string, fallbackRootText: string): string {
  const lines = specificationText.split('\n');
  const rootKey = normalizeText(fallbackRootText);

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!/^(#{1,6}\s+|≣\s+)/.test(line))
      continue;

    if (normalizeText(line).includes(rootKey)) {
      return lines.slice(index).join('\n');
    }
  }

  return specificationText;
}

export function buildHierarchyFromSpecificationOutline(
  specificationText: string,
  fallbackRootText: string,
): FullHierarchyGenerationResult {
  const relevantSpecificationText = selectRelevantSpecificationText(specificationText, fallbackRootText);
  const lines = relevantSpecificationText.split('\n');

  let rootText = fallbackRootText;
  const hierarchicalItems: HierarchicalGenerationItem[] = [];
  let hasResolvedRoot = false;
  let currentSectionTitle = '';
  let currentNumberTitle = '';

  const pushItem = (text: string, level: number) => {
    const normalizedText = text.trim();
    if (!normalizedText)
      return;

    const previousItem = hierarchicalItems[hierarchicalItems.length - 1];
    if (previousItem?.text === normalizedText && previousItem.level === level)
      return;

    hierarchicalItems.push({
      text: normalizedText,
      level,
      originalLine: `${'  '.repeat(level)}- ${normalizedText}`,
    });
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (shouldSkipLine(line))
      continue;

    if (/^##\s+/.test(line) && !hasResolvedRoot) {
      rootText = extractHeadingText(line);
      hasResolvedRoot = true;
      currentSectionTitle = '';
      currentNumberTitle = '';
      continue;
    }

    if (/^≣\s+/.test(line)) {
      currentSectionTitle = extractHeadingText(line);
      currentNumberTitle = '';
      pushItem(currentSectionTitle, 0);
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      currentNumberTitle = line.replace(/^\d+\.\s+/, '').trim();
      pushItem(currentNumberTitle, currentSectionTitle ? 1 : 0);
      continue;
    }

    if (/^[・*-]\s+/.test(line)) {
      const bulletText = line.replace(/^[・*-]\s+/, '').trim();
      if (bulletText.length > 0 && bulletText.length <= 80) {
        const bulletLevel = currentNumberTitle ? 2 : currentSectionTitle ? 1 : 0;
        pushItem(bulletText, bulletLevel);
      }
      continue;
    }

    if (currentNumberTitle) {
      const paragraphText = summarizeParagraph(line);
      if (paragraphText.length > 0) {
        pushItem(paragraphText, 2);
      }
      continue;
    }

    if (currentSectionTitle) {
      const paragraphText = summarizeParagraph(line);
      if (paragraphText.length > 0 && paragraphText.length <= 60) {
        pushItem(paragraphText, 1);
      }
    }
  }

  return {
    rootText,
    hierarchicalItems,
  };
}
