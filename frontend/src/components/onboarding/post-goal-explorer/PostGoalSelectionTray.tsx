import React from 'react';

import type { PostGoalFolder } from '../../../types/workspace';

interface Props {
  postGoalFolders: PostGoalFolder[];
  onRemovePostGoal: (folderId: string) => void;
}

const getDirectionLabels = (folder: PostGoalFolder) => (
  folder.directions?.slice(0, 4).map(direction => direction.chip || direction.angle).filter(Boolean)
  ?? folder.imageTypeChips?.slice(0, 4)
  ?? folder.taxonomyTags.slice(0, 4)
);

const PostGoalSelectionTray: React.FC<Props> = ({ postGoalFolders, onRemovePostGoal }) => {
  if (postGoalFolders.length === 0) {
    return null;
  }

  return (
    <section className="goal-selector-section goal-selector-section--selected">
      <div className="goal-selector-section-header goal-selector-section-header--row">
        <div>
          <div className="section-kicker">Starting set</div>
          <p>These post goals will become the first folders in the workspace.</p>
        </div>
      </div>

      <div className="post-goal-selected-strip">
        {postGoalFolders.map(folder => (
          <article key={folder.id} className="post-goal-selected-card">
            <div
              className="post-goal-selected-card-visual"
              style={
                folder.referenceAssets?.[0] && folder.source !== 'custom'
                  ? {
                      backgroundImage: `linear-gradient(180deg, rgba(25, 25, 24, 0.12) 0%, rgba(25, 25, 24, 0.55) 100%), url(${folder.referenceAssets[0].dataUrl})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center'
                    }
                  : folder.previewImageUrl
                    ? {
                        backgroundImage: `linear-gradient(180deg, rgba(25, 25, 24, 0.1) 0%, rgba(25, 25, 24, 0.42) 100%), url(${folder.previewImageUrl})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center'
                      }
                  : { background: folder.previewBackground }
              }
            />
            <div className="post-goal-selected-card-copy">
              <strong>{folder.title}</strong>
              <div className="post-goal-selected-card-tags">
                {getDirectionLabels(folder).map(tag => (
                  <span key={tag} className="post-goal-selected-card-tag">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <button
              type="button"
              className="post-goal-selected-card-remove"
              onClick={() => onRemovePostGoal(folder.id)}
            >
              Remove
            </button>
          </article>
        ))}
      </div>
    </section>
  );
};

export default PostGoalSelectionTray;
