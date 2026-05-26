/**
 * normalizer.ts — Token expansion + field extraction for WhiskyHunter.
 *
 * DATA-02 prerequisite: expands numeral words and Roman numerals to digits
 * BEFORE entity resolution sees the name, preventing false age-matching
 * failures (Pitfall 3: "Glenfarclas Fifteen" ≠ "Glenfarclas 15" without this).
 *
 * Exports:
 *   expandNumeralWords(input)  — replaces 'Fifteen' → '15', 'XV' → '15'
 *   extractAge(name)           — finds age in years from expanded name
 *   extractVolume(name)        — finds volume in ml
 *   extractAbv(name)           — finds ABV percentage
 *   normalize(raw, overrides?) — full pipeline: expand → extract → classify
 *
 * Added: שדרוג 25526 (2026-05-25)
 */

import type { RawProduct } from '@whisky-hunter/shared';
import type { NormalizedProduct } from '@whisky-hunter/shared';

// ─── Numeral word tables ──────────────────────────────────────────────────────
// Sorted longest-first so compound words ('twenty-five') replace before
// simple words ('twenty', 'five') can corrupt them.

const WORD_TO_NUM: Record<string, number> = {
  'twenty-one': 21, 'twenty-two': 22, 'twenty-three': 23, 'twenty-four': 24,
  'twenty-five': 25, 'twenty-six': 26, 'twenty-seven': 27, 'twenty-eight': 28,
  'twenty-nine': 29, 'thirty-five': 35, 'forty-five': 45,
  seventeen: 17, eighteen: 18, nineteen: 19, fourteen: 14, thirteen: 13,
  fifteen: 15, sixteen: 16, eleven: 11, twelve: 12, twenty: 20, thirty: 30,
  forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10,
};

const ROMAN_TO_NUM: Record<string, number> = {
  // Longest patterns first to avoid partial matches
  XVIII: 18, XVII: 17, XXVII: 27, XXVI: 26, XXIII: 23, XXII: 22, VIII: 8,
  XIII: 13, XIV: 14, XIX: 19, XVI: 16, XII: 12, XXI: 21, XXV: 25, XXX: 30,
  XL: 40, XI: 11, XV: 15, XX: 20, IV: 4, IX: 9, VI: 6, VII: 7, III: 3,
  II: 2, I: 1, V: 5, X: 10,
};

/**
 * Replace English numeral words and Roman numerals with decimal digits.
 *
 * Examples:
 *   'Glenfarclas Fifteen Year Old'  → 'Glenfarclas 15 Year Old'
 *   'Aged Twenty-Five Years'        → 'Aged 25 Years'
 *   'Whisky XV'                     → 'Whisky 15'
 *   'Macallan 18'                   → 'Macallan 18'  (unchanged)
 *
 * Note: Roman numerals are matched case-sensitively (all-caps) to avoid
 * false positives on distillery names like "Macallan" (contains 'I').
 */
export function expandNumeralWords(input: string): string {
  let s = input;

  // Replace English numeral words (longest first to handle compounds correctly)
  for (const [word, num] of Object.entries(WORD_TO_NUM).sort(
    ([a], [b]) => b.length - a.length,
  )) {
    s = s.replace(new RegExp(`\\b${word}\\b`, 'gi'), String(num));
  }

  // Replace standalone Roman numerals: whole-word, all-uppercase, not part of
  // a longer Roman numeral (longest patterns already in ROMAN_TO_NUM above).
  for (const [roman, num] of Object.entries(ROMAN_TO_NUM)) {
    // Match Roman numeral bounded by non-uppercase-letter on each side.
    // This prevents 'XVIII' being partially matched by 'I', 'II', 'III', etc.
    s = s.replace(
      new RegExp(`(?<![A-Z])${roman}(?![A-Z])`, 'g'),
      String(num),
    );
  }

  return s;
}

/**
 * Extract integer age in years from a product name.
 * Runs numeral expansion first so 'Fifteen Year Old' resolves correctly.
 * Returns null for NAS (no age statement) products.
 */
export function extractAge(name: string): number | null {
  const expanded = expandNumeralWords(name);
  // Matches: "15 Year Old", "15yo", "15-Year-Old", "15yr", "aged 15", "15 y.o."
  const match = expanded.match(
    /\b(?:aged?\s+)?(\d{1,2})\s*(?:y(?:ear)?s?(?:[\s-]*old)?|yo|y\.o\.)\b/i,
  );
  if (!match || !match[1]) return null;
  const age = parseInt(match[1], 10);
  return age >= 1 && age <= 100 ? age : null;
}

/**
 * Extract volume in ml from a product name string.
 * Handles: '700ml', '70cl', '1L', '1.75L'.
 * Returns 700 (standard bottle) when no volume is found.
 */
export function extractVolume(name: string): number {
  const mlMatch = name.match(/(\d+(?:\.\d+)?)\s*ml/i);
  if (mlMatch && mlMatch[1]) return Math.round(parseFloat(mlMatch[1]));

  const clMatch = name.match(/(\d+(?:\.\d+)?)\s*cl/i);
  if (clMatch && clMatch[1]) return Math.round(parseFloat(clMatch[1]) * 10);

  const lMatch = name.match(/(\d+(?:\.\d+)?)\s*[Ll](?:\s|$)/);
  if (lMatch && lMatch[1]) return Math.round(parseFloat(lMatch[1]) * 1000);

  return 700; // Default: standard 700ml bottle
}

/**
 * Extract ABV percentage from a product name string.
 * Returns null when not found, to distinguish from a parsed 0 value.
 * Validates range [20, 96] — outside is likely a parse error.
 */
export function extractAbv(name: string): number | null {
  const match = name.match(/(\d{2,3}(?:\.\d)?)\s*%/);
  if (!match || !match[1]) return null;
  const abv = parseFloat(match[1]);
  return abv >= 20 && abv <= 96 ? abv : null;
}

// ─── Category inference ───────────────────────────────────────────────────────

function inferCategory(name: string): NormalizedProduct['category'] {
  const n = name.toLowerCase();
  if (n.includes('bourbon') || n.includes('kentucky') || n.includes('tennessee')) return 'bourbon';
  if (n.includes('rye')) return 'rye';
  if (n.includes('irish')) return 'irish';
  if (
    n.includes('japanese') || n.includes('japan') ||
    n.includes('yamazaki') || n.includes('nikka') ||
    n.includes('hibiki') || n.includes('hakushu')
  ) return 'japanese';
  if (n.includes('single malt')) return 'scotch_single_malt';
  if (n.includes('blended')) return 'scotch_blended';
  return 'other';
}

// ─── Distillery name inference ────────────────────────────────────────────────

const TWO_WORD_DISTILLERIES = [
  'highland park', 'caol ila', 'glen garioch', 'ben nevis', 'old forester',
  'jack daniels', "jack daniel's", 'knob creek', 'makers mark', "maker's mark",
  'glen moray', 'glen grant', 'glen scotia', 'loch lomond',
];

function inferDistillery(name: string): string {
  const lower = name.toLowerCase();
  for (const d of TWO_WORD_DISTILLERIES) {
    if (lower.startsWith(d)) {
      return d.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }
  const words = name.trim().split(/\s+/);
  return words[0] ?? 'Unknown';
}

// ─── NormalizedForResolver helper type ───────────────────────────────────────
// Used as the intermediary between normalize() output and computeMatchScore().

export interface NormalizedForResolver {
  name: string;
  distillery: string;
  ageYears: number | null;
  volumeMl: number;
  abv: number | null;
  category: NormalizedProduct['category'];
  region: string | null;
  caskType: string | null;
}

/**
 * Full normalisation pipeline: expand numeral words → extract fields → classify.
 *
 * @param raw      - Validated RawProduct from adapter (already Zod-parsed)
 * @param overrides - Optional overrides from Whiskybase or manual enrichment
 * @returns NormalizedForResolver ready for computeMatchScore()
 */
export function normalize(
  raw: RawProduct,
  overrides?: { distillery?: string; region?: string; caskType?: string },
): NormalizedForResolver {
  return {
    name:       raw.name.trim(),
    distillery: overrides?.distillery ?? inferDistillery(raw.name),
    ageYears:   extractAge(raw.name),
    volumeMl:   raw.volumeMl ?? extractVolume(raw.name),
    abv:        raw.abv ?? extractAbv(raw.name),
    category:   inferCategory(raw.name),
    region:     overrides?.region ?? null,
    caskType:   overrides?.caskType ?? null,
  };
}
