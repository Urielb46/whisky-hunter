/**
 * Age gate middleware — AUTH-05 / COMP-01.
 *
 * Blocks access to search/products/cost routes until the user has confirmed
 * they meet the minimum legal purchase age for their country:
 *   - US: 21+
 *   - All other countries: 18+
 *
 * Confirmation is stored as an HttpOnly cookie (`age_confirmed=true`).
 * Use POST /api/age-gate/confirm to set it.
 *
 * Returns HTTP 451 (Unavailable For Legal Reasons) when gate is not cleared.
 */
import type { Context, Next } from 'hono';
import { getCookie } from 'hono/cookie';

export async function requireAgeGate(c: Context, next: Next): Promise<Response | void> {
  const confirmed = getCookie(c, 'age_confirmed');

  if (confirmed !== 'true') {
    return c.json(
      {
        error: 'AgeVerificationRequired',
        message: 'You must confirm your age before accessing this content.',
        confirmUrl: '/api/age-gate/confirm',
      },
      451, // Unavailable For Legal Reasons
    );
  }

  await next();
}
