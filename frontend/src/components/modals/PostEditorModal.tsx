import React, { useState } from 'react';
import { X, Edit, RefreshCw, Heart, MessageCircle, Share2, Bookmark, Menu } from 'lucide-react';
import type { PostData } from '../../App';

interface PostEditorModalProps {
  post: PostData;
  onClose: () => void;
  onSave: (post: PostData) => void;
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

export function PostEditorModal({ post, onClose, onSave }: PostEditorModalProps) {
  const [postType, setPostType] = useState(post.postType);
  const [caption, setCaption] = useState(post.caption);
  const [hashtags, setHashtags] = useState(post.hashtags.join(' '));
  const [scheduledTime, setScheduledTime] = useState(post.scheduledTime || '');

  const handleSave = () => {
    onSave({
      ...post,
      postType,
      caption,
      hashtags: hashtags.split(' ').filter(h => h.length > 0),
      scheduledTime
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl">Edit Post #{post.id.slice(-4)}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-8">
            {/* Left: Settings */}
            <div className="space-y-6">
              <div>
                <h3 className="mb-3">Post Type</h3>
                <div className="grid grid-cols-2 gap-2">
                  {POST_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => setPostType(type)}
                      className={`px-3 py-2 border rounded-lg text-sm transition-colors ${
                        postType === type
                          ? 'bg-indigo-100 border-indigo-500 text-indigo-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {postType === type && '● '}
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mb-3">
                  <RefreshCw className="w-4 h-4" />
                  Regenerate image
                </button>
              </div>

              <div>
                <label className="block text-sm mb-2">Caption</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <button className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1 mt-2">
                  <RefreshCw className="w-4 h-4" />
                  Regenerate caption
                </button>
              </div>

              <div>
                <label className="block text-sm mb-2">Hashtags</label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#tag1 #tag2 #tag3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex gap-2 mt-2">
                  <button className="text-sm text-indigo-600 hover:text-indigo-700">
                    + Add
                  </button>
                  <button className="text-sm text-indigo-600 hover:text-indigo-700">
                    <RefreshCw className="w-4 h-4 inline" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2">Post Time</label>
                <input
                  type="text"
                  value={scheduledTime || 'Mon, Dec 16 at 10:00 AM'}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button className="text-sm text-indigo-600 hover:text-indigo-700 mt-2">
                  Change
                </button>
              </div>
            </div>

            {/* Right: Instagram Preview */}
            <div>
              <h3 className="mb-3">Instagram Preview</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                  {/* Instagram Header */}
                  <div className="flex items-center justify-between p-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-full p-0.5">
                        <div className="w-full h-full bg-white rounded-full"></div>
                      </div>
                      <span className="text-sm">yourbrandname</span>
                    </div>
                    <Menu className="w-5 h-5" />
                  </div>

                  {/* Image */}
                  <img
                    src={post.imageUrl}
                    alt="Post"
                    className="w-full aspect-square object-cover"
                  />

                  {/* Actions */}
                  <div className="p-3">
                    <div className="flex gap-4 mb-3">
                      <Heart className="w-6 h-6" />
                      <MessageCircle className="w-6 h-6" />
                      <Share2 className="w-6 h-6" />
                      <Bookmark className="w-6 h-6 ml-auto" />
                    </div>

                    {/* Caption */}
                    <div className="text-sm">
                      <span>yourbrandname</span>{' '}
                      <span className="text-gray-700">{caption}</span>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      View all 12 comments
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      2 HOURS AGO
                    </div>
                  </div>
                </div>

                <p className="text-sm text-gray-600 text-center mt-4">
                  This is how your post will appear on Instagram
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
