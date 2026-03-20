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
  const [customGoalTitle, setCustomGoalTitle] = useState('');
  const [customGoalDescription, setCustomGoalDescription] = useState('');
  const [customGoalRationale, setCustomGoalRationale] = useState('');
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
    () => suggestBusinessGoalAutocomplete(customGoalTitle),
    [customGoalTitle]
  );

  const resetComposer = () => {
    setCustomGoalTitle('');
    setCustomGoalDescription('');
    setCustomGoalRationale('');
    setIsComposerOpen(false);
  };

  const handleAddCustomGoal = () => {
    const trimmed = customGoalTitle.trim();
    if (!trimmed) {
      return;
    }

    onAddCustomGoal(
      normalizeBusinessGoalInput(trimmed, {
        description: customGoalDescription,
        rationale: customGoalRationale
      })
    );
    resetComposer();
  };

  return (
    <div className="goal-selector">
      <div className="goal-selector-header">
        <div className="section-kicker">Business goal</div>
        <h3>What is the main reason for using SNS marketing right now?</h3>
        <p>
          Choose the main reason this brand is posting on social media right now. Post directions come next.
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
        <div className="goal-dialog-backdrop" onClick={resetComposer}>
          <div className="goal-dialog" onClick={event => event.stopPropagation()}>
            <div className="section-kicker">Custom business goal</div>
            <h4>Add your own goal</h4>
            <p>
              Fill this out in the same structure as the suggested goals. Only the main goal is required.
            </p>

            <label className="goal-dialog-field">
              <span>Main goal</span>
              <input
                type="text"
                value={customGoalTitle}
                onChange={event => setCustomGoalTitle(event.target.value)}
                placeholder='e.g., "Help customers understand our premium pricing"'
              />
            </label>

            <label className="goal-dialog-field">
              <span>What this goal means</span>
              <textarea
                value={customGoalDescription}
                onChange={event => setCustomGoalDescription(event.target.value)}
                placeholder="Explain what success would look like for this marketing goal."
                rows={3}
              />
            </label>

            <label className="goal-dialog-field">
              <span>Why this fits</span>
              <textarea
                value={customGoalRationale}
                onChange={event => setCustomGoalRationale(event.target.value)}
                placeholder="Optional note about why this goal fits the brand story."
                rows={3}
              />
            </label>

            <div className="autocomplete-chip-row">
              {suggestions.map(suggestion => (
                <button
                  type="button"
                  key={suggestion}
                  className="ui-btn ui-btn--choice"
                  onClick={() => setCustomGoalTitle(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="goal-dialog-actions">
              <button
                type="button"
                className="ui-btn ui-btn--secondary"
                onClick={resetComposer}
              >
                Cancel
              </button>
              <button
                type="button"
                className="ui-btn ui-btn--primary"
                onClick={handleAddCustomGoal}
                disabled={!customGoalTitle.trim()}
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
