import React, { useEffect, useMemo, useState } from 'react';

import type { PostGoalSuggestion } from '../../../types/workspace';
import {
  buildPrimaryPreview,
  DEFAULT_POST_GOAL_PLACEHOLDER_BACKGROUND,
  detectImageTextTone
} from './postGoalExplorer.utils';

interface Props {
  goal: PostGoalSuggestion;
  isLoading?: boolean;
}

const PostGoalExampleGallery: React.FC<Props> = ({ goal, isLoading = false }) => {
  const preview = useMemo(() => buildPrimaryPreview(goal), [goal]);
  const [textTone, setTextTone] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    let cancelled = false;

    if (!goal.previewImageUrl) {
      setTextTone('light');
      return () => {
        cancelled = true;
      };
    }

    void detectImageTextTone(goal.previewImageUrl).then(nextTone => {
      if (!cancelled) {
        setTextTone(nextTone);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [goal.previewImageUrl]);

  if (!preview) {
    return null;
  }

  return (
    <div className="post-goal-preview-gallery">
      <div className="post-goal-preview-stage">
        <article
          className={`post-goal-preview-canvas ${textTone === 'dark' ? 'is-dark-tone' : 'is-light-tone'} ${isLoading ? 'is-loading' : ''}`}
          style={
            goal.previewImageUrl
              ? {
                  backgroundImage: `linear-gradient(180deg, rgba(18, 18, 17, 0.08) 0%, rgba(18, 18, 17, 0.48) 100%), url(${goal.previewImageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }
              : { background: DEFAULT_POST_GOAL_PLACEHOLDER_BACKGROUND }
          }
        >
          <div className="post-goal-preview-kicker">Example</div>
          <div className="post-goal-preview-copy">
            <strong>{preview.headline}</strong>
            <p>{preview.caption}</p>
          </div>
          {isLoading ? (
            <div className="post-goal-preview-loading-note">Generating example image…</div>
          ) : null}
        </article>
      </div>
    </div>
  );
};

export default PostGoalExampleGallery;
