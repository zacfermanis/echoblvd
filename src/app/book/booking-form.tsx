"use client";

import { useState } from "react";

interface BookingFormState {
  name: string;
  email: string;
  eventDate: string;
  eventType: string;
  location: string;
  guestCount: string;
  indoorOutdoor: string;
  powerAvailable: string;
  budgetRange: string;
  message: string;
}

export function BookingForm() {
  const [form, setForm] = useState<BookingFormState>({
    name: "",
    email: "",
    eventDate: "",
    eventType: "",
    location: "",
    guestCount: "",
    indoorOutdoor: "",
    powerAvailable: "",
    budgetRange: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    if (!form.name || !form.email || !form.eventDate || !form.eventType || !form.location) {
      setError("Please fill in all required fields marked with *.");
      setIsSubmitting(false);
      return;
    }

    const composedMessage = [
      `Event Type: ${form.eventType}`,
      `Event Date: ${form.eventDate}`,
      `Location: ${form.location}`,
      form.guestCount ? `Guest Count: ${form.guestCount}` : null,
      form.indoorOutdoor ? `Indoor/Outdoor: ${form.indoorOutdoor}` : null,
      form.powerAvailable ? `Power Available: ${form.powerAvailable}` : null,
      form.budgetRange ? `Budget Range: ${form.budgetRange}` : null,
      "",
      "Additional Details:",
      form.message || "(none provided)",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          message: composedMessage,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send booking request.");
      }

      await res.json();
      setSuccess(true);
      setForm({
        name: "",
        email: "",
        eventDate: "",
        eventType: "",
        location: "",
        guestCount: "",
        indoorOutdoor: "",
        powerAvailable: "",
        budgetRange: "",
        message: "",
      });
    } catch {
      setError(
        "There was an error sending your booking request. Please try again or email booking@echoblvd.com."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="sm:col-span-1">
          <label htmlFor="name" className="block text-sm font-medium text-gray-200 mb-1">
            Name *
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            className="w-full px-4 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-1">
            Email *
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className="w-full px-4 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="eventDate" className="block text-sm font-medium text-gray-200 mb-1">
            Event Date *
          </label>
          <input
            id="eventDate"
            name="eventDate"
            type="date"
            className="w-full px-4 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.eventDate}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="eventType" className="block text-sm font-medium text-gray-200 mb-1">
            Event Type *
          </label>
          <select
            id="eventType"
            name="eventType"
            className="w-full px-4 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.eventType}
            onChange={handleChange}
            required
          >
            <option value="">Select an event type</option>
            <option value="Private party">Private party</option>
            <option value="Corporate event">Corporate event</option>
            <option value="HOA / neighborhood event">HOA / neighborhood event</option>
            <option value="Brewery / bar special event">Brewery / bar special event</option>
            <option value="Bar / venue show">Bar / venue show</option>
            <option value="Festival / community event">Festival / community event</option>
            <option value="Fundraiser / charity event">Fundraiser / charity event</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label htmlFor="location" className="block text-sm font-medium text-gray-200 mb-1">
            Event Location (venue and city) *
          </label>
          <input
            id="location"
            name="location"
            type="text"
            className="w-full px-4 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Venue name, city, and state"
            value={form.location}
            onChange={handleChange}
            required
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="guestCount" className="block text-sm font-medium text-gray-200 mb-1">
            Estimated Guest Count
          </label>
          <input
            id="guestCount"
            name="guestCount"
            type="number"
            min="0"
            className="w-full px-4 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.guestCount}
            onChange={handleChange}
          />
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="indoorOutdoor" className="block text-sm font-medium text-gray-200 mb-1">
            Indoor / Outdoor
          </label>
          <select
            id="indoorOutdoor"
            name="indoorOutdoor"
            className="w-full px-4 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.indoorOutdoor}
            onChange={handleChange}
          >
            <option value="">Select an option</option>
            <option value="Indoor">Indoor</option>
            <option value="Outdoor">Outdoor</option>
            <option value="Both / mixed">Both / mixed</option>
            <option value="Not sure yet">Not sure yet</option>
          </select>
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="powerAvailable" className="block text-sm font-medium text-gray-200 mb-1">
            Power Available
          </label>
          <select
            id="powerAvailable"
            name="powerAvailable"
            className="w-full px-4 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.powerAvailable}
            onChange={handleChange}
          >
            <option value="">Select an option</option>
            <option value="Standard outlets nearby">Standard outlets nearby</option>
            <option value="Generator / temporary power">Generator / temporary power</option>
            <option value="Not sure yet">Not sure yet</option>
          </select>
        </div>
        <div className="sm:col-span-1">
          <label htmlFor="budgetRange" className="block text-sm font-medium text-gray-200 mb-1">
            Budget Range
          </label>
          <select
            id="budgetRange"
            name="budgetRange"
            className="w-full px-4 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={form.budgetRange}
            onChange={handleChange}
          >
            <option value="">Select a range</option>
            <option value="Under $500">Under $500</option>
            <option value="$500–$1,000">$500–$1,000</option>
            <option value="$1,000–$2,000">$1,000–$2,000</option>
            <option value="$2,000–$3,000">$2,000–$3,000</option>
            <option value="$3,000+">$3,000+</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-200 mb-1">
          Tell us about your event
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          className="w-full px-4 py-2 rounded bg-gray-900 text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Schedule, vibe, special songs, volume needs, or anything else we should know."
          value={form.message}
          onChange={handleChange}
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}
      {success && (
        <p className="text-green-400 text-sm">
          Thanks for reaching out! We&apos;ll get back to you as soon as possible about your event.
        </p>
      )}

      <button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded transition-colors disabled:opacity-60"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Sending..." : "Request Availability & Quote"}
      </button>
    </form>
  );
}

