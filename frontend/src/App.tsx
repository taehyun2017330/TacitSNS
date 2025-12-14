import React, { useState } from 'react';
import LoginScreen from './components/screens/LoginScreen';
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
import { get, post } from './utils/api';

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
  const [username, setUsername] = useState<string | null>(localStorage.getItem('username'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));
  const [currentScreen, setCurrentScreen] = useState(localStorage.getItem('userId') ? 'welcome' : 'login');
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

  const handleLogin = async (name: string, uid: string) => {
    setUsername(name);
    setUserId(uid);

    try {
      // Fetch user's existing brands and themes from backend
      const [backendBrands, backendThemes] = await Promise.all([
        get('/api/brands/'),
        get('/api/themes/')
      ]);

      // Convert brands from snake_case to camelCase
      const userBrands: BrandData[] = backendBrands.map((brand: any) => ({
        id: brand.id,
        name: brand.name,
        category: brand.category,
        description: brand.description,
        targetAudience: brand.target_audience,
        majorStrengths: brand.major_strengths,
        mainProducts: brand.main_products,
        brandVoice: brand.brand_voice,
        referenceImages: brand.reference_images || [],
        logoImage: brand.logo_image,
        createdDate: brand.created_date,
      }));

      // Convert themes from snake_case to camelCase
      const userThemes: ThemeData[] = backendThemes.map((theme: any) => ({
        id: theme.id,
        brandId: theme.brand_id,
        name: theme.name,
        postsCount: theme.posts_count,
        mood: theme.mood,
        colors: theme.colors,
        imagery: theme.imagery,
        tone: theme.tone,
        captionLength: theme.caption_length,
        useEmojis: theme.use_emojis,
        useHashtags: theme.use_hashtags,
        posts: theme.posts || [],
      }));

      setBrands(userBrands);
      setThemes(userThemes);

      // If user has existing brands, go to dashboard
      // Otherwise, show welcome/onboarding flow
      if (userBrands.length > 0) {
        setSelectedBrandId(userBrands[0].id);
        setCurrentScreen('dashboard');
      } else {
        setCurrentScreen('welcome');
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      // On error, still show welcome screen
      setCurrentScreen('welcome');
    }
  };

  const handleLogout = () => {
    // Clear user data
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    setUsername(null);
    setUserId(null);
    setBrands([]);
    setThemes([]);
    setSelectedBrandId(null);
    setSelectedThemeId(null);
    setCurrentScreen('login');
  };

  const handleCreateBrand = async (brandData: BrandData) => {
    try {
      // Convert camelCase to snake_case for backend
      const backendBrandData = {
        name: brandData.name,
        category: brandData.category,
        description: brandData.description,
        target_audience: brandData.targetAudience,
        major_strengths: brandData.majorStrengths,
        main_products: brandData.mainProducts,
        brand_voice: brandData.brandVoice,
        reference_images: brandData.referenceImages || [],
        logo_image: brandData.logoImage,
      };

      // Save to backend
      const savedBrand = await post('/api/brands/', backendBrandData);

      // Convert response back to camelCase
      const frontendBrand: BrandData = {
        id: savedBrand.id,
        name: savedBrand.name,
        category: savedBrand.category,
        description: savedBrand.description,
        targetAudience: savedBrand.target_audience,
        majorStrengths: savedBrand.major_strengths,
        mainProducts: savedBrand.main_products,
        brandVoice: savedBrand.brand_voice,
        referenceImages: savedBrand.reference_images || [],
        logoImage: savedBrand.logo_image,
        createdDate: savedBrand.created_date,
      };

      setBrands([...brands, frontendBrand]);
      setSelectedBrandId(frontendBrand.id);
      setTempBrandData({});
      setCurrentScreen('dashboard');
    } catch (error) {
      console.error('Error creating brand:', error);
      alert('Failed to create brand. Please try again.');
    }
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
      case 'login':
        return <LoginScreen onLogin={handleLogin} />;

      case 'welcome':
        return (
          <WelcomeScreen
            onGetStarted={() => setCurrentScreen('brand-name')}
            username={username || undefined}
            onLogout={handleLogout}
          />
        );
      
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
            username={username || undefined}
            onLogout={handleLogout}
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