import React, { useMemo, useState } from 'react';

import { inferBusinessGoalOptions } from '../../data/goalHierarchy';
import { apiFetch } from '../../config/api';
import type { BrandData } from '../../types/brand';
import type { BusinessGoalOption, OnboardingResult } from '../../types/workspace';
import BrandAutocomplete from '../BrandAutocomplete';
import BusinessGoalSelector from './BusinessGoalSelector';

const INDUSTRY_OPTIONS = [
  { value: 'technology', label: 'Technology' },
  { value: 'fashion', label: 'Fashion & Apparel' },
  { value: 'food', label: 'Food & Beverage' },
  { value: 'health', label: 'Health & Wellness' },
  { value: 'beauty', label: 'Beauty & Cosmetics' },
  { value: 'home', label: 'Home & Lifestyle' },
  { value: 'finance', label: 'Finance' },
  { value: 'education', label: 'Education' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'other', label: 'Other' }
] as const;

const INITIAL_BRAND_DATA: BrandData = {
  name: '',
  category: '',
  identity: '',
  description: '',
  style: 'modern',
  colors: [],
  keywords: []
};

interface Props {
  initialData?: OnboardingResult | null;
  onComplete: (result: OnboardingResult) => void;
}

function deriveIdentityFromNarrative(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return '';
  }

  const [firstSentence] = trimmed.split(/(?<=[.!?])\s+/);
  return (firstSentence || trimmed).trim();
}

function canGenerateGoals(brandData: BrandData) {
  return Boolean(
    brandData.name.trim() &&
      brandData.category.trim() &&
      brandData.description.trim().length > 36
  );
}

function canContinue(brandData: BrandData, selectedGoalIds: string[]) {
  return canGenerateGoals(brandData) && selectedGoalIds.length > 0;
}

const BrandInfoStep: React.FC<Props> = ({ initialData = null, onComplete }) => {
  const [brandData, setBrandData] = useState<BrandData>(() => initialData?.brand ?? INITIAL_BRAND_DATA);
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(() => initialData?.selectedBusinessGoals.map(goal => goal.id) ?? []);
  const [customGoalOverrides, setCustomGoalOverrides] = useState<BusinessGoalOption[]>(() =>
    initialData?.selectedBusinessGoals.filter(goal => goal.isCustom || goal.normalizedFrom) ?? []
  );
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const inferredGoals = useMemo(
    () => inferBusinessGoalOptions(brandData),
    [brandData]
  );
  const businessGoalOptions = useMemo(() => {
    const merged = [...inferredGoals];
    customGoalOverrides.forEach(customGoal => {
      const existingIndex = merged.findIndex(goal => goal.id === customGoal.id);
      if (existingIndex >= 0) {
        merged[existingIndex] = {
          ...merged[existingIndex],
          ...customGoal,
          isRecommended: true,
          rank: 1
        };
      } else {
        merged.unshift(customGoal);
      }
    });
    return merged;
  }, [customGoalOverrides, inferredGoals]);

  const isReadyToContinue = canContinue(brandData, selectedGoalIds);
  const canShowGoals = canGenerateGoals(brandData);
  const brandContext = {
    brandName: brandData.name || 'Your Brand',
    brandCategory: brandData.category || 'General'
  };

  const handleFieldChange = <Key extends keyof BrandData>(field: Key, value: BrandData[Key]) => {
    setBrandData(prev => ({ ...prev, [field]: value }));
  };

  const toggleGoalSelection = (goal: BusinessGoalOption) => {
    setSelectedGoalIds(prev =>
      prev.includes(goal.id)
        ? prev.filter(goalId => goalId !== goal.id)
        : [...prev, goal.id]
    );
  };

  const addCustomGoal = (goal: BusinessGoalOption) => {
    setCustomGoalOverrides(prev => {
      const filtered = prev.filter(existingGoal => existingGoal.id !== goal.id);
      return [
        {
          ...goal,
          isRecommended: true,
          rank: 1
        },
        ...filtered
      ];
    });
    setSelectedGoalIds(prev => (prev.includes(goal.id) ? prev : [...prev, goal.id]));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isReadyToContinue) {
      return;
    }

    setLoading(true);
    setSubmitError('');

    const selectedBusinessGoals = businessGoalOptions.filter(goal => selectedGoalIds.includes(goal.id));

    try {
      const response = await apiFetch('/brand/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create brand: ${response.status}`);
      }

      const data = await response.json();
      onComplete({
        brand: {
          ...brandData,
          ...data.brand
        },
        selectedBusinessGoals,
        activeBusinessGoalId: selectedBusinessGoals[0]?.id ?? businessGoalOptions[0]?.id ?? 'trust'
      });
    } catch (error) {
      console.error('Error creating brand:', error);
      setSubmitError(
        'The backend is not reachable, so the prototype is continuing with your local brand profile. Start `python main_simple.py` in `backend` when you want live generation.'
      );
      onComplete({
        brand: brandData,
        selectedBusinessGoals,
        activeBusinessGoalId: selectedBusinessGoals[0]?.id ?? businessGoalOptions[0]?.id ?? 'trust'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="brand-onboarding-screen">
      <div className="brand-onboarding-layout">
        <section className="brand-onboarding-intro">
          <div className="screen-eyebrow">Brand setup</div>
          <h1>Externalize the brand first. Then choose the goals this post system should optimize for.</h1>
          <p>
            Small business owners usually do not start with a clean creative brief. This onboarding turns
            brand intuition into broad business goals that can later branch into post-goal folders and visual strategies.
          </p>

          <div className="brand-hierarchy-preview">
            <div className="brand-hierarchy-step">
              <span>1</span>
              <div>
                <strong>Brand identity</strong>
                <p>Name the business, its audience, and the feeling it should carry.</p>
              </div>
            </div>
            <div className="brand-hierarchy-step">
              <span>2</span>
              <div>
                <strong>Business goals</strong>
                <p>Choose broad outcomes like trust, awareness, education, engagement, or sales.</p>
              </div>
            </div>
            <div className="brand-hierarchy-step">
              <span>3</span>
              <div>
                <strong>Post-goal folders</strong>
                <p>Create narrower content goals that open into the 2x2 generation workspace.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="brand-onboarding-card">
          <div className="screen-eyebrow">Onboarding</div>
          <h2>Tell the system who this brand is.</h2>
          <p className="brand-onboarding-subtitle">
            Use one guided brand narrative field so the system can infer identity, positioning, and likely business goals together.
          </p>

          {submitError && <div className="brand-onboarding-error">{submitError}</div>}

          <form onSubmit={handleSubmit} className="brand-onboarding-form">
            <div className="brand-onboarding-grid">
              <label className="brand-onboarding-block">
                <span>Brand name</span>
                <input
                  type="text"
                  className="brand-onboarding-field"
                  value={brandData.name}
                  onChange={event => handleFieldChange('name', event.target.value)}
                  placeholder="e.g., Aster Vale"
                />
              </label>

              <label className="brand-onboarding-block">
                <span>Industry</span>
                <select
                  className="brand-onboarding-field"
                  value={brandData.category}
                  onChange={event => handleFieldChange('category', event.target.value)}
                >
                  <option value="">Select an industry</option>
                  {INDUSTRY_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="brand-onboarding-block">
              <span>Brand identity and positioning</span>
              <div className="brand-onboarding-tip">
                <p>Use the autocomplete to explain:</p>
                <ul>
                  <li>what kind of brand this is</li>
                  <li>who the brand serves</li>
                  <li>what problem it solves</li>
                  <li>why it should feel different</li>
                  <li>what impression you want people to leave with</li>
                </ul>
              </div>
              <BrandAutocomplete
                brandContext={brandContext}
                value={brandData.description}
                onChange={text => {
                  setBrandData(prev => ({
                    ...prev,
                    description: text,
                    identity: deriveIdentityFromNarrative(text)
                  }));
                }}
                showHeader={false}
              />
            </div>

            {canShowGoals ? (
              <BusinessGoalSelector
                options={businessGoalOptions}
                selectedGoalIds={selectedGoalIds}
                onToggleGoal={toggleGoalSelection}
                onAddCustomGoal={addCustomGoal}
              />
            ) : (
              <div className="brand-onboarding-gate">
                Complete the brand identity and background first. The business-goal recommendations appear once the
                system has enough context to rank them meaningfully.
              </div>
            )}

            <div className="brand-onboarding-divider">
              <div className="brand-onboarding-requirements">
                {!brandData.name.trim() && <span>Brand name required</span>}
                {brandData.name.trim() && !brandData.category.trim() && <span>Industry required</span>}
                {brandData.name.trim() && brandData.category.trim() && brandData.description.trim().length <= 36 && (
                  <span>Add a fuller brand narrative so goals can be ranked properly</span>
                )}
                {canGenerateGoals(brandData) && selectedGoalIds.length === 0 && (
                  <span>Select at least one business goal</span>
                )}
                {isReadyToContinue && <span className="is-ready">Ready to create the goal workspace</span>}
              </div>

              <button
                type="submit"
                className={`ui-btn ui-btn--primary ui-btn--hero brand-onboarding-next-btn ${isReadyToContinue ? 'is-ready' : 'is-disabled'}`}
                disabled={loading || !isReadyToContinue}
              >
                {loading ? 'Preparing workspace...' : 'Continue to goal workspace'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
};

export default BrandInfoStep;
