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
  const selectedGoals = useMemo(
    () => options.filter(goal => selectedGoalIds.includes(goal.id)),
    [options, selectedGoalIds]
  );
  const recommendedGoals = useMemo(
    () =>
      [...options]
        .filter(goal => goal.isRecommended)
        .sort((left, right) => left.rank - right.rank)
        .slice(0, 3),
    [options]
  );

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
          <div className="section-kicker">Suggested business goals</div>
          <h3>What should these posts help with first?</h3>
        </div>
        <p>
          Start broad. Pick one to three parent goals, then turn them into more specific post-goal folders.
        </p>
      </div>

      <section className="goal-selected-strip">
        <div className="goal-selected-header">
          <div className="section-kicker">Selected business goals</div>
          <span className="goal-selected-count">
            {selectedGoals.length} {selectedGoals.length === 1 ? 'selected' : 'selected'}
          </span>
        </div>
        {selectedGoals.length === 0 ? (
          <div className="goal-selected-empty">
            Nothing selected yet. Choose one to three broad outcomes to guide the next step.
          </div>
        ) : (
          <div className="goal-selected-list">
            {selectedGoals.map(goal => (
              <button
                type="button"
                key={goal.id}
                className="goal-selected-pill"
                onClick={() => onToggleGoal(goal)}
              >
                <span>{goal.title}</span>
                <span className="goal-selected-pill-close">Remove</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="goal-selector-section">
        <div className="goal-selector-section-header">
          <div className="section-kicker">Recommended for this brand</div>
          <p>The system thinks these are the strongest broad directions based on the brand story.</p>
        </div>

        <div className="goal-selector-recommended-grid">
          {recommendedGoals.map(goal => {
            const isSelected = selectedGoalIds.includes(goal.id);

            return (
              <button
                type="button"
                key={goal.id}
                className={`goal-card goal-card--recommended ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onToggleGoal(goal)}
              >
                <div className="goal-card-topline">
                  <span className="goal-rank-pill">Top {goal.rank}</span>
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
      </section>

      <section className="goal-selector-section goal-selector-section--compact">
        <div className="goal-selector-section-header">
          <div className="section-kicker">All broad business goals</div>
          <p>If the recommendations are off, choose from the full set instead.</p>
        </div>

        <div className="goal-pill-row">
          {options.map(goal => {
          const isSelected = selectedGoalIds.includes(goal.id);

          return (
            <button
              type="button"
              key={goal.id}
              className={`goal-pill ${isSelected ? 'is-selected' : ''} ${goal.isRecommended ? 'is-recommended' : ''}`}
              onClick={() => onToggleGoal(goal)}
            >
              <span>{goal.title}</span>
              {goal.isRecommended && <span className="goal-pill-rank">Top {goal.rank}</span>}
            </button>
          );
        })}

        <button
          type="button"
          className="goal-pill goal-pill--add"
          onClick={() => setIsComposerOpen(true)}
        >
          <span className="goal-pill-add-icon">+</span>
          <span>Add your own goal</span>
        </button>
        </div>
      </section>

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
