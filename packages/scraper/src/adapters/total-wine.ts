import type { Page } from 'playwright';
import { BaseAdapter, type ScrapePage } from './base-adapter.js';
import type { AdapterConfig } from './base-adapter.js';

/**
 * Adapter for Total Wine & More (totalwine.com)
 * Retailer ID: total-wine | Country: US | Currency: USD
 *
 * Site structure (as of 2025):
 *  - Listing: /spirits/scotch-whisky/c/000053?tab=fullcatalog&sortBy=lowPrice&pageSize=24
 *  - Product card: .plp-product-list-item
 *  - Name: .plp-product__name
 *  - Price: .product__price (format "$XX.XX")
 *  - Volume: .plp-product__volume (format "750 mL")
 *  - Next page: button[aria-label="Next page"] or a.next
 */
export class TotalWineAdapter extends BaseAdapter {
  constructor(overrides?: Partial<AdapterConfig>) {
    super({
      retailerId: 'total-wine',
      baseUrl: 'https://www.totalwine.com',
      countryCode: 'US',
      requestDelayMs: 2500,
      ...overrides,
    });
  }

  async scrapeListingPage(page: Page, url: string): Promise<ScrapePage> {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });

    await page.waitForSelector('.plp-product-list-item', { timeout: 20_000 });

    const baseUrl = this.config.baseUrl;

    const products = await page.$$eval(
      '.plp-product-list-item',
      (cards, base) =>
        cards.map((card) => {
          const name =
            card.querySelector('.plp-product__name')?.textContent?.trim() ?? '';
          const priceText =
            card.querySelector('.product__price')?.textContent?.trim() ?? '';
          const volumeText =
            card.querySelector('.plp-product__volume')?.textContent?.trim() ?? '';
          const href =
            (card.querySelector('a') as HTMLAnchorElement | null)
              ?.getAttribute('href') ?? '';
          const productUrl = href.startsWith('http') ? href : `${base}${href}`;
          const imageUrl =
            (card.querySelector('img') as HTMLImageElement | null)?.src ?? null;

          // Parse "$XX.XX"
          const priceMatch = priceText.match(/[\d,.]+/);
          const priceLocal = priceMatch
            ? parseFloat(priceMatch[0]!.replace(',', ''))
            : 0;

          // Parse "750 mL" or "1 L"
          const mlMatch = volumeText.match(/([\d.]+)\s*mL/i);
          const lMatch = volumeText.match(/([\d.]+)\s*L\b/i);
          let volumeMl = 750;
          if (mlMatch) volumeMl = Math.round(parseFloat(mlMatch[1]!));
          else if (lMatch) volumeMl = Math.round(parseFloat(lMatch[1]!) * 1000);

          const slug = href.split('/').filter(Boolean).pop() ?? name;

          return {
            retailerId: 'total-wine',
            sourceProductId: slug,
            name,
            priceLocal,
            currency: 'USD',
            volumeMl,
            abv: null,
            inStock: true,
            url: productUrl,
            imageUrl: imageUrl || null,
          };
        }),
      baseUrl,
    );

    // Next page
    const nextHref = await page
      .locator('a[aria-label="Next page"], a.next')
      .getAttribute('href')
      .catch(() => null);

    const nextPageUrl = nextHref
      ? nextHref.startsWith('http') ? nextHref : `${this.config.baseUrl}${nextHref}`
      : null;

    return { url, products, nextPageUrl };
  }
}
