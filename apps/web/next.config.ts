import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // All retailer CDN hostnames — used when images are served directly.
    // For hotlink-protected sources, the /api/img proxy is used instead.
    remotePatterns: [
      { protocol: 'https', hostname: '*.thewhiskyexchange.com' },
      { prot