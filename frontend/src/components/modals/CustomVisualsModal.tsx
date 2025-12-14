import React, { useState } from 'react';
import { X, Upload, Type } from 'lucide-react';

interface CustomVisualsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (custom: { type: 'upload' | 'text'; value: string }) => void;
}

export function CustomVisualsModal({ isOpen, onClose, onSave }: CustomVisualsModalProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('text');
  const [textValue, setTextValue] = useState('');

  const handleSave = () => {
    if (activeTab === 'text' && textValue.trim()) {
      onSave({ type: 'text', value: textValue });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <h2 className="text-lg">Custom Visuals</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab('text')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 transition-all ${
                activeTab === 'text'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Type className="w-4 h-4" />
              Describe
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg border-2 transition-all ${
                activeTab === 'upload'
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>

          {activeTab === 'text' ? (
            <div>
              <label className="block text-sm mb-2">Describe exactly what you want:</label>
              <textarea
                value={textValue}
                onChange={(e) => setTextValue(e.target.value)}
                placeholder="E.g., Modern minimalist product shots with natural lighting, clean backgrounds..."
                className="w-full h-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm text-gray-600 mb-2">Drag and drop images here</p>
              <p className="text-xs text-gray-500 mb-4">or</p>
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm">
                Browse Files
              </button>
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={activeTab === 'text' && !textValue.trim()}
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
