# Whiskybase Integration — Catalog, Images & Ratings

**Researched:** 2026-05-25  
**Confidence:** HIGH (URL patterns verified via search; scraping approach based on known patterns)  
**Status:** Active — Whiskybase has no public API; scraping is the only programmatic access route.

---

## סיכום מנהלים

Whiskybase (whiskybase.com) הוא מאגר המידע הגדול בעולם לוויסקי — עם מאות אלפי בקבוקים, ציוני משתמשים, תמונות, ומידע על יצרנים. WhiskyHunter ישתמש בו כ-**מקור הקטלוג הקנוני** — מה שAMDB הוא לסרטים, Whiskybase הוא לוויסקי.

**מה אנחנו לוקחים מ-Whiskybase:**
| נתון | שימוש ב-WhiskyHunter |
|------|----------------------|
| שם הבקבוק | `products.name` (canonical) |
| מזקקה (distillery) | `products.distillery` |
| גיל, נפח, ABV, אזור | `products.age_years / volume_ml / abv / region` |
| קטגוריה | `products.category` (scotch/bourbon/irish...) |
| ציון ממוצע | `products.review_score` |
| תמונה | `products.image_url` |
| Whiskybase ID | `products.whiskybase_id` (מזהה חיצוני חדש) |
| קישור לדף | מוצג ב-UI כ"ראה ב-Whiskybase" |

---

## 1. מבנה URL של Whiskybase

### דף מוצר (בקבוק בודד)
```
https://www.whiskybase.com/whiskies/{id}
# דוגמה:
https://www.whiskybase.com/whiskies/79197
https://www.whiskybase.com/whiskies/158720
```

### חיפוש / דפדוף קטלוג
```
https://www.whiskybase.com/whiskies?category=scotch&sort=score&page=1
# פרמטרים שימושיים:
#   category: scotch | bourbon | irish | japanese | world
#   sort:     score | name | votes | newest
#   page:     1,2,3...
```

### תמונות (CDN)
```
# תמונה רגילה (normal):
https://static.whiskybase.com/storage/whiskies/{id}-normal.png
# דוגמה:
https://static.whiskybase.com/storage/whiskies/79197-normal.png

# תמונה גדולה (large):
https://static.whiskybase.com/storage/whiskies/{id}-large.png

# תמונה קטנה (thumbnail):
https://static.whiskybase.com/storage/whiskies/{id}-small.png
```

> **הערה:** חלק מהבקבוקים ישנים משתמשים בפורמט ישן:  
> `https://static.whiskybase.com/storage/whiskies/{subdir}/{id}-normal.png`  
> ה-subdir הוא בדרך כלל 3 הספרות הראשונות של ה-ID. תמיד נסה את הפורמט הפשוט תחילה.

---

## 2. נתונים הניתנים לחילוץ מדף מוצר

```html
<!-- מבנה HTML של דף whiskybase.com/whiskies/{id} -->

<!-- שם הבקבוק -->
<h1 class="whisky-name">Glenfarclas 15 Year Old</h1>

<!-- ציון ממוצע -->
<div class="whisky-rating__score">86.60</div>

<!-- מספר ציונים -->
<div class="whisky-rating__votes">1,247 ratings</div>

<!-- פרטי מוצר (טבלה) -->
<table class="whisky-details">
  <tr><th>Distillery</th><td>Glenfarclas</td></tr>
  <tr><th>Age</th><td>15 Years</td></tr>
  <tr><th>Region</th><td>Speyside</td></tr>
  <tr><th>Bottler</th><td>Official Bottling</td></tr>
  <tr><th>Size</th><td>700 ml</td></tr>
  <tr><th>Strength</th><td>46%</td></tr>
  <tr><th>Cask type</th><td>Sherry Butts</td></tr>
  <tr><th>Category</th><td>Single Malt Scotch</td></tr>
</table>

<!-- תמונה -->
<img class="whisky-image" src="https://static.whiskybase.com/storage/whiskies/79197-normal.png" />
```

---

## 3. אדפטר Whiskybase — קוד TypeScript

```typescript
// packages/scraper/src/adapters/whiskybase-catalog.ts
// תפקיד: סריקת קטלוג Whiskybase לצורך SEED של products table
// לא לסריקת מחירים — Whiskybase הוא מקור מטא-דאטה, לא מחיר

import type { Page } from 'playwright';
import type { WhiskybaseProduct } from '@whisky-hunter/shared';

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

export const whiskybaseCatalogAdapter = {
  baseUrl: 'https://www.whiskybase.com',

  // סריקת עמוד רשימה — מחזיר מזהי בקבוקים
  async fetchListingPage(page: Page, category: string, pageNum: number): Promise<string[]> {
    await page.goto(
      `https://www.whiskybase.com/whiskies?category=${category}&sort=score&page=${pageNum}`,
      { waitUntil: 'domcontentloaded' }
    );

    // בדיקת חסימה
    const title = await page.title();
    if (title.includes('Just a moment') || title.includes('Cloudflare')) {
      throw new Error('bot-block: Cloudflare challenge on Whiskybase listing page');
    }

    return page.$$eval(
      'a.whisky-card__link, a[href*="/whiskies/"]',
      (links: HTMLAnchorElement[]) =>
        links
          .map(a => a.href.match(/\/whiskies\/(\d+)/)?.[1] ?? '')
          .filter(Boolean)
          .filter((id, i, arr) => arr.indexOf(id) === i) // dedup
    );
  },

  // סריקת דף מוצר בודד
  async fetchProductPage(page: Page, whiskybaseId: string): Promise<WhiskybaseProduct> {
    const url = `https://www.whiskybase.com/whiskies/${whiskybaseId}`;
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const title = await page.title();
    if (title.includes('404') || title.includes('Not found')) {
      throw new Error(`product-not-found: ${whiskybaseId}`);
    }

    return page.evaluate((wbId: string, wbUrl: string) => {
      const getText = (sel: string) =>
        document.querySelector(sel)?.textContent?.trim() ?? null;

      const getTableValue = (label: string): string | null => {
        const rows = Array.from(document.querySelectorAll('.whisky-details tr, table tr'));
        const row = rows.find(r => r.querySelector('th')?.textContent?.trim() === label);
        return row?.querySelector('td')?.textContent?.trim() ?? null;
      };

      // ציון
      const scoreText = getText('.whisky-rating__score, .score-value, [class*="rating__score"]');
      const reviewScore = scoreText ? parseFloat(scoreText) : null;

      // מספר ציונים
      const votesText = getText('.whisky-rating__votes, [class*="votes"]') ?? '';
      const reviewCount = parseInt(votesText.replace(/[^0-9]/g, '') || '0');

      // גיל
      const ageText = getTableValue('Age') ?? getTableValue('Statement');
      const ageYears = ageText ? parseInt(ageText) || null : null;

      // נפח
      const sizeText = getTableValue('Size') ?? getTableValue('Volume');
      const volumeMl = sizeText ? parseInt(sizeText.replace(/[^0-9]/g, '')) || 700 : 700;

      // ABV
      const abvText = getTableValue('Strength') ?? getTableValue('ABV');
      const abv = abvText ? parseFloat(abvText) || null : null;

      // תמונה
      const imgEl = document.querySelector<HTMLImageElement>(
        '.whisky-image img, img[class*="whisky"], img[src*="whiskybase"]'
      );
      const imageUrl = imgEl?.src ?? 
        `https://static.whiskybase.com/storage/whiskies/${wbId}-normal.png`;

      return {
        whiskybaseId: wbId,
        name: getText('h1.whisky-name, h1[class*="whisky"]') ?? '',
        distillery: getTableValue('Distillery') ?? '',
        ageYears,
        volumeMl,
        abv,
        region: getTableValue('Region'),
        category: getTableValue('Category') ?? 'whisky',
        caskType: getTableValue('Cask type') ?? getTableValue('Cask'),
        reviewScore,
        reviewCount,
        imageUrl,
        whiskybaseUrl: wbUrl,
      } satisfies Record<string, unknown>;
    }, whiskybaseId, url) as Promise<WhiskybaseProduct>;
  },

  // מספר עמודים בקטגוריה
  async totalPages(page: Page): Promise<number> {
    const lastPageEl = await page.$('.pagination__last, a[aria-label="Last page"]');
    if (!lastPageEl) return 1;
    const href = await lastPageEl.getAttribute('href') ?? '';
    const match = href.match(/page=(\d+)/);
    return match ? parseInt(match[1]) : 1;
  },

  // קטגוריות לסריקה
  categories: [
    'scotch',      // Single Malt + Blended Scotch
    'bourbon',     // American Whiskey
    'irish',       // Irish Whiskey
    'japanese',    // Japanese Whisky
    'world',       // Rest of World
  ] as const,
};
```

---

## 4. שינוי סכמת ה-DB — הוספת שדות Whiskybase

```typescript
// packages/database/src/schema/products.ts — UPDATED
// הוסף שני שדות חדשים:

export const products = pgTable('products', {
  // ... שדות קיימים ...
  
  // === חדש: Whiskybase ===
  whiskybaseId:   text('whiskybase_id').unique(),   // מזהה Whiskybase (חיצוני)
  whiskybaseUrl:  text('whiskybase_url'),            // קישור ישיר לדף Whiskybase
  reviewScore:    numeric('review_score', { precision: 5, scale: 2 }),  // ציון ממוצע
  reviewCount:    integer('review_count').default(0), // מספר מצביעים
  imageUrl:       text('image_url'),                  // URL לתמונה (מ-Whiskybase CDN)
  
  // ... שאר השדות ...
});
```

**Migration SQL (להוסיף ידנית לקובץ migration):**
```sql
ALTER TABLE products 
  ADD COLUMN IF NOT EXISTS whiskybase_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS whiskybase_url TEXT,
  ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0;

-- אינדקס לחיפוש לפי Whiskybase ID (Entity Resolver משתמש בו)
CREATE INDEX IF NOT EXISTS idx_products_whiskybase_id ON products(whiskybase_id);
```

---

## 5. זרימת עבודה — Seed הקטלוג מ-Whiskybase

```
Phase 1 Wave 0 (Whiskybase Seed):
┌─────────────────────────────────────────────────────────┐
│  BullMQ Job: 'whiskybase-catalog-seed'                  │
│  מופעל פעם אחת (manual) + עדכון שבועי                   │
│                                                         │
│  לכל קטגוריה (scotch/bourbon/irish/japanese/world):     │
│    1. fetchListingPage → רשימת Whiskybase IDs           │
│    2. לכל ID → fetchProductPage → WhiskybaseProduct     │
│    3. upsert לטבלת products                             │
│       ON CONFLICT (whiskybase_id) DO UPDATE             │
│         review_score, review_count, image_url            │
│                                                         │
│  קצב: 1 בקשה / 2 שניות (Rate limiting)                 │
│  Proxy: מומלץ — residential proxy                       │
└─────────────────────────────────────────────────────────┘
```

```typescript
// packages/scraper/src/queue/whiskybase-seed-job.ts
import { Worker } from 'bullmq';
import { whiskybaseCatalogAdapter } from '../adapters/whiskybase-catalog';
import { createStealthContext } from './browser-factory';
import { db } from '@whisky-hunter/database';
import { products } from '@whisky-hunter/database/schema';

const whiskybaseSeedWorker = new Worker(
  'whiskybase-seed',
  async (job) => {
    const { category, pageNum } = job.data;
    const { browser, ctx } = await createStealthContext(process.env.PROXY_URL);
    const page = await ctx.newPage();

    try {
      const ids = await whiskybaseCatalogAdapter.fetchListingPage(page, category, pageNum);
      
      for (const whiskybaseId of ids) {
        const product = await whiskybaseCatalogAdapter.fetchProductPage(page, whiskybaseId);
        
        // Upsert — מעדכן ציון ותמונה אם כבר קיים
        await db.insert(products).values({
          name: product.name,
          distillery: product.distillery,
          ageYears: product.ageYears,
          volumeMl: product.volumeMl,
          abv: product.abv,
          region: product.region,
          category: normalizeCategory(product.category),
          caskType: product.caskType,
          reviewScore: product.reviewScore?.toString(),
          reviewCount: product.reviewCount,
          imageUrl: product.imageUrl,
          whiskybaseId: product.whiskybaseId,
          whiskybaseUrl: product.whiskybaseUrl,
        }).onConflictDoUpdate({
          target: products.whiskybaseId,
          set: {
            reviewScore: product.reviewScore?.toString(),
            reviewCount: product.reviewCount,
            imageUrl: product.imageUrl,
            updatedAt: new Date(),
          },
        });

        // Rate limit — 2 שניות בין כל בקבוק
        await new Promise(r => setTimeout(r, 2000));
      }
    } finally {
      await browser.close();
    }
  },
  {
    connection: redis,
    concurrency: 1, // Whiskybase — רק instance אחד במקביל
    limiter: { max: 1, duration: 2000 },
  }
);
```

---

## 6. עדכון UI — הצגת נתוני Whiskybase

### כרטיס מוצר (Product Card)
```tsx
// apps/web/src/components/ProductCard.tsx
<div className="product-card">
  <img 
    src={product.imageUrl ?? '/placeholder-bottle.png'} 
    alt={product.name}
    onError={(e) => { e.currentTarget.src = '/placeholder-bottle.png'; }}
  />
  
  <h3>{product.name}</h3>
  <p>{product.distillery} · {product.region}</p>
  
  {/* ציון Whiskybase */}
  {product.reviewScore && (
    <div className="whiskybase-score">
      <span className="score-value">{product.reviewScore.toFixed(1)}</span>
      <span className="score-label">Whiskybase</span>
      <span className="vote-count">({product.reviewCount.toLocaleString()} votes)</span>
      <a 
        href={product.whiskybaseUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="whiskybase-link"
      >
        View on Whiskybase →
      </a>
    </div>
  )}
</div>
```

---

## 7. שיקולי תאימות (Compliance)

| נושא | מצב | פעולה מומלצת |
|------|-----|--------------|
| `robots.txt` | לא אומת ישירות | **בדוק לפני deployment**: `curl https://www.whiskybase.com/robots.txt` |
| תנאי שימוש | לא נקראו | **קרא ToS לפני Go-Live** — חפש בתחתית האתר |
| קצב בקשות | לא ידוע | התחל ב-1 req/2sec; הגבר בזהירות |
| קרדיט | נדרש מוסרית | הצג "Ratings powered by Whiskybase" + קישור |
| שותפות עסקית | לא נבדק | שקול לפנות ל-Whiskybase לשיתוף פעולה רשמי |

> **המלצה:** לפני Scraping בהיקף מלא — שלח אימייל ל-Whiskybase ובקש רשות. הם עשויים לספק data export ישיר, מה שיחסוך את כל הסקרייפינג.

---

## 8. מקורות

- [Whiskybase — אתר ראשי](https://www.whiskybase.com/)  
- [whiskybase.com/whiskies — קטלוג](https://www.whiskybase.com/whiskies)  
- [How is the bottle rating calculated? — Whiskybase Knowledge Base](https://whiskybase.freshdesk.com/support/solutions/articles/33000296437)  
- [YouTube: whiskybase.com Data Scraping Bot](https://www.youtube.com/watch?v=My0QI-4miEM)  
- [Better Programming: Scraping Whiskey Review Data](https://medium.com/better-programming/scraping-whiskey-review-data-to-build-a-recommendation-system-af6b82f31301)
