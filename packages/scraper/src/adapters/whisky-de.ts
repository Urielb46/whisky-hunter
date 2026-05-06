import type { Page } from 'playwright';
import { BaseAdapter, type ScrapePage } from './base-adapter.js';
import type { AdapterConfig } from './base-adapter.js';

/**
 * Adapter for Whisky.de (whisky.de)
 * Retailer ID: whisky-de | Country: DE | Currency: EUR
 *
 * Site structure (as of 2025):
 *  - Listing: /en/whiskies/?p=N
 *  - Product card: .product-box
 *  - Name: .product-name
 *  - Price: .price-unit (format "XX,XX €")
 *  - Volume: parsed from product name or detail (e.g. "0,7L")
 *  - Next page: a.next-page, rel="next"
 */
export class WhiskyDeAdapter extends BaseAdapter {
  constructor(overrides?: Partial<AdapterConfig>) {
    super({
      retailerId: 'whisky-de',
      baseUrl: 'https://www.whisky.de',
      countryCode: 'DE',
      requestDelayMs: 2000,
      ...overrides,
    });
  }

  async scrapeListingPage(page: Page, url: string): Promise<ScrapePage> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Cookie consent
    const cookieBtn = page.locator('button.js-cookie-accept-all, #onetrust-accept-btn-handler');
    if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cookieBtn.click();
      await page.waitForTimeout(500);
    }

    await page.waitForSelector('.product-box', { timeout: 15_000 });

    const baseUrl = this.config.baseUrl;

    const products = await page.$$eval(
      '.product-box',
      (boxes, base) =>
        boxes.map((box) => {
          const name =
            box.querySelector('.product-name')?.textContent?.trim() ?? '';
          const priceText =
            box.querySelector('.price-unit')?.textContent?.trim() ?? '';
          const href =
            (box.querySelector('a.product-name-link') as HTMLAnchorElement | null)
              ?.getAttribute('href') ?? '';
          const productUrl = href.startsWith('http') ? href : `${base}${href}`;
          const imageUrl =
            (box.querySelector('img') as HTMLImageElement | null)?.src ?? null;

          // Parse "49,95 €" or "49.95€"
          const priceMatch = priceText.replace(',', '.').match(/[\d.]+/);
          const priceLocal = priceMatch ? parseFloat(priceMatch[0]!) : 0;

          // Volume from name e.g. "0,7L" or "70cl"
          const volLMatch = name.match(/0[,.](\d)\s*[Ll]\b/);
          const volClMatch = name.match(/(\d+)\s*cl/i);
          let volumeMl = 700;
          if (volLMatch) volumeMl = parseInt(`${volLMatch[1]}00`, 10);
          else if (volClMatch) volumeMl = parseInt(volClMatch[1]!, 10) * 10;

          const slug = href.split('/').filter(Boolean).pop() ?? name;

          return {
            retailerId: 'whisky-de',
            sourceProductId: slug,
            name,
            priceLocal,
            currency: 'EUR',
            volumeMl,
            abv: null,
            inStock: true,
            url: productUrl,
            imageUrl: imageUrl || null,
          };
        }),
      baseUrl,
    );

    const nextHref = await page
      .locator('a[rel="next"], a.next-page')
      .getAttribute('href')
      .catch(() => null);

    const nextPageUrl = nextHref
      ? nextHref.startsWith('http') ? nextHref : `${this.config.baseUrl}${nextHref}`
      : null;

    return { url, products, nextPageUrl };
  }
}
