import { startTransition, useEffect, useMemo, useState } from 'react';

import { ApiUnavailableError, apiFetch } from '../../config/api';
import {
  getBusinessGoalLibrary,
  inferBusinessGoalOptions
} from '../../data/goalHierarchy';
import type { BrandData } from '../../types/brand';
import type { BusinessGoalOption } from '../../types/workspace';
import { buildGoalSourceSignature, canGenerateGoals } from './brandOnboarding.utils';

type SuggestionSource = 'ai' | 'fallback';

interface Args {
  brand: BrandData;
  enabled: boolean;
}

function buildBusinessGoalPromptPreview(brand: BrandData) {
  const allowedGoals = getBusinessGoalLibrary()
    .map(goal => `- ${goal.id}: ${goal.title} — ${goal.description}`)
    .join('\n');

  return [
    'You are a senior business design manager for a novice-friendly social media planning tool.',
    '',
    'Recommend exactly 3 BUSINESS GOALS for this brand.',
    'A business goal is the broader outcome SNS marketing should support.',
    'The next step after this will be POST GOALS: specific kinds of posts and image directions.',
    'Choose goals that will naturally lead into strong post-goal exploration later.',
    '',
    `Brand name: ${brand.name || 'your brand'}`,
    `Industry: ${brand.category || 'business'}`,
    `Brand identity: ${brand.identity || ''}`,
    `Brand narrative: ${brand.description || ''}`,
    '',
    'Choose only from these allowed goal buckets:',
    allowedGoals,
    '',
    'Return strict JSON with 3 items containing: id, description, rationale.'
  ].join('\n');
}

function mergeAiSuggestionsWithLibrary(
  suggestions: Array<{
    id: string;
    title?: string;
    description?: string;
    rationale?: string;
  }>
) {
  const definitionsById = new Map(getBusinessGoalLibrary().map(goal => [goal.id, goal]));

  return suggestions
    .map((suggestion, index) => {
      const definition = definitionsById.get(suggestion.id);
      if (!definition) {
        return null;
      }

      return {
        id: definition.id,
        title: definition.title,
        description: suggestion.description?.trim() || definition.description,
        rationale: suggestion.rationale?.trim() || definition.fallbackRationale,
        rank: index + 1,
        isRecommended: true
      } satisfies BusinessGoalOption;
    })
    .filter((goal): goal is BusinessGoalOption => goal !== null)
    .slice(0, 3);
}

export function useBusinessGoalSuggestions({ brand, enabled }: Args) {
  const fallbackSuggestedGoals = useMemo(
    () => inferBusinessGoalOptions(brand),
    [brand]
  );
  const [suggestedGoals, setSuggestedGoals] = useState<BusinessGoalOption[]>(fallbackSuggestedGoals);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [suggestionSource, setSuggestionSource] = useState<SuggestionSource>('fallback');
  const [promptPreview, setPromptPreview] = useState('');
  const [lastFetchedSignature, setLastFetchedSignature] = useState('');

  const sourceSignature = useMemo(
    () => buildGoalSourceSignature(brand),
    [brand]
  );

  useEffect(() => {
    if (!enabled || !canGenerateGoals(brand)) {
      return;
    }

    if (lastFetchedSignature === sourceSignature && suggestionSource === 'ai') {
      return;
    }

    let cancelled = false;
    const prompt = buildBusinessGoalPromptPreview(brand);

    setPromptPreview(prompt);
    setIsLoadingSuggestions(true);

    const fetchSuggestions = async () => {
      try {
        const response = await apiFetch('/api/business-goal-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandName: brand.name,
            brandCategory: brand.category,
            brandIdentity: brand.identity,
            brandNarrative: brand.description
          })
        });

        if (!response.ok) {
          throw new Error(`Business goal suggestions failed with ${response.status}`);
        }

        const payload = await response.json() as {
          suggestions?: Array<{
            id: string;
            title?: string;
            description?: string;
            rationale?: string;
          }>;
          source?: SuggestionSource;
          prompt?: string;
        };

        const normalized = mergeAiSuggestionsWithLibrary(payload.suggestions ?? []);
        if (normalized.length !== 3) {
          throw new Error('No AI business goal suggestions returned');
        }

        if (!cancelled) {
          startTransition(() => {
            setSuggestedGoals(normalized);
            setSuggestionSource('ai');
            setPromptPreview(payload.prompt || prompt);
            setLastFetchedSignature(sourceSignature);
          });
        }
      } catch (error) {
        if (!cancelled) {
          startTransition(() => {
            setSuggestedGoals(fallbackSuggestedGoals);
            setSuggestionSource('fallback');
            setLastFetchedSignature(sourceSignature);
          });
        }

        if (!(error instanceof ApiUnavailableError)) {
          console.error('Business goal suggestion generation failed:', error);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingSuggestions(false);
        }
      }
    };

    void fetchSuggestions();

    return () => {
      cancelled = true;
    };
  }, [
    brand,
    enabled,
    fallbackSuggestedGoals,
    lastFetchedSignature,
    sourceSignature,
    suggestionSource
  ]);

  return {
    suggestedGoals,
    isLoadingSuggestions,
    suggestionSource,
    promptPreview
  };
}
