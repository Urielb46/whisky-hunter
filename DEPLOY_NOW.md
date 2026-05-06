# 🚀 פריסה — צעד אחר צעד

## שלב 0 — pnpm install
```bash
cd "C:\Users\uriel\Documents\Claude\Projects\אפליקציית חיפוש ורכישת וויסקי"
pnpm install
pnpm -r typecheck
```

---

## שלב 1 — GitHub (חובה לפני הכל)

1. לך לאתר [github.com/new](https://github.com/new)
2. צור ריפוזיטורי חדש בשם `whisky-hunter` (פרטי)
3. אל תוסיף README, .gitignore או רישיון — הריפוזיטורי צריך להיות ריק
4. הרץ את הפקודות הבאות בתיקיית הפרויקט:

```bash
git remote add origin https://github.com/urielboas/whisky-hunter.git
git add .
git commit -m "feat: WhiskyHunter v1 — all 5 phases complete"
git branch -M main
git push -u origin main
```

---

## שלב 2 — Railway (שירות API)

1. לך ל-[railway.app](https://railway.app) ← New Project ← Deploy from GitHub repo ← בחר `whisky-hunter`
2. בהגדרות השירות: Root Directory = `apps/api`
3. הוסף שירות Redis: לחץ על **+ New** ← Database ← Redis — משתנה `REDIS_URL` יוגדר אוטומטית
4. הגדר את משתני הסביבה הבאים על שירות ה-API:
   - `DATABASE_URL` = `<מחרוזת החיבור של Neon>`
   - `BETTER_AUTH_SECRET` = `<הרץ: openssl rand -base64 32>`
   - `NODE_ENV` = `production`
   - `GOOGLE_CLIENT_ID` = `<אופציונלי>`
   - `GOOGLE_CLIENT_SECRET` = `<אופציונלי>`
   - `RESEND_API_KEY` = `<אופציונלי>`
5. פרוס ← המתן שה-`/health` יחזיר 200
6. העתק את כתובת ה-URL של Railway (לדוגמה: `https://whisky-hunter-api-production.up.railway.app`)

---

## שלב 3 — Railway (Scraper Worker)

1. באותו פרויקט Railway ← **+ New Service** ← GitHub repo ← `whisky-hunter`
2. Root Directory = `packages/scraper`
3. הגדר את אותם משתני סביבה כמו שירות ה-API (`DATABASE_URL`, `REDIS_URL`, `NODE_ENV`)
4. פרוס — אין צורך ב-health check URL

---

## שלב 4 — Vercel (אפליקציית Web)

1. לך ל-[vercel.com](https://vercel.com) ← New Project ← Import from GitHub ← `whisky-hunter`
2. Root Directory = `apps/web`
3. Build Command = `pnpm --filter @whisky-hunter/web build`
4. הוסף משתנה סביבה: `NEXT_PUBLIC_API_URL` = `<כתובת ה-Railway API מהשלב 2>`
5. פרוס ← ודא שהדף הראשי נטען

---

## שלב 5 — Google OAuth

1. לך ל-[console.cloud.google.com](https://console.cloud.google.com) ← APIs & Services ← Credentials
2. צור OAuth 2.0 Client ID (סוג: Web application)
3. Authorized redirect URIs:
   - `https://<railway-api-url>/api/auth/callback/google`
   - `http://localhost:3000/api/auth/callback/google`
4. הוסף את `GOOGLE_CLIENT_ID` ואת `GOOGLE_CLIENT_SECRET` למשתני הסביבה של שירות ה-API ב-Railway

---

## שלב 6 — Resend Email

1. לך ל-[resend.com](https://resend.com) ← הירשם ← Create API Key
2. הוסף את `RESEND_API_KEY` למשתני הסביבה של שירות ה-API ב-Railway
3. אופציונלי: הוסף דומיין משלך לכתובת FROM מותאמת אישית

---

## שלב 7 — Expo EAS Build (Mobile)

```bash
cd "C:\Users\uriel\Documents\Claude\Projects\אפליקציית חיפוש ורכישת וויסקי\apps\mobile"
npm install -g eas-cli
eas login
eas init
# העתק את ה-projectId מהפלט לתוך apps/mobile/app.json תחת extra.eas.projectId
# לאחר מכן עדכן את extra.apiUrl עם כתובת ה-Railway API

eas build --platform android --profile preview
```

---

## שלב 8 — מיגרציית DB לייצור

לאחר שחיבורי Railway ו-Neon הוגדרו:

```bash
# הרץ מתיקיית שורש הפרויקט:
set DATABASE_URL=<your-neon-prod-url>
pnpm --filter @whisky-hunter/database db:migrate
pnpm --filter @whisky-hunter/database db:seed
```

---

## שלב 9 — בדיקות Smoke

- [ ] `GET /health` ← 200
- [ ] `GET /api/search?q=macallan` ← תוצאות עם מחירים
- [ ] `GET /api/products/:id` ← מוצר + מחירי קמעונאים
- [ ] `GET /api/cost?retailerId=whisky-exchange&productId=:id&destination=IL` ← פירוט עלות כוללת
- [ ] הרשמה עם אימייל ← session נוצר
- [ ] התחברות עם Google OAuth ← תהליך OAuth מושלם
- [ ] הוספה ל-Wishlist ← נשמר בין sessions
- [ ] יצירת price alert ← נשמר ב-DB
- [ ] ה-Scraper worker מתחיל ומבצע scraping לדף אחד ← listings מופיעים ב-DB

---

**הערה:** בצע הכל לפי הסדר. שלב 1 (GitHub) חייב להתבצע לפני שלבים 2–4.

להפקת `BETTER_AUTH_SECRET` חדש: `openssl rand -base64 32`
