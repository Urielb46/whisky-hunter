import type { Page } from 'playwright';
import { BaseAdapter, type ScrapePage } from './base-adapter.js';
import type { AdapterConfig } from './base-adapter.js';

/**
 * Adapter for Abbey Whisky (abbeywhisky.com)
 * Retailer ID: abbey-whisky | Country: GB | Currency: GBP
 *
 * Shopify-based store. Catalog at /collections/all (paginated via ?page=N).
 *
 * TODO: verify selectors against live site before production run.
 */
export class AbbeyWhiskyAdapter extends BaseAdapter {
  constructor(overrides?: Partial<AdapterConfig>) {
    super({
      retailerId: 'abbey-whisky',
      baseUrl: 'https://www.abbeywhisky.com',
      countryCode: 'GB',
      requestDelayMs: 2000,
      ...overrides,
    });
  }

  async scrapeListingPage(page: Page, url: string): Promise<ScrapePage> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('.product-item, .grid__item, [class*="product-card"]', { timeout: 15_000 });

    const baseUrl = this.config.baseUrl;

    const products = await page.$$eval(
      '.product-item, .grid__item, [class*="product-card"]',
      (cards, base) =>
        cards.map((card) => {
          const nameEl = card.querySelector(
            '.product-item__title, .product-card__title, h2, h3',
          );
          const name = nameEl?.textContent?.trim() ?? '';

          const priceEl = card.querySelector(
            '[class*="price"] .money, [class*="price"]',
          );
          const priceText = priceEl?.textContent?.trim() ?? '';
          const priceMatch = priceText.replace(/[£,]/g, '').match(/[\d.]+/);
          const priceLocal = priceMatch ? parseFloat(priceMatch[0]!) : 0;

          const linkEl = card.querySelector('a[href*="/products/"]') as HTMLAnchorElement | null;
          const href = linkEl?.getAttribute('href') ?? '';
          const productUrl = href.startsWith('http') ? href : `${base}${href}`;
          const slug = href.split('/products/').pop()?.split('?')[0] ?? '';

          const imgEl = card.querySelector('img[src], img[data-src]') as HTMLImageElement | null;
          const imageUrl =
            imgEl?.getAttribute('src') ??
            imgEl?.getAttribute('data-src') ??
            null;

          const isSoldOut = !!card.querySelector(
            '[class*="sold-out"], [class*="unavailable"], button[disabled]',
          );

          return {
            retailerId: 'abbey-whisky',
            sourceProductId: slug || name.toLowerCase().replace(/\s+/g, '-'),
            name,
            priceLocal,
            currency: 'GBP',
            volumeMl: 700,
            abv: null,
            inStock: !isSoldOut,
            url: productUrl,
            imageUrl: imageUrl || null,
          };
        }),
      baseUrl,
    );

    const currentPage = parseInt(new URL(url).searchParams.get('page') ?? '1', 10);
    const hasNext = await page.$('[rel="next"], .pagination__next, a[href*="?page="]');
    const nextPageUrl = hasNext
      ? `${this.config.baseUrl}/collections/all?page=${currentPage + 1}`
      : null;

    return { url, products: products.filter((p) => p.name && p.priceLocal > 0), nextPageUrl };
  }
}
