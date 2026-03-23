import React, { useEffect, useState } from 'react';

import type { PostGoalSuggestion } from '../../../types/workspace';
import {
  DEFAULT_POST_GOAL_PLACEHOLDER_BACKGROUND,
  detectImageTextTone
} from './postGoalExplorer.utils';

interface Props {
  suggestions: PostGoalSuggestion[];
  activeSuggestionId: string | null;
  loadingPreviewIds: Record<string, boolean>;
  selectedFolderIds: Set<string>;
  displayTitlesById: Record<string, string>;
  onSelectSuggestion: (id: string) => void;
  onCreateCustomGoal: () => void;
}

const SuggestionRailCard: React.FC<{
  goal: PostGoalSuggestion;
  isActive: boolean;
  isAdded: boolean;
  isLoadingPreview: boolean;
  displayTitle: string;
  onSelectSuggestion: (id: string) => void;
}> = ({ goal, isActive, isAdded, isLoadingPreview, displayTitle, onSelectSuggestion }) => {
  const [textTone, setTextTone] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    let cancelled = false;

    if (!goal.previewImageUrl) {
      setTextTone('light');
      return () => {
        cancelled = true;
      };
    }

    void detectImageTextTone(goal.previewImageUrl).then(nextTone => {
      if (!cancelled) {
        setTextTone(nextTone);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [goal.previewImageUrl]);

  return (
    <button
      type="button"
      className={`post-goal-browser-item ${isActive ? 'is-active' : ''} ${isAdded ? 'is-added' : ''}`}
      onClick={() => onSelectSuggestion(goal.id)}
    >
      <div
        className={`post-goal-browser-item-visual ${textTone === 'dark' ? 'is-dark-tone' : 'is-light-tone'} ${isLoadingPreview ? 'is-loading' : ''}`}
        style={
          goal.previewImageUrl
            ? {
                backgroundImage: `linear-gradient(180deg, rgba(20, 21, 20, 0.06) 0%, rgba(20, 21, 20, 0.54) 100%), url(${goal.previewImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }
            : { background: DEFAULT_POST_GOAL_PLACEHOLDER_BACKGROUND }
        }
      >
        <div className="post-goal-browser-item-topline">
          {isAdded ? <span className="goal-card-selection-note">Chosen</span> : null}
        </div>
        <div className="post-goal-browser-item-overlay">
          <strong>{displayTitle}</strong>
        </div>
        {isLoadingPreview ? (
          <span className="post-goal-browser-item-loading-label">Generating example…</span>
        ) : null}
      </div>
    </button>
  );
};

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
        <SuggestionRailCard
          key={goal.id}
          goal={goal}
          isActive={isActive}
          isAdded={isAdded}
          isLoadingPreview={Boolean(loadingPreviewIds[goal.id])}
          displayTitle={displayTitle}
          onSelectSuggestion={onSelectSuggestion}
        />
      );
    })}

    <button
      type="button"
      className="post-goal-browser-item post-goal-browser-item--add"
      onClick={onCreateCustomGoal}
    >
      <div
        className="post-goal-browser-item-visual post-goal-browser-item-visual--add"
        style={{ background: DEFAULT_POST_GOAL_PLACEHOLDER_BACKGROUND }}
      >
        <div className="post-goal-browser-add-icon">+</div>
        <div className="post-goal-browser-item-overlay">
          <strong>Add your own</strong>
        </div>
      </div>
    </button>
  </div>
);

export default PostGoalSuggestionRail;
