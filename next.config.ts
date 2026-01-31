import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.cdninstagram.com',
      },
    ],
  },
  headers: async () => {
    return [
      {
        source: '/:path*.svg',
        headers: [
          {
            key: 'Content-Type',
            value: 'image/svg+xml; charset=utf-8',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ['@svgr/webpack'],
  },
};

export default nextConfig;
