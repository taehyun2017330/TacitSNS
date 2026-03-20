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
  const libraryGoals = useMemo(
    () =>
      options.filter(
        goal => !goal.isCustom && !recommendedGoals.some(recommendedGoal => recommendedGoal.id === goal.id)
      ),
    [options, recommendedGoals]
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
          <div className="section-kicker">System interpretation</div>
          <h3>Here&apos;s what this brand seems to be trying to achieve.</h3>
        </div>
        <p>
          Confirm one to three broad goals that feel right. You can revise the system&apos;s read or add your own if something important is missing.
        </p>
      </div>

      <section className="goal-selected-strip">
        <div className="goal-selected-header">
          <div className="section-kicker">Your chosen goals</div>
          <span className="goal-selected-count">
            {selectedGoals.length} {selectedGoals.length === 1 ? 'goal' : 'goals'}
          </span>
        </div>
        {selectedGoals.length === 0 ? (
          <div className="goal-selected-empty">
            Nothing confirmed yet. Choose the broad outcomes that feel most true to this brand.
          </div>
        ) : (
          <div className="goal-selected-grid">
            {selectedGoals.map(goal => (
              <article key={goal.id} className="goal-selected-card">
                <div className="goal-card-topline">
                  <span className={`goal-status-pill ${goal.isCustom ? 'goal-status-pill--custom' : 'goal-status-pill--confirmed'}`}>
                    {goal.isCustom ? 'You added this' : 'Confirmed'}
                  </span>
                  {goal.normalizedFrom && (
                    <span className="goal-normalized-pill">Normalized</span>
                  )}
                </div>
                <div className="goal-card-title">{goal.title}</div>
                <div className="goal-card-description">{goal.description}</div>
                <button
                  type="button"
                  className="goal-selected-remove"
                  onClick={() => onToggleGoal(goal)}
                >
                  Remove
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="goal-selector-section">
        <div className="goal-selector-section-header">
          <div className="section-kicker">Our current read of the brand</div>
          <p>These are the broad goals the system would prioritize first based on the brand story you wrote.</p>
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
                <span className="goal-rank-pill">Recommended</span>
                {isSelected && <span className="goal-status-pill goal-status-pill--confirmed">Chosen</span>}
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
          <div className="section-kicker">Other broad goals</div>
          <p>If the system&apos;s interpretation is off, choose from the rest of the goal library.</p>
        </div>

        <div className="goal-pill-row">
          {libraryGoals.map(goal => {
            const isSelected = selectedGoalIds.includes(goal.id);

            return (
              <button
                type="button"
                key={goal.id}
                className={`goal-pill ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onToggleGoal(goal)}
              >
                <span>{goal.title}</span>
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
