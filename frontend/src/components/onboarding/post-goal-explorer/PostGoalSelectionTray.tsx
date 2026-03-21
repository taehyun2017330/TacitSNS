import React from 'react';

import type { PostGoalFolder } from '../../../types/workspace';

interface Props {
  postGoalFolders: PostGoalFolder[];
  onRemovePostGoal: (title: string) => void;
}

const PostGoalSelectionTray: React.FC<Props> = ({ postGoalFolders, onRemovePostGoal }) => (
  <section className="goal-selector-section goal-selector-section--selected">
    <div className="goal-selector-section-header goal-selector-section-header--row">
      <div>
        <div className="section-kicker">Chosen post goals</div>
        <p>These will become the first folders in the workspace.</p>
      </div>
      <div className="workspace-count-chip">
        {postGoalFolders.length} {postGoalFolders.length === 1 ? 'goal' : 'goals'}
      </div>
    </div>

    {postGoalFolders.length === 0 ? (
      <div className="goal-selector-empty-note">
        Nothing selected yet. Start by choosing one or two post goals that feel like the right image directions for this business goal.
      </div>
    ) : (
      <div className="workspace-folder-grid">
        {postGoalFolders.map(folder => (
          <article key={folder.id} className="workspace-folder-card workspace-folder-card--selected">
            <div
              className="workspace-folder-preview"
              style={
                folder.referenceAssets?.[0]
                  ? { backgroundImage: `linear-gradient(180deg, rgba(25, 25, 24, 0.12) 0%, rgba(25, 25, 24, 0.55) 100%), url(${folder.referenceAssets[0].dataUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                  : { background: folder.previewBackground }
              }
            >
              <div className="workspace-folder-preview-title">{folder.previewTitle || folder.title}</div>
              <div className="workspace-folder-preview-caption">{folder.previewCaption || folder.description}</div>
            </div>
            <div className="workspace-folder-card-topline">
              <span>{folder.source === 'recommended' ? 'Suggested' : 'Custom'}</span>
              <span>{folder.businessGoalTitle}</span>
            </div>
            <h4>{folder.title}</h4>
            <p>{folder.description}</p>
            <div className="post-goal-tags">
              {folder.taxonomyTags.map(tag => (
                <span key={tag} className="post-goal-tag">{tag}</span>
              ))}
              {folder.referenceAssets?.length ? <span className="post-goal-tag">Reference image</span> : null}
            </div>
            <button
              type="button"
              className="ui-btn ui-btn--secondary"
              onClick={() => onRemovePostGoal(folder.title)}
            >
              Remove
            </button>
          </article>
        ))}
      </div>
    )}
  </section>
);

export default PostGoalSelectionTray;
