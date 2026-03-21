import type { Metadata } from 'next';
import type { Show } from '@/app/types/band';
import { getPreviousShows, getUpcomingShows } from '@/app/lib/content';

export const metadata: Metadata = {
  title: 'Shows - Echo Blvd',
  description:
    'See where Echo Blvd is playing live around the Triangle.',
};

export const revalidate = 0;

function formatTime12h(time: string): string {
  // expects 'HH:MM'
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  const hour12 = ((h + 11) % 12) + 1;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const minutes = m.toString().padStart(2, '0');
  return `${hour12}:${minutes} ${suffix}`;
}

function ShowList({ shows }: { shows: Show[] }) {
  return (
    <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
      {shows.map(show => (
        <div key={show.id} className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-white text-xl font-semibold">
                {new Date(show.date).toLocaleDateString('en-US')}
              </h2>
              <p className="text-gray-300">
                <span>{show.venue}</span>
                {`, ${show.city}`}
              </p>
            </div>
            <div className="text-gray-300">
              {show.startTime
                ? `${formatTime12h(show.startTime)}${
                    show.endTime ? ` – ${formatTime12h(show.endTime)}` : ''
                  }`
                : show.description ?? ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default async function ShowsPage() {
  const [shows, previousShows] = await Promise.all([
    getUpcomingShows(),
    getPreviousShows(),
  ]);

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl sm:text-6xl font-bold text-white mb-8">
          Shows
        </h1>
        <p className="text-xl text-gray-300 mb-12">
          Catch us live around the Triangle!
        </p>
        {shows.length === 0 ? (
          <div className="bg-gray-800 rounded-lg p-8 text-gray-300">
            No upcoming shows yet. Check back soon!
          </div>
        ) : (
          <ShowList shows={shows} />
        )}

        <section className="mt-16 sm:mt-20" aria-labelledby="previous-shows-heading">
          <h2
            id="previous-shows-heading"
            className="text-2xl sm:text-3xl font-bold text-white mb-6"
          >
            Previous shows
          </h2>
          <p className="text-gray-400 mb-8 max-w-3xl">
            Where we&apos;ve played recently.
          </p>
          {previousShows.length === 0 ? (
            <div className="bg-gray-800/80 rounded-lg p-8 text-gray-400 border border-gray-700/50">
              Past dates will appear here after your gigs.
            </div>
          ) : (
            <div className="opacity-95">
              <ShowList shows={previousShows} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
