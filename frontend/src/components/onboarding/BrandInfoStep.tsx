import React, { useEffect, useMemo, useState } from 'react';

import { inferBusinessGoalOptions } from '../../data/goalHierarchy';
import { apiFetch } from '../../config/api';
import type { BrandData } from '../../types/brand';
import type { BusinessGoalOption, OnboardingResult, PostGoalFolder } from '../../types/workspace';
import BrandOnboardingRail from './BrandOnboardingRail';
import BrandOnboardingStepPanel from './BrandOnboardingStepPanel';
import GoalRefreshDecisionCard from './GoalRefreshDecisionCard';
import { INDUSTRY_CHIPS, INITIAL_BRAND_DATA } from './brandOnboarding.config';
import type { OnboardingStep } from './brandOnboarding.config';
import {
  buildGoalSourceSignature,
  canContinue,
  canGenerateGoals,
  deriveIdentityFromNarrative
} from './brandOnboarding.utils';

interface Props {
  initialData?: OnboardingResult | null;
  onComplete: (result: OnboardingResult) => void;
  initialStep?: OnboardingStep;
}

const BrandInfoStep: React.FC<Props> = ({
  initialData = null,
  onComplete,
  initialStep
}) => {
  const [brandData, setBrandData] = useState<BrandData>(() => initialData?.brand ?? INITIAL_BRAND_DATA);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(
    () => initialData?.selectedBusinessGoals[0]?.id ?? null
  );
  const [customGoalOverrides, setCustomGoalOverrides] = useState<BusinessGoalOption[]>(() =>
    initialData?.selectedBusinessGoals.filter(goal => goal.isCustom || goal.normalizedFrom) ?? []
  );
  const [currentStep, setCurrentStep] = useState<OnboardingStep>(() => {
    if (initialStep) {
      return initialStep;
    }

    if ((initialData?.postGoalFolders.length ?? 0) > 0) {
      return 'post-goals';
    }

    return (initialData?.selectedBusinessGoals.length ?? 0) > 0 ? 'goals' : 'narrative';
  });
  const [stepTransition, setStepTransition] = useState<{
    exiting: OnboardingStep;
    entering: OnboardingStep;
    direction: 'forward' | 'backward';
  } | null>(null);
  const [goalSourceSignature, setGoalSourceSignature] = useState<string>(() =>
    initialData?.brand ? buildGoalSourceSignature(initialData.brand) : ''
  );
  const [postGoalFolders, setPostGoalFolders] = useState<PostGoalFolder[]>(
    () => initialData?.postGoalFolders ?? []
  );
  const [industryPickerOpen, setIndustryPickerOpen] = useState(false);
  const [isCustomIndustry, setIsCustomIndustry] = useState(() =>
    Boolean(
      (initialData?.brand.category ?? '').trim() &&
      !INDUSTRY_CHIPS.some(option => option.label === initialData?.brand.category)
    )
  );
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [goalRefreshDecisionOpen, setGoalRefreshDecisionOpen] = useState(false);

  const inferredGoals = useMemo(
    () => inferBusinessGoalOptions(brandData),
    [brandData]
  );
  const businessGoalOptions = useMemo(() => {
    const merged = [...inferredGoals];
    customGoalOverrides.forEach(customGoal => {
      const existingIndex = merged.findIndex(goal => goal.id === customGoal.id);
      if (existingIndex >= 0) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...customGoal,
          isRecommended: merged[existingIndex].isRecommended,
          rank: merged[existingIndex].rank
        };
      } else {
        merged.unshift(customGoal);
      }
    });
    return merged;
  }, [customGoalOverrides, inferredGoals]);

  const isReadyToContinue = canContinue(brandData, selectedGoalId);
  const isReadyToFinish = isReadyToContinue && postGoalFolders.length > 0;
  const canShowGoals = canGenerateGoals(brandData);
  const currentGoalSourceSignature = buildGoalSourceSignature(brandData);
  const selectedBusinessGoal = businessGoalOptions.find(goal => goal.id === selectedGoalId) ?? null;
  const hasSavedGoalSelection = Boolean(selectedGoalId);
  const hasSavedPostGoals = postGoalFolders.length > 0;
  const hasGoalSourceChanges = currentGoalSourceSignature !== goalSourceSignature;
  const brandContext = {
    brandName: brandData.name || 'Your Brand',
    brandCategory: brandData.category || 'General'
  };

  const handleFieldChange = <Key extends keyof BrandData>(field: Key, value: BrandData[Key]) => {
    setBrandData(prev => ({ ...prev, [field]: value }));
  };

  const upsertPostGoalFolder = (folder: PostGoalFolder) => {
    setPostGoalFolders(prev => [folder, ...prev.filter(existing => existing.title !== folder.title)]);
  };

  const removePostGoalFolder = (title: string) => {
    setPostGoalFolders(prev => prev.filter(existing => existing.title !== title));
  };

  useEffect(() => {
    if (!canShowGoals) {
      setCurrentStep('narrative');
    }
  }, [canShowGoals]);

  useEffect(() => {
    if (initialStep === 'narrative') {
      setCurrentStep('narrative');
    }
  }, [initialStep]);

  useEffect(() => {
    if (currentStep !== 'narrative') {
      setIndustryPickerOpen(false);
    }
  }, [currentStep]);

  useEffect(() => {
    if (!selectedGoalId) {
      setPostGoalFolders([]);
    }
  }, [selectedGoalId]);

  const transitionStep = (nextStep: OnboardingStep, direction: 'forward' | 'backward') => {
    if (nextStep === currentStep) {
      return;
    }

    setStepTransition({
      exiting: currentStep,
      entering: nextStep,
      direction
    });
    setCurrentStep(nextStep);

    window.setTimeout(() => {
      setStepTransition(prev =>
        prev?.entering === nextStep ? null : prev
      );
    }, 360);
  };

  const reviewGoalsWithExistingSelection = (mode: 'keep' | 'regenerate') => {
    if (mode === 'regenerate') {
      setCustomGoalOverrides([]);
      setSelectedGoalId(null);
      setPostGoalFolders([]);
      setGoalSourceSignature(currentGoalSourceSignature);
      setGoalRefreshDecisionOpen(false);
      transitionStep('goals', 'forward');
      return;
    }

    setGoalSourceSignature(currentGoalSourceSignature);
    setGoalRefreshDecisionOpen(false);
    transitionStep(selectedGoalId ? 'post-goals' : 'goals', 'forward');
  };

  const handleReviewGoals = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (hasSavedGoalSelection && hasGoalSourceChanges) {
      setGoalRefreshDecisionOpen(true);
      return;
    }

    if (currentGoalSourceSignature !== goalSourceSignature) {
      setCustomGoalOverrides([]);
      setSelectedGoalId(null);
      setPostGoalFolders([]);
      setGoalSourceSignature(currentGoalSourceSignature);
    }

    transitionStep('goals', 'forward');
  };

  const selectGoal = (goal: BusinessGoalOption) => {
    setPostGoalFolders([]);
    setSelectedGoalId(prev => (prev === goal.id ? null : goal.id));
  };

  const addCustomGoal = (goal: BusinessGoalOption) => {
    setPostGoalFolders([]);
    setCustomGoalOverrides(prev => {
      const existingIndex = prev.findIndex(existingGoal => existingGoal.id === goal.id);
      if (existingIndex >= 0) {
        return prev.map(existingGoal => (existingGoal.id === goal.id ? goal : existingGoal));
      }

      return [...prev, goal];
    });
    setSelectedGoalId(goal.id);
  };

  const updateGoal = (goal: BusinessGoalOption) => {
    setCustomGoalOverrides(prev => {
      const existingIndex = prev.findIndex(existingGoal => existingGoal.id === goal.id);
      if (existingIndex >= 0) {
        return prev.map(existingGoal => (existingGoal.id === goal.id ? goal : existingGoal));
      }

      return [...prev, goal];
    });

    if (selectedGoalId === goal.id) {
      setPostGoalFolders([]);
    }
  };

  const removeCustomGoal = (goalId: string) => {
    setCustomGoalOverrides(prev => prev.filter(existingGoal => existingGoal.id !== goalId));
    if (selectedGoalId === goalId) {
      setSelectedGoalId(null);
      setPostGoalFolders([]);
    }
  };

  const handleIndustrySelect = (label: string) => {
    handleFieldChange('category', label);
    setIsCustomIndustry(false);
    setIndustryPickerOpen(false);
  };

  const handleNarrativeChange = (text: string) => {
    setBrandData(prev => ({
      ...prev,
      description: text,
      identity: deriveIdentityFromNarrative(text)
    }));
  };

  const stepPanelProps = {
    brandData,
    brandContext,
    businessGoalOptions,
    selectedGoalId,
    selectedBusinessGoal,
    postGoalFolders,
    industryPickerOpen,
    isCustomIndustry,
    onNameChange: (value: string) => handleFieldChange('name', value),
    onCategoryChange: (value: string) => handleFieldChange('category', value),
    onNarrativeChange: handleNarrativeChange,
    onToggleIndustryPicker: () => setIndustryPickerOpen(open => !open),
    onSelectIndustry: handleIndustrySelect,
    onSetCustomIndustry: setIsCustomIndustry,
    onSelectGoal: selectGoal,
    onAddCustomGoal: addCustomGoal,
    onUpdateGoal: updateGoal,
    onRemoveCustomGoal: removeCustomGoal,
    onCreatePostGoal: upsertPostGoalFolder,
    onRemovePostGoal: removePostGoalFolder
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (currentStep === 'narrative') {
      if (canShowGoals) {
        transitionStep('goals', 'forward');
      }
      return;
    }

    if (currentStep === 'goals') {
      if (isReadyToContinue) {
        transitionStep('post-goals', 'forward');
      }
      return;
    }

    if (!isReadyToFinish) {
      return;
    }

    setLoading(true);
    setSubmitError('');

    const selectedBusinessGoals = businessGoalOptions.filter(goal => goal.id === selectedGoalId);

    try {
      const response = await apiFetch('/brand/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create brand: ${response.status}`);
      }

      const data = await response.json();
      onComplete({
        brand: {
          ...brandData,
          ...data.brand
        },
        selectedBusinessGoals,
        activeBusinessGoalId: selectedBusinessGoals[0]?.id ?? businessGoalOptions[0]?.id ?? 'trust',
        postGoalFolders
      });
    } catch (error) {
      console.error('Error creating brand:', error);
      setSubmitError(
        'The backend is not reachable, so the prototype is continuing with your local brand profile. Start `python main_simple.py` in `backend` when you want live generation.'
      );
      onComplete({
        brand: brandData,
        selectedBusinessGoals,
        activeBusinessGoalId: selectedBusinessGoals[0]?.id ?? businessGoalOptions[0]?.id ?? 'trust',
        postGoalFolders
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="brand-onboarding-screen">
      <div className="brand-onboarding-layout">
        <BrandOnboardingRail
          currentStep={currentStep}
          brandData={brandData}
          canShowGoals={canShowGoals}
          selectedBusinessGoal={selectedBusinessGoal}
          postGoalFolders={postGoalFolders}
        />

        <section className="brand-onboarding-card">
          <div className="screen-eyebrow">Onboarding</div>
          <h2>
            {currentStep === 'narrative'
              ? 'Tell the system who this brand is.'
              : currentStep === 'goals'
                ? 'Review the suggested business goals.'
                : 'Choose the post goals you want to start with.'}
          </h2>
          <p className="brand-onboarding-subtitle">
            {currentStep === 'narrative'
              ? 'Use one guided field. Then move into business goals.'
              : currentStep === 'goals'
                ? 'What is the main reason for your business to use SNS marketing right now?'
                : 'Turn the business goal into concrete post directions before entering the workspace.'}
          </p>

          {submitError && <div className="brand-onboarding-error">{submitError}</div>}

          <form onSubmit={handleSubmit} className="brand-onboarding-form">
            <div className="onboarding-step-shell">
              {stepTransition && (
                <div className={`onboarding-step-layer onboarding-step-layer--exit onboarding-step-layer--${stepTransition.direction}`}>
                  <BrandOnboardingStepPanel step={stepTransition.exiting} {...stepPanelProps} />
                </div>
              )}

              <div className={`onboarding-step-layer ${stepTransition ? `onboarding-step-layer--enter onboarding-step-layer--${stepTransition.direction}` : 'onboarding-step-layer--static'}`}>
                <BrandOnboardingStepPanel step={currentStep} {...stepPanelProps} />
              </div>
            </div>

            <div className="brand-onboarding-divider">
              <div className="brand-onboarding-requirements">
                {goalRefreshDecisionOpen && (
                  <GoalRefreshDecisionCard
                    brandName={brandData.name}
                    selectedBusinessGoalTitle={selectedBusinessGoal?.title ?? null}
                    onCancel={() => setGoalRefreshDecisionOpen(false)}
                    onKeepPreviousGoal={() => reviewGoalsWithExistingSelection('keep')}
                    onRegenerateGoals={() => reviewGoalsWithExistingSelection('regenerate')}
                  />
                )}
                {currentStep === 'narrative' && !brandData.name.trim() && <span>Brand name required</span>}
                {currentStep === 'narrative' && brandData.name.trim() && !brandData.category.trim() && <span>Industry required</span>}
                {currentStep === 'narrative' && brandData.name.trim() && brandData.category.trim() && brandData.description.trim().length <= 36 && (
                  <span>Add a little more detail so the business goal can be inferred well</span>
                )}
                {currentStep === 'narrative' && canGenerateGoals(brandData) && (
                  <span className="is-ready">Ready to review suggested business goals</span>
                )}
                {currentStep === 'goals' && !selectedGoalId && (
                  <span>Choose one business goal for this SNS marketing effort</span>
                )}
                {currentStep === 'goals' && isReadyToContinue && (
                  <span className="is-ready">Ready to move into post goals</span>
                )}
                {currentStep === 'post-goals' && postGoalFolders.length === 0 && (
                  <span>Add at least one post goal to create the first workspace directory</span>
                )}
                {currentStep === 'post-goals' && isReadyToFinish && (
                  <span className="is-ready">Ready to enter the workspace directory</span>
                )}
              </div>

              <div className="brand-onboarding-actions">
                {currentStep !== 'narrative' && (
                  <button
                    type="button"
                    className="ui-btn ui-btn--secondary"
                    onClick={() => transitionStep(currentStep === 'goals' ? 'narrative' : 'goals', 'backward')}
                  >
                    Previous
                  </button>
                )}

                {currentStep === 'narrative' ? (
                  <button
                    type="button"
                    className="ui-btn ui-btn--primary ui-btn--hero brand-onboarding-next-btn"
                    onClick={handleReviewGoals}
                    disabled={!canGenerateGoals(brandData) || goalRefreshDecisionOpen}
                  >
                    Review suggested business goals
                  </button>
                ) : currentStep === 'goals' ? (
                  <button
                    type="submit"
                    className={`ui-btn ui-btn--primary ui-btn--hero brand-onboarding-next-btn ${isReadyToContinue ? 'is-ready' : 'is-disabled'}`}
                    disabled={loading || !isReadyToContinue}
                  >
                    Continue to post goals
                  </button>
                ) : (
                  <button
                    type="submit"
                    className={`ui-btn ui-btn--primary ui-btn--hero brand-onboarding-next-btn ${isReadyToFinish ? 'is-ready' : 'is-disabled'}`}
                    disabled={loading || !isReadyToFinish}
                  >
                    {loading ? 'Preparing workspace...' : 'Enter workspace'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
};

export default BrandInfoStep;
