import React, { useState } from 'react';
import { X } from 'lucide-react';

interface CustomCaptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (caption: string) => void;
}

export function CustomCaptionModal({ isOpen, onClose, onSave }: CustomCaptionModalProps) {
  const [captionValue, setCaptionValue] = useState('');

  const handleSave = () => {
    if (captionValue.trim()) {
      onSave(captionValue);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full">
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg">Custom Caption Style</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <label className="block text-sm mb-2">Describe your caption style:</label>
          <textarea
            value={captionValue}
            onChange={(e) => setCaptionValue(e.target.value)}
            placeholder="E.g., Short, witty captions with a friendly tone. Always include a call-to-action and 3-5 relevant hashtags..."
            className="w-full h-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />

          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!captionValue.trim()}
              className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
