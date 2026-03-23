import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

import { apiFetch } from '../../../config/api';
import {
  createPostGoalFolder,
  getPostGoalSuggestionsForBusinessGoal,
  getTaxonomyDefinitions,
  normalizePostGoalSuggestion,
  resolvePostGoalSuggestionKey
} from '../../../data/goalHierarchy';
import type { BrandData } from '../../../types/brand';
import type {
  BusinessGoalOption,
  PostGoalFolder,
  PostGoalReferenceAsset,
  PostGoalSuggestion
} from '../../../types/workspace';
import type { PostGoalComposerState } from './postGoalExplorer.types';

type GoalDraft = {
  title: string;
  description: string;
  rationale: string;
};

interface Args {
  brand: BrandData;
  businessGoal: BusinessGoalOption;
  postGoalFolders: PostGoalFolder[];
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onRemovePostGoal: (folderId: string) => void;
}

async function requestPostGoalPreviewImage(
  brand: BrandData,
  businessGoal: BusinessGoalOption,
  goal: PostGoalSuggestion
) {
  const taxonomyDefinitions = getTaxonomyDefinitions(goal.taxonomyTags);
  const commonThemes = Array.from(new Set(taxonomyDefinitions.flatMap(item => item.themes))).slice(0, 5);
  const directionAngle = [
    `Create one strong Instagram-ready example image for the post-goal direction "${goal.title}".`,
    goal.description,
    goal.assistantPrompt,
    goal.taxonomyTags.length ? `Relevant post categories: ${goal.taxonomyTags.join(', ')}.` : '',
    commonThemes.length ? `Common themes to include: ${commonThemes.join(', ')}.` : '',
    'This should feel like one clear example post, not a collage, moodboard, or UI mockup.'
  ].filter(Boolean).join(' ');

  const brandSummary = [
    `${brand.name || 'Brand'} - ${brand.category || 'Business'}:`,
    brand.identity,
    brand.description,
    `Business goal: ${businessGoal.title}. ${businessGoal.description}`,
    businessGoal.rationale ? `Why this fits: ${businessGoal.rationale}` : ''
  ].filter(Boolean).join(' ');

  const response = await apiFetch('/api/generate-post-images', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      brandSummary,
      similarity: 50,
      explorationLevel: 0.5,
      direction: goal.title,
      directionAngles: [directionAngle],
      actionType: 'initial',
      numImages: 1
    })
  });

  if (!response.ok) {
    throw new Error(`Post goal preview generation failed with ${response.status}`);
  }

  const payload = await response.json() as {
    posts?: Array<{ imageUrl?: string }>;
  };

  return payload.posts?.[0]?.imageUrl ?? null;
}

const buildGoalDraft = (goal: PostGoalSuggestion, businessGoalTitle: string): GoalDraft => ({
  title: goal.title,
  description: goal.description,
  rationale: `This post goal supports "${businessGoalTitle}" for this brand.`
});

export function usePostGoalSuggestions({
  brand,
  businessGoal,
  postGoalFolders,
  onCreatePostGoal,
  onRemovePostGoal
}: Args) {
  const [composer, setComposer] = useState<PostGoalComposerState | null>(null);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [suggestedPostGoals, setSuggestedPostGoals] = useState<PostGoalSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [loadingPreviewIds, setLoadingPreviewIds] = useState<Record<string, boolean>>({});
  const [draftByGoalId, setDraftByGoalId] = useState<Record<string, GoalDraft>>({});
  const postGoalFoldersRef = useRef(postGoalFolders);

  const businessGoalSourceId = useMemo(
    () => resolvePostGoalSuggestionKey(businessGoal),
    [businessGoal]
  );
  const fallbackSuggestedPostGoals = useMemo(
    () => getPostGoalSuggestionsForBusinessGoal(businessGoalSourceId),
    [businessGoalSourceId]
  );
  const selectedFolderIds = useMemo(
    () => new Set(postGoalFolders.map(folder => folder.id)),
    [postGoalFolders]
  );

  useEffect(() => {
    postGoalFoldersRef.current = postGoalFolders;
  }, [postGoalFolders]);

  useEffect(() => {
    setComposer(null);
    setDraftByGoalId({});
    setSuggestedPostGoals([]);
    setActiveSuggestionId(null);
    setLoadingPreviewIds({});
  }, [businessGoal.id]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingSuggestions(true);

    const generatePreviewImages = async (goals: PostGoalSuggestion[]) => {
      const pendingGoals = goals.filter(goal => !goal.previewImageUrl && !goal.referenceAssets?.length);
      if (pendingGoals.length === 0) {
        return;
      }

      setLoadingPreviewIds(
        Object.fromEntries(pendingGoals.map(goal => [goal.id, true]))
      );

      await Promise.allSettled(
        pendingGoals.map(async goal => {
          try {
            const previewImageUrl = await requestPostGoalPreviewImage(brand, businessGoal, goal);
            if (!previewImageUrl || cancelled) {
              return;
            }

            startTransition(() => {
              setSuggestedPostGoals(prev =>
                prev.map(existingGoal =>
                  existingGoal.id === goal.id
                    ? { ...existingGoal, previewImageUrl }
                    : existingGoal
                )
              );
            });

            const existingFolder = postGoalFoldersRef.current.find(folder =>
              folder.businessGoalId === businessGoal.id &&
              folder.title === goal.title
            );

            if (existingFolder) {
              onCreatePostGoal({
                ...existingFolder,
                previewImageUrl
              });
            }
          } catch {
            // Keep the temporary preview background if generation fails.
          } finally {
            if (!cancelled) {
              setLoadingPreviewIds(prev => {
                if (!prev[goal.id]) {
                  return prev;
                }

                const next = { ...prev };
                delete next[goal.id];
                return next;
              });
            }
          }
        })
      );
    };

    const fetchSuggestions = async () => {
      try {
        const response = await apiFetch('/api/post-goal-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandName: brand.name,
            brandCategory: brand.category,
            brandIdentity: brand.identity,
            brandNarrative: brand.description,
            businessGoalId: businessGoalSourceId,
            businessGoalTitle: businessGoal.title,
            businessGoalDescription: businessGoal.description,
            businessGoalRationale: businessGoal.rationale
          })
        });

        if (!response.ok) {
          throw new Error(`Post goal suggestions failed with ${response.status}`);
        }

        const payload = await response.json() as {
          suggestions?: Array<Partial<PostGoalSuggestion>>;
          source?: 'ai' | 'fallback';
        };

        const normalizedSuggestions = (payload.suggestions ?? [])
          .map((suggestion, index) =>
            normalizePostGoalSuggestion(
              {
                id: suggestion.id || `suggested-${businessGoalSourceId}-${index + 1}`,
                title: suggestion.title?.trim() || `Suggested post goal ${index + 1}`,
                description: suggestion.description?.trim() || 'A suggested image-post direction for this business goal.',
                taxonomyTags: suggestion.taxonomyTags?.length ? suggestion.taxonomyTags : ['Custom'],
                assistantPrompt:
                  suggestion.assistantPrompt?.trim() ||
                  `Create a post direction for ${suggestion.title?.trim() || `this ${businessGoal.title.toLowerCase()} goal`}.`,
                previewTitle: suggestion.previewTitle,
                previewCaption: suggestion.previewCaption,
                sourceLabel: payload.source === 'ai' ? 'ai' : 'fallback'
              },
              index
            )
          )
          .slice(0, 4);

        if (normalizedSuggestions.length === 0) {
          throw new Error('No AI post goal suggestions returned');
        }

        if (!cancelled) {
          startTransition(() => {
            setSuggestedPostGoals(normalizedSuggestions);
            setActiveSuggestionId(currentId =>
              normalizedSuggestions.some(goal => goal.id === currentId)
                ? currentId
                : normalizedSuggestions[0]?.id ?? null
            );
          });
          void generatePreviewImages(normalizedSuggestions);
        }
      } catch {
        if (!cancelled) {
          startTransition(() => {
            setSuggestedPostGoals(fallbackSuggestedPostGoals);
            setActiveSuggestionId(currentId =>
              fallbackSuggestedPostGoals.some(goal => goal.id === currentId)
                ? currentId
                : fallbackSuggestedPostGoals[0]?.id ?? null
            );
          });
          void generatePreviewImages(fallbackSuggestedPostGoals);
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
    brand.category,
    brand.description,
    brand.identity,
    brand.name,
    businessGoal.description,
    businessGoal.rationale,
    businessGoal.title,
    businessGoalSourceId,
    fallbackSuggestedPostGoals
  ]);

  useEffect(() => {
    setActiveSuggestionId(currentId =>
      suggestedPostGoals.some(goal => goal.id === currentId)
        ? currentId
        : suggestedPostGoals[0]?.id ?? null
    );
  }, [suggestedPostGoals]);

  const activeSuggestedGoal = suggestedPostGoals.find(goal => goal.id === activeSuggestionId) ?? suggestedPostGoals[0] ?? null;
  const activeTaxonomyDefinitions = activeSuggestedGoal
    ? getTaxonomyDefinitions(activeSuggestedGoal.taxonomyTags)
    : [];

  const getGoalDraft = (goal: PostGoalSuggestion) =>
    draftByGoalId[goal.id] ?? buildGoalDraft(goal, businessGoal.title);

  const displayTitlesById = useMemo(
    () => Object.fromEntries(suggestedPostGoals.map(goal => [goal.id, getGoalDraft(goal).title])),
    [draftByGoalId, suggestedPostGoals]
  );

  const updateGoalDraft = (
    goalId: string,
    field: 'title' | 'description',
    value: string
  ) => {
    const sourceGoal = suggestedPostGoals.find(goal => goal.id === goalId);

    setDraftByGoalId(prev => {
      const currentDraft = prev[goalId];

      return {
        ...prev,
        [goalId]: {
          title: currentDraft?.title ?? sourceGoal?.title ?? '',
          description: currentDraft?.description ?? sourceGoal?.description ?? '',
          rationale: currentDraft?.rationale ?? `This post goal supports "${businessGoal.title}" for this brand.`,
          [field]: value
        }
      };
    });
  };

  const buildDraftedSuggestion = (goal: PostGoalSuggestion) => {
    const draft = getGoalDraft(goal);
    const title = draft.title.trim() || goal.title;
    const description = draft.description.trim() || goal.description;
    const rationale = draft.rationale.trim();

    return {
      ...goal,
      title,
      description,
      assistantPrompt: rationale
        ? `${goal.assistantPrompt} Context: ${rationale}`
        : goal.assistantPrompt,
      previewTitle: goal.previewTitle || title,
      previewCaption: description
    } satisfies PostGoalSuggestion;
  };

  const createGoal = (
    goal: PostGoalSuggestion,
    source: PostGoalFolder['source'],
    referenceAssets: PostGoalReferenceAsset[] = []
  ) => {
    onCreatePostGoal(
      createPostGoalFolder(
        {
          ...goal,
          referenceAssets
        },
        businessGoal,
        source
      )
    );
  };

  const applySuggestedGoal = (goal: PostGoalSuggestion) => {
    const draftedGoal = buildDraftedSuggestion(goal);

    if (selectedFolderIds.has(goal.id) && draftedGoal.title !== goal.title) {
      onRemovePostGoal(goal.id);
    }

    setSuggestedPostGoals(prev =>
      prev.map(existingGoal =>
        existingGoal.id === goal.id
          ? { ...existingGoal, ...draftedGoal }
          : existingGoal
      )
    );

    createGoal(draftedGoal, 'recommended');
  };

  const openCustomComposer = () => {
    setComposer({
      mode: 'custom',
      inputMethod: null,
      title: '',
      description: '',
      rationale: '',
      referenceAssets: []
    });
  };

  const closeComposer = () => {
    setComposer(null);
  };

  const saveComposer = () => {
    if (!composer || !composer.title.trim()) {
      if (!(composer.inputMethod === 'reference' && composer.referenceAssets.length > 0)) {
        return;
      }
    }

    const baseGoal = composer.seed;
    const title =
      composer.title.trim() ||
      `Reference-led ${businessGoal.title.toLowerCase()} direction`;
    const description =
      composer.description.trim() ||
      (composer.inputMethod === 'reference' && composer.referenceAssets.length > 0
        ? `A post direction anchored by the uploaded reference image to support ${businessGoal.title.toLowerCase()}.`
        : `A post direction focused on ${title.toLowerCase()}.`);
    const rationale = composer.rationale.trim();

    const customSuggestion = normalizePostGoalSuggestion(
      {
        id: baseGoal?.id ?? `custom-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
        title,
        description,
        taxonomyTags:
          baseGoal?.taxonomyTags ??
          (composer.inputMethod === 'reference' ? ['Experiential', 'Brand resonance'] : ['Custom']),
        assistantPrompt:
          rationale
            ? `${baseGoal?.assistantPrompt ?? `Create a post direction for ${title}.`} Context: ${rationale}`
            : baseGoal?.assistantPrompt ??
              (composer.inputMethod === 'reference' && composer.referenceAssets.length > 0
                ? `Create a post direction inspired by the uploaded reference image for ${title}.`
                : `Create a post direction for ${title}.`),
        previewTitle: title,
        previewCaption: description,
        previewBackground:
          baseGoal?.previewBackground ??
          'linear-gradient(135deg, #35514d 0%, #8ca198 42%, #f1e5d5 100%)',
        referenceAssets: composer.referenceAssets,
        sourceLabel: 'custom'
      },
      suggestedPostGoals.length
    );

    setSuggestedPostGoals(prev => [...prev, customSuggestion]);
    setActiveSuggestionId(customSuggestion.id);
    createGoal(customSuggestion, 'custom', composer.referenceAssets);
    closeComposer();
  };

  return {
    activeSuggestedGoal,
    activeSuggestionId,
    activeTaxonomyDefinitions,
    composer,
    displayTitlesById,
    getGoalDraft,
    isLoadingSuggestions,
    loadingPreviewIds,
    openCustomComposer,
    postGoalSuggestions: suggestedPostGoals,
    saveComposer,
    selectedFolderIds,
    setActiveSuggestionId,
    setComposer,
    closeComposer,
    updateGoalDraft,
    applySuggestedGoal
  };
}
