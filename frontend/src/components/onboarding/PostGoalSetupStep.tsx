import React, { useEffect, useMemo, useState } from 'react';

import {
  createPostGoalFolder,
  getPostGoalSuggestionsForBusinessGoal,
  getTaxonomyDefinitions
} from '../../data/goalHierarchy';
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
  businessGoal: BusinessGoalOption;
  postGoalFolders: PostGoalFolder[];
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onRemovePostGoal: (title: string) => void;
}

const PostGoalSetupStep: React.FC<Props> = ({
  businessGoal,
  postGoalFolders,
  onCreatePostGoal,
  onRemovePostGoal
}) => {
  const [composer, setComposer] = useState<PostGoalComposerState | null>(null);
  const [activeSuggestionId, setActiveSuggestionId] = useState<string | null>(null);
  const [referenceAssetsByGoal, setReferenceAssetsByGoal] = useState<Record<string, PostGoalReferenceAsset[]>>({});
  const businessGoalSourceId = businessGoal.mappedGoalId ?? businessGoal.id;
  const suggestedPostGoals = useMemo(
    () => getPostGoalSuggestionsForBusinessGoal(businessGoalSourceId),
    [businessGoalSourceId]
  );
  const selectedFolderTitles = useMemo(
    () => new Set(postGoalFolders.map(folder => folder.title)),
    [postGoalFolders]
  );

  useEffect(() => {
    setComposer(null);
    setReferenceAssetsByGoal({});
  }, [businessGoal.id]);

  useEffect(() => {
    setActiveSuggestionId(suggestedPostGoals[0]?.id ?? null);
  }, [suggestedPostGoals]);

  const activeSuggestedGoal = suggestedPostGoals.find(goal => goal.id === activeSuggestionId) ?? suggestedPostGoals[0] ?? null;
  const activeTaxonomyDefinitions = activeSuggestedGoal
    ? getTaxonomyDefinitions(activeSuggestedGoal.taxonomyTags)
    : [];
  const activeReferenceAssets = activeSuggestedGoal
    ? referenceAssetsByGoal[activeSuggestedGoal.id] ?? []
    : [];

  const openCustomComposer = () => {
    setComposer({
      mode: 'custom',
      title: '',
      description: '',
      rationale: '',
      referenceAssets: []
    });
  };

  const openEditComposer = (goal: PostGoalSuggestion) => {
    setComposer({
      mode: 'edit',
      seed: goal,
      title: goal.title,
      description: goal.description,
      rationale: `This post goal supports "${businessGoal.title}" for this brand.`,
      referenceAssets: referenceAssetsByGoal[goal.id] ?? []
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
      return;
    }

    const baseGoal = composer.seed;
    const title = composer.title.trim();
    const description = composer.description.trim() || `A post direction focused on ${title.toLowerCase()}.`;
    const rationale = composer.rationale.trim();

    handleCreateGoal(
      {
        id: baseGoal?.id ?? `custom-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        title,
        description,
        taxonomyTags: baseGoal?.taxonomyTags ?? ['Custom'],
        assistantPrompt:
          rationale
            ? `${baseGoal?.assistantPrompt ?? `Create a post direction for ${title}.`} Context: ${rationale}`
            : baseGoal?.assistantPrompt ?? `Create a post direction for ${title}.`,
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

    if (baseGoal) {
      setReferenceAssetsByGoal(prev => ({
        ...prev,
        [baseGoal.id]: composer.referenceAssets
      }));
    }

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

      <section className="post-goal-context-card">
        <div className="post-goal-context-block">
          <div className="section-kicker">Business goal</div>
          <strong>{businessGoal.title}</strong>
          <p>{businessGoal.description}</p>
        </div>
        <div className="post-goal-context-block post-goal-context-block--guide">
          <div className="section-kicker">How to choose</div>
          <p>Each post goal is a different image exploration. Browse one direction at a time, inspect what kind of images it implies, then keep the ones you want as workspace folders.</p>
        </div>
      </section>

      <PostGoalSelectionTray
        postGoalFolders={postGoalFolders}
        onRemovePostGoal={onRemovePostGoal}
      />

      <section className="goal-selector-section">
        <div className="goal-selector-section-header">
          <div className="section-kicker">Suggested post goals</div>
          <p>Click through these suggested directions to inspect example images, supporting taxonomy, and attach your own reference if needed.</p>
        </div>

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
              referenceAssets={activeReferenceAssets}
              onReferenceAssetsChange={assets =>
                setReferenceAssetsByGoal(prev => ({
                  ...prev,
                  [activeSuggestedGoal.id]: assets
                }))
              }
              onEditGoal={openEditComposer}
              onChooseGoal={handleCreateGoal}
              onRemoveGoal={onRemovePostGoal}
            />
          )}
        </div>
      </section>

      <section className="goal-selector-section">
        <div className="goal-selector-section-header goal-selector-section-header--row">
          <div>
            <div className="section-kicker">Create your own</div>
            <p>If the suggested directions miss the mark, write your own post goal and optionally attach a reference image that captures the look you want.</p>
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
