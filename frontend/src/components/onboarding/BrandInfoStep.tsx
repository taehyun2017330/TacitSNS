import React, { useState } from 'react';

import { apiFetch } from '../../config/api';
import type { BrandData } from '../../types/brand';
import BrandAutocomplete from '../BrandAutocomplete';

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
  description: '',
  style: 'modern',
  colors: [],
  keywords: []
};

interface Props {
  onNext: (brandData: BrandData) => void;
}

function getDescriptionStatus(descriptionLength: number) {
  if (descriptionLength < 50) {
    return {
      icon: '⚠️',
      message: 'Keep writing - add more detail about your brand',
      textColorClass: 'text-orange-600',
      iconColorClass: 'text-orange-500',
      barColorClass: 'bg-orange-400'
    };
  }

  if (descriptionLength < 100) {
    return {
      icon: '💡',
      message: 'Good start! Consider adding more about what makes you unique',
      textColorClass: 'text-blue-600',
      iconColorClass: 'text-blue-500',
      barColorClass: 'bg-blue-400'
    };
  }

  return {
    icon: '✅',
    message: 'Great description! Ready to continue',
    textColorClass: 'text-green-600',
    iconColorClass: 'text-green-500',
    barColorClass: 'bg-green-400'
  };
}

function canContinue(brandData: BrandData) {
  return Boolean(
    brandData.name.trim().length > 0 &&
      brandData.category.length > 0 &&
      brandData.description.trim().length > 10
  );
}

const BrandInfoStep: React.FC<Props> = ({ onNext }) => {
  const [brandData, setBrandData] = useState<BrandData>(INITIAL_BRAND_DATA);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const isReadyToContinue = canContinue(brandData);
  const descriptionStatus = getDescriptionStatus(brandData.description.length);
  const brandContext = {
    brandName: brandData.name || 'Your Brand',
    brandCategory: brandData.category || 'General'
  };

  const handleFieldChange = <Key extends keyof BrandData>(field: Key, value: BrandData[Key]) => {
    setBrandData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setSubmitError('');

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
      onNext(data.brand);
    } catch (error) {
      console.error('Error creating brand:', error);
      setSubmitError(
        'The backend is not reachable, so the prototype is continuing with your local form data. Start `python main_simple.py` in `backend` when you want live generation.'
      );
      onNext(brandData);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="brand-onboarding-screen min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="brand-onboarding-card bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Tell us about your brand</h1>
          <p className="text-gray-600 mb-8">Start with the basics, then describe it in your own words</p>

          {submitError && <div className="brand-onboarding-error">{submitError}</div>}

          <form onSubmit={handleSubmit} className="brand-onboarding-form space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  className="brand-onboarding-input brand-onboarding-field w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={brandData.name}
                  onChange={event => handleFieldChange('name', event.target.value)}
                  placeholder="Enter your brand name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry *
                </label>
                <select
                  required
                  className="brand-onboarding-input brand-onboarding-field w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              </div>
            </div>

            {brandData.name && brandData.category ? (
              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Description * (Use AI autocomplete to help craft your story)
                </label>
                <div className="brand-onboarding-tip bg-indigo-50 border-l-4 border-indigo-500 p-4 rounded-r-lg mb-4">
                  <p className="text-sm text-indigo-900 font-medium mb-2">💡 What to include:</p>
                  <ul className="text-sm text-indigo-800 space-y-1">
                    <li>• What your brand does and who it's for</li>
                    <li>• The problem you solve or need you address</li>
                    <li>• What makes your brand unique and special</li>
                    <li>• The feeling or values you want to convey</li>
                  </ul>
                </div>

                <BrandAutocomplete
                  brandContext={brandContext}
                  value={brandData.description}
                  onChange={text => handleFieldChange('description', text)}
                  showHeader={false}
                />

                <div className="mt-4 space-y-3">
                  {brandData.description.length > 0 && (
                    <div className="brand-onboarding-progress bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`${descriptionStatus.iconColorClass} text-xl`}>
                            {descriptionStatus.icon}
                          </span>
                          <span className={`${descriptionStatus.textColorClass} text-sm font-medium`}>
                            {descriptionStatus.message}
                          </span>
                        </div>
                        <span className="text-gray-500 text-sm">
                          {brandData.description.length} characters
                        </span>
                      </div>

                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${descriptionStatus.barColorClass}`}
                          style={{
                            width: `${Math.min((brandData.description.length / 100) * 100, 100)}%`
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Description
                </label>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                  Please enter your brand name and select an industry first to enable the AI-powered autocomplete feature.
                </div>
              </div>
            )}

            <div className="brand-onboarding-divider mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {!brandData.name && <span>⚠️ Brand name required</span>}
                  {brandData.name && !brandData.category && <span>⚠️ Industry required</span>}
                  {brandData.name && brandData.category && brandData.description.length < 10 && (
                    <span>⚠️ Add at least 10 characters to your description</span>
                  )}
                  {isReadyToContinue && <span className="text-green-600 font-medium">✓ All requirements met</span>}
                </div>

                <button
                  type="submit"
                  className={`brand-onboarding-next-btn ${isReadyToContinue ? 'is-ready' : 'is-disabled'}`}
                  disabled={loading || !isReadyToContinue}
                >
                  {loading ? (
                    <span>Processing...</span>
                  ) : (
                    <>
                      <span>Next</span>
                      <svg style={{ width: '20px', height: '20px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BrandInfoStep;
