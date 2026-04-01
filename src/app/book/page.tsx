import type { Metadata } from 'next';
import { AmbientPhotoBackground } from '@/app/components/layout/ambient-photo-background';
import { pageBackgrounds } from '@/app/lib/page-backgrounds';
import { BookingForm } from './booking-form';

export const metadata: Metadata = {
  title: 'Book Echo Blvd - Private Events & Parties',
  description:
    'Hire Echo Blvd for private parties, corporate events, festivals, and community events across the Raleigh-Durham Triangle.',
};

export default function BookPage() {
  return (
    <div className="relative min-h-screen text-white pt-20 pb-16">
      <AmbientPhotoBackground src={pageBackgrounds.book} overlay="medium" />
      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Book Echo Blvd
            </h1>
            <p className="text-xl text-gray-200 mb-6">
              A high-energy live rock band for private parties, corporate events,
              breweries, festivals, and community events across the Triangle.
            </p>
            <p className="text-gray-300 mb-8">
              We bring a polished, crowd-friendly setlist of &apos;90s and &apos;00s rock favorites,
              professional production, and an easy, responsive booking process so you can feel
              confident about your event.
            </p>

            <div className="space-y-6">
              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">
                  Event types we play
                </h2>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-300 text-sm">
                  <li>Private parties &amp; milestone birthdays</li>
                  <li>Corporate events &amp; company parties</li>
                  <li>HOA / neighborhood events</li>
                  <li>Breweries &amp; bar special events</li>
                  <li>Festivals &amp; community events</li>
                  <li>Fundraisers &amp; charity events</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">
                  Service area
                </h2>
                <p className="text-gray-300 text-sm">
                  Based in the Raleigh-Durham-Chapel Hill area, we primarily serve the Triangle
                  and surrounding North Carolina communities. For events farther out, travel
                  may be available by arrangement.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">
                  What&apos;s included
                </h2>
                <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                  <li>Full-band live rock show with flexible set lengths</li>
                  <li>Professional PA and basic stage lighting for most events</li>
                  <li>Stage plot and input list available for venues with in-house production</li>
                  <li>Family-friendly edits and volume levels tailored to your crowd</li>
                  <li>Option for announcements and basic emcee duties for your event</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">
                  Professional &amp; easy to work with
                </h2>
                <p className="text-gray-300 text-sm mb-2">
                  Echo Blvd operates like a professional events partner, not a chaotic bar band.
                </p>
                <ul className="list-disc list-inside text-gray-300 text-sm space-y-1">
                  <li>Clear advance details and quick responses</li>
                  <li>Stage plot and input list on request</li>
                  <li>Prepared to work with your planner, venue, or production team</li>
                  <li>Performance agreement, deposit, and insurance available as needed</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-3">
                  Promo &amp; tech info
                </h2>
                <p className="text-gray-300 text-sm">
                  Looking for media, stage plot, or technical details? We can provide a simple
                  EPK with photos, video links, and production info on request, or share files
                  directly with your venue or planner.
                </p>
              </section>
            </div>
          </div>

          <div className="bg-gray-900/75 backdrop-blur-md rounded-lg p-6 sm:p-8 shadow-xl border border-white/10">
            <h2 className="text-2xl font-semibold text-white mb-4">
              Check availability &amp; request a quote
            </h2>
            <p className="text-gray-300 text-sm mb-6">
              Tell us a bit about your event and we&apos;ll follow up quickly with availability,
              pricing, and any questions.
            </p>
            <BookingForm />
          </div>
        </div>
      </div>
    </div>
  );
}

