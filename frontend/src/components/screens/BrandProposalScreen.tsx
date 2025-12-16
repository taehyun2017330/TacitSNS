import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, Check, ChevronDown, ChevronUp, Edit, Plus, Image as ImageIcon } from 'lucide-react';
import type { BrandData } from '../../App';

interface BrandProposalScreenProps {
  data: Partial<BrandData>;
  onSave: (brand: BrandData) => void;
  onBack: () => void;
}

export function BrandProposalScreen({ data, onSave, onBack }: BrandProposalScreenProps) {
  const [expandedSections, setExpandedSections] = useState({
    audience: true,
    strengths: true,
    products: true,
    voice: true
  });

  const [selectedLogo, setSelectedLogo] = useState<string | undefined>(data.logoImage);

  const [proposal, setProposal] = useState({
    targetAudience: '',
    majorStrengths: [] as string[],
    mainProducts: [] as string[],
    brandVoice: ''
  });

  useEffect(() => {
    // Simulate AI generation based on brand description
    setTimeout(() => {
      setProposal({
        targetAudience: generateAudience(data.category || '', data.description || ''),
        majorStrengths: generateStrengths(data.description || ''),
        mainProducts: generateProducts(data.category || '', data.description || ''),
        brandVoice: generateVoice(data.description || '')
      });
    }, 500);
  }, [data]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections({ ...expandedSections, [section]: !expandedSections[section] });
  };

  const handleSave = () => {
    const brand: BrandData = {
      id: Date.now().toString(),
      name: data.name || 'Unnamed Brand',
      category: data.category || '',
      description: data.description || '',
      referenceImages: data.referenceImages || [],
      logoImage: selectedLogo,
      createdDate: new Date().toISOString(),
      ...proposal
    };
    onSave(brand);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-5xl w-full">
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
          <span className="text-sm text-gray-500">Step 4 of 4</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="flex items-start justify-between mb-8">
            <div className="flex-1">
              <h1 className="text-3xl mb-2">Your Brand Foundation Proposal</h1>
              <p className="text-gray-600">Generated from your inputs</p>
            </div>
            <div className="flex items-start gap-8">
              <div className="text-right">
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-sm">{new Date().toLocaleDateString()}</p>
              </div>
              {selectedLogo && (
                <div>
                  <p className="text-sm text-gray-500 mb-2">Brand Logo</p>
                  <img
                    src={selectedLogo}
                    alt="Brand Logo"
                    className="w-24 h-24 object-cover rounded-lg border-2 border-gray-200"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Reference Images & Logo Selection */}
            {data.referenceImages && data.referenceImages.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm mb-3">Reference Images</h3>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {data.referenceImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={img}
                        alt={`Reference ${i + 1}`}
                        className="w-full h-24 object-cover rounded-lg border-2 border-gray-200"
                      />
                      <button
                        onClick={() => setSelectedLogo(img)}
                        className={`absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg ${
                          selectedLogo === img ? 'opacity-100 border-2 border-indigo-500' : ''
                        }`}
                      >
                        <span className="text-white text-xs px-2 py-1 bg-indigo-600 rounded">
                          {selectedLogo === img ? 'Selected as Logo' : 'Use as Logo'}
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
                {!selectedLogo && (
                  <p className="text-xs text-gray-500 italic">
                    💡 Click any reference image to use it as your brand logo
                  </p>
                )}
              </div>
            )}

            {/* Target Audience */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection('audience')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <span>Target Audience</span>
                {expandedSections.audience ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections.audience && (
                <div className="p-4 pt-0 space-y-3">
                  <p className="text-sm text-gray-700 italic">"{proposal.targetAudience}"</p>
                  <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                    How we got this: Analyzed your brand description and category to identify your ideal customer profile
                  </div>
                  <div className="flex gap-2">
                    <button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Looks right
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Major Strengths */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection('strengths')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <span>Major Strengths</span>
                {expandedSections.strengths ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections.strengths && (
                <div className="p-4 pt-0 space-y-3">
                  <ul className="space-y-2">
                    {proposal.majorStrengths.map((strength, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-indigo-600 mt-1">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main Products/Services */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection('products')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <span>Main Products/Services</span>
                {expandedSections.products ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections.products && (
                <div className="p-4 pt-0 space-y-3">
                  <ul className="space-y-2">
                    {proposal.mainProducts.map((product, i) => (
                      <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-indigo-600 mt-1">•</span>
                        {product}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2">
                    <button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Brand Voice */}
            <div className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleSection('voice')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
              >
                <span>Brand Voice & Personality</span>
                {expandedSections.voice ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
              {expandedSections.voice && (
                <div className="p-4 pt-0 space-y-3">
                  <p className="text-sm text-gray-700 italic">"{proposal.brandVoice}"</p>
                  <div className="flex gap-2">
                    <button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1">
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
                      <Check className="w-4 h-4" />
                      Looks right
                    </button>
                  </div>
                </div>
              )}
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
              onClick={handleSave}
              className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <Check className="w-5 h-5" />
              Save Brand Foundation
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions to generate AI-like proposals
function generateAudience(category: string, description: string): string {
  const audiences: Record<string, string> = {
    'Fashion & Apparel': 'Young professionals (25-35) who value personal style and quality craftsmanship',
    'Food & Beverage': 'Health-conscious millennials seeking authentic, sustainable food experiences',
    'Beauty & Cosmetics': 'Self-care enthusiasts (20-40) looking for clean, effective beauty solutions',
    'Home & Lifestyle': 'Design-minded individuals who appreciate thoughtful, well-made home goods',
    'Health & Wellness': 'Wellness-focused individuals seeking holistic approaches to better living'
  };
  return audiences[category] || 'Discerning customers who value quality, authenticity, and meaningful brands';
}

function generateStrengths(description: string): string[] {
  return [
    'Quality craftsmanship and attention to detail',
    'Sustainable and ethical practices',
    'Authentic brand story and values',
    'Unique design aesthetic'
  ];
}

function generateProducts(category: string, description: string): string[] {
  const products: Record<string, string[]> = {
    'Fashion & Apparel': ['Seasonal collections', 'Core wardrobe essentials', 'Limited edition pieces'],
    'Food & Beverage': ['Artisanal food products', 'Specialty beverages', 'Seasonal offerings'],
    'Beauty & Cosmetics': ['Skincare line', 'Color cosmetics', 'Wellness products'],
    'Home & Lifestyle': ['Home decor', 'Functional accessories', 'Decorative pieces']
  };
  return products[category] || ['Core products', 'Seasonal offerings', 'Special collections'];
}

function generateVoice(description: string): string {
  return 'Warm, approachable, and authentic with a focus on quality and craftsmanship';
}