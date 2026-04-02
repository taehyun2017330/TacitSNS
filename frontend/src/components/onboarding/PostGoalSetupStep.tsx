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
  onRemovePostGoal: (folderId: string) => void;
  showSelectionTray?: boolean;
  refreshToken?: number;
}

const PostGoalSetupStep: React.FC<Props> = ({
  brand,
  businessGoal,
  postGoalFolders,
  onCreatePostGoal,
  onRemovePostGoal,
  showSelectionTray = true,
  refreshToken = 0
}) => {
  const {
    activeSuggestedGoal,
    activeSuggestionId,
    applySuggestedGoal,
    closeComposer,
    composer,
    displayTitlesById,
    getGoalDraft,
    isLoadingSuggestions,
    loadingPreviewIds,
    openCustomComposer,
    postGoalSuggestions,
    saveComposer,
    selectedFolderIds,
    setActiveSuggestionId,
    setComposer,
    setComposerReferenceAssets,
    updateGoalDraft
  } = usePostGoalSuggestions({
    brand,
    businessGoal,
    postGoalFolders,
    refreshToken,
    onCreatePostGoal,
    onRemovePostGoal
  });

  return (
    <div className="goal-selector">
      <section className="goal-selector-section">
        {isLoadingSuggestions && postGoalSuggestions.length === 0 ? (
          <div className="post-goal-browser post-goal-browser--gallery post-goal-browser--loading">
            <article className="post-goal-detail-card post-goal-detail-card--loading">
              <div className="post-goal-detail-layout">
                <div className="post-goal-detail-visual-column">
                  <div className="post-goal-preview-gallery">
                    <div className="post-goal-preview-stage">
                      <article className="post-goal-preview-canvas post-goal-preview-canvas--loading" />
                    </div>
                  </div>
                </div>
                <aside className="post-goal-detail-aside">
                  <div className="post-goal-detail-header post-goal-detail-header--aside">
                    <div className="goal-loading-line goal-loading-line--title" />
                    <div className="goal-loading-line goal-loading-line--body" />
                    <div className="goal-loading-line goal-loading-line--body goal-loading-line--short" />
                  </div>
                  <section className="post-goal-detail-panel">
                    <div className="goal-loading-line goal-loading-line--body" />
                    <div className="goal-loading-line goal-loading-line--body goal-loading-line--short" />
                    <div className="post-goal-taxonomy-themes">
                      {Array.from({ length: 4 }).map((_, index) => (
                        <span key={index} className="post-goal-taxonomy-theme post-goal-taxonomy-theme--loading" />
                      ))}
                    </div>
                  </section>
                </aside>
              </div>
            </article>

            <div className="post-goal-browser-list" aria-hidden="true">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="post-goal-browser-item post-goal-browser-item--loading">
                  <div className="post-goal-browser-item-visual post-goal-browser-item-visual--loading">
                    <div className="post-goal-browser-item-overlay">
                      <div className="goal-loading-line goal-loading-line--title" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : postGoalSuggestions.length === 0 ? (
          <div className="goal-selector-empty-note">
            No suggested post goals are ready yet. Try adjusting the business goal or add your own post goal below.
          </div>
        ) : (
          <div className="post-goal-browser post-goal-browser--gallery">
            {activeSuggestedGoal && (
              <PostGoalDetailPane
                goal={activeSuggestedGoal}
                isPreviewLoading={Boolean(loadingPreviewIds[activeSuggestedGoal.id])}
                isSelected={selectedFolderIds.has(activeSuggestedGoal.id)}
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
              loadingPreviewIds={loadingPreviewIds}
              selectedFolderIds={selectedFolderIds}
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
              onReferenceAssetsChange={setComposerReferenceAssets}
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
