import type { Page } from 'playwright';
import { BaseAdapter, type ScrapePage } from './base-adapter.js';
import type { AdapterConfig } from './base-adapter.js';

/**
 * Adapter for The Whisky Barrel (thewhiskybarrel.com)
 * Retailer ID: whisky-barrel | Country: GB | Currency: GBP
 *
 * Shopify-based store. Catalog at /whisky (paginated via ?page=N).
 *
 * TODO: verify selectors against live site before production run.
 */
export class WhiskyBarrelAdapter extends BaseAdapter {
  constructor(overrides?: Partial<AdapterConfig>) {
    super({
      retailerId: 'whisky-barrel',
      baseUrl: 'https://www.thewhiskybarrel.com',
      countryCode: 'GB',
      requestDelayMs: 2000,
      ...overrides,
    });
  }

  async scrapeListingPage(page: Page, url: string): Promise<ScrapePage> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('.product-item, .grid-product', { timeout: 15_000 });

    const baseUrl = this.config.baseUrl;

    const products = await page.$$eval(
      '.product-item, .grid-product',
      (cards, base) =>
        cards.map((card) => {
          const nameEl =
            card.querySelector('.product-item__title, .grid-product__title');
          const name = nameEl?.textContent?.trim() ?? '';

          const priceEl = card.querySelector(
            '.product-item__price .money, .grid-product__price .money, [class*="price"]',
          );
          const priceText = priceEl?.textContent?.trim() ?? '';
          const priceMatch = priceText.match(/[\d,.]+/);
          const priceLocal = priceMatch
            ? parseFloat(priceMatch[0]!.replace(',', ''))
            : 0;

          const linkEl = card.querySelector('a[href*="/products/"]') as HTMLAnchorElement | null;
          const href = linkEl?.getAttribute('href') ?? '';
          const productUrl = href.startsWith('http') ? href : `${base}${href}`;
          const slug = href.split('/products/').pop()?.split('?')[0] ?? name.toLowerCase().replace(/\s+/g, '-');

          const imgEl = card.querySelector('img') as HTMLImageElement | null;
          const imageUrl = imgEl?.src ?? null;

          // Shopify product titles often contain volume/ABV in description — default 700ml
          return {
            retailerId: 'whisky-barrel',
            sourceProductId: slug,
            name,
            priceLocal,
            currency: 'GBP',
            volumeMl: 700,
            abv: null,
            inStock: !card.querySelector('[class*="sold-out"], [class*="unavailable"]'),
            url: productUrl,
            imageUrl: imageUrl || null,
          };
        }),
      baseUrl,
    );

    // Shopify pagination: ?page=N
    const currentPage = new URL(url).searchParams.get('page');
    const nextPage = parseInt(currentPage ?? '1', 10) + 1;
    const hasNext = await page.$('a[href*="?page="], .pagination__next, [rel="next"]');
    const nextPageUrl = hasNext
      ? `${this.config.baseUrl}/whisky?page=${nextPage}`
      : null;

    return { url, products: products.filter((p) => p.name && p.priceLocal > 0), nextPageUrl };
  }
}
