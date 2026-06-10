/**
 * Derives fund-level cashflows and aggregates from the store's FundInvestment
 * records, so the Fund Economics view runs on real portfolio data rather than
 * hand-entered numbers. Pure & unit-tested.
 */
import type { FundInvestment } from '../data/types';
import { parseCr } from './money';
import type { CashFlow } from './fundEconomics';

export interface DerivedFund {
  /** Capital deployed into companies (proxy for paid-in capital). */
  paidIn: number;
  /** Cash returned via exits / secondaries. */
  distributions: number;
  /** Residual NAV — current FMV of live holdings (exited/written-off excluded). */
  nav: number;
  /** Dated cashflows for IRR / J-curve (outflows negative, inflows positive). */
  cashflows: CashFlow[];
  /** Count of active vs exited vs written-off. */
  counts: { active: number; exited: number; writtenOff: number };
}

/**
 * @param investments fund investment rows
 * @param fund optional fund filter ("Fund 1"); omit for all funds combined
 * @param today date used to mark the terminal NAV inflow (defaults to now)
 */
export function deriveFund(
  investments: FundInvestment[],
  fund?: string,
  today: Date = new Date(),
): DerivedFund {
  const filtered = fund ? investments.filter((i) => i.fund === fund) : investments;

  // Deduplicate by id — keep only the last-seen entry for each deal so that
  // deals which have transitioned through multiple statuses (active → secondary →
  // exited) are counted exactly once at their current/latest status.
  const seen = new Map<string, FundInvestment>();
  for (const r of filtered) seen.set(r.id, r);
  const rows = Array.from(seen.values());

  let paidIn = 0;
  let distributions = 0;
  let nav = 0;
  const counts = { active: 0, exited: 0, writtenOff: 0 };
  const cashflows: CashFlow[] = [];

  for (const r of rows) {
    paidIn += parseCr(r.totalInvested);

    // Outflow: first cheque at entry.
    if (r.investmentDate) cashflows.push({ date: r.investmentDate, amount: -parseCr(r.firstCheque) });
    // Outflows: follow-on rounds.
    for (const fo of r.followOns ?? []) {
      if (fo.date) cashflows.push({ date: fo.date, amount: -parseCr(fo.amount) });
    }

    if (r.status === 'Exited') {
      counts.exited++;
      const proceeds = parseCr(r.exitProceeds) || parseCr(r.realizedValue);
      distributions += proceeds;
      if (r.exitDate && proceeds) cashflows.push({ date: r.exitDate, amount: proceeds });
    } else if (r.status === 'Written Off') {
      counts.writtenOff++;
    } else {
      counts.active++;
      nav += parseCr(r.currentFMV);
      // Any partial cash already returned (secondaries) while still live.
      const realized = parseCr(r.realizedValue);
      if (realized > 0) distributions += realized;
    }
  }

  // Terminal NAV mark as an unrealised inflow so IRR/J-curve reflect today's value.
  if (nav > 0) {
    cashflows.push({ date: today.toISOString().slice(0, 10), amount: nav });
  }

  return { paidIn, distributions, nav, cashflows, counts };
}
