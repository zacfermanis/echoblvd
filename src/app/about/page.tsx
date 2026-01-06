import type { Metadata } from 'next';
import Image from 'next/image';

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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="bg-gray-800 rounded-lg p-2">
            <Image
              src="/echo_blvd_about_map.png"
              alt="Echo Blvd about page map artwork"
              width={1200}
              height={800}
              className="w-full h-auto rounded-md"
              sizes="(min-width: 1024px) 50vw, 100vw"
            />
          </div>
          <div className="bg-gray-800 rounded-lg p-8">
            <p className="text-gray-200 leading-relaxed text-lg">
              Echo Blvd is a Raleigh/Durham rock band with classic swagger and alt-rock grit. Boston’s Zac Fermanis fronts local vets Tom Kuhn, Jeremy Buenviaje, and Scott Little. From club to party, they bring tight grooves, raw vocals, and serious energy.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
} 