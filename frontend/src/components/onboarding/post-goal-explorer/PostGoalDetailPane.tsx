import React from 'react';

import type {
  PostGoalSuggestion
} from '../../../types/workspace';
import InlineEditableText from '../InlineEditableText';
import PostGoalExampleGallery from './PostGoalExampleGallery';

interface Props {
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
  const directions = goal.directions?.length
    ? goal.directions.slice(0, 4)
    : (goal.imageTypeChips?.slice(0, 4) ?? []).map(chip => ({ chip, angle: chip }));
  const visibleDirections = directions.slice(0, 3);
  const hiddenDirectionCount = Math.max(0, directions.length - visibleDirections.length);

  return (
    <article className={`post-goal-detail-card ${isSelected ? 'is-selected' : ''}`}>
      <div className="post-goal-detail-layout">
        <div className="post-goal-detail-visual-column">
          <PostGoalExampleGallery goal={goal} isLoading={isPreviewLoading} />
        </div>

        <aside className="post-goal-detail-aside">
          <div className="post-goal-detail-header post-goal-detail-header--aside">
            <div className="post-goal-detail-title-row">
              <InlineEditableText
                as="h4"
                value={draftTitle}
                onChange={value => onChangeDraft('title', value)}
                placeholder="Name the post direction"
                className="inline-editable--post-title"
                multiline={false}
              />
              <button
                type="button"
                className={`ui-btn ${isSelected ? 'ui-btn--secondary' : 'ui-btn--primary'} post-goal-add-pill`}
                onClick={() => onApplyGoal(goal)}
              >
                {isSelected ? '✓ Added' : '+ Add'}
              </button>
            </div>

            <InlineEditableText
              as="p"
              value={draftDescription}
              onChange={value => onChangeDraft('description', value)}
              placeholder="Describe the image direction."
              className="post-goal-detail-note post-goal-detail-note--compact inline-editable--body"
            />
          </div>

          {draftRationale ? (
            <p className="post-goal-detail-rationale-inline">{draftRationale}</p>
          ) : null}

          {visibleDirections.length > 0 && (
            <div className="post-goal-direction-chip-list">
              {visibleDirections.map((direction, index) => (
                <span
                  key={`${direction.chip}-${index}`}
                  className={`post-goal-direction-chip${index === 0 ? ' post-goal-direction-chip--current' : ''}`}
                  title={direction.angle || direction.chip}
                >
                  <span className="post-goal-direction-chip-label">{direction.chip || direction.angle}</span>
                </span>
              ))}
              {hiddenDirectionCount > 0 ? (
                <span className="post-goal-direction-chip post-goal-direction-chip--count">
                  +{hiddenDirectionCount} more
                </span>
              ) : null}
            </div>
          )}

          {isSelected && (
            <button
              type="button"
              className="post-goal-remove-link"
              onClick={() => onRemoveGoal(goal.id)}
            >
              Remove
            </button>
          )}
        </aside>
      </div>
    </article>
  );
};

export default PostGoalDetailPane;
