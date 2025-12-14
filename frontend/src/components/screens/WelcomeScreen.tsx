import React from 'react';
import { ArrowRight, Sparkles, FolderOpen, Download } from 'lucide-react';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 text-indigo-600 mb-6">
            <Sparkles className="w-10 h-10" />
          </div>
          <h1 className="text-5xl mb-4">Brand Content Generator</h1>
          <p className="text-xl text-gray-600 max-w-lg mx-auto">
            Transform your brand vision into social content with AI
          </p>
        </div>

        <div className="flex flex-col gap-4 mb-12 max-w-sm mx-auto">
          <button
            onClick={onGetStarted}
            className="bg-indigo-600 text-white px-8 py-4 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
          >
            Get Started
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="text-gray-600 hover:text-gray-800 transition-colors">
            Sign In
          </button>
        </div>

        <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-indigo-600" />
            </div>
            <h3 className="text-sm">Create Brand</h3>
            <p className="text-xs text-gray-600">Define your brand identity and voice</p>
          </div>
          
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
              <FolderOpen className="w-8 h-8 text-purple-600" />
            </div>
            <h3 className="text-sm">Organize Themes</h3>
            <p className="text-xs text-gray-600">Create themed content collections</p>
          </div>
          
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center">
              <Download className="w-8 h-8 text-pink-600" />
            </div>
            <h3 className="text-sm">Export Content</h3>
            <p className="text-xs text-gray-600">Schedule and publish to social media</p>
          </div>
        </div>
      </div>
    </div>
  );
}
