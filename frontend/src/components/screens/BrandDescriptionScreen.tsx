import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

interface BrandDescriptionScreenProps {
  data: Partial<{ description: string }>;
  onNext: (data: { description: string }) => void;
  onBack: () => void;
}

export function BrandDescriptionScreen({ data, onNext, onBack }: BrandDescriptionScreenProps) {
  const [description, setDescription] = useState(data.description || '');

  const wordCount = description.trim().split(/\s+/).filter(w => w.length > 0).length;
  const canContinue = description.trim().length > 10; // Changed to just require some text

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-indigo-600">
            <Sparkles className="w-6 h-6" />
            <span>Brand Generator</span>
          </div>
          <span className="text-sm text-gray-500">Step 2 of 4</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl mb-2">Tell us about your brand</h1>
          <p className="text-gray-600 mb-8">Describe it in your own words</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm mb-2">
                Describe your brand in your own words
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What makes it special, who it's for, what feeling you want..."
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <div className="flex justify-between mt-2">
                <span className={`text-sm ${canContinue ? 'text-green-600' : 'text-gray-500'}`}>
                  {wordCount} words {canContinue ? '✓' : '(50 minimum)'}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Examples:</p>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• "Handcrafted ceramics for slow living enthusiasts who value sustainability"</li>
                <li>• "Bold streetwear for creators who want to stand out and make a statement"</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800 px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <button
              onClick={() => onNext({ description })}
              disabled={!canContinue}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}