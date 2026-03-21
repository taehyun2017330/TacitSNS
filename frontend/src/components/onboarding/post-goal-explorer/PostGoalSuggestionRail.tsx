import React from 'react';

import type { PostGoalSuggestion } from '../../../types/workspace';

interface Props {
  suggestions: PostGoalSuggestion[];
  activeSuggestionId: string | null;
  selectedFolderTitles: Set<string>;
  onSelectSuggestion: (id: string) => void;
}

const PostGoalSuggestionRail: React.FC<Props> = ({
  suggestions,
  activeSuggestionId,
  selectedFolderTitles,
  onSelectSuggestion
}) => (
  <div className="post-goal-browser-list">
    {suggestions.map(goal => {
      const isAdded = selectedFolderTitles.has(goal.title);
      const isActive = activeSuggestionId === goal.id;

      return (
        <button
          key={goal.id}
          type="button"
          className={`post-goal-browser-item ${isActive ? 'is-active' : ''} ${isAdded ? 'is-added' : ''}`}
          onClick={() => onSelectSuggestion(goal.id)}
        >
          <div className="post-goal-browser-item-topline">
            <span className="goal-card-corner-note">{goal.sourceLabel === 'ai' ? 'AI suggested' : 'Suggested'}</span>
            {isAdded && <span className="goal-card-selection-note">Chosen</span>}
          </div>
          <div className="post-goal-browser-item-title">{goal.title}</div>
          <div className="post-goal-browser-item-meta">{goal.taxonomyTags.join(' · ')}</div>
          <p>{goal.description}</p>
        </button>
      );
    })}
  </div>
);

export default PostGoalSuggestionRail;
