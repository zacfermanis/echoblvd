import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact - Echo Blvd',
  description: 'Get in touch with Echo Blvd for bookings, press inquiries, or just to say hello.',
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h1 className="text-4xl sm:text-6xl font-bold text-white mb-8">
          Contact
        </h1>
        <p className="text-xl text-gray-300 mb-12">
          Get in touch with us
        </p>
        
        {/* Placeholder for contact content */}
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">Contact form and information coming soon...</p>
        </div>
      </div>
    </div>
  );
} 