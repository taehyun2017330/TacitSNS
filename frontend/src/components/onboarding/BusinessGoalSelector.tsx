import React, { useMemo, useState } from 'react';

import {
  normalizeBusinessGoalInput,
  suggestBusinessGoalAutocomplete
} from '../../data/goalHierarchy';
import type { BusinessGoalOption } from '../../types/workspace';
import '../workspace/PostGoalWorkspace.css';

interface Props {
  options: BusinessGoalOption[];
  selectedGoalIds: string[];
  onToggleGoal: (goal: BusinessGoalOption) => void;
  onAddCustomGoal: (goal: BusinessGoalOption) => void;
}

const BusinessGoalSelector: React.FC<Props> = ({
  options,
  selectedGoalIds,
  onToggleGoal,
  onAddCustomGoal
}) => {
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const suggestions = useMemo(
    () => suggestBusinessGoalAutocomplete(customGoalInput),
    [customGoalInput]
  );

  const handleAddCustomGoal = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) {
      return;
    }

    onAddCustomGoal(normalizeBusinessGoalInput(trimmed));
    setCustomGoalInput('');
    setIsComposerOpen(false);
  };

  return (
    <div className="goal-selector">
      <div className="goal-selector-header">
        <div>
          <div className="section-kicker">Business goals</div>
          <h3>Choose the outcomes this brand should prioritize.</h3>
        </div>
        <p>
          Start broad. These act as the parent goals for later post-goal folders.
        </p>
      </div>

      <div className="goal-card-grid">
        {options.map(goal => {
          const isSelected = selectedGoalIds.includes(goal.id);

          return (
            <button
              type="button"
              key={goal.id}
              className={`goal-card ${isSelected ? 'is-selected' : ''} ${goal.isRecommended ? 'is-recommended' : ''}`}
              onClick={() => onToggleGoal(goal)}
            >
              <div className="goal-card-topline">
                {goal.isRecommended ? (
                  <span className="goal-rank-pill">Top {goal.rank}</span>
                ) : (
                  <span className="goal-rank-pill subtle">Broad goal</span>
                )}
                {goal.normalizedFrom && (
                  <span className="goal-normalized-pill">Normalized</span>
                )}
              </div>
              <div className="goal-card-title">{goal.title}</div>
              <div className="goal-card-description">{goal.description}</div>
              <div className="goal-card-rationale">{goal.rationale}</div>
            </button>
          );
        })}

        <button
          type="button"
          className="goal-card goal-card--add"
          onClick={() => setIsComposerOpen(true)}
        >
          <div className="goal-card-add-icon">+</div>
          <div className="goal-card-title">Add your own goal</div>
          <div className="goal-card-rationale">
            Write what you mean in plain language and the system will normalize it when possible.
          </div>
        </button>
      </div>

      {isComposerOpen && (
        <div className="goal-dialog-backdrop" onClick={() => setIsComposerOpen(false)}>
          <div className="goal-dialog" onClick={event => event.stopPropagation()}>
            <div className="section-kicker">Custom business goal</div>
            <h4>Add your own goal</h4>
            <p>
              Keep it broad and outcome-based. If possible, the system will map your wording to one of the shared business-goal buckets.
            </p>

            <textarea
              value={customGoalInput}
              onChange={event => setCustomGoalInput(event.target.value)}
              placeholder='e.g., "help people understand why we cost more"'
              rows={4}
            />

            <div className="autocomplete-chip-row">
              {suggestions.map(suggestion => (
                <button
                  type="button"
                  key={suggestion}
                  className="ui-btn ui-btn--choice"
                  onClick={() => setCustomGoalInput(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="goal-dialog-actions">
              <button
                type="button"
                className="ui-btn ui-btn--secondary"
                onClick={() => setIsComposerOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={() => handleAddCustomGoal(customGoalInput)}
                disabled={!customGoalInput.trim()}
              >
                Add goal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessGoalSelector;
