import React, { useEffect, useMemo, useState } from 'react';

import type { FeedbackData, FeedbackType, PostNode } from './history/types';
import './PostGrid.css';

interface Props {
  posts: PostNode[];
  coachMessage: string;
  onInspect: (post: PostNode, feedback: FeedbackData, batchFeedback: Record<string, FeedbackData | null>) => void;
  onStartGuidedFeedback: (batchFeedback: Record<string, FeedbackData | null>) => void;
  onBatchFeedbackChange: (batchFeedback: Record<string, FeedbackData | null>) => void;
  isGenerating: boolean;
  traceCount: number;
  onTraceClick: () => void;
  traceDisabled?: boolean;
  generatedImageCount: number;
  onHistoryOpen: () => void;
  historyDisabled: boolean;
}

const HistoryIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 7v5l3.2 1.9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M5.2 10.2A7.2 7.2 0 1 1 7.3 17"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
    />
    <path
      d="M4.8 5.8v4h4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function buildBatchFeedbackMap(posts: PostNode[]) {
  return posts.reduce<Record<string, FeedbackData | null>>((acc, post) => {
    acc[post.id] = post.feedback?.type
      ? {
          type: post.feedback.type,
          reasons: post.feedback.reasons ?? [],
          customNote: post.feedback.customNote ?? ''
        }
      : null;
    return acc;
  }, {});
}

function getFeedbackLabel(type: FeedbackType) {
  if (type === 'yes') {
    return 'Like';
  }
  if (type === 'no') {
    return 'Dislike';
  }
  if (type === 'unsure') {
    return 'Unsure';
  }
  return '';
}

function getCardTone(type: FeedbackType) {
  if (type === 'yes') {
    return 'yes';
  }
  if (type === 'no') {
    return 'no';
  }
  if (type === 'unsure') {
    return 'unsure';
  }
  return '';
}

const PLACEHOLDER_COUNT = 4;

const PostGrid: React.FC<Props> = ({
  posts,
  onInspect,
  onStartGuidedFeedback,
  onBatchFeedbackChange,
  isGenerating,
  generatedImageCount,
  onHistoryOpen,
  historyDisabled
}) => {
  const [batchFeedback, setBatchFeedback] = useState<Record<string, FeedbackData | null>>(() => buildBatchFeedbackMap(posts));

  useEffect(() => {
    setBatchFeedback(buildBatchFeedbackMap(posts));
  }, [posts]);

  const triagedCount = useMemo(
    () => posts.filter(post => Boolean(batchFeedback[post.id]?.type)).length,
    [batchFeedback, posts]
  );

  const counts = useMemo(() => ({
    likes: Object.values(batchFeedback).filter(entry => entry?.type === 'yes').length,
    dislikes: Object.values(batchFeedback).filter(entry => entry?.type === 'no').length,
    unsure: Object.values(batchFeedback).filter(entry => entry?.type === 'unsure').length
  }), [batchFeedback]);

  const allTriaged = posts.length > 0 && triagedCount === posts.length;

  const handleFeedbackChange = (postId: string, nextType: FeedbackType) => {
    const current = batchFeedback[postId];
    const resolvedType = current?.type === nextType ? null : nextType;
    const nextFeedback: FeedbackData | null = resolvedType
      ? {
          type: resolvedType,
          reasons: [],
          customNote: ''
        }
      : null;
    const nextBatchFeedback = {
      ...batchFeedback,
      [postId]: nextFeedback
    };
    setBatchFeedback(nextBatchFeedback);
    onBatchFeedbackChange(nextBatchFeedback);
  };

  const handleInspect = (post: PostNode) => {
    const feedback = batchFeedback[post.id] ?? { type: null, reasons: [], customNote: '' };
    onInspect(post, feedback, batchFeedback);
  };

  return (
    <div className="post-grid-container">
      <div className="post-grid-review-column">
        <section className={`post-grid-grid-shell ${isGenerating ? 'post-grid-grid-shell--loading' : ''}`}>
          <div className="post-grid-grid-heading">
            <div>
              <div className="post-grid-kicker">Step 1</div>
              <h2>Mark each image</h2>
            </div>
          </div>

          <div className={`post-grid ${isGenerating ? 'generating' : ''}`}>
            {isGenerating && posts.length === 0
              ? Array.from({ length: PLACEHOLDER_COUNT }).map((_, index) => (
                  <article key={`placeholder-${index}`} className="post-card generating">
                    <div className="post-placeholder-surface shimmer" />
                    <div className="post-placeholder-footer">
                      <div className="post-placeholder-meta shimmer" />
                      <div className="post-placeholder-heading shimmer" />
                      <div className="post-placeholder-toggle-row">
                        <div className="post-placeholder-pill shimmer" />
                        <div className="post-placeholder-pill shimmer" />
                        <div className="post-placeholder-pill shimmer" />
                      </div>
                    </div>
                  </article>
                ))
              : posts.map(post => {
                  const feedback = batchFeedback[post.id];
                  const type = feedback?.type ?? null;
                  const cardTone = getCardTone(type);
                  const title = post.analysis?.title || `Image ${post.metadata?.indexInBatch ? post.metadata.indexInBatch + 1 : ''}`.trim();

                  return (
                    <article key={post.id} className={`post-card ${cardTone}`}>
                      <div className="post-image-container">
                        <img src={post.imageUrl} alt={title} />
                        <div className="corner-actions">
                          <button
                            type="button"
                            className="corner-btn"
                            aria-label="Inspect image"
                            onClick={() => handleInspect(post)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <circle cx="11" cy="11" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
                              <path d="m16 16 4 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                            </svg>
                          </button>
                        </div>
                        {type ? (
                          <div className={`post-triage-badge is-${cardTone}`}>
                            {getFeedbackLabel(type)}
                          </div>
                        ) : null}
                      </div>

                      <div className="feedback-section">
                        <div className="feedback-toggle">
                          <button
                            type="button"
                            className={`feedback-btn yes ${type === 'yes' ? 'active' : ''}`}
                            onClick={() => handleFeedbackChange(post.id, 'yes')}
                          >
                            Like
                          </button>
                          <button
                            type="button"
                            className={`feedback-btn unsure ${type === 'unsure' ? 'active' : ''}`}
                            onClick={() => handleFeedbackChange(post.id, 'unsure')}
                          >
                            Unsure
                          </button>
                          <button
                            type="button"
                            className={`feedback-btn no ${type === 'no' ? 'active' : ''}`}
                            onClick={() => handleFeedbackChange(post.id, 'no')}
                          >
                            Dislike
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
          </div>
        </section>
      </div>

      <aside className="explore-panel">
        <div className="explore-panel-toolbar">
          <button
            type="button"
            className="post-studio-history-btn"
            onClick={onHistoryOpen}
            disabled={historyDisabled}
          >
            <span className="post-studio-history-count">
              <span className="post-studio-history-count-icon">
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="5" y="6" width="14" height="12" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path d="M7.5 15.2 10.7 12l2.2 2 1.8-1.8 1.8 3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="9" cy="10" r="1.2" fill="currentColor" />
                </svg>
              </span>
              {generatedImageCount > 0 ? generatedImageCount : '–'}
            </span>
            <span className="post-studio-history-label">
              <span className="post-studio-meta-icon"><HistoryIcon /></span>
              History
            </span>
          </button>
        </div>

        <div className="explore-panel-copy">
          <div className="post-grid-kicker">Next</div>
          <h3>Guided critique</h3>
          <p>{allTriaged ? 'Ready for guided critique.' : 'Finish the quick reactions first.'}</p>
        </div>

        <section className="aggregate-feedback-section aggregate-feedback-section--summary">
          <div className="feedback-group">
            <h5>Current read</h5>
            <div className="feedback-chips">
              <span className="summary-chip like">{counts.likes} like</span>
              <span className="summary-chip dislike">{counts.dislikes} dislike</span>
              <span className="summary-chip neutral">{counts.unsure} unsure</span>
            </div>
          </div>
          <div className="trace-action-note">
            {allTriaged
              ? 'Ready for guided feedback.'
              : `${Math.max(posts.length - triagedCount, 0)} image${posts.length - triagedCount === 1 ? '' : 's'} left to sort.`}
          </div>
        </section>

        <div className="explore-panel-actions">
          <button
            type="button"
            className="ui-btn ui-btn--primary explore-action-btn"
            onClick={() => onStartGuidedFeedback(batchFeedback)}
            disabled={!allTriaged || isGenerating}
          >
            Start guided critique
          </button>
        </div>
      </aside>
    </div>
  );
};

export default PostGrid;
