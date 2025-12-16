import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, Save, Copy, Trash2, RefreshCw, Heart, MessageCircle, Send, Bookmark, Wand2 } from 'lucide-react';
import type { ThemeData, PostData } from '../../App';
import { CustomVisualsModal } from '../modals/CustomVisualsModal';
import { CustomCaptionModal } from '../modals/CustomCaptionModal';
import { PostTypeSelectorModal } from '../modals/PostTypeSelectorModal';

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

interface ThemeProposalScreenProps {
  brandId: string;
  themeData: Partial<ThemeData>;
  onSave: (theme: Partial<ThemeData>) => void;
  onGeneratePosts: (theme: Partial<ThemeData>) => void;
  onRegenerateImages: (themeParams: {
    name: string;
    mood: string;
    colors: string[];
    imagery: string;
    tone: string;
    captionLength: string;
    useEmojis: boolean;
    useHashtags: boolean;
  }) => void;
  onBack: () => void;
  generatedPosts?: PostData[];
  isGenerating?: boolean;
  themeOptions?: ThemeOption[];
}

const MOODS = ['Professional', 'Playful', 'Elegant', 'Bold', 'Minimal', 'Warm', 'Modern'];
const IMAGERY_STYLES = ['Product-focused', 'Lifestyle', 'Flat lay', 'In-use', 'Behind-the-scenes'];
const TONES = ['Professional', 'Casual', 'Inspirational', 'Educational', 'Conversational'];

export function ThemeProposalScreen({
  brandId,
  themeData,
  onSave,
  onGeneratePosts,
  onRegenerateImages,
  onBack,
  generatedPosts = [],
  isGenerating = false,
  themeOptions = []
}: ThemeProposalScreenProps) {
  const [name, setName] = useState(themeData.name || '');
  const [postsCount, setPostsCount] = useState(themeData.postsCount || 5);
  const [mood, setMood] = useState(themeData.mood || 'Professional');
  const [colors, setColors] = useState(themeData.colors || ['#4F46E5', '#EC4899', '#F59E0B', '#10B981']);
  const [imagery, setImagery] = useState(themeData.imagery || 'Product-focused');
  const [tone, setTone] = useState(themeData.tone || 'Professional');
  const [captionLength, setCaptionLength] = useState(themeData.captionLength || 'medium');
  const [useEmojis, setUseEmojis] = useState(themeData.useEmojis ?? false);
  const [useHashtags, setUseHashtags] = useState(themeData.useHashtags ?? true);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [showCustomVisuals, setShowCustomVisuals] = useState(false);
  const [showCustomCaption, setShowCustomCaption] = useState(false);
  const [showPostTypeSelector, setShowPostTypeSelector] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [postTypes, setPostTypes] = useState<string[]>(Array(9).fill('Emotional Brand Posts'));
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);

  const selectedImage = generatedPosts.find(post => post.id === selectedImageId);

  // Check if we're waiting for theme parameters to be generated
  const isGeneratingTheme = isGenerating && themeOptions.length === 0 && !name && !themeData.name;

  // Handle theme option selection
  const handleSelectThemeOption = (index: number) => {
    const theme = themeOptions[index];
    if (theme) {
      setSelectedThemeIndex(index);
      setName(theme.name);
      setMood(theme.mood);
      setColors(theme.colors);
      setImagery(theme.imagery);
      setTone(theme.tone);
      setCaptionLength(theme.captionLength);
      setUseEmojis(theme.useEmojis);
      setUseHashtags(theme.useHashtags);
    }
  };

  // Auto-select first theme option when they arrive
  useEffect(() => {
    if (themeOptions.length > 0 && selectedThemeIndex === 0) {
      handleSelectThemeOption(0);
    }
  }, [themeOptions]);

  // Set first generated post as selected when posts arrive
  useEffect(() => {
    if (generatedPosts.length > 0 && !selectedImageId) {
      setSelectedImageId(generatedPosts[0].id);
    }
  }, [generatedPosts]);

  const handleSave = () => {
    const theme: Partial<ThemeData> = {
      id: themeData.id || Date.now().toString(),
      brandId,
      name: name || 'Untitled Theme',
      postsCount,
      mood,
      colors,
      imagery,
      tone,
      captionLength,
      useEmojis,
      useHashtags,
      posts: themeData.posts || []
    };
    onSave(theme);
  };

  const handleGenerateImages = () => {
    const theme: Partial<ThemeData> = {
      id: themeData.id || Date.now().toString(),
      brandId,
      name: name || 'Untitled Theme',
      postsCount: 5, // Always generate 5 image variations
      mood,
      colors,
      imagery,
      tone,
      captionLength,
      useEmojis,
      useHashtags,
      posts: themeData.posts || []
    };
    onGeneratePosts(theme);
  };

  const handleRegenerate = () => {
    onRegenerateImages({
      name,
      mood,
      colors,
      imagery,
      tone,
      captionLength,
      useEmojis,
      useHashtags
    });
  };

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
              <span>Theme Proposal</span>
            </div>
          </div>
          <button
            onClick={handleGenerateImages}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
            disabled={isGenerating}
          >
            {isGenerating ? 'Generating...' : 'Generate Posts →'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-2 gap-8">
          {/* Left Side - Settings */}
          <div className="space-y-6">
            {isGeneratingTheme ? (
              /* Loading skeleton while generating theme parameters */
              <>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <Sparkles className="w-5 h-5 text-indigo-600 animate-spin" />
                    <span className="text-sm text-indigo-600">Generating theme parameters with AI...</span>
                  </div>
                  <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                </div>
                <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                  <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-20 bg-gray-200 rounded-lg animate-pulse" />
                </div>
                <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-24" />
                  <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-10 bg-gray-200 rounded-lg animate-pulse" />
                  <div className="h-16 bg-gray-200 rounded-lg animate-pulse" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm mb-2">Theme Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Summer Launch 2024"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

            {/* Visual Options */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm mb-4">Visual Options</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Mood</label>
                  <select
                    value={mood}
                    onChange={(e) => setMood(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {MOODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Imagery Style</label>
                  <select
                    value={imagery}
                    onChange={(e) => setImagery(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {IMAGERY_STYLES.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Color Palette (Click to Edit)</label>
                  <div className="grid grid-cols-4 gap-3">
                    {colors.map((color, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <div className="relative w-12 h-12">
                          <input
                            type="color"
                            value={color}
                            onChange={(e) => {
                              const newColors = [...colors];
                              newColors[i] = e.target.value;
                              setColors(newColors);
                            }}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            title={`Color ${i + 1}`}
                          />
                          <div
                            className="w-12 h-12 rounded-full border-2 border-gray-300 cursor-pointer"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 text-center">{color}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setShowCustomVisuals(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  I know exactly what I want
                </button>
              </div>
            </div>

            {/* Caption Options */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <h3 className="text-sm mb-4">Caption Options</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-2">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {TONES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm mb-2">Caption Length</label>
                  <div className="flex items-center gap-4">
                    <span className="text-xs">Short</span>
                    <input
                      type="range"
                      min="0"
                      max="2"
                      value={captionLength === 'short' ? 0 : captionLength === 'medium' ? 1 : 2}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCaptionLength(val === 0 ? 'short' : val === 1 ? 'medium' : 'long');
                      }}
                      className="flex-1"
                    />
                    <span className="text-xs">Long</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useEmojis}
                      onChange={(e) => setUseEmojis(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Include Emojis</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={useHashtags}
                      onChange={(e) => setUseHashtags(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Include Hashtags (Custom hashtags)</span>
                  </label>
                </div>

                <button
                  onClick={() => setShowCustomCaption(true)}
                  className="text-sm text-indigo-600 hover:text-indigo-700"
                >
                  I know exactly what I want
                </button>
              </div>
            </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-2">
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm flex items-center gap-2">
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Right Side - Image Exploration */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm">Visual Exploration</h3>
                <button
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                  className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Regenerate'}
                </button>
              </div>

              {/* Instagram Mockup */}
              <div className="bg-white border border-gray-300 rounded-lg overflow-hidden mb-4">
                {/* Instagram Header */}
                <div className="flex items-center justify-between p-3 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 p-0.5">
                      <div className="w-full h-full rounded-full bg-white" />
                    </div>
                    <span className="text-sm">your_brand</span>
                  </div>
                  <div className="text-lg">•••</div>
                </div>

                {/* Instagram Image */}
                <div className="relative">
                  {themeOptions.length > 0 && themeOptions[selectedThemeIndex] ? (
                    <img
                      src={themeOptions[selectedThemeIndex].imageUrl}
                      alt="Instagram post preview"
                      className="w-full aspect-square object-cover"
                    />
                  ) : isGenerating ? (
                    <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                      <Sparkles className="w-12 h-12 text-gray-400 animate-spin" />
                    </div>
                  ) : (
                    <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                      <div className="text-center px-4">
                        <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">AI will generate theme options for you</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Instagram Actions */}
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                      <Heart className="w-6 h-6" />
                      <MessageCircle className="w-6 h-6" />
                      <Send className="w-6 h-6" />
                    </div>
                    <Bookmark className="w-6 h-6" />
                  </div>
                  <p className="text-sm">
                    <span>{mood} {tone.toLowerCase()} post with {imagery.toLowerCase()} imagery</span>
                  </p>
                </div>
              </div>

              {/* Theme Options Grid */}
              {(themeOptions.length > 0 || isGenerating) && (
                <div>
                  <p className="text-xs text-gray-600 mb-2">Pick a theme:</p>
                  <div className="grid grid-cols-5 gap-2">
                    {themeOptions.slice(0, 5).map((theme, index) => (
                      <div
                        key={index}
                        onClick={() => handleSelectThemeOption(index)}
                        className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                          selectedThemeIndex === index
                            ? 'border-indigo-500 ring-2 ring-indigo-200'
                            : 'border-gray-200 hover:border-indigo-300'
                        }`}
                        style={{
                          animation: 'fadeIn 0.5s ease-in',
                        }}
                      >
                        <img
                          src={theme.imageUrl}
                          alt={theme.name}
                          className="w-full aspect-square object-cover"
                        />
                      </div>
                    ))}
                    {/* Show skeleton loaders for remaining themes while generating */}
                    {isGenerating && Array.from({ length: 5 - themeOptions.length }).map((_, index) => (
                      <div key={`skeleton-${index}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-200 animate-pulse">
                        <div className="w-full h-full flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-gray-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <CustomVisualsModal
        isOpen={showCustomVisuals}
        onClose={() => setShowCustomVisuals(false)}
        onSave={(custom) => console.log('Custom visuals:', custom)}
      />
      <CustomCaptionModal
        isOpen={showCustomCaption}
        onClose={() => setShowCustomCaption(false)}
        onSave={(caption) => console.log('Custom caption:', caption)}
      />
      <PostTypeSelectorModal
        isOpen={showPostTypeSelector}
        onClose={() => setShowPostTypeSelector(false)}
        postIndex={selectedPostIndex}
        currentType={postTypes[selectedPostIndex]}
        onSelect={(index, category) => {
          const newPostTypes = [...postTypes];
          newPostTypes[index] = category;
          setPostTypes(newPostTypes);
        }}
      />
    </div>
  );
}