import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Serve AVIF/WebP to supporting browsers (Next falls back to original
    // automatically). Pure win — no behavior/logic change.
    formats: ['image/avif', 'image/webp'],
    // Optimized variants stay cached 31 days (Vercel's max). Without this the
    // optimizer honors the upstream max-age — Firebase Storage objects say
    // `private, max-age=0`, so every variant re-pulled the original from
    // Firebase every 4h (default TTL floor) = billed Storage bandwidth.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
      {
        protocol: 'https',
        hostname: 'robohash.org',
      },
      {
        protocol: 'https',
        hostname: 'cdnjs.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh4.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'www.svgrepo.com',
      },
    ],
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  compiler: {
    // Strip console.log/info/debug from production bundles (dozens are left
    // in student-facing paths). error/warn stay — they are the operational
    // signals in Vercel logs and the browser console.
    removeConsole: { exclude: ['error', 'warn'] },
  },
};

export default nextConfig;
