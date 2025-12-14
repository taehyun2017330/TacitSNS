import React, { useState } from 'react';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { BrandNameScreen } from './components/screens/BrandNameScreen';
import { BrandDescriptionScreen } from './components/screens/BrandDescriptionScreen';
import { ReferenceImagesScreen } from './components/screens/ReferenceImagesScreen';
import { BrandProposalScreen } from './components/screens/BrandProposalScreen';
import { MainDashboard } from './components/screens/MainDashboard';
import { ThemeProposalScreen } from './components/screens/ThemeProposalScreen';
import { GeneratedPostsScreen } from './components/screens/GeneratedPostsScreen';
import { InstagramPreviewScreen } from './components/screens/InstagramPreviewScreen';
import { PublishingSuccessScreen } from './components/screens/PublishingSuccessScreen';
import { PlatformConnectionScreen } from './components/screens/PlatformConnectionScreen';
import { PostEditorModal } from './components/modals/PostEditorModal';
import { ScheduleEditorModal } from './components/modals/ScheduleEditorModal';

export interface BrandData {
  id: string;
  name: string;
  category: string;
  description: string;
  targetAudience: string;
  majorStrengths: string[];
  mainProducts: string[];
  brandVoice: string;
  referenceImages: string[];
  logoImage?: string;
  createdDate: string;
}

export interface ThemeData {
  id: string;
  brandId: string;
  name: string;
  postsCount: number;
  mood: string;
  colors: string[];
  imagery: string;
  tone: string;
  captionLength: string;
  useEmojis: boolean;
  useHashtags: boolean;
  posts: PostData[];
}

export interface PostData {
  id: string;
  themeId: string;
  imageUrl: string;
  caption: string;
  hashtags: string[];
  postType: string;
  selected: boolean;
  scheduledTime?: string;
  status?: 'draft' | 'scheduled' | 'published';
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome');
  const [brands, setBrands] = useState<BrandData[]>([]);
  const [themes, setThemes] = useState<ThemeData[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [tempBrandData, setTempBrandData] = useState<Partial<BrandData>>({});
  const [tempThemeData, setTempThemeData] = useState<Partial<ThemeData>>({});
  const [editingPost, setEditingPost] = useState<PostData | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [savedPosts, setSavedPosts] = useState<PostData[]>([]);
  const [showingSavedPosts, setShowingSavedPosts] = useState(false);
  const [connectedPlatforms, setConnectedPlatforms] = useState({
    instagram: { connected: false, account: '' },
    facebook: { connected: false, account: '' },
    twitter: { connected: false, account: '' },
    linkedin: { connected: false, account: '' },
  });

  const selectedBrand = brands.find(b => b.id === selectedBrandId);
  const selectedTheme = themes.find(t => t.id === selectedThemeId);
  const brandThemes = themes.filter(t => t.brandId === selectedBrandId);
  const brandSavedPosts = savedPosts.filter(p => {
    // Find the theme this post belongs to
    const postTheme = themes.find(t => t.posts.some(tp => tp.id === p.id));
    return postTheme?.brandId === selectedBrandId;
  });

  const handleCreateBrand = (brandData: BrandData) => {
    setBrands([...brands, brandData]);
    setSelectedBrandId(brandData.id);
    setTempBrandData({});
    setCurrentScreen('dashboard');
  };

  const handleCreateTheme = (themeData: ThemeData) => {
    setThemes([...themes, themeData]);
    setSelectedThemeId(themeData.id);
    setTempThemeData({});
    setCurrentScreen('dashboard');
  };

  const handleUpdateTheme = (themeId: string, updates: Partial<ThemeData>) => {
    setThemes(themes.map(t => t.id === themeId ? { ...t, ...updates } : t));
  };

  const handleSelectPosts = (selectedPosts: PostData[]) => {
    if (selectedTheme) {
      const updatedTheme = {
        ...selectedTheme,
        posts: selectedTheme.posts.map(post => ({
          ...post,
          selected: selectedPosts.some(sp => sp.id === post.id)
        }))
      };
      handleUpdateTheme(selectedTheme.id, updatedTheme);
    }
  };

  const handleSchedulePosts = (platform: string, schedule: any) => {
    if (selectedTheme) {
      const selectedPosts = selectedTheme.posts.filter(p => p.selected);
      const updatedPosts = selectedTheme.posts.map(post => {
        if (post.selected) {
          return { ...post, status: 'scheduled' as const };
        }
        return post;
      });
      handleUpdateTheme(selectedTheme.id, { posts: updatedPosts });
      setCurrentScreen('success');
    }
  };

  const renderScreen = () => {
    switch (currentScreen) {
      case 'welcome':
        return <WelcomeScreen onGetStarted={() => setCurrentScreen('brand-name')} />;
      
      case 'brand-name':
        return (
          <BrandNameScreen
            data={tempBrandData}
            onNext={(data) => {
              setTempBrandData({ ...tempBrandData, ...data });
              setCurrentScreen('brand-description');
            }}
          />
        );
      
      case 'brand-description':
        return (
          <BrandDescriptionScreen
            data={tempBrandData}
            onNext={(data) => {
              setTempBrandData({ ...tempBrandData, ...data });
              setCurrentScreen('brand-images');
            }}
            onBack={() => setCurrentScreen('brand-name')}
          />
        );
      
      case 'brand-images':
        return (
          <ReferenceImagesScreen
            data={tempBrandData}
            onNext={(data) => {
              setTempBrandData({ ...tempBrandData, ...data });
              setCurrentScreen('brand-proposal');
            }}
            onBack={() => setCurrentScreen('brand-description')}
            onSkip={() => setCurrentScreen('brand-proposal')}
          />
        );
      
      case 'brand-proposal':
        return (
          <BrandProposalScreen
            data={tempBrandData}
            onSave={handleCreateBrand}
            onBack={() => setCurrentScreen('brand-images')}
          />
        );
      
      case 'dashboard':
        return (
          <MainDashboard
            brands={brands}
            themes={themes}
            selectedBrandId={selectedBrandId}
            selectedThemeId={selectedThemeId}
            onSelectBrand={(brandId) => {
              setSelectedBrandId(brandId);
              setShowingSavedPosts(false);
            }}
            onSelectTheme={(themeId) => {
              setSelectedThemeId(themeId);
              setShowingSavedPosts(false);
            }}
            onCreateBrand={() => {
              setTempBrandData({});
              setCurrentScreen('brand-name');
            }}
            onCreateTheme={() => {
              setTempThemeData({ brandId: selectedBrandId || '' });
              setCurrentScreen('theme-proposal');
            }}
            onViewTheme={(themeId) => {
              setSelectedThemeId(themeId);
              setShowingSavedPosts(false);
            }}
            onGeneratePosts={(themeId) => {
              setSelectedThemeId(themeId);
              setCurrentScreen('generated-posts');
            }}
            onViewSavedPosts={(brandId) => {
              setSelectedBrandId(brandId);
              setSelectedThemeId(null);
              setShowingSavedPosts(true);
            }}
            savedPosts={brandSavedPosts}
            showingSavedPosts={showingSavedPosts}
            onSchedulePost={(post, scheduledTime) => {
              setSavedPosts(savedPosts.map(p =>
                p.id === post.id
                  ? { ...p, scheduledTime, status: 'scheduled' as const }
                  : p
              ));
            }}
            onRemovePost={(postId) => {
              setSavedPosts(savedPosts.filter(p => p.id !== postId));
            }}
            onEditPost={(post, prompt) => {
              // Simulate AI editing - in a real app, this would call an API
              console.log('Editing post with prompt:', prompt);
            }}
          />
        );
      
      case 'theme-proposal':
        return (
          <ThemeProposalScreen
            brandId={selectedBrandId || ''}
            themeData={selectedTheme || tempThemeData}
            onSave={(theme) => {
              if (selectedTheme) {
                handleUpdateTheme(theme.id, theme);
                setCurrentScreen('dashboard');
              } else {
                handleCreateTheme(theme as ThemeData);
              }
            }}
            onGeneratePosts={() => setCurrentScreen('generated-posts')}
            onBack={() => setCurrentScreen('dashboard')}
          />
        );
      
      case 'generated-posts':
        if (!selectedTheme) {
          // If no theme is selected, go back to dashboard
          setCurrentScreen('dashboard');
          return null;
        }
        if (!selectedTheme) {
          // If no theme is selected, go back to dashboard
          setCurrentScreen('dashboard');
          return null;
        }
        return (
          <GeneratedPostsScreen
            theme={selectedTheme}
            onBack={() => setCurrentScreen('theme-proposal')}
            onConfirmSelection={(posts) => {
              handleSelectPosts(posts);
              // Save selected posts to saved posts
              const selectedPostsToSave = posts.filter(p => p.selected);
              setSavedPosts([...savedPosts, ...selectedPostsToSave]);
              setCurrentScreen('instagram-preview');
            }}
            onEditPost={(post) => setEditingPost(post)}
          />
        );
      
      case 'instagram-preview':
        if (!selectedTheme) {
          setCurrentScreen('dashboard');
          return null;
        }
        if (!selectedTheme) {
          setCurrentScreen('dashboard');
          return null;
        }
        return (
          <InstagramPreviewScreen
            theme={selectedTheme}
            connectedPlatforms={connectedPlatforms}
            onBack={() => setCurrentScreen('generated-posts')}
            onEditPost={(post) => setEditingPost(post)}
            onCustomizeSchedule={() => setShowScheduleModal(true)}
            onConnectPlatform={() => setCurrentScreen('platform-connection')}
            onSchedulePublish={handleSchedulePosts}
          />
        );
      
      case 'platform-connection':
        return (
          <PlatformConnectionScreen
            connectedPlatforms={connectedPlatforms}
            onConnect={(platform, account) => {
              setConnectedPlatforms({
                ...connectedPlatforms,
                [platform]: { connected: true, account }
              });
              setCurrentScreen('instagram-preview');
            }}
            onBack={() => setCurrentScreen('instagram-preview')}
          />
        );
      
      case 'success':
        if (!selectedTheme) {
          setCurrentScreen('dashboard');
          return null;
        }
        if (!selectedTheme) {
          setCurrentScreen('dashboard');
          return null;
        }
        return (
          <PublishingSuccessScreen
            theme={selectedTheme}
            onCreateMore={() => {
              setTempThemeData({ brandId: selectedBrandId || '' });
              setCurrentScreen('theme-proposal');
            }}
            onBackToDashboard={() => setCurrentScreen('dashboard')}
          />
        );
      
      default:
        return <WelcomeScreen onGetStarted={() => setCurrentScreen('brand-name')} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderScreen()}
      
      {editingPost && (
        <PostEditorModal
          post={editingPost}
          onClose={() => setEditingPost(null)}
          onSave={(updatedPost) => {
            if (selectedTheme) {
              const updatedPosts = selectedTheme.posts.map(p =>
                p.id === updatedPost.id ? updatedPost : p
              );
              handleUpdateTheme(selectedTheme.id, { posts: updatedPosts });
            }
            setEditingPost(null);
          }}
        />
      )}
      
      {showScheduleModal && selectedTheme && (
        <ScheduleEditorModal
          posts={selectedTheme.posts.filter(p => p.selected)}
          onClose={() => setShowScheduleModal(false)}
          onApply={(schedule) => {
            setShowScheduleModal(false);
          }}
        />
      )}
    </div>
  );
}