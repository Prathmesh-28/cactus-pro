/**
 * Canonical quarter handling.
 *
 * The app historically wrote THREE incompatible quarter strings to the same fields
 * (companyHealth.quarter, valuationMarks.quarter):
 *   - "Q2 2026"      (HealthDashboard — calendar quarter)
 *   - "FY2026-Q1"    (PortfolioAdmin — Indian fiscal quarter)
 *   - "Q4 FY25"      (CSV template hint)
 * Because joins/sorts compared the raw strings, reviews saved on one screen never
 * matched on another, and sorts broke. This module is the single source of truth:
 * parse any legacy shape, format to ONE canonical string, and compare by a numeric key.
 *
 * Canonical display format: "Q<n> <calendarYear>"  e.g. "Q2 2026".
 * We standardise on the CALENDAR quarter because the Health Dashboard (the join hub)
 * already uses it and it sorts naturally for users.
 */

export interface ParsedQuarter {
  q: 1 | 2 | 3 | 4;
  year: number; // calendar year
}

// Map an Indian fiscal quarter (FY year + FY quarter) to a calendar quarter.
// Indian FY: Q1=Apr–Jun(N-1), Q2=Jul–Sep(N-1), Q3=Oct–Dec(N-1), Q4=Jan–Mar(N)
// where FY label "FY2026" spans Apr-2025 → Mar-2026.
function fyToCalendar(fyYear: number, fyQ: number): ParsedQuarter {
  switch (fyQ) {
    case 1: return { q: 2, year: fyYear - 1 }; // Apr–Jun → CY Q2
    case 2: return { q: 3, year: fyYear - 1 }; // Jul–Sep → CY Q3
    case 3: return { q: 4, year: fyYear - 1 }; // Oct–Dec → CY Q4
    case 4: return { q: 1, year: fyYear };     // Jan–Mar → CY Q1
    default: return { q: 1, year: fyYear };
  }
}

/** Parse any of the legacy quarter shapes into a calendar {q, year}, or null. */
export function parseQuarter(raw: string | null | undefined): ParsedQuarter | null {
  if (!raw) return null;
  const s = String(raw).trim();

  // "FY2026-Q1" or "FY2026 Q1" (Indian fiscal)
  let m = s.match(/^FY\s*(\d{2,4})\s*[-\s]\s*Q([1-4])$/i);
  if (m) {
    let fy = parseInt(m[1], 10);
    if (fy < 100) fy += 2000;
    return fyToCalendar(fy, parseInt(m[2], 10));
  }

  // "Q4 FY25" / "Q4 FY2025" (Indian fiscal, quarter-first)
  m = s.match(/^Q([1-4])\s*FY\s*(\d{2,4})$/i);
  if (m) {
    let fy = parseInt(m[2], 10);
    if (fy < 100) fy += 2000;
    return fyToCalendar(fy, parseInt(m[1], 10));
  }

  // "Q2 2026" / "Q2-2026" (calendar)
  m = s.match(/^Q([1-4])\s*[-\s]\s*(\d{4})$/i);
  if (m) return { q: parseInt(m[1], 10) as 1|2|3|4, year: parseInt(m[2], 10) };

  // "2026-Q2"
  m = s.match(/^(\d{4})\s*[-\s]\s*Q([1-4])$/i);
  if (m) return { q: parseInt(m[2], 10) as 1|2|3|4, year: parseInt(m[1], 10) };

  return null;
}

/** Canonical display string for a parsed quarter, e.g. "Q2 2026". */
export function formatQuarter(p: ParsedQuarter): string {
  return `Q${p.q} ${p.year}`;
}

/** Normalise any legacy quarter string to the canonical "Q2 2026" form.
 *  Unrecognised strings are returned unchanged (so we never destroy data). */
export function normalizeQuarter(raw: string | null | undefined): string {
  const p = parseQuarter(raw);
  return p ? formatQuarter(p) : String(raw ?? '');
}

/** Monotonic numeric sort key (year*4 + q). NaN-safe: unknown → -Infinity. */
export function quarterSortKey(raw: string | null | undefined): number {
  const p = parseQuarter(raw);
  return p ? p.year * 4 + p.q : -Infinity;
}

/** Two quarter strings refer to the same period regardless of format. */
export function sameQuarter(a: string | null | undefined, b: string | null | undefined): boolean {
  return quarterSortKey(a) === quarterSortKey(b) && quarterSortKey(a) !== -Infinity;
}

/** Current calendar quarter as the canonical string. Pass a Date for testability. */
export function currentQuarter(now: Date = new Date()): string {
  const q = (Math.floor(now.getMonth() / 3) + 1) as 1|2|3|4;
  return formatQuarter({ q, year: now.getFullYear() });
}

/** The `count` most-recent quarters ending at `current` (canonical strings), newest last. */
export function lastQuarters(current: string, count: number): string[] {
  const p = parseQuarter(current) ?? parseQuarter(currentQuarter())!;
  let key = p.year * 4 + (p.q - 1); // 0-based index
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const year = Math.floor(key / 4);
    const q = (key % 4) + 1;
    out.unshift(`Q${q} ${year}`);
    key -= 1;
  }
  return out;
}
