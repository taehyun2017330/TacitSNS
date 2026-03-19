import React, { useEffect, useMemo, useState } from 'react';
import './PostGrid.css';
import { FeedbackData, FeedbackType, PostNode } from './history/types';

interface Props {
  posts: PostNode[];
  onSelect: (post: PostNode, feedback: FeedbackData, batchFeedback: Record<string, FeedbackData | null>) => void;
  onExplore: (
    post: PostNode,
    feedback: FeedbackData,
    similarity: number,
    batchFeedback: Record<string, FeedbackData | null>,
    direction?: string
  ) => void;
  isGenerating: boolean;
  traceCount?: number;
  onTraceClick?: () => void;
  traceDisabled?: boolean;
}

// Preset reason chips for quick feedback
const REASON_CHIPS = {
  no: [
    'Too commercial',
    'Not warm',
    'Colors off',
    "Doesn't feel like us",
    'Too busy',
    'Looks AI',
    'Hard to add text'
  ],
  unsure: [
    'Almost there',
    'Missing something',
    'Need variations',
    'Style unclear'
  ],
  yes: [
    'Perfect vibe',
    'On brand',
    'Great composition',
    'Text-ready'
  ]
};

const PostGrid: React.FC<Props> = ({
  posts,
  onSelect,
  onExplore,
  isGenerating,
  traceCount = 0,
  onTraceClick,
  traceDisabled = false
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [feedbackByIndex, setFeedbackByIndex] = useState<Record<number, FeedbackData>>({});
  const [similaritySlider, setSimilaritySlider] = useState(0.5);
  const [explorationDirection, setExplorationDirection] = useState<string>('');

  const postSignature = useMemo(
    () => posts.map(post => post.id).join('|'),
    [posts]
  );

  useEffect(() => {
    const nextFeedbackByIndex: Record<number, FeedbackData> = {};
    posts.forEach((post, index) => {
      if (post.feedback?.type) {
        nextFeedbackByIndex[index] = {
          type: post.feedback.type,
          reasons: [...post.feedback.reasons]
        };
      }
    });

    setFeedbackByIndex(nextFeedbackByIndex);
    setSelectedIndex(null);
  }, [postSignature, posts]);

  const getBatchFeedback = () => {
    const batchFeedback: Record<string, FeedbackData | null> = {};
    posts.forEach((post, index) => {
      if (index in feedbackByIndex) {
        const feedback = feedbackByIndex[index];
        batchFeedback[post.id] = feedback?.type ? feedback : null;
      }
    });
    return batchFeedback;
  };

  // Get aggregate feedback
  const getAggregateFeedback = () => {
    const likes: string[] = [];
    const dislikes: string[] = [];
    const unsure: string[] = [];

    Object.values(feedbackByIndex).forEach(feedback => {
      if (feedback.type === 'yes') {
        likes.push(...feedback.reasons);
      } else if (feedback.type === 'no') {
        dislikes.push(...feedback.reasons);
      } else if (feedback.type === 'unsure') {
        unsure.push(...feedback.reasons);
      }
    });

    return { likes, dislikes, unsure };
  };

  // Get suggested directions based on feedback
  const getSuggestedDirections = () => {
    const { likes, dislikes } = getAggregateFeedback();
    const directions = [];

    if (dislikes.includes('Too commercial')) {
      directions.push('candid');
    }
    if (dislikes.includes('Not warm')) {
      directions.push('warmer');
    }
    if (dislikes.includes('Too busy')) {
      directions.push('minimal');
    }
    if (likes.includes('On brand')) {
      directions.push('similar');
    }

    return directions;
  };

  const handleFeedbackToggle = (index: number, type: FeedbackType) => {
    setFeedbackByIndex(prev => ({
      ...prev,
      [index]: {
        type: prev[index]?.type === type ? null : type,
        reasons: prev[index]?.type === type ? [] : prev[index]?.reasons || []
      }
    }));
  };

  const handleReasonToggle = (index: number, reason: string) => {
    setFeedbackByIndex(prev => {
      const current = prev[index] || { type: null, reasons: [] };
      const reasons = current.reasons.includes(reason)
        ? current.reasons.filter(r => r !== reason)
        : [...current.reasons, reason];
      return {
        ...prev,
        [index]: { ...current, reasons }
      };
    });
  };

  const handleSelect = (index: number) => {
    setSelectedIndex(index);
  };

  const handleEdit = (index: number) => {
    const feedback = feedbackByIndex[index] || { type: null, reasons: [] };
    onSelect(posts[index], feedback, getBatchFeedback());
  };

  const confirmExplore = () => {
    // Use aggregate feedback from all images
    const aggregateFeedback = getAggregateFeedback();
    const feedbackData: FeedbackData = {
      type: aggregateFeedback.likes.length > aggregateFeedback.dislikes.length ? 'yes' :
            aggregateFeedback.dislikes.length > 0 ? 'no' : 'unsure',
      reasons: [...aggregateFeedback.likes, ...aggregateFeedback.dislikes, ...aggregateFeedback.unsure]
    };

    // Pass the selected post if any, otherwise use first post
    const postToExplore = selectedIndex !== null ? posts[selectedIndex] : posts[0];
    onExplore(
      postToExplore,
      feedbackData,
      similaritySlider,
      getBatchFeedback(),
      explorationDirection || undefined
    );
  };

  if (isGenerating) {
    return (
      <div className="post-grid-container">
        <div className="post-grid generating">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="post-card generating">
              <div className="post-placeholder">
                <div className="spinner"></div>
                <div className="generating-text">Creating post ideas...</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="post-grid-container">
      <div className="post-grid">
        {posts.map((post, index) => {
          const feedback = feedbackByIndex[index];
          const availableReasons = feedback?.type ? REASON_CHIPS[feedback.type] || [] : [];
          const isSelected = selectedIndex === index;

          return (
            <div
              key={post.id}
              className={`post-card ${feedback?.type || ''} ${isSelected ? 'selected' : ''}`}
            >
              {/* Post Image */}
              <div
                className="post-image-container"
                onClick={() => handleSelect(index)}
              >
                <img src={post.imageUrl} alt={`Post option ${index + 1}`} />

                {/* AI Keywords Overlay */}
                {post.keywords && post.keywords.length > 0 && (
                  <div className="keywords-overlay">
                    {post.keywords.slice(0, 3).map((keyword, i) => (
                      <span key={i} className="keyword-chip">{keyword}</span>
                    ))}
                  </div>
                )}

                {/* Corner Action Buttons */}
                <div className="corner-actions">
                  <button
                    className="ui-btn ui-btn--choice corner-btn edit"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(index);
                    }}
                    title="Edit this image"
                  >
                    Edit
                  </button>
                </div>
              </div>

              {/* Feedback Section */}
              <div className="feedback-section">
                <div className="feedback-toggle">
                  <button
                    className={`ui-btn ui-btn--choice feedback-btn yes ${feedback?.type === 'yes' ? 'active' : ''}`}
                    onClick={() => handleFeedbackToggle(index, 'yes')}
                  >
                    ✓
                  </button>
                  <button
                    className={`ui-btn ui-btn--choice feedback-btn unsure ${feedback?.type === 'unsure' ? 'active' : ''}`}
                    onClick={() => handleFeedbackToggle(index, 'unsure')}
                  >
                    ?
                  </button>
                  <button
                    className={`ui-btn ui-btn--choice feedback-btn no ${feedback?.type === 'no' ? 'active' : ''}`}
                    onClick={() => handleFeedbackToggle(index, 'no')}
                  >
                    ✗
                  </button>
                </div>

                {/* Reason Chips */}
                {feedback?.type && (
                  <div className="reason-chips">
                    {availableReasons.map((reason) => (
                      <button
                        key={reason}
                        className={`ui-btn ui-btn--choice reason-chip ${
                          feedback.reasons.includes(reason) ? 'selected' : ''
                        }`}
                        onClick={() => handleReasonToggle(index, reason)}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Explore Panel (Right Side - Always Visible) */}
      <div className="explore-panel">
        <div className="trace-action-wrap">
          <button
            className="ui-btn ui-btn--secondary history-trace-btn"
            onClick={onTraceClick}
            disabled={traceDisabled}
            title={traceDisabled ? 'Generate at least one set first' : 'Open creativity trace board'}
          >
            <span className="history-trace-main">
              <span className="history-trace-icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 7V12L15.5 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M3.2 12A8.8 8.8 0 1 0 6 5.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  <path d="M3 4V8H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span>History</span>
            </span>
            {traceCount > 0 ? (
              <span className="trace-count">{traceCount}</span>
            ) : (
              <span className="trace-count">0</span>
            )}
          </button>
          <div className="trace-action-note">
            Track your generation path and decisions
          </div>
        </div>
        <h3>Exploration Options</h3>

        {/* Aggregate Feedback Summary */}
        {(() => {
          const { likes, dislikes, unsure } = getAggregateFeedback();
          const hasAnyFeedback = likes.length > 0 || dislikes.length > 0 || unsure.length > 0;

          return hasAnyFeedback ? (
            <div className="aggregate-feedback-section">
              {likes.length > 0 && (
                <div className="feedback-group likes-group">
                  <h5>You liked:</h5>
                  <div className="feedback-chips">
                    {Array.from(new Set(likes)).map((reason, i) => (
                      <span key={i} className="summary-chip like">{reason}</span>
                    ))}
                  </div>
                </div>
              )}
              {dislikes.length > 0 && (
                <div className="feedback-group dislikes-group">
                  <h5>You disliked:</h5>
                  <div className="feedback-chips">
                    {Array.from(new Set(dislikes)).map((reason, i) => (
                      <span key={i} className="summary-chip dislike">{reason}</span>
                    ))}
                  </div>
                </div>
              )}
              {unsure.length > 0 && (
                <div className="feedback-group unsure-group">
                  <h5>You're unsure about:</h5>
                  <div className="feedback-chips">
                    {Array.from(new Set(unsure)).map((reason, i) => (
                      <span key={i} className="summary-chip unsure">{reason}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="no-feedback-message">
              <p>Select feedback on images to get personalized exploration suggestions</p>
            </div>
          );
        })()}

          {/* Exploration Distance */}
          <div className="explore-section">
            <h4>Exploration Distance</h4>
            <div className="similarity-control">
              <div className="slider-container">
                <span>Similar</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={similaritySlider}
                  onChange={(e) => setSimilaritySlider(parseFloat(e.target.value))}
                />
                <span>Different</span>
              </div>
              <div className="slider-value">
                {similaritySlider < 0.3 ? 'Keep it close' :
                 similaritySlider > 0.7 ? 'Go adventurous' :
                 'Balanced exploration'}
              </div>
            </div>
          </div>

          {/* Direction Suggestions */}
          <div className="explore-section">
            <h4>Exploration Directions</h4>
            <div className="direction-buttons">
              {(() => {
                const { likes, dislikes } = getAggregateFeedback();
                const suggestedDirs = getSuggestedDirections();

                // Dynamic directions based on feedback
                const directions = [
                  { id: 'warmer', label: 'Warmer & more inviting', show: dislikes.includes('Not warm') },
                  { id: 'minimal', label: 'More minimal & clean', show: dislikes.includes('Too busy') },
                  { id: 'candid', label: 'Less commercial, more candid', show: dislikes.includes('Too commercial') },
                  { id: 'bold', label: 'Bolder & more energetic', show: !likes.includes('Perfect vibe') },
                  { id: 'premium', label: 'More premium & sophisticated', show: true },
                  { id: 'lifestyle', label: 'Add lifestyle context', show: true },
                  { id: 'similar', label: 'More like the ones I liked', show: likes.length > 0 },
                  { id: 'opposite', label: 'Avoid what I disliked', show: dislikes.length > 0 }
                ];

                return directions
                  .filter(dir => dir.show)
                  .map(dir => (
                    <button
                      key={dir.id}
                      className={`ui-btn ui-btn--choice direction-btn ${explorationDirection === dir.id ? 'selected' : ''} ${suggestedDirs.includes(dir.id) ? 'suggested' : ''}`}
                      onClick={() => setExplorationDirection(dir.id)}
                    >
                      {dir.label}
                      {suggestedDirs.includes(dir.id) && <span className="suggested-badge">Suggested</span>}
                    </button>
                  ));
              })()}
            </div>
          </div>

          {/* Explore Button */}
          <button
            className="ui-btn ui-btn--primary explore-action-btn"
            onClick={confirmExplore}
            disabled={posts.length === 0}
          >
            Generate 4 Variations
          </button>
        </div>
    </div>
  );
};

export default PostGrid;
