import React from 'react';
import { Sparkles, Loader2 } from 'lucide-react';

interface GeneratingPostsScreenProps {
  themeName: string;
  postsCount: number;
}

export function GeneratingPostsScreen({ themeName, postsCount }: GeneratingPostsScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        <div className="bg-white rounded-lg p-8 border border-gray-200 shadow-sm">
          {/* Animation */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Sparkles className="w-16 h-16 text-indigo-600 animate-pulse" />
              <Loader2 className="w-16 h-16 text-indigo-400 absolute top-0 left-0 animate-spin" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-semibold text-center mb-3">
            Generating Your Posts
          </h2>

          {/* Description */}
          <p className="text-gray-600 text-center mb-6">
            Creating {postsCount} AI-powered posts for "{themeName}"
          </p>

          {/* Progress indicator */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
              <span>Generating images with Gemini AI...</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <span>Creating captions with AI...</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-700">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
              <span>Uploading to Firebase Storage...</span>
            </div>
          </div>

          {/* Note */}
          <p className="text-xs text-gray-500 text-center mt-6">
            This may take a minute. Please don't close this window.
          </p>
        </div>
      </div>
    </div>
  );
}
