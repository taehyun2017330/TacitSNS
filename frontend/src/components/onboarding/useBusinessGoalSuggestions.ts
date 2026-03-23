import { startTransition, useEffect, useMemo, useState } from 'react';

import { ApiUnavailableError, apiFetch } from '../../config/api';
import {
  getBusinessGoalLibrary,
  inferBusinessGoalOptions,
  normalizeBusinessGoalInput
} from '../../data/goalHierarchy';
import type { BrandData } from '../../types/brand';
import type { BusinessGoalOption } from '../../types/workspace';
import { buildGoalSourceSignature, canGenerateGoals } from './brandOnboarding.utils';

type SuggestionSource = 'ai' | 'fallback';

interface Args {
  brand: BrandData;
  enabled: boolean;
}

function mergeAiSuggestionsWithLibrary(
  suggestions: Array<{
    id: string;
    title: string;
    description: string;
    rationale: string;
  }>
) {
  const definitionsById = new Map(getBusinessGoalLibrary().map(goal => [goal.id, goal]));

  return suggestions
    .map((suggestion, index) => {
      const inferredMapping = normalizeBusinessGoalInput(
        `${suggestion.title} ${suggestion.description} ${suggestion.rationale}`
      );
      const mappedGoalId = inferredMapping.mappedGoalId;
      const mappedDefinition = mappedGoalId ? definitionsById.get(mappedGoalId) : undefined;
      const normalizedId =
        suggestion.id?.trim() ||
        suggestion.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') ||
        `ai-business-goal-${index + 1}`;

      return {
        id: normalizedId,
        title: suggestion.title.trim(),
        description: suggestion.description.trim(),
        rationale: suggestion.rationale.trim(),
        rank: index + 1,
        isRecommended: true,
        mappedGoalId,
        mappedGoalTitle: mappedDefinition?.title
      } satisfies BusinessGoalOption;
    })
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
            title: string;
            description: string;
            rationale: string;
          }>;
          source?: SuggestionSource;
        };

        const normalized = mergeAiSuggestionsWithLibrary(payload.suggestions ?? []);
        if (normalized.length !== 3) {
          throw new Error('No AI business goal suggestions returned');
        }

        if (!cancelled) {
          startTransition(() => {
            setSuggestedGoals(normalized);
            setSuggestionSource('ai');
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
    suggestionSource
  };
}
