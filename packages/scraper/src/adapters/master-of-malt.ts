import type { Page } from 'playwright';
import { BaseAdapter, type ScrapePage } from './base-adapter.js';
import type { AdapterConfig } from './base-adapter.js';

/**
 * Adapter for Master of Malt (masterofmalt.com)
 * Retailer ID: master-of-malt | Country: GB | Currency: GBP
 *
 * Site structure (as of 2025):
 *  - Listing page: /whiskies/?pg=N
 *  - Product card: .product-pod
 *  - Name: .product-pod__name
 *  - Price: .product-pod__price .price
 *  - Volume + ABV: .product-pod__volume (text: "70cl, 40%")
 *  - Next page: a.pagination__next
 */
export class MasterOfMaltAdapter extends BaseAdapter {
  constructor(overrides?: Partial<AdapterConfig>) {
    super({
      retailerId: 'master-of-malt',
      baseUrl: 'https://www.masterofmalt.com',
      countryCode: 'GB',
      requestDelayMs: 2000,
      ...overrides,
    });
  }

  async scrapeListingPage(page: Page, url: string): Promise<ScrapePage> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Cookie consent
    const cookieBtn = page.locator('#onetrust-accept-btn-handler');
    if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cookieBtn.click();
      await page.waitForTimeout(500);
    }

    await page.waitForSelector('.product-pod', { timeout: 15_000 });

    const baseUrl = this.config.baseUrl;

    const products = await page.$$eval(
      '.product-pod',
      (pods, base) =>
        pods.map((pod) => {
          const name =
            pod.querySelector('.product-pod__name')?.textContent?.trim() ?? '';
          const priceText =
            pod
              .querySelector('.product-pod__price .price')
              ?.textContent?.trim() ?? '';
          const volumeText =
            pod.querySelector('.product-pod__volume')?.textContent?.trim() ??
            '';
          const href =
            (
              pod.querySelector(
                'a.product-pod__name-link',
              ) as HTMLAnchorElement | null
            )?.getAttribute('href') ?? '';
          const productUrl = href.startsWith('http') ? href : `${base}${href}`;
          const imageUrl =
            (
              pod.querySelector(
                'img.product-pod__image',
              ) as HTMLImageElement | null
            )?.src ?? null;

          // Parse "70cl, 40%" or "70cl / 40%"
          const volMatch = volumeText.match(/(\d+)\s*cl/i);
          const abvMatch = volumeText.match(/([\d.]+)\s*%/);
          const volumeMl = volMatch ? parseInt(volMatch[1]!, 10) * 10 : 700;
          const abv = abvMatch ? parseFloat(abvMatch[1]!) : null;

          // Parse "£XX.XX" → decimal
          const priceMatch = priceText.match(/[\d,.]+/);
          const priceLocal = priceMatch
            ? parseFloat(priceMatch[0]!.replace(',', ''))
            : 0;

          const slug = href.split('/').filter(Boolean).pop() ?? name;

          return {
            retailerId: 'master-of-malt',
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

    // Next page
    const nextHref = await page
      .locator('a.pagination__next')
      .getAttribute('href')
      .catch(() => null);

    const nextPageUrl = nextHref
      ? nextHref.startsWith('http')
        ? nextHref
        : `${this.config.baseUrl}${nextHref}`
      : null;

    return { url, products, nextPageUrl };
  }
}
