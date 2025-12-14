import React, { useState } from 'react';
import { Sparkles, ArrowRight, ArrowLeft, Upload, X, Check } from 'lucide-react';

interface ReferenceImagesScreenProps {
  data: Partial<{ referenceImages: string[]; logoImage?: string }>;
  onNext: (data: { referenceImages: string[]; logoImage?: string }) => void;
  onBack: () => void;
  onSkip: () => void;
}

export function ReferenceImagesScreen({ data, onNext, onBack, onSkip }: ReferenceImagesScreenProps) {
  const [images, setImages] = useState<string[]>(data.referenceImages || []);
  const [logoImage, setLogoImage] = useState<string | undefined>(data.logoImage);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // Simulate file upload by creating placeholder URLs
      const newImages = Array.from(files).map((file, i) => 
        URL.createObjectURL(file)
      );
      setImages([...images, ...newImages]);
    }
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 text-indigo-600">
            <Sparkles className="w-6 h-6" />
            <span>Brand Generator</span>
          </div>
          <span className="text-sm text-gray-500">Step 3 of 4</span>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-8">
          <h1 className="text-3xl mb-2">Add reference images</h1>
          <p className="text-gray-600 mb-8">Optional but helps us understand your aesthetic</p>

          <div className="space-y-6">
            <label className="block">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors cursor-pointer">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-sm mb-2">Drag & drop or click to upload</p>
                <ul className="text-xs text-gray-500 space-y-1">
                  <li>• Your logo</li>
                  <li>• Product photos</li>
                  <li>• Inspiration images</li>
                </ul>
              </div>
            </label>

            {images.length > 0 && (
              <div>
                <p className="text-sm mb-3">Uploaded ({images.length}) - Click an image to set as logo:</p>
                <div className="grid grid-cols-4 gap-4">
                  {images.map((img, i) => (
                    <div 
                      key={i} 
                      className="relative group cursor-pointer"
                      onClick={() => setLogoImage(img)}
                    >
                      <img
                        src={img}
                        alt={`Upload ${i + 1}`}
                        className={`w-full h-24 object-cover rounded-lg ${
                          logoImage === img ? 'ring-4 ring-indigo-500' : ''
                        }`}
                      />
                      {logoImage === img && (
                        <div className="absolute top-1 left-1 bg-indigo-500 text-white p-1 rounded-full">
                          <Check className="w-4 h-4" />
                        </div>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (logoImage === img) setLogoImage(undefined);
                          removeImage(i);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {logoImage && (
                  <p className="text-xs text-indigo-600 mt-2">✓ Logo selected</p>
                )}
              </div>
            )}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800 px-6 py-3 rounded-lg transition-colors flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              Back
            </button>
            <div className="flex gap-3">
              <button
                onClick={onSkip}
                className="text-gray-600 hover:text-gray-800 px-6 py-3 rounded-lg transition-colors"
              >
                Skip
              </button>
              <button
                onClick={() => onNext({ referenceImages: images, logoImage })}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}