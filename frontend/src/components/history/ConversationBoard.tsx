import React from 'react';

import type { ClarificationCycle } from './types';

interface Props {
  cycles: ClarificationCycle[];
}

function formatTimestamp(value?: number) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit'
  });
}

const ConversationBoard: React.FC<Props> = ({ cycles }) => {
  if (cycles.length === 0) {
    return (
      <div className="empty-state">
        No clarification cycles yet. The conversation history will appear here as the studio asks follow-up questions.
      </div>
    );
  }

  return (
    <div className="conversationBoard">
      {cycles.map(cycle => (
        <article key={cycle.id} className="conversationCard">
          <div className="conversationCard-meta">
            <span className={`conversationCard-pill is-${cycle.family}`}>{cycle.family}</span>
            <span>{cycle.status}</span>
            {cycle.answeredAt ? <span>{formatTimestamp(cycle.answeredAt)}</span> : null}
          </div>

          <div className="conversationCard-title">{cycle.title || cycle.move}</div>
          <div className="conversationCard-prompt">“{cycle.prompt}”</div>

          {cycle.originalFeedback ? (
            <div className="conversationCard-evidence">From feedback: “{cycle.originalFeedback}”</div>
          ) : null}

          {cycle.answerLabel ? (
            <div className="conversationCard-answer">
              <span>Answer</span>
              <strong>{cycle.answerLabel}</strong>
            </div>
          ) : null}

          {cycle.summary ? (
            <div className="conversationCard-summary">{cycle.summary}</div>
          ) : null}

          {cycle.goalUpdate ? (
            <div className="conversationCard-goalUpdate">
              <div className="conversationCard-sectionTitle">
                Applied goal update
              </div>
              <strong>{cycle.goalUpdate.title}</strong>
              <p>{cycle.goalUpdate.description}</p>
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
};

export default ConversationBoard;
