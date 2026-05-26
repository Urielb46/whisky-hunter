# Retailer Adapters — חיבור לאתרי מכירות וויסקי

**Researched:** 2026-05-25  
**Confidence:** MEDIUM — URL patterns ו-CSS selectors מבוססים על ידע אדריכלי + בדיקות מקדימות. **חובה לאמת בפועל לפני deployment.**

---

## סיכום מנהלים

המסמך מגדיר כיצד WhiskyHunter מתחבר לכל אתר מכירות וויסקי — אם דרך תוכנית שותפים (Affiliate API/Feed) או דרך Playwright scraping. לכל קמעונאי יש אדפטר מותאם.

**עקרון מנחה:** API/Affiliate Feed > HTTP scraping > Playwright scraping

---

## מפת הקמעונאים — v1 (UK + US + EU)

| קמעונאי | אזור | מטבע | שיטת חיבור | עדיפות |
|---------|------|------|------------|--------|
| The Whisky Exchange | UK | GBP | Awin Affiliate Feed + Playwright fallback | ⭐⭐⭐⭐⭐ |
| Master of Malt | UK | GBP | Affiliate Future Feed + Playwright fallback | ⭐⭐⭐⭐⭐ |
| Whisky Shop | UK | GBP | Playwright | ⭐⭐⭐⭐ |
| The Whisky Barrel | UK | GBP | Playwright (low anti-bot) | ⭐⭐⭐⭐ |
| Abbey Whisky | UK | GBP | Playwright | ⭐⭐⭐ |
| Total Wine & More | US | USD | Playwright (JS-rendered) | ⭐⭐⭐⭐⭐ |
| K&L Wine Merchants | US | USD | Playwright | ⭐⭐⭐⭐ |
| Spec's Wines & Spirits | US/TX | USD | Playwright | ⭐⭐⭐ |
| La Maison du Whisky | FR | EUR | Playwright | ⭐⭐⭐⭐ |
| Whisky.de | DE | EUR | Playwright | ⭐⭐⭐⭐ |
| LCBO | CA | CAD | Playwright (gov. site — permissive) | ⭐⭐⭐ |
| **shop.whiskybase.com** | UK/Intl | GBP/EUR/USD | Playwright | ⭐⭐⭐⭐ |

---

## 1. The Whisky Exchange — Affiliate Feed (מועדף)

**URL:** https://www.thewhiskyexchange.com/  
**Affiliate Network:** Awin (Merchant ID: **400**)  
**שיטה מועדפת:** Product Data Feed דרך Awin — CSV/XML עם כל הפרטים  

### הגדרת Affiliate Feed

```typescript
// packages/scraper/src/adapters/whisky-exchange-feed.ts
// שיטה: Awin product data feed — HTTP download, לא Playwright

import { parse } from 'csv-parse/sync';
import { z } from 'zod';

const AwinProductSchema = z.object({
  'Product ID': z.string(),
  'Product Name': z.string(),
  'Search Price': z.string().transform(s => parseFloat(s.replace(/[^0-9.]/g, ''))),
  'In Stock': z.string().transform(s => s.toLowerCase() === 'yes' || s === '1'),
  'Deeplink': z.string().url(),
  'Image URL': z.string().url().optional(),
  'Description': z.string().optional(),
});

export const whiskyExchangeFeedAdapter = {
  retailerId: 'whisky-exchange',

  // Awin feed URL (מתקבל לאחר אישור השותפות)
  // פורמט: https://productserve.awin.com/cgi-bin/feeds/...?mid=400&...
  feedUrl: process.env.AWIN_TWE_FEED_URL ?? '',

  async fetchFeed(): Promise<RawProduct[]> {
    if (!this.feedUrl) {
      throw new Error('AWIN_TWE_FEED_URL not configured — falling back to scraper');
    }

    const response = await fetch(this.feedUrl, {
      headers: { 'Authorization': `Bearer ${process.env.AWIN_API_KEY}` }
    });

    if (!response.ok) {
      throw new Error(`Awin feed error: ${response.status}`);
    }

    const csv = await response.text();
    const rows = parse(csv, { columns: true, skip_empty_lines: true });

    return rows
      .filter((row: Record<string, string>) => 
        row['Product Name']?.toLowerCase().includes('whisky') ||
        row['Product Name']?.toLowerCase().includes('whiskey')
      )
      .map((row: Record<string, string>) => {
        const parsed = AwinProductSchema.safeParse(row);
        if (!parsed.success) return null;
        const p = parsed.data;

        return {
          sourceProductId: p['Product ID'],
          name: p['Product Name'],
          priceLocal: p['Search Price'],
          currency: 'GBP',
          inStock: p['In Stock'],
          url: p['Deeplink'],
          imageUrl: p['Image URL'],
          affiliateUrl: p['Deeplink'], // Awin tracking link
        } satisfies RawProduct;
      })
      .filter(Boolean);
  },
};
```

### Playwright Fallback (כאשר Awin Feed לא זמין)

```typescript
// packages/scraper/src/adapters/whisky-exchange-scraper.ts
import type { Page } from 'playwright';

export const whiskyExchangeScraperAdapter: ScraperAdapter = {
  retailerId: 'whisky-exchange',

  async fetchCatalogPage(page: Page, pageNum: number): Promise<RawProduct[]> {
    await page.goto(
      `https://www.thewhiskyexchange.com/c/40/single-malt-scotch-whisky?pg=${pageNum}&psize=24`,
      { waitUntil: 'networkidle', timeout: 30000 }
    );

    // בדיקת חסימת Cloudflare
    const isBlocked = await page.$('title').then(t => t?.textContent()).then(
      text => text?.includes('Just a moment') || text?.includes('Attention Required')
    );
    if (isBlocked) throw new Error('bot-block: Cloudflare challenge detected');

    return page.$$eval('.product-card, [data-product-id]', (cards) =>
      cards.map((card) => {
        const el = card as HTMLElement;
        return {
          sourceProductId: el.dataset['productId'] ?? el.querySelector('a')?.href?.split('/').pop() ?? '',
          name: el.querySelector('.product-card__name, h3.name')?.textContent?.trim() ?? '',
          priceLocal: parseFloat(
            el.querySelector('.product-card__price-value, .price')?.textContent
              ?.replace(/[^0-9.]/g, '') ?? '0'
          ),
          currency: 'GBP',
          inStock: !el.classList.contains('out-of-stock') && 
                   !el.querySelector('.out-of-stock, [class*="unavailable"]'),
          url: (el.querySelector('a.product-card__link, a[href*="/p/"]') as HTMLAnchorElement)?.href ?? '',
          imageUrl: (el.querySelector('img') as HTMLImageElement)?.src,
        };
      }).filter(p => p.name && p.priceLocal > 0)
    );
  },

  async totalPages(page: Page): Promise<number> {
    const paginationText = await page.$eval(
      '.pagination__count, [class*="pagination"]',
      (el) => el.textContent ?? '1 of 1'
    ).catch(() => '1 of 1');

    const match = paginationText.match(/of (\d+)/i);
    return match ? parseInt(match[1]) : 1;
  },

  // קטגוריות לסריקה
  categories: [
    { url: '/c/40/single-malt-scotch-whisky', label: 'scotch_single_malt' },
    { url: '/c/308/blended-scotch-whisky', label: 'scotch_blended' },
    { url: '/c/35/bourbon', label: 'bourbon' },
    { url: '/c/32/irish-whiskey', label: 'irish' },
    { url: '/c/34/japanese-whisky', label: 'japanese' },
    { url: '/c/44/world-whisky', label: 'world' },
  ],
};
```

---

## 2. Master of Malt — Affiliate Feed + Playwright

**URL:** https://www.masterofmalt.com/  
**Affiliate Network:** Affiliate Future / Commission Factory  
**קמיסיה:** 7% per sale (עם פוטנציאל לעלייה)

```typescript
// packages/scraper/src/adapters/master-of-malt.ts
import type { Page } from 'playwright';

export const masterOfMaltAdapter: ScraperAdapter = {
  retailerId: 'master-of-malt',

  async fetchCatalogPage(page: Page, pageNum: number): Promise<RawProduct[]> {
    await page.goto(
      `https://www.masterofmalt.com/whiskies/?page=${pageNum}`,
      { waitUntil: 'domcontentloaded', timeout: 30000 }
    );

    return page.$$eval('.product-listing-item, [class*="ProductCard"]', (cards) =>
      cards.map((card) => {
        const el = card as HTMLElement;
        const priceText = el.querySelector('.price, [class*="Price"]')?.textContent ?? '0';
        return {
          sourceProductId: el.querySelector('a')?.href?.match(/\/([^/]+)\/?$/)?.[1] ?? '',
          name: el.querySelector('h3, .product-name, [class*="ProductName"]')?.textContent?.trim() ?? '',
          priceLocal: parseFloat(priceText.replace(/[^0-9.]/g, '')),
          currency: 'GBP',
          inStock: !el.querySelector('[class*="OutOfStock"], [class*="unavailable"]'),
          url: (el.querySelector('a') as HTMLAnchorElement)?.href ?? '',
          imageUrl: (el.querySelector('img') as HTMLImageElement)?.src,
        };
      }).filter(p => p.name && p.priceLocal > 0)
    );
  },

  async totalPages(page: Page): Promise<number> {
    const lastPage = await page.$eval(
      '.pagination a:last-child, [class*="Pagination"] a:last-child',
      (el) => el?.getAttribute('href') ?? ''
    ).catch(() => '');
    const match = lastPage.match(/page=(\d+)/);
    return match ? parseInt(match[1]) : 1;
  },

  categories: [
    { url: '/whiskies/', label: 'all' },
    { url: '/whiskies/?whiskytype=single-malt', label: 'scotch_single_malt' },
  ],
};
```

---

## 3. shop.whiskybase.com — חנות Whiskybase

**URL:** https://shop.whiskybase.com/  
**יתרון:** ניתן לקשר ישירות בין ה-whiskybase_id של הקטלוג לבין המחיר בחנות

```typescript
// packages/scraper/src/adapters/whiskybase-shop.ts
import type { Page } from 'playwright';

export const whiskybaseShopAdapter: ScraperAdapter = {
  retailerId: 'whiskybase-shop',

  async fetchCatalogPage(page: Page, pageNum: number): Promise<RawProduct[]> {
    await page.goto(
      `https://shop.whiskybase.com/us/whisky/?page=${pageNum}`,
      { waitUntil: 'domcontentloaded' }
    );

    return page.$$eval('[class*="product"], .product-card', (cards) =>
      cards.map((card) => {
        const el = card as HTMLElement;
        const link = el.querySelector('a') as HTMLAnchorElement;
        const priceText = el.querySelector('[class*="price"], .price')?.textContent ?? '0';

        // Whiskybase Shop מקשר ל-ID ב-URL: /us/whisky/{id}-{name}/
        const whiskybaseId = link?.href?.match(/\/(\d+)-[^/]+\/?$/)?.[1] ?? null;

        return {
          sourceProductId: link?.href?.split('/').filter(Boolean).pop() ?? '',
          whiskybaseId, // קישור ישיר לקטלוג!
          name: el.querySelector('h2, h3, [class*="title"]')?.textContent?.trim() ?? '',
          priceLocal: parseFloat(priceText.replace(/[^0-9.]/g, '')),
          currency: 'USD', // /us/ = USD pricing
          inStock: !el.querySelector('[class*="sold-out"], [class*="unavailable"]'),
          url: link?.href ?? '',
          imageUrl: (el.querySelector('img') as HTMLImageElement)?.src,
        };
      }).filter(p => p.name && p.priceLocal > 0)
    );
  },

  async totalPages(page: Page): Promise<number> {
    return page.$eval('.pagination', (el) => {
      const lastLink = el.querySelector('a:last-child');
      const match = lastLink?.getAttribute('href')?.match(/page=(\d+)/);
      return match ? parseInt(match[1]) : 1;
    }).catch(() => 1);
  },
};
```

---

## 4. Total Wine & More (US)

**URL:** https://www.totalwine.com/  
**Anti-bot:** MEDIUM-HIGH — JavaScript-rendered, דורש Playwright  

```typescript
// packages/scraper/src/adapters/total-wine.ts
export const totalWineAdapter: ScraperAdapter = {
  retailerId: 'total-wine',

  async fetchCatalogPage(page: Page, pageNum: number): Promise<RawProduct[]> {
    await page.goto(
      `https://www.totalwine.com/spirits/scotch-whisky/single-malt/c/000072?pageSize=24&page=${pageNum}`,
      { waitUntil: 'networkidle', timeout: 45000 }
    );

    // Total Wine = React SPA — מחכים ל-product cards
    await page.waitForSelector('[class*="productCard"], [data-product-sku]', {
      timeout: 15000
    }).catch(() => {
      throw new Error('bot-block: Total Wine product grid did not load');
    });

    return page.$$eval('[class*="productCard"], [data-product-sku]', (cards) =>
      cards.map((card) => {
        const el = card as HTMLElement;
        return {
          sourceProductId: el.dataset['productSku'] ?? '',
          name: el.querySelector('[class*="productName"], h2, h3')?.textContent?.trim() ?? '',
          priceLocal: parseFloat(
            el.querySelector('[class*="price"], .priceLine')?.textContent?.replace(/[^0-9.]/g, '') ?? '0'
          ),
          currency: 'USD',
          inStock: !el.querySelector('[class*="outOfStock"]'),
          url: (el.querySelector('a') as HTMLAnchorElement)?.href ?? '',
          imageUrl: (el.querySelector('img') as HTMLImageElement)?.src,
        };
      }).filter(p => p.name && p.priceLocal > 0)
    );
  },

  async totalPages(page: Page): Promise<number> {
    const totalText = await page.$eval(
      '[class*="totalResults"], [class*="resultCount"]',
      el => el.textContent ?? ''
    ).catch(() => '');
    const total = parseInt(totalText.replace(/[^0-9]/g, '') || '0');
    return Math.ceil(total / 24) || 1;
  },

  categories: [
    { url: '/spirits/scotch-whisky/single-malt/c/000072', label: 'scotch_single_malt' },
    { url: '/spirits/scotch-whisky/blended/c/000073', label: 'scotch_blended' },
    { url: '/spirits/bourbon/c/000065', label: 'bourbon' },
    { url: '/spirits/irish-whiskey/c/000069', label: 'irish' },
    { url: '/spirits/japanese-whisky/c/000070', label: 'japanese' },
  ],
};
```

---

## 5. LCBO (קנדה — ממשלתי, permissive)

**URL:** https://www.lcbo.com/  
**Anti-bot:** LOW — אתר ממשלתי קנדי, פחות אגרסיבי

```typescript
// packages/scraper/src/adapters/lcbo.ts
export const lcboAdapter: ScraperAdapter = {
  retailerId: 'lcbo',

  async fetchCatalogPage(page: Page, pageNum: number): Promise<RawProduct[]> {
    await page.goto(
      `https://www.lcbo.com/en/spirits/whisky/page/${pageNum}`,
      { waitUntil: 'domcontentloaded' }
    );

    return page.$$eval('[data-product], .product-item', (cards) =>
      cards.map((card) => {
        const el = card as HTMLElement;
        return {
          sourceProductId: el.dataset['productId'] ?? el.querySelector('[data-sku]')?.getAttribute('data-sku') ?? '',
          name: el.querySelector('.product-name, h2.name')?.textContent?.trim() ?? '',
          priceLocal: parseFloat(
            el.querySelector('.price-box .price, .product-price')?.textContent?.replace(/[^0-9.]/g, '') ?? '0'
          ),
          currency: 'CAD',
          inStock: !el.querySelector('.out-of-stock, [class*="unavailable"]'),
          url: (el.querySelector('a.product-item-link, a') as HTMLAnchorElement)?.href ?? '',
          imageUrl: (el.querySelector('img.product-image-photo, img') as HTMLImageElement)?.src,
        };
      }).filter(p => p.name && p.priceLocal > 0)
    );
  },

  async totalPages(page: Page): Promise<number> {
    return page.$eval('.pages-total, [data-total-pages]', el =>
      parseInt(el.textContent ?? el.getAttribute('data-total-pages') ?? '1')
    ).catch(() => 1);
  },
};
```

---

## 6. La Maison du Whisky (צרפת)

**URL:** https://www.whisky.fr/  

```typescript
// packages/scraper/src/adapters/la-maison-du-whisky.ts
export const laMaisonDuWhiskyAdapter: ScraperAdapter = {
  retailerId: 'la-maison-du-whisky',

  async fetchCatalogPage(page: Page, pageNum: number): Promise<RawProduct[]> {
    await page.goto(
      `https://www.whisky.fr/catalogsearch/result/?q=whisky&p=${pageNum}`,
      { waitUntil: 'domcontentloaded' }
    );

    return page.$$eval('.product-item, [class*="product-card"]', (cards) =>
      cards.map((card) => {
        const el = card as HTMLElement;
        const priceText = el.querySelector('.price, [class*="price"]')?.textContent ?? '0';
        return {
          sourceProductId: el.dataset['productId'] ?? '',
          name: el.querySelector('.product-item-name, h2')?.textContent?.trim() ?? '',
          priceLocal: parseFloat(priceText.replace(/[^0-9.,]/g, '').replace(',', '.')),
          currency: 'EUR',
          inStock: !el.querySelector('[class*="out-of-stock"]'),
          url: (el.querySelector('a.product-item-link') as HTMLAnchorElement)?.href ?? '',
          imageUrl: (el.querySelector('img') as HTMLImageElement)?.src,
        };
      }).filter(p => p.name && p.priceLocal > 0)
    );
  },

  async totalPages(page: Page): Promise<number> {
    return page.$eval('.pages-total', el => parseInt(el.textContent ?? '1')).catch(() => 1);
  },
};
```

---

## 7. הגדרת Retailers בטבלת DB

```typescript
// packages/database/src/seed/retailers.ts
// Seed data — הכנס לאחר migration

export const INITIAL_RETAILERS = [
  {
    id: 'whisky-exchange',
    name: 'The Whisky Exchange',
    baseUrl: 'https://www.thewhiskyexchange.com',
    country: 'GB',
    currency: 'GBP',
    scraperType: 'playwright' as const, // 'api' אם Feed מאושר
    catalogUrl: 'https://www.thewhiskyexchange.com/c/40/single-malt-scotch-whisky',
    cronExpression: '0 2 * * *',       // 02:00 UTC בכל לילה
    affiliateProgram: true,
    affiliateNetwork: 'awin',
    affiliateMerchantId: '400',
    tosStatus: 'ambiguous' as const,   // בדוק לפני scraping!
    active: true,
  },
  {
    id: 'master-of-malt',
    name: 'Master of Malt',
    baseUrl: 'https://www.masterofmalt.com',
    country: 'GB',
    currency: 'GBP',
    scraperType: 'playwright' as const,
    catalogUrl: 'https://www.masterofmalt.com/whiskies/',
    cronExpression: '0 3 * * *',       // 03:00 UTC — staggered מ-TWE
    affiliateProgram: true,
    affiliateNetwork: 'affiliate-future',
    tosStatus: 'ambiguous' as const,
    active: true,
  },
  {
    id: 'whiskybase-shop',
    name: 'Whiskybase Shop',
    baseUrl: 'https://shop.whiskybase.com',
    country: 'GB',
    currency: 'USD',                   // US pricing
    scraperType: 'playwright' as const,
    catalogUrl: 'https://shop.whiskybase.com/us/whisky/',
    cronExpression: '0 4 * * *',
    affiliateProgram: false,
    tosStatus: 'ambiguous' as const,
    active: true,
  },
  {
    id: 'total-wine',
    name: 'Total Wine & More',
    baseUrl: 'https://www.totalwine.com',
    country: 'US',
    currency: 'USD',
    scraperType: 'playwright' as const,
    catalogUrl: 'https://www.totalwine.com/spirits/scotch-whisky',
    cronExpression: '0 5 * * *',
    affiliateProgram: false,
    tosStatus: 'ambiguous' as const,
    active: true,
  },
  {
    id: 'lcbo',
    name: 'LCBO',
    baseUrl: 'https://www.lcbo.com',
    country: 'CA',
    currency: 'CAD',
    scraperType: 'playwright' as const,
    catalogUrl: 'https://www.lcbo.com/en/spirits/whisky',
    cronExpression: '0 6 * * *',
    affiliateProgram: false,
    tosStatus: 'permitted' as const,   // ממשלתי — בדרך כלל מאפשר
    active: true,
  },
  {
    id: 'la-maison-du-whisky',
    name: 'La Maison du Whisky',
    baseUrl: 'https://www.whisky.fr',
    country: 'FR',
    currency: 'EUR',
    scraperType: 'playwright' as const,
    catalogUrl: 'https://www.whisky.fr/les-whiskies',
    cronExpression: '0 7 * * *',
    affiliateProgram: false,
    tosStatus: 'ambiguous' as const,
    active: true,
  },
  {
    id: 'whisky-de',
    name: 'Whisky.de',
    baseUrl: 'https://www.whisky.de',
    country: 'DE',
    currency: 'EUR',
    scraperType: 'playwright' as const,
    catalogUrl: 'https://www.whisky.de/shop/whisky/',
    cronExpression: '0 8 * * *',
    affiliateProgram: false,
    tosStatus: 'ambiguous' as const,
    active: true,
  },
  {
    id: 'kl-wine',
    name: 'K&L Wine Merchants',
    baseUrl: 'https://www.klwines.com',
    country: 'US',
    currency: 'USD',
    scraperType: 'playwright' as const,
    catalogUrl: 'https://www.klwines.com/Products?&productTypeCode=2',
    cronExpression: '0 9 * * *',
    affiliateProgram: false,
    tosStatus: 'ambiguous' as const,
    active: true,
  },
  {
    id: 'the-whisky-barrel',
    name: 'The Whisky Barrel',
    baseUrl: 'https://www.thewhiskybarrel.com',
    country: 'GB',
    currency: 'GBP',
    scraperType: 'playwright' as const,
    catalogUrl: 'https://www.thewhiskybarrel.com/collections/whisky',
    cronExpression: '30 2 * * *',      // Shopify store — קל לסריקה
    affiliateProgram: false,
    tosStatus: 'ambiguous' as const,
    active: true,
  },
  {
    id: 'abbey-whisky',
    name: 'Abbey Whisky',
    baseUrl: 'https://www.abbeywhisky.com',
    country: 'GB',
    currency: 'GBP',
    scraperType: 'playwright' as const,
    catalogUrl: 'https://www.abbeywhisky.com/whisky',
    cronExpression: '30 3 * * *',
    affiliateProgram: false,
    tosStatus: 'ambiguous' as const,
    active: false,                     // Phase 2 — after core 5 are stable
  },
] as const;
```

---

## 8. Factory Function — ניהול כל האדפטרים

```typescript
// packages/scraper/src/adapters/index.ts

import { whiskyExchangeScraperAdapter } from './whisky-exchange-scraper';
import { masterOfMaltAdapter } from './master-of-malt';
import { whiskybaseShopAdapter } from './whiskybase-shop';
import { totalWineAdapter } from './total-wine';
import { lcboAdapter } from './lcbo';
import { laMaisonDuWhiskyAdapter } from './la-maison-du-whisky';

const ADAPTERS: Record<string, ScraperAdapter> = {
  'whisky-exchange': whiskyExchangeScraperAdapter,
  'master-of-malt': masterOfMaltAdapter,
  'whiskybase-shop': whiskybaseShopAdapter,
  'total-wine': totalWineAdapter,
  'lcbo': lcboAdapter,
  'la-maison-du-whisky': laMaisonDuWhiskyAdapter,
};

export function getAdapter(retailerId: string): ScraperAdapter {
  const adapter = ADAPTERS[retailerId];
  if (!adapter) {
    throw new Error(`No adapter found for retailer: ${retailerId}. Available: ${Object.keys(ADAPTERS).join(', ')}`);
  }
  return adapter;
}

export { ADAPTERS };
```

---

## 9. משתני סביבה נדרשים

הוסף לקובץ `.env.example`:
```bash
# === Retailer Integration ===

# Awin (The Whisky Exchange affiliate)
AWIN_API_KEY=
AWIN_TWE_FEED_URL=            # מקבלים לאחר אישור תוכנית השותפים

# Affiliate Future (Master of Malt)
AFFILIATE_FUTURE_API_KEY=
AFFILIATE_FUTURE_MOM_FEED_URL=

# Proxy (לסריקה נגד Cloudflare)
PROXY_URL=                    # פורמט: http://user:pass@host:port
PROXY_POOL=                   # JSON array של proxy URLs (לסבב)

# Scraper Config
SCRAPER_HEADLESS=true
SCRAPER_CONCURRENCY_PLAYWRIGHT=4    # מקביל Playwright instances
SCRAPER_CONCURRENCY_HTTP=32         # מקביל HTTP requests
SCRAPER_DEFAULT_CRON=0 2 * * *     # Default: 02:00 UTC
```

---

## 10. עדיפות פיתוח — סדר יישום

```
גל 1 (Phase 1): קטלוג בסיסי
  ✅ Whiskybase catalog seed (מטא-דאטה + תמונות + ציונים)
  ✅ The Whisky Exchange scraper
  ✅ Master of Malt scraper

גל 2 (Phase 1): השלמת 10 קמעונאים  
  ⏳ Total Wine (US)
  ⏳ LCBO (CA)
  ⏳ Whiskybase Shop
  ⏳ La Maison du Whisky (FR)
  ⏳ Whisky.de (DE)
  ⏳ K&L Wine Merchants
  ⏳ The Whisky Barrel

גל 3 (Phase 2): קמעונאים נוספים + שיפורי אנטי-בוט
  📌 Abbey Whisky
  📌 Spec's Wines & Spirits (US/TX)
  📌 Dramtime
  📌 Whisky Auctioneer (secondary market — schema שונה)
```

---

## 11. פעולות נדרשות לפני Go-Live

| פעולה | דחיפות | אחראי |
|-------|--------|-------|
| קרא `robots.txt` של כל קמעונאי | 🔴 MUST | Dev |
| קרא Terms of Service של כל קמעונאי | 🔴 MUST | Legal/Dev |
| הגש בקשה לתוכנית שותפים — The Whisky Exchange (Awin) | 🟡 HIGH | BD |
| הגש בקשה לתוכנית שותפים — Master of Malt (Affiliate Future) | 🟡 HIGH | BD |
| פנה ל-Whiskybase לשיתוף נתונים רשמי | 🟡 HIGH | BD |
| רכוש Bright Data proxy subscription | 🟡 HIGH | Dev/Finance |
| בדוק CSS selectors בפועל (may have changed) | 🟠 MEDIUM | Dev |

---

## מקורות

- [The Whisky Exchange Affiliate Program — Awin](https://www.thewhiskyexchange.com/affiliates)  
- [Master of Malt Affiliates Program](https://www.masterofmalt.com/affiliates/)  
- [Affiliate-Toolkit: TWE Program Details](https://www.affiliate-toolkit.com/program/the-whisky-exchange/)  
- [LCBO Online Store](https://www.lcbo.com/en/spirits/whisky)  
- [La Maison du Whisky](https://www.whisky.fr/)  
- [Whisky.de](https://www.whisky.de/shop/whisky/)
