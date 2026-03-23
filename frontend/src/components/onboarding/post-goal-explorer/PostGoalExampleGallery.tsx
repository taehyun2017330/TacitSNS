import React, { useMemo } from 'react';

import type { PostGoalSuggestion } from '../../../types/workspace';
import { buildPrimaryPreview, getPreviewTextTone } from './postGoalExplorer.utils';

interface Props {
  goal: PostGoalSuggestion;
  isLoading?: boolean;
}

const PostGoalExampleGallery: React.FC<Props> = ({ goal, isLoading = false }) => {
  const preview = useMemo(() => buildPrimaryPreview(goal), [goal]);
  const textTone = useMemo(() => getPreviewTextTone(goal.previewBackground), [goal.previewBackground]);

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
              : { background: goal.previewBackground }
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
