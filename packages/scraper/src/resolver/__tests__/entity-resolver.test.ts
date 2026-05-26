import { describe, it, expect } from 'vitest';
import {
  computeMatchScore,
  routeMatchDecision,
  normalizeName,
  AUTO_MERGE_THRESHOLD,
  REVIEW_QUEUE_THRESHOLD,
  type ProductForResolver,
} from '../entity-resolver.js';

// ─── Test fixtures ────────────────────────────────────────────────────────────

const glenfarclas15: ProductForResolver = {
  name: 'Glenfarclas 15 Year Old',
  distillery: 'Glenfarclas',
  ageYears: 15,
  volumeMl: 700,
};
const glenfarclas15_alt: ProductForResolver = {
  name: 'Glenfarclas Fifteen',
  distillery: 'Glenfarclas',
  ageYears: 15,
  volumeMl: 700,
};
const glenfarclas25: ProductForResolver = {
  name: 'Glenfarclas 25 Year Old',
  distillery: 'Glenfarclas',
  ageYears: 25,
  volumeMl: 700,
};
const glenfarclas_nas: ProductForResolver = {
  name: 'Glenfarclas Heritage',
  distillery: 'Glenfarclas',
  ageYears: null,
  volumeMl: 700,
};
const ardbeg10: ProductForResolver = {
  name: 'Ardbeg 10 Year Old',
  distillery: 'Ardbeg',
  ageYears: 10,
  volumeMl: 700,
};
const ardbegUigeadail: ProductForResolver = {
  name: 'Ardbeg Uigeadail',
  distillery: 'Ardbeg',
  ageYears: null,
  volumeMl: 700,
};
const ardbegAlligator: ProductForResolver = {
  name: 'Ardbeg Alligator',
  distillery: 'Ardbeg',
  ageYears: null,
  volumeMl: 700,
};
const macallan18: ProductForResolver = {
  name: 'Macallan 18 Year Old',
  distillery: 'Macallan',
  ageYears: 18,
  volumeMl: 700,
};

// ─── computeMatchScore ────────────────────────────────────────────────────────

describe('computeMatchScore', () => {
  it('same product with different name formatting scores >= AUTO_MERGE_THRESHOLD', () => {
    const score = computeMatchScore(glenfarclas15, glenfarclas15_alt);
    expect(score).toBeGreaterThanOrEqual(AUTO_MERGE_THRESHOLD);
  });

  it('different known ages → hard reject returns exactly 0 (Pitfall 3)', () => {
    expect(computeMatchScore(glenfarclas15, glenfarclas25)).toBe(0);
  });

  it('same distillery NAS products: not hard-rejected, score in (0, AUTO_MERGE_THRESHOLD)', () => {
    const score = computeMatchScore(ardbegUigeadail, ardbegAlligator);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(AUTO_MERGE_THRESHOLD);
  });

  it('completely different distilleries score < REVIEW_QUEUE_THRESHOLD', () => {
    expect(computeMatchScore(glenfarclas15, macallan18)).toBeLessThan(REVIEW_QUEUE_THRESHOLD);
  });

  it('different distilleries score < REVIEW_QUEUE_THRESHOLD (Glenfarclas vs Ardbeg)', () => {
    expect(computeMatchScore(glenfarclas15, ardbeg10)).toBeLessThan(REVIEW_QUEUE_THRESHOLD);
  });

  it('score is always in [0, 1] range', () => {
    const pairs: [ProductForResolver, ProductForResolver][] = [
      [glenfarclas15, glenfarclas15_alt],
      [glenfarclas15, glenfarclas25],
      [ardbegUigeadail, ardbegAlligator],
      [glenfarclas15, macallan18],
    ];
    for (const [a, b] of pairs) {
      const s = computeMatchScore(a, b);
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(1);
    }
  });

  it('null ageYears === null ageYears contributes positively (not a hard reject)', () => {
    const score = computeMatchScore(glenfarclas_nas, {
      name: 'Glenfarclas Heritage Single Malt',
      distillery: 'Glenfarclas',
      ageYears: null,
      volumeMl: 700,
    });
    // null age on both sides + same distillery + same name → should be high
    expect(score).toBeGreaterThan(0.7);
  });

  it('volume mismatch reduces score', () => {
    const scoreMatching = computeMatchScore(glenfarclas15, glenfarclas15_alt);
    const scoreMismatch = computeMatchScore(glenfarclas15, { ...glenfarclas15_alt, volumeMl: 500 });
    expect(scoreMatching).toBeGreaterThan(scoreMismatch);
  });

  it('is symmetric: score(a,b) === score(b,a)', () => {
    const ab = computeMatchScore(glenfarclas15, glenfarclas15_alt);
    const ba = computeMatchScore(glenfarclas15_alt, glenfarclas15);
    expect(ab).toBeCloseTo(ba, 10);
  });
});

// ─── routeMatchDecision ───────────────────────────────────────────────────────

describe('routeMatchDecision', () => {
  it('score >= 0.90 → auto_merge', () => {
    expect(routeMatchDecision(0.95).action).toBe('auto_merge');
    expect(routeMatchDecision(0.90).action).toBe('auto_merge');
  });

  it('score in [0.70, 0.90) → review_queue', () => {
    const d = routeMatchDecision(0.75);
    expect(d.action).toBe('review_queue');
    if (d.action === 'review_queue') expect(d.score).toBe(0.75);
  });

  it('score 0.70 exactly → review_queue (boundary)', () => {
    expect(routeMatchDecision(0.70).action).toBe('review_queue');
  });

  it('score < 0.70 → no_action', () => {
    expect(routeMatchDecision(0.69).action).toBe('no_action');
    expect(routeMatchDecision(0.0).action).toBe('no_action');
  });

  it('hard-reject score (0) → no_action', () => {
    const score = computeMatchScore(glenfarclas15, glenfarclas25);
    expect(routeMatchDecision(score).action).toBe('no_action');
  });
});

// ─── normalizeName ────────────────────────────────────────────────────────────

describe('normalizeName', () => {
  it('lowercases input', () => {
    expect(normalizeName('GLENFARCLAS 15')).toBe('glenfarclas 15');
  });

  it('strips stop words: year, old, single, malt, scotch, whisky', () => {
    const n = normalizeName('Glenfarclas 15 Year Old Single Malt Scotch Whisky');
    expect(n).not.toMatch(/\byear\b/);
    expect(n).not.toMatch(/\bold\b/);
    expect(n).not.toMatch(/\bsingle\b/);
    expect(n).toContain('glenfarclas');
    expect(n).toContain('15');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeName('glen   farclas  15')).not.toContain('  ');
  });
});

// ─── DATA-02 locked threshold constants ───────────────────────────────────────

describe('DATA-02 locked thresholds', () => {
  it('AUTO_MERGE_THRESHOLD is exactly 0.90', () => {
    expect(AUTO_MERGE_THRESHOLD).toBe(0.90);
  });

  it('REVIEW_QUEUE_THRESHOLD is exactly 0.70', () => {
    expect(REVIEW_QUEUE_THRESHOLD).toBe(0.70);
  });

  it('REVIEW_QUEUE_THRESHOLD < AUTO_MERGE_THRESHOLD', () => {
    expect(REVIEW_QUEUE_THRESHOLD).toBeLessThan(AUTO_MERGE_THRESHOLD);
  });
});
