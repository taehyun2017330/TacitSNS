import React from 'react';

export type JourneyStepKey =
  | 'intro'
  | 'narrative'
  | 'business-goal'
  | 'post-goal'
  | 'dashboard'
  | 'image-generation'
  | 'image-post';

interface JourneyStepDefinition {
  key: JourneyStepKey;
  label: string;
  phaseLabel: string;
  icon: React.ReactNode;
}

interface Props {
  activeStep: JourneyStepKey;
}

const NarrativeIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M7.1 17.1V8.4A1.9 1.9 0 0 1 9 6.5h6.2"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M9.2 15.6 16 8.8l1.7 1.7-6.8 6.8-2.6.7z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="M13.2 6.5h4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const BusinessGoalIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="6.8" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <circle cx="12" cy="12" r="2.1" fill="currentColor" />
    <path
      d="M12 5.2V3.8M12 20.2v-1.4M18.8 12h1.4M3.8 12h1.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
    />
  </svg>
);

const PostGoalIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M7 7.4h10M7 11.9h6.4M7 16.4h10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="M14.6 10.5 17.8 13.7 14.6 16.9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const DashboardIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5.9" y="6.1" width="5" height="5" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <rect x="13.1" y="6.1" width="5" height="8.1" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <rect x="5.9" y="13" width="5" height="4.9" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path d="M14.4 17.1h2.9" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const ImageGenerationIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M12 5.7v3.1M12 15.2v3.1M5.7 12h3.1M15.2 12h3.1"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path
      d="m12 7.6 1.6 2.8 3 .6-2.1 2.2.4 3.1-2.9-1.4-2.9 1.4.4-3.1-2.1-2.2 3-.6Z"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinejoin="round"
    />
  </svg>
);

const ImagePostIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="5.8" y="6.2" width="12.4" height="10.8" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.6" />
    <path
      d="M8.2 14.4 10.8 11.9l2 1.9 1.8-1.9 1.7 2.4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="9.6" cy="9.9" r="1.05" fill="currentColor" />
    <path d="M7.2 19h9.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const JOURNEY_STEPS: JourneyStepDefinition[] = [
  { key: 'narrative', label: 'Brand Narrative', phaseLabel: 'Brand Narrative', icon: <NarrativeIcon /> },
  { key: 'business-goal', label: 'Business Goal', phaseLabel: 'Business Goal', icon: <BusinessGoalIcon /> },
  { key: 'post-goal', label: 'Post Goal', phaseLabel: 'Post Goal', icon: <PostGoalIcon /> },
  { key: 'dashboard', label: 'Dashboard', phaseLabel: 'Workspace', icon: <DashboardIcon /> },
  { key: 'image-generation', label: 'Image creation', phaseLabel: 'Image creation', icon: <ImageGenerationIcon /> },
  { key: 'image-post', label: 'Image post', phaseLabel: 'Post refinement', icon: <ImagePostIcon /> }
];

const AppJourneyProgress: React.FC<Props> = ({ activeStep }) => {
  const activeIndex = JOURNEY_STEPS.findIndex(step => step.key === activeStep);

  return (
    <div className="journey-progress-shell">
      <div className="journey-progress">
        <div className="journey-progress-scroll">
          <div
            className="journey-progress-track"
            aria-label="Prototype journey progress"
            style={{ ['--journey-step-count' as const]: JOURNEY_STEPS.length }}
          >
            <div className="journey-progress-line" aria-hidden="true" />

            {JOURNEY_STEPS.map((step, index) => {
              const status =
                index < activeIndex ? 'complete' : index === activeIndex ? 'current' : 'upcoming';

              return (
                <div
                  key={step.key}
                  className={`journey-progress-step journey-progress-step--${status}`}
                  aria-current={status === 'current' ? 'step' : undefined}
                  aria-label={`Phase ${index + 1}: ${step.label}`}
                >
                  <div
                    className="journey-progress-step-marker"
                    title={`Phase ${index + 1}: ${step.label}`}
                  >
                    <span className="journey-progress-step-icon">{step.icon}</span>
                  </div>
                  {step.phaseLabel ? (
                    <span className="journey-progress-step-tooltip" role="presentation">
                      {step.phaseLabel}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppJourneyProgress;
