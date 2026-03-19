import React, { useState } from 'react';

import type { BrandData } from '../../types/brand';
import type { AppStage, PrototypeUser, WorkspaceSnapshot } from '../../types/workspace';

interface Props {
  currentStage: AppStage;
  user: PrototypeUser | null;
  workspace: WorkspaceSnapshot | null;
  onJumpToAuth: () => void;
  onJumpToOnboarding: () => void;
  onJumpToWorkspace: () => void;
  onJumpToStudio: () => void;
  onLoadSampleWorkspace: (brandData: BrandData) => void;
  onResetPrototype: () => void;
}

const SAMPLE_BRANDS: Array<{ label: string; description: string; brand: BrandData }> = [
  {
    label: 'Cafe Sample',
    description: 'Warm neighborhood cafe with crafted drinks and a calm editorial voice.',
    brand: {
      name: 'Morrow House',
      category: 'food',
      identity: 'A warm neighborhood cafe with crafted drinks, slower rituals, and an editorial but welcoming feel.',
      description:
        'Morrow House is a neighborhood cafe for people who want a slower, more intentional coffee experience with crafted drinks, seasonal pastries, and a calm editorial atmosphere.',
      style: 'modern',
      colors: [],
      keywords: []
    }
  },
  {
    label: 'Skincare Sample',
    description: 'Minimal skincare brand with credible, premium product storytelling.',
    brand: {
      name: 'Aster Vale',
      category: 'beauty',
      identity: 'Premium skincare for sensitive skin that should feel safe, science-backed, and calm.',
      description:
        'Aster Vale creates high-performance skincare for busy professionals who want clinically credible products that still feel elegant, calm, and easy to trust.',
      style: 'modern',
      colors: [],
      keywords: []
    }
  }
];

function getStageLabel(stage: AppStage) {
  switch (stage) {
    case 'auth':
      return 'Login';
    case 'onboarding':
      return 'Onboarding';
    case 'workspace':
      return 'Goal Workspace';
    case 'studio':
      return '2x2 Studio';
    default:
      return 'Prototype';
  }
}

const PrototypeDebugDrawer: React.FC<Props> = ({
  currentStage,
  user,
  workspace,
  onJumpToAuth,
  onJumpToOnboarding,
  onJumpToWorkspace,
  onJumpToStudio,
  onLoadSampleWorkspace,
  onResetPrototype
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`ui-btn ui-btn--secondary debug-drawer-toggle ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(open => !open)}
      >
        Debug
      </button>

      <aside className={`debug-drawer ${isOpen ? 'open' : ''}`}>
        <div className="debug-drawer-header">
          <div>
            <div className="debug-drawer-eyebrow">Prototype Tools</div>
            <div className="debug-drawer-title">Jump between states</div>
          </div>
          <button type="button" className="ui-btn ui-btn--choice debug-drawer-close" onClick={() => setIsOpen(false)}>
            ×
          </button>
        </div>

        <div className="debug-drawer-section">
          <div className="debug-drawer-label">Current state</div>
          <div className="debug-pill-row">
            <span className="debug-pill">{getStageLabel(currentStage)}</span>
            {user?.name && <span className="debug-pill subtle">{user.name}</span>}
            {workspace?.brand.name && <span className="debug-pill subtle">{workspace.brand.name}</span>}
          </div>
        </div>

        <div className="debug-drawer-section">
          <div className="debug-drawer-label">Navigation</div>
          <div className="debug-action-list">
            <button type="button" className="ui-btn ui-btn--secondary debug-action" onClick={onJumpToAuth}>
              Open login
            </button>
            <button type="button" className="ui-btn ui-btn--secondary debug-action" onClick={onJumpToOnboarding}>
              Open onboarding
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--secondary debug-action"
              onClick={onJumpToWorkspace}
              disabled={!workspace}
            >
              Open goal workspace
            </button>
            <button
              type="button"
              className="ui-btn ui-btn--secondary debug-action"
              onClick={onJumpToStudio}
              disabled={!workspace?.postGoalFolders.length}
            >
              Open first studio folder
            </button>
          </div>
        </div>

        <div className="debug-drawer-section">
          <div className="debug-drawer-label">Sample entry points</div>
          <div className="debug-sample-list">
            {SAMPLE_BRANDS.map(sample => (
              <button
                key={sample.label}
                type="button"
                className="ui-btn ui-btn--secondary debug-sample-card"
                onClick={() => onLoadSampleWorkspace(sample.brand)}
              >
                <div className="debug-sample-title">{sample.label}</div>
                <div className="debug-sample-description">{sample.description}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="debug-drawer-section">
          <div className="debug-drawer-label">Reset</div>
          <div className="debug-action-list">
            <button type="button" className="ui-btn ui-btn--secondary debug-action" onClick={onResetPrototype}>
              Clear local prototype state
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default PrototypeDebugDrawer;
