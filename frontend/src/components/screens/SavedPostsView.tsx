import React, { useState } from 'react';
import { Calendar, Trash2, Edit2, Plus } from 'lucide-react';
import type { PostData, BrandData } from '../../App';
import { InstagramPostModal } from '../modals/InstagramPostModal';
import { ScheduleEditorModal } from '../modals/ScheduleEditorModal';

interface SavedPostsViewProps {
  brand: BrandData;
  savedPosts: PostData[];
  onSchedulePost: (post: PostData, scheduledTime: string) => void;
  onRemovePost: (postId: string) => void;
  onEditPost: (post: PostData, prompt: string) => void;
}

export function SavedPostsView({
  brand,
  savedPosts,
  onSchedulePost,
  onRemovePost,
  onEditPost
}: SavedPostsViewProps) {
  const [selectedPost, setSelectedPost] = useState<PostData | null>(null);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [postToSchedule, setPostToSchedule] = useState<PostData | null>(null);

  const handlePostClick = (post: PostData) => {
    setSelectedPost(post);
    setShowInstagramModal(true);
  };

  const handleScheduleClick = (post: PostData, e: React.MouseEvent) => {
    e.stopPropagation();
    setPostToSchedule(post);
    setShowScheduleModal(true);
  };

  const handleRemoveClick = (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Remove this post from saved posts?')) {
      onRemovePost(postId);
    }
  };

  const handleScheduleSave = (scheduledTime: string) => {
    if (postToSchedule) {
      onSchedulePost(postToSchedule, scheduledTime);
      setShowScheduleModal(false);
      setPostToSchedule(null);
    }
  };

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          {brand.logoImage && (
            <img
              src={brand.logoImage}
              alt={brand.name}
              className="w-12 h-12 object-cover rounded-lg border-2 border-gray-200"
            />
          )}
          <div>
            <h1 className="text-2xl">{brand.name}</h1>
            <p className="text-sm text-gray-600">All Saved Posts</p>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex gap-8">
            <div>
              <p className="text-sm text-gray-500">Total Saved</p>
              <p className="text-2xl">{savedPosts.length}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Scheduled</p>
              <p className="text-2xl">
                {savedPosts.filter(p => p.scheduledTime && p.status === 'scheduled').length}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Drafts</p>
              <p className="text-2xl">
                {savedPosts.filter(p => !p.scheduledTime || p.status === 'draft').length}
              </p>
            </div>
          </div>
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm">
            Schedule Selected
          </button>
        </div>
      </div>

      {/* Posts Grid */}
      {savedPosts.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <p className="text-gray-500 mb-4">No saved posts yet</p>
          <p className="text-sm text-gray-400">
            Generate posts from your themes and save them here to schedule for publishing
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {savedPosts.map(post => (
            <SavedPostGridItem
              key={post.id}
              post={post}
              onClick={() => handlePostClick(post)}
              onSchedule={(e) => handleScheduleClick(post, e)}
              onRemove={(e) => handleRemoveClick(post.id, e)}
            />
          ))}
        </div>
      )}

      {/* Instagram Post Modal */}
      {selectedPost && (
        <InstagramPostModal
          isOpen={showInstagramModal}
          onClose={() => setShowInstagramModal(false)}
          post={selectedPost}
          brandName={brand.name}
          brandLogo={brand.logoImage}
          onEditWithPrompt={(post, prompt) => {
            onEditPost(post, prompt);
            setShowInstagramModal(false);
          }}
        />
      )}

      {/* Schedule Modal */}
      {postToSchedule && (
        <ScheduleEditorModal
          isOpen={showScheduleModal}
          onClose={() => {
            setShowScheduleModal(false);
            setPostToSchedule(null);
          }}
          post={postToSchedule}
          onSave={handleScheduleSave}
        />
      )}
    </div>
  );
}

function SavedPostGridItem({ post, onClick, onSchedule, onRemove }: {
  post: PostData;
  onClick: () => void;
  onSchedule: (e: React.MouseEvent) => void;
  onRemove: (e: React.MouseEvent) => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative aspect-square group cursor-pointer"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <img
        src={post.imageUrl}
        alt="Post"
        className="w-full h-full object-cover"
      />
      
      {/* Hover overlay */}
      <div className={`absolute inset-0 bg-black transition-all flex flex-col items-center justify-center ${isHovered ? 'bg-opacity-60' : 'bg-opacity-0'}`}>
        {isHovered && (
          <>
            {/* Scheduled Date Badge */}
            {post.scheduledTime && (
              <div className="absolute top-3 left-3 bg-white rounded-lg px-3 py-1.5 shadow-lg">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                  <span className="text-xs">
                    {new Date(post.scheduledTime).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* Status Badge */}
            {post.status && (
              <div className={`absolute top-3 right-3 rounded-lg px-2 py-1 text-xs ${
                post.status === 'scheduled' 
                  ? 'bg-green-500 text-white' 
                  : post.status === 'published'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-500 text-white'
              }`}>
                {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onSchedule}
                className="bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors text-sm flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                {post.scheduledTime ? 'Reschedule' : 'Schedule'}
              </button>
              <button
                onClick={onRemove}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Remove
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
