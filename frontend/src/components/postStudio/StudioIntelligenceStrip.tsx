import React from 'react';

import type { ReviewReadState } from '../../types/postStudio';
import { formatDisplayLabel } from './analysisUtils';
import './StudioIntelligenceStrip.css';

interface Props {
  reviewRead: ReviewReadState | null;
  isEvaluating?: boolean;
}

function getStatusLabel(status: ReviewReadState['status'] | undefined) {
  if (status === 'needs_clarification') {
    return 'Needs clarification';
  }
  if (status === 'ready') {
    return 'Ready';
  }
  return 'Observing';
}

const StudioIntelligenceStrip: React.FC<Props> = ({
  reviewRead,
  isEvaluating = false
}) => {
  const status = reviewRead?.status ?? 'observing';
  const evidenceTokens = reviewRead?.evidenceTokens ?? [];

  return (
    <section className={`studio-intelligence-strip is-${status}`}>
      <div className="studio-intelligence-strip-header">
        <div>
          <div className="studio-intelligence-strip-label">Studio intelligence</div>
          <div className="studio-intelligence-strip-status-row">
            <span className={`studio-intelligence-strip-status is-${status}`}>
              {getStatusLabel(status)}
            </span>
            {isEvaluating ? (
              <span className="studio-intelligence-strip-refining">
                <span className="studio-intelligence-strip-loader" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </span>
                Refining in the background…
              </span>
            ) : null}
          </div>
        </div>
        {reviewRead?.pendingFamily ? (
          <div className="studio-intelligence-strip-hint">
            One {formatDisplayLabel(reviewRead.pendingFamily)} question is likely for the next step
          </div>
        ) : null}
      </div>

      <p className="studio-intelligence-strip-sentence">
        {reviewRead?.sentence || 'Add reactions so the studio can read what to preserve, what to change, and what may need clarification next.'}
      </p>

      {evidenceTokens.length > 0 ? (
        <div className="studio-intelligence-strip-tokens">
          {evidenceTokens.map(token => (
            <span key={token} className="studio-intelligence-strip-token">
              {token}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
};

export default StudioIntelligenceStrip;
