import type { Browser, BrowserContext, Page } from 'playwright';
import { RawProductSchema } from '@whisky-hunter/shared';
import type { z } from 'zod';

export type RawProduct = z.infer<typeof RawProductSchema>;

export interface AdapterConfig {
  retailerId: string;
  baseUrl: string;
  countryCode: string;
  /** Max concurrent pages within one scrape run */
  concurrency?: number;
  /** Milliseconds between page requests */
  requestDelayMs?: number;
  /** Proxy URL (optional, overrides global PROXY_URL) */
  proxyUrl?: string;
}

export interface ScrapePage {
  url: string;
  products: RawProduct[];
  nextPageUrl: string | null;
}

/**
 * BaseAdapter — every retailer scraper extends this.
 *
 * Contract:
 *  - `scrapeListingPage(page, url)` → products found + next page URL
 *  - `getAllProducts(browser, startUrl, maxPages?)` → full run (pagination loop)
 *
 * Subclasses only implement `scrapeListingPage`. Pagination, rate limiting,
 * and validation are handled here.
 */
export abstract class BaseAdapter {
  protected readonly config: Required<AdapterConfig>;

  constructor(config: AdapterConfig) {
    this.config = {
      concurrency: 1,
      requestDelayMs: 1500,
      proxyUrl: process.env['PROXY_URL'] ?? '',
      ...config,
    };
  }

  /** Retailer ID this adapter handles */
  get retailerId(): string {
    return this.config.retailerId;
  }

  /**
   * Scrape a single listing/catalog page.
   * Must be implemented by each retailer adapter.
   */
  abstract scrapeListingPage(page: Page, url: string): Promise<ScrapePage>;

  /**
   * Full scrape run: follows pagination until maxPages or no next page.
   * Returns all validated RawProduct items.
   */
  async getAllProducts(
    browser: Browser,
    startUrl: string,
    maxPages = 50,
  ): Promise<RawProduct[]> {
    const context = await this.createContext(browser);
    const page = await context.newPage();

    const results: RawProduct[] = [];
    let currentUrl: string | null = startUrl;
    let pageCount = 0;

    try {
      while (currentUrl !== null && pageCount < maxPages) {
        pageCount++;
        console.log(
          `[${this.retailerId}] page ${pageCount}/${maxPages} — ${currentUrl}`,
        );

        await this.throttle();
        const scraped = await this.scrapeListingPage(page, currentUrl);

        // Validate each product through Zod; drop invalid rows (log them)
        for (const raw of scraped.products) {
          const parsed = RawProductSchema.safeParse(raw);
          if (parsed.success) {
            results.push(parsed.data);
          } else {
            console.warn(
              `[${this.retailerId}] invalid product skipped:`,
              parsed.error.issues[0]?.message,
            );
          }
        }

        currentUrl = scraped.nextPageUrl;
      }
    } finally {
      await page.close();
      await context.close();
    }

    console.log(
      `[${this.retailerId}] scrape complete — ${results.length} products across ${pageCount} pages`,
    );
    return results;
  }

  /** Create browser context with proxy if configured */
  protected async createContext(browser: Browser): Promise<BrowserContext> {
    const contextOptions: Parameters<Browser['newContext']>[0] = {
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      locale: 'en-GB',
      timezoneId: 'Europe/London',
      extraHTTPHeaders: {
        'Accept-Language': 'en-GB,en;q=0.9',
      },
    };

    if (this.config.proxyUrl) {
      contextOptions.proxy = { server: this.config.proxyUrl };
    }

    return browser.newContext(contextOptions);
  }

  /** Rate-limit delay between requests */
  private throttle(): Promise<void> {
    const jitter = Math.floor(Math.random() * 500);
    return new Promise((r) =>
      setTimeout(r, this.config.requestDelayMs + jitter),
    );
  }
}
