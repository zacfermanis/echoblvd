import type { Metadata } from 'next';
import Image from 'next/image';
import { AmbientPhotoBackground } from '@/app/components/layout/ambient-photo-background';
import { pageBackgrounds } from '@/app/lib/page-backgrounds';

export const metadata: Metadata = {
  title: 'About - Echo Blvd',
  description:
    'Learn more about Echo Blvd, a high-energy Raleigh/Durham rock band available for private parties, corporate events, breweries, festivals, and community events.',
};

export default function AboutPage() {
  return (
    <div className="relative min-h-screen text-white">
      <AmbientPhotoBackground src={pageBackgrounds.about} overlay="medium" />
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl sm:text-6xl font-bold text-white mb-8">
          About
        </h1>
        <p className="text-xl text-gray-300 mb-12">
          Our story and the people behind the music
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-gray-900/70 backdrop-blur-md rounded-lg p-2 border border-white/10">
            <Image
              src="/echo_blvd_about_map.png"
              alt="Echo Blvd about page map artwork"
              width={1200}
              height={800}
              className="w-full h-auto rounded-md"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
          <div className="bg-gray-900/70 backdrop-blur-md rounded-lg p-8 border border-white/10">
            <p className="text-gray-200 leading-relaxed text-lg mb-4">
              Echo Blvd is a Raleigh/Durham rock band built around big &apos;90s and &apos;00s rock anthems, tight grooves, and a high-energy live show. Boston’s Zac Fermanis fronts local vets Tom Kuhn, Jeremy Buenviaje, and Scott Little.
            </p>
            <p className="text-gray-300 leading-relaxed text-base">
              The band plays bars, breweries, and stages around the Triangle, and is also available for private parties, corporate events, neighborhood gatherings, festivals, and other community events. Echo Blvd combines a polished, crowd-friendly set with professional sound, lighting, and an easy, event-focused approach to working with hosts, venues, and planners.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 