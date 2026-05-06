import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.thewhiskyexchange.com' },
      { protocol: 'https', hostname: '*.masterofmalt.com' },
      { protocol: 'https', hostname: '*.totalwine.com' },
    ],
  },
};

export default nextConfig;
