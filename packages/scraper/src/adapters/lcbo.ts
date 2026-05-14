import type { Page } from 'playwright';
import { BaseAdapter, type ScrapePage } from './base-adapter.js';
import type { AdapterConfig } from './base-adapter.js';

/**
 * Adapter for LCBO (lcbo.com)
 * Retailer ID: lcbo | Country: CA | Currency: CAD
 *
 * Ontario government-owned spirits retailer. Strong Scotch selection.
 * Catalog: /en/products?categories=spirits/whisky — faceted search, paginated.
 *
 * LCBO uses a dynamic React frontend — wait for product grid to hydrate.
 *
 * TODO: verify selectors against live site before production run.
 */
export class LcboAdapter extends BaseAdapter {
  constructor(overrides?: Partial<AdapterConfig>) {
    super({
      retailerId: 'lcbo',
      baseUrl: 'https://www.lcbo.com',
      countryCode: 'CA',
      requestDelayMs: 3000,
      ...overrides,
    });
  }

  async scrapeListingPage(page: Page, url: string): Promise<ScrapePage> {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });

    // Accept cookies if prompted
    const cookieBtn = page.locator('button#onetrust-accept-btn-handler, [class*="accept-cookie"]');
    if (await cookieBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
      await cookieBtn.first().click();
      await page.waitForTimeout(1000);
    }

    await page.waitForSelector('[class*="product-card"], [class*="ProductCard"], .product-item', { timeout: 20_000 });

    const baseUrl = this.config.baseUrl;

    const products = await page.$$eval(
      '[class*="product-card"], [class*="ProductCard"], .product-item',
      (cards, base) =>
        cards.map((card) => {
          const nameEl = card.querySelector(
            '[class*="product-name"], [class*="ProductName"], h3, h4, [class*="title"]',
          );
          const name = nameEl?.textContent?.trim() ?? '';

          const priceEl = card.querySelector('[class*="price"], [class*="Price"]');
          const priceText = priceEl?.textContent?.trim() ?? '';
          // Canadian format: "$49.95" or "49,95 $"
          const priceMatch = priceText.replace(/[$,\s]/g, '').match(/[\d.]+/);
          const priceLocal = priceMatch ? parseFloat(priceMatch[0]!) : 0;

          const linkEl = card.querySelector('a') as HTMLAnchorElement | null;
          const href = linkEl?.getAttribute('href') ?? '';
          const productUrl = href.startsWith('http') ? href : `${base}${href}`;
          const slug = href.split('/').filter(Boolean).pop() ?? '';

          const imgEl = card.querySelector('img') as HTMLImageElement | null;
          const imageUrl = imgEl?.src ?? imgEl?.getAttribute('data-src') ?? null;

          const isSoldOut = !!card.querySelector(
            '[class*="sold-out"], [class*="SoldOut"], [class*="out-of-stock"], button[disabled]',
          );

          // LCBO titles often include volume: "700 mL", "750 mL"
          const volMatch = name.match(/(\d+(?:\.\d+)?)\s*(ml|l|cl)\b/i);
          let volumeMl = 750;
          if (volMatch) {
            const unit = volMatch[2]!.toLowerCase();
            const val = parseFloat(volMatch[1]!);
            if (unit === 'l') volumeMl = Math.round(val * 1000);
            else if (unit === 'cl') volumeMl = Math.round(val * 10);
            else volumeMl = Math.round(val);
          }

          const abvMatch = name.match(/(\d+(?:\.\d+)?)\s*%/);
          const abv = abvMatch ? parseFloat(abvMatch[1]!) : null;

          return {
            retailerId: 'lcbo',
            sourceProductId: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name,
            priceLocal,
            currency: 'CAD',
            volumeMl,
            abv,
            inStock: !isSoldOut,
            url: productUrl,
            imageUrl: imageUrl || null,
          };
        }),
      baseUrl,
    );

    // LCBO uses page query param
    const urlObj = new URL(url);
    const currentPage = parseInt(urlObj.searchParams.get('page') ?? '1', 10);
    const hasNext = await page.$('[aria-label="Next page"], [class*="pagination"] [class*="next"]:not([disabled])');
    const nextPageUrl = hasNext
      ? (() => {
          urlObj.searchParams.set('page', String(currentPage + 1));
          return urlObj.toString();
        })()
      : null;

    return { url, products: products.filter((p) => p.name && p.priceLocal > 0), nextPageUrl };
  }
}
