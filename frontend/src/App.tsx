import React, { useState, useEffect } from 'react';
import LoginScreen from './components/screens/LoginScreen';
import { WelcomeScreen } from './components/screens/WelcomeScreen';
import { BrandNameScreen } from './components/screens/BrandNameScreen';
import { BrandDescriptionScreen } from './components/screens/BrandDescriptionScreen';
import { ReferenceImagesScreen } from './components/screens/ReferenceImagesScreen';
import { BrandProposalScreen } from './components/screens/BrandProposalScreen';
import { MainDashboard } from './components/screens/MainDashboard';
import { ThemeProposalScreen } from './components/screens/ThemeProposalScreen';
import { ThemeSelectionScreen } from './components/screens/ThemeSelectionScreen';
import { GeneratedPostsScreen } from './components/screens/GeneratedPostsScreen';
import { GeneratingPostsScreen } from './components/screens/GeneratingPostsScreen';
import { InstagramPreviewScreen } from './components/screens/InstagramPreviewScreen';
import { PublishingSuccessScreen } from './components/screens/PublishingSuccessScreen';
import { PlatformConnectionScreen } from './components/screens/PlatformConnectionScreen';
import { PostEditorModal } from './components/modals/PostEditorModal';
import { ScheduleEditorModal } from './components/modals/ScheduleEditorModal';
import { get, post, put } from './utils/api';

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
  const [currentScreen, setCurrentScreen] = useState('login'); // Will be updated by useEffect
  const [isLoading, setIsLoading] = useState(true); // Loading state for initial data fetch
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
  const [generatingPosts, setGeneratingPosts] = useState<PostData[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [themeOptions, setThemeOptions] = useState<any[]>([]);
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

  // Load user data on page refresh/mount
  useEffect(() => {
    const loadUserData = async () => {
      const storedUserId = localStorage.getItem('userId');
      const storedUsername = localStorage.getItem('username');

      if (storedUserId && storedUsername) {
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
          console.error('Error loading user data on refresh:', error);
          // On error, show welcome screen
          setCurrentScreen('welcome');
        } finally {
          setIsLoading(false);
        }
      } else {
        // No user logged in, show login screen
        setCurrentScreen('login');
        setIsLoading(false);
      }
    };

    loadUserData();
  }, []); // Run once on mount

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

  const handleCreateTheme = async (themeData: ThemeData) => {
    try {
      // Convert camelCase to snake_case for backend
      const backendThemeData = {
        brand_id: themeData.brandId,
        name: themeData.name,
        posts_count: themeData.postsCount,
        mood: themeData.mood,
        colors: themeData.colors,
        imagery: themeData.imagery,
        tone: themeData.tone,
        caption_length: themeData.captionLength,
        use_emojis: themeData.useEmojis,
        use_hashtags: themeData.useHashtags,
        posts: themeData.posts || [],
      };

      // Save to backend
      const savedTheme = await post('/api/themes/', backendThemeData);

      // Convert response back to camelCase
      const frontendTheme: ThemeData = {
        id: savedTheme.id,
        brandId: savedTheme.brand_id,
        name: savedTheme.name,
        postsCount: savedTheme.posts_count,
        mood: savedTheme.mood,
        colors: savedTheme.colors,
        imagery: savedTheme.imagery,
        tone: savedTheme.tone,
        captionLength: savedTheme.caption_length,
        useEmojis: savedTheme.use_emojis,
        useHashtags: savedTheme.use_hashtags,
        posts: savedTheme.posts || [],
      };

      setThemes([...themes, frontendTheme]);
      setSelectedThemeId(frontendTheme.id);
      setTempThemeData({});
      setCurrentScreen('dashboard');
    } catch (error) {
      console.error('Error creating theme:', error);
      alert('Failed to create theme. Please try again.');
    }
  };

  const handleUpdateTheme = async (themeId: string, updates: Partial<ThemeData>) => {
    try {
      // Convert updates to snake_case
      const backendUpdates: any = {};
      if (updates.brandId !== undefined) backendUpdates.brand_id = updates.brandId;
      if (updates.name !== undefined) backendUpdates.name = updates.name;
      if (updates.postsCount !== undefined) backendUpdates.posts_count = updates.postsCount;
      if (updates.mood !== undefined) backendUpdates.mood = updates.mood;
      if (updates.colors !== undefined) backendUpdates.colors = updates.colors;
      if (updates.imagery !== undefined) backendUpdates.imagery = updates.imagery;
      if (updates.tone !== undefined) backendUpdates.tone = updates.tone;
      if (updates.captionLength !== undefined) backendUpdates.caption_length = updates.captionLength;
      if (updates.useEmojis !== undefined) backendUpdates.use_emojis = updates.useEmojis;
      if (updates.useHashtags !== undefined) backendUpdates.use_hashtags = updates.useHashtags;
      if (updates.posts !== undefined) backendUpdates.posts = updates.posts;

      // Update in backend
      await put(`/api/themes/${themeId}`, backendUpdates);

      // Update local state
      setThemes(themes.map(t => t.id === themeId ? { ...t, ...updates } : t));
    } catch (error) {
      console.error('Error updating theme:', error);
      alert('Failed to update theme. Please try again.');
    }
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

  const handleAutoGenerateTheme = async (brandId: string) => {
    try {
      console.log('Auto-generating 5 theme options for brand:', brandId);

      // Navigate to theme-proposal screen
      setTempThemeData({ brandId });
      setCurrentScreen('theme-proposal');

      // Start generating
      setIsGenerating(true);
      setThemeOptions([]);

      // Connect to SSE endpoint for auto-generating theme options
      const userId = localStorage.getItem('userId');
      const eventSourceWithAuth = new EventSource(
        `http://localhost:8000/api/themes/auto-generate-stream?brand_id=${brandId}&user_id=${userId}`
      );

      eventSourceWithAuth.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('SSE message:', data);

        if (data.type === 'theme_option') {
          // Received a theme option - add to the list
          const themeOption = {
            name: data.theme.name,
            mood: data.theme.mood,
            colors: data.theme.colors,
            imagery: data.theme.imagery,
            tone: data.theme.tone,
            captionLength: data.theme.caption_length,
            useEmojis: data.theme.use_emojis,
            useHashtags: data.theme.use_hashtags,
            imageUrl: data.theme.image_url
          };

          setThemeOptions(prev => [...prev, themeOption]);
          console.log(`Theme option ${data.index}/${data.total} received`);
        } else if (data.type === 'complete') {
          console.log('All theme options generated!');
          setIsGenerating(false);
          eventSourceWithAuth.close();
        } else if (data.type === 'error' || data.error) {
          console.error('Error from server:', data.message || data.error);
          setIsGenerating(false);
          setThemeOptions([]);
          eventSourceWithAuth.close();
          alert('Failed to generate theme options. Please try again.');
          setCurrentScreen('dashboard');
        }
      };

      eventSourceWithAuth.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsGenerating(false);
        eventSourceWithAuth.close();
      };

    } catch (error) {
      console.error('Error auto-generating themes:', error);
      setIsGenerating(false);
      setThemeOptions([]);
      alert('Failed to generate theme options. Please try again.');
      setCurrentScreen('dashboard');
    }
  };

  const handleSelectTheme = async (selectedTheme: any) => {
    try {
      console.log('User selected theme:', selectedTheme.name);

      // Create the theme in backend
      const themeToCreate = {
        brandId: selectedBrandId || '',
        name: selectedTheme.name,
        postsCount: 5,
        mood: selectedTheme.mood,
        colors: selectedTheme.colors,
        imagery: selectedTheme.imagery,
        tone: selectedTheme.tone,
        captionLength: selectedTheme.captionLength,
        useEmojis: selectedTheme.useEmojis,
        useHashtags: selectedTheme.useHashtags,
        posts: []
      };

      await handleCreateTheme(themeToCreate as ThemeData);

      // Navigate to theme-proposal screen for further editing
      setCurrentScreen('theme-proposal');
    } catch (error) {
      console.error('Error selecting theme:', error);
      alert('Failed to save selected theme. Please try again.');
    }
  };

  const handleRegenerateImages = async (themeParams: {
    name: string;
    mood: string;
    colors: string[];
    imagery: string;
    tone: string;
    captionLength: string;
    useEmojis: boolean;
    useHashtags: boolean;
  }) => {
    try {
      console.log('Regenerating images with custom parameters:', themeParams);

      // Start generating
      setIsGenerating(true);
      setThemeOptions([]);

      // Build query parameters
      const userId = localStorage.getItem('userId');
      const params = new URLSearchParams({
        brand_id: selectedBrandId || '',
        user_id: userId || '',
        name: themeParams.name,
        mood: themeParams.mood,
        colors: JSON.stringify(themeParams.colors),
        imagery: themeParams.imagery,
        tone: themeParams.tone,
        caption_length: themeParams.captionLength,
        use_emojis: themeParams.useEmojis.toString(),
        use_hashtags: themeParams.useHashtags.toString()
      });

      // Connect to SSE endpoint for regenerating images
      const eventSourceWithAuth = new EventSource(
        `http://localhost:8000/api/themes/regenerate-images-stream?${params.toString()}`
      );

      eventSourceWithAuth.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('SSE message:', data);

        if (data.type === 'theme_option') {
          // Received a regenerated theme option - add to the list
          const themeOption = {
            name: data.theme.name,
            mood: data.theme.mood,
            colors: data.theme.colors,
            imagery: data.theme.imagery,
            tone: data.theme.tone,
            captionLength: data.theme.caption_length,
            useEmojis: data.theme.use_emojis,
            useHashtags: data.theme.use_hashtags,
            imageUrl: data.theme.image_url
          };

          setThemeOptions(prev => [...prev, themeOption]);
          console.log(`Regenerated image ${data.index}/${data.total}`);
        } else if (data.type === 'complete') {
          console.log('All images regenerated!');
          setIsGenerating(false);
          eventSourceWithAuth.close();
        } else if (data.type === 'error' || data.error) {
          console.error('Error from server:', data.message || data.error);
          setIsGenerating(false);
          setThemeOptions([]);
          eventSourceWithAuth.close();
          alert('Failed to regenerate images. Please try again.');
        }
      };

      eventSourceWithAuth.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsGenerating(false);
        eventSourceWithAuth.close();
      };

    } catch (error) {
      console.error('Error regenerating images:', error);
      setIsGenerating(false);
      setThemeOptions([]);
      alert('Failed to regenerate images. Please try again.');
    }
  };

  const handleGeneratePosts = async (themeId: string) => {
    try {
      console.log('Generating posts for theme:', themeId);

      // Stay on theme-proposal screen, set generating state
      setIsGenerating(true);
      setGeneratingPosts([]);

      // Connect to SSE endpoint for streaming posts
      const userId = localStorage.getItem('userId');
      const eventSourceWithAuth = new EventSource(
        `http://localhost:8000/api/themes/${themeId}/generate-posts-stream?user_id=${userId}`
      );

      eventSourceWithAuth.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('SSE message:', data);

        if (data.type === 'post') {
          // Convert snake_case to camelCase
          const newPost: PostData = {
            id: data.post.id,
            themeId: data.post.theme_id,
            imageUrl: data.post.image_url,
            caption: data.post.caption,
            hashtags: data.post.hashtags,
            postType: data.post.post_type,
            selected: data.post.selected,
            scheduledTime: data.post.scheduled_time,
            status: data.post.status,
          };

          // Add to generating posts array (shown on right side)
          setGeneratingPosts(prev => [...prev, newPost]);

          // Also update theme with new post
          setThemes(prevThemes =>
            prevThemes.map(t => {
              if (t.id === themeId) {
                return {
                  ...t,
                  posts: [...(t.posts || []), newPost]
                };
              }
              return t;
            })
          );

          console.log(`Post ${data.index}/${data.total} added`);
        } else if (data.type === 'complete') {
          console.log('All posts generated!');
          setIsGenerating(false);
          eventSourceWithAuth.close();
        } else if (data.type === 'error' || data.error) {
          console.error('Error from server:', data.message || data.error);
          setIsGenerating(false);
          setGeneratingPosts([]);
          eventSourceWithAuth.close();
          alert('Failed to generate posts. Please try again.');
        }
      };

      eventSourceWithAuth.onerror = (error) => {
        console.error('SSE connection error:', error);
        setIsGenerating(false);
        eventSourceWithAuth.close();
      };

    } catch (error) {
      console.error('Error generating posts:', error);
      setIsGenerating(false);
      setGeneratingPosts([]);
      alert('Failed to generate posts. Please try again.');
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
            onBack={() => {
              setTempBrandData({});
              setCurrentScreen('dashboard');
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
              if (selectedBrandId) {
                handleAutoGenerateTheme(selectedBrandId);
              }
            }}
            onViewTheme={(themeId) => {
              setSelectedThemeId(themeId);
              setShowingSavedPosts(false);
            }}
            onGeneratePosts={(themeId) => {
              handleGeneratePosts(themeId);
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
      
      case 'theme-selection':
        return (
          <ThemeSelectionScreen
            themeOptions={themeOptions}
            isGenerating={isGenerating}
            onSelectTheme={handleSelectTheme}
            onBack={() => setCurrentScreen('dashboard')}
          />
        );

      case 'theme-proposal':
        return (
          <ThemeProposalScreen
            brandId={selectedBrandId || ''}
            themeData={selectedTheme || tempThemeData}
            generatedPosts={generatingPosts}
            isGenerating={isGenerating}
            themeOptions={themeOptions}
            onRegenerateImages={handleRegenerateImages}
            onSave={(theme) => {
              if (selectedTheme) {
                handleUpdateTheme(theme.id, theme);
                setCurrentScreen('dashboard');
              } else {
                handleCreateTheme(theme as ThemeData);
              }
            }}
            onGeneratePosts={async (theme) => {
              // For now, just navigate to generated-posts screen (dummy)
              // Save/update the theme first
              if (selectedTheme) {
                await handleUpdateTheme(selectedTheme.id, theme);
              } else {
                // Create new theme first
                try {
                  const backendThemeData = {
                    brand_id: theme.brandId,
                    name: theme.name,
                    posts_count: theme.postsCount,
                    mood: theme.mood,
                    colors: theme.colors,
                    imagery: theme.imagery,
                    tone: theme.tone,
                    caption_length: theme.captionLength,
                    use_emojis: theme.useEmojis,
                    use_hashtags: theme.useHashtags,
                    posts: theme.posts || [],
                  };

                  // Save to backend
                  const savedTheme = await post('/api/themes/', backendThemeData);

                  // Convert response back to camelCase
                  const frontendTheme: ThemeData = {
                    id: savedTheme.id,
                    brandId: savedTheme.brand_id,
                    name: savedTheme.name,
                    postsCount: savedTheme.posts_count,
                    mood: savedTheme.mood,
                    colors: savedTheme.colors,
                    imagery: savedTheme.imagery,
                    tone: savedTheme.tone,
                    captionLength: savedTheme.caption_length,
                    useEmojis: savedTheme.use_emojis,
                    useHashtags: savedTheme.use_hashtags,
                    posts: savedTheme.posts || [],
                  };

                  setThemes([...themes, frontendTheme]);
                  setSelectedThemeId(frontendTheme.id);
                  setTempThemeData({});
                } catch (error) {
                  console.error('Error creating theme:', error);
                  alert('Failed to create theme. Please try again.');
                  return;
                }
              }

              // Navigate to generated-posts screen (dummy for now)
              setCurrentScreen('generated-posts');
            }}
            onBack={() => setCurrentScreen('dashboard')}
          />
        );

      case 'generating-posts':
        return (
          <GeneratingPostsScreen
            themeName={selectedTheme?.name || tempThemeData.name || 'Your Theme'}
            postsCount={selectedTheme?.postsCount || tempThemeData.postsCount || 5}
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

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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