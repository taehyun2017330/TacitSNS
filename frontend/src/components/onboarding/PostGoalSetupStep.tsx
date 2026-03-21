import React, { startTransition, useEffect, useMemo, useState } from 'react';

import {
  createPostGoalFolder,
  getPostGoalSuggestionsForBusinessGoal,
  getTaxonomyDefinitions,
  normalizePostGoalSuggestion,
  resolvePostGoalSuggestionKey
} from '../../data/goalHierarchy';
import { apiFetch } from '../../config/api';
import type { BrandData } from '../../types/brand';
import type {
  BusinessGoalOption,
  PostGoalFolder,
  PostGoalReferenceAsset,
  PostGoalSuggestion
} from '../../types/workspace';
import PostGoalComposerDialog from './post-goal-explorer/PostGoalComposerDialog';
import PostGoalDetailPane from './post-goal-explorer/PostGoalDetailPane';
import PostGoalSelectionTray from './post-goal-explorer/PostGoalSelectionTray';
import PostGoalSuggestionRail from './post-goal-explorer/PostGoalSuggestionRail';
import type { PostGoalComposerState } from './post-goal-explorer/postGoalExplorer.types';
import '../workspace/PostGoalWorkspace.css';

interface Props {
  brand: BrandData;
  businessGoal: BusinessGoalOption;
  postGoalFolders: PostGoalFolder[];
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onRemovePostGoal: (title: string) => void;
}

const PostGoalSetupStep: React.FC<Props> = ({
  brand,
  businessGoal,
  postGoalFolders,
  onCreatePostGoal,
  onRemovePostGoal
}) => {
  const [composer, setComposer] = useState<PostGoalComposerState | null>(null);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [suggestedPostGoals, setSuggestedPostGoals] = useState<PostGoalSuggestion[]>([]);
  const [suggestionSource, setSuggestionSource] = useState<'ai' | 'fallback'>('fallback');
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const businessGoalSourceId = useMemo(
    () => resolvePostGoalSuggestionKey(businessGoal),
    [businessGoal]
  );
  const fallbackSuggestedPostGoals = useMemo(
    () => getPostGoalSuggestionsForBusinessGoal(businessGoalSourceId),
    [businessGoalSourceId]
  );
  const selectedFolderTitles = useMemo(
    () => new Set(postGoalFolders.map(folder => folder.title)),
    [postGoalFolders]
  );

  useEffect(() => {
    setComposer(null);
  }, [businessGoal.id]);

  useEffect(() => {
    startTransition(() => {
      setSuggestedPostGoals(fallbackSuggestedPostGoals);
      setSuggestionSource('fallback');
      setActiveSuggestionId(fallbackSuggestedPostGoals[0]?.id ?? null);
    });
  }, [fallbackSuggestedPostGoals]);

  useEffect(() => {
    let cancelled = false;
    setIsLoadingSuggestions(true);

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

        if (!cancelled && normalizedSuggestions.length > 0) {
          startTransition(() => {
            setSuggestedPostGoals(normalizedSuggestions);
            setSuggestionSource(payload.source === 'ai' ? 'ai' : 'fallback');
            setActiveSuggestionId(currentId =>
              normalizedSuggestions.some(goal => goal.id === currentId)
                ? currentId
                : normalizedSuggestions[0]?.id ?? null
            );
          });
        }
      } catch {
        if (!cancelled) {
          startTransition(() => {
            setSuggestedPostGoals(fallbackSuggestedPostGoals);
            setSuggestionSource('fallback');
            setActiveSuggestionId(currentId =>
              fallbackSuggestedPostGoals.some(goal => goal.id === currentId)
                ? currentId
                : fallbackSuggestedPostGoals[0]?.id ?? null
            );
          });
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
    setActiveSuggestionId(suggestedPostGoals[0]?.id ?? null);
  }, [suggestedPostGoals]);

  const activeSuggestedGoal = suggestedPostGoals.find(goal => goal.id === activeSuggestionId) ?? suggestedPostGoals[0] ?? null;
  const activeTaxonomyDefinitions = activeSuggestedGoal
    ? getTaxonomyDefinitions(activeSuggestedGoal.taxonomyTags)
    : [];

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

  const openEditComposer = (goal: PostGoalSuggestion) => {
    setComposer({
      mode: 'edit',
      inputMethod: 'text',
      seed: goal,
      title: goal.title,
      description: goal.description,
      rationale: `This post goal supports "${businessGoal.title}" for this brand.`,
      referenceAssets: []
    });
  };

  const closeComposer = () => {
    setComposer(null);
  };

  const handleCreateGoal = (
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

  const handleSaveComposer = () => {
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

    handleCreateGoal(
      {
        id: baseGoal?.id ?? `custom-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
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
        referenceAssets: composer.referenceAssets
      },
      composer.mode === 'edit' ? 'recommended' : 'custom',
      composer.referenceAssets
    );

    closeComposer();
  };

  return (
    <div className="goal-selector">
      <div className="goal-selector-header">
        <div className="section-kicker">Post goals</div>
        <h3>What kinds of image posts should support {businessGoal.title.toLowerCase()}?</h3>
        <p>
          These are specific image directions, not final deliverables. Click through suggested directions, inspect what they could look like, and keep the ones you want to explore in the workspace.
        </p>
      </div>

      <PostGoalSelectionTray
        postGoalFolders={postGoalFolders}
        onRemovePostGoal={onRemovePostGoal}
      />

      <section className="goal-selector-section">
        <div className="goal-selector-section-header">
        <div className="section-kicker">Suggested post goals</div>
          <p>
            {suggestionSource === 'ai'
              ? 'Suggested from your brand narrative, chosen business goal, and post taxonomy. Click one to inspect example imagery before choosing it.'
              : 'Suggested from the current post-goal library. Click one to inspect example imagery before choosing it.'}
          </p>
        </div>

        {isLoadingSuggestions && suggestedPostGoals.length === 0 ? (
          <div className="goal-selector-empty-note">
            Generating suggested post goals from your brand narrative and chosen business goal…
          </div>
        ) : suggestedPostGoals.length === 0 ? (
          <div className="goal-selector-empty-note">
            No suggested post goals are ready yet. Try adjusting the business goal or add your own post goal below.
          </div>
        ) : (
          <div className="post-goal-browser">
            <PostGoalSuggestionRail
              suggestions={suggestedPostGoals}
              activeSuggestionId={activeSuggestionId}
              selectedFolderTitles={selectedFolderTitles}
              onSelectSuggestion={setActiveSuggestionId}
            />

            {activeSuggestedGoal && (
              <PostGoalDetailPane
                businessGoal={businessGoal}
                goal={activeSuggestedGoal}
                isSelected={selectedFolderTitles.has(activeSuggestedGoal.title)}
                taxonomyDefinitions={activeTaxonomyDefinitions}
                onEditGoal={openEditComposer}
                onChooseGoal={goal => handleCreateGoal(goal, 'recommended')}
                onRemoveGoal={onRemovePostGoal}
              />
            )}
          </div>
        )}
      </section>

      <section className="goal-selector-section">
        <div className="goal-selector-section-header goal-selector-section-header--row">
          <div>
            <div className="section-kicker">Create your own</div>
            <p>If the suggestions miss the mark, start from a reference image or write your own post-goal direction.</p>
          </div>
          <button
            type="button"
            className="goal-pill goal-pill--add"
            onClick={openCustomComposer}
          >
            <span className="goal-pill-add-icon">+</span>
            <span>Add your own post goal</span>
          </button>
        </div>
      </section>

      {composer && (
        <PostGoalComposerDialog
          businessGoalTitle={businessGoal.title}
          composer={composer}
          onChange={setComposer}
          onClose={closeComposer}
          onSave={handleSaveComposer}
        />
      )}
    </div>
  );
};

export default PostGoalSetupStep;
