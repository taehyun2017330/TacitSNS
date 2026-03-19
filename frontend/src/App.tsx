import React, { useState } from 'react';
import BrandAutocomplete from './components/BrandAutocomplete';
import PostStudio from './components/PostStudio';
import './App.css';

// Simple Brand Info Component with Autocomplete
const BrandInfoStep: React.FC<{
  onNext: (brandData: any) => void;
}> = ({ onNext }) => {
  const [brandData, setBrandData] = useState({
    name: '',
    category: '',
    description: '',
    style: 'modern',
    colors: [],
    keywords: []
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:8001/brand/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(brandData)
      });

      if (response.ok) {
        const data = await response.json();
        onNext(data.brand);
      }
    } catch (error) {
      console.error('Error creating brand:', error);
    } finally {
      setLoading(false);
    }
  };

  const canContinue = brandData.name && brandData.name.trim().length > 0 &&
                      brandData.category && brandData.category.length > 0 &&
                      brandData.description && brandData.description.trim().length > 10;

  // Brand context for autocomplete
  const brandContext = {
    brandName: brandData.name || 'Your Brand',
    brandCategory: brandData.category || 'General'
  };

  return (
    <div className="brand-onboarding-screen min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-4xl w-full">
        <div className="brand-onboarding-card bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Tell us about your brand</h1>
          <p className="text-gray-600 mb-8">Start with the basics, then describe it in your own words</p>

          <form onSubmit={handleSubmit} className="brand-onboarding-form space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Name *
                </label>
                <input
                  type="text"
                  required
                  className="brand-onboarding-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ fontWeight: 400, height: '48px', fontSize: '16px' }}
                  value={brandData.name}
                  onChange={(e) => setBrandData({ ...brandData, name: e.target.value })}
                  placeholder="Enter your brand name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry *
                </label>
                <select
                  required
                  className="brand-onboarding-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  style={{ fontWeight: 400, height: '48px', fontSize: '16px' }}
                  value={brandData.category}
                  onChange={(e) => setBrandData({ ...brandData, category: e.target.value })}
                >
                  <option value="">Select an industry</option>
                  <option value="technology">Technology</option>
                  <option value="fashion">Fashion & Apparel</option>
                  <option value="food">Food & Beverage</option>
                  <option value="health">Health & Wellness</option>
                  <option value="beauty">Beauty & Cosmetics</option>
                  <option value="home">Home & Lifestyle</option>
                  <option value="finance">Finance</option>
                  <option value="education">Education</option>
                  <option value="entertainment">Entertainment</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            {/* Brand Description with Autocomplete */}
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
                  onChange={(text) => setBrandData({ ...brandData, description: text })}
                  showHeader={false}
                />

                {/* Progress indicator */}
                <div className="mt-4 space-y-3">
                  {brandData.description.length > 0 && (
                    <div className="brand-onboarding-progress bg-gray-50 rounded-lg p-3 border border-gray-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {brandData.description.length < 50 && (
                            <>
                              <span className="text-orange-500 text-xl">⚠️</span>
                              <span className="text-orange-600 text-sm font-medium">
                                Keep writing - add more detail about your brand
                              </span>
                            </>
                          )}
                          {brandData.description.length >= 50 && brandData.description.length < 100 && (
                            <>
                              <span className="text-blue-500 text-xl">💡</span>
                              <span className="text-blue-600 text-sm font-medium">
                                Good start! Consider adding more about what makes you unique
                              </span>
                            </>
                          )}
                          {brandData.description.length >= 100 && (
                            <>
                              <span className="text-green-500 text-xl">✅</span>
                              <span className="text-green-600 text-sm font-medium">
                                Great description! Ready to continue
                              </span>
                            </>
                          )}
                        </div>
                        <span className="text-gray-500 text-sm">
                          {brandData.description.length} characters
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${
                            brandData.description.length < 50
                              ? 'bg-orange-400'
                              : brandData.description.length < 100
                              ? 'bg-blue-400'
                              : 'bg-green-400'
                          }`}
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

            {/* Next Button - Always visible but disabled when criteria not met */}
            <div className="brand-onboarding-divider mt-8 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  {!brandData.name && <span>⚠️ Brand name required</span>}
                  {brandData.name && !brandData.category && <span>⚠️ Industry required</span>}
                  {brandData.name && brandData.category && brandData.description.length < 10 && (
                    <span>⚠️ Add at least 10 characters to your description</span>
                  )}
                  {canContinue && <span className="text-green-600 font-medium">✓ All requirements met</span>}
                </div>
                <button
                  type="submit"
                  className="brand-onboarding-next-btn"
                  disabled={loading || !canContinue}
                  style={{
                    padding: '12px 32px',
                    borderRadius: '8px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    border: 'none',
                    cursor: canContinue ? 'pointer' : 'not-allowed',
                    backgroundColor: canContinue ? '#2563eb' : '#d1d5db',
                    color: canContinue ? '#ffffff' : '#6b7280',
                    transition: 'all 0.2s',
                    fontSize: '16px'
                  }}
                  onMouseEnter={(e) => {
                    if (canContinue) {
                      e.currentTarget.style.backgroundColor = '#1d4ed8';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (canContinue) {
                      e.currentTarget.style.backgroundColor = '#2563eb';
                      e.currentTarget.style.transform = 'scale(1)';
                    }
                  }}
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


// Main App Component
function App() {
  const [currentStep, setCurrentStep] = useState<'brand' | 'post'>('brand');
  const [brandData, setBrandData] = useState<any>(null);

  return (
    <>
      {currentStep === 'brand' && (
        <BrandInfoStep
          onNext={(data) => {
            setBrandData(data);
            setCurrentStep('post');
          }}
        />
      )}

      {currentStep === 'post' && brandData && (
        <PostStudio
          brandName={brandData.name}
          brandCategory={brandData.category}
          brandContext={brandData.description}
          onBack={() => setCurrentStep('brand')}
          onFinalize={(postUrl, postData) => {
            // You can add additional handling here
            alert('Post finalized! Ready to publish.');
          }}
        />
      )}
    </>
  );
}

export default App;
