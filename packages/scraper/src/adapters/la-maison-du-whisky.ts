import type { Page } from 'playwright';
import { BaseAdapter, type ScrapePage } from './base-adapter.js';
import type { AdapterConfig } from './base-adapter.js';

/**
 * Adapter for La Maison du Whisky (whisky.fr)
 * Retailer ID: la-maison-du-whisky | Country: FR | Currency: EUR
 *
 * Major French whisky retailer. Catalog at /whisky.html — paginated.
 *
 * TODO: verify selectors against live site before production run.
 */
export class LaMaisonDuWhiskyAdapter extends BaseAdapter {
  constructor(overrides?: Partial<AdapterConfig>) {
    super({
      retailerId: 'la-maison-du-whisky',
      baseUrl: 'https://www.whisky.fr',
      countryCode: 'FR',
      requestDelayMs: 2500,
      ...overrides,
    });
  }

  async scrapeListingPage(page: Page, url: string): Promise<ScrapePage> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Cookie consent (French GDPR banner)
    const cookieBtn = page.locator('button#didomi-notice-agree-button, button[class*="accept"]');
    if (await cookieBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await cookieBtn.first().click();
    }

    await page.waitForSelector('.product-miniature, .product-container, .js-product-miniature', { timeout: 15_000 });

    const baseUrl = this.config.baseUrl;

    const products = await page.$$eval(
      '.product-miniature, .product-container, .js-product-miniature',
      (cards, base) =>
        cards.map((card) => {
          const nameEl = card.querySelector('.product-title a, h3 a, .product-name a, [class*="title"] a');
          const name = nameEl?.textContent?.trim() ?? '';

          const priceEl = card.querySelector('.price, .product-price, [class*="price"] .price');
          const priceText = priceEl?.textContent?.trim() ?? '';
          // French format: "59,90 €" or "59.90 €"
          const priceMatch = priceText.replace(/\s/g, '').replace(',', '.').match(/[\d.]+/);
          const priceLocal = priceMatch ? parseFloat(priceMatch[0]!) : 0;

          const linkEl = (nameEl as HTMLAnchorElement | null) ??
            (card.querySelector('a[href*="/fr/"]') as HTMLAnchorElement | null);
          const href = linkEl?.getAttribute('href') ?? '';
          const productUrl = href.startsWith('http') ? href : `${base}${href}`;
          const slug = href.split('/').filter(Boolean).pop()?.replace('.html', '') ?? '';

          const imgEl = card.querySelector('img.lazy, img[data-src], img.product_img_link') as HTMLImageElement | null;
          const imageUrl =
            imgEl?.getAttribute('data-src') ?? imgEl?.src ?? null;

          const isSoldOut = !!card.querySelector('[class*="out-of-stock"], [class*="rupture"], .add-to-cart[disabled]');

          // Parse volume from name: "70cl", "700ml", "70 cl"
          const volMatch = name.match(/(\d+(?:\.\d+)?)\s*(cl|ml|l)\b/i);
          let volumeMl = 700;
          if (volMatch) {
            const unit = volMatch[2]!.toLowerCase();
            const val = parseFloat(volMatch[1]!);
            if (unit === 'cl') volumeMl = Math.round(val * 10);
            else if (unit === 'l') volumeMl = Math.round(val * 1000);
            else volumeMl = Math.round(val);
          }

          const abvMatch = name.match(/(\d+(?:\.\d+)?)\s*%/);
          const abv = abvMatch ? parseFloat(abvMatch[1]!) : null;

          return {
            retailerId: 'la-maison-du-whisky',
            sourceProductId: slug || name.toLowerCase().replace(/\s+/g, '-'),
            name,
            priceLocal,
            currency: 'EUR',
            volumeMl,
            abv,
            inStock: !isSoldOut,
            url: productUrl,
            imageUrl: imageUrl || null,
          };
        }),
      baseUrl,
    );

    const nextEl = await page.$('a[rel="next"], .next a, [class*="pagination"] a[aria-label*="Next"], [class*="pagination"] a[aria-label*="Suivant"]');
    const nextHref = nextEl ? await nextEl.getAttribute('href') : null;
    const nextPageUrl = nextHref
      ? (nextHref.startsWith('http') ? nextHref : `${this.config.baseUrl}${nextHref}`)
      : null;

    return { url, products: products.filter((p) => p.name && p.priceLocal > 0), nextPageUrl };
  }
}
