import type { Page } from 'playwright';
import { BaseAdapter, type ScrapePage } from './base-adapter.js';
import type { AdapterConfig } from './base-adapter.js';

/**
 * Adapter for K&L Wine Merchants (klwines.com)
 * Retailer ID: kl-wines | Country: US | Currency: USD
 *
 * California-based retailer with strong Scotch selection.
 * Catalog: /Products?filters=sv2_207%3D33 (Scotch whisky category).
 *
 * TODO: verify selectors against live site before production run.
 */
export class KlWinesAdapter extends BaseAdapter {
  constructor(overrides?: Partial<AdapterConfig>) {
    super({
      retailerId: 'kl-wines',
      baseUrl: 'https://www.klwines.com',
      countryCode: 'US',
      requestDelayMs: 2000,
      ...overrides,
    });
  }

  async scrapeListingPage(page: Page, url: string): Promise<ScrapePage> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('.result, .product-result, [class*="result-"]', { timeout: 15_000 });

    const baseUrl = this.config.baseUrl;

    const products = await page.$$eval(
      '.result, .product-result',
      (cards, base) =>
        cards.map((card) => {
          const nameEl = card.querySelector('.result-desc a, h3 a, .name a, [class*="desc"] a');
          const name = nameEl?.textContent?.trim() ?? '';

          const priceEl = card.querySelector('.price, [class*="price"], .result-price');
          const priceText = priceEl?.textContent?.trim() ?? '';
          const priceMatch = priceText.replace(/[$,]/g, '').match(/[\d.]+/);
          const priceLocal = priceMatch ? parseFloat(priceMatch[0]!) : 0;

          const linkEl = (nameEl as HTMLAnchorElement | null) ??
            (card.querySelector('a[href*="/Product"]') as HTMLAnchorElement | null);
          const href = linkEl?.getAttribute('href') ?? '';
          const productUrl = href.startsWith('http') ? href : `${base}${href}`;
          const skuMatch = href.match(/sku=(\d+)/i) ?? href.match(/\/(\d+)$/);
          const slug = skuMatch ? skuMatch[1]! : name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

          const imgEl = card.querySelector('img') as HTMLImageElement | null;
          const imageUrl = imgEl?.src ?? null;

          const isSoldOut = !!card.querySelector('[class*="sold"], [class*="unavailable"], .out-of-stock');

          // K&L often includes volume in the title: "750ml", "1.75L"
          const volMatch = name.match(/(\d+(?:\.\d+)?)\s*(ml|l)\b/i);
          let volumeMl = 750;
          if (volMatch) {
            const unit = volMatch[2]!.toLowerCase();
            const val = parseFloat(volMatch[1]!);
            volumeMl = unit === 'l' ? Math.round(val * 1000) : Math.round(val);
          }

          const abvMatch = name.match(/(\d+(?:\.\d+)?)\s*%/);
          const abv = abvMatch ? parseFloat(abvMatch[1]!) : null;

          return {
            retailerId: 'kl-wines',
            sourceProductId: slug,
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

    // Pagination: offset parameter
    const urlObj = new URL(url);
    const currentOffset = parseInt(urlObj.searchParams.get('offset') ?? '0', 10);
    const pageSize = products.length;
    const hasNext = await page.$('a[rel="next"], .pagination .next, [aria-label="Next"]');
    const nextPageUrl = hasNext && pageSize > 0
      ? (() => {
          urlObj.searchParams.set('offset', String(currentOffset + pageSize));
          return urlObj.toString();
        })()
      : null;

    return { url, products: products.filter((p) => p.name && p.priceLocal > 0), nextPageUrl };
  }
}
