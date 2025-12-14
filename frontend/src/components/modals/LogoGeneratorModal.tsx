import React, { useState } from 'react';
import { X, Sparkles, RefreshCw } from 'lucide-react';

interface LogoGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogoGenerated: (logoUrl: string) => void;
}

export function LogoGeneratorModal({ isOpen, onClose, onLogoGenerated }: LogoGeneratorModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [logos, setLogos] = useState<string[]>([
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1618761714954-0b8cd0026356?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=200&h=200&fit=crop',
    'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=200&h=200&fit=crop'
  ]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Simulate new logos
    setLogos([
      'https://images.unsplash.com/photo-1635322966219-b75ed372eb01?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1618761714954-0b8cd0026356?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1634942537034-2531766767d1?w=200&h=200&fit=crop',
      'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=200&h=200&fit=crop'
    ]);
    setIsGenerating(false);
  };

  const handleSelectLogo = (logoUrl: string) => {
    onLogoGenerated(logoUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg">Generate Logo</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">Select a logo design:</p>
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'Regenerate'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {logos.map((logoUrl, index) => (
              <button
                key={index}
                onClick={() => handleSelectLogo(logoUrl)}
                className="border-2 border-gray-200 rounded-lg p-6 hover:border-indigo-500 hover:bg-indigo-50 transition-all"
              >
                <img
                  src={logoUrl}
                  alt={`Logo option ${index + 1}`}
                  className="w-full h-32 object-contain"
                />
              </button>
            ))}
          </div>

          <div className="mt-6">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}