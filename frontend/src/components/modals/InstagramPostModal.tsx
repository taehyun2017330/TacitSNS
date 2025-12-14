import React, { useState } from 'react';
import { X, Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Smile } from 'lucide-react';
import type { PostData } from '../../App';

interface InstagramPostModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: PostData;
  brandName: string;
  brandLogo?: string;
  onEditWithPrompt: (post: PostData, prompt: string) => void;
}

export function InstagramPostModal({
  isOpen,
  onClose,
  post,
  brandName,
  brandLogo,
  onEditWithPrompt
}: InstagramPostModalProps) {
  const [editPrompt, setEditPrompt] = useState('');
  const [showPromptInput, setShowPromptInput] = useState(false);

  if (!isOpen) return null;

  const handleEditSubmit = () => {
    if (editPrompt.trim()) {
      onEditWithPrompt(post, editPrompt);
      setEditPrompt('');
      setShowPromptInput(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-hidden flex">
        {/* Left Side - Image */}
        <div className="w-3/5 bg-black flex items-center justify-center">
          <img
            src={post.imageUrl}
            alt="Post"
            className="max-h-[90vh] w-full object-contain"
          />
        </div>

        {/* Right Side - Details */}
        <div className="w-2/5 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandName}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                  <span className="text-white text-xs">{brandName[0]}</span>
                </div>
              )}
              <div>
                <p className="text-sm">{brandName}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Comments/Caption Section - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Caption */}
            <div className="flex gap-3 mb-4">
              {brandLogo ? (
                <img
                  src={brandLogo}
                  alt={brandName}
                  className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs">{brandName[0]}</span>
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm">
                  <span className="mr-2">{brandName}</span>
                  {post.caption}
                </p>
                <p className="text-xs text-gray-500 mt-1">2 hours ago</p>
              </div>
            </div>

            {/* Sample Comments */}
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="mr-2">user_123</span>
                    Love this! 😍
                  </p>
                  <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-teal-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="mr-2">design_lover</span>
                    Amazing quality! Where can I get this?
                  </p>
                  <p className="text-xs text-gray-500 mt-1">45 minutes ago</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="mr-2">trendsetter</span>
                    This is exactly what I've been looking for! 🔥
                  </p>
                  <p className="text-xs text-gray-500 mt-1">30 minutes ago</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-4">
                <button className="hover:opacity-70">
                  <Heart className="w-6 h-6" />
                </button>
                <button className="hover:opacity-70">
                  <MessageCircle className="w-6 h-6" />
                </button>
                <button className="hover:opacity-70">
                  <Send className="w-6 h-6" />
                </button>
              </div>
              <button className="hover:opacity-70">
                <Bookmark className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-sm mb-1">1,234 likes</p>
            <p className="text-xs text-gray-500 mb-3">2 hours ago</p>

            {/* Edit with Prompt */}
            {!showPromptInput ? (
              <button
                onClick={() => setShowPromptInput(true)}
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm"
              >
                Edit with AI Prompt
              </button>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="Describe how you want to edit this post... (e.g., 'Make it more professional', 'Add emojis', 'Shorter caption')"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEditSubmit}
                    disabled={!editPrompt.trim()}
                    className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    Apply Changes
                  </button>
                  <button
                    onClick={() => {
                      setShowPromptInput(false);
                      setEditPrompt('');
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
