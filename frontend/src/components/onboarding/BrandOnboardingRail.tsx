import React from 'react';

import type { BrandData } from '../../types/brand';
import type { BusinessGoalOption, PostGoalFolder } from '../../types/workspace';
import type { OnboardingStep } from './brandOnboarding.config';

interface Props {
  currentStep: OnboardingStep;
  brandData: BrandData;
  canShowGoals: boolean;
  selectedBusinessGoal: BusinessGoalOption | null;
  postGoalFolders: PostGoalFolder[];
}

const BrandOnboardingRail: React.FC<Props> = ({
  currentStep
}) => {
  const guide = {
    narrative: {
      title: 'Shape your brand direction',
      note: <>Write a short brand narrative to give the system enough context for better suggestions and visuals. Keep it simple for now. You can revise it later.</>
    },
    goals: {
      title: 'Choose a business goal',
      note: <>Define the main reason your brand is creating social content.<br /><br />This helps the system understand what your brand wants to achieve through marketing, so it can suggest more relevant goals and directions.</>
    },
    'post-goals': {
      title: 'Select post directions',
      note: <>Choose a few directions to explore first. You can refine them once you see results.</>
    }
  }[currentStep];

  const getStepState = (step: OnboardingStep) => {
    if (currentStep === step) {
      return 'is-active';
    }
    if (
      (step === 'narrative' && (currentStep === 'goals' || currentStep === 'post-goals')) ||
      (step === 'goals' && currentStep === 'post-goals')
    ) {
      return 'is-complete';
    }
    return 'is-upcoming';
  };

  const getStepMarker = (step: OnboardingStep, index: number) =>
    getStepState(step) === 'is-complete' ? '✓' : String(index);

  return (
    <section className="brand-onboarding-intro">
      <h1>Onboarding</h1>
      <p>{guide.note}</p>
      <div className="brand-onboarding-step-list-label">Step list</div>

      <div className="brand-hierarchy-preview">
        <div className={`brand-hierarchy-step ${getStepState('narrative')}`}>
          <span>{getStepMarker('narrative', 1)}</span>
          <div>
            <div className="brand-hierarchy-step-heading">
              <strong>Brand Narrative</strong>
            </div>
          </div>
        </div>

        <div className={`brand-hierarchy-step ${getStepState('goals')}`}>
          <span>{getStepMarker('goals', 2)}</span>
          <div>
            <div className="brand-hierarchy-step-heading">
              <strong>Business Goal</strong>
            </div>
          </div>
        </div>

        <div className={`brand-hierarchy-step ${getStepState('post-goals')}`}>
          <span>{getStepMarker('post-goals', 3)}</span>
          <div>
            <div className="brand-hierarchy-step-heading">
              <strong>Post Goal</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandOnboardingRail;
