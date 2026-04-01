import { HeroSection } from './components/sections/hero-section';
import { AmbientPhotoBackground } from './components/layout/ambient-photo-background';
import { pageBackgrounds } from './lib/page-backgrounds';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="relative min-h-screen text-white">
      <AmbientPhotoBackground
        src={pageBackgrounds.home}
        priority
        overlay="medium"
      />
      <HeroSection />

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <section className="mt-12 sm:mt-16">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Available for private events
          </h2>
          <p className="text-gray-300 mb-4 max-w-2xl">
            Echo Blvd isn&apos;t just a bar band — we provide a turnkey live rock show for
            private and public events across the Triangle.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-gray-200 text-sm">
            <div className="bg-gray-900/65 backdrop-blur-sm rounded-md px-4 py-3 border border-white/5">
              Private parties &amp; milestone birthdays
            </div>
            <div className="bg-gray-900/65 backdrop-blur-sm rounded-md px-4 py-3 border border-white/5">
              Corporate events &amp; company parties
            </div>
            <div className="bg-gray-900/65 backdrop-blur-sm rounded-md px-4 py-3 border border-white/5">
              HOA / neighborhood events
            </div>
            <div className="bg-gray-900/65 backdrop-blur-sm rounded-md px-4 py-3 border border-white/5">
              Breweries &amp; bar special events
            </div>
            <div className="bg-gray-900/65 backdrop-blur-sm rounded-md px-4 py-3 border border-white/5">
              Festivals, fundraisers, &amp; community events
            </div>
          </div>
        </section>

        <section className="mt-12 sm:mt-16">
          <div className="bg-gray-900/70 backdrop-blur-md rounded-lg p-6 sm:p-8 border border-white/10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Professional, turnkey experience
            </h2>
            <p className="text-gray-300 mb-4">
              We show up prepared and self-contained so you don&apos;t have to worry about
              the band.
            </p>
            <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
              <li>Full PA and basic stage lighting for most events</li>
              <li>Stage plot and input list ready for venues with house production</li>
              <li>Polished, crowd-friendly setlist of &apos;90s and &apos;00s rock</li>
              <li>Responsive communication and clear expectations</li>
              <li>Flexible volume and family-friendly edits when needed</li>
            </ul>
          </div>
        </section>

        <section className="mt-12 sm:mt-16 text-center">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white mb-3">
            Ready to plan your event?
          </h2>
          <p className="text-gray-300 mb-6">
            Tell us about your date, venue, and crowd and we&apos;ll get back to you quickly
            with availability and pricing.
          </p>
          <Link
            href="/book"
            className="inline-flex items-center justify-center px-8 py-3 rounded-full bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
          >
            Book Echo Blvd
          </Link>
        </section>
      </main>
    </div>
  );
}
