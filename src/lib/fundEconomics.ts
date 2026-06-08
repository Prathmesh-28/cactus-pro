/**
 * Fund-level economics — pure functions, fully unit-tested.
 *
 * Covers the standard LP/GP performance metrics (DPI / RVPI / TVPI / gross
 * MOIC), dated-cashflow IRR (XIRR via Newton-Raphson), a European whole-fund
 * carried-interest waterfall, and J-curve cumulative-cashflow generation.
 */

// ─── Dated cashflows ──────────────────────────────────────────────────────────

export interface CashFlow {
  /** ISO date (YYYY-MM-DD) or anything Date can parse. */
  date: string | Date;
  /** Negative = money out (LP contribution), positive = money in (distribution). */
  amount: number;
}

function toTime(d: string | Date): number {
  return (d instanceof Date ? d : new Date(d)).getTime();
}

const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000;

/**
 * Internal rate of return for irregularly-spaced dated cashflows (annualised),
 * solved with Newton-Raphson and a bisection fallback. Returns NaN if there is
 * no sign change (IRR undefined) or it fails to converge.
 */
export function xirr(flows: CashFlow[], guess = 0.1): number {
  if (flows.length < 2) return NaN;
  const sorted = [...flows].sort((a, b) => toTime(a.date) - toTime(b.date));
  const t0 = toTime(sorted[0].date);
  const years = sorted.map((f) => (toTime(f.date) - t0) / MS_PER_YEAR);
  const amts = sorted.map((f) => f.amount);

  const hasPos = amts.some((a) => a > 0);
  const hasNeg = amts.some((a) => a < 0);
  if (!hasPos || !hasNeg) return NaN;

  const npv = (rate: number) =>
    amts.reduce((s, a, i) => s + a / Math.pow(1 + rate, years[i]), 0);
  const dNpv = (rate: number) =>
    amts.reduce((s, a, i) => s - (years[i] * a) / Math.pow(1 + rate, years[i] + 1), 0);

  // Newton-Raphson
  let rate = guess;
  for (let i = 0; i < 100; i++) {
    const f = npv(rate);
    const df = dNpv(rate);
    if (Math.abs(f) < 1e-7) return rate;
    if (df === 0) break;
    const next = rate - f / df;
    if (!Number.isFinite(next)) break;
    if (Math.abs(next - rate) < 1e-9) return next;
    rate = next <= -0.999999 ? (rate - 0.999999) / 2 : next;
  }

  // Bisection fallback over a wide bracket.
  let lo = -0.9999;
  let hi = 100;
  let fLo = npv(lo);
  let fHi = npv(hi);
  if (fLo * fHi > 0) return NaN;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    const fMid = npv(mid);
    if (Math.abs(fMid) < 1e-7) return mid;
    if (fLo * fMid < 0) {
      hi = mid;
      fHi = fMid;
    } else {
      lo = mid;
      fLo = fMid;
    }
  }
  return (lo + hi) / 2;
}

// ─── Fund multiples ─────────────────────────────────────────────────────────

export interface FundMultiplesInput {
  /** Capital actually called/contributed by LPs (paid-in capital). */
  paidIn: number;
  /** Cumulative cash distributed back to LPs. */
  distributions: number;
  /** Residual value — current FMV of unrealised holdings (NAV). */
  nav: number;
}

export interface FundMultiples {
  dpi: number; // Distributions to Paid-In (realised)
  rvpi: number; // Residual Value to Paid-In (unrealised)
  tvpi: number; // Total Value to Paid-In (= dpi + rvpi)
  totalValue: number; // distributions + nav
}

export function fundMultiples({ paidIn, distributions, nav }: FundMultiplesInput): FundMultiples {
  const dpi = paidIn > 0 ? distributions / paidIn : 0;
  const rvpi = paidIn > 0 ? nav / paidIn : 0;
  return { dpi, rvpi, tvpi: dpi + rvpi, totalValue: distributions + nav };
}

// ─── European whole-fund carry waterfall ───────────────────────────────────

export interface WaterfallInput {
  /** LP contributed capital (cost basis). */
  contributed: number;
  /** Total realised + unrealised value available to distribute. */
  totalValue: number;
  /** Annual preferred return / hurdle (default 8%). */
  hurdleRate?: number;
  /** Holding period in years for compounding the preferred return (default 1). */
  years?: number;
  /** GP carried interest fraction (default 20%). */
  carryPct?: number;
  /** Whether the GP gets a 100% catch-up after the preferred return (default true). */
  gpCatchUp?: boolean;
}

export interface WaterfallResult {
  profit: number;
  /** Tier 1 — return of LP capital. */
  returnOfCapital: number;
  /** Tier 2 — LP preferred return. */
  preferredReturn: number;
  /** Tier 3 — GP catch-up. */
  gpCatchUp: number;
  /** Tier 4 — residual carry split. */
  carrySplit: { lp: number; gp: number };
  lpTotal: number;
  gpTotal: number;
  /** GP's share of total value as a fraction. */
  gpSharePct: number;
}

export function europeanWaterfall(input: WaterfallInput): WaterfallResult {
  const { contributed, totalValue } = input;
  const hurdleRate = input.hurdleRate ?? 0.08;
  const years = input.years ?? 1;
  const carryPct = input.carryPct ?? 0.2;
  const gpCatchUp = input.gpCatchUp ?? true;

  let pool = Math.max(0, totalValue);

  // Tier 1: return of capital to LPs.
  const returnOfCapital = Math.min(pool, contributed);
  pool -= returnOfCapital;

  // Tier 2: preferred return (compounded) to LPs.
  const prefTarget = contributed * (Math.pow(1 + hurdleRate, years) - 1);
  const preferredReturn = Math.min(pool, prefTarget);
  pool -= preferredReturn;

  // Tier 3: GP catch-up — GP receives 100% until it holds carryPct of (pref + catchup).
  let catchUp = 0;
  if (gpCatchUp && carryPct > 0 && carryPct < 1) {
    const catchUpTarget = (carryPct / (1 - carryPct)) * preferredReturn;
    catchUp = Math.min(pool, catchUpTarget);
    pool -= catchUp;
  }

  // Tier 4: split the remainder.
  const gpCarry = pool * carryPct;
  const lpCarry = pool * (1 - carryPct);

  const lpTotal = returnOfCapital + preferredReturn + lpCarry;
  const gpTotal = catchUp + gpCarry;

  return {
    profit: totalValue - contributed,
    returnOfCapital,
    preferredReturn,
    gpCatchUp: catchUp,
    carrySplit: { lp: lpCarry, gp: gpCarry },
    lpTotal,
    gpTotal,
    gpSharePct: totalValue > 0 ? gpTotal / totalValue : 0,
  };
}

// ─── J-curve ────────────────────────────────────────────────────────────────

export interface JCurvePoint {
  date: string;
  /** Net cashflow on this date. */
  net: number;
  /** Cumulative net cashflow up to and including this date. */
  cumulative: number;
}

/**
 * Build the cumulative net-cashflow series (the "J-curve"): contributions pull
 * the line negative early, distributions pull it back up. Optionally append the
 * current NAV as an unrealised mark on the final date.
 */
export function jCurve(flows: CashFlow[], navToday?: { date: string; nav: number }): JCurvePoint[] {
  const sorted = [...flows].sort((a, b) => toTime(a.date) - toTime(b.date));
  const points: JCurvePoint[] = [];
  let cumulative = 0;
  for (const f of sorted) {
    cumulative += f.amount;
    const date = (f.date instanceof Date ? f.date.toISOString().slice(0, 10) : f.date);
    points.push({ date, net: f.amount, cumulative });
  }
  if (navToday) {
    points.push({
      date: navToday.date,
      net: navToday.nav,
      cumulative: cumulative + navToday.nav,
    });
  }
  return points;
}
