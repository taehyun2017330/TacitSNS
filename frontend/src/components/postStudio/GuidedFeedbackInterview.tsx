import React, { useEffect, useMemo, useState } from 'react';

import type { PostNode } from '../history/types';
import type { GuidedFeedbackSession } from '../../types/postStudio';
import type { ClarificationAnswer } from './clarification/types';
import { formatDisplayLabel, getGuidedReasonOptions, type GuidedReasonOption } from './analysisUtils';
import ClarificationPrompt from './clarification/ClarificationPrompt';
import { guidedStanceToFeedbackType } from './guidedFeedbackUtils';
import './GuidedFeedbackInterview.css';

interface Props {
  session: GuidedFeedbackSession | null;
  posts: PostNode[];
  isEvaluating: boolean;
  onBackToGrid: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSelectReason: (nodeId: string, reason: GuidedReasonOption) => void;
  onCustomNoteChange: (nodeId: string, value: string) => void;
  onOpenHardToAnswer: (nodeId: string) => void;
  onSelectExampleReason: (nodeId: string, reason: string) => void;
  onKeepUnresolved: (nodeId: string) => void;
  onClarificationSubmit: (answer: ClarificationAnswer) => void;
  onClarificationSkip: () => void;
}

const GuidedFeedbackInterview: React.FC<Props> = ({
  session,
  posts,
  isEvaluating,
  onBackToGrid,
  onPrev,
  onNext,
  onSelectReason,
  onCustomNoteChange,
  onOpenHardToAnswer,
  onSelectExampleReason,
  onKeepUnresolved,
  onClarificationSubmit,
  onClarificationSkip
}) => {
  const [noteOpen, setNoteOpen] = useState(false);
  const activeStep = session ? session.steps[session.currentImageIndex] ?? null : null;
  const activePost = useMemo(
    () => posts.find(post => post.id === activeStep?.nodeId) ?? null,
    [activeStep?.nodeId, posts]
  );

  const reasonOptions = useMemo(() => {
    if (!activePost || !activeStep) {
      return [];
    }

    return getGuidedReasonOptions(activePost, guidedStanceToFeedbackType(activeStep.stance));
  }, [activePost, activeStep]);

  useEffect(() => {
    setNoteOpen(Boolean(activeStep?.customNote));
  }, [activeStep?.customNote, activeStep?.nodeId]);

  if (!session || !activeStep || !activePost) {
    return null;
  }

  const visualHint =
    activePost.analysis?.differencesFromSiblings?.[0] ||
    activePost.analysis?.summary ||
    '';

  const canAdvance = Boolean(
    !(
      isEvaluating &&
      activeStep.primaryReasonLabel &&
      !activeStep.microQuestion &&
      !activeStep.microAnswer &&
      activeStep.status !== 'unresolved'
    ) &&
    (
      activeStep.status === 'unresolved' ||
      (
        activeStep.primaryReasonLabel &&
        (!activeStep.microQuestion || Boolean(activeStep.microAnswer))
      )
    )
  );

  return (
    <div className="guided-feedback">
      <div className="guided-feedback-toolbar">
        <button
          type="button"
          className="ui-btn ui-btn--secondary guided-feedback-back"
          onClick={onBackToGrid}
        >
          Back
        </button>
        <div className="guided-feedback-progress">
          <span>Guided critique</span>
          <strong>{session.currentImageIndex + 1} / {session.steps.length}</strong>
        </div>
      </div>

      <div className="guided-feedback-shell">
        <article className="guided-feedback-visual">
          <div className="guided-feedback-image">
            <img src={activePost.imageUrl} alt={activePost.analysis?.title || `Post ${session.currentImageIndex + 1}`} />
          </div>
          <div className="guided-feedback-visual-meta">
            <div className={`guided-feedback-stance is-${activeStep.stance}`}>
              {activeStep.stance}
            </div>
            {activePost.metadata?.directionAngle ? (
              <div className="guided-feedback-angle">{formatDisplayLabel(activePost.metadata.directionAngle)}</div>
            ) : null}
            <h2>{activePost.analysis?.title || `Image ${session.currentImageIndex + 1}`}</h2>
            {visualHint ? <div className="guided-feedback-visual-hint">{visualHint}</div> : null}
          </div>
        </article>

        <section className="guided-feedback-dialogue">
          <div className="guided-feedback-dialogue-header">
            <div className="guided-feedback-kicker">Guide</div>
            <h3>{activeStep.prompt}</h3>
          </div>

          <div className="guided-feedback-card">
            <div className="guided-feedback-reason-label">Closest reason</div>
            <div className="guided-feedback-reasons">
              {reasonOptions.map(reason => {
                const selected = activeStep.primaryReasonLabel === reason.label;
                return (
                  <button
                    key={reason.label}
                    type="button"
                    className={`ui-btn ui-btn--choice guided-feedback-reason ${selected ? 'selected' : ''}`}
                    onClick={() => onSelectReason(activePost.id, reason)}
                  >
                    {reason.chipLabel}
                  </button>
                );
              })}
            </div>

            <div className="guided-feedback-actions">
              <button
                type="button"
                className={`ui-btn ui-btn--secondary guided-feedback-hard ${activeStep.hardToAnswerChosen ? 'active' : ''}`}
                onClick={() => onOpenHardToAnswer(activePost.id)}
              >
                Hard to answer
              </button>
            </div>

            {activeStep.hardToAnswerChosen ? (
              <div className="guided-feedback-hard-panel">
                <div className="guided-feedback-reason-label">Closest alternative</div>
                <div className="guided-feedback-example-list">
                  {(activeStep.exampleReasonOptions ?? []).map(option => (
                    <button
                      key={option}
                      type="button"
                      className={`ui-btn ui-btn--choice guided-feedback-example ${activeStep.primaryReasonLabel === option ? 'selected' : ''}`}
                      onClick={() => onSelectExampleReason(activePost.id, option)}
                    >
                      {formatDisplayLabel(option)}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary guided-feedback-unresolved"
                  onClick={() => onKeepUnresolved(activePost.id)}
                >
                  Leave this open
                </button>
              </div>
            ) : null}

            {!noteOpen && !(activeStep.customNote ?? '') ? (
              <button
                type="button"
                className="ui-btn ui-btn--secondary guided-feedback-note-toggle"
                onClick={() => setNoteOpen(true)}
              >
                Add note
              </button>
            ) : (
              <label className="guided-feedback-note">
                <textarea
                  value={activeStep.customNote ?? ''}
                  onChange={(event) => onCustomNoteChange(activePost.id, event.target.value)}
                  placeholder="Optional note"
                  rows={2}
                />
              </label>
            )}
          </div>

          {activeStep.microQuestion && !activeStep.microAnswer ? (
            <section className="guided-feedback-micro">
              <div className="guided-feedback-reason-label">Quick follow-up</div>
              <ClarificationPrompt
                question={activeStep.microQuestion}
                onSubmit={onClarificationSubmit}
                onSkip={onClarificationSkip}
                onClose={onClarificationSkip}
                variant="inline"
                showHeader={false}
                showPrompt
                showOriginalFeedback={false}
                skipLabel="Leave open"
                submitLabel="Use this"
              />
            </section>
          ) : null}

          {activeStep.microAnswer && !activeStep.microAnswer.skipped ? (
            <div className="guided-feedback-loading">
              Locked in: {Object.values(activeStep.microAnswer.values).flat().join(' · ')}
            </div>
          ) : null}

          {isEvaluating && activeStep.primaryReasonLabel && !activeStep.microQuestion ? (
            <div className="guided-feedback-loading">
              Thinking…
            </div>
          ) : null}

          <div className="guided-feedback-footer">
            <button
              type="button"
              className="ui-btn ui-btn--secondary guided-feedback-nav"
              onClick={onPrev}
              disabled={session.currentImageIndex === 0}
            >
              Back
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--primary guided-feedback-nav"
              onClick={onNext}
              disabled={!canAdvance}
            >
              {session.currentImageIndex === session.steps.length - 1 ? 'Build brief' : 'Continue'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GuidedFeedbackInterview;
