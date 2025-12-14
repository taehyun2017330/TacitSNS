import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowLeft, Heart, MessageCircle, Share2, Edit, Check, X, Send, Bookmark, MoreHorizontal } from 'lucide-react';
import type { ThemeData, PostData } from '../../App';
import { InstagramPostModal } from '../modals/InstagramPostModal';

interface GeneratedPostsScreenProps {
  theme: ThemeData;
  onBack: () => void;
  onConfirmSelection: (posts: PostData[]) => void;
  onEditPost: (post: PostData) => void;
}

const POST_TYPES = [
  'Functional',
  'Brand resonance',
  'Emotional',
  'Educational',
  'Experiential',
  'Current events',
  'Personal',
  'Employee',
  'Community',
  'Customer story',
  'Cause',
  'Sales'
];

export function GeneratedPostsScreen({
  theme,
  onBack,
  onConfirmSelection,
  onEditPost
}: GeneratedPostsScreenProps) {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [showInstagramModal, setShowInstagramModal] = useState(false);

  useEffect(() => {
    // Generate posts if they don't exist
    if (theme.posts && theme.posts.length > 0) {
      setPosts(theme.posts);
      const selected = new Set(theme.posts.filter(p => p.selected).map(p => p.id));
      setSelectedPosts(selected);
    } else {
      const generatedPosts = generatePosts(theme);
      setPosts(generatedPosts);
    }
  }, [theme]);

  const togglePost = (postId: string) => {
    const newSelected = new Set(selectedPosts);
    if (newSelected.has(postId)) {
      newSelected.delete(postId);
    } else {
      newSelected.add(postId);
    }
    setSelectedPosts(newSelected);
  };

  const selectAll = () => {
    setSelectedPosts(new Set(posts.map(p => p.id)));
  };

  const deselectAll = () => {
    setSelectedPosts(new Set());
  };

  const handleConfirm = () => {
    const selected = posts.map(p => ({
      ...p,
      selected: selectedPosts.has(p.id)
    }));
    onConfirmSelection(selected);
  };

  const handlePostClick = (post: PostData) => {
    setSelectedPost(post);
    setShowInstagramModal(true);
  };

  const handleEditWithPrompt = (post: PostData, prompt: string) => {
    // Simulate AI editing the post
    console.log('Editing post with prompt:', prompt);
    onEditPost(post);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-lg">{theme.name} → Posts</h1>
                <p className="text-sm text-gray-600">
                  {posts.length} posts generated | {selectedPosts.size} selected
                </p>
              </div>
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Back to Theme
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto p-8">
        <div className="mb-6">
          <h2 className="text-lg mb-2">Generated Posts</h2>
          <p className="text-sm text-gray-600">💡 Click on any post to view Instagram preview and edit</p>
        </div>

        {/* Instagram-style Grid */}
        <div className="grid grid-cols-3 gap-1 mb-8">
          {posts.map(post => (
            <InstagramGridItem
              key={post.id}
              post={post}
              selected={selectedPosts.has(post.id)}
              onToggle={() => togglePost(post.id)}
              onClick={() => handlePostClick(post)}
            />
          ))}
        </div>

        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex gap-3">
            <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
              Generate More
            </button>
            <button
              onClick={selectAll}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Select All
            </button>
            <button
              onClick={deselectAll}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              Deselect All
            </button>
          </div>
          <button
            onClick={handleConfirm}
            disabled={selectedPosts.size === 0}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Confirm Selection ({selectedPosts.size}) →
          </button>
        </div>
      </main>

      {/* Instagram Post Modal */}
      {selectedPost && (
        <InstagramPostModal
          isOpen={showInstagramModal}
          onClose={() => setShowInstagramModal(false)}
          post={selectedPost}
          brandName="Your Brand"
          onEditWithPrompt={handleEditWithPrompt}
        />
      )}
    </div>
  );
}

function InstagramGridItem({ post, selected, onToggle, onClick }: {
  post: PostData;
  selected: boolean;
  onToggle: () => void;
  onClick: () => void;
}) {
  return (
    <div className="relative aspect-square group cursor-pointer" onClick={onClick}>
      <img
        src={post.imageUrl}
        alt="Post"
        className="w-full h-full object-cover"
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
        <div className="flex gap-4 text-white">
          <div className="flex items-center gap-1">
            <Heart className="w-6 h-6 fill-white" />
            <span>1.2K</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-6 h-6 fill-white" />
            <span>42</span>
          </div>
        </div>
      </div>
      {/* Selection indicator */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className="absolute top-2 right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-50 z-10"
      >
        {selected && <Check className="w-4 h-4 text-green-600" />}
      </button>
    </div>
  );
}

function generatePosts(theme: ThemeData): PostData[] {
  const images = [
    'https://images.unsplash.com/photo-1707127786343-0dcce4c76ca0?w=600',
    'https://images.unsplash.com/photo-1728836882608-6911cc2d6fb6?w=600',
    'https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=600',
    'https://images.unsplash.com/photo-1622814859704-c6cd5ae75dd0?w=600',
    'https://images.unsplash.com/photo-1707127786343-0dcce4c76ca0?w=600',
    'https://images.unsplash.com/photo-1728836882608-6911cc2d6fb6?w=600',
    'https://images.unsplash.com/photo-1611926653458-09294b3142bf?w=600',
    'https://images.unsplash.com/photo-1622814859704-c6cd5ae75dd0?w=600',
  ];

  const captions = [
    'Introducing our latest collection ✨ Crafted with care and designed for everyday elegance #brand #newcollection',
    'Behind the scenes: Where creativity meets craftsmanship 🎨 #behindthescenes #brandstory',
    'Quality you can feel. Design you can see. Experience you\'ll remember. #quality #design',
    'Your daily dose of inspiration 💫 Share what inspires you today! #inspiration #community',
    'Discover the story behind each piece. Made with purpose. #brandvalues #sustainability',
    'Customer love: "Best purchase I\'ve made this year!" ⭐⭐⭐⭐⭐ #testimonial #customerlove',
    'Join us in making a difference. Every purchase supports sustainable practices 🌱 #sustainability',
    'Limited time offer: 20% off select items. Don\'t miss out! #sale #limitedtime'
  ];

  return Array.from({ length: theme.postsCount || 8 }, (_, i) => ({
    id: `post-${Date.now()}-${i}`,
    themeId: theme.id || '',
    imageUrl: images[i % images.length],
    caption: captions[i % captions.length],
    hashtags: ['brand', 'product', 'lifestyle'],
    postType: POST_TYPES[i % POST_TYPES.length],
    selected: false
  }));
}