import React, { useMemo, useState } from 'react';

import {
  normalizeBusinessGoalInput
} from '../../data/goalHierarchy';
import type { BusinessGoalOption } from '../../types/workspace';
import InlineEditableText from './InlineEditableText';
import '../workspace/PostGoalWorkspace.css';

interface Props {
  options: BusinessGoalOption[];
  selectedGoalId: string | null;
  isLoadingSuggestions: boolean;
  suggestionSource: 'ai' | 'fallback';
  onSelectGoal: (goal: BusinessGoalOption) => void;
  onAddCustomGoal: (goal: BusinessGoalOption) => void;
  onUpdateGoal: (goal: BusinessGoalOption) => void;
  onRemoveCustomGoal: (goalId: string) => void;
}

const BusinessGoalSelector: React.FC<Props> = ({
  options,
  selectedGoalId,
  isLoadingSuggestions,
  suggestionSource,
  onSelectGoal,
  onAddCustomGoal,
  onUpdateGoal,
  onRemoveCustomGoal
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
  const customGoals = useMemo(
    () => options.filter(goal => goal.isCustom),
    [options]
  );
  const [draftByGoalId, setDraftByGoalId] = useState<Record<string, {
    title: string;
    description: string;
    rationale: string;
  }>>({});

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

    const normalizedGoal = normalizeBusinessGoalInput(trimmed, {
        description: customGoalDescription,
        rationale: customGoalRationale
      });
    const uniqueGoal = options.some(goal => goal.id === normalizedGoal.id)
      ? { ...normalizedGoal, id: `${normalizedGoal.id}-${Date.now()}` }
      : normalizedGoal;

    onAddCustomGoal(uniqueGoal);
    resetComposer();
  };

  const getGoalDraft = (goal: BusinessGoalOption) =>
    draftByGoalId[goal.id] ?? {
      title: goal.title,
      description: goal.description,
      rationale: goal.rationale
    };

  const updateGoalDraft = (
    goal: BusinessGoalOption,
    field: 'title' | 'description' | 'rationale',
    value: string
  ) => {
    setDraftByGoalId(prev => ({
      ...prev,
      [goal.id]: {
        title: prev[goal.id]?.title ?? goal.title,
        description: prev[goal.id]?.description ?? goal.description,
        rationale: prev[goal.id]?.rationale ?? goal.rationale,
        [field]: value
      }
    }));
  };

  const applyGoalDraft = (goal: BusinessGoalOption) => {
    const draft = getGoalDraft(goal);
    onUpdateGoal({
      ...goal,
      title: draft.title.trim() || goal.title,
      description: draft.description.trim() || goal.description,
      rationale: draft.rationale.trim() || goal.rationale
    });
  };

  return (
    <div className="goal-selector">
      <section className="goal-selector-section">
        <div className="goal-selector-section-header">
          <div className="section-kicker">Suggested business goals</div>
          <p>
            {isLoadingSuggestions
              ? 'AI is reviewing your brand narrative and shaping three suggested business goals.'
              : suggestionSource === 'ai'
                ? 'These business goals were suggested from your brand narrative and will lead into post goals next.'
                : 'AI is unavailable right now, so these local suggestions are based on your brand narrative.'}
          </p>
        </div>

        {isLoadingSuggestions ? (
          <div className="goal-selector-loading-grid" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, index) => (
              <article key={index} className="goal-card goal-card--recommended goal-card--loading">
                <div className="goal-card-topline">
                  <span className="goal-card-corner-note">Recommended</span>
                </div>
                <div className="goal-loading-line goal-loading-line--title" />
                <div className="goal-loading-line goal-loading-line--body" />
                <div className="goal-loading-line goal-loading-line--body goal-loading-line--short" />
                <div className="goal-card-rationale-block">
                  <div className="goal-card-rationale-label">Why this fits</div>
                  <div className="goal-loading-line goal-loading-line--body" />
                  <div className="goal-loading-line goal-loading-line--body goal-loading-line--short" />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="goal-selector-recommended-grid">
            {recommendedGoals.map(goal => {
              const isSelected = selectedGoalId === goal.id;

              return (
                <article
                  key={goal.id}
                  className={`goal-card goal-card--recommended ${isSelected ? 'is-selected' : ''}`}
                  onClick={() => onSelectGoal(goal)}
                  role="button"
                  tabIndex={0}
                  onBlur={() => applyGoalDraft(goal)}
                >
                  <div className="goal-card-topline">
                    <span className="goal-card-corner-note">Recommended</span>
                    {isSelected && (
                      <span className="goal-card-selection-note">
                        {goal.isCustom ? 'Selected custom goal' : 'Selected'}
                      </span>
                    )}
                  </div>
                  <InlineEditableText
                    as="div"
                    value={getGoalDraft(goal).title}
                    onChange={value => updateGoalDraft(goal, 'title', value)}
                    placeholder="Type the goal title"
                    className="goal-card-title inline-editable--compact-title"
                    multiline={false}
                  />
                  <InlineEditableText
                    as="div"
                    value={getGoalDraft(goal).description}
                    onChange={value => updateGoalDraft(goal, 'description', value)}
                    placeholder="Add what success would look like"
                    className="goal-card-description inline-editable--compact-body"
                  />
                  <div className="goal-card-rationale-block">
                    <div className="goal-card-rationale-label">Why this fits</div>
                    <InlineEditableText
                      as="div"
                      value={getGoalDraft(goal).rationale}
                      onChange={value => updateGoalDraft(goal, 'rationale', value)}
                      placeholder="Optional note about why this goal fits"
                      className="goal-card-rationale inline-editable--compact-body"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="goal-selector-section">
        <div className="goal-selector-section-header goal-selector-section-header--row">
          <div>
            <div className="section-kicker">Add your own goal</div>
            <p>Create a custom business goal if the suggested directions do not match what this brand is trying to achieve.</p>
          </div>
          <button
            type="button"
            className="goal-pill goal-pill--add"
            onClick={() => setIsComposerOpen(true)}
          >
            <span className="goal-pill-add-icon">+</span>
            <span>Add your own goal</span>
          </button>
        </div>

        <div className="goal-selector-recommended-grid">
          {customGoals.map(goal => {
            const isSelected = selectedGoalId === goal.id;

            return (
              <article
                key={goal.id}
                className={`goal-card goal-card--custom ${isSelected ? 'is-selected' : ''}`}
                onClick={() => onSelectGoal(goal)}
                role="button"
                tabIndex={0}
                onBlur={() => applyGoalDraft(goal)}
              >
                <div className="goal-card-topline">
                  <span className="goal-card-corner-note">Custom goal</span>
                  {isSelected && <span className="goal-card-selection-note">Selected</span>}
                </div>
                <InlineEditableText
                  as="div"
                  value={getGoalDraft(goal).title}
                  onChange={value => updateGoalDraft(goal, 'title', value)}
                  placeholder="Type the goal title"
                  className="goal-card-title inline-editable--compact-title"
                  multiline={false}
                />
                <InlineEditableText
                  as="div"
                  value={getGoalDraft(goal).description}
                  onChange={value => updateGoalDraft(goal, 'description', value)}
                  placeholder="Add what success would look like"
                  className="goal-card-description inline-editable--compact-body"
                />
                <div className="goal-card-rationale-block">
                  <div className="goal-card-rationale-label">Why this fits</div>
                  <InlineEditableText
                    as="div"
                    value={getGoalDraft(goal).rationale}
                    onChange={value => updateGoalDraft(goal, 'rationale', value)}
                    placeholder="Optional note about why this goal fits"
                    className="goal-card-rationale inline-editable--compact-body"
                  />
                </div>
                <div className="goal-card-footer-actions">
                  <button
                    type="button"
                    className="goal-card-inline-action"
                    onClick={event => {
                      event.stopPropagation();
                      onRemoveCustomGoal(goal.id);
                    }}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })}

          {isComposerOpen && (
            <article className="goal-card goal-card--custom goal-inline-editor goal-inline-editor--compact">
              <div className="goal-card-topline">
                <span className="goal-card-corner-note">Custom goal</span>
              </div>

              <InlineEditableText
                as="div"
                value={customGoalTitle}
                onChange={setCustomGoalTitle}
                placeholder='Type your main goal here'
                className="goal-card-title inline-editable--compact-title"
                multiline={false}
              />

              <InlineEditableText
                as="div"
                value={customGoalDescription}
                onChange={setCustomGoalDescription}
                placeholder="Add what success would look like for this goal"
                className="goal-card-description inline-editable--compact-body"
              />

              <div className="goal-card-rationale-block">
                <div className="goal-card-rationale-label">Why this fits</div>
                <InlineEditableText
                  as="div"
                  value={customGoalRationale}
                  onChange={setCustomGoalRationale}
                  placeholder="Optional note about why this goal fits the brand story"
                  className="goal-card-rationale inline-editable--compact-body"
                />
              </div>

              <div className="goal-inline-editor-actions">
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
            </article>
          )}
        </div>
      </section>
    </div>
  );
};

export default BusinessGoalSelector;
