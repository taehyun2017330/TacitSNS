import React from 'react';

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
}) => (
  <aside className="workspace-hub-rail">
    <div className="workspace-hub-rail-inner">
      <h1>{brandName}</h1>
      <div className="workspace-hub-brand-meta">{brandCategory}</div>

      <article className="workspace-hub-context">
        <div className="workspace-hub-context-index">1</div>
        <div className="workspace-hub-context-body">
          <div className="workspace-hub-context-label">Brand narrative</div>
          <div className="workspace-hub-context-detail">{brandNarrative || brandIdentity}</div>
        </div>
      </article>

      <article className="workspace-hub-context">
        <div className="workspace-hub-context-index">2</div>
        <div className="workspace-hub-context-body">
          <div className="workspace-hub-context-label">Business goal</div>
          <strong>{activeBusinessGoal?.title ?? 'No business goal selected'}</strong>
          {activeBusinessGoal ? (
            <div className="workspace-hub-context-detail workspace-hub-context-detail--compact">
              {activeBusinessGoal.description}
            </div>
          ) : null}
        </div>
      </article>

      <button type="button" className="ui-btn ui-btn--secondary workspace-hub-edit" onClick={onEditGoals}>
        Edit
      </button>
    </div>
  </aside>
);

export default WorkspaceContextRail;
