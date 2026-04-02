import React from 'react';

import { summarizeNarrative } from '../onboarding/brandOnboarding.utils';
import type { BusinessGoalOption } from '../../types/workspace';

interface Props {
  brandName: string;
  brandCategory: string;
  brandIdentity: string;
  brandNarrative: string;
  activeBusinessGoal: BusinessGoalOption | null;
  onEditGoals: () => void;
}

const WorkspaceContextRail: React.FC<Props> = ({
  brandName,
  brandCategory,
  brandIdentity,
  brandNarrative,
  activeBusinessGoal,
  onEditGoals
}) => {
  const narrativeSummary = summarizeNarrative(brandNarrative || brandIdentity, 118);
  const businessGoalSummary = activeBusinessGoal
    ? summarizeNarrative(activeBusinessGoal.description, 108)
    : '';

  return (
    <aside className="workspace-hub-rail">
      <div className="workspace-hub-rail-inner">
        <div className="workspace-hub-rail-intro">
          <div className="workspace-hub-rail-kicker">Brand</div>
          <h1>{brandName}</h1>
          <div className="workspace-hub-brand-meta">{brandCategory}</div>
        </div>

        <article className="workspace-hub-context">
          <div className="workspace-hub-context-index">1</div>
          <div className="workspace-hub-context-body">
            <div className="workspace-hub-context-label">Narrative</div>
            <div className="workspace-hub-context-detail">{narrativeSummary}</div>
          </div>
        </article>

        <article className="workspace-hub-context">
          <div className="workspace-hub-context-index">2</div>
          <div className="workspace-hub-context-body">
            <div className="workspace-hub-context-label">Business goal</div>
            <strong>{activeBusinessGoal?.title ?? 'No business goal selected'}</strong>
            {activeBusinessGoal ? (
              <div className="workspace-hub-context-detail workspace-hub-context-detail--compact">
                {businessGoalSummary}
              </div>
            ) : null}
          </div>
        </article>

        <button type="button" className="ui-btn ui-btn--secondary workspace-hub-edit" onClick={onEditGoals}>
          Edit context
        </button>
      </div>
    </aside>
  );
};

export default WorkspaceContextRail;
