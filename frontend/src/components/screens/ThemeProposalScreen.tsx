import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, Save, Copy, Trash2, RefreshCw, Heart, MessageCircle, Send, Bookmark, Wand2 } from 'lucide-react';
import type { ThemeData } from '../../App';
import { CustomVisualsModal } from '../modals/CustomVisualsModal';
import { CustomCaptionModal } from '../modals/CustomCaptionModal';
import { PostTypeSelectorModal } from '../modals/PostTypeSelectorModal';

interface ThemeProposalScreenProps {
  brandId: string;
  themeData: Partial<ThemeData>;
  onSave: (theme: Partial<ThemeData>) => void;
  onGeneratePosts: () => void;
  onBack: () => void;
}

const MOODS = ['Professional', 'Playful', 'Elegant', 'Bold', 'Minimal', 'Warm', 'Modern'];
const IMAGERY_STYLES = ['Product-focused', 'Lifestyle', 'Flat lay', 'In-use', 'Behind-the-scenes'];
const TONES = ['Professional', 'Casual', 'Inspirational', 'Educational', 'Conversational'];

interface ImageOption {
  id: string;
  url: string;
  mood: string;
  colors: string[];
  tone: string;
}

export function ThemeProposalScreen({
  brandId,
  themeData,
  onSave,
  onGeneratePosts,
  onBack
}: ThemeProposalScreenProps) {
  const [name, setName] = useState(themeData.name || '');
  const [postsCount, setPostsCount] = useState(themeData.postsCount || 5);
  const [mood, setMood] = useState(themeData.mood || 'Professional');
  const [colors, setColors] = useState(themeData.colors || ['#4F46E5', '#EC4899', '#F59E0B', '#10B981']);
  const [imagery, setImagery] = useState(themeData.imagery || 'Product-focused');
  const [tone, setTone] = useState(themeData.tone || 'Professional');
  const [captionLength, setCaptionLength] = useState(themeData.captionLength || 'medium');
  const [useHashtags, setUseHashtags] = useState(themeData.useHashtags ?? true);
  const [imageOptions, setImageOptions] = useState<ImageOption[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showCustomVisuals, setShowCustomVisuals] = useState(false);
  const [showCustomCaption, setShowCustomCaption] = useState(false);
  const [showPostTypeSelector, setShowPostTypeSelector] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState(0);
  const [postTypes, setPostTypes] = useState<string[]>(Array(9).fill('Emotional Brand Posts'));

  const selectedImage = imageOptions.find(img => img.id === selectedImageId);

  useEffect(() => {
    // Generate initial image options
    generateImageOptions();
  }, []);

  const generateImageOptions = async () => {
    setIsGenerating(true);
    // Simulate AI generation delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newOptions: ImageOption[] = [
      {
        id: '1',
        url: 'https://images.unsplash.com/photo-1707127786343-0dcce4c76ca0?w=600',
        mood: 'Professional',
        colors: ['#4F46E5', '#1E40AF', '#8B5CF6', '#10B981'],
        tone: 'Professional'
      },
      {
        id: '2',
        url: 'https://images.unsplash.com/photo-1728836882608-6911cc2d6fb6?w=600',
        mood: 'Warm',
        colors: ['#F59E0B', '#DC2626', '#EC4899', '#8B5CF6'],
        tone: 'Casual'
      },
      {
        id: '3',
        url: 'https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=600',
        mood: 'Minimal',
        colors: ['#6B7280', '#D1D5DB', '#4F46E5', '#10B981'],
        tone: 'Inspirational'
      },
      {
        id: '4',
        url: 'https://images.unsplash.com/photo-1622814859704-c6cd5ae75dd0?w=600',
        mood: 'Bold',
        colors: ['#DC2626', '#F59E0B', '#4F46E5', '#EC4899'],
        tone: 'Conversational'
      },
      {
        id: '5',
        url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600',
        mood: 'Modern',
        colors: ['#10B981', '#059669', '#4F46E5', '#F59E0B'],
        tone: 'Educational'
      }
    ];
    
    setImageOptions(newOptions);
    setSelectedImageId(newOptions[0].id);
    setIsGenerating(false);
  };

  const handleSelectImage = (imageId: string) => {
    setSelectedImageId(imageId);
    const image = imageOptions.find(img => img.id === imageId);
    if (image) {
      setMood(image.mood);
      setColors(image.colors);
      setTone(image.tone);
    }
  };

  const handleRegenerate = () => {
    generateImageOptions();
  };

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
      useHashtags,
      posts: themeData.posts || []
    };
    onSave(theme);
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
            onClick={onGeneratePosts}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            Generate Posts →
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-2 gap-8">
          {/* Left Side - Settings */}
          <div className="space-y-6">
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
                  <label className="block text-sm mb-2">Color Palette</label>
                  <div className="flex gap-2">
                    {colors.map((color, i) => (
                      <div
                        key={i}
                        className="w-12 h-12 rounded-lg border-2 border-gray-300"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm mb-2">Main Color</label>
                  <div className="flex gap-2">
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-gray-300"
                      style={{ backgroundColor: colors[0] }}
                    />
                    <input
                      type="color"
                      value={colors[0]}
                      onChange={(e) => {
                        const newColors = [...colors];
                        newColors[0] = e.target.value;
                        setColors(newColors);
                      }}
                      className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
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

                <div>
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
          </div>

          {/* Right Side - Instagram Mockup with Image Exploration */}
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
                  {selectedImage ? (
                    <img
                      src={selectedImage.url}
                      alt="Instagram post preview"
                      className="w-full aspect-square object-cover"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
                      <p className="text-sm text-gray-400">Select an image style</p>
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

              {/* Image Options Grid */}
              <div>
                <p className="text-xs text-gray-600 mb-2">Pick a style (AI will generate similar images):</p>
                <div className="grid grid-cols-5 gap-2">
                  {imageOptions.map((option) => (
                    <div
                      key={option.id}
                      onClick={() => handleSelectImage(option.id)}
                      className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                        selectedImageId === option.id
                          ? 'border-indigo-500 ring-2 ring-indigo-200'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <img
                        src={option.url}
                        alt={`Option ${option.id}`}
                        className="w-full aspect-square object-cover"
                      />
                    </div>
                  ))}
                </div>
                {selectedImage && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-1">Selected Style:</p>
                    <p className="text-sm">
                      <span className="font-medium">{selectedImage.mood}</span> mood • {selectedImage.tone} tone
                    </p>
                  </div>
                )}
              </div>
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