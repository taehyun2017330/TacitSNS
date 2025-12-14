import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

const POST_CATEGORIES = [
  {
    name: 'Emotional Brand Posts',
    description: 'Posts that evoke feelings and emotions through inspiring stories, humor, or emotionally expressive language. Creates emotional connection with your audience.'
  },
  {
    name: 'Functional Brand Posts',
    description: 'Posts that highlight your product\'s benefits, features, quality, or performance. Shows what your products do and why they\'re valuable.'
  },
  {
    name: 'Educational Brand Posts',
    description: 'Posts that teach your audience something new - how-to tips, industry insights, product tutorials, or useful information related to your field.'
  },
  {
    name: 'Brand Resonance Posts',
    description: 'Posts that showcase your brand identity - your logo, brand story, values, or what makes your brand unique. Reinforces who you are as a brand.'
  },
  {
    name: 'Experiential Brand Posts',
    description: 'Posts that highlight sensory experiences or events - how products look, feel, taste, or experiences at brand events, launches, or festivals.'
  },
  {
    name: 'Current Event Posts',
    description: 'Posts that connect to what\'s happening now - holidays, seasons, trending topics, cultural moments, or timely events your audience cares about.'
  },
  {
    name: 'Personal Brand Posts',
    description: 'Posts that feel personal and relatable - stories about family, friendship, personal experiences, or themes that resonate on a human level.'
  },
  {
    name: 'Employee Brand Posts',
    description: 'Posts featuring your team - their expertise, perspectives, behind-the-scenes insights, or personal stories from people who make your brand.'
  },
  {
    name: 'Brand Community Posts',
    description: 'Posts that build and engage your community - acknowledging fans, encouraging participation, featuring user-generated content, or welcoming new followers.'
  },
  {
    name: 'Customer Relationship Posts',
    description: 'Posts that invite customer interaction - asking for feedback, sharing testimonials, responding to customer needs, or showcasing customer experiences.'
  },
  {
    name: 'Cause-Related Brand Posts',
    description: 'Posts about social causes or initiatives your brand supports - sustainability efforts, community programs, or charitable work you\'re involved in.'
  },
  {
    name: 'Sales Promotion Posts',
    description: 'Posts designed to drive purchases - special offers, discounts, new product announcements, competitions, or limited-time deals.'
  }
];

interface PostTypeSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  postIndex: number;
  currentType?: string;
  onSelect: (postIndex: number, category: string) => void;
}

export function PostTypeSelectorModal({
  isOpen,
  onClose,
  postIndex,
  currentType,
  onSelect
}: PostTypeSelectorModalProps) {
  const [selectedCategory, setSelectedCategory] = useState(currentType || '');

  const handleSelect = () => {
    if (selectedCategory) {
      onSelect(postIndex, selectedCategory);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg">Select Post Type for Position {postIndex + 1}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {POST_CATEGORIES.map((category, index) => (
              <button
                key={index}
                onClick={() => setSelectedCategory(category.name)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  selectedCategory === category.name
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-sm mb-1">{category.name}</h3>
                    <p className="text-xs text-gray-600">{category.description}</p>
                  </div>
                  {selectedCategory === category.name && (
                    <Check className="w-5 h-5 text-indigo-600 ml-3 flex-shrink-0" />
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSelect}
              disabled={!selectedCategory}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
