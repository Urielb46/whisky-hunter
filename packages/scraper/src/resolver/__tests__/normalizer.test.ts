import { describe, it, expect } from 'vitest';
import { parseName, sortedTokens } from '../normalizer.js';

describe('parseName', () => {
  it('extracts age from "12 Year Old"', () => {
    const { ageYears } = parseName('Glenfiddich 12 Year Old Single Malt');
    expect(ageYears).toBe(12);
  });

  it('extracts volume from "70cl"', () => {
    const { volumeMl } = parseName('Macallan 18 70cl');
    expect(volumeMl).toBe(700);
  });

  it('extracts volume from "700ml"', () => {
    const { volumeMl } = parseName('Ardbeg 10 700ml');
    expect(volumeMl).toBe(700);
  });

  it('extracts ABV', () => {
    const { abv } = parseName('Lagavulin 16 43% ABV');
    expect(abv).toBe(43);
  });

  it('strips noise words', () => {
    const { normalized } = parseName('Glenfiddich 12 Year Old Single Malt Scotch Whisky');
    expect(normalized).not.toContain('single');
    expect(normalized).not.toContain('malt');
    expect(normalized).not.toContain('scotch');
    expect(normalized).not.toContain('whisky');
    expect(normalized).toContain('glenfiddich');
    expect(normalized).toContain('12');
  });

  it('strips special characters', () => {
    const { normalized } = parseName('Macallan (12) - Double Cask');
    expect(normalized).not.toContain('(');
    expect(normalized).not.toContain('-');
  });

  it('handles YO shorthand', () => {
    const { ageYears } = parseName('Glenlivet 18YO');
    expect(ageYears).toBe(18);
  });
});

describe('sortedTokens', () => {
  it('sorts tokens alphabetically', () => {
    expect(sortedTokens('macallan 12')).toBe('12 macallan');
    expect(sortedTokens('12 macallan')).toBe('12 macallan');
  });

  it('makes token order irrelevant', () => {
    const a = sortedTokens('glenfiddich 12 speyside');
    const b = sortedTokens('speyside glenfiddich 12');
    expect(a).toBe(b);
  });
});
