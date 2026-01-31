import type { Metadata } from 'next';
import Image from 'next/image';
import { getInstagramFeed } from '@/app/lib/instagram';
import type { InstagramMedia } from '@/app/types/instagram';

export const metadata: Metadata = {
  title: 'Social - Echo Blvd',
  description: 'Latest Instagram posts from Echo Blvd.',
};

function getCaptionText(item: InstagramMedia): string {
  if (item.caption && item.caption.trim().length > 0) return item.caption;
  return 'Instagram post';
}

function getPosterUrl(item: InstagramMedia): string | undefined {
  if (item.mediaType === 'VIDEO') return item.thumbnailUrl;
  return undefined;
}

function getTimestampLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function SocialPage() {
  const posts = await getInstagramFeed({ limit: 12 });

  return (
    <div className="min-h-screen bg-gray-900 pt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4">
          Social
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Latest posts from Instagram
        </p>
        {posts.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-gray-300">
            No Instagram posts available yet.
          </div>
        ) : (
          <div className="h-[calc(100vh-14rem)] overflow-y-scroll snap-y snap-mandatory rounded-2xl border border-gray-800">
            {posts.map((item) => (
              <article
                key={item.id}
                data-testid="instagram-feed-item"
                className="snap-start min-h-[calc(100vh-14rem)] flex flex-col bg-black/30"
              >
                <div className="relative flex-1">
                  {item.mediaType === 'VIDEO' ? (
                    <video
                      className="absolute inset-0 h-full w-full object-cover"
                      controls
                      playsInline
                      preload="metadata"
                      poster={getPosterUrl(item)}
                    >
                      <source src={item.mediaUrl} />
                    </video>
                  ) : (
                    <Image
                      src={item.mediaUrl}
                      alt={getCaptionText(item)}
                      fill
                      sizes="(max-width: 768px) 100vw, 80vw"
                      className="object-cover"
                      priority={false}
                    />
                  )}
                </div>
                <div className="bg-gray-900/90 px-6 py-5 space-y-3">
                  <div className="flex items-center justify-between text-sm text-gray-400">
                    <span>{item.username ?? 'Echo Blvd'}</span>
                    <span>{getTimestampLabel(item.timestamp)}</span>
                  </div>
                  <p className="text-gray-200 text-base leading-relaxed">
                    {getCaptionText(item)}
                  </p>
                  <a
                    href={item.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline text-sm"
                  >
                    View on Instagram
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

