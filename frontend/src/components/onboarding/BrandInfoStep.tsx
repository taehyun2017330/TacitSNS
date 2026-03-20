import React, { useEffect, useMemo, useState } from 'react';

import { inferBusinessGoalOptions } from '../../data/goalHierarchy';
import { apiFetch } from '../../config/api';
import type { BrandData } from '../../types/brand';
import type { BusinessGoalOption, OnboardingResult } from '../../types/workspace';
import BrandAutocomplete from '../BrandAutocomplete';
import BusinessGoalSelector from './BusinessGoalSelector';

const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'beauty', label: 'Beauty & Cosmetics' },
  { value: 'home', label: 'Home & Lifestyle' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' }
] as const;

const INITIAL_BRAND_DATA: BrandData = {
  name: '',
  category: '',
  identity: '',
  description: '',
  style: 'modern',
  colors: [],
  keywords: []
};

interface Props {
  initialData?: OnboardingResult | null;
  onComplete: (result: OnboardingResult) => void;
  initialStep?: OnboardingStep;
}

type OnboardingStep = 'narrative' | 'goals';

function deriveIdentityFromNarrative(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  const [firstSentence] = trimmed.split(/(?<=[.!?])\s+/);
  return (firstSentence || trimmed).trim();
}

function buildGoalSourceSignature(brandData: BrandData) {
  return [
    brandData.name.trim(),
    brandData.category.trim(),
    brandData.identity.trim(),
    brandData.description.trim()
  ].join('||');
}

function canGenerateGoals(brandData: BrandData) {
  return Boolean(
    brandData.name.trim() &&
      brandData.category.trim() &&
      brandData.description.trim().length > 36
  );
}

function canContinue(brandData: BrandData, selectedGoalId: string | null) {
  return canGenerateGoals(brandData) && Boolean(selectedGoalId);
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
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

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
  const canShowGoals = canGenerateGoals(brandData);
  const currentGoalSourceSignature = buildGoalSourceSignature(brandData);
  const brandContext = {
    brandName: brandData.name || 'Your Brand',
    brandCategory: brandData.category || 'General'
  };

  const handleFieldChange = <Key extends keyof BrandData>(field: Key, value: BrandData[Key]) => {
    setBrandData(prev => ({ ...prev, [field]: value }));
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

  const handleReviewGoals = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    if (currentGoalSourceSignature !== goalSourceSignature) {
      setCustomGoalOverrides([]);
      setSelectedGoalId(null);
      setGoalSourceSignature(currentGoalSourceSignature);
    }

    transitionStep('goals', 'forward');
  };

  const selectGoal = (goal: BusinessGoalOption) => {
    setSelectedGoalId(prev => (prev === goal.id ? null : goal.id));
  };

  const addCustomGoal = (goal: BusinessGoalOption) => {
    setCustomGoalOverrides(prev => {
      const filtered = prev.filter(existingGoal => existingGoal.id !== goal.id);
      return [goal, ...filtered];
    });
    setSelectedGoalId(goal.id);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (currentStep !== 'goals') {
      if (canShowGoals) {
        transitionStep('goals', 'forward');
      }
      return;
    }

    if (!isReadyToContinue) {
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
        activeBusinessGoalId: selectedBusinessGoals[0]?.id ?? businessGoalOptions[0]?.id ?? 'trust'
      });
    } catch (error) {
      console.error('Error creating brand:', error);
      setSubmitError(
        'The backend is not reachable, so the prototype is continuing with your local brand profile. Start `python main_simple.py` in `backend` when you want live generation.'
      );
      onComplete({
        brand: brandData,
        selectedBusinessGoals,
        activeBusinessGoalId: selectedBusinessGoals[0]?.id ?? businessGoalOptions[0]?.id ?? 'trust'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="brand-onboarding-screen">
      <div className="brand-onboarding-layout">
        <section className="brand-onboarding-intro">
          <div className="screen-eyebrow">Brand setup</div>
          <h1>
            {currentStep === 'narrative'
              ? 'Write the brand story first.'
              : 'Choose the bigger reason behind these posts.'}
          </h1>
          <p>
            {currentStep === 'narrative'
              ? 'Start with one guided brand story. Once the system understands the brand, it can suggest the business goals that matter most.'
              : 'These are suggested business goals for your SNS marketing effort. A business goal is the bigger reason you are posting, not the specific post yet.'}
          </p>
          <p>
            {currentStep === 'narrative'
              ? 'You do not need perfect wording. Give enough context about who the brand serves, what makes it different, and how it should come across.'
              : 'After this, you will choose post goals: specific kinds of posts to make under this business goal. This step is about why you are using SNS marketing right now.'}
          </p>

          {currentStep === 'goals' && (
            <div className="brand-context-card">
              <div className="brand-context-row">
                <span>{brandData.name || 'Your brand'}</span>
                <span>{brandData.category || 'Industry'}</span>
              </div>
              <p>{brandData.description || 'Add a fuller brand story to help the system interpret your intent.'}</p>
            </div>
          )}

          <div className="brand-hierarchy-preview">
            <div className={`brand-hierarchy-step ${currentStep === 'narrative' ? 'is-active' : 'is-complete'}`}>
              <span>1</span>
              <div>
                <strong>Brand narrative</strong>
                <p>Say what the brand is, who it serves, and how it should feel.</p>
              </div>
            </div>
            <div className={`brand-hierarchy-step ${currentStep === 'goals' ? 'is-active' : 'is-upcoming'}`}>
              <span>2</span>
              <div>
                <strong>Business goals</strong>
                <p>Pick the broader outcome these posts should help achieve.</p>
              </div>
            </div>
            <div className="brand-hierarchy-step is-upcoming">
              <span>3</span>
              <div>
                <strong>Post goals</strong>
                <p>Turn that direction into specific kinds of image posts to explore.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="brand-onboarding-card">
          <div className="screen-eyebrow">Onboarding</div>
          <h2>
            {currentStep === 'narrative' ? 'Tell the system who this brand is.' : 'Review the suggested business goals.'}
          </h2>
          <p className="brand-onboarding-subtitle">
            {currentStep === 'narrative'
              ? 'Use one guided field. Then move into business goals.'
              : 'Choose the outcomes this system should optimize for next.'}
          </p>

          {submitError && <div className="brand-onboarding-error">{submitError}</div>}

          <form onSubmit={handleSubmit} className="brand-onboarding-form">
            <div className="onboarding-step-shell">
              {stepTransition && (
                <div className={`onboarding-step-layer onboarding-step-layer--exit onboarding-step-layer--${stepTransition.direction}`}>
                  {stepTransition.exiting === 'narrative' ? (
                    <div className="onboarding-step-panel">
                      <div className="brand-onboarding-grid">
                        <label className="brand-onboarding-block">
                          <span>Brand name</span>
                          <input
                            type="text"
                            className="brand-onboarding-field"
                            value={brandData.name}
                            onChange={event => handleFieldChange('name', event.target.value)}
                            placeholder="e.g., Aster Vale"
                          />
                        </label>

                        <label className="brand-onboarding-block">
                          <span>Industry</span>
                          <select
                            className="brand-onboarding-field"
                            value={brandData.category}
                            onChange={event => handleFieldChange('category', event.target.value)}
                          >
                            <option value="">Select an industry</option>
                            {INDUSTRY_OPTIONS.map(option => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="brand-onboarding-block">
                        <span>Brand identity and positioning</span>
                        <div className="brand-onboarding-tip">
                          <p>Cover the essentials:</p>
                          <ul>
                            <li>what the brand is</li>
                            <li>who it serves</li>
                            <li>what makes it different</li>
                            <li>how it should come across</li>
                          </ul>
                        </div>
                        <BrandAutocomplete
                          brandContext={brandContext}
                          value={brandData.description}
                          onChange={text => {
                            setBrandData(prev => ({
                              ...prev,
                              description: text,
                              identity: deriveIdentityFromNarrative(text)
                            }));
                          }}
                          showHeader={false}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="onboarding-step-panel">
                      <BusinessGoalSelector
                        options={businessGoalOptions}
                        selectedGoalId={selectedGoalId}
                        onSelectGoal={selectGoal}
                        onAddCustomGoal={addCustomGoal}
                      />
                    </div>
                  )}
                </div>
              )}

              <div className={`onboarding-step-layer ${stepTransition ? `onboarding-step-layer--enter onboarding-step-layer--${stepTransition.direction}` : 'onboarding-step-layer--static'}`}>
                {currentStep === 'narrative' ? (
                  <div className="onboarding-step-panel">
                    <div className="brand-onboarding-grid">
                      <label className="brand-onboarding-block">
                        <span>Brand name</span>
                        <input
                          type="text"
                          className="brand-onboarding-field"
                          value={brandData.name}
                          onChange={event => handleFieldChange('name', event.target.value)}
                          placeholder="e.g., Aster Vale"
                        />
                      </label>

                      <label className="brand-onboarding-block">
                        <span>Industry</span>
                        <select
                          className="brand-onboarding-field"
                          value={brandData.category}
                          onChange={event => handleFieldChange('category', event.target.value)}
                        >
                          <option value="">Select an industry</option>
                          {INDUSTRY_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <div className="brand-onboarding-block">
                      <span>Brand identity and positioning</span>
                      <div className="brand-onboarding-tip">
                        <p>Cover the essentials:</p>
                        <ul>
                          <li>what the brand is</li>
                          <li>who it serves</li>
                          <li>what makes it different</li>
                          <li>how it should come across</li>
                        </ul>
                      </div>
                      <BrandAutocomplete
                        brandContext={brandContext}
                        value={brandData.description}
                        onChange={text => {
                          setBrandData(prev => ({
                            ...prev,
                            description: text,
                            identity: deriveIdentityFromNarrative(text)
                          }));
                        }}
                        showHeader={false}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="onboarding-step-panel">
                    <BusinessGoalSelector
                      options={businessGoalOptions}
                      selectedGoalId={selectedGoalId}
                      onSelectGoal={selectGoal}
                      onAddCustomGoal={addCustomGoal}
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="brand-onboarding-divider">
              <div className="brand-onboarding-requirements">
                {!brandData.name.trim() && <span>Brand name required</span>}
                {brandData.name.trim() && !brandData.category.trim() && <span>Industry required</span>}
                {brandData.name.trim() && brandData.category.trim() && brandData.description.trim().length <= 36 && (
                  <span>Add a little more detail so the business goal can be inferred well</span>
                )}
                {currentStep === 'narrative' && canGenerateGoals(brandData) && (
                  <span>Ready to review the suggested business goal</span>
                )}
                {currentStep === 'goals' && !selectedGoalId && (
                  <span>Choose one business goal for this SNS marketing effort</span>
                )}
                {currentStep === 'goals' && isReadyToContinue && <span className="is-ready">Ready to move into post-goal setup</span>}
              </div>

              <div className="brand-onboarding-actions">
                {currentStep === 'goals' && (
                  <button
                    type="button"
                    className="ui-btn ui-btn--secondary"
                    onClick={() => transitionStep('narrative', 'backward')}
                  >
                    Previous
                  </button>
                )}

                {currentStep === 'narrative' ? (
                  <button
                    type="button"
                    className="ui-btn ui-btn--primary ui-btn--hero brand-onboarding-next-btn"
                    onClick={handleReviewGoals}
                    disabled={!canGenerateGoals(brandData)}
                  >
                    Review suggested business goals
                  </button>
                ) : (
                  <button
                    type="submit"
                    className={`ui-btn ui-btn--primary ui-btn--hero brand-onboarding-next-btn ${isReadyToContinue ? 'is-ready' : 'is-disabled'}`}
                    disabled={loading || !isReadyToContinue}
                  >
                    {loading ? 'Preparing post goals...' : 'Continue to post-goal selection'}
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
