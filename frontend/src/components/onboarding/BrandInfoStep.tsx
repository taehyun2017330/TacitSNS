import React, { useEffect, useMemo, useState } from 'react';

import { ApiUnavailableError, apiFetch } from '../../config/api';
import type { BrandData } from '../../types/brand';
import type { BusinessGoalOption, OnboardingResult, PostGoalFolder } from '../../types/workspace';
import BrandOnboardingRail from './BrandOnboardingRail';
import BrandOnboardingStepPanel from './BrandOnboardingStepPanel';
import GoalRefreshDecisionCard from './GoalRefreshDecisionCard';
import { useBusinessGoalSuggestions } from './useBusinessGoalSuggestions';
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
  mode?: 'onboarding' | 'workspace-edit';
  onCancel?: () => void;
  onStepChange?: (step: OnboardingStep) => void;
}

const BrandInfoStep: React.FC<Props> = ({
  initialData = null,
  onComplete,
  initialStep,
  mode = 'onboarding',
  onCancel,
  onStepChange
}) => {
  const isWorkspaceEditMode = mode === 'workspace-edit';
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
  const [isCustomIndustry, setIsCustomIndustry] = useState(() =>
    Boolean(
      (initialData?.brand.category ?? '').trim() &&
      !INDUSTRY_CHIPS.some(option => option.label === initialData?.brand.category)
    )
  );
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [goalRefreshDecisionOpen, setGoalRefreshDecisionOpen] = useState(false);
  const [businessGoalRefreshToken, setBusinessGoalRefreshToken] = useState(0);
  const [postGoalRefreshToken, setPostGoalRefreshToken] = useState(0);

  const {
    suggestedGoals,
    isLoadingSuggestions: isLoadingBusinessGoals,
    suggestionSource: businessGoalSuggestionSource
  } = useBusinessGoalSuggestions({
    brand: brandData,
    enabled: currentStep === 'goals',
    refreshToken: businessGoalRefreshToken
  });

  const businessGoalOptions = useMemo(() => {
    const merged = [...suggestedGoals];
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
  }, [customGoalOverrides, suggestedGoals]);

  const canShowGoals = canGenerateGoals(brandData);
  const currentGoalSourceSignature = buildGoalSourceSignature(brandData);
  const selectedBusinessGoal = businessGoalOptions.find(goal => goal.id === selectedGoalId) ?? null;
  const isReadyToContinue = canContinue(brandData, selectedGoalId) && Boolean(selectedBusinessGoal) && !isLoadingBusinessGoals;
  const isReadyToFinish = isReadyToContinue && postGoalFolders.length > 0;
  const hasSavedGoalSelection = Boolean(selectedGoalId);
  const hasSavedPostGoals = postGoalFolders.length > 0;
  const hasGoalSourceChanges = currentGoalSourceSignature !== goalSourceSignature;
  const brandContext = {
    brandName: brandData.name || 'Your Brand',
    brandCategory: brandData.category || 'General',
    brandIdentity: brandData.identity || ''
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
    if (!selectedGoalId) {
      setPostGoalFolders([]);
    }
  }, [selectedGoalId]);

  useEffect(() => {
    onStepChange?.(currentStep);
  }, [currentStep, onStepChange]);

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
      setBusinessGoalRefreshToken(token => token + 1);
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
    isLoadingBusinessGoals,
    businessGoalSuggestionSource,
    postGoalFolders,
    isCustomIndustry,
    onNameChange: (value: string) => handleFieldChange('name', value),
    onCategoryChange: (value: string) => handleFieldChange('category', value),
    onNarrativeChange: handleNarrativeChange,
    onSelectIndustry: handleIndustrySelect,
    onSetCustomIndustry: setIsCustomIndustry,
    onSelectGoal: selectGoal,
    onAddCustomGoal: addCustomGoal,
    onUpdateGoal: updateGoal,
    onRemoveCustomGoal: removeCustomGoal,
    onCreatePostGoal: upsertPostGoalFolder,
    onRemovePostGoal: removePostGoalFolder,
    postGoalRefreshToken
  };

  const handleRegenerateCurrentStep = () => {
    if (currentStep === 'goals') {
      setCustomGoalOverrides([]);
      setSelectedGoalId(null);
      setPostGoalFolders([]);
      setGoalSourceSignature(currentGoalSourceSignature);
      setBusinessGoalRefreshToken(token => token + 1);
      return;
    }

    if (currentStep === 'post-goals') {
      setPostGoalFolders([]);
      setPostGoalRefreshToken(token => token + 1);
    }
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
      if (!(error instanceof ApiUnavailableError)) {
        console.error('Error creating brand:', error);
      }
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

  const footerStatus = (() => {
    if (currentStep === 'narrative') {
      if (!brandData.name.trim()) {
        return { text: 'Add a brand name', ready: false };
      }
      if (!brandData.category.trim()) {
        return { text: 'Add an industry', ready: false };
      }
      if (!brandData.description.trim()) {
        return { text: 'Write a short brand description', ready: false };
      }
      if (!canGenerateGoals(brandData)) {
        return { text: 'Add a little more detail', ready: false };
      }
      return { text: 'Ready for business goals', ready: true };
    }

    if (currentStep === 'goals') {
      return selectedGoalId
        ? { text: 'Ready for post goals', ready: true }
        : { text: isLoadingBusinessGoals ? 'Generating goals' : 'Choose one goal', ready: false };
    }

    return postGoalFolders.length > 0
      ? {
          text: `${postGoalFolders.length} post goal${postGoalFolders.length === 1 ? '' : 's'} ready`,
          ready: true
        }
      : { text: 'Add one post goal', ready: false };
  })();
  const showFooterStatus = currentStep !== 'post-goals';

  return (
    <main className={`brand-onboarding-screen${isWorkspaceEditMode ? ' brand-onboarding-screen--embedded' : ''}`}>
      <div className={`brand-onboarding-layout${isWorkspaceEditMode ? ' brand-onboarding-layout--single' : ''}`}>
        {!isWorkspaceEditMode ? (
          <BrandOnboardingRail
            currentStep={currentStep}
            brandData={brandData}
            canShowGoals={canShowGoals}
            selectedBusinessGoal={selectedBusinessGoal}
            postGoalFolders={postGoalFolders}
          />
        ) : null}

        <section className={`brand-onboarding-card${isWorkspaceEditMode ? ' brand-onboarding-card--embedded' : ''}`}>
          <h2>
            {isWorkspaceEditMode
              ? currentStep === 'narrative'
                ? 'Edit your brand narrative'
                : currentStep === 'goals'
                  ? 'Edit your business goal'
                  : 'Edit your post goals'
              : currentStep === 'narrative'
                ? 'Brand Narrative'
                : currentStep === 'goals'
                  ? 'Business Goal'
                  : 'Post Goal'}
          </h2>
          {isWorkspaceEditMode ? (
            <p className="brand-onboarding-subtitle">
              {currentStep === 'narrative'
                ? 'Refine the current draft.'
                : currentStep === 'goals'
                  ? 'Keep it or regenerate a new set.'
                  : 'Keep these or regenerate a new set.'}
            </p>
          ) : currentStep === 'narrative' ? (
            <p className="brand-onboarding-subtitle">
              Write a short description of your brand. Use the prompts below to cover the essentials.
            </p>
          ) : null}

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

            <div className={`brand-onboarding-divider${showFooterStatus ? '' : ' brand-onboarding-divider--compact'}`}>
              {showFooterStatus ? (
                <div className="brand-onboarding-status-line">
                  <span className={`brand-onboarding-status-chip${footerStatus.ready ? ' is-ready' : ''}`}>
                    {footerStatus.text}
                  </span>
                </div>
              ) : null}

              <div className="brand-onboarding-actions">
                {isWorkspaceEditMode ? (
                  <button
                    type="button"
                    className="ui-btn ui-btn--secondary"
                    onClick={onCancel}
                  >
                    Close
                  </button>
                ) : null}

                {currentStep !== 'narrative' && (
                  <button
                    type="button"
                    className="ui-btn ui-btn--secondary"
                    onClick={() => transitionStep(currentStep === 'goals' ? 'narrative' : 'goals', 'backward')}
                  >
                    Previous
                  </button>
                )}

                {currentStep !== 'narrative' && (
                  <button
                    type="button"
                    className="ui-btn ui-btn--secondary"
                    onClick={handleRegenerateCurrentStep}
                    disabled={loading}
                  >
                    Regenerate
                  </button>
                )}

                {currentStep === 'narrative' ? (
                  <button
                    type="button"
                    className="ui-btn ui-btn--primary ui-btn--hero brand-onboarding-next-btn"
                    onClick={handleReviewGoals}
                    disabled={!canGenerateGoals(brandData) || goalRefreshDecisionOpen}
                  >
                    Next: Business goal
                  </button>
                ) : currentStep === 'goals' ? (
                  <button
                    type="submit"
                    className={`ui-btn ui-btn--primary ui-btn--hero brand-onboarding-next-btn ${isReadyToContinue ? 'is-ready' : 'is-disabled'}`}
                    disabled={loading || !isReadyToContinue}
                  >
                    Next: Post goal
                  </button>
                ) : (
                  <button
                    type="submit"
                    className={`ui-btn ui-btn--primary ui-btn--hero brand-onboarding-next-btn ${isReadyToFinish ? 'is-ready' : 'is-disabled'}`}
                    disabled={loading || !isReadyToFinish}
                  >
                    {loading
                      ? (isWorkspaceEditMode ? 'Saving changes...' : 'Preparing workspace...')
                      : (isWorkspaceEditMode ? 'Return to workspace' : 'Enter workspace')}
                  </button>
                )}
              </div>
            </div>
          </form>
        </section>

        {goalRefreshDecisionOpen && (
          <GoalRefreshDecisionCard
            brandName={brandData.name}
            selectedBusinessGoalTitle={selectedBusinessGoal?.title ?? null}
            onCancel={() => setGoalRefreshDecisionOpen(false)}
            onKeepPreviousGoal={() => reviewGoalsWithExistingSelection('keep')}
            onRegenerateGoals={() => reviewGoalsWithExistingSelection('regenerate')}
          />
        )}
      </div>
    </main>
  );
};

export default BrandInfoStep;
