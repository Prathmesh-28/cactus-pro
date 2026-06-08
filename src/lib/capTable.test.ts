import { describe, it, expect } from 'vitest';
import {
  modelRound,
  withPct,
  totalShares,
  holdersFromPct,
  stakeAfterRound,
  type Holder,
} from './capTable';

const founders: Holder[] = [
  { name: 'Founders', shares: 8_000_000 },
  { name: 'Cactus Partners', shares: 1_500_000 },
  { name: 'ESOP Pool', shares: 500_000 },
];

describe('withPct / totalShares', () => {
  it('computes ownership fractions that sum to 1', () => {
    const rows = withPct(founders);
    expect(totalShares(founders)).toBe(10_000_000);
    expect(rows.find((r) => r.name === 'Founders')!.pct).toBeCloseTo(0.8);
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBeCloseTo(1);
  });
});

describe('holdersFromPct', () => {
  it('derives shares from percentages', () => {
    const h = holdersFromPct([
      { name: 'A', pct: 60 },
      { name: 'B', pct: 40 },
    ]);
    expect(h[0].shares).toBe(6_000_000);
    expect(h[1].shares).toBe(4_000_000);
  });
});

describe('modelRound — priced round without option pool', () => {
  const res = modelRound(founders, { preMoney: 100, newMoney: 25 });

  it('post-money = pre + new', () => {
    expect(res.postMoney).toBe(125);
  });

  it('new investors own newMoney / postMoney', () => {
    const inv = res.after.find((r) => r.name === 'New Investors')!;
    expect(inv.pct).toBeCloseTo(25 / 125); // 20%
  });

  it('existing holders are diluted by exactly the investor stake', () => {
    const foundersAfter = res.after.find((r) => r.name === 'Founders')!;
    // 80% pre, diluted by 20% new money => 80% * (100/125) = 64%
    expect(foundersAfter.pct).toBeCloseTo(0.64);
  });

  it('all post-round percentages sum to 1', () => {
    expect(res.after.reduce((s, r) => s + r.pct, 0)).toBeCloseTo(1);
  });

  it('reports per-holder dilution in points', () => {
    const f = res.dilution.find((d) => d.name === 'Founders')!;
    expect(f.pointsLost).toBeCloseTo(16); // 80 -> 64
  });
});

describe('modelRound — with pre-money option pool top-up', () => {
  // 10% post-round new pool, carved pre-money.
  const res = modelRound(founders, {
    preMoney: 100,
    newMoney: 25,
    optionPoolTargetPct: 0.1,
  });

  it('new investors still own newMoney / postMoney', () => {
    const inv = res.after.find((r) => r.name === 'New Investors')!;
    expect(inv.pct).toBeCloseTo(0.2);
  });

  it('new pool is exactly the target fraction of post-round shares', () => {
    const pool = res.after.find((r) => r.name === 'Option Pool (new)')!;
    expect(pool.pct).toBeCloseTo(0.1);
  });

  it('the pool dilutes existing holders, not the new investor', () => {
    const foundersAfter = res.after.find((r) => r.name === 'Founders')!;
    // Founders bear both the new money AND the pool: below the no-pool 64%.
    expect(foundersAfter.pct).toBeLessThan(0.64);
    expect(res.after.reduce((s, r) => s + r.pct, 0)).toBeCloseTo(1);
  });
});

describe('modelRound — guards', () => {
  it('throws on non-positive pre-money', () => {
    expect(() => modelRound(founders, { preMoney: 0, newMoney: 10 })).toThrow();
  });
  it('throws when the option pool is too large for the round', () => {
    expect(() =>
      modelRound(founders, { preMoney: 100, newMoney: 25, optionPoolTargetPct: 0.95 }),
    ).toThrow();
  });
});

describe('stakeAfterRound', () => {
  it('returns Cactus ownership and value at post-money', () => {
    const res = modelRound(founders, { preMoney: 100, newMoney: 25 });
    const stake = stakeAfterRound(res, 'Cactus Partners')!;
    expect(stake.pct).toBeCloseTo(0.12); // 15% * (100/125)
    expect(stake.valueAtPost).toBeCloseTo(0.12 * 125);
  });
  it('returns null for an unknown holder', () => {
    const res = modelRound(founders, { preMoney: 100, newMoney: 25 });
    expect(stakeAfterRound(res, 'Nobody')).toBeNull();
  });
});
