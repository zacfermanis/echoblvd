import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Navigation } from "./components/layout/navigation";
import { Analytics } from "@vercel/analytics/next"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Echo Blvd - Official Website",
  description: "Official website of Echo Blvd. Listen to our latest music and find upcoming shows.",
  keywords: ["Echo Blvd", "indie rock", "music", "band", "Los Angeles"],
  authors: [{ name: "Echo Blvd" }],
  openGraph: {
    title: "Echo Blvd - Official Website",
    description: "Official website of Echo Blvd. Listen to our latest music and find upcoming shows.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Echo Blvd - Official Website",
    description: "Official website of Echo Blvd. Listen to our latest music and find upcoming shows.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-900 text-white`}
      >
        <Navigation />
        <main className="pt-16">
          {children}
        </main>
      </body>
    </html>
  );
}
