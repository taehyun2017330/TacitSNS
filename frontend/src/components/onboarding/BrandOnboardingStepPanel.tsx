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
    brandIdentity?: string;
  };
  businessGoalOptions: BusinessGoalOption[];
  selectedGoalId: string | null;
  selectedBusinessGoal: BusinessGoalOption | null;
  isLoadingBusinessGoals: boolean;
  businessGoalSuggestionSource: 'ai' | 'fallback';
  postGoalFolders: PostGoalFolder[];
  isCustomIndustry: boolean;
  onNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onNarrativeChange: (value: string) => void;
  onSelectIndustry: (label: string) => void;
  onSetCustomIndustry: (nextValue: boolean) => void;
  onSelectGoal: (goal: BusinessGoalOption) => void;
  onAddCustomGoal: (goal: BusinessGoalOption) => void;
  onUpdateGoal: (goal: BusinessGoalOption) => void;
  onRemoveCustomGoal: (goalId: string) => void;
  onCreatePostGoal: (folder: PostGoalFolder) => void;
  onRemovePostGoal: (folderId: string) => void;
  postGoalRefreshToken?: number;
}

const BrandOnboardingStepPanel: React.FC<Props> = ({
  step,
  brandData,
  brandContext,
  businessGoalOptions,
  selectedGoalId,
  selectedBusinessGoal,
  isLoadingBusinessGoals,
  businessGoalSuggestionSource,
  postGoalFolders,
  isCustomIndustry,
  onNameChange,
  onCategoryChange,
  onNarrativeChange,
  onSelectIndustry,
  onSetCustomIndustry,
  onSelectGoal,
  onAddCustomGoal,
  onUpdateGoal,
  onRemoveCustomGoal,
  onCreatePostGoal,
  onRemovePostGoal,
  postGoalRefreshToken = 0
}) => {
  if (step === 'narrative') {
    return (
      <BrandNarrativeForm
        brandData={brandData}
        brandContext={brandContext}
        isCustomIndustry={isCustomIndustry}
        onNameChange={onNameChange}
        onCategoryChange={onCategoryChange}
        onNarrativeChange={onNarrativeChange}
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
          isLoadingSuggestions={isLoadingBusinessGoals}
          suggestionSource={businessGoalSuggestionSource}
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
          refreshToken={postGoalRefreshToken}
          onCreatePostGoal={onCreatePostGoal}
          onRemovePostGoal={onRemovePostGoal}
        />
      )}
    </div>
  );
};

export default BrandOnboardingStepPanel;
