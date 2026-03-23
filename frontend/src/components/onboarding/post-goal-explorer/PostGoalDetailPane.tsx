import React from 'react';

import type {
  BusinessGoalOption,
  PostGoalSuggestion
} from '../../../types/workspace';
import InlineEditableText from '../InlineEditableText';
import PostGoalExampleGallery from './PostGoalExampleGallery';

interface Props {
  businessGoal: BusinessGoalOption;
  goal: PostGoalSuggestion;
  isPreviewLoading: boolean;
  isSelected: boolean;
  draftTitle: string;
  draftDescription: string;
  draftRationale: string;
  onChangeDraft: (field: 'title' | 'description', value: string) => void;
  onApplyGoal: (goal: PostGoalSuggestion) => void;
  onRemoveGoal: (folderId: string) => void;
}

const PostGoalDetailPane: React.FC<Props> = ({
  businessGoal,
  goal,
  isPreviewLoading,
  isSelected,
  draftTitle,
  draftDescription,
  draftRationale,
  onChangeDraft,
  onApplyGoal,
  onRemoveGoal
}) => {
  const imageTypeChips = goal.imageTypeChips?.slice(0, 4) ?? [];

  return (
    <article className="post-goal-detail-card">
      <div className="post-goal-detail-layout">
        <div className="post-goal-detail-visual-column">
          <PostGoalExampleGallery goal={goal} isLoading={isPreviewLoading} />
        </div>

        <aside className="post-goal-detail-aside">
          <div className="post-goal-detail-header post-goal-detail-header--aside">
            {isSelected ? <span className="goal-card-selection-note">In your starting set</span> : null}
            <InlineEditableText
              as="h4"
              value={draftTitle}
              onChange={value => onChangeDraft('title', value)}
              placeholder="Name the post direction"
              className="inline-editable--post-title"
              multiline={false}
            />

            <InlineEditableText
              as="p"
              value={draftDescription}
              onChange={value => onChangeDraft('description', value)}
              placeholder="Describe the kind of image direction this should become."
              className="post-goal-detail-note inline-editable--body"
            />
          </div>

          <section className="post-goal-detail-panel">
            <p className="post-goal-detail-panel-copy">{draftRationale}</p>
            {imageTypeChips.length > 0 ? (
              <>
                <div className="goal-card-rationale-label">Image types that could fit this direction</div>
                <div className="post-goal-taxonomy-themes">
                  {imageTypeChips.map(chip => (
                    <span key={chip} className="post-goal-taxonomy-theme">{chip}</span>
                  ))}
                </div>
              </>
            ) : null}
          </section>

          <div className="post-goal-card-actions">
            <button
              type="button"
              className={isSelected ? 'ui-btn ui-btn--secondary' : 'ui-btn ui-btn--primary'}
              onClick={() => onApplyGoal(goal)}
            >
              {isSelected ? 'Update this post goal' : 'Add this post goal'}
            </button>
            {isSelected ? (
              <button
                type="button"
                className="ui-btn ui-btn--secondary"
                onClick={() => onRemoveGoal(goal.id)}
              >
                Remove from starting set
              </button>
            ) : null}
          </div>
          <p className="post-goal-detail-example-note">
            This image is one example of what this direction could look like. You can explore more variations later.
          </p>
        </aside>
      </div>
    </article>
  );
};

export default PostGoalDetailPane;
