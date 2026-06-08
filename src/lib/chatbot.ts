/**
 * Cactus Pro Chatbot — Comprehensive FAQ + Live Data Engine
 * Handles granular queries: "EBITDA of AMPM in FY23-24", "Who invested in Bellatrix?",
 * "Which company has the highest MOIC?", "What is Lohum's CAGR?" etc.
 */
import type { AppStore, PortfolioCompany, FinancialYear, Sector } from '../data/types';
import { deriveFund } from './fundDerive';
import { fundMultiples, xirr, europeanWaterfall } from './fundEconomics';
import { formatCr, formatMultiple, formatPct } from './money';

export interface BotMessage {
  id: string;
  role: 'user' | 'bot';
  text: string;
  links?: { label: string; path: string }[];
  company?: PortfolioCompany;
  timestamp: Date;
}

export function genId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

/**
 * Compact, plain-text portfolio snapshot sent to the Claude-backed assistant as
 * grounding context. Kept terse so it fits comfortably in the prompt.
 */
export function buildPortfolioContext(store: AppStore): string {
  const sectorName = (id: string) => store.sectors.find(s => s.id === id)?.name ?? '—';
  const lines: string[] = [];

  lines.push(`FIRM: ${store.firm?.name ?? 'Cactus Partners'}`);

  if (store.fundMetrics?.length) {
    lines.push('\nFUND METRICS:');
    for (const m of store.fundMetrics) {
      if (m.visible === false) continue;
      lines.push(`- ${m.label}: ${m.value}${m.delta ? ` (${m.delta})` : ''}`);
    }
  }

  lines.push('\nPORTFOLIO COMPANIES:');
  for (const c of store.companies) {
    const fy = c.financialHistory?.[0];
    lines.push(
      `- ${c.name} | sector: ${sectorName(c.sectorId)} | stage: ${c.stage} | status: ${c.status} | HQ: ${c.hqCity} | CEO: ${c.ceoName} | ` +
      `valuation: ${c.currentValuation || '—'} | revenue: ${c.revenue || (fy?.revenue ?? '—')} | Cactus stake: ${c.ownershipPct}% | ` +
      `Cactus invested: ${c.cactusInvestment || '—'} | MOIC: ${c.moic}x | IRR: ${c.irr}% | ${c.shortDescription || ''}`.trim()
    );
  }

  const active = store.companies.filter(c => c.status === 'Active').length;
  const exited = store.companies.filter(c => c.status === 'Exited').length;
  lines.push(`\nTOTALS: ${store.companies.length} companies (${active} active, ${exited} exited).`);

  return lines.join('\n');
}

// ─── Year extraction ──────────────────────────────────────────────────────────
function extractFY(msg: string): string | null {
  const m = msg;
  const patterns = [
    /fy\s*20(\d{2})[–\-](\d{2})/i,
    /fy\s*(\d{2})[–\-](\d{2})/i,
    /fy\s*20(\d{2})\b/i,
    /fy\s*(\d{2})\b/i,
    /20(\d{2})[–\-](\d{2})/,
    /(\d{2})[–\-](\d{2})/,
  ];
  for (const p of patterns) {
    const match = m.match(p);
    if (match) {
      let y1: number, y2: number;
      if (match[2]) {
        y1 = parseInt(match[1]) < 100 ? 2000 + parseInt(match[1]) : parseInt(match[1]);
        y2 = parseInt(match[2]) < 100 ? 2000 + parseInt(match[2]) : parseInt(match[2]);
        if (y2 < y1) y2 = y1 + 1;
      } else {
        y1 = parseInt(match[1]) < 100 ? 2000 + parseInt(match[1]) : parseInt(match[1]);
        y2 = y1 + 1;
      }
      return `FY ${y1}-${String(y2).slice(2)}`;
    }
  }
  return null;
}

function matchFY(history: FinancialYear[], fyStr: string): FinancialYear | null {
  const parts = fyStr.replace('FY ', '').split('-');
  const y1 = parts[0]; const y2 = parts[1];
  return history.find(h => {
    const hn = h.year.toLowerCase().replace(/\s+/g, ' ');
    return hn.includes(y1) && hn.includes(y2);
  }) ?? null;
}

// ─── Metric extraction ────────────────────────────────────────────────────────
type FinMetric = 'revenue'|'ebitda'|'netProfit'|'ebitdaMargin'|'totalAssets'|'totalDebt'|'employees';
const METRIC_ALIASES: Record<string, FinMetric> = {
  revenue:'revenue',turnover:'revenue',sales:'revenue',income:'revenue','top line':'revenue',topline:'revenue',
  ebitda:'ebitda',ebita:'ebitda',ebit:'ebitda','operating profit':'ebitda',opprofit:'ebitda',
  'net profit':'netProfit',profit:'netProfit','net income':'netProfit','bottom line':'netProfit',
  loss:'netProfit','net loss':'netProfit',pat:'netProfit',
  margin:'ebitdaMargin','ebitda margin':'ebitdaMargin','operating margin':'ebitdaMargin',
  assets:'totalAssets','total assets':'totalAssets',
  debt:'totalDebt','total debt':'totalDebt',borrowing:'totalDebt',liability:'totalDebt',
  employees:'employees',headcount:'employees',staff:'employees','team size':'employees',workforce:'employees',
};
function extractMetric(msg: string): FinMetric | null {
  const m = msg.toLowerCase();
  for (const [alias, metric] of Object.entries(METRIC_ALIASES)) {
    if (m.includes(alias)) return metric;
  }
  return null;
}
const METRIC_LABELS: Record<FinMetric,string> = {
  revenue:'Revenue',ebitda:'EBITDA',netProfit:'Net Profit',
  ebitdaMargin:'EBITDA Margin',totalAssets:'Total Assets',totalDebt:'Total Debt',employees:'Employees',
};

// ─── Company matching ─────────────────────────────────────────────────────────
function matchCompany(msg: string, store: AppStore): PortfolioCompany | null {
  const m = msg.toLowerCase();
  const sorted = [...store.companies].sort((a,b) => b.name.length - a.name.length);
  return sorted.find(c =>
    m.includes(c.name.toLowerCase()) ||
    (c.ceoName && m.includes(c.ceoName.toLowerCase())) ||
    (c.legalEntityName && c.legalEntityName.length > 5 && m.includes(c.legalEntityName.toLowerCase().slice(0,8)))
  ) ?? null;
}

// All companies named in the message (for comparisons like "AMPM vs Lohum").
function matchCompanies(msg: string, store: AppStore): PortfolioCompany[] {
  const m = msg.toLowerCase();
  return store.companies.filter(c => c.name && m.includes(c.name.toLowerCase()));
}

// Sector named in the message (e.g. "EV companies", "deep tech portfolio").
function matchSector(msg: string, store: AppStore): Sector | null {
  const m = msg.toLowerCase();
  const sorted = [...store.sectors].sort((a,b) => (b.name?.length||0) - (a.name?.length||0));
  return sorted.find(s => s.name && s.name.length > 2 && m.includes(s.name.toLowerCase())) ?? null;
}

// ─── Number parser ────────────────────────────────────────────────────────────
function parseCrNum(val: string): number {
  if (!val || val === '—') return 0;
  const clean = val.replace(/\(.*?\)/g,'').replace(/[₹,\s]/g,'');
  const neg = clean.startsWith('-');
  const abs = clean.replace(/^-/,'');
  if (abs.includes('Cr')) return (neg?-1:1)*(parseFloat(abs)||0);
  if (abs.includes('L'))  return (neg?-1:1)*((parseFloat(abs)||0)/100);
  return parseFloat(clean)||0;
}
function latestFY(c: PortfolioCompany): FinancialYear|null { return c.financialHistory[0]??null; }

// ─── Category classifier ──────────────────────────────────────────────────────
type Category = 'fin_year_metric'|'fin_metric'|'fin_history'|'funding_rounds'|'cap_table'|
  'key_people'|'patents'|'competitors'|'valuation'|'ownership'|'moic_irr'|'cagr'|'company_overview'|
  'compare'|'portfolio_rank'|'portfolio_filter'|'portfolio_stat'|'sector_query'|'lp_data'|'deal_data'|
  'fund_metric'|'fund_economics'|
  'export_help'|'sync_help'|'logo_help'|'color_help'|'role_help'|'announcement_help'|'captable_help'|
  'calendar_help'|'docs_help'|'search_help'|'navigation'|'greeting'|'thanks'|'bye'|'about_bot'|'help'|'admin_help'|'unknown';

function classify(msg: string, co: PortfolioCompany|null, store: AppStore): Category {
  const m = msg.toLowerCase();
  const t = m.trim();
  // ── Small talk ──
  if (/^(hi|hello|hey|heya|hiya|greetings|namaste|hola|yo|sup|howdy)\b/i.test(t)) return 'greeting';
  if (/^(thanks|thank you|thank u|thx|ty|cheers|much appreciated|appreciate(d)?)\b/i.test(t)
      || /^(awesome|perfect|great|nice|cool|brilliant|love it|got it)[\s!.]*$/i.test(t)) return 'thanks';
  if (/^(bye|goodbye|see ya|see you|cya|later|good ?night|gn)\b/i.test(t)) return 'bye';
  if (/who are you|what are you|your name|are you (a |an )?(ai|bot|human|real|chatgpt|claude|gpt)|do you use (ai|claude|gpt|chatgpt)/i.test(m)) return 'about_bot';
  // ── Feature help ──
  if (/export|download|pdf|excel|report/i.test(m)) return 'export_help';
  if (/sync|sharepoint|onedrive|teams.*excel/i.test(m)) return 'sync_help';
  if (/logo|upload.*logo|firm.*logo/i.test(m) && !co) return 'logo_help';
  if (/color|colour|brand.*col|theme.*col/i.test(m)) return 'color_help';
  if (/role|permission|access.*control|super.*admin|switch.*role/i.test(m)) return 'role_help';
  if (/announc|banner|notif/i.test(m)) return 'announcement_help';
  if (/calendar|compliance.*dead|deadline|due date/i.test(m)) return 'calendar_help';
  if (/upload.*doc|file.*upload|attach|pdf.*upload/i.test(m)) return 'docs_help';
  if (/(how|where).*(model|simulate).*round|model a (new )?round|round modeler|dilut(e|ion)|option pool|what if.*(raise|round)/i.test(m)) return 'captable_help';
  if (/\b(search|find|look for)\b/i.test(m) && !co) return 'search_help';
  if (/admin|setting|config|taxonomy|threshold|homepage.*edit/i.test(m) && !co) return 'admin_help';
  if (co) {
    const fy = extractFY(msg);
    const metric = extractMetric(msg);
    if (fy && metric) return 'fin_year_metric';
    if (metric) return 'fin_metric';
    if (/financial.*hist|all.*year|history|year.*year|annual|yearly/i.test(m)) return 'fin_history';
    if (/fund|raise|raised|invest.*round|round.*invest|who.*invest|investor/i.test(m)) return 'funding_rounds';
    if (/cap table|sharehol|stakeholder|equity.*holder|who own/i.test(m)) return 'cap_table';
    if (/key people|leadership|founder|co-founder|who run|who lead|ceo|cto|coo|management/i.test(m)) return 'key_people';
    if (/patent|ip |intellectual|invention/i.test(m)) return 'patents';
    if (/compet|rival|versus|vs\b/i.test(m)) return 'competitors';
    if (/valuation|worth|valued|current.*val/i.test(m)) return 'valuation';
    if (/ownership|stake|holding|percent.*cactus|cactus.*percent/i.test(m)) return 'ownership';
    if (/\bmoic\b|multiple|return.*invest|\birr\b|internal rate/i.test(m)) return 'moic_irr';
    if (/cagr|growth rate|yoy|year.*year.*growth/i.test(m)) return 'cagr';
    return 'company_overview';
  }
  if (/tvpi|\bdpi\b|rvpi|\bj-?curve\b|carried interest|\bcarry\b|waterfall|catch.?up|hurdle|net irr|gross irr|fund.*(return|perform|economic|moic|multiple|irr)|(return|perform|economic).*\bfund\b/i.test(m)) return 'fund_economics';
  if (/highest|best|top|most|largest|biggest|max|lowest|worst|least|smallest|min/i.test(m)) return 'portfolio_rank';
  if (matchSector(msg, store) || /\bsectors?\b/i.test(m)) return 'sector_query';
  if (/profitable|making.*profit|unprofitable|loss.*making|all.*seed|series [abc]|growth.*stage|watch.?list|on watch|exited|written off/i.test(m)) return 'portfolio_filter';
  if (/all.*compan|list.*compan|total.*valuation|how many|count|number of/i.test(m)) return 'portfolio_stat';
  if (/\blp\b|limited partner|commitment|called capital|distributed|\bnav\b/i.test(m)) return 'lp_data';
  if (/deal|pipeline|sourcing|due dilig|term sheet|ic review|closed|passed/i.test(m)) return 'deal_data';
  if (/\baum\b|fund metric/i.test(m)) return 'fund_metric';
  if (/help|lost|confused|how do|what can|guide|explain/i.test(m)) return 'help';
  if (/go to|navigate|open|where.*page|which tab|get to|where is/i.test(m)) return 'navigation';
  return 'unknown';
}

// ─── Response helper ──────────────────────────────────────────────────────────
function r(text: string, links?: {label:string;path:string}[], company?: PortfolioCompany): Omit<BotMessage,'id'|'timestamp'> {
  return { role:'bot', text, links, company };
}
function coLinks(co: PortfolioCompany) { return [{label:`Open ${co.name} full profile`,path:'/dashboard'}]; }
function allLinks() { return [{label:'View all companies',path:'/dashboard'}]; }

// ─── Main response function ───────────────────────────────────────────────────
export function getBotResponse(userMsg: string, store: AppStore): Omit<BotMessage,'id'|'timestamp'> {
  const co  = matchCompany(userMsg, store);
  const { companies, sectors, lps, deals, fundMetrics, people } = store;
  const sN  = (id: string) => sectors.find(s=>s.id===id)?.name??'—';

  // ── COMPARE TWO+ COMPANIES (checked before single-company routing) ────────
  const named = matchCompanies(userMsg, store);
  if (named.length >= 2 && /\b(compare|comparison|versus|vs|difference|better|against|head.?to.?head)\b/i.test(userMsg)) {
    const picks = named.slice(0, 3);
    const row = (label: string, fn: (c: PortfolioCompany) => string) =>
      `**${label}:** ${picks.map(c => `${c.name} — ${fn(c)}`).join(' · ')}`;
    return r(
      `**Comparison: ${picks.map(c=>c.name).join(' vs ')}**\n\n` +
      row('Sector', c => sN(c.sectorId)) + '\n' +
      row('Stage', c => `${c.stage} (${c.status})`) + '\n' +
      row('Valuation', c => c.currentValuation || '—') + '\n' +
      row('Revenue', c => c.revenue || latestFY(c)?.revenue || '—') + '\n' +
      row('MOIC', c => c.moic > 0 ? `${c.moic}x` : '—') + '\n' +
      row('IRR', c => c.irr > 0 ? `${c.irr}%` : '—') + '\n' +
      row('Cactus stake', c => `${c.ownershipPct}%`) + '\n' +
      row('Cactus invested', c => c.cactusInvestment || '—'),
      allLinks()
    );
  }

  const cat = classify(userMsg, co, store);

  // ── SPECIFIC FINANCIAL YEAR + METRIC ────────────────────────────────────
  if (cat === 'fin_year_metric' && co) {
    const fyStr  = extractFY(userMsg)!;
    const metric = extractMetric(userMsg)!;
    const fy     = matchFY(co.financialHistory, fyStr);
    if (!fy) {
      const avail = co.financialHistory.map(h=>h.year).join(', ') || 'none recorded';
      return r(
        `I couldn't find **${fyStr}** data for **${co.name}**.\n\nAvailable years: **${avail}**\n\nYou can add this data in Admin → Portfolio Companies → Edit All → Financial History.`,
        coLinks(co), co
      );
    }
    const val = fy[metric];
    return r(
      `**${co.name}** — **${METRIC_LABELS[metric]}** for **${fy.year}**:\n\n` +
      `📊 **${METRIC_LABELS[metric]}: ${val || '—'}**\n\n` +
      `*Full picture for ${fy.year}:*\n` +
      `• Revenue: **${fy.revenue}**\n` +
      `• Net Profit: **${fy.netProfit}**\n` +
      `• EBITDA: **${fy.ebitda}** (Margin: ${fy.ebitdaMargin})\n` +
      `• Total Assets: **${fy.totalAssets}**\n` +
      `• Total Debt: **${fy.totalDebt}**\n` +
      `• Employees: **${fy.employees > 0 ? fy.employees : '—'}**`,
      coLinks(co), co
    );
  }

  // ── METRIC ACROSS ALL YEARS ──────────────────────────────────────────────
  if (cat === 'fin_metric' && co) {
    const metric = extractMetric(userMsg)!;
    if (co.financialHistory.length === 0)
      return r(`No financial history recorded for **${co.name}** yet.\n\nAdd it via Admin → Portfolio Companies → Edit All → Financial History.`, coLinks(co), co);
    const rows = co.financialHistory.map(h=>`• **${h.year}:** ${h[metric] || '—'}`).join('\n');
    const latest = co.financialHistory[0];
    return r(
      `**${co.name}** — **${METRIC_LABELS[metric]}** (all years):\n\n${rows}\n\n*Latest (${latest.year}): **${latest[metric] || '—'}***`,
      coLinks(co), co
    );
  }

  // ── FULL FINANCIAL HISTORY ───────────────────────────────────────────────
  if (cat === 'fin_history' && co) {
    if (co.financialHistory.length === 0)
      return r(`No financial history recorded for **${co.name}** yet.`, coLinks(co), co);
    const rows = co.financialHistory.map(h =>
      `**${h.year}**\n  Revenue: ${h.revenue} | Net Profit: ${h.netProfit}\n  EBITDA: ${h.ebitda} (${h.ebitdaMargin})\n  Assets: ${h.totalAssets} | Debt: ${h.totalDebt} | Employees: ${h.employees > 0 ? h.employees : '—'}`
    ).join('\n\n');
    return r(`**${co.name}** — Complete Financial History:\n\n${rows}`, coLinks(co), co);
  }

  // ── FUNDING ROUNDS ───────────────────────────────────────────────────────
  if (cat === 'funding_rounds' && co) {
    if (co.fundingRounds.length === 0)
      return r(`No funding rounds recorded for **${co.name}** yet.`, coLinks(co), co);
    const rounds = co.fundingRounds.map((rnd,i) =>
      `**Round ${i+1}: ${rnd.roundName}** · ${rnd.date}\n  Amount: **${rnd.amount}** | Post-money: **${rnd.postMoneyValuation}**\n  Lead: ${rnd.leadInvestors.join(', ')}\n  All Investors: ${rnd.allInvestors.join(', ')}`
    ).join('\n\n');
    return r(`**${co.name}** — Funding History (Total raised: ${co.totalFunding}):\n\n${rounds}`, coLinks(co), co);
  }

  // ── CAP TABLE ────────────────────────────────────────────────────────────
  if (cat === 'cap_table' && co) {
    if (co.capTable.length === 0)
      return r(`No cap table recorded for **${co.name}** yet.`, coLinks(co), co);
    const rows = co.capTable.map(e =>
      `• **${e.investor}** (${e.category}): **${e.holdingPct}%** | Investment: ${e.investment||'—'} | Shares: ${e.shares||'—'}`
    ).join('\n');
    return r(`**${co.name}** — Cap Table (${co.capTable.length} entries):\n\n${rows}\n\nCactus holds: **${co.ownershipPct}%**`, coLinks(co), co);
  }

  // ── KEY PEOPLE ───────────────────────────────────────────────────────────
  if (cat === 'key_people' && co) {
    if (co.keyPeople.length === 0)
      return r(`No key people recorded for **${co.name}** yet.\n\nAdd in Admin → Portfolio Companies → Edit All → Key People.`, coLinks(co), co);
    const rows = co.keyPeople.map(p=>`👤 **${p.name}** — *${p.title}*\n  ${p.background}`).join('\n\n');
    return r(`**${co.name}** — Leadership & Key People:\n\n**CEO:** ${co.ceoName}\n\n${rows}`, coLinks(co), co);
  }

  // ── PATENTS ──────────────────────────────────────────────────────────────
  if (cat === 'patents' && co) {
    if (co.patents.length === 0)
      return r(`No patents recorded for **${co.name}**.`, coLinks(co), co);
    const rows = co.patents.map((p,i)=>
      `${i+1}. **${p.title}**\n   Status: ${p.status} | Location: ${p.filingLocation} | Filed: ${p.applicationDate}${p.grantDate!=='—'?` | Granted: ${p.grantDate}`:''}`
    ).join('\n\n');
    return r(`**${co.name}** — Patents (${co.patents.length}):\n\n${rows}`, coLinks(co), co);
  }

  // ── COMPETITORS ──────────────────────────────────────────────────────────
  if (cat === 'competitors' && co) {
    if (co.competitors.length === 0)
      return r(`No competitors recorded for **${co.name}** yet.`, coLinks(co), co);
    return r(`**${co.name}** — Competitors (${co.competitors.length}):\n\n${co.competitors.map(c=>`• ${c}`).join('\n')}`, coLinks(co), co);
  }

  // ── VALUATION ────────────────────────────────────────────────────────────
  if (cat === 'valuation' && co) {
    const snap = store.portfolioSnapshot?.find(s=>s.companyId===co.id);
    return r(
      `**${co.name}** — Valuation & Investment:\n\n` +
      `💰 **Current Valuation:** ${co.currentValuation||'—'}\n` +
      `📈 **Cactus Investment:** ${co.cactusInvestment||'—'}\n` +
      `📊 **Cactus Ownership:** ${co.ownershipPct}%\n` +
      `🏆 **MOIC:** ${co.moic>0?co.moic+'x':'—'} | **IRR:** ${co.irr>0?co.irr+'%':'—'}\n` +
      `💼 **Total Funding Raised:** ${co.totalFunding||'—'}\n` +
      (snap?.currentStake?`📌 **Current Stake Value:** ₹${(snap.currentStake/1e7).toFixed(2)} Cr`:''),
      coLinks(co), co
    );
  }

  // ── OWNERSHIP ────────────────────────────────────────────────────────────
  if (cat === 'ownership' && co) {
    const entry = co.capTable.find(e=>e.investor.toLowerCase().includes('cactus'));
    return r(
      `**Cactus Partners' stake in ${co.name}:**\n\n` +
      `📊 **Ownership:** ${co.ownershipPct}%\n` +
      `💰 **Investment:** ${co.cactusInvestment||'—'}\n` +
      (entry?`📋 **Shares:** ${entry.shares||'—'}\n`:'') +
      `🏆 **MOIC:** ${co.moic>0?co.moic+'x':'—'} | **IRR:** ${co.irr>0?co.irr+'%':'—'}\n` +
      `📅 Stage: ${co.stage} | Status: ${co.status}\n\n` +
      `*Cactus holds ${co.ownershipPct}% — ${co.ownershipPct>=25?'the largest single stake':'a notable minority stake'}.*`,
      coLinks(co), co
    );
  }

  // ── MOIC / IRR ───────────────────────────────────────────────────────────
  if (cat === 'moic_irr' && co) {
    const snap = store.portfolioSnapshot?.find(s=>s.companyId===co.id);
    return r(
      `**${co.name}** — Returns:\n\n` +
      `🏆 **MOIC:** ${co.moic>0?co.moic+'x':snap?.moic?snap.moic+'x':'—'}\n` +
      `📈 **IRR:** ${co.irr>0?co.irr+'%':snap?.irr?snap.irr+'%':'—'}\n` +
      `💰 **Cactus Investment:** ${co.cactusInvestment||'—'}\n` +
      `💎 **Current Valuation:** ${co.currentValuation||'—'}\n` +
      `📊 **Ownership:** ${co.ownershipPct}%\n\n` +
      `*KPI colour thresholds configurable in Admin → KPI Thresholds.*`,
      coLinks(co), co
    );
  }

  // ── CAGR ─────────────────────────────────────────────────────────────────
  if (cat === 'cagr' && co) {
    const fy1=co.financialHistory[0]; const fy2=co.financialHistory[co.financialHistory.length-1];
    return r(
      `**${co.name}** — Revenue Growth:\n\n` +
      `📈 **1-Year CAGR:** ${co.revenueGrowthCagr1yr||'—'}\n` +
      `📊 **3-Year CAGR:** ${co.revenueGrowthCagr3yr||'—'}\n` +
      (fy1&&fy2&&fy1!==fy2?`\n*Range:*\n• Latest (${fy1.year}): **${fy1.revenue}**\n• Earliest (${fy2.year}): **${fy2.revenue}**`:''),
      coLinks(co), co
    );
  }

  // ── COMPANY OVERVIEW ─────────────────────────────────────────────────────
  if (cat === 'company_overview' && co) {
    const fy = latestFY(co);
    return r(
      `**${co.name}** — Full Overview:\n\n` +
      `📍 **${co.hqCity}, ${co.country}** | ${sN(co.sectorId)} | ${co.stage} | ${co.status}\n` +
      `👤 **CEO:** ${co.ceoName} | **Founded:** ${co.foundedYear}\n` +
      `🌐 ${co.websiteUrl||'—'}\n\n` +
      `**Investment:**\n• Cactus: ${co.cactusInvestment||'—'} (${co.ownershipPct}%)\n• Valuation: ${co.currentValuation||'—'}\n• Total Funding: ${co.totalFunding||'—'}\n• MOIC: ${co.moic>0?co.moic+'x':'—'} | IRR: ${co.irr>0?co.irr+'%':'—'}\n\n` +
      (fy?`**Latest Financials (${fy.year}):**\n• Revenue: ${fy.revenue} | EBITDA: ${fy.ebitda} (${fy.ebitdaMargin})\n• Net Profit: ${fy.netProfit} | Employees: ${fy.employees>0?fy.employees:'—'}\n\n`:'') +
      `**About:**\n${co.longDescription||co.shortDescription||'—'}\n\n` +
      (co.ipoPlans?`**IPO Plans:** ${co.ipoPlans}\n\n`:'') +
      `_${co.keyPeople.length} key people · ${co.fundingRounds.length} funding rounds · ${co.financialHistory.length} FY records · ${co.capTable.length} cap entries_`,
      coLinks(co), co
    );
  }

  // ── PORTFOLIO RANKINGS ───────────────────────────────────────────────────
  if (cat === 'portfolio_rank') {
    const m = userMsg.toLowerCase();
    const asc = /lowest|worst|least|smallest|min/i.test(m);
    const label = asc ? 'Lowest' : 'Highest';

    if (/moic|multiple|return/i.test(m)) {
      const sorted=[...companies].filter(c=>c.moic>0).sort((a,b)=>asc?a.moic-b.moic:b.moic-a.moic);
      return r(`**${label} MOIC in Portfolio:**\n\n${sorted.slice(0,7).map((c,i)=>`${i+1}. **${c.name}**: ${c.moic}x`).join('\n')}`, allLinks());
    }
    if (/irr/i.test(m)) {
      const sorted=[...companies].filter(c=>c.irr>0).sort((a,b)=>asc?a.irr-b.irr:b.irr-a.irr);
      return r(`**${label} IRR in Portfolio:**\n\n${sorted.slice(0,7).map((c,i)=>`${i+1}. **${c.name}**: ${c.irr}%`).join('\n')}`, allLinks());
    }
    if (/revenue|sales|turnover/i.test(m)) {
      const sorted=[...companies].map(c=>({c,v:parseCrNum(c.revenue)})).filter(x=>x.v!==0).sort((a,b)=>asc?a.v-b.v:b.v-a.v);
      return r(`**${label} Revenue in Portfolio:**\n\n${sorted.slice(0,7).map((x,i)=>`${i+1}. **${x.c.name}**: ${x.c.revenue}`).join('\n')}`, allLinks());
    }
    if (/valuation|worth|valued/i.test(m)) {
      const sorted=[...companies].map(c=>({c,v:parseCrNum(c.currentValuation)})).filter(x=>x.v>0).sort((a,b)=>asc?a.v-b.v:b.v-a.v);
      return r(`**${label} Valuation in Portfolio:**\n\n${sorted.slice(0,7).map((x,i)=>`${i+1}. **${x.c.name}**: ${x.c.currentValuation}`).join('\n')}`, allLinks());
    }
    if (/profit|ebitda/i.test(m)) {
      const sorted=[...companies].map(c=>{const fy=latestFY(c);return{c,v:fy?parseCrNum(fy.ebitda):0,fy};}).filter(x=>x.v!==0).sort((a,b)=>asc?a.v-b.v:b.v-a.v);
      return r(`**${label} EBITDA in Portfolio:**\n\n${sorted.slice(0,7).map((x,i)=>`${i+1}. **${x.c.name}**: ${x.fy?.ebitda||'—'} (${x.fy?.year})`).join('\n')}`, allLinks());
    }
    if (/stake|own|holding/i.test(m)) {
      const sorted=[...companies].sort((a,b)=>asc?a.ownershipPct-b.ownershipPct:b.ownershipPct-a.ownershipPct);
      return r(`**${label} Cactus Ownership in Portfolio:**\n\n${sorted.slice(0,7).map((c,i)=>`${i+1}. **${c.name}**: ${c.ownershipPct}%`).join('\n')}`, allLinks());
    }
    if (/employ|headcount|staff/i.test(m)) {
      const sorted=[...companies].map(c=>({c,emp:latestFY(c)?.employees??c.employees??0})).filter(x=>x.emp>0).sort((a,b)=>asc?a.emp-b.emp:b.emp-a.emp);
      return r(`**${label} Headcount in Portfolio:**\n\n${sorted.slice(0,7).map((x,i)=>`${i+1}. **${x.c.name}**: ${x.emp} employees`).join('\n')}`, allLinks());
    }
    if (/fund|raised|funding/i.test(m)) {
      const sorted=[...companies].map(c=>({c,v:parseCrNum(c.totalFunding)})).filter(x=>x.v>0).sort((a,b)=>asc?a.v-b.v:b.v-a.v);
      return r(`**${label} Total Funding Raised:**\n\n${sorted.slice(0,7).map((x,i)=>`${i+1}. **${x.c.name}**: ${x.c.totalFunding}`).join('\n')}`, allLinks());
    }
    return r(`Here are all companies. Ask me to rank by: MOIC, IRR, Revenue, Valuation, EBITDA, Ownership %, Headcount, or Total Funding.`, allLinks());
  }

  // ── PORTFOLIO FILTERS ────────────────────────────────────────────────────
  if (cat === 'portfolio_filter') {
    const m = userMsg.toLowerCase();
    if (/profit.*making|making.*profit|\bprofitable\b/i.test(m)) {
      const list=companies.filter(c=>{const fy=latestFY(c);return fy&&parseCrNum(fy.netProfit)>0;});
      if (!list.length) return r(`No companies have recorded positive net profit in their latest year.`, allLinks());
      return r(`**Profitable Companies (${list.length}):**\n\n${list.map(c=>{const fy=latestFY(c);return`• **${c.name}**: Net Profit ${fy!.netProfit} (${fy!.year})`;}).join('\n')}`, allLinks());
    }
    if (/loss|unprofitable/i.test(m)) {
      const list=companies.filter(c=>{const fy=latestFY(c);return fy&&parseCrNum(fy.netProfit)<0;});
      return r(`**Loss-making Companies (${list.length}):**\n\n${list.map(c=>{const fy=latestFY(c);return`• **${c.name}**: ${fy!.netProfit} (${fy!.year})`;}).join('\n')}`, allLinks());
    }
    const stageNames=['seed','series a','series b','series c','growth','late','exited'];
    const matchedStage=stageNames.find(s=>m.includes(s));
    if (matchedStage) {
      const filtered=companies.filter(c=>c.stage.toLowerCase()===matchedStage);
      return r(`**${matchedStage.charAt(0).toUpperCase()+matchedStage.slice(1)} Stage Companies (${filtered.length}):**\n\n${filtered.map(c=>`• **${c.name}** — ${sN(c.sectorId)} · ${c.hqCity}`).join('\n')||'None found.'}`, allLinks());
    }
    return r('What filter would you like? Try: "all Seed companies", "profitable companies", "Series A companies", or "loss-making companies".', allLinks());
  }

  // ── PORTFOLIO STATS ──────────────────────────────────────────────────────
  if (cat === 'portfolio_stat') {
    const m = userMsg.toLowerCase();
    const active=companies.filter(c=>c.status!=='Exited');
    if (/total.*valuation|combined.*val|portfolio.*worth/i.test(m)) {
      const total=active.reduce((s,c)=>s+parseCrNum(c.currentValuation),0);
      const breakdown=active.filter(c=>parseCrNum(c.currentValuation)>0).sort((a,b)=>parseCrNum(b.currentValuation)-parseCrNum(a.currentValuation)).slice(0,5).map(c=>`• ${c.name}: ${c.currentValuation}`).join('\n');
      return r(`**Total Portfolio Valuation (Active):**\n\n₹${total.toFixed(2)} Cr across ${active.length} active companies\n\n**Top by Valuation:**\n${breakdown}`, allLinks());
    }
    if (/how many|count|number of/i.test(m)) {
      const bySector=sectors.map(s=>({name:s.name,count:companies.filter(c=>c.sectorId===s.id).length})).filter(x=>x.count>0);
      const byStage=['Seed','Series A','Series B','Series C','Growth','Late','Exited'].map(st=>{const n=companies.filter(c=>c.stage===st).length;return n>0?`• ${st}: ${n}`:null;}).filter(Boolean).join('\n');
      return r(`**Portfolio Statistics:**\n\n• Total: **${companies.length}** | Active: **${active.length}** | Exited: **${companies.filter(c=>c.status==='Exited').length}** | Watch: **${companies.filter(c=>c.status==='Watch').length}**\n\n**By Sector:**\n${bySector.map(x=>`• ${x.name}: ${x.count}`).join('\n')}\n\n**By Stage:**\n${byStage}`, allLinks());
    }
    const list=active.map((c,i)=>`${i+1}. **${c.name}** — ${sN(c.sectorId)} · ${c.stage} · ${c.hqCity}`).join('\n');
    return r(`**All ${active.length} Active Portfolio Companies:**\n\n${list}`, allLinks());
  }

  // ── FUND DATA ────────────────────────────────────────────────────────────
  if (cat === 'lp_data') {
    if (!lps.length) return r('No LP data recorded yet.', [{label:'Finance',path:'/finance'}]);
    return r(`**Limited Partners (${lps.length}):**\n\n${lps.map(l=>`• **${l.name}**\n  Commitment: ${l.commitment} | Called: ${l.called} | Distributed: ${l.distributed} | NAV: ${l.nav}`).join('\n\n')}`, [{label:'Finance → Fund Overview',path:'/finance'}]);
  }
  if (cat === 'deal_data') {
    if (!deals.length) return r('No deals in the pipeline yet.', [{label:'Investment Pipeline',path:'/investment'}]);
    const summary=[...new Set(deals.map(d=>d.stage))].map(s=>`**${s}:** ${deals.filter(d=>d.stage===s).length}`).join('\n');
    const list=deals.map(d=>`• **${d.companyName}** — ${d.stage} | ${d.ticketSize} | ${people.find(p=>p.id===d.leadPartnerId)?.name??'—'}`).join('\n');
    return r(`**Deal Pipeline (${deals.length} deals):**\n\n${summary}\n\n**All Deals:**\n${list}`, [{label:'Investment Pipeline',path:'/investment'}]);
  }
  if (cat === 'fund_metric') {
    const vis=fundMetrics.filter(m=>m.visible);
    return r(`**Fund Metrics:**\n\n${vis.map(m=>`• **${m.label}:** ${m.value}${m.delta?` _(${m.delta})_`:''}`).join('\n')}`, [{label:'Finance → Fund Overview',path:'/finance'}]);
  }

  // ── FUND ECONOMICS (computed live: DPI/RVPI/TVPI, Net IRR, carry waterfall) ─
  if (cat === 'fund_economics') {
    const m = userMsg.toLowerCase();
    const fundName = /fund\s*2|fund\s*ii\b/i.test(m) ? 'Fund 2'
      : /fund\s*1|fund\s*i\b/i.test(m) ? 'Fund 1' : undefined;
    const d = deriveFund(store.fundInvestments, fundName);
    if (!store.fundInvestments.length || d.paidIn === 0) {
      const vis = fundMetrics.filter(x => x.visible);
      return r(
        `I don't have deployed-capital data in the Fund Ledger yet, so I can't compute fund economics.` +
        (vis.length ? `\n\n**Fund Metrics on record:**\n${vis.map(x=>`• **${x.label}:** ${x.value}`).join('\n')}` : ''),
        [{label:'Finance → Fund Economics',path:'/finance'}]
      );
    }
    const mult = fundMultiples({ paidIn: d.paidIn, distributions: d.distributions, nav: d.nav });
    const irr = xirr(d.cashflows);
    const label = fundName ?? 'All Funds';

    if (/carry|waterfall|catch.?up|hurdle|carried interest|\bgp\b|split/i.test(m)) {
      const wf = europeanWaterfall({ contributed: d.paidIn, totalValue: mult.totalValue, hurdleRate: 0.08, years: 5, carryPct: 0.2, gpCatchUp: true });
      return r(
        `**${label} — Carried-Interest Waterfall** (European · 8% hurdle · 20% carry · 5y):\n\n` +
        `• Total value **${formatCr(mult.totalValue)}** on **${formatCr(d.paidIn)}** paid-in — profit **${formatCr(wf.profit)}**\n` +
        `• Return of capital → LP: **${formatCr(wf.returnOfCapital)}**\n` +
        `• Preferred return → LP: **${formatCr(wf.preferredReturn)}**\n` +
        `• GP catch-up: **${formatCr(wf.gpCatchUp)}**\n` +
        `• Carry split → GP **${formatCr(wf.carrySplit.gp)}** / LP **${formatCr(wf.carrySplit.lp)}**\n\n` +
        `➡️ **LP receives ${formatCr(wf.lpTotal)} · GP receives ${formatCr(wf.gpTotal)}** (GP = ${formatPct(wf.gpSharePct)} of total value)\n\n` +
        `_Tune the hurdle, carry % and catch-up live in Finance → Fund Economics._`,
        [{label:'Finance → Fund Economics',path:'/finance'}]
      );
    }

    return r(
      `**${label} — Fund Economics** (derived live from the Fund Ledger):\n\n` +
      `• Deployed (paid-in): **${formatCr(d.paidIn)}**\n` +
      `• Distributions: **${formatCr(d.distributions)}**\n` +
      `• NAV (residual): **${formatCr(d.nav)}**\n` +
      `• **DPI** (realised): ${formatMultiple(mult.dpi)}\n` +
      `• **RVPI** (unrealised): ${formatMultiple(mult.rvpi)}\n` +
      `• **TVPI** (total value): **${formatMultiple(mult.tvpi)}**\n` +
      `• **Net IRR:** ${Number.isNaN(irr) ? '—' : formatPct(irr)}\n` +
      `• ${d.counts.active} active · ${d.counts.exited} exited · ${d.counts.writtenOff} written off\n\n` +
      `_Full J-curve + carry waterfall in Finance → Fund Economics. Ask "fund carry" for the waterfall._`,
      [{label:'Finance → Fund Economics',path:'/finance'}]
    );
  }

  // ── SECTOR QUERIES ───────────────────────────────────────────────────────
  if (cat === 'sector_query') {
    const sec = matchSector(userMsg, store);
    if (!sec) {
      const rows = sectors.map(s => ({ s, n: companies.filter(c => c.sectorId === s.id).length }))
        .filter(x => x.n > 0).sort((a,b) => b.n - a.n)
        .map(x => `• **${x.s.name}**: ${x.n} ${x.n === 1 ? 'company' : 'companies'}`).join('\n');
      return r(`**Portfolio Sectors:**\n\n${rows || 'No sectors configured yet.'}\n\nAsk e.g. *"companies in ${sectors.find(s=>companies.some(c=>c.sectorId===s.id))?.name ?? 'EV'}"* to drill into one.`, allLinks());
    }
    const list = companies.filter(c => c.sectorId === sec.id);
    if (!list.length) return r(`No companies recorded in **${sec.name}** yet.`, allLinks());
    const rows = list.map(c =>
      `• **${c.name}** — ${c.stage} · ${c.status} · valuation ${c.currentValuation||'—'} · MOIC ${c.moic>0?c.moic+'x':'—'} · Cactus ${c.ownershipPct}%`
    ).join('\n');
    return r(`**${sec.name} — ${list.length} ${list.length === 1 ? 'company' : 'companies'}:**\n\n${rows}`, allLinks());
  }

  // ── FEATURE HELP ─────────────────────────────────────────────────────────
  if (cat==='export_help') return r(`📥 **All Export Locations:**\n\n**Portfolio Summary** (PDF + Excel)\n→ Portfolio tab → "Export ▾" dropdown\n\n**Individual Company Report** (PDF + Excel)\n→ Company card → drawer → "Export ▾" next to ✕\nIncludes: financials, cap table, key people, patents, funding rounds\n\n**Finance Summary** (PDF + Excel)\n→ Finance tab → sidebar → "Export Finance" button\n\n**Deal Pipeline** (PDF + Excel)\n→ Investment tab → "Export ▾" next to Add Deal\n\nAll PDFs branded with Cactus green/lime palette + confidential footer.`);

  if (cat==='sync_help') return r(`🔄 **SharePoint / OneDrive Excel Sync:**\n\n1. Open Excel in SharePoint → Share → "Anyone with link" → Copy link\n2. Go to **Admin → Data Sync**\n3. Click **"Add SharePoint Source"**\n4. Paste URL → click **Preview** (shows all sheet names)\n5. Map each sheet to the right section\n6. Click **Save** then **Sync Now**\n\nData stores in **PostgreSQL on Render** — permanent, shared across all users.`, [{label:'Admin → Data Sync',path:'/admin'}]);

  if (cat==='logo_help') return r(`🖼️ **Uploading Logos:**\n\n**Firm Logo (Cactus Partners):**\n→ Admin → Firm Settings → Firm Logo section\n→ "Upload logo from computer" (PNG/JPG/SVG/WebP, max 20MB)\n→ Appears in: Header, Homepage, Footer\n\n**Company Logos:**\n→ Admin → Portfolio Companies → Edit All → Basic Info → Logo\n→ Same upload widget with live preview`, [{label:'Admin → Firm Settings',path:'/admin'}]);

  if (cat==='color_help') return r(`🎨 **Changing Brand Colours:**\n\nAdmin → Firm Settings → Brand Colors:\n\n• **Primary Colour** (#1C4B42) — buttons, active nav, headings\n• **Accent Colour** (#86CA0F) — lime highlights, tags\n• **Light Colour** (#E3EDE9) — card backgrounds\n\nChanges apply instantly everywhere. Colours from cactuspartners.in.`, [{label:'Admin → Firm Settings',path:'/admin'}]);

  if (cat==='role_help') return r(`🔐 **Roles & Permissions:**\n\n${store.roles.map(role=>`**${role.displayName}**\n  Sees: ${role.visibleTabs.join(', ')}\n  Export: ${role.canExport?'Yes':'No'} | Notes: ${role.canAddNotes?'Yes':'No'}`).join('\n\n')}\n\nChange at **Admin → Roles & Permissions**. Switch roles via header role selector.`, [{label:'Admin → Roles & Permissions',path:'/admin'}]);

  if (cat==='announcement_help') return r(`📣 **Announcements:**\n\nAdmin → Announcements to create banners.\n\n• Title + body text\n• Target roles (who sees it)\n• Priority: info / warning / urgent\n• Expiry date (auto-disappears)\n\nBanners appear at the top of the page for targeted roles.`, [{label:'Admin → Announcements',path:'/admin'}]);

  if (cat==='calendar_help') return r(`📅 **Compliance Calendars:**\n\n**1. Portfolio tab (bottom)** — All company deadlines together\n→ Click any date to add a deadline for any company\n\n**2. Finance → Compliances** — Full calendar + upcoming deadlines sidebar + Excel import\n\n**3. CompanyDrawer → Calendar tab** — Individual company only\n→ "Add Deadline" button`, [{label:'Finance → Compliances',path:'/finance'}]);

  if (cat==='docs_help') return r(`📎 **Uploading Documents:**\n\nAny company → CompanyDrawer → **Docs tab**\n\n• Upload: PDF, Word, Excel, images (max 20 MB)\n• Stored in **PostgreSQL on Render** — permanent + shared\n• PDFs open inline; download or delete anytime`, [{label:'Portfolio',path:'/dashboard'}]);

  if (cat==='search_help') return r(`🔍 **Global Search (everyone):**\n\nClick the search bar in the header or press **⌘K** / **Ctrl+K**\n\nSearches: ${companies.length} companies, key people, deals, metrics, sectors, and nav links — results are scoped to what your role can access.\n\n**↑↓** navigate · **Enter** open · **Esc** close`);

  if (cat==='admin_help') return r(`⚙️ **Admin Panel (${14} sections):**\n\n• Firm Settings — Logo, colours, name, tagline\n• Portfolio Companies — Every field including financials, cap table, funding, key people, patents\n• People & Team\n• Sectors\n• Fund Metrics\n• Roles & Permissions\n• Announcements\n• Data Sync — SharePoint/Excel\n• Deal Stages — Names + colours\n• Homepage — Hero, pillars, nav links\n• KPI Thresholds — MOIC/IRR colour breakpoints\n• Finance Config — Fund names, fiscal years\n• Taxonomy — Stages, statuses\n• Portfolio Snapshot — Investment data per company\n\nAll changes auto-save to PostgreSQL.`, [{label:'Admin Panel',path:'/admin'}]);

  if (cat==='captable_help') return r(`🧮 **Model a Funding Round (dilution):**\n\nOpen any company → **Cap Table tab** → **"Model a New Round"**.\n\nEnter:\n• **Pre-money** valuation (₹Cr)\n• **New money** raised (₹Cr)\n• Optional **new ESOP pool %** — carved pre-money, so it dilutes existing holders, not the new investor\n\nYou'll instantly see post-money, the new investor's %, price per share, and **before → after ownership with each holder's dilution** (Cactus highlighted).`, [{label:'Portfolio',path:'/dashboard'}]);

  if (cat==='navigation') return r(`🧭 **Quick Navigation:**\n\n• Portfolio → /dashboard\n• Finance → /finance (incl. **Fund Economics**: DPI/TVPI/IRR, J-curve, carry waterfall)\n• Investment → /investment\n• VC Toolkit → /toolkit\n• Workspace → /workspace\n• Admin → /admin\n\nPress **⌘K** to search and jump anywhere instantly.`, [{label:'Portfolio',path:'/dashboard'},{label:'Finance',path:'/finance'},{label:'Admin',path:'/admin'}]);

  if (cat==='thanks') return r(`You're welcome! 🌵 Anything else — portfolio data, fund economics, or a hand with the portal?`);

  if (cat==='bye') return r(`👋 Cheers! I'm here whenever you need portfolio data, fund metrics, or help with the portal.`);

  if (cat==='about_bot') return r(`I'm the **Cactus Pro Assistant** — the built-in helper for this portal. I read the live portal data (portfolio companies, fund ledger, metrics) and answer questions about it, and I explain how to use every feature. I run entirely inside the portal — no external accounts needed.\n\nTry:\n• *"fund TVPI"* or *"fund carry waterfall"*\n• *"compare Lohum and Auric"*\n• *"highest MOIC"*\n• *"companies in EV"*\n• *"how do I model a round?"*`, [{label:'Portfolio',path:'/dashboard'},{label:'Finance',path:'/finance'}]);

  if (cat==='greeting') return r(`👋 Hi! I'm the **Cactus Pro Assistant** — I know everything in this portal.\n\nAsk me:\n• *"What is AMPM's EBITDA in FY23-24?"*\n• *"Which company has the highest MOIC?"*\n• *"Fund TVPI and net IRR"* or *"fund carry waterfall"*\n• *"Compare Lohum and Auric"*\n• *"Companies in EV"*\n• *"Show me all profitable companies"*\n• *"What is Lohum's cap table?"*\n• *"How do I model a round?"* or *"How do I sync SharePoint?"*`, [{label:'Portfolio',path:'/dashboard'},{label:'Finance',path:'/finance'},{label:'Admin',path:'/admin'}]);

  if (cat==='help') return r(`**I can answer very specific questions:**\n\n**Company Data:**\n• *"EBITDA of AMPM in FY23-24"*\n• *"Lohum's revenue history"*\n• *"Bellatrix cap table"*\n• *"Key people at Kapture"*\n• *"Indigrid funding rounds"*\n• *"Vitraya patents"* · *"AMPM CAGR"*\n\n**Portfolio Analytics:**\n• *"Which company has highest MOIC?"*\n• *"Compare Lohum and Auric"*\n• *"Companies in EV"* · *"All Series A companies"*\n• *"Show profitable companies"* · *"Total portfolio valuation"*\n\n**Fund Economics:**\n• *"Fund TVPI / DPI / net IRR"*\n• *"Fund carry waterfall"*\n\n**Feature Help:**\n• *"How do I model a round?"*\n• *"How do I export PDF / sync SharePoint / upload logo?"*\n\n**All companies:** ${companies.map(c=>c.name).join(', ')}`, [{label:'Portfolio',path:'/dashboard'},{label:'Admin',path:'/admin'}]);

  // ── Smart unknown fallback ───────────────────────────────────────────────
  // If they named a metric but no company, ask which company.
  const askedMetric = extractMetric(userMsg);
  if (askedMetric) {
    return r(`I can pull **${METRIC_LABELS[askedMetric]}** — for which company? e.g. *"${companies[0]?.name ?? 'Lohum'} ${METRIC_LABELS[askedMetric].toLowerCase()}"* (add a year like *"FY23-24"* for a single year).\n\n**Companies:** ${companies.map(c=>c.name).join(' · ')}`, [{label:'Portfolio',path:'/dashboard'}]);
  }
  return r(`I didn't quite catch that — here's what I'm great at:\n\n• Company data — *"AMPM EBITDA FY23-24"*, *"Bellatrix cap table"*, *"who runs Vitraya?"*\n• Rankings & filters — *"highest MOIC"*, *"all Seed companies"*, *"profitable companies"*\n• Compare — *"compare Lohum and Auric"*\n• Sectors — *"companies in EV"*\n• Fund economics — *"fund TVPI"*, *"fund carry waterfall"*\n• How-to — *"how do I model a round / export a PDF / sync SharePoint?"*\n\n**Companies I know:** ${companies.map(c=>c.name).join(' · ')}\n\nWhat would you like to know? 🌵`, [{label:'Portfolio',path:'/dashboard'},{label:'Admin',path:'/admin'}]);
}
