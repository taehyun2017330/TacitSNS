import React, { useState } from 'react';
import { Edit2, Download, ArrowLeft } from 'lucide-react';
import './PostSingleView.css';
import { PostNode } from './history/types';

interface EditOptions {
  suggestedEdits: string[];
  customEdit: string;
}

interface Props {
  post: PostNode;
  onEdit: (editOptions: EditOptions) => void;
  onFinalize: () => void;
  onBack: () => void;
  isGenerating: boolean;
}

const PostSingleView: React.FC<Props> = ({
  post,
  onEdit,
  onFinalize,
  onBack,
  isGenerating
}) => {
  const [showEditPanel, setShowEditPanel] = useState(false);
  const [selectedSuggestedEdits, setSelectedSuggestedEdits] = useState<string[]>([]);
  const [customEdit, setCustomEdit] = useState('');

  const suggestedEdits = [
    'Add more white space',
    'Increase color vibrancy',
    'Blur the background',
    'Add text overlay',
    'Crop to square format',
    'Apply vintage filter',
    'Enhance lighting',
    'Add brand watermark',
    'Remove distracting elements',
    'Adjust composition'
  ];

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
        <button className="ui-btn ui-btn--secondary back-btn" onClick={onBack}>
          <ArrowLeft size={18} />
          Back to Grid
        </button>
        <h2>Edit Image</h2>
      </div>

      <div className="single-view-content">
        <div className="image-display-area">
          <div className="image-display-card">
            <img src={post.imageUrl} alt="Selected post" />
            {post.keywords && post.keywords.length > 0 && (
              <div className="image-keywords">
                {post.keywords.map((keyword, idx) => (
                  <span key={idx} className="keyword-badge">{keyword}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="actions-panel">
          <div className="action-buttons">
            <button
              className={`ui-btn ui-btn--secondary action-btn ${showEditPanel ? 'active' : ''}`}
              onClick={() => setShowEditPanel(!showEditPanel)}
              disabled={isGenerating}
            >
              <Edit2 size={18} />
              Edit Image
            </button>
            <button
              className="ui-btn ui-btn--primary action-btn primary"
              onClick={onFinalize}
              disabled={isGenerating}
            >
              <Download size={18} />
              Use This Post
            </button>
          </div>

          {showEditPanel && (
            <div className="edit-panel">
              <div className="panel-title">Edit This Image</div>
              <div className="panel-subtitle">
                Select suggested edits or describe your own changes
              </div>

              <div className="suggested-edits">
                <div className="edits-label">Suggested edits:</div>
                <div className="edits-list">
                  {suggestedEdits.map((edit, index) => (
                    <button
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
                <label className="custom-edit-label">Or describe your own edit:</label>
                <textarea
                  className="custom-edit-textarea"
                  placeholder="e.g., 'Make the colors warmer' or 'Add a subtle vignette'"
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
                {isGenerating ? 'Applying...' : 'Apply Edit'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostSingleView;
