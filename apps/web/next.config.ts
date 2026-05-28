import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    // All retailer CDN hostnames — used when images are served directly.
    // For hotlink-protected sources, the /api/img proxy is used instead.
    remotePatterns: [
      { protocol: 'https', hostname: '*.thewhiskyexchange.com' },
      { protocol: 'https', hostname: 'cdn.thewhiskyexchange.com' },
      { protocol: 'https', hostname: '*.masterofmalt.com' },
      { protocol: 'https', hostname: 'cdn.masterofmalt.com' },
      { protocol: 'https', hostname: '*.totalwine.com' },
      { protocol: 'https', hostname: 'images.totalwine.com' },
      { protocol: 'https', hostname: '*.whiskybase.com' },
      { protocol: 'https', hostname: 'images.whiskybase.com' },
      { protocol: 'https', hostname: '*.whisky.de' },
      { protocol: 'https', hostname: '*.whiskybarrel.co.uk' },
      { protocol: 'https', hostname: '*.abbeywhisky.com' },
      { protocol: 'https', hostname: '*.klwines.com' },
      { protocol: 'https', hostname: '*.lcbo.com' },
      // Image proxy self-reference (for Next.js <Image> with /api/img)
      { protocol: 'https', hostname: 'whiskyhunter.com' },
      { protocol: 'http',  hostname: 'localhost' },
    ],
  },
};

export default nextConfig;
