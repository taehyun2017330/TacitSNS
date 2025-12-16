import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft } from 'lucide-react';

interface BrandNameScreenProps {
  data: Partial<{ name: string; category: string }>;
  onNext: (data: { name: string; category: string }) => void;
  onBack: () => void;
}

const CATEGORIES = [
  'Fashion & Apparel',
  'Food & Beverage',
  'Beauty & Cosmetics',
  'Home & Lifestyle',
  'Health & Wellness',
  'Technology',
  'Other'
];

export function BrandNameScreen({ data, onNext, onBack }: BrandNameScreenProps) {
  const [name, setName] = useState(data.name || '');
  const [category, setCategory] = useState(data.category || '');

  const canContinue = name.trim().length > 0 && category.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 text-indigo-600">
              <Sparkles className="w-6 h-6" />
              <span>Brand Generator</span>
            </div>
          </div>
          <span className="text-sm text-gray-500">Step 1 of 4</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl mb-2">Let's create your brand identity</h1>
          <p className="text-gray-600 mb-8">We'll start with the basics</p>

          <div className="space-y-6">
            <div>
              <label className="block text-sm mb-2">Brand name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your brand name"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-2">Brand category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select category</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-8">
            <button
              onClick={() => onNext({ name, category })}
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
