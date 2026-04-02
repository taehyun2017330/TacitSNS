import React from 'react';

import type { ClarificationDraftGoalUpdate } from '../history/types';
import type { ClarificationAnswer, ClarificationQuestion } from './clarification/types';
import ClarificationPrompt from './clarification/ClarificationPrompt';
import GoalUpdateDraftPrompt from './clarification/GoalUpdateDraftPrompt';
import './InterpretationQuestionBlock.css';

interface Props {
  question: ClarificationQuestion | null;
  noticedText: string;
  impactText: string;
  pendingGoalDraft: ClarificationDraftGoalUpdate | null;
  onClarificationSubmit: (answer: ClarificationAnswer) => void;
  onClarificationSkip: () => void;
  onGoalDraftApply: (draft: ClarificationDraftGoalUpdate) => void;
  onGoalDraftDismiss: () => void;
}

const InterpretationQuestionBlock: React.FC<Props> = ({
  question,
  noticedText,
  impactText,
  pendingGoalDraft,
  onClarificationSubmit,
  onClarificationSkip,
  onGoalDraftApply,
  onGoalDraftDismiss
}) => {
  if (!question && !pendingGoalDraft) {
    return null;
  }

  return (
    <section className="interpretation-question-block">
      {question ? (
        <>
          <div className="interpretation-question-block-header">
            <div className="interpretation-question-block-label">One last check</div>
            <div className="interpretation-question-block-family">{question.family}</div>
          </div>

          <div className="interpretation-question-block-copy">
            <h3>{question.prompt}</h3>
            {noticedText ? (
              <p className="interpretation-question-block-context">{noticedText}</p>
            ) : null}
            {impactText ? (
              <p className="interpretation-question-block-impact">{impactText}</p>
            ) : null}
          </div>

          <ClarificationPrompt
            question={question}
            onSubmit={onClarificationSubmit}
            onSkip={onClarificationSkip}
            onClose={onClarificationSkip}
            variant="inline"
            showHeader={false}
            showPrompt={false}
            showOriginalFeedback={false}
            skipLabel="Leave open"
            submitLabel="Use this"
          />
        </>
      ) : null}

      {pendingGoalDraft ? (
        <GoalUpdateDraftPrompt
          draft={pendingGoalDraft}
          onApply={onGoalDraftApply}
          onDismiss={onGoalDraftDismiss}
          variant="inline"
        />
      ) : null}
    </section>
  );
};

export default InterpretationQuestionBlock;
