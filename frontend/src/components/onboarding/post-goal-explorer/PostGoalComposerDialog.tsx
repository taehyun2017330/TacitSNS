import React from 'react';

import PostGoalReferenceUpload from './PostGoalReferenceUpload';
import type { PostGoalComposerState } from './postGoalExplorer.types';

interface Props {
  businessGoalTitle: string;
  composer: PostGoalComposerState;
  onChange: (next: PostGoalComposerState) => void;
  onClose: () => void;
  onSave: () => void;
}

const PostGoalComposerDialog: React.FC<Props> = ({
  businessGoalTitle,
  composer,
  onChange,
  onClose,
  onSave
}) => {
  const isChoosingInputMethod = composer.mode === 'custom' && composer.inputMethod === null;
  const canSave = composer.inputMethod === 'reference'
    ? Boolean(composer.title.trim() || composer.referenceAssets.length > 0)
    : Boolean(composer.title.trim());

  return (
    <div className="goal-dialog-backdrop" onClick={onClose}>
      <div className="goal-dialog" onClick={event => event.stopPropagation()}>
        <div className="section-kicker">{composer.mode === 'edit' ? 'Adjust post goal' : 'Custom post goal'}</div>
        <h4>{composer.mode === 'edit' ? 'Adjust this post goal' : 'Add your own post goal'}</h4>

        {isChoosingInputMethod ? (
          <>
            <p>Start with the kind of input you already have.</p>
            <div className="goal-dialog-choice-grid">
              <button
                type="button"
                className="goal-dialog-choice-card"
                onClick={() => onChange({ ...composer, inputMethod: 'reference' })}
              >
                <strong>I have a reference image</strong>
                <span>Upload an example image first, then shape this into a post-goal direction.</span>
              </button>

              <button
                type="button"
                className="goal-dialog-choice-card"
                onClick={() => onChange({ ...composer, inputMethod: 'text' })}
              >
                <strong>I only have a text idea</strong>
                <span>Write the post goal directly and describe what kind of image direction it should become.</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <p>
              {composer.mode === 'edit'
                ? 'Refine this post goal so it stays concrete enough to imagine, but broad enough to support several image explorations.'
                : composer.inputMethod === 'reference'
                  ? `Upload a reference image and turn it into a post-goal direction under ${businessGoalTitle.toLowerCase()}.`
                  : 'Write a concrete post goal that could become a folder with multiple image explorations.'}
            </p>

            {composer.mode === 'custom' && composer.inputMethod === 'reference' && (
              <div className="goal-dialog-reference-intro">
                The uploaded image becomes the visual anchor for this custom post goal and will carry into the workspace.
              </div>
            )}

            {composer.inputMethod === 'reference' && (
              <PostGoalReferenceUpload
                referenceAssets={composer.referenceAssets}
                onChange={referenceAssets => onChange({ ...composer, referenceAssets })}
              />
            )}

            <label className="goal-dialog-field">
              <span>Post goal</span>
              <input
                type="text"
                value={composer.title}
                onChange={event => onChange({ ...composer, title: event.target.value })}
                placeholder={
                  composer.inputMethod === 'reference'
                    ? 'e.g., Reference-led premium product portrait'
                    : 'e.g., Show our founder expertise'
                }
              />
            </label>

            <label className="goal-dialog-field">
              <span>What this post explores</span>
              <textarea
                value={composer.description}
                onChange={event => onChange({ ...composer, description: event.target.value })}
                rows={3}
                placeholder={
                  composer.inputMethod === 'reference'
                    ? 'Optional: describe what kind of post direction this reference image should become.'
                    : 'Describe what kind of post direction this should become.'
                }
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
          </>
        )}

        <div className="goal-dialog-actions">
          {!isChoosingInputMethod && composer.mode === 'custom' && (
            <button
              type="button"
              className="ui-btn ui-btn--secondary"
              onClick={() => onChange({ ...composer, inputMethod: null })}
            >
              Back
            </button>
          )}
          <button
            type="button"
            className="ui-btn ui-btn--secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          {!isChoosingInputMethod && (
            <button
              type="button"
              className="ui-btn ui-btn--primary"
              onClick={onSave}
              disabled={!canSave}
            >
              Save post goal
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostGoalComposerDialog;
