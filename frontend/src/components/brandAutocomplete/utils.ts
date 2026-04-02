import type {
  BrandStatus,
  Suggestion
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

export function applySuggestionToText(currentText: string, suggestion: Suggestion) {
  if (currentText.trim() === '') {
    return suggestion.text;
  }

  const normalizedCurrentText = currentText.replace(/(?:\.\.\.|…)\s*$/, '').trimEnd();

  if (suggestion.text === '.') {
    return normalizedCurrentText + '.';
  }

  if (currentText.endsWith(' ') && normalizedCurrentText === currentText.trimEnd()) {
    return currentText + suggestion.text;
  }

  if (suggestion.type === 'continuation' || suggestion.type === 'sentence_end') {
    return normalizedCurrentText + ' ' + suggestion.text;
  }

  const lastChar = normalizedCurrentText.trim().slice(-1);
  if (lastChar !== '.' && lastChar !== '!' && lastChar !== '?') {
    return normalizedCurrentText.trim() + '. ' + suggestion.text;
  }

  return normalizedCurrentText.trim() + ' ' + suggestion.text;
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
