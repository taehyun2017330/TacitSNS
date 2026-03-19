import React, { useMemo, useState } from 'react';

import {
  normalizeBusinessGoalInput,
  suggestBusinessGoalAutocomplete
} from '../../data/goalHierarchy';
import type { BusinessGoalOption } from '../../types/workspace';

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
  };

  return (
    <div className="goal-selector">
      <div className="goal-selector-header">
        <div>
          <div className="section-kicker">Business goals</div>
          <h3>Choose the outcomes this brand should prioritize.</h3>
        </div>
        <p>
          Start broad. The system turns these into more concrete post goals later.
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
      </div>

      <div className="custom-goal-panel">
        <div className="section-kicker">Type your own</div>
        <div className="custom-goal-copy">
          If the suggested wording feels off, type what you mean and the system will normalize it when possible.
        </div>

        <div className="custom-goal-composer">
          <input
            type="text"
            value={customGoalInput}
            onChange={event => setCustomGoalInput(event.target.value)}
            placeholder='e.g., "help people understand why we cost more"'
          />
          <button
            type="button"
            className="ui-btn ui-btn--secondary"
            onClick={() => handleAddCustomGoal(customGoalInput)}
            disabled={!customGoalInput.trim()}
          >
            Add goal
          </button>
        </div>

        <div className="autocomplete-chip-row">
          {suggestions.map(suggestion => (
            <button
              type="button"
              key={suggestion}
              className="ui-btn ui-btn--choice"
              onClick={() => handleAddCustomGoal(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BusinessGoalSelector;
