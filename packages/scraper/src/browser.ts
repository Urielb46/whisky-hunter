import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import type { Browser } from 'playwright';

// Apply stealth once at module load
chromium.use(StealthPlugin());

let _browser: Browser | null = null;

/**
 * Returns a shared browser instance (singleton per process).
 * Lazily launched on first call.
 */
export async function getBrowser(): Promise<Browser> {
  if (_browser) return _browser;

  const headless = process.env['SCRAPER_HEADLESS'] !== 'false';

  _browser = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  });

  _browser.on('disconnected', () => {
    _browser = null;
  });

  return _browser;
}

export async function closeBrowser(): Promise<void> {
  if (_browser) {
    await _browser.close();
    _browser = null;
  }
}
