import React, { useState } from 'react';

import type { BrandData } from '../../types/brand';
import BrandAutocomplete from '../BrandAutocomplete';
import { INDUSTRY_CHIPS } from './brandOnboarding.config';

interface Props {
  brandData: BrandData;
  brandContext: {
    brandName: string;
    brandCategory: string;
    brandIdentity?: string;
  };
  isCustomIndustry: boolean;
  onNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onNarrativeChange: (value: string) => void;
  onSelectIndustry: (label: string) => void;
  onSetCustomIndustry: (nextValue: boolean) => void;
}

const BrandNarrativeForm: React.FC<Props> = ({
  brandData,
  brandContext,
  isCustomIndustry,
  onNameChange,
  onCategoryChange,
  onNarrativeChange,
  onSelectIndustry,
  onSetCustomIndustry
}) => {
  const [industryOpen, setIndustryOpen] = useState(false);

  const handleSelectIndustry = (label: string) => {
    onSelectIndustry(label);
    setIndustryOpen(false);
  };

  const handleSetCustom = () => {
    onSetCustomIndustry(true);
  };

  return (
    <div className="onboarding-step-panel">
      <div className="brand-onboarding-grid">
        <label className="brand-onboarding-block">
          <span>Brand name</span>
          <input
            type="text"
            className="brand-onboarding-field"
            value={brandData.name}
            onChange={event => onNameChange(event.target.value)}
            placeholder="e.g., Aster Vale"
          />
        </label>

        <label className="brand-onboarding-block">
          <span>Industry</span>
          <button
            type="button"
            className={`brand-onboarding-field brand-onboarding-field--picker ${industryOpen ? 'is-open' : ''}`}
            onClick={() => setIndustryOpen(prev => !prev)}
          >
            <span className={brandData.category ? '' : 'brand-onboarding-field--placeholder'}>
              {brandData.category || 'Select an industry'}
            </span>
          </button>
        </label>
      </div>

      {industryOpen && (
        <div className="industry-inline-tray">
          <div className="industry-chip-row">
            {INDUSTRY_CHIPS.map(option => (
              <button
                key={option.value}
                type="button"
                className={`ui-btn ui-btn--choice industry-chip ${brandData.category === option.label && !isCustomIndustry ? 'is-selected' : ''}`}
                onClick={() => handleSelectIndustry(option.label)}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              className={`ui-btn ui-btn--choice industry-chip ${isCustomIndustry ? 'is-selected' : ''}`}
              onClick={handleSetCustom}
            >
              Custom
            </button>
          </div>

          {isCustomIndustry && (
            <input
              type="text"
              className="brand-onboarding-field"
              value={brandData.category}
              onChange={event => onCategoryChange(event.target.value)}
              placeholder="Type your industry"
              autoFocus
            />
          )}
        </div>
      )}

      <div className="brand-onboarding-block brand-onboarding-narrative-reveal">
        <BrandAutocomplete
          brandContext={brandContext}
          value={brandData.description}
          onChange={onNarrativeChange}
          showHeader={false}
        />
      </div>
    </div>
  );
};

export default BrandNarrativeForm;
