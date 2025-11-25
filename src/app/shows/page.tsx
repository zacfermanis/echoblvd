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
        <div className="bg-gray-800 rounded-lg divide-y divide-gray-700">
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-white text-xl font-semibold">11/28/2025</h2>
                <p className="text-gray-300">
                  <a href="https://www.woodysportstavern.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    Woody&#39;s Sports Tavern and Grill
                  </a>
                  , Cary
                </p>
              </div>
              <div className="text-gray-300">9:30 PM – 12:30 AM</div>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-white text-xl font-semibold">12/20/2025</h2>
                <p className="text-gray-300">
                  <a href="https://www.tapyardraleigh.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    Tap Yard
                  </a>
                  , Raleigh
                </p>
              </div>
              <div className="text-gray-300">8:00 PM – 11:00 PM</div>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-white text-xl font-semibold">3/14/2026</h2>
                <p className="text-gray-300">
                  <a href="https://www.aviatorbrew.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    Aviator Brew Co. - Hangar Bar
                  </a>
                  , Fuquay-Varina
                </p>
              </div>
              <div className="text-gray-300">8:00 PM – 11:00 PM</div>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-white text-xl font-semibold">5/22/2026</h2>
                <p className="text-gray-300">
                  <a href="https://www.aviatorbrew.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    Aviator Brew Co. - Pizzeria
                  </a>
                  , Fuquay-Varina
                </p>
              </div>
              <div className="text-gray-300">8:00 PM – 11:00 PM</div>
            </div>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h2 className="text-white text-xl font-semibold">8/29/2026</h2>
                <p className="text-gray-300">
                  <a href="https://www.aviatorbrew.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                    Aviator Brew Co. - Grungefest
                  </a>
                  , Fuquay-Varina
                </p>
              </div>
              <div className="text-gray-300">TBD</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 