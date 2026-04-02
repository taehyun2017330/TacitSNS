import React, { useState } from 'react';
import { Edit2, Download, ArrowLeft } from 'lucide-react';
import './PostSingleView.css';
import { FeedbackData, FeedbackType, PostNode } from './history/types';
import { formatDisplayLabel, getFeedbackReasonOptions, getSuggestedEdits } from './postStudio/analysisUtils';

interface EditOptions {
  suggestedEdits: string[];
  customEdit: string;
}

interface Props {
  post: PostNode;
  feedback: FeedbackData;
  onFeedbackChange: (feedback: FeedbackData) => void;
  onEdit: (editOptions: EditOptions) => void;
  onFinalize: () => void;
  onBack: () => void;
  isGenerating: boolean;
}

function getCustomFeedbackPlaceholder(type: FeedbackType) {
  if (type === 'yes') {
    return 'What should the next images keep?';
  }
  if (type === 'no') {
    return 'What should change in the next version?';
  }
  if (type === 'unsure') {
    return 'What still feels unresolved?';
  }
  return 'Add detail';
}

const PostSingleView: React.FC<Props> = ({
  post,
  feedback,
  onFeedbackChange,
  onEdit,
  onFinalize,
  onBack,
  isGenerating
}) => {
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedSuggestedEdits, setSelectedSuggestedEdits] = useState<string[]>([]);
  const [customEdit, setCustomEdit] = useState('');

  const suggestedEdits = getSuggestedEdits(post);
  const availableReasons = feedback.type ? getFeedbackReasonOptions(post, feedback.type) : [];

  const handleFeedbackToggle = (type: FeedbackType) => {
    onFeedbackChange({
      type: feedback.type === type ? null : type,
      reasons: [],
      customNote: feedback.customNote ?? ''
    });
  };

  const handleReasonToggle = (reason: string) => {
    const reasons = feedback.reasons.includes(reason)
      ? feedback.reasons.filter(existing => existing !== reason)
      : [...feedback.reasons, reason];

    onFeedbackChange({
      ...feedback,
      reasons
    });
  };

  const handleCustomFeedbackChange = (customNote: string) => {
    onFeedbackChange({
      ...feedback,
      customNote
    });
  };

  const toggleSuggestedEdit = (edit: string) => {
    setSelectedSuggestedEdits(prev =>
      prev.includes(edit)
        ? prev.filter(e => e !== edit)
        : [...prev, edit]
    );
  };

  const handleEditSubmit = () => {
    const editOptions: EditOptions = {
      suggestedEdits: selectedSuggestedEdits,
      customEdit: customEdit.trim()
    };

    setShowEditPanel(false);
    setSelectedSuggestedEdits([]);
    setCustomEdit('');
    onEdit(editOptions);
  };

  return (
    <div className="post-single-view">
      <div className="single-view-header">
        <button type="button" className="ui-btn ui-btn--secondary back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          Back to Grid
        </button>
        <h2>Image</h2>
      </div>

      <div className="single-view-content">
        <div className="image-display-area">
          <div className="image-display-card">
            <img src={post.imageUrl} alt="Selected post" />
          </div>

	          {post.analysis ? (
	            <div className="image-analysis-card">
	              {post.metadata?.directionAngle ? (
	                <div className="single-view-direction-angle">
	                  {formatDisplayLabel(post.metadata.directionAngle)}
	                </div>
	              ) : null}
	              <div className="panel-title">{post.analysis.title || 'Why this option is different'}</div>
              {post.analysis.summary ? (
                <div className="panel-subtitle">{post.analysis.summary}</div>
              ) : null}

              {post.analysis.supportsGoal ? (
                <div className="analysis-section">
                  <div className="analysis-label">Supports goal</div>
                  <p>{post.analysis.supportsGoal}</p>
                </div>
              ) : null}

              {post.analysis.differencesFromSiblings?.length ? (
                <div className="analysis-section">
                  <div className="analysis-label">Changed here</div>
                  <ul className="analysis-list">
                    {post.analysis.differencesFromSiblings.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {post.analysis.designKeywords?.length ? (
                <div className="analysis-section">
                  <div className="analysis-label">Keywords</div>
                  <div className="single-view-reason-chips">
                    {post.analysis.designKeywords.map((item) => (
                      <span key={item} className="reason-chip">
                        {formatDisplayLabel(item)}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="actions-panel">
          <div className={`single-view-feedback-card is-${feedback?.type ?? 'none'}`}>
            <div className="panel-title">Feedback</div>
            <div className="panel-subtitle">
              Mark it before you edit or keep it.
            </div>

            <div className="feedback-toggle single-view-feedback-toggle">
              <button
                type="button"
                className={`ui-btn ui-btn--choice feedback-btn yes ${feedback?.type === 'yes' ? 'active' : ''}`}
                onClick={() => handleFeedbackToggle('yes')}
              >
                Like
              </button>
              <button
                type="button"
                className={`ui-btn ui-btn--choice feedback-btn unsure ${feedback?.type === 'unsure' ? 'active' : ''}`}
                onClick={() => handleFeedbackToggle('unsure')}
              >
                Unsure
              </button>
              <button
                type="button"
                className={`ui-btn ui-btn--choice feedback-btn no ${feedback?.type === 'no' ? 'active' : ''}`}
                onClick={() => handleFeedbackToggle('no')}
              >
                Dislike
              </button>
            </div>

            {feedback?.type ? (
              <>
                <div className="reason-chips single-view-reason-chips">
                  {availableReasons.map(reason => (
                    <button
                      type="button"
                      key={reason}
                      className={`ui-btn ui-btn--choice reason-chip ${feedback.reasons.includes(reason) ? 'selected' : ''}`}
                      onClick={() => handleReasonToggle(reason)}
                    >
                      {formatDisplayLabel(reason)}
                    </button>
                  ))}
                </div>
                <input
                  className="single-view-feedback-note"
                  placeholder={getCustomFeedbackPlaceholder(feedback.type)}
                  value={feedback.customNote ?? ''}
                  onChange={(event) => handleCustomFeedbackChange(event.target.value)}
                />
              </>
            ) : null}
          </div>

          <div className="action-buttons">
            <button
              type="button"
              className={`ui-btn ui-btn--secondary action-btn ${showEditPanel ? 'active' : ''}`}
              onClick={() => setShowEditPanel(!showEditPanel)}
              disabled={isGenerating}
            >
              <Edit2 size={18} />
              Edit
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--primary action-btn primary"
              onClick={onFinalize}
              disabled={isGenerating}
            >
              <Download size={18} />
              Use post
            </button>
          </div>

          {showEditPanel && (
            <div className="edit-panel">
              <div className="panel-title">Edits</div>
              <div className="panel-subtitle">
                Choose a change or type one.
              </div>

              <div className="suggested-edits">
                <div className="edits-label">Suggested</div>
                <div className="edits-list">
                  {suggestedEdits.map((edit, index) => (
                    <button
                      type="button"
                      key={index}
                      className={`ui-btn ui-btn--choice edit-chip ${selectedSuggestedEdits.includes(edit) ? 'selected' : ''}`}
                      onClick={() => toggleSuggestedEdit(edit)}
                    >
                      {edit}
                    </button>
                  ))}
                </div>
              </div>

              <div className="custom-edit">
                <label className="custom-edit-label">Custom edit</label>
                <textarea
                  className="custom-edit-textarea"
                  placeholder="e.g., warmer light, softer crop"
                  value={customEdit}
                  onChange={(e) => setCustomEdit(e.target.value)}
                  rows={3}
                />
              </div>

              <button
                className="ui-btn ui-btn--primary submit-btn primary"
                onClick={handleEditSubmit}
                disabled={isGenerating || (selectedSuggestedEdits.length === 0 && !customEdit.trim())}
              >
                {isGenerating ? 'Applying...' : 'Apply'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostSingleView;
