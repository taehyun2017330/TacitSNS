import React from 'react';

import type { PostGoalSuggestion } from '../../../types/workspace';
import { getPreviewTextTone } from './postGoalExplorer.utils';

interface Props {
  suggestions: PostGoalSuggestion[];
  activeSuggestionId: string | null;
  loadingPreviewIds: Record<string, boolean>;
  selectedFolderIds: Set<string>;
  displayTitlesById: Record<string, string>;
  onSelectSuggestion: (id: string) => void;
  onCreateCustomGoal: () => void;
}

const PostGoalSuggestionRail: React.FC<Props> = ({
  suggestions,
  activeSuggestionId,
  loadingPreviewIds,
  selectedFolderIds,
  displayTitlesById,
  onSelectSuggestion,
  onCreateCustomGoal
}) => (
  <div className="post-goal-browser-list" aria-label="Suggested post-goal directions">
    {suggestions.map(goal => {
      const isAdded = selectedFolderIds.has(goal.id);
      const isActive = activeSuggestionId === goal.id;
      const displayTitle = displayTitlesById[goal.id]?.trim() || goal.previewTitle || goal.title;

      return (
        <button
          key={goal.id}
          type="button"
          className={`post-goal-browser-item ${isActive ? 'is-active' : ''} ${isAdded ? 'is-added' : ''}`}
          onClick={() => onSelectSuggestion(goal.id)}
        >
          <div
            className={`post-goal-browser-item-visual ${getPreviewTextTone(goal.previewBackground) === 'dark' ? 'is-dark-tone' : 'is-light-tone'} ${loadingPreviewIds[goal.id] ? 'is-loading' : ''}`}
            style={
              goal.previewImageUrl
                ? {
                    backgroundImage: `linear-gradient(180deg, rgba(20, 21, 20, 0.06) 0%, rgba(20, 21, 20, 0.54) 100%), url(${goal.previewImageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }
                : { background: goal.previewBackground }
            }
          >
            <div className="post-goal-browser-item-topline">
              {isAdded ? <span className="goal-card-selection-note">Chosen</span> : null}
            </div>
            <div className="post-goal-browser-item-overlay">
              <strong>{displayTitle}</strong>
            </div>
            {loadingPreviewIds[goal.id] ? (
              <span className="post-goal-browser-item-loading-label">Generating example…</span>
            ) : null}
          </div>

        </button>
      );
    })}

    <button
      type="button"
      className="post-goal-browser-item post-goal-browser-item--add"
      onClick={onCreateCustomGoal}
    >
      <div className="post-goal-browser-item-visual post-goal-browser-item-visual--add">
        <div className="post-goal-browser-add-icon">+</div>
        <div className="post-goal-browser-item-overlay">
          <strong>Add your own</strong>
        </div>
      </div>
    </button>
  </div>
);

export default PostGoalSuggestionRail;
