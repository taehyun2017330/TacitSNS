import React from 'react';
import { Sparkles, ArrowLeft, Check } from 'lucide-react';

interface ThemeOption {
  name: string;
  mood: string;
  colors: string[];
  imagery: string;
  tone: string;
  captionLength: string;
  useEmojis: boolean;
  useHashtags: boolean;
  imageUrl: string;
}

interface ThemeSelectionScreenProps {
  themeOptions: ThemeOption[];
  isGenerating: boolean;
  onSelectTheme: (theme: ThemeOption) => void;
  onBack: () => void;
}

export function ThemeSelectionScreen({
  themeOptions,
  isGenerating,
  onSelectTheme,
  onBack
}: ThemeSelectionScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-indigo-600">
              <Sparkles className="w-6 h-6" />
              <span>Choose Your Theme</span>
            </div>
          </div>
          {isGenerating && (
            <div className="text-sm text-gray-600 flex items-center gap-2">
              <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
              Generating theme options...
            </div>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="mb-6">
          <h2 className="text-2xl mb-2">Pick a Theme to Get Started</h2>
          <p className="text-gray-600">
            We've generated {themeOptions.length}{isGenerating ? '+' : ''} unique theme{themeOptions.length !== 1 ? 's' : ''} based on your brand.
            Click on any theme to select it and customize further.
          </p>
        </div>

        <div className="grid grid-cols-5 gap-6">
          {themeOptions.map((theme, index) => (
            <ThemeCard
              key={index}
              theme={theme}
              index={index}
              onSelect={() => onSelectTheme(theme)}
            />
          ))}

          {/* Skeleton loaders for remaining themes */}
          {isGenerating && Array.from({ length: 5 - themeOptions.length }).map((_, index) => (
            <div key={`skeleton-${index}`} className="space-y-4">
              <div className="aspect-square bg-gray-200 rounded-lg animate-pulse flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
                <div className="flex gap-1">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-gray-200 animate-pulse" />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

function ThemeCard({ theme, index, onSelect }: {
  theme: ThemeOption;
  index: number;
  onSelect: () => void;
}) {
  return (
    <div
      onClick={onSelect}
      className="cursor-pointer group"
      style={{
        animation: 'fadeIn 0.5s ease-in',
      }}
    >
      {/* Image */}
      <div className="relative aspect-square rounded-lg overflow-hidden mb-4 border-2 border-gray-200 group-hover:border-indigo-500 transition-all group-hover:shadow-lg">
        <img
          src={theme.imageUrl}
          alt={theme.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all" />
        <div className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-lg">
          <Check className="w-5 h-5 text-indigo-600" />
        </div>
      </div>

      {/* Theme Details */}
      <div className="space-y-2">
        <h3 className="font-medium text-sm group-hover:text-indigo-600 transition-colors">
          {theme.name}
        </h3>
        <div className="text-xs text-gray-600">
          <div>{theme.mood} • {theme.tone}</div>
          <div>{theme.imagery}</div>
        </div>
        <div className="flex gap-1">
          {theme.colors.map((color, i) => (
            <div
              key={i}
              className="w-6 h-6 rounded-full border border-gray-300"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
