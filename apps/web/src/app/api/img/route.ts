/**
 * Image proxy route — GET /api/img?url=<encoded>
 *
 * Fetches bottle images from retailer CDNs on the server side, bypassing
 * browser-level hotlink protection. Adds proper Cache-Control headers so
 * the response is cached by the CDN / browser for 24 hours.
 *
 * Allowlist: only proxies URLs from known retailer domains to prevent SSRF.
 */

import { type NextRequest, NextResponse } from 'next/server';

const ALLOWED_HOSTS = new Set([
  'thewhiskyexchange.com',
  'cdn.thewhiskyexchange.com',
  'masterofmalt.com',
  'cdn.masterofmalt.com',
  'totalwine.com',
  'images.totalwine.com',
  'whiskybase.com',
  'images.whiskybase.com',
  'www.whiskybase.com',
  'whisky.de',
  'www.whisky.de',
  'whiskybarrel.co.uk',
  'www.whiskybarrel.co.uk',
  'abbeywhisky.com',
  'www.abbeywhisky.com',
  'klwines.com',
  'www.klwines.com',
  'lcbo.com',
  'www.lcbo.com',
  'la-maison-du-whisky.fr',
  'www.la-maison-du-whisky.fr',
]);

function isAllowed(urlStr: string): boolean {
  try {
    const { hostname, protocol } = new URL(urlStr);
    if (protocol !== 'https:') return false;
    // Allow exact match or subdomain match
    return ALLOWED_HOSTS.has(hostname) ||
      [...ALLOWED_HOSTS].some((h) => hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  if (!raw) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  let urlStr: string;
  try {
    urlStr = decodeURIComponent(raw);
  } catch {
    return NextResponse.json({ error: 'Invalid url encoding' }, { status: 400 });
  }

  if (!isAllowed(urlStr)) {
    return NextResponse.json({ error: 'Domain not allowed' }, { status: 403 });
  }

  try {
    const upstream = await fetch(urlStr, {
      headers: {
        // Spoof a browser referer to avoid hotlink checks
        'Referer': new URL(urlStr).origin + '/',
        'User-Agent': 'Mozilla/5.0 (compatible; WhiskyHunter/1.0)',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream ${upstream.status}` },
        { status: upstream.status === 404 ? 404 : 502 },
      );
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg';
    if (!contentType.startsWith('image/')) {
      return NextResponse.json({ error: 'Not an image' }, { status: 400 });
    }

    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        // Cache 24h at CDN edge + browser; serve stale for up to 7 days while revalidating
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    console.error('[img-proxy] fetch error:', err);
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }
}
