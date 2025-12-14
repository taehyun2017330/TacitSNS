import React from 'react';
import { Sparkles, ArrowLeft, Check } from 'lucide-react';

interface PlatformConnectionScreenProps {
  connectedPlatforms: any;
  onConnect: (platform: string, account: string) => void;
  onBack: () => void;
}

export function PlatformConnectionScreen({
  connectedPlatforms,
  onConnect,
  onBack
}: PlatformConnectionScreenProps) {
  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: '📱', color: 'from-purple-500 to-pink-500' },
    { id: 'facebook', name: 'Facebook', icon: '📘', color: 'from-blue-600 to-blue-400' },
    { id: 'twitter', name: 'Twitter / X', icon: '🐦', color: 'from-blue-400 to-blue-300' },
    { id: 'linkedin', name: 'LinkedIn', icon: '💼', color: 'from-blue-700 to-blue-500' }
  ];

  const handleConnect = (platformId: string) => {
    // Simulate OAuth connection
    const mockAccount = `your${platformId}account`;
    onConnect(platformId, mockAccount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-indigo-600">
              <Sparkles className="w-6 h-6" />
              <span>Brand Generator</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto p-8">
        <h1 className="text-2xl mb-2">Connect Social Platforms</h1>
        <p className="text-gray-600 mb-8">
          Link your accounts to enable auto-posting
        </p>

        <div className="space-y-4">
          {platforms.map(platform => {
            const isConnected = connectedPlatforms[platform.id]?.connected;
            const account = connectedPlatforms[platform.id]?.account;

            return (
              <div
                key={platform.id}
                className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 bg-gradient-to-br ${platform.color} rounded-lg flex items-center justify-center text-2xl`}>
                      {platform.icon}
                    </div>
                    <div>
                      <h3 className="text-lg">{platform.name}</h3>
                      {isConnected ? (
                        <p className="text-sm text-green-600 flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          Connected
                        </p>
                      ) : (
                        <p className="text-sm text-gray-500">Not connected</p>
                      )}
                    </div>
                  </div>
                </div>

                {isConnected ? (
                  <div>
                    <p className="text-sm text-gray-600 mb-3">Account: @{account}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onConnect(platform.id, '')}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        Disconnect
                      </button>
                      <button
                        onClick={() => handleConnect(platform.id)}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                      >
                        Change Account
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => handleConnect(platform.id)}
                    className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Connect {platform.name}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 You can post to multiple platforms at once after connecting them
          </p>
        </div>
      </main>
    </div>
  );
}
