/**
 * Name normalizer — strips noise from scraped product names before fuzzy matching.
 *
 * Scraped names from different retailers vary wildly:
 *   "Glenfiddich 12 Year Old Single Malt Scotch Whisky 70cl / 40%"
 *   "GLENFIDDICH 12YO 700ml"
 *   "Glenfiddich - 12 Years Old (70cl, 40%)"
 *
 * Goal: reduce to a canonical token set for reliable comparison.
 */

/** Noise words that carry no product identity signal */
const NOISE_WORDS = new Set([
  'single', 'malt', 'scotch', 'whisky', 'whiskey', 'old', 'year', 'years',
  'aged', 'yo', 'y/o', 'limited', 'edition', 'special', 'release', 'bottling',
  'distillery', 'distillers', 'original', 'collection', 'reserve', 'select',
  'natural', 'strength', 'cask', 'barrel', 'oak', 'finish', 'finished',
  'expression', 'bottled', 'and', 'the', 'of', 'in', 'a', 'an',
]);

/** Volume/ABV patterns to strip from names before comparison */
const VOLUME_RE = /\b\d+\s*(?:cl|ml|l)\b/gi;
// No trailing \b — % is a non-word char so \b never fires after it
const ABV_RE = /\b\d+(?:\.\d+)?\s*%(?:\s*abv)?/gi;
const YEAR_SUFFIX_RE = /\b(\d{1,2})\s*(?:year|yr|yo|y\/o)s?\b/gi;
const SPECIAL_CHARS_RE = /[()[\]{}/\\|,.'"-]/g;
const MULTI_SPACE_RE = /\s{2,}/g;

export interface ParsedName {
  /** Normalised name for fuzzy matching */
  normalized: string;
  /** Extracted age in years (null if not found) */
  ageYears: number | null;
  /** Extracted volume in ml (null if not parsed from name) */
  volumeMl: number | null;
  /** Extracted ABV percentage (null if not parsed from name) */
  abv: number | null;
}

/**
 * Normalize a scraped product name for fuzzy comparison.
 * Also extracts structured fields when present in the name string.
 */
export function parseName(raw: string): ParsedName {
  let text = raw.toLowerCase().trim();

  // Extract volume from name (e.g. "70cl", "700ml")
  let volumeMl: number | null = null;
  text = text.replace(VOLUME_RE, (match) => {
    const n = parseFloat(match);
    if (/cl/i.test(match)) volumeMl = Math.round(n * 10);
    else if (/ml/i.test(match)) volumeMl = Math.round(n);
    else if (/\bl\b/i.test(match)) volumeMl = Math.round(n * 1000);
    return ' ';
  });

  // Extract ABV
  let abv: number | null = null;
  text = text.replace(ABV_RE, (match) => {
    abv = parseFloat(match);
    return ' ';
  });

  // Extract age (e.g. "12 year", "18yo", "21 y/o") and keep the number
  let ageYears: number | null = null;
  text = text.replace(YEAR_SUFFIX_RE, (_, num: string) => {
    ageYears = parseInt(num, 10);
    return ` ${num} `; // keep the numeric age in the normalized string
  });

  // Strip special characters
  text = text.replace(SPECIAL_CHARS_RE, ' ');

  // Remove noise words
  const tokens = text
    .split(/\s+/)
    .filter((t) => t.length > 0 && !NOISE_WORDS.has(t));

  const normalized = tokens.join(' ').replace(MULTI_SPACE_RE, ' ').trim();

  return { normalized, ageYears, volumeMl, abv };
}

/**
 * Canonical token sort — makes token order irrelevant for comparison.
 * "Macallan 12" and "12 Macallan" collapse to the same key.
 */
export function sortedTokens(normalized: string): string {
  return normalized.split(' ').sort().join(' ');
}
