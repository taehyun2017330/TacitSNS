import React from 'react';

import PostGoalReferenceUpload from './PostGoalReferenceUpload';
import type { PostGoalComposerState } from './postGoalExplorer.types';

interface Props {
  composer: PostGoalComposerState;
  onChange: (next: PostGoalComposerState) => void;
  onClose: () => void;
  onSave: () => void;
}

const PostGoalComposerDialog: React.FC<Props> = ({
  composer,
  onChange,
  onClose,
  onSave
}) => (
  <div className="goal-dialog-backdrop" onClick={onClose}>
    <div className="goal-dialog" onClick={event => event.stopPropagation()}>
      <div className="section-kicker">{composer.mode === 'edit' ? 'Adjust post goal' : 'Custom post goal'}</div>
      <h4>{composer.mode === 'edit' ? 'Adjust this post goal' : 'Add your own post goal'}</h4>
      <p>
        Keep the post goal concrete enough to imagine a post, but broad enough that it can become a folder with multiple 2x2 explorations.
      </p>

      <label className="goal-dialog-field">
        <span>Post goal</span>
        <input
          type="text"
          value={composer.title}
          onChange={event => onChange({ ...composer, title: event.target.value })}
          placeholder='e.g., "Show our founder expertise"'
        />
      </label>

      <label className="goal-dialog-field">
        <span>What this post explores</span>
        <textarea
          value={composer.description}
          onChange={event => onChange({ ...composer, description: event.target.value })}
          rows={3}
          placeholder="Describe what kind of post direction this should become."
        />
      </label>

      <label className="goal-dialog-field">
        <span>Why this fits</span>
        <textarea
          value={composer.rationale}
          onChange={event => onChange({ ...composer, rationale: event.target.value })}
          rows={3}
          placeholder="Optional note about why this direction fits the business goal."
        />
      </label>

      <PostGoalReferenceUpload
        referenceAssets={composer.referenceAssets}
        onChange={referenceAssets => onChange({ ...composer, referenceAssets })}
      />

      <div className="goal-dialog-actions">
        <button
          type="button"
          className="ui-btn ui-btn--secondary"
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          type="button"
          className="ui-btn ui-btn--primary"
          onClick={onSave}
          disabled={!composer.title.trim()}
        >
          Save post goal
        </button>
      </div>
    </div>
  </div>
);

export default PostGoalComposerDialog;
