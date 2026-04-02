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

  const handleGoalCardClick = (
    event: React.MouseEvent<HTMLElement>,
    goal: BusinessGoalOption
  ) => {
    const target = event.target as HTMLElement;
    if (target.closest('.inline-editable, .goal-card-inline-action, .ui-btn')) {
      return;
    }

    onSelectGoal(goal);
  };

  const renderGoalRow = (goal: BusinessGoalOption, isCustom: boolean) => {
    const isSelected = selectedGoalId === goal.id;
    const draft = getGoalDraft(goal);

    return (
      <article
        key={goal.id}
        className={`goal-row ${isSelected ? 'is-selected' : ''}`}
        onClick={event => handleGoalCardClick(event, goal)}
        role="button"
        tabIndex={0}
        onBlur={() => applyGoalDraft(goal)}
      >
        <div className="goal-row-main">
          <InlineEditableText
            as="div"
            value={draft.title}
            onChange={value => updateGoalDraft(goal, 'title', value)}
            placeholder="Goal title"
            className="goal-card-title inline-editable--compact-title"
            multiline={false}
          />
          <InlineEditableText
            as="div"
            value={draft.description}
            onChange={value => updateGoalDraft(goal, 'description', value)}
            placeholder="What success looks like"
            className="goal-card-description inline-editable--compact-body"
          />
        </div>
        <div className="goal-row-rationale">
          <span className="goal-row-rationale-label">Why this fits</span>
          <InlineEditableText
            as="div"
            value={draft.rationale}
            onChange={value => updateGoalDraft(goal, 'rationale', value)}
            placeholder="Why this goal fits"
            className="goal-card-rationale inline-editable--compact-body"
          />
        </div>
        {isCustom && (
          <button
            type="button"
            className="goal-row-delete"
            onClick={event => {
              event.stopPropagation();
              onRemoveCustomGoal(goal.id);
            }}
          >
            ×
          </button>
        )}
      </article>
    );
  };

  return (
    <div className="goal-selector">
      <p className="goal-selector-prompt">
        {isLoadingSuggestions
          ? 'Generating suggested business goals…'
          : <>
              <strong>Suggested business goals</strong>
              {suggestionSource === 'ai'
                ? ' — choose one to start with. You can click any text to edit it.'
                : ' — choose one to continue. You can click any text to edit it.'}
            </>}
      </p>

      <div className="goal-list">
        {isLoadingSuggestions ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="goal-row goal-row--loading" aria-hidden="true">
              <div className="goal-row-main">
                <div className="goal-loading-line goal-loading-line--title" />
                <div className="goal-loading-line goal-loading-line--body" />
              </div>
              <div className="goal-row-rationale">
                <div className="goal-loading-line goal-loading-line--body goal-loading-line--short" />
              </div>
            </div>
          ))
        ) : (
          <>
            {recommendedGoals.map(goal => renderGoalRow(goal, false))}
            {customGoals.map(goal => renderGoalRow(goal, true))}
          </>
        )}

        {!isComposerOpen ? (
          <button
            type="button"
            className="goal-row goal-row--add"
            onClick={() => setIsComposerOpen(true)}
          >
            <span className="goal-row-add-icon">+</span>
            <span className="goal-row-add-label">Add your own goal</span>
          </button>
        ) : (
          <article className="goal-row goal-row--composer">
            <div className="goal-row-main">
              <InlineEditableText
                as="div"
                value={customGoalTitle}
                onChange={setCustomGoalTitle}
                placeholder="Type your main goal here"
                className="goal-card-title inline-editable--compact-title"
                multiline={false}
              />
              <InlineEditableText
                as="div"
                value={customGoalDescription}
                onChange={setCustomGoalDescription}
                placeholder="What success looks like"
                className="goal-card-description inline-editable--compact-body"
              />
            </div>
            <div className="goal-row-rationale">
              <span className="goal-row-rationale-label">Why this fits</span>
              <InlineEditableText
                as="div"
                value={customGoalRationale}
                onChange={setCustomGoalRationale}
                placeholder="Why this goal fits"
                className="goal-card-rationale inline-editable--compact-body"
              />
            </div>
            <div className="goal-row-composer-actions">
              <button type="button" className="ui-btn ui-btn--secondary" onClick={resetComposer}>Cancel</button>
              <button type="button" className="ui-btn ui-btn--primary" onClick={handleAddCustomGoal} disabled={!customGoalTitle.trim()}>Add</button>
            </div>
          </article>
        )}
      </div>
    </div>
  );
};

export default BusinessGoalSelector;
