import React, { useState } from 'react';

import type { BrandData } from '../../types/brand';

interface Props {
  currentStep: 'brand' | 'post';
  brandData: BrandData | null;
  onJumpToBrand: () => void;
  onJumpToPost: () => void;
  onLoadSampleBrand: (brandData: BrandData) => void;
}

const SAMPLE_BRANDS: Array<{ label: string; description: string; brand: BrandData }> = [
  {
    label: 'Cafe Sample',
    description: 'Warm neighborhood cafe with crafted drinks and a calm editorial voice.',
    brand: {
      name: 'Morrow House',
      category: 'food',
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
      description:
        'Aster Vale creates high-performance skincare for busy professionals who want clinically credible products that still feel elegant, calm, and easy to trust.',
      style: 'modern',
      colors: [],
      keywords: []
    }
  }
];

const PrototypeDebugDrawer: React.FC<Props> = ({
  currentStep,
  brandData,
  onJumpToBrand,
  onJumpToPost,
  onLoadSampleBrand
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className={`debug-drawer-toggle ${isOpen ? 'open' : ''}`}
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
          <button type="button" className="debug-drawer-close" onClick={() => setIsOpen(false)}>
            ×
          </button>
        </div>

        <div className="debug-drawer-section">
          <div className="debug-drawer-label">Current state</div>
          <div className="debug-pill-row">
            <span className="debug-pill">{currentStep === 'brand' ? 'Onboarding' : 'Post Studio'}</span>
            {brandData?.name && <span className="debug-pill subtle">{brandData.name}</span>}
          </div>
        </div>

        <div className="debug-drawer-section">
          <div className="debug-drawer-label">Navigation</div>
          <div className="debug-action-list">
            <button type="button" className="debug-action" onClick={onJumpToBrand}>
              Back to onboarding
            </button>
            <button
              type="button"
              className="debug-action"
              onClick={onJumpToPost}
              disabled={!brandData}
            >
              Open post studio
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
                className="debug-sample-card"
                onClick={() => onLoadSampleBrand(sample.brand)}
              >
                <div className="debug-sample-title">{sample.label}</div>
                <div className="debug-sample-description">{sample.description}</div>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </>
  );
};

export default PrototypeDebugDrawer;
