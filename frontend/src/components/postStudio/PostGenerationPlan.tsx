import React, { useState } from 'react';

import type { ClarificationDraftGoalUpdate } from '../history/types';
import type { GenerationBrief, GuidedFeedbackSession } from '../../types/postStudio';
import type { ClarificationAnswer, ClarificationQuestion } from './clarification/types';
import { formatDisplayLabel } from './analysisUtils';
import InterpretationQuestionBlock from './InterpretationQuestionBlock';
import './PostGenerationPlan.css';

interface Props {
  brief: GenerationBrief | null;
  session: GuidedFeedbackSession | null;
  pendingQuestion: ClarificationQuestion | null;
  pendingGoalDraft: ClarificationDraftGoalUpdate | null;
  isEvaluating: boolean;
  onBackToGuided: () => void;
  onRouteChange: (index: number, value: string) => void;
  onSimilarityChange: (value: number) => void;
  onClarificationSubmit: (answer: ClarificationAnswer) => void;
  onClarificationSkip: () => void;
  onGoalDraftApply: (draft: ClarificationDraftGoalUpdate) => void;
  onGoalDraftDismiss: () => void;
  onGenerateNext: () => void;
  onRegenerateCurrent: () => void;
  businessGoalTitle?: string;
  postGoalTitle?: string;
  postGoalDescription?: string;
}

function getSimilarityLabel(value: number) {
  if (value <= 35) {
    return 'Tight refinement';
  }
  if (value >= 70) {
    return 'Wide exploration';
  }
  return 'Balanced exploration';
}

const PostGenerationPlan: React.FC<Props> = ({
  brief,
  session,
  pendingQuestion,
  pendingGoalDraft,
  isEvaluating,
  onBackToGuided,
  onRouteChange,
  onSimilarityChange,
  onClarificationSubmit,
  onClarificationSkip,
  onGoalDraftApply,
  onGoalDraftDismiss,
  onGenerateNext,
  onRegenerateCurrent,
  businessGoalTitle,
  postGoalTitle,
  postGoalDescription
}) => {
  const [editingRouteIndex, setEditingRouteIndex] = useState<number | null>(null);

  if (!brief) {
    return null;
  }

  const routeCards = brief.routeCards ?? [];
  const unresolvedCount = session?.steps.filter(step => step.status === 'unresolved').length ?? 0;
  const disableGenerate = Boolean(pendingQuestion || pendingGoalDraft || isEvaluating);
  const disableRouteEditing = Boolean(pendingQuestion || pendingGoalDraft || isEvaluating);

  return (
    <div className="post-generation-plan">
      <div className="post-generation-plan-toolbar">
        <button
          type="button"
          className="ui-btn ui-btn--secondary post-generation-plan-back"
          onClick={onBackToGuided}
        >
          Back
        </button>
        <div className="post-generation-plan-toolbar-label">Generation brief</div>
      </div>

      <section className="post-generation-plan-brief">
        <article className="post-generation-plan-brief-card">
          <div className="post-generation-plan-brief-label">Post goal</div>
          <strong>{postGoalTitle || 'Current post goal'}</strong>
          {postGoalDescription ? <p>{postGoalDescription}</p> : null}
        </article>

        <article className="post-generation-plan-brief-card">
          <div className="post-generation-plan-brief-label">Business goal</div>
          <strong>{businessGoalTitle || 'Current business goal'}</strong>
        </article>

        <article className="post-generation-plan-brief-card post-generation-plan-brief-card--anchor">
          <div className="post-generation-plan-brief-label">Default anchor</div>
          <div className="post-generation-plan-anchor-brief">
            {brief.anchor?.imageUrl ? (
              <div className="post-generation-plan-anchor-thumb">
                <img src={brief.anchor.imageUrl} alt={brief.anchor.title} />
              </div>
            ) : null}
            <div className="post-generation-plan-anchor-copy">
              <strong>{brief.anchor?.title || 'Current anchor'}</strong>
              {brief.anchor?.directionAngle ? (
                <span>{formatDisplayLabel(brief.anchor.directionAngle)}</span>
              ) : null}
            </div>
          </div>
        </article>
      </section>

      <section className="post-generation-plan-synthesis">
        <div className="post-generation-plan-synthesis-header">
          <div className="post-generation-plan-brief-label">Expert read</div>
          <div className="post-generation-plan-synthesis-meta">
            {unresolvedCount > 0 ? `${unresolvedCount} open tradeoff${unresolvedCount > 1 ? 's' : ''}` : 'Set is aligned'}
          </div>
        </div>

        <div className="post-generation-plan-synthesis-body">
          <p>{brief.systemSummary}</p>
        </div>
      </section>

      <section className="post-generation-plan-flow-section">
        <div className="post-generation-plan-flow-header">
          <h3>Keep</h3>
          <span>Carry forward</span>
        </div>
        <div className="post-generation-plan-summary-chips">
          {brief.keep.length ? brief.keep.map(item => (
            <span key={item} className="summary-chip like">{formatDisplayLabel(item)}</span>
          )) : (
            <div className="post-generation-plan-empty">Still deciding what to keep.</div>
          )}
        </div>
      </section>

      <section className="post-generation-plan-flow-section">
        <div className="post-generation-plan-flow-header">
          <h3>Avoid</h3>
          <span>Pull away from</span>
        </div>
        <div className="post-generation-plan-summary-chips">
          {brief.avoid.length ? brief.avoid.map(item => (
            <span key={item} className="summary-chip dislike">{formatDisplayLabel(item)}</span>
          )) : (
            <div className="post-generation-plan-empty">No strong avoid signal yet.</div>
          )}
        </div>
      </section>

      <section className="post-generation-plan-flow-section">
        <div className="post-generation-plan-flow-header">
          <h3>Open tradeoff</h3>
          <span>Keep visible</span>
        </div>
        {brief.openTradeoff ? (
          <div className="post-generation-plan-tradeoff">{formatDisplayLabel(brief.openTradeoff)}</div>
        ) : (
          <div className="post-generation-plan-empty">No tradeoff to hold open.</div>
        )}
      </section>

      <section className="post-generation-plan-flow-section">
        <div className="post-generation-plan-flow-header">
          <h3>Next exploration</h3>
          <span>What to test</span>
        </div>
        <div className="post-generation-plan-summary-chips">
          {brief.nextExploration.length ? brief.nextExploration.map(item => (
            <span key={item} className="summary-chip neutral">{formatDisplayLabel(item)}</span>
          )) : (
            <div className="post-generation-plan-empty">Stay close to the anchor.</div>
          )}
        </div>
      </section>

      <InterpretationQuestionBlock
        question={pendingQuestion}
        noticedText={brief.systemSummary}
        impactText="This will tune the brief before generation."
        pendingGoalDraft={pendingGoalDraft}
        onClarificationSubmit={onClarificationSubmit}
        onClarificationSkip={onClarificationSkip}
        onGoalDraftApply={onGoalDraftApply}
        onGoalDraftDismiss={onGoalDraftDismiss}
      />

      <section className="post-generation-plan-flow-section">
        <div className="post-generation-plan-flow-header">
          <h3>Next directions</h3>
          <span>{routeCards.length} routes ready</span>
        </div>
        <div className="post-generation-plan-route-list">
          {routeCards.map((route, index) => (
            <article key={route.id} className="post-generation-plan-route-card">
              <div className="post-generation-plan-route-header">
                <div>
                  <div className="post-generation-plan-route-index">Route {index + 1}</div>
                  <h4>{route.title}</h4>
                </div>
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary post-generation-plan-edit-route"
                  onClick={() => setEditingRouteIndex(current => (current === index ? null : index))}
                  disabled={disableRouteEditing}
                >
                  {editingRouteIndex === index ? 'Done' : 'Edit'}
                </button>
              </div>

              <div className="post-generation-plan-route-change">{route.change}</div>
              <p className="post-generation-plan-route-rationale">{route.rationale}</p>

              {editingRouteIndex === index ? (
                <textarea
                  className="post-generation-plan-route-input"
                  value={route.editableText}
                  rows={4}
                  disabled={disableRouteEditing}
                  onChange={(event) => onRouteChange(index, event.target.value)}
                />
              ) : (
                <div className="post-generation-plan-route-text">{route.editableText}</div>
              )}
            </article>
          ))}
        </div>
      </section>

      <section className="post-generation-plan-controls">
        <div className="post-generation-plan-flow-header">
          <h3>Exploration width</h3>
          <span>{getSimilarityLabel(brief.similarity)}</span>
        </div>

        <div className="post-generation-plan-slider-row">
          <span>Close</span>
          <input
            type="range"
            min={10}
            max={90}
            step={5}
            value={brief.similarity}
            onChange={(event) => onSimilarityChange(Number(event.target.value))}
          />
          <span>Far</span>
        </div>

        <div className="post-generation-plan-actions">
          <button
            type="button"
            className="ui-btn ui-btn--secondary"
            onClick={onRegenerateCurrent}
            disabled={disableGenerate}
          >
            Regenerate anchor
          </button>
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            onClick={onGenerateNext}
            disabled={disableGenerate}
          >
            Generate next
          </button>
        </div>
      </section>
    </div>
  );
};

export default PostGenerationPlan;
