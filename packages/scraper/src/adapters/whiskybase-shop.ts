import type { Page } from 'playwright';
import { BaseAdapter, type ScrapePage } from './base-adapter.js';
import type { AdapterConfig } from './base-adapter.js';

/**
 * Adapter for Whiskybase Shop (shop.whiskybase.com)
 * Retailer ID: whiskybase-shop | Country: NL | Currency: EUR
 *
 * Why this retailer is special (DATA-02):
 *   Product URLs contain the Whiskybase ID directly:
 *     https://shop.whiskybase.com/en_gb/bottle/12345
 *   This means we can skip fuzzy entity resolution — sourceProductId IS
 *   the whiskybase_id. The scrape-worker or resolver can look up the
 *   canonical product in `products` via `whiskybase_id` FK directly.
 *
 * Site structure (shop.whiskybase.com, as of 2026-05):
 *   Listing: /en_gb/whiskies?page=N
 *   Product card: .product-item, .product-tile
 *   Name: .product-item__name, .product-name
 *   Price: .product-item__price, .price
 *   Image: img.product-item__image, img.product-image
 *   URL: a[href*="/bottle/"]
 *   Stock: [class*="in-stock"], absence of [class*="out-of-stock"]
 *
 * COMPLIANCE:
 *   Verify https://shop.whiskybase.com/robots.txt before production.
 *   Rate: 1 req / 2 s (requestDelayMs = 2000).
 *   Attribution "Ratings powered by Whiskybase" displayed in UI (WBASE-04).
 *
 * Added: שדרוג 25526 (2026-05-25)
 */
export class WhiskybaseShopAdapter extends BaseAdapter {
  constructor(overrides?: Partial<AdapterConfig>) {
    super({
      retailerId: 'whiskybase-shop',
      baseUrl: 'https://shop.whiskybase.com',
      countryCode: 'NL',
      requestDelayMs: 2000,
      ...overrides,
    });
  }

  async scrapeListingPage(page: Page, url: string): Promise<ScrapePage> {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Cookie consent / GDPR banner (common on EU sites)
    const cookieSelectors = [
      'button[id*="accept"]',
      'button[class*="accept"]',
      '#CybotCookiebotDialogBodyLevelButtonLevelOptinAllowAll',
    ];
    for (const sel of cookieSelectors) {
      const btn = page.locator(sel).first();
      if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await btn.click().catch(() => undefined);
        await page.waitForTimeout(500);
        break;
      }
    }

    // Wait for at least one product card — fall through gracefully if none
    const cardSel = '.product-item, .product-tile, [class*="product-card"]';
    try {
      await page.waitForSelector(cardSel, { timeout: 12_000 });
    } catch {
      // End of pagination or empty page
      return { url, products: [], nextPageUrl: null };
    }

    const baseUrl = this.config.baseUrl;

    const products = await page.$$eval(
      cardSel,
      (cards: Element[], base: string) => {
        return cards.map((card) => {
          // ── Name ──────────────────────────────────────────────────────────
          const name = (
            card.querySelector(
              '.product-item__name, .product-name, [class*="product-title"]',
            ) as HTMLElement | null
          )?.textContent?.trim() ?? '';

          // ── Price ──────────────────────────────────────────────────────────
          const priceText = (
            card.querySelector(
              '.product-item__price, .price, [class*="product-price"]',
            ) as HTMLElement | null
          )?.textContent?.trim() ?? '';

          const priceMatch = priceText.match(/[\d.,]+/);
          const priceLocal = priceMatch
            ? parseFloat(priceMatch[0]!.replace(/,(?=\d{3})/g, '').replace(',', '.'))
            : 0;

          // ── URL + whiskybase_id extraction ─────────────────────────────────
          const linkEl = (
            card.querySelector('a[href*="/bottle/"]') as HTMLAnchorElement | null
          );
          const href = linkEl?.getAttribute('href') ?? '';
          const productUrl = href.startsWith('http') ? href : `${base}${href}`;

          // Extract numeric Whiskybase ID from URL like "/en_gb/bottle/12345"
          const wbIdMatch = href.match(/\/bottle\/(\d+)/);
          const whiskybaseId = wbIdMatch?.[1] ?? null;

          // ── Image ──────────────────────────────────────────────────────────
          const imgEl = card.querySelector(
            'img.product-item__image, img.product-image, [class*="product-img"]',
          ) as HTMLImageElement | null;
          const imageUrl = imgEl?.src ?? null;

          // ── Volume — try from name if not explicit ─────────────────────────
          const volMatch = name.match(/(\d{2,4})\s*(?:ml|cl)/i);
          let volumeMl = 700; // sensible default for bottles
          if (volMatch) {
            const raw = parseInt(volMatch[1]!, 10);
            // "70cl" → 700 ml; "700ml" → 700 ml
            volumeMl = volMatch[0]!.toLowerCase().includes('cl') ? raw * 10 : raw;
          }

          // ── ABV ────────────────────────────────────────────────────────────
          const abvMatch = name.match(/([\d.]+)\s*%/);
          const abv = abvMatch ? parseFloat(abvMatch[1]!) : null;

          // ── In-stock ───────────────────────────────────────────────────────
          const hasOutOfStock =
            card.querySelector('[class*="out-of-stock"], [class*="sold-out"]') !== null;
          const inStock = !hasOutOfStock && priceLocal > 0;

          return {
            // RawProduct fields
            retailerId:      'whiskybase-shop',
            // sourceProductId IS the whiskybase_id — resolver uses FK directly
            sourceProductId: whiskybaseId ?? name.slice(0, 128),
            name,
            priceLocal,
            currency:        'EUR',
            volumeMl,
            abv,
            inStock,
            url:             productUrl,
            imageUrl,
          };
        });
      },
      baseUrl,
    );

    // Filter out rows with no price or name (often ads / placeholders)
    const valid = products.filter((p) => p.name.length > 0 && p.priceLocal > 0);

    // ── Next page ────────────────────────────────────────────────────────────
    const nextHref = await page
      .locator(
        'a[rel="next"], a.pagination__next, [class*="pagination"] a[aria-label*="Next"]',
      )
      .first()
      .getAttribute('href')
      .catch(() => null);

    const nextPageUrl = nextHref
      ? nextHref.startsWith('http')
        ? nextHref
        : `${this.config.baseUrl}${nextHref}`
      : null;

    return { url, products: valid, nextPageUrl };
  }
}
