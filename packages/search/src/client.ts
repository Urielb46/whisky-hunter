/**
 * Typesense client singleton.
 *
 * Required env vars:
 *   TYPESENSE_HOST     — e.g. "xyz.a1.typesense.net" (Cloud) or "localhost"
 *   TYPESENSE_PORT     — default 443 (Cloud) or 8108 (self-hosted)
 *   TYPESENSE_PROTOCOL — "https" (Cloud) or "http" (self-hosted)
 *   TYPESENSE_API_KEY  — admin key for indexing; search-only key for read path
 */

import Typesense from 'typesense';

const host     = process.env['TYPESENSE_HOST']     ?? 'localhost';
const port     = parseInt(process.env['TYPESENSE_PORT'] ?? '8108', 10);
const protocol = (process.env['TYPESENSE_PROTOCOL'] ?? 'http') as 'http' | 'https';
const apiKey   = process.env['TYPESENSE_API_KEY']  ?? 'xyz';

export const typesense = new Typesense.Client({
  nodes: [{ host, port, protocol }],
  apiKey,
  connectionTimeoutSeconds: 5,
  retryIntervalSeconds: 0.1,
  numRetries: 3,
});

/** Returns true if a Typesense host is configured (not just localhost default). */
export function isTypesenseConfigured(): boolean {
  return !!(
    process.env['TYPESENSE_HOST'] &&
    process.env['TYPESENSE_API_KEY']
  );
}
