import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About - Echo Blvd',
  description: 'Learn more about Echo Blvd, our story, and band members.',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl sm:text-6xl font-bold text-white mb-8">
          About
        </h1>
        <p className="text-xl text-gray-300 mb-12">
          Our story and the people behind the music
        </p>
        
        {/* Placeholder for about content */}
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">Band information coming soon...</p>
        </div>
      </div>
    </div>
  );
} 