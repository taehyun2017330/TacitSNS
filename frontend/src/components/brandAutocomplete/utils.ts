import type { CSSProperties } from 'react';

import type {
  BrandStatus,
  SentenceAnnotation,
  Suggestion,
  TooltipPart
} from '../../types/brandAutocomplete';

const VALID_TARGETS = new Set([
  'companyType',
  'audience',
  'problem',
  'solution',
  'mission',
  'differentiator',
  'brandIdentity',
  'values'
]);

const ELEMENT_LABELS: Record<string, string> = {
  companyType: 'Industry/Type',
  audience: 'Target Audience',
  problem: 'Problem',
  solution: 'Solution',
  mission: 'Mission',
  differentiator: 'Differentiator',
  brandIdentity: 'Brand Identity',
  values: 'Values'
};

const ELEMENT_COLORS: Record<string, string> = {
  companyType: '#3B82F6',
  audience: '#10B981',
  problem: '#EF4444',
  solution: '#8B5CF6',
  mission: '#F59E0B',
  differentiator: '#EC4899',
  brandIdentity: '#06B6D4',
  values: '#14B8A6'
};

const ELEMENT_KEYWORDS: Record<string, { color: string; label: string }> = {
  'company type': { color: '#3B82F6', label: 'Industry/Type' },
  industry: { color: '#3B82F6', label: 'Industry/Type' },
  type: { color: '#3B82F6', label: 'Industry/Type' },
  audience: { color: '#10B981', label: 'Target Audience' },
  'target audience': { color: '#10B981', label: 'Target Audience' },
  problem: { color: '#EF4444', label: 'Problem' },
  solution: { color: '#8B5CF6', label: 'Solution' },
  mission: { color: '#F59E0B', label: 'Mission' },
  vision: { color: '#F59E0B', label: 'Mission' },
  differentiator: { color: '#EC4899', label: 'Differentiator' },
  unique: { color: '#EC4899', label: 'Differentiator' },
  'brand identity': { color: '#06B6D4', label: 'Brand Identity' },
  personality: { color: '#06B6D4', label: 'Brand Identity' },
  values: { color: '#14B8A6', label: 'Values' }
};

export function splitSentences(fullText: string) {
  const sentences: Array<{ index: number; start: number; end: number; text: string }> = [];
  const regex = /[^.!?]+[.!?]?\s*/g;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = regex.exec(fullText)) !== null) {
    const textPart = match[0];
    if (!textPart) {
      continue;
    }

    sentences.push({
      index: index++,
      start: match.index,
      end: match.index + textPart.length,
      text: textPart
    });
  }

  return sentences;
}

export function getSentenceIndexAt(fullText: string, cursorPos: number) {
  const sentences = splitSentences(fullText);
  const index = sentences.findIndex(sentence => cursorPos >= sentence.start && cursorPos <= sentence.end);
  return index === -1 ? null : index;
}

export function elementLabelForKey(key: string) {
  return ELEMENT_LABELS[key] || key;
}

export function normalizeTargets(targets: string[] | undefined | null) {
  return (targets || []).filter(target => VALID_TARGETS.has(target));
}

export function getElementColor(targets: string[] | undefined) {
  if (!targets || targets.length === 0) {
    return '#6B7280';
  }

  return ELEMENT_COLORS[targets[0]] || '#6B7280';
}

export function getElementLabel(targets: string[] | undefined) {
  if (!targets || targets.length === 0) {
    return '';
  }

  return elementLabelForKey(targets[0]);
}

export function getUniqueSentenceTargets(
  annotation: SentenceAnnotation | undefined | null,
  fulfilledTargets: Set<string>
) {
  if (!annotation) {
    return [];
  }

  const targets = new Set<string>();
  annotation.segments.forEach(segment =>
    normalizeTargets(segment.targets)
      .filter(target => (fulfilledTargets.size ? fulfilledTargets.has(target) : true))
      .forEach(target => targets.add(target))
  );

  return Array.from(targets);
}

export function underlineStyleForTargets(targets: string[]) {
  if (!targets.length) {
    return {
      boxShadow: 'none',
      background: 'transparent'
    } satisfies CSSProperties;
  }

  const primaryColor = getElementColor([targets[0]]);
  return {
    boxShadow: `inset 0 -2px 0 ${primaryColor}`,
    background: `${primaryColor}14`
  } satisfies CSSProperties;
}

export function getSuggestionIcon(type: string) {
  switch (type) {
    case 'new_angle':
      return '✨';
    case 'example':
      return '💡';
    case 'continuation':
    case 'sentence_end':
    default:
      return '→';
  }
}

export function applySuggestionToText(currentText: string, suggestion: Suggestion) {
  if (currentText.trim() === '') {
    return suggestion.text;
  }

  if (suggestion.text === '.') {
    return currentText.trimEnd() + '.';
  }

  if (currentText.endsWith(' ')) {
    return currentText + suggestion.text;
  }

  if (suggestion.type === 'continuation' || suggestion.type === 'sentence_end') {
    return currentText + ' ' + suggestion.text;
  }

  const lastChar = currentText.trim().slice(-1);
  if (lastChar !== '.' && lastChar !== '!' && lastChar !== '?') {
    return currentText.trim() + '. ' + suggestion.text;
  }

  return currentText.trim() + ' ' + suggestion.text;
}

export function getStatusColor(text: string, brandStatus: BrandStatus | null) {
  if (!text.trim()) {
    return 'red';
  }
  if (!brandStatus) {
    return 'orange';
  }
  if (brandStatus.satisfied && brandStatus.sentenceEnded) {
    return 'green';
  }
  return 'orange';
}

export function highlightElements(message: string): TooltipPart[] {
  const parts: TooltipPart[] = [];
  let lastIndex = 0;

  const matches: Array<{ start: number; end: number; keyword: string; color: string }> = [];
  const sortedKeywords = Object.entries(ELEMENT_KEYWORDS).sort((left, right) => right[0].length - left[0].length);

  sortedKeywords.forEach(([keyword, { color }]) => {
    const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
    let match: RegExpExecArray | null;

    while ((match = regex.exec(message)) !== null) {
      const overlaps = matches.some(existingMatch =>
        (match!.index >= existingMatch.start && match!.index < existingMatch.end) ||
        (match!.index + match![0].length > existingMatch.start &&
          match!.index + match![0].length <= existingMatch.end)
      );

      if (!overlaps) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          keyword: match[0],
          color
        });
      }
    }
  });

  matches.sort((left, right) => left.start - right.start);

  matches.forEach(match => {
    if (lastIndex < match.start) {
      parts.push({ text: message.substring(lastIndex, match.start) });
    }
    parts.push({ text: match.keyword, color: match.color });
    lastIndex = match.end;
  });

  if (lastIndex < message.length) {
    parts.push({ text: message.substring(lastIndex) });
  }

  return parts.length > 0 ? parts : [{ text: message }];
}

export function getStatusTooltip(text: string, brandStatus: BrandStatus | null) {
  if (!text.trim()) {
    return [{ text: 'Start by introducing what type of brand your company is' }];
  }

  if (!brandStatus) {
    return [{ text: 'Continue building your brand description' }];
  }

  return highlightElements(`${brandStatus.overallAssessment}: ${brandStatus.statusMessage}`);
}
