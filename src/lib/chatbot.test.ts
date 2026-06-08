import { describe, it, expect } from 'vitest';
import { getBotResponse, genId } from './chatbot';
import { defaultConfig } from '../data/defaultConfig';

const store = defaultConfig;

describe('chatbot rule engine', () => {
  it('always returns non-empty text', () => {
    for (const q of ['hi', 'asdfqwer nonsense', 'help', 'how do I export?']) {
      const res = getBotResponse(q, store);
      expect(res.text.length).toBeGreaterThan(0);
    }
  });

  it('greets on a greeting', () => {
    const res = getBotResponse('hello', store);
    expect(res.text.toLowerCase()).toMatch(/hi|hello|help|cactus/);
  });

  it('answers a company-specific query and attaches the company', () => {
    const company = store.companies[0];
    const res = getBotResponse(`tell me about ${company.name}`, store);
    expect(res.text).toContain(company.name);
  });

  it('handles a portfolio-wide valuation question', () => {
    const res = getBotResponse('what is the total portfolio valuation?', store);
    expect(res.text.length).toBeGreaterThan(0);
  });

  it('never throws regardless of input', () => {
    const inputs = ['', '   ', '🚀🚀', 'EBITDA of XYZ in FY99', 'who invested in nothing'];
    for (const q of inputs) {
      expect(() => getBotResponse(q, store)).not.toThrow();
    }
  });

  it('does not mistake "history" for a greeting', () => {
    const company = store.companies[0];
    const res = getBotResponse(`${company.name} financial history`, store);
    // A greeting reply would not contain the company name / financial rows.
    expect(res.text).toContain(company.name);
  });

  it('answers fund economics with computed multiples', () => {
    const res = getBotResponse('what is the fund TVPI and net IRR?', store);
    expect(res.text).toMatch(/TVPI/i);
    expect(res.text).toMatch(/DPI|IRR/i);
  });

  it('produces a carry waterfall breakdown', () => {
    const res = getBotResponse('show the fund carry waterfall', store);
    expect(res.text).toMatch(/waterfall|carry|LP receives/i);
  });

  it('compares two named companies', () => {
    const [a, b] = store.companies;
    const res = getBotResponse(`compare ${a.name} and ${b.name}`, store);
    expect(res.text).toContain(a.name);
    expect(res.text).toContain(b.name);
    expect(res.text).toMatch(/MOIC|Valuation/i);
  });

  it('lists companies in a sector', () => {
    const sector = store.sectors.find(s => store.companies.some(c => c.sectorId === s.id));
    if (sector) {
      const res = getBotResponse(`companies in ${sector.name}`, store);
      expect(res.text).toContain(sector.name);
    }
  });

  it('handles small talk', () => {
    expect(getBotResponse('thanks!', store).text.length).toBeGreaterThan(0);
    expect(getBotResponse('who are you?', store).text.toLowerCase()).toMatch(/assistant|cactus|portal/);
  });

  it('does not treat a praise-prefixed question as small talk', () => {
    const res = getBotResponse('great, which company has the highest MOIC?', store);
    expect(res.text).toMatch(/MOIC/i); // routed to ranking, not a "you're welcome"
  });

  it('explains how to model a round', () => {
    const res = getBotResponse('how do I model a new round?', store);
    expect(res.text.toLowerCase()).toMatch(/pre-money|dilut|round/);
  });
});

describe('genId', () => {
  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => genId()));
    expect(ids.size).toBe(100);
  });
});
