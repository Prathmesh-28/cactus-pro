/**
 * Money parsing & formatting — all amounts in the app are stored as display
 * strings like "₹835Cr", "₹5.29Cr", "₹43L", "1200" (bare = Cr). This centralises
 * the parsing logic that was previously duplicated across CapitalCallTracker,
 * FundClosingTracker and chatbot.ts.
 *
 * Canonical unit: ₹ Crore (1 Cr = 10,000,000 = 100 Lakh).
 */

/** Parse a money string into a number of ₹ Crore. Returns 0 for empty/"—". */
export function parseCr(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  if (!val || val.trim() === '' || val.trim() === '—') return 0;
  // Drop parenthetical notes, ₹ symbol, commas, whitespace.
  const clean = val.replace(/\(.*?\)/g, '').replace(/[₹,\s]/g, '');
  const neg = clean.startsWith('-');
  const abs = clean.replace(/^-/, '');
  const num = parseFloat(abs) || 0;
  const sign = neg ? -1 : 1;
  if (/Cr/i.test(abs)) return sign * num;
  if (/L/i.test(abs)) return sign * (num / 100); // Lakh → Cr
  return sign * num; // bare number = already in Cr
}

/** Format a ₹ Crore value back to a display string, auto-switching to Lakh below 1 Cr. */
export function formatCr(cr: number, opts: { decimals?: number } = {}): string {
  const decimals = opts.decimals ?? 2;
  if (!Number.isFinite(cr)) return '—';
  if (cr === 0) return '₹0';
  const neg = cr < 0;
  const abs = Math.abs(cr);
  const sign = neg ? '-' : '';
  if (abs < 1) return `${sign}₹${(abs * 100).toFixed(decimals)}L`;
  return `${sign}₹${abs.toFixed(decimals)}Cr`;
}

/** Format a multiple like 2.34 → "2.34x". */
export function formatMultiple(x: number, decimals = 2): string {
  if (!Number.isFinite(x)) return '—';
  return `${x.toFixed(decimals)}x`;
}

/** Format a fraction (0.184) as a percentage string ("18.4%"). */
export function formatPct(fraction: number, decimals = 1): string {
  if (!Number.isFinite(fraction)) return '—';
  return `${(fraction * 100).toFixed(decimals)}%`;
}
