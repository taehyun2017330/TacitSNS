import { autocompleteApiFetch } from '../../config/api';
import type {
  BrandAutocompleteResponse,
  BrandContext,
  ModelConfig,
  SentenceAnnotation,
  SentenceSegment
} from '../../types/brandAutocomplete';

import { normalizeTargets } from './utils';

interface SuggestionRequestPayload {
  brandContext: BrandContext;
  currentText: string;
  sessionId: string;
  modelConfig: ModelConfig;
}

export async function requestSuggestions({
  brandContext,
  currentText,
  sessionId,
  modelConfig
}: SuggestionRequestPayload): Promise<BrandAutocompleteResponse> {
  const response = await autocompleteApiFetch('/api/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandName: brandContext.brandName,
      brandCategory: brandContext.brandCategory,
      brandIdentity: brandContext.brandIdentity ?? '',
      currentText,
      sessionId,
      modelConfig
    })
  });

  return response.json();
}

export async function requestSentenceAnnotation({
  brandContext,
  sentenceText,
  modelConfig
}: {
  brandContext: BrandContext;
  sentenceText: string;
  modelConfig: ModelConfig;
}): Promise<SentenceAnnotation> {
  const response = await autocompleteApiFetch('/api/annotate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandName: brandContext.brandName,
      brandCategory: brandContext.brandCategory,
      brandIdentity: brandContext.brandIdentity ?? '',
      sentenceText,
      modelConfig
    })
  });

  const data = (await response.json()) as SentenceAnnotation;
  return sanitizeAnnotation(data, sentenceText);
}

export function sanitizeAnnotation(data: SentenceAnnotation | undefined, sentenceText: string): SentenceAnnotation {
  const segments: SentenceSegment[] = Array.isArray(data?.segments)
    ? data.segments
    : [{ text: sentenceText, targets: [] }];

  return {
    segments: segments.map(segment => ({
      text: segment.text || '',
      targets: normalizeTargets(segment.targets)
    })),
    sentenceTargets: normalizeTargets(data?.sentenceTargets)
  };
}
