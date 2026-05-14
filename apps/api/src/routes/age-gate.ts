/**
 * Age gate routes — AUTH-05 / COMP-01.
 *
 * GET  /api/age-gate/config?country=XX  → { minAge, country }
 * POST /api/age-gate/confirm            → sets age_confirmed cookie
 */
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { setCookie } from 'hono/cookie';
import { z } from 'zod';

export const ageGateRoute = new Hono();

/** Countries where the legal purchase age is 21+ */
const AGE_21_COUNTRIES = new Set(['US']);

const DEFAULT_MIN_AGE = 18;
const US_MIN_AGE = 21;

function minAgeFor(country: string): number {
  return AGE_21_COUNTRIES.has(country.toUpperCase()) ? US_MIN_AGE : DEFAULT_MIN_AGE;
}

// ---------------------------------------------------------------------------
// GET /api/age-gate/config
// Returns the required minimum age for a given country — used by the frontend
// to render the correct age gate copy before the user confirms.
// ---------------------------------------------------------------------------
ageGateRoute.get('/config', (c) => {
  const raw = c.req.query('country') ?? '';
  const country = raw.toUpperCase().slice(0, 2);
  return c.json({ minAge: minAgeFor(country), country: country || null });
});

// ---------------------------------------------------------------------------
// POST /api/age-gate/confirm
// User declares they meet the minimum age. Sets an HttpOnly cookie that the
// requireAgeGate middleware checks on subsequent requests.
//
// The server trusts this declaration — enforcement of actual age is the
// retailer's responsibility at point of purchase (COMP-03).
// ---------------------------------------------------------------------------
const ConfirmSchema = z.object({
  /** Must be true — any other value is rejected by Zod */
  confirmed: z.literal(true),
  /** ISO 3166-1 alpha-2 country code — determines minimum age */
  country: z.string().length(2).toUpperCase(),
});

ageGateRoute.post(
  '/confirm',
  zValidator('json', ConfirmSchema),
  (c) => {
    const { country } = c.req.valid('json');
    const isProduction = process.env['NODE_ENV'] === 'production';
    const cookieOpts = {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'Strict' as const,
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: '/',
    };

    setCookie(c, 'age_confirmed', 'true', cookieOpts);
    // Store country so the UI can display correct age copy on return visits
    setCookie(c, 'age_country', country, cookieOpts);

    return c.json({ confirmed: true, minAge: minAgeFor(country) });
  },
);
