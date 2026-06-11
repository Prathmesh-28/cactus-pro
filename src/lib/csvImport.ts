/**
 * CSV Import — parse pasted/uploaded CSV text and convert to typed store objects.
 * All parse functions return an ImportResult so the UI can show a preview before committing.
 */

import type {
  PortfolioCompany, CompanyFinancialPeriod, CompanyHealth,
  PortfolioUpdate, FounderContact, ValuationMark,
  CompanyStatus, YearStyle, PeriodType, FYQuarter, HealthSignal,
} from '../data/types';

export interface ImportResult<T> {
  upserted: T[];
  errors: string[];
  total: number;   // rows seen (excluding header)
}

// ── CSV parser (handles quoted fields and embedded commas/newlines) ────────────

export function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuote = false;
  const len = raw.length;

  for (let i = 0; i < len; i++) {
    const ch = raw[i];
    if (inQuote) {
      if (ch === '"') {
        if (raw[i + 1] === '"') { cell += '"'; i++; }
        else inQuote = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuote = true;
    } else if (ch === ',') {
      row.push(cell.trim()); cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && raw[i + 1] === '\n') i++;
      row.push(cell.trim()); cell = '';
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  row.push(cell.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildNameMap(companies: PortfolioCompany[]): Map<string, string> {
  const m = new Map<string, string>();
  companies.forEach(c => {
    m.set(c.name.toLowerCase(), c.id);
    // Also map common abbreviations
    if (c.name.toLowerCase().includes('kapture')) m.set('kapture crm', c.id);
    if (c.name.toLowerCase().includes('brandworks')) m.set('brandworks', c.id);
  });
  return m;
}

function resolveCompanyId(
  nameOrId: string,
  idField: string,
  nameMap: Map<string, string>,
  companies: PortfolioCompany[],
): string | null {
  if (idField && companies.find(c => c.id === idField)) return idField;
  const direct = companies.find(c => c.id === nameOrId);
  if (direct) return direct.id;
  return nameMap.get(nameOrId.toLowerCase()) ?? null;
}

function s(v: string | undefined): string { return (v ?? '').trim(); }
function n(v: string | undefined): number { return parseFloat(v ?? '') || 0; }

function makeId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// ── 1. Financial Periods ──────────────────────────────────────────────────────
// Headers: Company Name, Company ID, Year Style, Period, Period Type, Fiscal Year, Quarter,
//          Revenue, ARR, MRR, GMV, Revenue Growth YoY, ARR Growth YoY, NRR, Churn,
//          Gross Margin, EBITDA Margin, Net Margin,
//          Valuation FMV, MOIC, IRR, Methodology,
//          Headcount, Monthly Burn, Cash, Runway, CAC, LTV, LTV:CAC,
//          Notes, Source, Updated By, Updated At

export function parseFinancialPeriods(
  rows: string[][],
  companies: PortfolioCompany[],
  existing: CompanyFinancialPeriod[],
): ImportResult<CompanyFinancialPeriod> {
  if (rows.length < 2) return { upserted: [], errors: ['No data rows found'], total: 0 };
  const [header, ...dataRows] = rows;
  const h = (label: string) => header.findIndex(c => c.toLowerCase().includes(label.toLowerCase()));

  const iCompanyName = h('company name');
  const iCompanyId   = h('company id');
  const iYearStyle   = h('year style');
  const iFiscalYear  = h('fiscal year');
  const iPeriodType  = h('period type');
  const iQuarter     = h('quarter');
  const iPeriod      = h('period');
  const iRevenue     = h('revenue');
  const iArr         = h('arr');
  const iMrr         = h('mrr');
  const iGmv         = h('gmv');
  const iRevGrowth   = h('revenue growth');
  const iArrGrowth   = h('arr growth');
  const iNrr         = h('nrr');
  const iChurn       = h('churn');
  const iGm          = h('gross margin');
  const iEbitda      = h('ebitda margin');
  const iNetM        = h('net margin');
  const iVal         = h('valuation');
  const iMoic        = h('moic');
  const iIrr         = h('irr');
  const iMethod      = h('methodology');
  const iHead        = h('headcount');
  const iBurn        = h('burn');
  const iCash        = h('cash');
  const iRunway      = h('runway');
  const iCac         = h('cac');
  const iLtv         = h('ltv');
  const iLtvCac      = h('ltv:cac');
  const iNotes       = h('notes');
  const iSource      = h('source');
  const iUpdBy       = h('updated by');
  const iUpdAt       = h('updated at');

  const nameMap = buildNameMap(companies);
  const upserted: CompanyFinancialPeriod[] = [];
  const errors: string[] = [];
  const now = new Date().toISOString();

  dataRows.forEach((row, idx) => {
    const companyId = resolveCompanyId(
      s(row[iCompanyName]),
      s(row[iCompanyId]),
      nameMap,
      companies,
    );
    if (!companyId) {
      errors.push(`Row ${idx + 2}: unknown company "${s(row[iCompanyName]) || s(row[iCompanyId])}"`);
      return;
    }

    const yearStyle  = (s(row[iYearStyle]) || 'FY') as YearStyle;
    const fiscalYear = s(row[iFiscalYear]);
    const quarter    = (s(row[iQuarter]) || undefined) as FYQuarter | undefined;
    const periodType = (s(row[iPeriodType]) || (quarter ? 'quarterly' : 'annual')) as PeriodType;
    const periodLabel = s(row[iPeriod]) || (quarter ? `${fiscalYear}-${quarter}` : `${fiscalYear}-Annual`);

    if (!fiscalYear) {
      errors.push(`Row ${idx + 2}: missing Fiscal Year`);
      return;
    }

    // Composite key dedup
    const existing_ = existing.find(p =>
      p.companyId === companyId &&
      p.yearStyle === yearStyle &&
      p.fiscalYear === fiscalYear &&
      (p.quarter ?? '') === (quarter ?? ''),
    );

    upserted.push({
      id:               existing_?.id ?? makeId(),
      companyId,
      yearStyle,
      fiscalYear,
      periodType,
      quarter,
      periodLabel,
      revenue:          s(row[iRevenue]),
      arr:              s(row[iArr]),
      mrr:              s(row[iMrr]),
      gmv:              s(row[iGmv]),
      revenueGrowthYoY: s(row[iRevGrowth]),
      arrGrowthYoY:     s(row[iArrGrowth]),
      nrr:              s(row[iNrr]),
      churnPct:         s(row[iChurn]),
      grossMarginPct:   s(row[iGm]),
      ebitdaMarginPct:  s(row[iEbitda]),
      netMarginPct:     s(row[iNetM]),
      currentValuation: s(row[iVal]),
      moic:             s(row[iMoic]),
      irr:              s(row[iIrr]),
      methodology:      s(row[iMethod]),
      headcount:        n(row[iHead]),
      monthlyBurn:      s(row[iBurn]),
      cash:             s(row[iCash]),
      runway:           s(row[iRunway]),
      cac:              s(row[iCac]),
      ltv:              s(row[iLtv]),
      ltvCacRatio:      s(row[iLtvCac]),
      notes:            s(row[iNotes]),
      source:           s(row[iSource]) || 'CSV Import',
      updatedBy:        s(row[iUpdBy]) || 'CSV Import',
      updatedAt:        s(row[iUpdAt]) || now,
      createdAt:        existing_?.createdAt ?? now,
    });
  });

  return { upserted, errors, total: dataRows.length };
}

// ── 2. Company Health ─────────────────────────────────────────────────────────
// Headers: Company Name, Company ID, Quarter,
//          Revenue Growth Signal, Burn Signal, Team Retention Signal,
//          Product Progress Signal, Fundraising Signal, Overall Signal,
//          Notes, Reviewed By, Reviewed At

export function parseCompanyHealth(
  rows: string[][],
  companies: PortfolioCompany[],
  existing: CompanyHealth[],
): ImportResult<CompanyHealth> {
  if (rows.length < 2) return { upserted: [], errors: ['No data rows found'], total: 0 };
  const [header, ...dataRows] = rows;
  const h = (l: string) => header.findIndex(c => c.toLowerCase().includes(l.toLowerCase()));

  const iName    = h('company name');
  const iId      = h('company id');
  const iQuarter = h('quarter');
  const iRev     = h('revenue growth');
  const iBurn    = h('burn');
  const iTeam    = h('team retention');
  const iProd    = h('product progress');
  const iFund    = h('fundraising');
  const iOver    = h('overall');
  const iNotes   = h('notes');
  const iRevBy   = h('reviewed by');
  const iRevAt   = h('reviewed at');

  const nameMap = buildNameMap(companies);
  const upserted: CompanyHealth[] = [];
  const errors: string[] = [];
  const now = new Date().toISOString().slice(0, 10);
  const SIGNALS: HealthSignal[] = ['green', 'amber', 'red', 'grey'];
  const toSignal = (v: string): HealthSignal =>
    (SIGNALS.includes(v.toLowerCase() as HealthSignal) ? v.toLowerCase() : 'grey') as HealthSignal;

  dataRows.forEach((row, idx) => {
    const companyId = resolveCompanyId(s(row[iName]), s(row[iId]), nameMap, companies);
    if (!companyId) { errors.push(`Row ${idx + 2}: unknown company "${s(row[iName])}"`); return; }
    const quarter = s(row[iQuarter]);
    if (!quarter) { errors.push(`Row ${idx + 2}: missing Quarter`); return; }

    const ex = existing.find(x => x.companyId === companyId && x.quarter === quarter);

    upserted.push({
      id:              ex?.id ?? makeId(),
      companyId,
      quarter,
      revenueGrowth:   toSignal(s(row[iRev])),
      burn:            toSignal(s(row[iBurn])),
      teamRetention:   toSignal(s(row[iTeam])),
      productProgress: toSignal(s(row[iProd])),
      fundraising:     toSignal(s(row[iFund])),
      overallSignal:   toSignal(s(row[iOver])),
      notes:           s(row[iNotes]),
      reviewedBy:      s(row[iRevBy]) || 'CSV Import',
      reviewedAt:      s(row[iRevAt]) || now,
    });
  });

  return { upserted, errors, total: dataRows.length };
}

// ── 3. Portfolio Updates ──────────────────────────────────────────────────────
// Headers: Company Name, Month (YYYY-MM), Status, Revenue, Burn, Cash, Headcount,
//          Highlights, Challenges, Asks, Next Month Goals, Submitted By

export function parsePortfolioUpdates(
  rows: string[][],
  companies: PortfolioCompany[],
  existing: PortfolioUpdate[],
): ImportResult<PortfolioUpdate> {
  if (rows.length < 2) return { upserted: [], errors: ['No data rows found'], total: 0 };
  const [header, ...dataRows] = rows;
  const h = (l: string) => header.findIndex(c => c.toLowerCase().includes(l.toLowerCase()));

  const iName    = h('company name');
  const iMonth   = h('month');
  const iStatus  = h('status');
  const iRev     = h('revenue');
  const iBurn    = h('burn');
  const iCash    = h('cash');
  const iHead    = h('headcount');
  const iHighl   = h('highlights');
  const iChall   = h('challenges');
  const iAsks    = h('asks');
  const iGoals   = h('next month');
  const iBy      = h('submitted');

  const nameMap = buildNameMap(companies);
  const upserted: PortfolioUpdate[] = [];
  const errors: string[] = [];
  const now = new Date().toISOString();

  dataRows.forEach((row, idx) => {
    const companyId = resolveCompanyId(s(row[iName]), '', nameMap, companies);
    if (!companyId) { errors.push(`Row ${idx + 2}: unknown company "${s(row[iName])}"`); return; }
    const month = s(row[iMonth]);
    if (!month) { errors.push(`Row ${idx + 2}: missing Month`); return; }

    const ex = existing.find(x => x.companyId === companyId && x.month === month);
    const status = (['submitted', 'reviewed', 'pending'].includes(s(row[iStatus]).toLowerCase())
      ? s(row[iStatus]).toLowerCase()
      : 'submitted') as PortfolioUpdate['status'];

    upserted.push({
      id:             ex?.id ?? makeId(),
      companyId,
      month,
      status,
      revenue:        s(row[iRev]),
      burn:           s(row[iBurn]),
      cash:           s(row[iCash]),
      headcount:      n(row[iHead]),
      highlights:     s(row[iHighl]),
      challenges:     s(row[iChall]),
      asks:           s(row[iAsks]),
      nextMonthGoals: s(row[iGoals]),
      submittedBy:    s(row[iBy]) || 'CSV Import',
      createdAt:      ex?.createdAt ?? now,
    });
  });

  return { upserted, errors, total: dataRows.length };
}

// ── 4. Founder Contacts ───────────────────────────────────────────────────────
// Headers: Company Name, Name, Role, Email, Phone, LinkedIn URL, Twitter/X URL,
//          Birthday, Location, Last Contacted, Tags, Notes

export function parseFounderContacts(
  rows: string[][],
  companies: PortfolioCompany[],
  existing: FounderContact[],
): ImportResult<FounderContact> {
  if (rows.length < 2) return { upserted: [], errors: ['No data rows found'], total: 0 };
  const [header, ...dataRows] = rows;
  const h = (l: string) => header.findIndex(c => c.toLowerCase().includes(l.toLowerCase()));

  const iCompany  = h('company name');
  const iName     = h('name');
  const iRole     = h('role');
  const iEmail    = h('email');
  const iPhone    = h('phone');
  const iLinkedIn = h('linkedin');
  const iTwitter  = h('twitter');
  const iBday     = h('birthday');
  const iLoc      = h('location');
  const iLast     = h('last contacted');
  const iTags     = h('tags');
  const iNotes    = h('notes');

  const nameMap = buildNameMap(companies);
  const upserted: FounderContact[] = [];
  const errors: string[] = [];

  dataRows.forEach((row, idx) => {
    const companyId = resolveCompanyId(s(row[iCompany]), '', nameMap, companies);
    if (!companyId) { errors.push(`Row ${idx + 2}: unknown company "${s(row[iCompany])}"`); return; }
    const email = s(row[iEmail]);

    // Dedup by companyId + email, or by name if no email
    const ex = email
      ? existing.find(x => x.companyId === companyId && x.email === email)
      : existing.find(x => x.companyId === companyId && x.name === s(row[iName]));

    upserted.push({
      id:             ex?.id ?? makeId(),
      companyId,
      name:           s(row[iName]),
      role:           s(row[iRole]),
      email,
      phone:          s(row[iPhone]),
      linkedInUrl:    s(row[iLinkedIn]),
      twitterUrl:     s(row[iTwitter]),
      birthday:       s(row[iBday]) || undefined,
      location:       s(row[iLoc]),
      lastContactedAt: s(row[iLast]) || undefined,
      tags:           s(row[iTags]).split(',').map(t => t.trim()).filter(Boolean),
      notes:          s(row[iNotes]),
    });
  });

  return { upserted, errors, total: dataRows.length };
}

// ── 5. Valuation Marks ────────────────────────────────────────────────────────
// Headers: Company Name, Quarter, FMV (₹Cr), Methodology, MOIC at Mark, Notes, Marked By, Marked At

export function parseValuationMarks(
  rows: string[][],
  companies: PortfolioCompany[],
  existing: ValuationMark[],
): ImportResult<ValuationMark> {
  if (rows.length < 2) return { upserted: [], errors: ['No data rows found'], total: 0 };
  const [header, ...dataRows] = rows;
  const h = (l: string) => header.findIndex(c => c.toLowerCase().includes(l.toLowerCase()));

  const iName    = h('company name');
  const iQuarter = h('quarter');
  const iFmv     = h('fmv');
  const iMethod  = h('methodology');
  const iMoic    = h('moic');
  const iNotes   = h('notes');
  const iBy      = h('marked by');
  const iAt      = h('marked at');

  const nameMap = buildNameMap(companies);
  const upserted: ValuationMark[] = [];
  const errors: string[] = [];
  const now = new Date().toISOString().slice(0, 10);

  dataRows.forEach((row, idx) => {
    const companyId = resolveCompanyId(s(row[iName]), '', nameMap, companies);
    if (!companyId) { errors.push(`Row ${idx + 2}: unknown company "${s(row[iName])}"`); return; }
    const quarter = s(row[iQuarter]);
    if (!quarter) { errors.push(`Row ${idx + 2}: missing Quarter`); return; }

    const ex = existing.find(x => x.companyId === companyId && x.quarter === quarter);

    upserted.push({
      id:          ex?.id ?? makeId(),
      companyId,
      quarter,
      fmv:         s(row[iFmv]),
      methodology: s(row[iMethod]),
      moicAtMark:  n(row[iMoic]),
      notes:       s(row[iNotes]),
      markedBy:    s(row[iBy]) || 'CSV Import',
      markedAt:    s(row[iAt]) || now,
    });
  });

  return { upserted, errors, total: dataRows.length };
}

// ── 6. Company Metrics (top-level company fields) ─────────────────────────────
// Headers: Company Name, Revenue (₹Cr), Valuation (₹Cr), MOIC, IRR (%),
//          Ownership %, Status, CEO Name, HQ City, Employees, EBITDA (₹Cr)

export interface CompanyMetricPatch {
  id: string;
  name: string;
  revenue?: string;
  currentValuation?: string;
  moic?: number;
  irr?: number;
  ownershipPct?: number;
  status?: CompanyStatus;
  ceoName?: string;
  hqCity?: string;
  employees?: number;
  ebitda?: string;
}

export function parseCompanyMetrics(
  rows: string[][],
  companies: PortfolioCompany[],
): ImportResult<CompanyMetricPatch> {
  if (rows.length < 2) return { upserted: [], errors: ['No data rows found'], total: 0 };
  const [header, ...dataRows] = rows;
  const h = (l: string) => header.findIndex(c => c.toLowerCase().includes(l.toLowerCase()));

  const iName  = h('company name');
  const iRev   = h('revenue');
  const iVal   = h('valuation');
  const iMoic  = h('moic');
  const iIrr   = h('irr');
  const iOwn   = h('ownership');
  const iStat  = h('status');
  const iCeo   = h('ceo');
  const iHq    = h('hq');
  const iEmp   = h('employees');
  const iEbt   = h('ebitda');

  const nameMap = buildNameMap(companies);
  const upserted: CompanyMetricPatch[] = [];
  const errors: string[] = [];
  const STATUSES: CompanyStatus[] = ['Active', 'Exited', 'Watch'];

  dataRows.forEach((row, idx) => {
    const companyId = resolveCompanyId(s(row[iName]), '', nameMap, companies);
    if (!companyId) { errors.push(`Row ${idx + 2}: unknown company "${s(row[iName])}"`); return; }

    const patch: CompanyMetricPatch = { id: companyId, name: s(row[iName]) };
    if (iRev  >= 0 && s(row[iRev]))  patch.revenue         = s(row[iRev]);
    if (iVal  >= 0 && s(row[iVal]))  patch.currentValuation = s(row[iVal]);
    if (iMoic >= 0 && s(row[iMoic])) patch.moic            = n(row[iMoic]);
    if (iIrr  >= 0 && s(row[iIrr]))  patch.irr             = n(row[iIrr]);
    if (iOwn  >= 0 && s(row[iOwn]))  patch.ownershipPct    = n(row[iOwn]);
    if (iStat >= 0 && s(row[iStat])) {
      const st = s(row[iStat]) as CompanyStatus;
      if (STATUSES.includes(st)) patch.status = st;
    }
    if (iCeo >= 0 && s(row[iCeo])) patch.ceoName   = s(row[iCeo]);
    if (iHq  >= 0 && s(row[iHq]))  patch.hqCity    = s(row[iHq]);
    if (iEmp >= 0 && s(row[iEmp])) patch.employees = n(row[iEmp]);
    if (iEbt >= 0 && s(row[iEbt])) patch.ebitda    = s(row[iEbt]);

    upserted.push(patch);
  });

  return { upserted, errors, total: dataRows.length };
}
