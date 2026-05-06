/**
 * Price-alert checker — BullMQ worker that runs every 6 hours.
 *
 * For each active price alert:
 *   1. Fetch the latest price snapshot for the product.
 *   2. Convert to GBP pence using the stored priceUsd + a live FX rate.
 *   3. If price <= targetPriceGbp → send Expo push notification (+ email fallback).
 *   4. Update lastTriggeredAt to avoid re-firing within the cooldown window.
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

// 6-hour cooldown — don't re-fire an alert within this window
const COOLDOWN_MS = 6 * 60 * 60 * 1000;

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
          })
          .from(priceSnapshots)
          .where(
            sql`${priceSnapshots.canonicalProductId}::text = ${alert.productId}`,
          )
          .orderBy(desc(priceSnapshots.scrapedAt))
          .limit(1);

        if (!snapshot || !snapshot.inStock) continue;

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

        // Email fallback (imported lazily to avoid circular dep with api pkg)
        // In production, prefer push; email is belt-and-suspenders.
        // Uncomment if you want email fallback from the scraper worker:
        // await sendPriceAlertEmail(alert.userEmail, { ... });

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
