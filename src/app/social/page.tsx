import type { Metadata } from 'next';
import Image from 'next/image';
import { unstable_noStore as noStore } from 'next/cache';
import { AmbientPhotoBackground } from '@/app/components/layout/ambient-photo-background';
import { pageBackgrounds } from '@/app/lib/page-backgrounds';
import { getInstagramFeed } from '@/app/lib/instagram';
import type { InstagramMedia } from '@/app/types/instagram';

export const metadata: Metadata = {
  title: 'Social - Echo Blvd',
  description:
    'Latest Instagram posts and live clips from Echo Blvd around Raleigh-Durham and beyond.',
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
  // Skip static prerender so runtime env (Vercel) is used; noStore is page-scoped
  // so @/app/lib/instagram stays testable without loading next/cache in Jest.
  noStore();
  const posts = await getInstagramFeed({ limit: 12 });

  return (
    <div className="relative min-h-screen text-white pt-16">
      <AmbientPhotoBackground
        src={pageBackgrounds.social}
        overlay="heavy"
        visibleImageHeightFraction={2 / 3}
      />
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-4xl sm:text-6xl font-bold text-white mb-4">
          Social
        </h1>
        <p className="text-xl text-gray-300 mb-8">
          Recent Instagram posts and live clips that show what an Echo Blvd show feels like up close.
        </p>
        {posts.length === 0 ? (
          <div className="bg-gray-900/70 backdrop-blur-md rounded-lg p-8 text-gray-300 border border-white/10">
            No Instagram posts available yet.
          </div>
        ) : (
          <div className="h-[calc(100dvh-6rem)] overflow-y-scroll snap-y snap-mandatory rounded-2xl border border-white/15 bg-black/35 backdrop-blur-sm shadow-2xl">
            {posts.map((item) => (
              <article
                key={item.id}
                data-testid="instagram-feed-item"
                className="snap-start min-h-[calc(100dvh-6rem)] flex flex-col bg-black/30"
              >
                <div className="relative min-h-[min(58vh,520px)] flex-1 bg-black">
                  {item.mediaType === 'VIDEO' ? (
                    <video
                      className="absolute inset-0 h-full w-full object-contain"
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
                      className="object-contain"
                      priority={false}
                    />
                  )}
                </div>
                <div className="shrink-0 bg-gray-900/90 px-6 py-5 space-y-3">
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

