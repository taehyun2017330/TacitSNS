import React, { useState } from 'react';
import { Sparkles, ArrowLeft, Edit, Heart, MessageCircle, Share2, Bookmark, Menu } from 'lucide-react';
import type { ThemeData, PostData } from '../../App';

interface InstagramPreviewScreenProps {
  theme: ThemeData;
  connectedPlatforms: any;
  onBack: () => void;
  onEditPost: (post: PostData) => void;
  onCustomizeSchedule: () => void;
  onConnectPlatform: () => void;
  onSchedulePublish: (platform: string, schedule: any) => void;
}

export function InstagramPreviewScreen({
  theme,
  connectedPlatforms,
  onBack,
  onEditPost,
  onCustomizeSchedule,
  onConnectPlatform,
  onSchedulePublish
}: InstagramPreviewScreenProps) {
  const [selectedPlatform, setSelectedPlatform] = useState('instagram');
  const [autoSchedule, setAutoSchedule] = useState(true);
  
  const selectedPosts = theme.posts?.filter(p => p.selected) || [];
  const isConnected = connectedPlatforms[selectedPlatform]?.connected;

  const handleSchedulePublish = () => {
    if (!isConnected) {
      onConnectPlatform();
      return;
    }
    onSchedulePublish(selectedPlatform, { autoSchedule });
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
                <h1 className="text-lg">{theme.name} → Final Feed</h1>
                <p className="text-sm text-gray-600">{selectedPosts.length} posts selected</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onBack}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
              >
                Back
              </button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                Edit
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-8">
        <div className="grid grid-cols-2 gap-8">
          {/* Left: Instagram Preview */}
          <div>
            <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
              <h2 className="text-lg mb-4">Instagram Feed Preview</h2>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="bg-white rounded-lg overflow-hidden shadow-sm max-w-sm mx-auto">
                  {/* Instagram Header */}
                  <div className="flex items-center justify-between p-3 border-b border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 rounded-full p-0.5">
                        <div className="w-full h-full bg-white rounded-full"></div>
                      </div>
                      <span className="text-sm">@yourbrandname</span>
                    </div>
                    <Menu className="w-5 h-5" />
                  </div>

                  {/* Feed Grid */}
                  <div className="p-3">
                    <div className="grid grid-cols-3 gap-1 mb-3">
                      {/* Existing posts placeholders */}
                      <div className="aspect-square bg-gray-200"></div>
                      <div className="aspect-square bg-gray-200"></div>
                      <div className="aspect-square bg-gray-200"></div>
                      <div className="aspect-square bg-gray-200"></div>
                      <div className="aspect-square bg-gray-200"></div>
                      <div className="aspect-square bg-gray-200"></div>
                      
                      {/* New posts */}
                      {selectedPosts.slice(0, 3).map((post, i) => (
                        <div key={post.id} className="aspect-square relative group">
                          <img
                            src={post.imageUrl}
                            alt={`Post ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-indigo-500/20 border-2 border-indigo-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-white text-xs bg-indigo-600 px-2 py-1 rounded">NEW</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Post Preview */}
                    {selectedPosts[0] && (
                      <div className="border-t border-gray-200 pt-3">
                        <div className="flex gap-4 mb-2">
                          <Heart className="w-6 h-6" />
                          <MessageCircle className="w-6 h-6" />
                          <Share2 className="w-6 h-6" />
                          <Bookmark className="w-6 h-6 ml-auto" />
                        </div>
                        <div className="text-xs">
                          <span>yourbrandname</span>{' '}
                          <span className="text-gray-700">{selectedPosts[0].caption.substring(0, 50)}...</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-600 text-center mt-4">
                  Your new posts will appear here →
                </p>
              </div>
            </div>
          </div>

          {/* Right: Publishing Settings */}
          <div>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg mb-6">Posting Schedule</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm mb-2">Platform</label>
                  <select
                    value={selectedPlatform}
                    onChange={(e) => setSelectedPlatform(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="multiple">Multiple platforms</option>
                  </select>
                </div>

                {isConnected ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm text-green-800 mb-2">
                      Connected: @{connectedPlatforms[selectedPlatform]?.account} ✓
                    </p>
                    <button
                      onClick={onConnectPlatform}
                      className="text-sm text-green-700 hover:text-green-800"
                    >
                      Change account
                    </button>
                  </div>
                ) : (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800 mb-2">
                      Platform not connected
                    </p>
                    <button
                      onClick={onConnectPlatform}
                      className="text-sm text-indigo-600 hover:text-indigo-700"
                    >
                      Connect {selectedPlatform}
                    </button>
                  </div>
                )}

                <div>
                  <label className="flex items-center gap-2 mb-4">
                    <input
                      type="checkbox"
                      checked={autoSchedule}
                      onChange={(e) => setAutoSchedule(e.target.checked)}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Auto-schedule</span>
                  </label>
                </div>

                {autoSchedule && selectedPosts.length > 0 && (
                  <div className="space-y-3">
                    {selectedPosts.slice(0, 3).map((post, i) => {
                      const date = new Date();
                      date.setDate(date.getDate() + (i * 2) + 3);
                      return (
                        <div key={post.id} className="bg-gray-50 rounded-lg p-3">
                          <p className="text-sm">
                            Post {i + 1}: {date.toLocaleDateString('en-US', { 
                              weekday: 'short', 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric'
                            })} at 10:00 AM
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={onCustomizeSchedule}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                  >
                    Customize schedule
                  </button>
                  <button className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                    Post manually
                  </button>
                </div>

                <button
                  onClick={handleSchedulePublish}
                  className="w-full bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                >
                  Schedule & Publish ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
