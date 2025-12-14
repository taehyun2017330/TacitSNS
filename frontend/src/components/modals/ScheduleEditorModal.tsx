import React, { useState } from 'react';
import { X, Calendar } from 'lucide-react';
import type { PostData } from '../../App';

interface ScheduleEditorModalProps {
  isOpen?: boolean;
  post?: PostData;
  posts?: PostData[];
  onClose: () => void;
  onSave?: (scheduledTime: string) => void;
  onApply?: (schedule: any) => void;
}

export function ScheduleEditorModal({ isOpen = true, post, posts, onClose, onSave, onApply }: ScheduleEditorModalProps) {
  const [smartScheduling, setSmartScheduling] = useState(true);
  const [frequency, setFrequency] = useState('every2days');
  const [preferredTime, setPreferredTime] = useState('10:00 AM');
  const [timezone, setTimezone] = useState('EST');
  const [startDate, setStartDate] = useState('Dec 16, 2025');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('10:00');

  const postsToSchedule = posts || (post ? [post] : []);

  if (!isOpen) return null;

  const getScheduledDate = (index: number) => {
    const date = new Date();
    const daysToAdd = frequency === 'daily' ? index + 1 
      : frequency === 'every2days' ? (index * 2) + 3
      : frequency === 'every3days' ? (index * 3) + 3
      : (index * 7) + 3;
    
    date.setDate(date.getDate() + daysToAdd);
    return date;
  };

  const handleApply = () => {
    if (post && onSave) {
      // Single post scheduling
      const scheduledDateTime = `${selectedDate || new Date().toISOString().split('T')[0]} ${selectedTime}`;
      onSave(scheduledDateTime);
    } else if (onApply) {
      // Bulk scheduling
      onApply({
        smartScheduling,
        frequency,
        preferredTime,
        timezone,
        startDate
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-8 z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl">Customize Posting Schedule</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Smart Scheduling */}
          <div>
            <h3 className="mb-2">Smart Scheduling (AI-optimized)</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={smartScheduling}
                onChange={(e) => setSmartScheduling(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Based on your audience engagement patterns</span>
            </label>
          </div>

          {/* Posting Frequency */}
          <div>
            <h3 className="mb-3">Posting Frequency</h3>
            <div className="space-y-2">
              {[
                { value: 'daily', label: 'Daily' },
                { value: 'every2days', label: 'Every 2 days' },
                { value: 'every3days', label: 'Every 3 days' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'custom', label: 'Custom interval' }
              ].map(option => (
                <label key={option.value} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="frequency"
                    value={option.value}
                    checked={frequency === option.value}
                    onChange={(e) => setFrequency(e.target.value)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Preferred Time */}
          <div>
            <h3 className="mb-2">Preferred Posting Time</h3>
            <div className="flex gap-3">
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option>10:00 AM</option>
                <option>12:00 PM</option>
                <option>2:00 PM</option>
                <option>5:00 PM</option>
                <option>7:00 PM</option>
              </select>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option>EST</option>
                <option>PST</option>
                <option>CST</option>
                <option>MST</option>
              </select>
            </div>
          </div>

          {/* Start Date */}
          <div>
            <h3 className="mb-2">Start Date</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <Calendar className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Preview Schedule */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="mb-4">Preview Schedule</h3>
            <div className="space-y-3">
              {postsToSchedule.slice(0, 3).map((post, i) => {
                const date = getScheduledDate(i);
                return (
                  <div key={post.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                    <img
                      src={post.imageUrl}
                      alt={`Post ${i + 1}`}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <p className="text-sm">
                        Post {i + 1}: {date.toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })} at {preferredTime}
                      </p>
                      <p className="text-xs text-gray-600">{post.postType}</p>
                    </div>
                    <button className="text-sm text-indigo-600 hover:text-indigo-700">
                      Edit time
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 Optimal times based on your audience engagement data from Instagram
              </p>
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
            onClick={handleApply}
            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Apply Schedule
          </button>
        </div>
      </div>
    </div>
  );
}