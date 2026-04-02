import React from 'react';

import BrandInfoStep from '../onboarding/BrandInfoStep';
import type { OnboardingStep } from '../onboarding/brandOnboarding.config';
import type { OnboardingResult } from '../../types/workspace';

interface Props {
  isOpen: boolean;
  initialData: OnboardingResult | null;
  initialStep?: OnboardingStep;
  onClose: () => void;
  onComplete: (result: OnboardingResult) => void;
  onStepChange?: (step: OnboardingStep) => void;
}

const WorkspaceEditModal: React.FC<Props> = ({
  isOpen,
  initialData,
  initialStep,
  onClose,
  onComplete,
  onStepChange
}) => {
  if (!isOpen || !initialData) {
    return null;
  }

  return (
    <div className="workspace-edit-modal" role="presentation">
      <div className="workspace-edit-modal__backdrop" onClick={onClose} />
      <div
        className="workspace-edit-modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="workspace-edit-modal-title"
      >
        <div className="workspace-edit-modal__chrome">
          <div className="workspace-edit-modal__header">
            <div>
              <div className="screen-eyebrow">Edit workspace setup</div>
              <h2 id="workspace-edit-modal-title">Adjust your brand, goal, and post-goal setup</h2>
            </div>
            <button type="button" className="ui-btn ui-btn--secondary" onClick={onClose}>
              Close
            </button>
          </div>

          <BrandInfoStep
            initialData={initialData}
            initialStep={initialStep}
            mode="workspace-edit"
            onCancel={onClose}
            onStepChange={onStepChange}
            onComplete={onComplete}
          />
        </div>
      </div>
    </div>
  );
};

export default WorkspaceEditModal;
