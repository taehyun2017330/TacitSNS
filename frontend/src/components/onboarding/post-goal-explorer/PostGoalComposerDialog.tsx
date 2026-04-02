import React from 'react';

import InlineEditableText from '../InlineEditableText';
import PostGoalReferenceUpload from './PostGoalReferenceUpload';
import type { PostGoalComposerState } from './postGoalExplorer.types';

interface Props {
  businessGoalTitle: string;
  composer: PostGoalComposerState;
  onChange: (next: PostGoalComposerState) => void;
  onReferenceAssetsChange: (assets: PostGoalComposerState['referenceAssets']) => void;
  onClose: () => void;
  onSave: () => void;
}

const PostGoalComposerDialog: React.FC<Props> = ({
  businessGoalTitle,
  composer,
  onChange,
  onReferenceAssetsChange,
  onClose,
  onSave
}) => {
  const isChoosingInputMethod = composer.mode === 'custom' && composer.inputMethod === null;
  const isReferenceMode = composer.inputMethod === 'reference';
  const isGeneratingReferenceDraft = Boolean(composer.isGeneratingReferenceDraft);
  const canSave = composer.mode === 'edit' || composer.inputMethod === 'text'
    ? Boolean(composer.title.trim())
    : false;
  const rationaleText =
    composer.rationale.trim() || `This post goal supports "${businessGoalTitle}" for this brand.`;

  return (
    <article className="goal-card goal-card--custom goal-inline-editor goal-inline-editor--wide">
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
                ? `Upload a reference image first. The system will turn it into a post-goal draft under ${businessGoalTitle.toLowerCase()} and add it back into the explorer as another option.`
                : 'Write a concrete post goal that could become a folder with multiple image explorations.'}
          </p>

          {composer.mode === 'custom' && composer.inputMethod === 'reference' && (
            <div className="goal-dialog-reference-intro">
              The uploaded image becomes the first visual example for the generated post-goal draft.
            </div>
          )}

          {isReferenceMode && (
            <PostGoalReferenceUpload
              referenceAssets={composer.referenceAssets}
              onChange={onReferenceAssetsChange}
            />
          )}

          {isReferenceMode ? (
            <div className="goal-dialog-reference-status">
              {isGeneratingReferenceDraft ? (
                <>
                  <div className="goal-card-rationale-label">Generating draft</div>
                  <p>Reading the reference image and turning it into another suggested post goal.</p>
                </>
              ) : composer.referenceGenerationError ? (
                <>
                  <div className="goal-card-rationale-label">Draft generation failed</div>
                  <p>{composer.referenceGenerationError}</p>
                  <button
                    type="button"
                    className="ui-btn ui-btn--secondary"
                    onClick={() => onChange({
                      ...composer,
                      isGeneratingReferenceDraft: false,
                      referenceGenerationError: '',
                      lastReferenceDraftAssetId: null
                    })}
                  >
                    Try again
                  </button>
                </>
              ) : composer.referenceAssets.length > 0 ? (
                <>
                  <div className="goal-card-rationale-label">Ready</div>
                  <p>The uploaded image will be turned into a new suggested post goal automatically.</p>
                </>
              ) : (
                <>
                  <div className="goal-card-rationale-label">Next</div>
                  <p>Upload one reference image to generate a new suggested post goal.</p>
                </>
              )}
            </div>
          ) : (
            <>
              <InlineEditableText
                as="div"
                value={composer.title}
                onChange={value => onChange({ ...composer, title: value })}
                placeholder="Type the post goal title here"
                className="goal-card-title inline-editable--title"
                multiline={false}
              />

              <InlineEditableText
                as="div"
                value={composer.description}
                onChange={value => onChange({ ...composer, description: value })}
                placeholder="Describe what kind of image direction this should become"
                className="goal-card-description inline-editable--body"
              />

              <div className="goal-card-rationale-block">
                <div className="goal-card-rationale-label">Why this fits</div>
                <p className="goal-card-rationale">{rationaleText}</p>
              </div>
            </>
          )}
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
        {!isChoosingInputMethod && !isReferenceMode && (
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
    </article>
  );
};

export default PostGoalComposerDialog;
