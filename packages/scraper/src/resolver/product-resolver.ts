import { db } from '@whisky-hunter/database';
import { products, sourceMappings } from '@whisky-hunter/database';
import { eq, and } from 'drizzle-orm';
import type { RawProduct } from '@whisky-hunter/shared';
import {
  matchProduct,
  AUTO_ACCEPT_THRESHOLD,
  REVIEW_THRESHOLD,
  type MatchCandidate,
} from './fuzzy-match.js';

export type ResolveOutcome =
  | { status: 'mapped'; sourceMappingId: string; canonicalProductId: string }
  | { status: 'pending_review'; score: number; candidateId: string }
  | { status: 'skipped'; reason: string };

/**
 * Resolve a scraped product to a canonical product ID.
 *
 * Flow:
 *  1. Check if source mapping already exists → return it
 *  2. Load canonical products, fuzzy-match
 *  3. Score ≥ AUTO_ACCEPT_THRESHOLD: create source mapping automatically
 *  4. Score ≥ REVIEW_THRESHOLD: return pending_review (caller decides what to do)
 *  5. Below review threshold: skip (likely noise / non-whisky listing)
 */
export async function resolveProduct(
  raw: RawProduct,
): Promise<ResolveOutcome> {
  // 1. Existing mapping — return immediately
  const existing = await db
    .select({
      id: sourceMappings.id,
      canonicalProductId: sourceMappings.canonicalProductId,
    })
    .from(sourceMappings)
    .where(
      and(
        eq(sourceMappings.retailerId, raw.retailerId),
        eq(sourceMappings.sourceProductId, raw.sourceProductId),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return {
      status: 'mapped',
      sourceMappingId: existing[0].id,
      canonicalProductId: existing[0].canonicalProductId,
    };
  }

  // 2. Load canonical catalog and fuzzy-match
  const canonical = await db
    .select({
      id: products.id,
      name: products.name,
      distillery: products.distillery,
      ageYears: products.ageYears,
      volumeMl: products.volumeMl,
    })
    .from(products);

  const candidates: MatchCandidate[] = canonical.map((p) => ({
    id: p.id,
    name: p.name,
    distillery: p.distillery,
    ageYears: p.ageYears ?? null,
    volumeMl: p.volumeMl,
  }));

  const match = matchProduct(raw.name, candidates, raw.volumeMl);

  // 3. Auto-accept: create source mapping
  if (match.score >= AUTO_ACCEPT_THRESHOLD && match.candidateId) {
    const [inserted] = await db
      .insert(sourceMappings)
      .values({
        canonicalProductId: match.candidateId,
        retailerId: raw.retailerId,
        sourceUrl: raw.url,
        sourceProductId: raw.sourceProductId,
      })
      .onConflictDoNothing()
      .returning({ id: sourceMappings.id });

    if (inserted) {
      return {
        status: 'mapped',
        sourceMappingId: inserted.id,
        canonicalProductId: match.candidateId,
      };
    }
  }

  // 4. Plausible match — needs human review
  if (match.score >= REVIEW_THRESHOLD && match.candidateId) {
    return {
      status: 'pending_review',
      score: match.score,
      candidateId: match.candidateId,
    };
  }

  // 5. No match
  return {
    status: 'skipped',
    reason: `best score ${match.score.toFixed(3)} below review threshold`,
  };
}
