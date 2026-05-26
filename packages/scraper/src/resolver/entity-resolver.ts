/**
 * entity-resolver.ts — Levenshtein-based entity resolution for WhiskyHunter.
 *
 * DATA-02: Determines whether two scraped product records refer to the same
 * canonical whisky and routes the decision accordingly.
 *
 * Thresholds are LOCKED — do not lower AUTO_MERGE_THRESHOLD without a human
 * review cycle. Lowering risks silent corruption of the canonical product
 * registry (false positives cannot be detected automatically).
 *
 * Score formula:
 *   0.50 * nameSim + 0.30 * distillerySim + 0.10 * ageSim + 0.10 * volumeSim
 *
 * Hard reject:
 *   If BOTH ageYears are non-null AND differ → return 0 immediately.
 *   This prevents Glenfarclas 15 from ever merging with Glenfarclas 25
 *   regardless of how similar the names appear (Pitfall 3).
 *
 * Added: שדרוג 25526 (2026-05-25)
 */

import { distance } from 'fastest-levenshtein';

// ─── Locked thresholds (DATA-02) ──────────────────────────────────────────────

/** Products scoring >= this are auto-merged into the canonical registry. */
export const AUTO_MERGE_THRESHOLD = 0.90;

/** Products scoring in [REVIEW_QUEUE_THRESHOLD, AUTO_MERGE_THRESHOLD) are
 *  routed to the dedup_review_queue for human confirmation. */
export const REVIEW_QUEUE_THRESHOLD = 0.70;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Minimum product fields required by the resolver. */
export interface ProductForResolver {
  name:       string;
  distillery: string;
  ageYears:   number | null;
  volumeMl:   number;
}

export type MergeDecision =
  | { action: 'auto_merge' }
  | { action: 'review_queue'; score: number }
  | { action: 'no_action' };

// ─── Name normalization for resolver ─────────────────────────────────────────

/** Stop words that carry no product identity signal — stripped before comparison. */
const STOP_WORDS = new RegExp(
  '\\b(year|years|old|aged?|single|malt|whisky|whiskey|scotch|year-old|yr|y\\.o\\.)\\b',
  'gi',
);

/**
 * Normalize a product name for Levenshtein comparison.
 * Lowercases, strips stop words, collapses whitespace.
 * Applied to BOTH candidates so the distance is symmetric.
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(STOP_WORDS, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Similarity ───────────────────────────────────────────────────────────────

/**
 * Normalized Levenshtein similarity in [0, 1].
 * 1.0 = identical strings, 0.0 = completely different.
 */
function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1; // Both empty → identical
  return 1 - distance(a, b) / maxLen;
}

// ─── Core scoring ─────────────────────────────────────────────────────────────

/**
 * Compute a composite match score between two products.
 *
 * @returns Score in [0, 1].
 *   0          = hard reject (different known ages)
 *   >= 0.90    = auto-merge candidate
 *   0.70-0.89  = review-queue candidate
 *   < 0.70     = no action
 */
export function computeMatchScore(
  a: ProductForResolver,
  b: ProductForResolver,
): number {
  // ── Hard reject (Pitfall 3) ───────────────────────────────────────────────
  // Two products with confirmed different ages MUST NEVER auto-merge.
  if (
    a.ageYears !== null &&
    b.ageYears !== null &&
    a.ageYears !== b.ageYears
  ) {
    return 0;
  }

  // ── Component scores ──────────────────────────────────────────────────────
  const nameSim       = similarity(normalizeName(a.name), normalizeName(b.name));
  const distillerySim = a.distillery.toLowerCase().trim() === b.distillery.toLowerCase().trim() ? 1 : 0;
  const ageSim        = a.ageYears === b.ageYears ? 1 : 0;   // null === null is true
  const volumeSim     = a.volumeMl === b.volumeMl ? 1 : 0;

  // ── Weighted composite ────────────────────────────────────────────────────
  return (
    0.50 * nameSim +
    0.30 * distillerySim +
    0.10 * ageSim +
    0.10 * volumeSim
  );
}

// ─── Routing ─────────────────────────────────────────────────────────────────

/**
 * Classify a match score into an actionable routing decision.
 * Use this after computeMatchScore() to determine next steps.
 */
export function routeMatchDecision(score: number): MergeDecision {
  if (score >= AUTO_MERGE_THRESHOLD)    return { action: 'auto_merge' };
  if (score >= REVIEW_QUEUE_THRESHOLD)  return { action: 'review_queue', score };
  return { action: 'no_action' };
}
