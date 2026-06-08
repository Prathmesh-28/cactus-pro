import { describe, it, expect } from 'vitest';
import { deriveFund } from './fundDerive';
import { defaultConfig } from '../data/defaultConfig';
import type { FundInvestment } from '../data/types';

function inv(partial: Partial<FundInvestment>): FundInvestment {
  return {
    id: 'x', fund: 'Fund 1', companyId: 'c1', investmentDate: '2021-01-01',
    stageAtEntry: 'Seed', preMoneyAtEntry: '', postMoneyAtEntry: '', firstCheque: '10',
    ownershipAtEntry: '', instrument: 'Equity', followOns: [], totalInvested: '10',
    currentOwnership: '', currentFMV: '0', currentValuation: '', moic: '', irr: '', dpi: '',
    unrealizedValue: '', realizedValue: '0', latestFY: '', revenue: '', revenueGrowthYoY: '',
    arr: '', mrr: '', grossMargin: '', ebitdaMargin: '', monthlyBurn: '', cash: '', runway: '',
    headcount: 0, nrr: '', status: 'Active', boardSeat: false, leadOrFollow: 'Lead',
    nextRoundExpected: '', nextRoundSize: '', notes: '', updatedAt: '',
    ...partial,
  };
}

describe('deriveFund', () => {
  it('aggregates paid-in, distributions and NAV by status', () => {
    const rows = [
      inv({ id: 'a', totalInvested: '10', currentFMV: '40', status: 'Active' }),
      inv({ id: 'b', totalInvested: '20', status: 'Exited', exitProceeds: '80', exitDate: '2024-01-01' }),
      inv({ id: 'c', totalInvested: '5', status: 'Written Off' }),
    ];
    const d = deriveFund(rows);
    expect(d.paidIn).toBe(35);
    expect(d.distributions).toBe(80);
    expect(d.nav).toBe(40); // written-off contributes 0
    expect(d.counts).toEqual({ active: 1, exited: 1, writtenOff: 1 });
  });

  it('filters by fund', () => {
    const rows = [
      inv({ id: 'a', fund: 'Fund 1', totalInvested: '10' }),
      inv({ id: 'b', fund: 'Fund 2', totalInvested: '99' }),
    ];
    expect(deriveFund(rows, 'Fund 2').paidIn).toBe(99);
  });

  it('emits a terminal NAV inflow and dated outflows', () => {
    const rows = [
      inv({
        firstCheque: '10', investmentDate: '2021-01-01', currentFMV: '50',
        followOns: [{ id: 'f', date: '2022-01-01', round: 'A', amount: '5', preMoneyVal: '', postMoneyVal: '', ownershipPost: '', leadInvestor: '', notes: '' }],
      }),
    ];
    const d = deriveFund(rows, undefined, new Date('2025-01-01'));
    const outflows = d.cashflows.filter((c) => c.amount < 0);
    const inflows = d.cashflows.filter((c) => c.amount > 0);
    expect(outflows.map((c) => c.amount)).toEqual([-10, -5]);
    expect(inflows[inflows.length - 1]).toEqual({ date: '2025-01-01', amount: 50 });
  });

  it('runs on the real seed portfolio without error and yields positive NAV', () => {
    const d = deriveFund(defaultConfig.fundInvestments);
    expect(d.paidIn).toBeGreaterThan(0);
    expect(d.nav).toBeGreaterThan(0);
    expect(d.cashflows.length).toBeGreaterThan(0);
  });
});
