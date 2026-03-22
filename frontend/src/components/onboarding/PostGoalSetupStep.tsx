import React from 'react';

import type { BrandData } from '../../types/brand';
import type {
  BusinessGoalOption,
  PostGoalFolder
} from '../../types/workspace';
import PostGoalComposerDialog from './post-goal-explorer/PostGoalComposerDialog';
import PostGoalDetailPane from './post-goal-explorer/PostGoalDetailPane';
import PostGoalSelectionTray from './post-goal-explorer/PostGoalSelectionTray';
import PostGoalSuggestionRail from './post-goal-explorer/PostGoalSuggestionRail';
import { usePostGoalSuggestions } from './post-goal-explorer/usePostGoalSuggestions';
import '../workspace/PostGoalWorkspace.css';

interface Props {
  brand: BrandData;
  businessGoal: BusinessGoalOption;
  postGoalFolders: PostGoalFolder[];
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onRemovePostGoal: (title: string) => void;
  showSelectionTray?: boolean;
}

const PostGoalSetupStep: React.FC<Props> = ({
  brand,
  businessGoal,
  postGoalFolders,
  onCreatePostGoal,
  onRemovePostGoal,
  showSelectionTray = true
}) => {
  const {
    activeSuggestedGoal,
    activeSuggestionId,
    activeTaxonomyDefinitions,
    applySuggestedGoal,
    closeComposer,
    composer,
    displayTitlesById,
    getGoalDraft,
    isLoadingSuggestions,
    openCustomComposer,
    postGoalSuggestions,
    saveComposer,
    selectedFolderTitles,
    setActiveSuggestionId,
    setComposer,
    updateGoalDraft
  } = usePostGoalSuggestions({
    brand,
    businessGoal,
    postGoalFolders,
    onCreatePostGoal,
    onRemovePostGoal
  });

  return (
    <div className="goal-selector">
      <section className="goal-selector-section">
        {isLoadingSuggestions && postGoalSuggestions.length === 0 ? (
          <div className="goal-selector-empty-note">
            Generating a fresh set of post-goal suggestions from your current brand narrative and business goal…
          </div>
        ) : postGoalSuggestions.length === 0 ? (
          <div className="goal-selector-empty-note">
            No suggested post goals are ready yet. Try adjusting the business goal or add your own post goal below.
          </div>
        ) : (
          <div className="post-goal-browser post-goal-browser--gallery">
            {activeSuggestedGoal && (
              <PostGoalDetailPane
                businessGoal={businessGoal}
                goal={activeSuggestedGoal}
                isSelected={selectedFolderTitles.has(activeSuggestedGoal.title)}
                taxonomyDefinitions={activeTaxonomyDefinitions}
                draftTitle={getGoalDraft(activeSuggestedGoal).title}
                draftDescription={getGoalDraft(activeSuggestedGoal).description}
                draftRationale={getGoalDraft(activeSuggestedGoal).rationale}
                onChangeDraft={(field, value) => updateGoalDraft(activeSuggestedGoal.id, field, value)}
                onApplyGoal={applySuggestedGoal}
                onRemoveGoal={onRemovePostGoal}
              />
            )}

            <PostGoalSuggestionRail
              suggestions={postGoalSuggestions}
              activeSuggestionId={activeSuggestionId}
              selectedFolderTitles={selectedFolderTitles}
              displayTitlesById={displayTitlesById}
              onSelectSuggestion={setActiveSuggestionId}
              onCreateCustomGoal={openCustomComposer}
            />
          </div>
        )}
      </section>

      {showSelectionTray ? (
        <PostGoalSelectionTray
          postGoalFolders={postGoalFolders}
          onRemovePostGoal={onRemovePostGoal}
        />
      ) : null}

      {composer && (
        <div className="goal-dialog-backdrop" onClick={closeComposer}>
          <div className="goal-dialog" onClick={event => event.stopPropagation()}>
            <PostGoalComposerDialog
              businessGoalTitle={businessGoal.title}
              composer={composer}
              onChange={setComposer}
              onClose={closeComposer}
              onSave={saveComposer}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default PostGoalSetupStep;
