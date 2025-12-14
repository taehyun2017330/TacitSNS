import React from 'react';
import { Sparkles, Check, Calendar, Edit, X } from 'lucide-react';
import type { ThemeData } from '../../App';

interface PublishingSuccessScreenProps {
  theme: ThemeData;
  onCreateMore: () => void;
  onBackToDashboard: () => void;
}

export function PublishingSuccessScreen({
  theme,
  onCreateMore,
  onBackToDashboard
}: PublishingSuccessScreenProps) {
  const scheduledPosts = theme.posts?.filter(p => p.status === 'scheduled') || [];
  
  const getScheduledDate = (index: number) => {
    const date = new Date();
    date.setDate(date.getDate() + (index * 2) + 3);
    return date;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-indigo-600">
            <Sparkles className="w-6 h-6" />
            <span>Brand Generator</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{theme.name}</span>
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Success Message */}
        <div className="bg-green-50 border-2 border-green-500 rounded-xl p-8 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <Check className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl">Successfully Scheduled</h2>
              <p className="text-sm text-gray-700">
                {scheduledPosts.length} posts scheduled to Instagram @yourbrandname
              </p>
            </div>
          </div>
          
          {scheduledPosts.length > 0 && (
            <p className="text-sm text-gray-700 mb-4">
              Next post: {getScheduledDate(0).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
              })} at 10:00 AM
            </p>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={onBackToDashboard}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              View Schedule
            </button>
            <button
              onClick={onCreateMore}
              className="px-4 py-2 bg-white border border-green-600 text-green-700 rounded-lg hover:bg-green-50 transition-colors text-sm"
            >
              Create More Posts
            </button>
          </div>
        </div>

        {/* Upcoming Posts */}
        <div className="mb-8">
          <h3 className="text-lg mb-4">Upcoming Posts</h3>
          <div className="space-y-4">
            {scheduledPosts.slice(0, 3).map((post, i) => {
              const date = getScheduledDate(i);
              return (
                <div
                  key={post.id}
                  className="bg-white rounded-lg border border-gray-200 p-4 flex items-center gap-4"
                >
                  <img
                    src={post.imageUrl}
                    alt={`Post ${i + 1}`}
                    className="w-24 h-24 object-cover rounded-lg"
                  />
                  <div className="flex-1">
                    <p className="mb-1">
                      {date.toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })} at 10:00 AM
                    </p>
                    <p className="text-sm text-gray-600 mb-2">
                      {post.postType} brand post
                    </p>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Status: Scheduled</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm flex items-center gap-1">
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                    <button className="px-3 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm flex items-center gap-1">
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Past Posts */}
        <div>
          <h3 className="text-lg mb-4">Past Posts</h3>
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500">
              (Empty - first campaign)
            </p>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button
            onClick={onCreateMore}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Generate New Theme
          </button>
          <button className="px-6 py-3 border border-gray-300 rounded-lg hover:bg-gray-50">
            View Analytics
          </button>
        </div>
      </main>
    </div>
  );
}
