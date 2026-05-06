import { describe, it, expect } from 'vitest';
import { matchProduct, AUTO_ACCEPT_THRESHOLD, REVIEW_THRESHOLD } from '../fuzzy-match.js';
import type { MatchCandidate } from '../fuzzy-match.js';

const CANDIDATES: MatchCandidate[] = [
  { id: 'g12', name: 'Glenfiddich 12', distillery: 'Glenfiddich', ageYears: 12, volumeMl: 700 },
  { id: 'g18', name: 'Glenfiddich 18', distillery: 'Glenfiddich', ageYears: 18, volumeMl: 700 },
  { id: 'm12', name: 'Macallan 12', distillery: 'Macallan', ageYears: 12, volumeMl: 700 },
  { id: 'lag16', name: 'Lagavulin 16', distillery: 'Lagavulin', ageYears: 16, volumeMl: 700 },
];

describe('matchProduct', () => {
  it('exact match after noise stripping', () => {
    // "Single Malt Scotch Whisky" are noise words → stripped → same tokens as candidate
    const result = matchProduct('Glenfiddich 12 Single Malt Scotch Whisky', CANDIDATES);
    expect(result.candidateId).toBe('g12');
    expect(result.score).toBeGreaterThanOrEqual(AUTO_ACCEPT_THRESHOLD);
  });

  it('noisy name with volume/ABV still matches', () => {
    const result = matchProduct(
      'Glenfiddich 12 Year Old Single Malt Scotch Whisky 70cl 40%',
      CANDIDATES,
    );
    expect(result.candidateId).toBe('g12');
    expect(result.score).toBeGreaterThanOrEqual(AUTO_ACCEPT_THRESHOLD);
  });

  it('age distinguishes products — 18 does not match 12', () => {
    const result = matchProduct('Glenfiddich 18 Year Old', CANDIDATES);
    expect(result.candidateId).toBe('g18');
    expect(result.score).toBeGreaterThan(result.score - 0.01); // just verify it picks g18
  });

  it('completely different spirit does not auto-accept', () => {
    const result = matchProduct("Hendrick's Gin 70cl", CANDIDATES);
    expect(result.score).toBeLessThan(AUTO_ACCEPT_THRESHOLD);
  });

  it('returns none when no candidates', () => {
    const result = matchProduct('Macallan 12', []);
    expect(result.method).toBe('none');
    expect(result.score).toBe(0);
  });

  it('below review threshold for garbage input', () => {
    const result = matchProduct('aaaa bbbbb ccccc ddddd', CANDIDATES);
    expect(result.score).toBeLessThan(REVIEW_THRESHOLD);
  });
});
