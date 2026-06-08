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
});

describe('genId', () => {
  it('produces unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => genId()));
    expect(ids.size).toBe(100);
  });
});
