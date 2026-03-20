import React, { useMemo, useState } from 'react';

import {
  normalizeBusinessGoalInput,
  suggestBusinessGoalAutocomplete
} from '../../data/goalHierarchy';
import type { BusinessGoalOption } from '../../types/workspace';
import '../workspace/PostGoalWorkspace.css';

interface Props {
  options: BusinessGoalOption[];
  selectedGoalId: string | null;
  onSelectGoal: (goal: BusinessGoalOption) => void;
  onAddCustomGoal: (goal: BusinessGoalOption) => void;
}

const BusinessGoalSelector: React.FC<Props> = ({
  options,
  selectedGoalId,
  onSelectGoal,
  onAddCustomGoal
}) => {
  const [customGoalInput, setCustomGoalInput] = useState('');
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const recommendedGoals = useMemo(
    () =>
      [...options]
        .filter(goal => goal.isRecommended)
        .sort((left, right) => left.rank - right.rank)
        .slice(0, 3),
    [options]
  );
  const libraryGoals = useMemo(
    () =>
      options.filter(
        goal => !goal.isCustom && !recommendedGoals.some(recommendedGoal => recommendedGoal.id === goal.id)
      ),
    [options, recommendedGoals]
  );
  const customGoals = useMemo(
    () => options.filter(goal => goal.isCustom),
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
        <div className="section-kicker">System interpretation</div>
        <h3>What is the main reason for using SNS marketing right now?</h3>
        <p>
          Choose the main reason this brand is posting on social media right now. Specific post directions come next.
        </p>
      </div>

      <section className="goal-selector-section">
        <div className="goal-selector-section-header">
          <div className="section-kicker">Suggested business goals</div>
          <p>These describe why the brand is using social media right now, not what exact post to make.</p>
        </div>

        <div className="goal-selector-recommended-grid">
          {recommendedGoals.map(goal => {
            const isSelected = selectedGoalId === goal.id;

            return (
              <button
                type="button"
                key={goal.id}
                className={`goal-card goal-card--recommended ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelectGoal(goal)}
              >
                <div className="goal-card-topline">
                  <span className="goal-card-corner-note">Recommended</span>
                  {isSelected && (
                    <span className="goal-card-selection-note">
                      {goal.isCustom ? 'Selected custom goal' : 'Selected'}
                    </span>
                  )}
                </div>
                <div className="goal-card-title">{goal.title}</div>
                <div className="goal-card-description">{goal.description}</div>
                <div className="goal-card-rationale">
                  <strong>Why this fits:</strong> {goal.rationale}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="goal-selector-section goal-selector-section--compact">
        <div className="goal-selector-section-header">
          <div className="section-kicker">Other ways to frame it</div>
          <p>If the suggested goals miss the mark, choose another broad marketing intention or add your own.</p>
        </div>

        <div className="goal-pill-row">
          {libraryGoals.map(goal => {
            const isSelected = selectedGoalId === goal.id;

            return (
              <button
                type="button"
                key={goal.id}
                className={`goal-pill ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelectGoal(goal)}
              >
                <span>{goal.title}</span>
              </button>
            );
          })}

          {customGoals.map(goal => {
            const isSelected = selectedGoalId === goal.id;

            return (
              <button
                type="button"
                key={goal.id}
                className={`goal-pill ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelectGoal(goal)}
              >
                <span>{goal.title}</span>
                <span className="goal-pill-rank">Custom</span>
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
              Keep it broad and outcome-based. Describe why the brand is using SNS marketing, not the exact post idea. If possible, the system will map your wording to one of the shared business-goal buckets.
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
