import type {
  BrandStatus,
  Suggestion,
  TooltipPart
} from '../../types/brandAutocomplete';

const VALID_TARGETS = new Set([
  'offer',
  'audience',
  'emphasis',
  'tone'
]);

const ELEMENT_LABELS: Record<string, string> = {
  offer: 'What You Sell',
  audience: 'Who It Is For',
  emphasis: 'What You Want To Emphasize',
  tone: 'How It Should Come Across'
};

const ELEMENT_COLORS: Record<string, string> = {
  offer: '#3B82F6',
  audience: '#10B981',
  emphasis: '#C25D2C',
  tone: '#06B6D4'
};

const ELEMENT_KEYWORDS: Record<string, { color: string; label: string }> = {
  'what you sell': { color: '#3B82F6', label: 'What You Sell' },
  product: { color: '#3B82F6', label: 'What You Sell' },
  products: { color: '#3B82F6', label: 'What You Sell' },
  service: { color: '#3B82F6', label: 'What You Sell' },
  services: { color: '#3B82F6', label: 'What You Sell' },
  offer: { color: '#3B82F6', label: 'What You Sell' },
  audience: { color: '#10B981', label: 'Who It Is For' },
  customer: { color: '#10B981', label: 'Who It Is For' },
  customers: { color: '#10B981', label: 'Who It Is For' },
  'target audience': { color: '#10B981', label: 'Who It Is For' },
  'who it is for': { color: '#10B981', label: 'Who It Is For' },
  emphasize: { color: '#C25D2C', label: 'What You Want To Emphasize' },
  difference: { color: '#C25D2C', label: 'What You Want To Emphasize' },
  quality: { color: '#C25D2C', label: 'What You Want To Emphasize' },
  result: { color: '#C25D2C', label: 'What You Want To Emphasize' },
  'how it should come across': { color: '#06B6D4', label: 'How It Should Come Across' },
  tone: { color: '#06B6D4', label: 'How It Should Come Across' },
  personality: { color: '#06B6D4', label: 'How It Should Come Across' },
  feeling: { color: '#06B6D4', label: 'How It Should Come Across' }
};

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
    return [{ text: 'Start by describing what you sell and who it is for.' }];
  }

  if (!brandStatus) {
    return [{ text: 'Keep building the brand narrative with clearer detail.' }];
  }

  return highlightElements(`${brandStatus.overallAssessment}: ${brandStatus.statusMessage}`);
}
