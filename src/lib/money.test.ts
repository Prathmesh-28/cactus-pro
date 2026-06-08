import { describe, it, expect } from 'vitest';
import { parseCr, formatCr, formatMultiple, formatPct } from './money';

describe('parseCr', () => {
  it('parses crore strings', () => {
    expect(parseCr('₹835Cr')).toBe(835);
    expect(parseCr('126Cr')).toBe(126);
    expect(parseCr('₹1,200Cr')).toBe(1200);
  });

  it('converts lakh to crore', () => {
    expect(parseCr('₹43L')).toBeCloseTo(0.43);
    expect(parseCr('₹529L')).toBeCloseTo(5.29);
  });

  it('treats a bare number as crore', () => {
    expect(parseCr('640')).toBe(640);
  });

  it('handles negatives and parenthetical notes', () => {
    expect(parseCr('-₹12Cr')).toBe(-12);
    expect(parseCr('₹50Cr (FY25)')).toBe(50);
  });

  it('returns 0 for empty/dash/nullish', () => {
    expect(parseCr('')).toBe(0);
    expect(parseCr('—')).toBe(0);
    expect(parseCr(null)).toBe(0);
    expect(parseCr(undefined)).toBe(0);
  });

  it('passes through finite numbers', () => {
    expect(parseCr(42)).toBe(42);
    expect(parseCr(NaN)).toBe(0);
  });
});

describe('formatCr', () => {
  it('formats crore', () => {
    expect(formatCr(835)).toBe('₹835.00Cr');
  });
  it('switches to lakh below 1 crore', () => {
    expect(formatCr(0.43)).toBe('₹43.00L');
  });
  it('handles zero and negatives', () => {
    expect(formatCr(0)).toBe('₹0');
    expect(formatCr(-12)).toBe('-₹12.00Cr');
  });
});

describe('formatMultiple & formatPct', () => {
  it('formats multiples', () => {
    expect(formatMultiple(2.345)).toBe('2.35x');
  });
  it('formats percentages from fractions', () => {
    expect(formatPct(0.184)).toBe('18.4%');
  });
});
