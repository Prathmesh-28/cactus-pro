import { describe, it, expect } from 'vitest';
import {
  xirr,
  fundMultiples,
  europeanWaterfall,
  jCurve,
  type CashFlow,
} from './fundEconomics';

describe('xirr', () => {
  it('computes a simple one-year doubling as ~100%', () => {
    const flows: CashFlow[] = [
      { date: '2024-01-01', amount: -100 },
      { date: '2025-01-01', amount: 200 },
    ];
    expect(xirr(flows)).toBeCloseTo(1.0, 2);
  });

  it('returns ~0% when money comes back unchanged after a year', () => {
    const flows: CashFlow[] = [
      { date: '2024-01-01', amount: -100 },
      { date: '2025-01-01', amount: 100 },
    ];
    expect(xirr(flows)).toBeCloseTo(0, 3);
  });

  it('handles multiple irregular cashflows', () => {
    const flows: CashFlow[] = [
      { date: '2020-01-01', amount: -1000 },
      { date: '2021-06-01', amount: -500 },
      { date: '2024-01-01', amount: 2500 },
    ];
    const r = xirr(flows);
    // Verify the rate actually zeroes the NPV.
    const t0 = new Date('2020-01-01').getTime();
    const ms = 365 * 24 * 3600 * 1000;
    const npv = flows.reduce((s, f) => {
      const yrs = (new Date(f.date).getTime() - t0) / ms;
      return s + f.amount / Math.pow(1 + r, yrs);
    }, 0);
    expect(npv).toBeCloseTo(0, 2);
  });

  it('returns NaN when there is no sign change', () => {
    expect(
      xirr([
        { date: '2024-01-01', amount: -100 },
        { date: '2025-01-01', amount: -50 },
      ]),
    ).toBeNaN();
  });
});

describe('fundMultiples', () => {
  it('computes DPI, RVPI, TVPI', () => {
    const m = fundMultiples({ paidIn: 100, distributions: 40, nav: 120 });
    expect(m.dpi).toBeCloseTo(0.4);
    expect(m.rvpi).toBeCloseTo(1.2);
    expect(m.tvpi).toBeCloseTo(1.6);
    expect(m.totalValue).toBe(160);
  });

  it('guards divide-by-zero paid-in', () => {
    const m = fundMultiples({ paidIn: 0, distributions: 10, nav: 5 });
    expect(m.dpi).toBe(0);
    expect(m.tvpi).toBe(0);
  });
});

describe('europeanWaterfall', () => {
  it('returns only capital when there is no profit', () => {
    const w = europeanWaterfall({ contributed: 100, totalValue: 100 });
    expect(w.returnOfCapital).toBe(100);
    expect(w.preferredReturn).toBe(0);
    expect(w.gpTotal).toBe(0);
    expect(w.lpTotal).toBe(100);
  });

  it('pays preferred return before any carry', () => {
    // 8% pref over 1yr on 100 = 8. Value 105 => RoC 100, pref 5, no carry.
    const w = europeanWaterfall({ contributed: 100, totalValue: 105, years: 1 });
    expect(w.returnOfCapital).toBe(100);
    expect(w.preferredReturn).toBeCloseTo(5);
    expect(w.gpTotal).toBe(0);
  });

  it('applies catch-up then 20% carry on a profitable fund', () => {
    // contributed 100, value 200, 8% pref/1yr, 20% carry, full catch-up.
    const w = europeanWaterfall({
      contributed: 100,
      totalValue: 200,
      hurdleRate: 0.08,
      years: 1,
      carryPct: 0.2,
      gpCatchUp: true,
    });
    // RoC=100, pref=8, catchup target = 0.2/0.8 * 8 = 2.
    expect(w.returnOfCapital).toBe(100);
    expect(w.preferredReturn).toBeCloseTo(8);
    expect(w.gpCatchUp).toBeCloseTo(2);
    // remaining = 200-100-8-2 = 90 => gp 18, lp 72
    expect(w.carrySplit.gp).toBeCloseTo(18);
    expect(w.carrySplit.lp).toBeCloseTo(72);
    // GP total = 2 + 18 = 20 => exactly 20% of the 100 profit.
    expect(w.gpTotal).toBeCloseTo(20);
    expect(w.lpTotal).toBeCloseTo(180);
    expect(w.lpTotal + w.gpTotal).toBeCloseTo(200);
  });

  it('every tier sums back to total value', () => {
    const w = europeanWaterfall({ contributed: 250, totalValue: 600, years: 3 });
    const sum =
      w.returnOfCapital + w.preferredReturn + w.gpCatchUp + w.carrySplit.lp + w.carrySplit.gp;
    expect(sum).toBeCloseTo(600);
    expect(w.lpTotal + w.gpTotal).toBeCloseTo(600);
  });
});

describe('jCurve', () => {
  it('accumulates net cashflow chronologically', () => {
    const pts = jCurve([
      { date: '2023-01-01', amount: -50 },
      { date: '2022-01-01', amount: -100 },
      { date: '2024-01-01', amount: 30 },
    ]);
    expect(pts.map((p) => p.cumulative)).toEqual([-100, -150, -120]);
    expect(pts[0].date).toBe('2022-01-01'); // sorted
  });

  it('appends NAV as the final unrealised mark', () => {
    const pts = jCurve(
      [{ date: '2022-01-01', amount: -100 }],
      { date: '2025-01-01', nav: 250 },
    );
    expect(pts[pts.length - 1].cumulative).toBe(150);
  });
});
