import React, { useState } from 'react';
import { Sparkles, Plus, FolderOpen, Palette, ChevronDown, ChevronRight, Trash2, Search, User, Settings, Image as ImageIcon, Bookmark } from 'lucide-react';
import type { BrandData, ThemeData, PostData } from '../../App';
import { LogoGeneratorModal } from '../modals/LogoGeneratorModal';
import { SavedPostsView } from './SavedPostsView';

interface MainDashboardProps {
  brands: BrandData[];
  themes: ThemeData[];
  selectedBrandId: string | null;
  selectedThemeId: string | null;
  onSelectBrand: (brandId: string | null) => void;
  onSelectTheme: (themeId: string | null) => void;
  onCreateBrand: () => void;
  onCreateTheme: () => void;
  onViewTheme: (themeId: string) => void;
  onGeneratePosts: (themeId: string) => void;
  onViewSavedPosts: (brandId: string) => void;
  savedPosts: PostData[];
  showingSavedPosts: boolean;
  onSchedulePost: (post: PostData, scheduledTime: string) => void;
  onRemovePost: (postId: string) => void;
  onEditPost: (post: PostData, prompt: string) => void;
}

export function MainDashboard({
  brands,
  themes,
  selectedBrandId,
  selectedThemeId,
  onSelectBrand,
  onSelectTheme,
  onCreateBrand,
  onCreateTheme,
  onViewTheme,
  onGeneratePosts,
  onViewSavedPosts,
  savedPosts,
  showingSavedPosts,
  onSchedulePost,
  onRemovePost,
  onEditPost
}: MainDashboardProps) {
  const [expandedBrands, setExpandedBrands] = useState<Record<string, boolean>>({});

  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const brandThemes = themes.filter(t => t.brandId === selectedBrandId);

  const toggleBrand = (brandId: string) => {
    setExpandedBrands({ ...expandedBrands, [brandId]: !expandedBrands[brandId] });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-indigo-600">
            <Sparkles className="w-6 h-6" />
            <span>Brand Generator</span>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <User className="w-5 h-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm text-gray-600">MY BRANDS</h2>
            </div>
            <button
              onClick={onCreateBrand}
              className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 mb-4"
            >
              <Plus className="w-4 h-4" />
              New Brand
            </button>

            {/* Brands List */}
            <div className="space-y-2">
              {brands.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No brands yet</p>
              ) : (
                brands.map(brand => {
                  const isExpanded = expandedBrands[brand.id];
                  const brandThemesForBrand = themes.filter(t => t.brandId === brand.id);
                  
                  return (
                    <div key={brand.id}>
                      <button
                        onClick={() => {
                          toggleBrand(brand.id);
                          onSelectBrand(brand.id);
                          onSelectTheme(null);
                        }}
                        className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left ${selectedBrandId === brand.id && !selectedThemeId ? 'bg-indigo-50 text-indigo-600' : ''}`}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        <FolderOpen className="w-4 h-4" />
                        <span className="text-sm truncate">{brand.name}</span>
                      </button>
                      
                      {isExpanded && (
                        <div className="ml-6 mt-1 space-y-1">
                          {brandThemesForBrand.map(theme => (
                            <button
                              key={theme.id}
                              onClick={() => {
                                onSelectBrand(brand.id);
                                onSelectTheme(theme.id);
                              }}
                              className={`w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left text-sm ${selectedThemeId === theme.id ? 'bg-indigo-50 text-indigo-600' : ''}`}
                            >
                              <Palette className="w-4 h-4" />
                              <span className="truncate">{theme.name}</span>
                            </button>
                          ))}
                          <button
                            onClick={() => {
                              onSelectBrand(brand.id);
                              onCreateTheme();
                            }}
                            className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left text-sm text-gray-500"
                          >
                            <Plus className="w-4 h-4" />
                            <span>New Theme</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-8 pt-8 border-t border-gray-200">
              <button className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors text-left text-sm text-gray-500">
                <Trash2 className="w-4 h-4" />
                <span>Archive</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          {!selectedBrandId ? (
            <EmptyState onCreateBrand={onCreateBrand} />
          ) : selectedThemeId ? (
            <ThemeView
              theme={themes.find(t => t.id === selectedThemeId)!}
              brand={selectedBrand!}
              onGeneratePosts={onGeneratePosts}
            />
          ) : (
            <BrandView
              brand={selectedBrand!}
              themes={brandThemes}
              onCreateTheme={onCreateTheme}
              onViewTheme={onViewTheme}
              onViewSavedPosts={onViewSavedPosts}
              savedPosts={savedPosts}
              showingSavedPosts={showingSavedPosts}
              onSchedulePost={onSchedulePost}
              onRemovePost={onRemovePost}
              onEditPost={onEditPost}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState({ onCreateBrand }: { onCreateBrand: () => void }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-md">
        <h2 className="text-2xl mb-2">Welcome to Brand Generator</h2>
        <p className="text-gray-600 mb-8">
          Create your first brand foundation to get started
        </p>
        <button
          onClick={onCreateBrand}
          className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create Brand Foundation
        </button>
        <div className="mt-8">
          <p className="text-sm text-gray-600 mb-4">Or try a template:</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Fashion</button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Food</button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Beauty</button>
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">Lifestyle</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrandView({ brand, themes, onCreateTheme, onViewTheme, onViewSavedPosts, savedPosts, showingSavedPosts, onSchedulePost, onRemovePost, onEditPost }: {
  brand: BrandData;
  themes: ThemeData[];
  onCreateTheme: () => void;
  onViewTheme: (themeId: string) => void;
  onViewSavedPosts: (brandId: string) => void;
  savedPosts: PostData[];
  showingSavedPosts: boolean;
  onSchedulePost: (post: PostData, scheduledTime: string) => void;
  onRemovePost: (postId: string) => void;
  onEditPost: (post: PostData, prompt: string) => void;
}) {
  const [showLogoGenerator, setShowLogoGenerator] = useState(false);
  const [brandLogo, setBrandLogo] = useState(brand.logoImage);

  // If showing saved posts, render the SavedPostsView instead
  if (showingSavedPosts) {
    return (
      <SavedPostsView
        brand={brand}
        savedPosts={savedPosts}
        onSchedulePost={onSchedulePost}
        onRemovePost={onRemovePost}
        onEditPost={onEditPost}
      />
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FolderOpen className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl">{brand.name}</h1>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            Edit
          </button>
          <button
            onClick={onCreateTheme}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            New Theme
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Saved Posts Quick Access */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              {brand.logoImage && (
                <img
                  src={brand.logoImage}
                  alt={brand.name}
                  className="w-16 h-16 object-cover rounded-lg border-2 border-white shadow-sm"
                />
              )}
              <div>
                <h3 className="text-lg mb-1 flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-indigo-600" />
                  Saved Posts Collection
                </h3>
                <p className="text-sm text-gray-600">
                  {savedPosts.length} posts saved • Ready to schedule and publish
                </p>
              </div>
            </div>
            <button
              onClick={() => onViewSavedPosts(brand.id)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm flex items-center gap-2"
            >
              <ImageIcon className="w-4 h-4" />
              View All Saved Posts
            </button>
          </div>
        </div>

        {/* Brand Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-sm text-gray-600">BRAND INFORMATION</h2>
            {brandLogo ? (
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-2">Brand Logo</p>
                <img
                  src={brandLogo}
                  alt="Brand Logo"
                  className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                />
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-w-xs">
                <p className="text-xs text-yellow-800 mb-2">
                  ⚠️ No brand logo has been detected
                </p>
                <button
                  onClick={() => setShowLogoGenerator(true)}
                  className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded hover:bg-indigo-700 transition-colors"
                >
                  Generate Logo
                </button>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <span className="text-sm text-gray-500">Brand:</span>
              <p>{brand.name}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Category:</span>
              <p>{brand.category}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Created:</span>
              <p>{new Date(brand.createdDate).toLocaleDateString()}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Description:</span>
              <p className="text-sm mt-1">"{brand.description}"</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Target Audience:</span>
              <p className="text-sm mt-1">{brand.targetAudience}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Major Strengths:</span>
              <ul className="text-sm mt-1 space-y-1">
                {brand.majorStrengths.map((s, i) => (
                  <li key={i}>• {s}</li>
                ))}
              </ul>
            </div>
            <div>
              <span className="text-sm text-gray-500">Main Products:</span>
              <ul className="text-sm mt-1 space-y-1">
                {brand.mainProducts.map((p, i) => (
                  <li key={i}>• {p}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Themes */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm text-gray-600 mb-4">THEMES USING THIS BRAND ({themes.length})</h2>
          {themes.length === 0 ? (
            <p className="text-sm text-gray-500">No themes created yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {themes.map(theme => (
                <div key={theme.id} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="mb-1">{theme.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{theme.postsCount} posts</p>
                  <button
                    onClick={() => onViewTheme(theme.id)}
                    className="text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={onCreateTheme}
            className="mt-4 text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            Create New Theme
          </button>
        </div>

        {/* Reference Images */}
        {brand.referenceImages.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-sm text-gray-600 mb-4">REFERENCE IMAGES ({brand.referenceImages.length})</h2>
            <div className="grid grid-cols-6 gap-4">
              {brand.referenceImages.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`Reference ${i + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Logo Generator Modal */}
      <LogoGeneratorModal
        isOpen={showLogoGenerator}
        onClose={() => setShowLogoGenerator(false)}
        onLogoGenerated={setBrandLogo}
      />
    </div>
  );
}

function ThemeView({ theme, brand, onGeneratePosts }: {
  theme: ThemeData;
  brand: BrandData;
  onGeneratePosts: (themeId: string) => void;
}) {
  return (
    <div className="max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Palette className="w-8 h-8 text-indigo-600" />
          <div>
            <h1 className="text-2xl">{theme.name}</h1>
            <p className="text-sm text-gray-600">Theme</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
            Edit
          </button>
          <button
            onClick={() => onGeneratePosts(theme.id)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
          >
            Generate Posts
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Visual Options */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm text-gray-600 mb-4">VISUAL OPTIONS</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Mood:</span>
              <p>{theme.mood}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Imagery Style:</span>
              <p>{theme.imagery}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Color Palette:</span>
              <div className="flex gap-2 mt-2">
                {theme.colors.map((color, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-lg border-2 border-gray-300"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <span className="text-sm text-gray-500">Main Color:</span>
              <div className="flex gap-2 mt-2">
                <div
                  className="w-10 h-10 rounded-lg border-2 border-gray-300"
                  style={{ backgroundColor: theme.colors[0] }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Caption Options */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm text-gray-600 mb-4">CAPTION OPTIONS</h2>
          <div className="space-y-3">
            <div>
              <span className="text-sm text-gray-500">Tone:</span>
              <p>{theme.tone}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Caption Length:</span>
              <p className="capitalize">{theme.captionLength}</p>
            </div>
            <div>
              <span className="text-sm text-gray-500">Include Hashtags:</span>
              <p>{theme.useHashtags ? 'Yes (Custom hashtags)' : 'No'}</p>
            </div>
          </div>
        </div>

        {/* Posts Count */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-sm text-gray-600 mb-4">GENERATED POSTS</h2>
          <div>
            <span className="text-sm text-gray-500">Total Posts:</span>
            <p>{theme.postsCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
}