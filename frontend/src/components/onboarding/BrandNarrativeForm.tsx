import React from 'react';

import type { BrandData } from '../../types/brand';
import BrandAutocomplete from '../BrandAutocomplete';
import { INDUSTRY_CHIPS } from './brandOnboarding.config';

interface Props {
  brandData: BrandData;
  brandContext: {
    brandName: string;
    brandCategory: string;
  };
  industryPickerOpen: boolean;
  isCustomIndustry: boolean;
  onNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onNarrativeChange: (value: string) => void;
  onToggleIndustryPicker: () => void;
  onSelectIndustry: (label: string) => void;
  onSetCustomIndustry: (nextValue: boolean) => void;
}

const BrandNarrativeForm: React.FC<Props> = ({
  brandData,
  brandContext,
  industryPickerOpen,
  isCustomIndustry,
  onNameChange,
  onCategoryChange,
  onNarrativeChange,
  onToggleIndustryPicker,
  onSelectIndustry,
  onSetCustomIndustry
}) => (
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

      <label className="brand-onboarding-block brand-onboarding-block--industry">
        <span>Industry</span>
        <button
          type="button"
          className={`brand-onboarding-picker ${industryPickerOpen ? 'is-open' : ''}`}
          onClick={onToggleIndustryPicker}
        >
          <span>{brandData.category || 'Select an industry'}</span>
          <span className="brand-onboarding-picker-icon">{industryPickerOpen ? '−' : '+'}</span>
        </button>

        {industryPickerOpen && (
          <div className="industry-picker-panel">
            <div className="industry-chip-row">
              {INDUSTRY_CHIPS.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`industry-chip ${brandData.category === option.label && !isCustomIndustry ? 'is-selected' : ''}`}
                  onClick={() => onSelectIndustry(option.label)}
                >
                  {option.label}
                </button>
              ))}
              <button
                type="button"
                className={`industry-chip ${isCustomIndustry ? 'is-selected' : ''}`}
                onClick={() => onSetCustomIndustry(true)}
              >
                Custom industry
              </button>
            </div>

            {isCustomIndustry && (
              <input
                type="text"
                className="brand-onboarding-field"
                value={brandData.category}
                onChange={event => onCategoryChange(event.target.value)}
                placeholder="Type your industry"
              />
            )}
          </div>
        )}
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
        onChange={onNarrativeChange}
        showHeader={false}
      />
    </div>
  </div>
);

export default BrandNarrativeForm;
