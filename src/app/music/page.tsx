import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Music - Echo Blvd',
  description: 'Listen to Echo Blvd\'s latest music and albums',
};

export default function MusicPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl sm:text-6xl font-bold text-white mb-8">
          Music
        </h1>
        <p className="text-xl text-gray-300 mb-12">
          Listen to our latest tracks and albums
        </p>
        
        {/* Featured Video */}
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Interstate Love Song
          </h2>
          <div className="relative w-full max-w-4xl mx-auto">
            <video
              className="w-full rounded-lg shadow-lg"
              controls
              poster="/Echo Blvd Banner.svg"
              preload="metadata"
              data-testid="music-video"
            >
              <source 
                src="/Interstate Love Song - Lower Banner.mp4" 
                type="video/mp4" 
              />
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
        
        {/* Additional Music Content */}
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">More music content coming soon...</p>
        </div>
      </div>
    </div>
  );
} 