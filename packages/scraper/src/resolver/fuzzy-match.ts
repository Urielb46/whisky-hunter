import { parseName, sortedTokens } from './normalizer.js';

export interface MatchCandidate {
  id: string;
  name: string;
  distillery: string;
  ageYears: number | null;
  volumeMl: number;
}

export interface MatchResult {
  candidateId: string;
  score: number; // 0..1, higher = better match
  method: 'exact' | 'fuzzy' | 'none';
}

/** Minimum score to auto-accept a match without human review */
export const AUTO_ACCEPT_THRESHOLD = 0.75;

/** Minimum score to even queue for human review (below = likely garbage) */
export const REVIEW_THRESHOLD = 0.50;

/**
 * Jaccard similarity on token sets.
 * |intersection| / |union| — token order and noise words don't matter.
 */
function jaccard(a: string, b: string): number {
  const setA = new Set(a.split(' ').filter(Boolean));
  const setB = new Set(b.split(' ').filter(Boolean));
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/**
 * Match a scraped product name against a list of canonical candidates.
 *
 * Strategy:
 * 1. Exact match on normalised+sorted tokens → score 1.0
 * 2. Jaccard similarity on normalised token sets
 * 3. Age bonus (+0.08) / penalty (−0.15) when age is parseable
 * 4. Distillery name must appear in scraped tokens (hard filter)
 */
export function matchProduct(
  scrapedName: string,
  candidates: MatchCandidate[],
  scrapedVolumeMl?: number | null,
): MatchResult {
  if (candidates.length === 0) {
    return { candidateId: '', score: 0, method: 'none' };
  }

  const { normalized: scrapedNorm, ageYears: scrapedAge } =
    parseName(scrapedName);
  const scrapedSorted = sortedTokens(scrapedNorm);
  const scrapedTokenSet = new Set(scrapedNorm.split(' ').filter(Boolean));

  let best: MatchResult = { candidateId: '', score: 0, method: 'none' };

  for (const candidate of candidates) {
    // Normalise name only (not joined with distillery — avoids token inflation)
    const { normalized: candNorm, ageYears: candAge } = parseName(candidate.name);
    const candSorted = sortedTokens(candNorm);

    // 1. Exact token match
    if (scrapedSorted === candSorted) {
      return { candidateId: candidate.id, score: 1.0, method: 'exact' };
    }

    // 2. Jaccard on normalised token sets
    let score = jaccard(scrapedNorm, candNorm);

    // 3. Distillery soft filter: if distillery tokens not present, reduce score
    const { normalized: distNorm } = parseName(candidate.distillery);
    const distTokens = distNorm.split(' ').filter(Boolean);
    const distPresent = distTokens.every((t) => scrapedTokenSet.has(t));
    if (!distPresent) score *= 0.7;

    // 4. Age bonus / penalty
    if (scrapedAge !== null && candAge !== null) {
      score += scrapedAge === candAge ? 0.08 : -0.15;
    }

    // 5. Volume bonus for non-standard sizes
    const vol = scrapedVolumeMl ?? 700;
    if (vol !== 700 && candidate.volumeMl === vol) score += 0.03;

    score = Math.min(1.0, Math.max(0, score));

    if (score > best.score) {
      best = { candidateId: candidate.id, score, method: 'fuzzy' };
    }
  }

  return best;
}
