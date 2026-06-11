import { describe, it, expect } from 'vitest';
import { parseQuarter, normalizeQuarter, quarterSortKey, sameQuarter, currentQuarter, lastQuarters } from './quarter';

describe('parseQuarter', () => {
  it('parses calendar "Q2 2026"', () => {
    expect(parseQuarter('Q2 2026')).toEqual({ q: 2, year: 2026 });
  });
  it('parses fiscal "FY2026-Q1" → CY Q2 2025 (Apr–Jun 2025)', () => {
    expect(parseQuarter('FY2026-Q1')).toEqual({ q: 2, year: 2025 });
  });
  it('parses fiscal "FY2026-Q4" → CY Q1 2026 (Jan–Mar 2026)', () => {
    expect(parseQuarter('FY2026-Q4')).toEqual({ q: 1, year: 2026 });
  });
  it('parses "Q4 FY25" two-digit fiscal year', () => {
    expect(parseQuarter('Q4 FY25')).toEqual({ q: 1, year: 2025 });
  });
  it('parses "2026-Q3"', () => {
    expect(parseQuarter('2026-Q3')).toEqual({ q: 3, year: 2026 });
  });
  it('returns null for junk', () => {
    expect(parseQuarter('not a quarter')).toBeNull();
    expect(parseQuarter('')).toBeNull();
    expect(parseQuarter(undefined)).toBeNull();
  });
});

describe('normalizeQuarter', () => {
  it('canonicalises all formats to "Qn YYYY"', () => {
    expect(normalizeQuarter('FY2026-Q1')).toBe('Q2 2025');
    expect(normalizeQuarter('Q2 2025')).toBe('Q2 2025');
  });
  it('leaves unrecognised strings unchanged (never destroys data)', () => {
    expect(normalizeQuarter('weird')).toBe('weird');
  });
});

describe('sameQuarter / quarterSortKey', () => {
  it('matches the same period across formats', () => {
    expect(sameQuarter('FY2026-Q1', 'Q2 2025')).toBe(true);
    expect(sameQuarter('Q2 2026', 'Q3 2026')).toBe(false);
  });
  it('unknown never equals unknown', () => {
    expect(sameQuarter('junk', 'junk')).toBe(false);
  });
  it('sorts chronologically', () => {
    const xs = ['Q1 2026', 'Q3 2025', 'Q2 2026'];
    expect([...xs].sort((a, b) => quarterSortKey(a) - quarterSortKey(b)))
      .toEqual(['Q3 2025', 'Q1 2026', 'Q2 2026']);
  });
});

describe('currentQuarter / lastQuarters', () => {
  it('currentQuarter uses calendar quarter', () => {
    expect(currentQuarter(new Date('2026-05-15'))).toBe('Q2 2026');
    expect(currentQuarter(new Date('2026-01-02'))).toBe('Q1 2026');
  });
  it('lastQuarters returns N quarters ending at current, newest last', () => {
    expect(lastQuarters('Q2 2026', 4)).toEqual(['Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026']);
  });
});
