import type { Page } from 'playwright';
import { BaseAdapter, type ScrapePage } from './base-adapter.js';
import type { AdapterConfig } from './base-adapter.js';

/**
 * Adapter for Spec's Wine, Spirits & Finer Foods (specsonline.com)
 * Retailer ID: specs | Country: US | Currency: USD
 *
 * Large Texas-based spirits retailer. Ships to limited US states.
 * Catalog at /spirits/scotch.html — paginated.
 *
 * TODO: verify selectors against live site before production run.
 */
export class SpecsAdapter extends BaseAdapter {
  constructor(overrides?: Partial<AdapterConfig>) {
    super({
      retailerId: 'specs',
      baseUrl: 'https://www.specsonline.com',
      countryCode: 'US',
      requestDelayMs: 2500,
      ...overrides,
    });
  }

  async scrapeListingPage(page: Page, url: string): Promise<ScrapePage> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('.product-tile, .product-card, [class*="product"]', { timeout: 15_000 });

    const baseUrl = this.config.baseUrl;

    const products = await page.$$eval(
      '.product-tile, .product-card',
      (cards, base) =>
        cards.map((card) => {
          const nameEl = card.querySelector('.product-tile__name, .product-name, h2, h3, [class*="name"]');
          const name = nameEl?.textContent?.trim() ?? '';

          const priceEl = card.querySelector('.product-tile__price, .price, [class*="price"]');
          const priceText = priceEl?.textContent?.trim() ?? '';
          const priceMatch = priceText.replace(/[$,]/g, '').match(/[\d.]+/);
          const priceLocal = priceMatch ? parseFloat(priceMatch[0]!) : 0;

          const linkEl = card.querySelector('a') as HTMLAnchorElement | null;
          const href = linkEl?.getAttribute('href') ?? '';
          const productUrl = href.startsWith('http') ? href : `${base}${href}`;
          const slug = href.split('/').filter(Boolean).pop() ?? '';

          const imgEl = card.querySelector('img') as HTMLImageElement | null;
          const imageUrl = imgEl?.src ?? imgEl?.getAttribute('data-src') ?? null;

          const isSoldOut = !!card.querySelector('[class*="out-of-stock"], [class*="unavailable"]');

          // Try to parse volume from name (e.g. "750ML", "1.75L")
          const volMatch = name.match(/(\d+(?:\.\d+)?)\s*(ml|l)\b/i);
          let volumeMl = 750; // US default
          if (volMatch) {
            const unit = volMatch[2]!.toLowerCase();
            const val = parseFloat(volMatch[1]!);
            volumeMl = unit === 'l' ? Math.round(val * 1000) : Math.round(val);
          }

          // Try to parse ABV from name
          const abvMatch = name.match(/(\d+(?:\.\d+)?)\s*%/);
          const abv = abvMatch ? parseFloat(abvMatch[1]!) : null;

          return {
            retailerId: 'specs',
            sourceProductId: slug || name.toLowerCase().replace(/\s+/g, '-'),
            name,
            priceLocal,
            currency: 'USD',
            volumeMl,
            abv,
            inStock: !isSoldOut,
            url: productUrl,
            imageUrl: imageUrl || null,
          };
        }),
      baseUrl,
    );

    const hasNext = await page.$('.pagination .next, a[rel="next"], [aria-label="Next page"]');
    const nextHref = hasNext
      ? await page.$eval('.pagination .next a, a[rel="next"]', (a) => (a as HTMLAnchorElement).href).catch(() => null)
      : null;

    return { url, products: products.filter((p) => p.name && p.priceLocal > 0), nextPageUrl: nextHref };
  }
}
