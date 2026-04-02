import React from 'react';

import PostGoalSetupStep from '../onboarding/PostGoalSetupStep';
import type { BrandData } from '../../types/brand';
import type { BusinessGoalOption, PostGoalFolder } from '../../types/workspace';

interface Props {
  isOpen: boolean;
  brand: BrandData;
  activeBusinessGoal: BusinessGoalOption | null;
  postGoalFolders: PostGoalFolder[];
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onRemovePostGoal: (folderId: string) => void;
  onClose: () => void;
}

const WorkspacePostGoalChooserModal: React.FC<Props> = ({
  isOpen,
  brand,
  activeBusinessGoal,
  postGoalFolders,
  onCreatePostGoal,
  onRemovePostGoal,
  onClose
}) => {
  if (!isOpen || !activeBusinessGoal) {
    return null;
  }

  return (
    <div className="goal-dialog-backdrop workspace-hub-chooser-backdrop" onClick={onClose}>
      <div className="goal-dialog workspace-hub-chooser-dialog" onClick={event => event.stopPropagation()}>
        <div className="workspace-hub-chooser-header">
          <div>
            <div className="screen-eyebrow">Add a post goal</div>
            <h3>Choose another direction</h3>
            <p>We are generating a fresh set of suggestions from your current business goal before you add one.</p>
          </div>
          <button
            type="button"
            className="ui-btn ui-btn--secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <PostGoalSetupStep
          brand={brand}
          businessGoal={activeBusinessGoal}
          postGoalFolders={postGoalFolders}
          onCreatePostGoal={onCreatePostGoal}
          onRemovePostGoal={onRemovePostGoal}
          showSelectionTray={false}
        />
      </div>
    </div>
  );
};

export default WorkspacePostGoalChooserModal;
