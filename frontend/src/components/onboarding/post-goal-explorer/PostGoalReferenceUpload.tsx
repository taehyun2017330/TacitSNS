import React, { useId, useState } from 'react';

import type { PostGoalReferenceAsset } from '../../../types/workspace';
import { createReferenceAssetFromFile } from './postGoalExplorer.utils';

interface Props {
  referenceAssets: PostGoalReferenceAsset[];
  onChange: (assets: PostGoalReferenceAsset[]) => void;
}

const PostGoalReferenceUpload: React.FC<Props> = ({ referenceAssets, onChange }) => {
  const inputId = useId();
  const [error, setError] = useState('');

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const asset = await createReferenceAssetFromFile(file);
      onChange([asset]);
      setError('');
    } catch (uploadError: any) {
      setError(uploadError?.message || 'Failed to load image');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="post-goal-reference-upload">
      <div className="goal-dialog-field">
        <span>Reference image</span>
        <label htmlFor={inputId} className="post-goal-reference-trigger">
          <span>Upload an example image</span>
          <small>This can later guide the visual direction for this post goal.</small>
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/*"
          className="post-goal-reference-input"
          onChange={handleFileChange}
        />
      </div>

      {referenceAssets.length > 0 && (
        <div className="post-goal-reference-preview-list">
          {referenceAssets.map(asset => (
            <div key={asset.id} className="post-goal-reference-preview">
              <img src={asset.dataUrl} alt={asset.name} />
              <div className="post-goal-reference-meta">
                <strong>{asset.name}</strong>
                <button
                  type="button"
                  className="ui-btn ui-btn--secondary"
                  onClick={() => onChange([])}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <div className="brand-onboarding-error">{error}</div>}
    </div>
  );
};

export default PostGoalReferenceUpload;
