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
        
        {/* Featured Video - Shimmer (Most Recent) */}
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Shimmer (Fuel Cover)
          </h2>
          <div className="relative w-full max-w-4xl mx-auto">
            {/* YouTube Embed - Echo Blvd Shimmer Cover */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                src="https://www.youtube.com/embed/_QzF31T5jsg?rel=0"
                title="Echo Blvd - Shimmer (Fuel Cover)"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                data-testid="music-video-shimmer"
              />
            </div>
            
            {/* Fallback message for when video doesn't load */}
            <div className="mt-4 text-center">
              <p className="text-gray-400 text-sm">
                Having trouble with the video?{' '}
                <a 
                  href="https://www.youtube.com/watch?v=_QzF31T5jsg" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Watch Echo Blvd&#39;s cover of &quot;Shimmer&quot; on YouTube
                </a>
              </p>
            </div>
          </div>
        </div>
        
        {/* Featured Video - Interstate Love Song */}
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Interstate Love Song (Stone Temple Pilots cover)
          </h2>
          <div className="relative w-full max-w-4xl mx-auto">
            {/* YouTube Embed - Echo Blvd Interstate Love Song */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                src="https://www.youtube.com/embed/Lh-VdQjkhBo?rel=0"
                title="Echo Blvd - Interstate Love Song"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                data-testid="music-video"
              />
            </div>
            
            {/* Fallback message for when video doesn't load */}
            <div className="mt-4 text-center">
              <p className="text-gray-400 text-sm">
                Having trouble with the video?{' '}
                <a 
                  href="https://www.youtube.com/watch?v=Lh-VdQjkhBo" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Watch on YouTube
                </a>
              </p>
            </div>
          </div>
        </div>
        
        {/* Additional Featured Video - Times Like These */}
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Times Like These (Foo Fighters Cover)
          </h2>
          <div className="relative w-full max-w-4xl mx-auto">
            {/* YouTube Embed - Echo Blvd Live at The Viper Room */}
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full rounded-lg shadow-lg"
                src="https://www.youtube.com/embed/DsotI2Xwd2E?rel=0"
                title="Echo Blvd - Times Like These (Foo Fighters Cover)"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                data-testid="music-video-viper"
              />
            </div>
            
            {/* Fallback message for when video doesn't load */}
            <div className="mt-4 text-center">
              <p className="text-gray-400 text-sm">
                Having trouble with the video?{' '}
                <a 
                  href="https://www.youtube.com/watch?v=DsotI2Xwd2E" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 underline"
                >
                  Watch Echo Blvd&#39;s cover of &quot;Times Like These&quot; on YouTube
                </a>
              </p>
            </div>
          </div>
        </div>
        
        {/* Music Tracks Section */}
        <div className="mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-6">
            Latest Tracks
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Track Card 1 - Shimmer */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
              <h3 className="text-xl font-semibold text-white mb-2">Shimmer</h3>
              <p className="text-gray-400 mb-4">Fuel Cover - Latest Release</p>
              <a 
                href="https://www.youtube.com/watch?v=_QzF31T5jsg" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors inline-block"
              >
                Watch on YouTube
              </a>
            </div>
            
            {/* Track Card 2 - Interstate Love Song */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
              <h3 className="text-xl font-semibold text-white mb-2">Interstate Love Song</h3>
              <p className="text-gray-400 mb-4">Stone Temple Pilots Cover</p>
              <a 
                href="https://www.youtube.com/watch?v=Lh-VdQjkhBo" 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors inline-block"
              >
                Watch on YouTube
              </a>
            </div>
            
            {/* Track Card 3 - Live Performances */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
              <h3 className="text-xl font-semibold text-white mb-2">Live Performances</h3>
              <p className="text-gray-400 mb-4">Check out our live shows</p>
              <a href="/shows" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors inline-block">
                View Shows
              </a>
            </div>
          </div>
        </div>
        
        {/* Social Media Links */}
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Follow Echo Blvd</h2>
          <p className="text-gray-400 mb-6">
            Stay updated with our latest music and shows
          </p>
          <div className="flex justify-center space-x-6">
            <a 
              href="https://www.instagram.com/echoblvdband/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
            </a>
            <a 
              href="https://www.facebook.com/echoblvdmusic" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Facebook"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a 
              href="https://www.youtube.com/@EchoBlvdBand" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="YouTube"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 