/**
 * Price-alert checker — BullMQ worker that runs every 6 hours.
 *
 * For each active price alert:
 *   1. Fetch the latest price snapshot for the product.
 *   2. Skip if snapshot is older than 12 hours (ALRT-03).
 *   3. Convert to GBP pence using the stored priceUsd + a live FX rate.
 *   4. If price <= targetPriceGbp → send Expo push + email fallback (ALRT-01, ALRT-02).
 *   5. Update lastTriggeredAt; cooldown is 24 hours (ALRT-04).
 */

import { Worker, Queue } from 'bullmq';
import { redisConnection } from '../queue/connection.js';
import { db } from '@whisky-hunter/database';
import {
  priceAlerts,
  priceSnapshots,
  users,
  products,
} from '@whisky-hunter/database';
import { eq, and, desc, sql } from 'drizzle-orm';

export const ALERT_QUEUE_NAME = 'price-alert-check';

// 24-hour cooldown — spec ALRT-04: at most one re-notification per 24h per (user × product)
const COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Approximate USD→GBP rate used as fallback when FX API is unavailable
const FALLBACK_USD_TO_GBP = 0.79;

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export function createPriceAlertQueue(): Queue {
  return new Queue(ALERT_QUEUE_NAME, { connection: redisConnection });
}

// ---------------------------------------------------------------------------
// Worker
// ---------------------------------------------------------------------------

export function createPriceAlertWorker(): Worker {
  return new Worker(
    ALERT_QUEUE_NAME,
    async () => {
      console.log('[price-alert] running check...');
      const now = new Date();
      const cooldownCutoff = new Date(now.getTime() - COOLDOWN_MS);

      // Fetch USD→GBP rate (best-effort; fall back to constant)
      const usdToGbp = await fetchUsdToGbpRate();

      // Load active alerts with user's email + push token
      const activeAlerts = await db
        .select({
          alertId:        priceAlerts.id,
          productId:      priceAlerts.productId,
          targetPricePence: priceAlerts.targetPriceGbp,
          lastTriggeredAt: priceAlerts.lastTriggeredAt,
          userId:         priceAlerts.userId,
          userEmail:      users.email,
          pushToken:      users.pushToken,
          productName:    products.name,
        })
        .from(priceAlerts)
        .innerJoin(users, eq(priceAlerts.userId, users.id))
        .leftJoin(
          products,
          sql`${products.id}::text = ${priceAlerts.productId}`,
        )
        .where(eq(priceAlerts.active, true));

      let triggered = 0;

      for (const alert of activeAlerts) {
        // Skip if triggered recently
        if (
          alert.lastTriggeredAt &&
          alert.lastTriggeredAt > cooldownCutoff
        ) {
          continue;
        }

        // Latest snapshot for this product
        const [snapshot] = await db
          .select({
            priceLocal: priceSnapshots.priceLocal,
            priceUsd:   priceSnapshots.priceUsd,
            currency:   priceSnapshots.currency,
            inStock:    priceSnapshots.inStock,
            scrapedAt:  priceSnapshots.scrapedAt,
          })
          .from(priceSnapshots)
          .where(
            sql`${priceSnapshots.canonicalProductId}::text = ${alert.productId}`,
          )
          .orderBy(desc(priceSnapshots.scrapedAt))
          .limit(1);

        if (!snapshot || !snapshot.inStock) continue;

        // ALRT-03: skip if price data is older than 12 hours
        const dataAgeMs = Date.now() - new Date(snapshot.scrapedAt).getTime();
        if (dataAgeMs > 12 * 60 * 60 * 1000) continue;

        // Convert to GBP pence
        const priceUsd = parseFloat(
          snapshot.priceUsd ?? snapshot.priceLocal,
        );
        const priceGbpPence = Math.round(priceUsd * usdToGbp * 100);

        if (priceGbpPence > alert.targetPricePence) continue;

        // ---- Fire notification ----
        const productLabel =
          alert.productName ?? `Product #${alert.productId.slice(0, 8)}`;

        if (alert.pushToken) {
          await sendExpoPush(alert.pushToken, {
            title: '🥃 Price Alert',
            body: `${productLabel} is now £${(priceGbpPence / 100).toFixed(2)} — below your target of £${(alert.targetPricePence / 100).toFixed(2)}`,
            data: { productId: alert.productId },
          });
        }

        // ALRT-01: email fallback — always send regardless of push token
        await sendAlertEmail(alert.userEmail, {
          productName:    productLabel,
          currentPricePence: priceGbpPence,
          targetPricePence:  alert.targetPricePence,
          productId:      alert.productId,
        });

        // Update lastTriggeredAt
        await db
          .update(priceAlerts)
          .set({ lastTriggeredAt: now })
          .where(eq(priceAlerts.id, alert.alertId));

        console.log(
          `[price-alert] triggered alert ${alert.alertId} for user ${alert.userId} — £${(priceGbpPence / 100).toFixed(2)}`,
        );
        triggered++;
      }

      console.log(`[price-alert] done — ${triggered} alert(s) triggered`);
    },
    {
      connection: redisConnection,
      concurrency: 1, // serial — no race conditions on lastTriggeredAt
    },
  );
}

// ---------------------------------------------------------------------------
// Expo push
// ---------------------------------------------------------------------------

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

async function sendExpoPush(
  token: string,
  payload: PushPayload,
): Promise<void> {
  try {
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: token,
        title: payload.title,
        body: payload.body,
        data: payload.data ?? {},
        sound: 'default',
        priority: 'high',
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[price-alert] push failed:', text);
    }
  } catch (err) {
    console.error('[price-alert] push error:', err);
  }
}

// ---------------------------------------------------------------------------
// Email helper (direct Resend REST — no SDK dep in scraper package)
// ---------------------------------------------------------------------------

interface AlertEmailOpts {
  productName: string;
  currentPricePence: number;
  targetPricePence: number;
  productId: string;
}

async function sendAlertEmail(
  to: string,
  opts: AlertEmailOpts,
): Promise<void> {
  const apiKey = process.env['RESEND_API_KEY'];
  if (!apiKey) {
    console.warn('[price-alert] RESEND_API_KEY not set — skipping email');
    return;
  }

  const from  = process.env['RESEND_FROM'] ?? 'WhiskyHunter <onboarding@resend.dev>';
  const appUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';
  const current = (opts.currentPricePence / 100).toFixed(2);
  const target  = (opts.targetPricePence  / 100).toFixed(2);
  const url     = `${appUrl}/products/${opts.productId}`;
  // Escape product name to prevent HTML injection in email clients
  const safeName = opts.productName.replace(/[<>&"']/g, (c) => `&#${c.charCodeAt(0)};`);

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to,
        subject: `Price alert: ${opts.productName} is now £${current}`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
            <h2 style="color:#b8860b">🥃 Price Alert Triggered</h2>
            <p><strong>${safeName}</strong> has dropped to
               <strong>£${current}</strong> — below your target of £${target}.</p>
            <a href="${url}"
               style="display:inline-block;margin-top:16px;padding:12px 24px;
                      background:#b8860b;color:#fff;border-radius:6px;
                      text-decoration:none;font-weight:700">
              View Product
            </a>
          </div>`,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[price-alert] email send failed:', text);
    }
  } catch (err) {
    console.error('[price-alert] email error:', err);
  }
}

// ---------------------------------------------------------------------------
// FX helper
// ---------------------------------------------------------------------------

async function fetchUsdToGbpRate(): Promise<number> {
  try {
    const res = await fetch(
      'https://api.frankfurter.app/latest?from=USD&to=GBP',
    );
    if (!res.ok) throw new Error('FX API error');
    const data = (await res.json()) as { rates: { GBP: number } };
    return data.rates.GBP;
  } catch {
    console.warn('[price-alert] FX fetch failed, using fallback rate');
    return FALLBACK_USD_TO_GBP;
  }
}
