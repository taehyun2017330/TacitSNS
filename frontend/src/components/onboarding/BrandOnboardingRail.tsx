import React from 'react';

import type { BrandData } from '../../types/brand';
import type { BusinessGoalOption, PostGoalFolder } from '../../types/workspace';
import type { OnboardingStep } from './brandOnboarding.config';
import { summarizeNarrative } from './brandOnboarding.utils';

interface Props {
  currentStep: OnboardingStep;
  brandData: BrandData;
  canShowGoals: boolean;
  selectedBusinessGoal: BusinessGoalOption | null;
  postGoalFolders: PostGoalFolder[];
}

const BrandOnboardingRail: React.FC<Props> = ({
  currentStep,
  brandData,
  canShowGoals,
  selectedBusinessGoal,
  postGoalFolders
}) => {
  const introCopy = {
    narrative: {
      title: 'Write the brand story first.',
      paragraphs: [
        'Start with one guided brand story. Once the system understands the brand, it can suggest the business goals that matter most.',
        'You do not need perfect wording. Give enough context about who the brand serves, what makes it different, and how it should come across.'
      ]
    },
    goals: {
      title: 'Choose the bigger reason behind these posts.',
      paragraphs: [
        'These are suggested business goals for your SNS marketing effort. A business goal is the bigger reason you are posting, not the specific post yet.',
        'After this, you will choose post goals: specific kinds of posts to make under this business goal. This step is about why you are using SNS marketing right now.'
      ]
    },
    'post-goals': {
      title: 'Choose what these posts should help the brand show.',
      paragraphs: [
        'You already defined the brand and chose the business goal. This step turns that direction into concrete post directions you can explore later.',
        'Think of each post goal as one kind of image the owner might want to post. Use the suggestions as starting points, then keep the ones worth turning into folders.'
      ]
    }
  }[currentStep];

  return (
    <section className="brand-onboarding-intro">
      <div className="screen-eyebrow">Brand setup</div>
      <h1>{introCopy.title}</h1>
      {introCopy.paragraphs.map(paragraph => (
        <p key={paragraph}>{paragraph}</p>
      ))}

      <div className="brand-hierarchy-preview">
        <div className={`brand-hierarchy-step ${currentStep === 'narrative' ? 'is-active' : 'is-complete'}`}>
          <span>1</span>
          <div>
            <div className="brand-hierarchy-step-heading">
              <strong>Brand narrative</strong>
              {currentStep === 'narrative' ? <em>Current</em> : null}
            </div>
            <p>Say what the brand is, who it serves, and how it should feel.</p>
            {currentStep !== 'narrative' && canShowGoals && (
              <div className="brand-hierarchy-step-summary">
                <div className="brand-hierarchy-summary-teaser">
                  <strong>{brandData.name || 'Your brand'}</strong>
                  <span>{brandData.category || 'Industry'}</span>
                </div>
                <div className="brand-hierarchy-summary-detail">
                  <div className="brand-hierarchy-summary-copy">
                    {brandData.description || summarizeNarrative('', 135)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`brand-hierarchy-step ${currentStep === 'goals' ? 'is-active' : currentStep === 'post-goals' ? 'is-complete' : 'is-upcoming'}`}>
          <span>2</span>
          <div>
            <div className="brand-hierarchy-step-heading">
              <strong>Business goals</strong>
              {currentStep === 'goals' ? <em>Current</em> : null}
            </div>
            <p>Pick the broader outcome these posts should help achieve.</p>
            {currentStep === 'post-goals' && selectedBusinessGoal && (
              <div className="brand-hierarchy-step-summary">
                <div className="brand-hierarchy-summary-teaser brand-hierarchy-summary-teaser--single">
                  <strong>{selectedBusinessGoal.title}</strong>
                </div>
                <div className="brand-hierarchy-summary-detail">
                  <div className="brand-hierarchy-summary-copy brand-hierarchy-summary-copy--compact">
                    <div>{selectedBusinessGoal.description}</div>
                    <div><strong>Why this fits:</strong> {selectedBusinessGoal.rationale}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={`brand-hierarchy-step ${currentStep === 'post-goals' ? 'is-active' : 'is-upcoming'}`}>
          <span>3</span>
          <div>
            <div className="brand-hierarchy-step-heading">
              <strong>Post goals</strong>
              {currentStep === 'post-goals' ? <em>Current</em> : null}
            </div>
            <p>Turn that direction into specific kinds of image posts to explore.</p>
            {selectedBusinessGoal && postGoalFolders.length > 0 && (
              <div className="brand-hierarchy-step-summary">
                <div className="brand-hierarchy-summary-teaser brand-hierarchy-summary-teaser--single">
                  <strong>
                    {`${postGoalFolders.length} post goal${postGoalFolders.length === 1 ? '' : 's'} selected`}
                  </strong>
                </div>
                <div className="brand-hierarchy-summary-detail">
                  <div className="brand-hierarchy-summary-list">
                    {postGoalFolders.slice(0, 3).map(folder => (
                      <div key={folder.id} className="brand-hierarchy-summary-list-item">{folder.title}</div>
                    ))}
                    {postGoalFolders.length > 3 && (
                      <div className="brand-hierarchy-summary-list-item brand-hierarchy-summary-list-item--muted">
                        +{postGoalFolders.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandOnboardingRail;
