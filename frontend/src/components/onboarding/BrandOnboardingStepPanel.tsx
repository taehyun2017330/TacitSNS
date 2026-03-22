import React from 'react';

import type { BrandData } from '../../types/brand';
import type { BusinessGoalOption, PostGoalFolder } from '../../types/workspace';
import BusinessGoalSelector from './BusinessGoalSelector';
import BrandNarrativeForm from './BrandNarrativeForm';
import PostGoalSetupStep from './PostGoalSetupStep';
import type { OnboardingStep } from './brandOnboarding.config';

interface Props {
  step: OnboardingStep;
  brandData: BrandData;
  brandContext: {
    brandName: string;
    brandCategory: string;
  };
  businessGoalOptions: BusinessGoalOption[];
  selectedGoalId: string | null;
  selectedBusinessGoal: BusinessGoalOption | null;
  postGoalFolders: PostGoalFolder[];
  industryPickerOpen: boolean;
  isCustomIndustry: boolean;
  onNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onNarrativeChange: (value: string) => void;
  onToggleIndustryPicker: () => void;
  onSelectIndustry: (label: string) => void;
  onSetCustomIndustry: (nextValue: boolean) => void;
  onSelectGoal: (goal: BusinessGoalOption) => void;
  onAddCustomGoal: (goal: BusinessGoalOption) => void;
  onUpdateGoal: (goal: BusinessGoalOption) => void;
  onRemoveCustomGoal: (goalId: string) => void;
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onRemovePostGoal: (title: string) => void;
}

const BrandOnboardingStepPanel: React.FC<Props> = ({
  step,
  brandData,
  brandContext,
  businessGoalOptions,
  selectedGoalId,
  selectedBusinessGoal,
  postGoalFolders,
  industryPickerOpen,
  isCustomIndustry,
  onNameChange,
  onCategoryChange,
  onNarrativeChange,
  onToggleIndustryPicker,
  onSelectIndustry,
  onSetCustomIndustry,
  onSelectGoal,
  onAddCustomGoal,
  onUpdateGoal,
  onRemoveCustomGoal,
  onCreatePostGoal,
  onRemovePostGoal
}) => {
  if (step === 'narrative') {
    return (
      <BrandNarrativeForm
        brandData={brandData}
        brandContext={brandContext}
        industryPickerOpen={industryPickerOpen}
        isCustomIndustry={isCustomIndustry}
        onNameChange={onNameChange}
        onCategoryChange={onCategoryChange}
        onNarrativeChange={onNarrativeChange}
        onToggleIndustryPicker={onToggleIndustryPicker}
        onSelectIndustry={onSelectIndustry}
        onSetCustomIndustry={onSetCustomIndustry}
      />
    );
  }

  if (step === 'goals') {
    return (
      <div className="onboarding-step-panel">
        <BusinessGoalSelector
          options={businessGoalOptions}
          selectedGoalId={selectedGoalId}
          onSelectGoal={onSelectGoal}
          onAddCustomGoal={onAddCustomGoal}
          onUpdateGoal={onUpdateGoal}
          onRemoveCustomGoal={onRemoveCustomGoal}
        />
      </div>
    );
  }

  return (
    <div className="onboarding-step-panel">
      {selectedBusinessGoal && (
        <PostGoalSetupStep
          brand={brandData}
          businessGoal={selectedBusinessGoal}
          postGoalFolders={postGoalFolders}
          onCreatePostGoal={onCreatePostGoal}
          onRemovePostGoal={onRemovePostGoal}
        />
      )}
    </div>
  );
};

export default BrandOnboardingStepPanel;
