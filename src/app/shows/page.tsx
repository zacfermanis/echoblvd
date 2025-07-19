import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shows - Echo Blvd',
  description: 'See Echo Blvd live in concert. Find upcoming tour dates and ticket information.',
};

export default function ShowsPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl sm:text-6xl font-bold text-white mb-8">
          Shows
        </h1>
        <p className="text-xl text-gray-300 mb-12">
          Catch us live on tour
        </p>
        
        {/* Placeholder for shows content */}
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">Tour dates coming soon...</p>
        </div>
      </div>
    </div>
  );
} 