import type { Page } from 'playwright';
import { BaseAdapter, type ScrapePage } from './base-adapter.js';
import type { AdapterConfig } from './base-adapter.js';

/**
 * Adapter for The Whisky Exchange (thewhiskyexchange.com)
 * Retailer ID: whisky-exchange | Country: GB | Currency: GBP
 *
 * Site structure (as of 2025):
 *  - Listing page: /c/40/single-malt-scotch-whisky?pg=N
 *  - Product card: .product-card
 *  - Name: .product-card__name
 *  - Price: .product-card__price-value (format "£XX.XX")
 *  - Volume + ABV in .product-card__meta (text: "70cl / 40%")
 *  - Next page link: a[aria-label="Next page"]
 *
 * NOTE: selectors are fragile — update when TWE redesigns.
 */
export class WhiskyExchangeAdapter extends BaseAdapter {
  constructor(overrides?: Partial<AdapterConfig>) {
    super({
      retailerId: 'whisky-exchange',
      baseUrl: 'https://www.thewhiskyexchange.com',
      countryCode: 'GB',
      requestDelayMs: 2000,
      ...overrides,
    });
  }

  async scrapeListingPage(page: Page, url: string): Promise<ScrapePage> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Accept cookie banner if present (first page only)
    const cookieBtn = page.locator('button#onetrust-accept-btn-handler');
    if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cookieBtn.click();
    }

    await page.waitForSelector('.product-card', { timeout: 15_000 });

    const baseUrl = this.config.baseUrl;

    const products = await page.$$eval(
      '.product-card',
      (cards, base) =>
        cards.map((card) => {
          const name =
            card.querySelector('.product-card__name')?.textContent?.trim() ??
            '';
          const priceText =
            card
              .querySelector('.product-card__price-value')
              ?.textContent?.trim() ?? '';
          const metaText =
            card
              .querySelector('.product-card__meta')
              ?.textContent?.trim() ?? '';
          const href =
            (card.querySelector('a.product-card__link') as HTMLAnchorElement)
              ?.getAttribute('href') ?? '';
          const productUrl = href.startsWith('http') ? href : `${base}${href}`;
          const imageUrl =
            (
              card.querySelector(
                'img.product-card__image',
              ) as HTMLImageElement | null
            )?.src ?? null;

          // Parse "70cl / 40%" → volumeMl=700, abv=40
          const metaMatch = metaText.match(/(\d+)cl\s*\/\s*([\d.]+)%/i);
          const volumeMl = metaMatch ? parseInt(metaMatch[1]!, 10) * 10 : 700;
          const abv = metaMatch ? parseFloat(metaMatch[2]!) : null;

          // Parse "£XX.XX" → decimal price
          const priceMatch = priceText.match(/[\d,.]+/);
          const priceLocal = priceMatch
            ? parseFloat(priceMatch[0]!.replace(',', ''))
            : 0;

          const slug =
            href.split('/').filter(Boolean).pop() ?? name.toLowerCase();

          return {
            retailerId: 'whisky-exchange',
            sourceProductId: slug,
            name,
            priceLocal,
            currency: 'GBP',
            volumeMl,
            abv,
            inStock: true,
            url: productUrl,
            imageUrl: imageUrl || null,
          };
        }),
      baseUrl,
    );

    // Next page link
    const nextHref = await page
      .locator('a[aria-label="Next page"]')
      .getAttribute('href')
      .catch(() => null);

    const nextPageUrl = nextHref
      ? `${this.config.baseUrl}${nextHref}`
      : null;

    return { url, products, nextPageUrl };
  }
}
