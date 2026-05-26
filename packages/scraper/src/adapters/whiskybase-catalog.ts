/**
 * whiskybase-catalog.ts
 *
 * Catalog seeder for Whiskybase — extracts canonical product metadata
 * (name, distillery, age, region, ABV, cask, score, image) for each bottle.
 *
 * PURPOSE: This is NOT a price scraper. Whiskybase is used solely as a
 * canonical product catalog source (WBASE-01 – WBASE-03). No price data
 * is collected here.
 *
 * COMPLIANCE:
 *  - Rate limited to 1 req / 2 s (+ up to 500 ms random jitter)
 *  - Must verify robots.txt allows /whiskies/ before production run
 *  - Attribution "Ratings powered by Whiskybase" required in UI (WBASE-04)
 *
 * Added: שדרוג 25526 (2026-05-25)
 */

import type { Browser, BrowserContext, Page } from 'playwright';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WhiskybaseProduct {
  whiskybaseId: string;
  name: string;
  distillery: string;
  ageYears: number | null;
  volumeMl: number;
  abv: number | null;
  region: string | null;
  category: string;
  caskType: string | null;
  reviewScore: number | null;
  reviewCount: number;
  imageUrl: string;
  whiskybaseUrl: string;
}

// Categories to crawl in order — broadest first
const CATEGORIES = ['scotch', 'bourbon', 'irish', 'japanese', 'world'] as const;
type WbCategory = (typeof CATEGORIES)[number];

// Map Whiskybase categories to our canonical category strings
const CATEGORY_MAP: Record<WbCategory, string> = {
  scotch:   'scotch',
  bourbon:  'bourbon',
  irish:    'irish',
  japanese: 'japanese',
  world:    'world',
};

// ---------------------------------------------------------------------------
// Adapter
// ---------------------------------------------------------------------------

export class WhiskybaseCatalogAdapter {
  private readonly baseUrl = 'https://www.whiskybase.com';
  private readonly delayMs = 2_000;   // 1 req/2 s — respect rate limit
  private readonly maxJitterMs = 500;

  // ----- Browser context ---------------------------------------------------

  async createContext(browser: Browser): Promise<BrowserContext> {
    const proxyUrl = process.env['PROXY_URL'] ?? '';
    return browser.newContext({
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'en-GB',
      extraHTTPHeaders: { 'Accept-Language': 'en-GB,en;q=0.9' },
      ...(proxyUrl ? { proxy: { server: proxyUrl } } : {}),
    });
  }

  // ----- Listing page: returns whiskybase IDs ------------------------------

  async fetchListingPage(
    page: Page,
    category: WbCategory,
    pageNum: number,
  ): Promise<string[]> {
    const url =
      `${this.baseUrl}/whiskies?category=${category}&sort=score&page=${pageNum}`;

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await this.detectBlock(page, url);

    // Some pages use JS rendering — wait for at least one whisky card
    try {
      await page.waitForSelector('a[href*="/whiskies/"]', { timeout: 10_000 });
    } catch {
      return []; // empty / end of pagination
    }

    return page.$$eval(
      'a[href*="/whiskies/"]',
      (links: Element[]) =>
        (links as HTMLAnchorElement[])
          .map((a) => a.href.match(/\/whiskies\/(\d+)/)?.[1] ?? '')
          .filter(Boolean)
          .filter((id, i, arr) => arr.indexOf(id) === i), // deduplicate
    );
  }

  // ----- Product page: extracts full metadata ------------------------------

  async fetchProductPage(
    page: Page,
    whiskybaseId: string,
    category: WbCategory,
  ): Promise<WhiskybaseProduct | null> {
    const url = `${this.baseUrl}/whiskies/${whiskybaseId}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await this.detectBlock(page, url);

    const title = await page.title().catch(() => '');
    if (title.includes('404') || title.includes('Not found')) {
      console.warn(`[whiskybase] 404 for id=${whiskybaseId}`);
      return null;
    }

    // Pass data as the second arg — Playwright serialises it and infers the type
    type EvalArg = {
      wbId: string;
      wbUrl: string;
      wbCategory: string;
      categoryMap: { [k: string]: string };
    };
    const evalArg: EvalArg = {
      wbId: whiskybaseId,
      wbUrl: url,
      wbCategory: category,
      categoryMap: CATEGORY_MAP as { [k: string]: string },
    };

    try {
      return await page.evaluate(
        ({ wbId, wbUrl, wbCategory, categoryMap }: EvalArg) => {
          const getText = (sel: string): string | null =>
            (document.querySelector(sel) as HTMLElement | null)?.textContent
              ?.trim() ?? null;

          const getTableValue = (label: string): string | null => {
            const rows = Array.from(
              document.querySelectorAll(
                '.whisky-details tr, .properties tr, table.meta tr',
              ),
            );
            const row = rows.find(
              (r) =>
                (r.querySelector('th, td:first-child') as HTMLElement | null)
                  ?.textContent?.trim() === label,
            );
            return (
              (row?.querySelector('td:last-child, td + td') as HTMLElement | null)
                ?.textContent?.trim() ?? null
            );
          };

          // Score
          const scoreText = getText(
            '.whisky-rating__score, .score-value, [class*="rating__score"], ' +
            '[class*="score__value"], .rating-average',
          );
          const reviewScore =
            scoreText && /[\d.]/.test(scoreText)
              ? parseFloat(scoreText)
              : null;

          // Vote count
          const votesText =
            getText('.whisky-rating__votes, [class*="votes"], [class*="ratings-count"]') ?? '';
          const reviewCount = parseInt(votesText.replace(/[^0-9]/g, '') || '0', 10);

          // Name
          const name =
            getText('h1.whisky-name, h1[class*="whisky"], h1[class*="bottle"], h1') ?? '';

          // Distillery
          const distillery =
            getTableValue('Distillery') ??
            getTableValue('Bottler') ??
            getText('.distillery-name, [class*="distillery"]') ??
            '';

          // Age
          const ageText =
            getTableValue('Age') ?? getTableValue('Statement');
          const ageYears = ageText ? parseInt(ageText, 10) || null : null;

          // Volume
          const sizeText = getTableValue('Size') ?? getTableValue('Volume');
          const volumeRaw = sizeText
            ? parseInt(sizeText.replace(/[^0-9]/g, ''), 10)
            : 0;
          const volumeMl = volumeRaw > 0 ? volumeRaw : 700;

          // ABV
          const abvText =
            getTableValue('Strength') ?? getTableValue('ABV');
          const abv = abvText ? parseFloat(abvText) || null : null;

          // Region
          const region = getTableValue('Region') ?? null;

          // Cask type
          const caskType =
            getTableValue('Cask type') ??
            getTableValue('Cask Type') ??
            null;

          // Category — use crawl category as fallback, refine from table
          const rawCat =
            getTableValue('Category') ??
            getTableValue('Whisky type') ??
            wbCategory;
          // Normalise: "Single Malt Scotch" → "scotch", etc.
          const catLower = rawCat.toLowerCase();
          let resolvedCategory: string =
            (categoryMap as Record<string, string>)[wbCategory] ?? wbCategory;
          if (catLower.includes('bourbon') || catLower.includes('american')) {
            resolvedCategory = 'bourbon';
          } else if (catLower.includes('irish')) {
            resolvedCategory = 'irish';
          } else if (catLower.includes('japanese')) {
            resolvedCategory = 'japanese';
          } else if (
            catLower.includes('scotch') ||
            catLower.includes('single malt') ||
            catLower.includes('blended scotch')
          ) {
            resolvedCategory = 'scotch';
          }

          // Image — try DOM first, fall back to CDN pattern
          const imgEl = document.querySelector<HTMLImageElement>(
            '.whisky-image img, img[class*="whisky"], ' +
            'img[src*="whiskybase"], img[src*="static.whiskybase"]',
          );
          const imageUrl =
            imgEl?.src ??
            `https://static.whiskybase.com/storage/whiskies/${wbId}-normal.png`;

          return {
            whiskybaseId: wbId,
            name: name.replace(/\s+/g, ' ').slice(0, 500),
            distillery: distillery.replace(/\s+/g, ' ').slice(0, 200),
            ageYears,
            volumeMl,
            abv,
            region,
            category: resolvedCategory,
            caskType,
            reviewScore,
            reviewCount,
            imageUrl,
            whiskybaseUrl: wbUrl,
          };
        },
        evalArg,
      );
    } catch (err) {
      console.error(
        `[whiskybase] page.evaluate failed for id=${whiskybaseId}: ${String(err)}`,
      );
      return null;
    }
  }

  // ----- Full catalog crawl ------------------------------------------------

  /**
   * Iterate all categories × pages and yield WhiskybaseProduct records.
   * Caller is responsible for database upsert.
   *
   * @param browser   Playwright Browser (caller owns lifecycle)
   * @param maxPerCat Max pages per category (default: 200 ≈ 4,000 products/cat)
   * @param onProduct Called with each successfully scraped product
   */
  async crawlCatalog(
    browser: Browser,
    opts: {
      maxPerCat?: number;
      onProduct: (p: WhiskybaseProduct) => Promise<void>;
      onProgress?: (msg: string) => void;
    },
  ): Promise<{ total: number; errors: number }> {
    const { maxPerCat = 200, onProduct, onProgress } = opts;
    let total = 0;
    let errors = 0;

    const context = await this.createContext(browser);

    try {
      for (const category of CATEGORIES) {
        onProgress?.(`[whiskybase] starting category: ${category}`);
        const listPage = await context.newPage();
        const detailPage = await context.newPage();

        try {
          for (let pageNum = 1; pageNum <= maxPerCat; pageNum++) {
            await this.sleep();
            const ids = await this.fetchListingPage(listPage, category, pageNum);

            if (ids.length === 0) {
              onProgress?.(
                `[whiskybase] ${category} page ${pageNum}: no results — done`,
              );
              break;
            }

            onProgress?.(
              `[whiskybase] ${category} p${pageNum}: ${ids.length} ids`,
            );

            for (const id of ids) {
              await this.sleep();
              try {
                const product = await this.fetchProductPage(
                  detailPage,
                  id,
                  category,
                );
                if (product && product.name) {
                  await onProduct(product);
                  total++;
                }
              } catch (err) {
                errors++;
                const msg = String(err);
                if (msg.includes('bot-block')) {
                  // Propagate bot blocks — caller should back off or rotate proxy
                  throw err;
                }
                console.warn(`[whiskybase] error on id=${id}: ${msg}`);
              }
            }
          }
        } finally {
          await listPage.close().catch(() => undefined);
          await detailPage.close().catch(() => undefined);
        }
      }
    } finally {
      await context.close().catch(() => undefined);
    }

    return { total, errors };
  }

  // ----- Helpers -----------------------------------------------------------

  private async detectBlock(page: Page, url: string): Promise<void> {
    const title = await page.title().catch(() => '');
    if (
      title.toLowerCase().includes('just a moment') ||
      title.toLowerCase().includes('cloudflare') ||
      title.toLowerCase().includes('access denied') ||
      title.toLowerCase().includes('forbidden')
    ) {
      throw new Error(`bot-block: Cloudflare/WAF challenge at ${url}`);
    }
  }

  private sleep(): Promise<void> {
    const jitter = Math.floor(Math.random() * this.maxJitterMs);
    return new Promise((r) => setTimeout(r, this.delayMs + jitter));
  }
}

// Singleton export for convenience
export const whiskybaseCatalogAdapter = new WhiskybaseCatalogAdapter();
  }

  private sleep(): Promise<void> {
    const jitter = Math.floor(Math.random() * this.maxJitterMs);
    return new Promise((r) => setTimeout(r, this.delayMs + jitter));
  }
}

// Singleton export for convenience
export const whiskybaseCatalogAdapter = new WhiskybaseCatalogAdapter();
  }

  private sleep(): Promise<void> {
    const jitter = Math.floor(Math.random() * this.maxJitterMs);
    return new Promise((r) => setTimeout(r, this.delayMs + jitter));
  }
}

// Singleton export for convenience
export const whiskybaseCatalogAdapter = new WhiskybaseCatalogAdapter();
