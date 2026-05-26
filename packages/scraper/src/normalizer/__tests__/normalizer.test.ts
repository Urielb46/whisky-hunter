import { describe, it, expect } from 'vitest';
import {
  expandNumeralWords,
  extractAge,
  extractVolume,
  extractAbv,
} from '../normalizer.js';

// ─── expandNumeralWords ───────────────────────────────────────────────────────

describe('expandNumeralWords', () => {
  it('expands Fifteen → 15', () => {
    const result = expandNumeralWords('Glenfarclas Fifteen Year Old');
    expect(result).toContain('15');
    expect(result).not.toMatch(/\bFifteen\b/i);
  });

  it('expands Twenty-Five → 25', () => {
    const result = expandNumeralWords('Aged Twenty-Five Years');
    expect(result).toContain('25');
    expect(result).not.toMatch(/\btwenty-five\b/i);
  });

  it('expands Roman numeral XV → 15', () => {
    const result = expandNumeralWords('Whisky XV');
    expect(result).toContain('15');
  });

  it('expands Roman numeral XVIII → 18', () => {
    const result = expandNumeralWords('Macallan XVIII');
    expect(result).toContain('18');
  });

  it('leaves existing digits unchanged', () => {
    expect(expandNumeralWords('Macallan 18')).toBe('Macallan 18');
  });

  it('expands compound twenty-one → 21', () => {
    const result = expandNumeralWords('Twenty-One Year Old');
    expect(result).toContain('21');
  });

  it('handles mixed case (case-insensitive for words)', () => {
    expect(expandNumeralWords('EIGHTEEN')).toContain('18');
    expect(expandNumeralWords('eighteen')).toContain('18');
  });
});

// ─── extractAge ───────────────────────────────────────────────────────────────

describe('extractAge', () => {
  it('extracts age from "15 Year Old"', () => {
    expect(extractAge('Glenfarclas 15 Year Old')).toBe(15);
  });

  it('extracts age from word form "Fifteen Year Old" (via numeral expansion)', () => {
    expect(extractAge('Glenfarclas Fifteen Year Old')).toBe(15);
  });

  it('extracts age from Roman numeral "XV" form (via numeral expansion)', () => {
    expect(extractAge('Glenfarclas XV Year Old')).toBe(15);
  });

  it('returns null for NAS products (Ardbeg Uigeadail)', () => {
    expect(extractAge('Ardbeg Uigeadail')).toBeNull();
  });

  it('extracts age from "18yo" shorthand', () => {
    expect(extractAge('Macallan 18yo')).toBe(18);
  });

  it('extracts age from "aged 12" pattern', () => {
    expect(extractAge('Aged 12 Years')).toBe(12);
  });

  it('extracts age from "12-Year-Old" hyphenated form', () => {
    expect(extractAge('Glenfiddich 12-Year-Old')).toBe(12);
  });

  it('returns null for unrealistic ages > 100', () => {
    expect(extractAge('Distillery 150 Anniversary')).toBeNull();
  });
});

// ─── extractVolume ────────────────────────────────────────────────────────────

describe('extractVolume', () => {
  it('extracts 700 from "700ml"', () => {
    expect(extractVolume('Glenfarclas 15 700ml')).toBe(700);
  });

  it('extracts 700 from "70cl"', () => {
    expect(extractVolume('Ardbeg 10 70cl')).toBe(700);
  });

  it('extracts 1000 from "1L"', () => {
    expect(extractVolume('Jameson 18 1L')).toBe(1000);
  });

  it('extracts 1750 from "1.75L"', () => {
    expect(extractVolume('Bulleit Bourbon 1.75L')).toBe(1750);
  });

  it('defaults to 700 when no volume is in the name', () => {
    expect(extractVolume('Highland Park 18 Year Old')).toBe(700);
  });

  it('extracts 500 from "50cl"', () => {
    expect(extractVolume('Miniature 50cl')).toBe(500);
  });
});

// ─── extractAbv ───────────────────────────────────────────────────────────────

describe('extractAbv', () => {
  it('extracts ABV from "46%"', () => {
    expect(extractAbv('Glenfarclas 15 46%')).toBe(46);
  });

  it('extracts ABV with decimal "43.0%"', () => {
    expect(extractAbv('Lagavulin 16 43.0%')).toBe(43);
  });

  it('returns null when no ABV is present', () => {
    expect(extractAbv('Macallan 18 Year Old')).toBeNull();
  });

  it('returns null for out-of-range value like 100%', () => {
    expect(extractAbv('Something 100%')).toBeNull();
  });

  it('extracts cask-strength ABV like 58.1%', () => {
    expect(extractAbv('Glenfarclas 105 60%')).toBe(60);
  });
});
