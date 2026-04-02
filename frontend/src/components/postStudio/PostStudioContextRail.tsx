import React from 'react';

import { summarizeNarrative } from '../onboarding/brandOnboarding.utils';
import '../workspace/WorkspaceHub.css';

const BackToWorkspaceIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d="M14.5 6.5 9 12l5.5 5.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ContextRailIcon = ({ isOpen }: { isOpen: boolean }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path
      d={isOpen ? 'M14.5 6.5 9 12l5.5 5.5' : 'M9.5 6.5 15 12l-5.5 5.5'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

interface Props {
  brandName: string;
  brandCategory: string;
  brandNarrative?: string;
  businessGoalTitle?: string;
  businessGoalDescription?: string;
  postGoalTitle?: string;
  postGoalDescription?: string;
  isOpen: boolean;
  onBack: () => void;
  onToggle: () => void;
}

const PostStudioContextRail: React.FC<Props> = ({
  brandName,
  brandCategory,
  brandNarrative = '',
  businessGoalTitle,
  businessGoalDescription,
  postGoalTitle,
  postGoalDescription,
  isOpen,
  onBack,
  onToggle
}) => {
  const brandNarrativeSummary = summarizeNarrative(brandNarrative, 92);
  const businessGoalSummary = businessGoalDescription
    ? summarizeNarrative(businessGoalDescription, 86)
    : '';
  const postGoalSummary = postGoalDescription
    ? summarizeNarrative(postGoalDescription, 84)
    : '';

  const railActions = (
    <div className="post-studio-rail-actions">
      <button
        type="button"
        className="post-studio-rail-link"
        onClick={onBack}
      >
        <span className="post-studio-rail-action-icon">
          <BackToWorkspaceIcon />
        </span>
        <span className="post-studio-rail-action-label">Workspace</span>
      </button>

      <button
        type="button"
        className="post-studio-rail-toggle-button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? 'Hide context' : 'Show context'}
      >
        <span className="post-studio-rail-action-icon">
          <ContextRailIcon isOpen={isOpen} />
        </span>
      </button>
    </div>
  );

  return (
    <aside className={`post-studio-rail${isOpen ? ' is-open' : ' is-collapsed'}`}>
      {isOpen ? (
        <div className="workspace-hub-rail-inner post-studio-rail-panel">
          {railActions}
          <h1>{brandName}</h1>
          <div className="workspace-hub-brand-meta">{brandCategory}</div>

          <article className="workspace-hub-context">
            <div className="workspace-hub-context-index">1</div>
            <div className="workspace-hub-context-body">
              <div className="workspace-hub-context-label">Brand narrative</div>
              <div className="workspace-hub-context-detail post-studio-context-detail--always">
                {brandNarrativeSummary}
              </div>
            </div>
          </article>

          <article className="workspace-hub-context">
            <div className="workspace-hub-context-index">2</div>
            <div className="workspace-hub-context-body">
              <div className="workspace-hub-context-label">Business goal</div>
              <strong>{businessGoalTitle || 'No business goal selected'}</strong>
              {businessGoalSummary ? (
                <div className="workspace-hub-context-detail workspace-hub-context-detail--compact post-studio-context-detail--always">
                  {businessGoalSummary}
                </div>
              ) : null}
            </div>
          </article>

          <article className="workspace-hub-context">
            <div className="workspace-hub-context-index">3</div>
            <div className="workspace-hub-context-body">
              <div className="workspace-hub-context-label">Post goal</div>
              <strong>{postGoalTitle || 'No post goal selected'}</strong>
              {postGoalSummary ? (
                <div className="workspace-hub-context-detail workspace-hub-context-detail--compact post-studio-context-detail--always">
                  {postGoalSummary}
                </div>
              ) : null}
            </div>
          </article>
        </div>
      ) : (
        railActions
      )}
    </aside>
  );
};

export default PostStudioContextRail;
