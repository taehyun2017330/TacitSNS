import { startTransition, useEffect, useMemo, useRef, useState } from 'react';

import { apiFetch } from '../../../config/api';
import {
  createPostGoalFolder,
  getPostGoalSuggestionsForBusinessGoal,
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

const cleanInlineText = (value: string) => value.replace(/\s+/g, ' ').trim();

const stripTerminalPunctuation = (value: string) => value.replace(/[.!?]+$/g, '').trim();

const ensureSentence = (value: string) => {
  const cleaned = cleanInlineText(value);
  if (!cleaned) {
    return '';
  }

  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`;
};

const lowerSentenceStart = (value: string) => (
  value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value
);

const buildWhyThisDirectionFallback = (
  goal: Pick<PostGoalSuggestion, 'description' | 'previewCaption' | 'imageTypeChips'>,
  businessGoalTitle: string
) => {
  const previewLead = stripTerminalPunctuation(goal.previewCaption ?? '');
  const descriptionLead = stripTerminalPunctuation(goal.description);
  const primaryDirection = cleanInlineText(goal.imageTypeChips?.[0] ?? '');
  const businessGoal = cleanInlineText(businessGoalTitle) || 'the business goal';

  if (previewLead) {
    return ensureSentence(
      `It turns ${businessGoal.toLowerCase()} into a clearer first post by using ${lowerSentenceStart(previewLead)}`
    );
  }

  if (descriptionLead) {
    return ensureSentence(
      `It gives ${businessGoal.toLowerCase()} a more concrete visual route by focusing on ${lowerSentenceStart(descriptionLead)}`
    );
  }

  if (primaryDirection) {
    return ensureSentence(
      `It gives ${businessGoal.toLowerCase()} a usable first post through a ${primaryDirection.toLowerCase()} direction people can understand quickly`
    );
  }

  return ensureSentence(
    `It gives ${businessGoal.toLowerCase()} a clearer visual route the brand can explore next`
  );
};

interface Args {
  brand: BrandData;
  businessGoal: BusinessGoalOption;
  postGoalFolders: PostGoalFolder[];
  refreshToken?: number;
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onRemovePostGoal: (folderId: string) => void;
}

async function requestPostGoalPreviewImage(
  brand: BrandData,
  businessGoal: BusinessGoalOption,
  goal: PostGoalSuggestion
) {
  const primaryDirectionChip = goal.imageTypeChips?.[0];
  const primaryDirectionAngle = goal.directionAngles?.[0];
  const directionAngle = [
    `Create one strong Instagram-ready example image for the post-goal direction "${goal.title}".`,
    primaryDirectionChip ? `Primary image direction: ${primaryDirectionChip}.` : '',
    primaryDirectionAngle ? `Direction angle for this first example: ${primaryDirectionAngle}` : '',
    goal.description,
    goal.previewTitle ? `Example image concept: ${goal.previewTitle}.` : '',
    goal.previewCaption || '',
    goal.assistantPrompt,
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

async function requestReferencePostGoalSuggestion(
  brand: BrandData,
  businessGoal: BusinessGoalOption,
  businessGoalSourceId: string,
  referenceAsset: PostGoalReferenceAsset
) {
  const response = await apiFetch('/api/post-goal-reference-suggestion', {
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
      businessGoalRationale: businessGoal.rationale,
      referenceImageUrl: referenceAsset.dataUrl
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { detail?: string } | null;
    throw new Error(payload?.detail || `Reference post-goal suggestion failed with ${response.status}`);
  }

  const payload = await response.json() as {
    suggestion?: Partial<PostGoalSuggestion>;
  };

  if (!payload.suggestion) {
    throw new Error('Reference post-goal suggestion returned no draft');
  }

  return payload.suggestion;
}

const buildGoalDraft = (
  goal: Pick<PostGoalSuggestion, 'title' | 'description' | 'whyThisDirectionFits' | 'previewCaption' | 'imageTypeChips'>,
  businessGoalTitle: string
): GoalDraft => ({
  title: goal.title,
  description: goal.description,
  rationale: ensureSentence(goal.whyThisDirectionFits ?? '') || buildWhyThisDirectionFallback(goal, businessGoalTitle)
});

export function usePostGoalSuggestions({
  brand,
  businessGoal,
  postGoalFolders,
  refreshToken = 0,
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
  }, [businessGoal.id, refreshToken]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingSuggestions(true);

    const applySuggestions = (goals: PostGoalSuggestion[]) => {
      startTransition(() => {
        setSuggestedPostGoals(goals);
        setActiveSuggestionId(currentId =>
          goals.some(goal => goal.id === currentId)
            ? currentId
            : goals[0]?.id ?? null
        );
      });
      void generatePreviewImages(goals);
    };

    const requestSuggestionsOnce = async () => {
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
              whyThisDirectionFits: suggestion.whyThisDirectionFits?.trim(),
              taxonomyTags: suggestion.taxonomyTags?.length ? suggestion.taxonomyTags : ['Custom'],
              directions: suggestion.directions?.length ? suggestion.directions : [],
              imageTypeChips: suggestion.imageTypeChips?.length ? suggestion.imageTypeChips : [],
              directionAngles: suggestion.directionAngles?.length ? suggestion.directionAngles : [],
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

      return {
        payloadSource: payload.source ?? 'fallback',
        suggestions: normalizedSuggestions
      };
    };

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
        const initialResult = await requestSuggestionsOnce();

        if (cancelled) {
          return;
        }

        applySuggestions(initialResult.suggestions);

        if (initialResult.payloadSource !== 'ai') {
          for (const retryDelay of [1200, 2600]) {
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            if (cancelled) {
              return;
            }

            try {
              const retriedResult = await requestSuggestionsOnce();
              if (cancelled) {
                return;
              }

              if (retriedResult.payloadSource === 'ai') {
                applySuggestions(retriedResult.suggestions);
                break;
              }
            } catch {
              // Keep the current fallback set if retries fail.
            }
          }
        }
      } catch {
        if (!cancelled) {
          applySuggestions(fallbackSuggestedPostGoals);
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
    fallbackSuggestedPostGoals,
    refreshToken
  ]);

  useEffect(() => {
    setActiveSuggestionId(currentId =>
      suggestedPostGoals.some(goal => goal.id === currentId)
        ? currentId
        : suggestedPostGoals[0]?.id ?? null
    );
  }, [suggestedPostGoals]);

  const activeSuggestedGoal = suggestedPostGoals.find(goal => goal.id === activeSuggestionId) ?? suggestedPostGoals[0] ?? null;

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
          rationale: currentDraft?.rationale ?? buildGoalDraft(sourceGoal ?? {
            title: '',
            description: '',
            assistantPrompt: '',
            id: '',
            taxonomyTags: []
          }, businessGoal.title).rationale,
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
      whyThisDirectionFits: rationale || goal.whyThisDirectionFits,
      directions: goal.directions,
      imageTypeChips: goal.imageTypeChips,
      directionAngles: goal.directionAngles,
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

    createGoal(draftedGoal, goal.sourceLabel === 'custom' ? 'custom' : 'recommended');
  };

  const setComposerReferenceAssets = async (referenceAssets: PostGoalReferenceAsset[]) => {
    const referenceAsset = referenceAssets[0] ?? null;

    setComposer(current => {
      if (!current || current.mode !== 'custom' || current.inputMethod !== 'reference') {
        return current;
      }

      return {
        ...current,
        referenceAssets,
        isGeneratingReferenceDraft: Boolean(referenceAsset),
        referenceGenerationError: '',
        lastReferenceDraftAssetId: referenceAsset?.id ?? null
      };
    });

    if (!referenceAsset) {
      return;
    }

    try {
      const generatedSuggestion = await requestReferencePostGoalSuggestion(
        brand,
        businessGoal,
        businessGoalSourceId,
        referenceAsset
      );

      const customSuggestion = normalizePostGoalSuggestion(
        {
          id:
            generatedSuggestion.id ||
            `reference-${referenceAsset.id}`,
          title: generatedSuggestion.title?.trim() || 'Reference-led post goal',
          description:
            generatedSuggestion.description?.trim() ||
            `A post direction inspired by the uploaded reference image for ${businessGoal.title.toLowerCase()}.`,
          whyThisDirectionFits:
            generatedSuggestion.whyThisDirectionFits?.trim() ||
            buildWhyThisDirectionFallback(
              {
                description:
                  generatedSuggestion.description?.trim() ||
                  `A post direction inspired by the uploaded reference image for ${businessGoal.title.toLowerCase()}.`,
                previewCaption: generatedSuggestion.previewCaption?.trim(),
                imageTypeChips: generatedSuggestion.imageTypeChips
              },
              businessGoal.title
            ),
          taxonomyTags: generatedSuggestion.taxonomyTags?.length ? generatedSuggestion.taxonomyTags : ['Custom'],
          directions: generatedSuggestion.directions?.length ? generatedSuggestion.directions : [],
          imageTypeChips: generatedSuggestion.imageTypeChips?.length ? generatedSuggestion.imageTypeChips : [],
          directionAngles: generatedSuggestion.directionAngles?.length ? generatedSuggestion.directionAngles : [],
          assistantPrompt:
            generatedSuggestion.assistantPrompt?.trim() ||
            `Create a post direction inspired by the uploaded reference image for ${generatedSuggestion.title?.trim() || 'this post goal'}.`,
          previewTitle: generatedSuggestion.previewTitle?.trim() || generatedSuggestion.title?.trim(),
          previewCaption: generatedSuggestion.previewCaption?.trim() || generatedSuggestion.description?.trim(),
          previewBackground: generatedSuggestion.previewBackground,
          previewImageUrl: referenceAsset.dataUrl,
          referenceAssets: [referenceAsset],
          sourceLabel: 'custom'
        },
        suggestedPostGoals.length
      );

      startTransition(() => {
        setSuggestedPostGoals(prev => [...prev, customSuggestion]);
        setActiveSuggestionId(customSuggestion.id);
        setDraftByGoalId(prev => ({
          ...prev,
          [customSuggestion.id]: buildGoalDraft(customSuggestion, businessGoal.title)
        }));
      });

      setComposer(null);
    } catch (error: any) {
      setComposer(current => {
        if (!current || current.mode !== 'custom' || current.inputMethod !== 'reference') {
          return current;
        }

        return {
          ...current,
          referenceAssets,
          isGeneratingReferenceDraft: false,
          referenceGenerationError:
            error?.message || 'Failed to turn the reference image into a post-goal draft.',
          lastReferenceDraftAssetId: referenceAsset.id
        };
      });
    }
  };

  const openCustomComposer = () => {
    setComposer({
      mode: 'custom',
      inputMethod: null,
      title: '',
      description: '',
      rationale: '',
      referenceAssets: [],
      isGeneratingReferenceDraft: false,
      referenceGenerationError: '',
      lastReferenceDraftAssetId: null
    });
  };

  const closeComposer = () => {
    setComposer(null);
  };

  const saveComposer = () => {
    if (!composer) {
      return;
    }

    if (composer.inputMethod === 'reference') {
      return;
    }

    if (!composer.title.trim()) {
      return;
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
        whyThisDirectionFits: rationale || buildWhyThisDirectionFallback(
          {
            description,
            previewCaption: description,
            imageTypeChips: baseGoal?.imageTypeChips
          },
          businessGoal.title
        ),
        taxonomyTags:
          baseGoal?.taxonomyTags ??
          (composer.inputMethod === 'reference' ? ['Experiential', 'Brand resonance'] : ['Custom']),
        imageTypeChips: baseGoal?.imageTypeChips ?? [],
        directionAngles:
          baseGoal?.directionAngles ??
          (baseGoal?.imageTypeChips?.length
            ? baseGoal.imageTypeChips.map(chip => `Instagram-ready image centered on ${chip} for ${title}.`).slice(0, 4)
            : [
                `Hero image introducing ${title}.`,
                `Closer detail view for ${title}.`,
                `Human-centered version of ${title}.`,
                `Editorial composition for ${title}.`
              ]),
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
    closeComposer();
  };

  return {
    activeSuggestedGoal,
    activeSuggestionId,
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
    setComposerReferenceAssets,
    closeComposer,
    updateGoalDraft,
    applySuggestedGoal
  };
}
