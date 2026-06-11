// Shared source of truth for VC Toolkit tool definitions.
// VCToolkitPage and ToolkitManager both import from here.
// The store (toolkitTools) acts as an override layer — any field saved via admin overwrites these defaults.

export type ToolCatId = 'ibank' | 'fundraising' | 'valuation' | 'uniteco' | 'market' | 'operations' | 'exit';

export interface ToolDefinition {
  id: string;
  catId: ToolCatId;
  category: string;
  name: string;
  tag: 'Built' | 'To build';
  description: string;
  inputs: string[];
  outputs: string[];
}

export const TOOL_CATS: { id: ToolCatId; label: string; color: string }[] = [
  { id: 'ibank',       label: 'Transaction Advisors', color: '#185FA5' },
  { id: 'fundraising', label: 'Fundraising',          color: '#0F6E56' },
  { id: 'valuation',   label: 'Valuation',             color: '#534AB7' },
  { id: 'uniteco',     label: 'Unit Economics',        color: '#854F0B' },
  { id: 'market',      label: 'Market & Competitive',  color: '#993C1D' },
  { id: 'operations',  label: 'Operational Health',    color: '#3B6D11' },
  { id: 'exit',        label: 'Exit & Secondary',      color: '#993556' },
];

export const TOOLKIT_BASE: ToolDefinition[] = [
  { id: 'ibank-rec', catId: 'ibank', category: 'Transaction Advisors', name: 'IBank advisor recommender', tag: 'Built',
    description: 'Find top 5–10 transaction advisors by sector, deal size, and FY — scored on min-max normalised deals, amount, and avg deal size.',
    inputs: ['Target sector (multi-select)', 'Deal size in USD M', 'FY weights 2024/25/26', 'Table weight: overview vs sector', 'Column weights: deals / amount / avg deal'],
    outputs: ['Top 10 advisor league with match %', 'Per-FY breakdown of normalised scores', 'Size filter pass/fail per advisor', 'Sub-sector keyword match bonus'] },
  { id: 'ibank-upload', catId: 'ibank', category: 'Transaction Advisors', name: 'VI data uploader', tag: 'Built',
    description: 'Upload year-wise Venture Intelligence Excel sheets with column mapping, persistent storage, and TypeScript export.',
    inputs: ['Excel / CSV file (drag-drop)', 'Table type: Overview or Sector', 'Financial year', 'Column mapper: name / deals / amount'],
    outputs: ['Parsed preview table', 'Mapped advisor rows with avg deal', 'Persistent cross-session storage', 'data.ts export for Lovable project'] },
  { id: 'legal-advisor', catId: 'ibank', category: 'Transaction Advisors', name: 'Legal advisor tracker', tag: 'To build',
    description: 'Track which law firms have advised on deals in your sector, deal size range, and jurisdiction — scored the same way as transaction advisors.',
    inputs: ['Sector + deal size', 'Jurisdiction (India / cross-border)', 'Deal type: PE / M&A / IPO', 'Firm preference (Big Four / boutique)'],
    outputs: ['Top 5 law firms with deal history', 'Per-firm avg deal size and deal count', 'Conflict-of-interest flag', 'Fee range benchmarks by deal size'] },

  { id: 'investor-ready', catId: 'fundraising', category: 'Fundraising', name: 'Investor readiness scorecard', tag: 'To build',
    description: 'Score a portfolio company across 8 dimensions to assess if they are ready to raise — gives an overall readiness % and flags gaps.',
    inputs: ['Team completeness (CXO coverage)', 'Revenue trajectory (MoM consistency)', 'Unit economics (LTV/CAC, payback)', 'Market size evidence (TAM/SAM)', 'Product differentiation score', 'Customer concentration risk', 'Data room completeness checklist', 'Narrative coherence (1-sentence test)'],
    outputs: ['Readiness score 0–100', 'Red / amber / green per dimension', 'Gap list with fix recommendations', 'Estimated weeks to raise-ready'] },
  { id: 'pitch-eval', catId: 'fundraising', category: 'Fundraising', name: 'Pitch deck evaluator', tag: 'To build',
    description: 'Structured framework to evaluate an incoming pitch deck or help a portfolio company improve theirs before going to investors.',
    inputs: ['Problem slide: clarity + pain evidence', 'Solution: differentiation vs alternatives', 'Market: TAM method + defensibility', 'Business model: revenue mechanics', 'Traction: key milestones hit', 'Team: domain expertise + relevant exits', 'Ask: round size + use of funds', 'Financials: 18-month plan + assumptions'],
    outputs: ['Slide-by-slide score', 'Investor objection forecast', 'Missing slide detector', 'Recommended order and narrative arc'] },
  { id: 'investor-crm', catId: 'fundraising', category: 'Fundraising', name: 'Investor pipeline CRM', tag: 'To build',
    description: "Track every investor across the funnel for a portfolio company's raise — from warm intro to signed term sheet.",
    inputs: ['Investor name + fund', 'Stage: sourced / intro / meeting / diligence / TS / closed', 'Check size range', 'Lead vs follow capacity', 'Intro source (warm / cold)', 'Last touchpoint + notes'],
    outputs: ['Funnel conversion by stage', 'Days-in-stage heatmap', 'Soft-commit tracker vs target raise', 'Recommended next 5 intros based on profile match'] },
  { id: 'ts-compare', catId: 'fundraising', category: 'Fundraising', name: 'Term sheet comparator', tag: 'To build',
    description: 'Side-by-side comparison of competing term sheets across all economic and control terms — highlights founder-unfriendly clauses.',
    inputs: ['Pre-money valuation', 'Liquidation preference (1× / 2× / participating)', 'Anti-dilution (broad / narrow / full ratchet)', 'Option pool size + timing', 'Board composition', 'Pro-rata rights', 'Information rights', 'Protective provisions'],
    outputs: ['Side-by-side term comparison', 'Founder-friendliness score per TS', 'Dilution impact at exit (waterfall preview)', 'Recommended negotiation points'] },
  { id: 'round-size', catId: 'fundraising', category: 'Fundraising', name: 'Round sizing calculator', tag: 'To build',
    description: 'Calculate the right round size based on runway target, milestone plan, and valuation expectations.',
    inputs: ['Current monthly burn', 'Target runway (months)', 'Planned headcount additions', 'Key milestones to fund (product / revenue / geo)', 'Target valuation at next round', 'Acceptable dilution range'],
    outputs: ['Recommended raise amount', 'Use of funds breakdown (%)', 'Post-money valuation at target ownership', 'Months to next raise at current burn + growth'] },

  { id: 'venture-val', catId: 'valuation', category: 'Valuation', name: 'Venture method valuation', tag: 'To build',
    description: 'Bottom-up valuation using the VC method — works backwards from exit value to determine acceptable entry valuation.',
    inputs: ['Target exit year (3–7 yrs)', 'Exit revenue multiple (sector benchmark)', 'Projected revenue at exit', 'Target fund MOIC (3× / 5× / 10×)', 'Dilution through future rounds (%)', 'Current stage and check size'],
    outputs: ['Maximum acceptable pre-money today', 'Post-money valuation', 'Implied ownership needed', 'MOIC sensitivity table (best / base / bear)'] },
  { id: 'comps-val', catId: 'valuation', category: 'Valuation', name: 'Comparable company analysis', tag: 'To build',
    description: 'Build a comparables set for any portfolio company — pull sector revenue multiples and benchmark current valuation against peers.',
    inputs: ['Sector + sub-sector', 'Stage + geography filter', 'Comparable companies (name + last round)', 'Current ARR / GMV / Revenue', 'Last round valuation', 'Growth rate'],
    outputs: ['Revenue multiple vs comps (EV/ARR)', 'Percentile rank in comp set', 'Premium / discount to median', 'Suggested valuation range based on growth-adjusted comps'] },
  { id: 'moic-tracker', catId: 'valuation', category: 'Valuation', name: 'MOIC & IRR tracker', tag: 'To build',
    description: 'Track realised and unrealised returns per company and across the fund — updated at every funding round mark.',
    inputs: ['Investment date + cost basis', 'All follow-on amounts + dates', 'Current fair value mark', 'Exit proceeds (if realised)', 'Pro-rata adjustments'],
    outputs: ['MOIC per company (realised + unrealised)', 'IRR per company', 'Portfolio-level TVPI / RVPI / DPI', 'Fund waterfall preview at current marks'] },
  { id: 'cap-table', catId: 'valuation', category: 'Valuation', name: 'Cap table & dilution model', tag: 'To build',
    description: 'Model cap table through future rounds — simulate dilution, option pool expansion, and liquidation waterfall.',
    inputs: ['Current cap table (shares per holder)', 'New round: pre-money + round size', 'Option pool top-up', 'Liquidation preference per class', 'Exit price (multiple scenarios)'],
    outputs: ['Post-round ownership by holder', 'Dilution waterfall per round', 'Proceeds by holder at exit (3 scenarios)', 'Anti-dilution trigger analysis'] },

  { id: 'ltv-cac', catId: 'uniteco', category: 'Unit Economics', name: 'LTV / CAC analyser', tag: 'To build',
    description: 'Calculate LTV, CAC, payback period, and LTV:CAC ratio — benchmark against sector norms and flag deterioration trends.',
    inputs: ['ARPU (average revenue per user)', 'Gross margin %', 'Monthly / annual churn rate', 'Blended CAC by channel', 'Sales cycle length', 'Expansion revenue (upsell %)'],
    outputs: ['LTV / CAC ratio (flag if < 3×)', 'Payback period in months (flag if > 18)', 'Blended vs channel CAC breakdown', 'LTV sensitivity to churn (±1%)'] },
  { id: 'burn-multiple', catId: 'uniteco', category: 'Unit Economics', name: 'Burn multiple calculator', tag: 'To build',
    description: 'Burn multiple = net burn / net new ARR. The single most important efficiency metric for growth-stage companies.',
    inputs: ['Net burn per month', 'New ARR added this month', 'Churned ARR this month', 'Expansion ARR this month', 'Headcount by function'],
    outputs: ['Burn multiple (flag if > 2× at Series B)', 'Benchmark vs stage peers', 'Burn per FTE by function', 'Efficiency improvement needed to hit target'] },
  { id: 'rule40', catId: 'uniteco', category: 'Unit Economics', name: 'Rule of 40', tag: 'To build',
    description: 'Revenue growth % + EBITDA margin % — the core SaaS health metric. Track trend over 8 quarters and benchmark against public comparables.',
    inputs: ['ARR this quarter + last 8 quarters', 'EBITDA or FCF margin per quarter', 'Public comp set (Bessemer Cloud Index)'],
    outputs: ['Rule of 40 score per quarter', 'Trend chart (8Q)', 'Percentile vs public SaaS peers', 'Growth vs profitability decomposition'] },
  { id: 'cohort', catId: 'uniteco', category: 'Unit Economics', name: 'Cohort retention analyser', tag: 'To build',
    description: 'Upload monthly cohort data and visualise retention curves — identify when churn stabilises and which cohorts perform best.',
    inputs: ['Monthly cohort CSV (month × cohort matrix)', 'Revenue or user retention toggle', 'Segment filter (plan / geo / channel)'],
    outputs: ['Cohort heatmap (colour-coded by retention %)', 'Retention curve overlay (all cohorts)', 'Month-N retention benchmark', 'Average stabilised retention prediction'] },
  { id: 'nrr', catId: 'uniteco', category: 'Unit Economics', name: 'NRR / GRR dashboard', tag: 'To build',
    description: 'Net Revenue Retention and Gross Revenue Retention — the definitive indicators of product stickiness and pricing power.',
    inputs: ['Starting ARR (beginning of period)', 'Expansion ARR (upsells + seat adds)', 'Contraction ARR (downgrades)', 'Churned ARR', 'Customer segment breakdown'],
    outputs: ['NRR % and GRR % (flag if NRR < 100%)', 'Expansion vs churn waterfall chart', 'Rolling 12-month NRR trend', 'Benchmark vs SaaS stage peers'] },
  { id: 'magic-number', catId: 'uniteco', category: 'Unit Economics', name: 'Magic number', tag: 'To build',
    description: 'Magic number = net new ARR × 4 / prior-quarter S&M spend. Measures how efficiently sales spend converts to recurring revenue.',
    inputs: ['Net new ARR this quarter', 'S&M spend last quarter', 'Headcount: sales vs marketing split', 'Blended S&M cost per head'],
    outputs: ['Magic number (flag if < 0.75)', 'Trend over 6 quarters', 'Sales efficiency by segment', 'Implied S&M budget for ARR target'] },

  { id: 'tam-sizing', catId: 'market', category: 'Market & Competitive', name: 'TAM / SAM / SOM model', tag: 'To build',
    description: 'Build defensible market sizing using both top-down (industry reports) and bottom-up (customers × ARPU) methods — critical for IC memos.',
    inputs: ['Industry: total market size (top-down)', 'Target customer segment definition', 'Addressable customers (count)', 'Average contract value or ARPU', 'Win rate assumption', 'Geographic scope'],
    outputs: ['TAM / SAM / SOM with methodology note', 'Top-down vs bottom-up reconciliation', 'Market share needed to hit $X ARR', 'Penetration rate benchmark vs peers'] },
  { id: 'competitive', catId: 'market', category: 'Market & Competitive', name: 'Competitive positioning matrix', tag: 'To build',
    description: "2×2 and feature-comparison matrix to map a portfolio company's position vs direct and indirect competitors.",
    inputs: ['Competitor list (up to 12)', 'X axis: price / market segment / tech', 'Y axis: feature depth / scale / margin', 'Feature checklist (up to 20 features)'],
    outputs: ['2×2 scatter plot with company positions', 'Feature comparison table (green/red cells)', 'Differentiation score per competitor', 'White space opportunity map'] },
  { id: 'pmf', catId: 'market', category: 'Market & Competitive', name: 'PMF scorecard', tag: 'To build',
    description: 'Measure product-market fit using the Sean Ellis test, NPS, and organic growth signals — helps analysts judge whether a company has found PMF.',
    inputs: ['Sean Ellis score (% "very disappointed")', 'NPS score + trend', 'Organic vs paid traffic ratio', 'Word-of-mouth growth rate', 'Retention at month 1 / 3 / 6', 'Support ticket volume per MAU'],
    outputs: ['PMF confidence score (0–100)', 'Signal breakdown by category', 'Red flags: which signals lag', 'Recommendation: lead / wait / pass'] },
  { id: 'category-def', catId: 'market', category: 'Market & Competitive', name: 'Category definition framework', tag: 'To build',
    description: "Assess whether a company is creating a new category or competing in an existing one — determines narrative strategy and investor positioning.",
    inputs: ['How customers describe the problem today', 'Existing solution categories in market', "Company's proposed category name", 'Evangelical customers (count + profile)', 'Analyst coverage: existing category or new?'],
    outputs: ['Category type: new / sub / existing', 'Narrative strength score', 'Category creation risk vs reward analysis', 'Recommended investor narrative frame'] },

  { id: 'kpi-tracker', catId: 'operations', category: 'Operational Health', name: 'KPI tracker & milestone log', tag: 'To build',
    description: 'Structured monthly KPI submission from portfolio companies — actual vs target, trend sparklines, and auto-alerts on miss or no-data.',
    inputs: ['Company-specific KPI set (agreed at investment)', 'Monthly submission (actual values)', 'Milestone plan from IC memo', 'Analyst notes per company'],
    outputs: ['Traffic-light per KPI (above / on plan / miss / no data)', 'Trend sparklines (6 months)', 'Auto-alert: 2+ months miss or data overdue', 'Portfolio-wide KPI health heatmap'] },
  { id: 'board-prep', catId: 'operations', category: 'Operational Health', name: 'Board meeting prep template', tag: 'To build',
    description: 'Standardised pre-board pack — pulls live KPI data, open action items, and generates talking points for the investor director attending.',
    inputs: ['Company + board date', 'KPI actuals vs plan', 'Open action items (from last board)', 'Fundraising status', 'Key hires in progress', 'Risks to flag to board'],
    outputs: ['One-page board summary (PDF-ready)', 'Action item status (open / closed / overdue)', 'Recommended agenda with time allocation', 'Questions for management to prepare'] },
  { id: 'runway-alert', catId: 'operations', category: 'Operational Health', name: 'Runway & burn monitor', tag: 'To build',
    description: 'Auto-calculated runway from cash balance and burn rate — with scenario modelling for cut and growth-mode burn, and alert triggers.',
    inputs: ['Cash balance (current month)', 'Net burn (last 3-month average)', 'Planned increases in burn (hires)', 'Receivables / prepaid not yet in bank'],
    outputs: ['Runway in months (base / conservative)', 'Month when cash reaches ₹50L (trigger)', 'Burn scenario: cut to 12 months vs maintain', 'Alert: when to start raise process (6 months before)'] },
  { id: 'okr', catId: 'operations', category: 'Operational Health', name: 'OKR tracking framework', tag: 'To build',
    description: 'Track quarterly OKRs across portfolio companies — holds founders accountable on the objectives agreed at the last board meeting.',
    inputs: ['Company OKR set (Q objectives + key results)', 'Scoring: 0.0 to 1.0 per KR', 'Carry-forward from last quarter', 'Analyst commentary'],
    outputs: ['OKR score per company (avg KR score)', 'Quarter-on-quarter trend', 'Mis-set objectives detector (all scored 1.0 = gaming)', 'Cross-portfolio OKR health summary'] },
  { id: 'founder-eng', catId: 'operations', category: 'Operational Health', name: 'Founder engagement log', tag: 'To build',
    description: 'Log every touchpoint with founders and key C-suite — tracks recency, topic, and follow-up actions. Flags when a company goes silent.',
    inputs: ['Company + contact (name + role)', 'Touchpoint type: 1:1 / board / intro / escalation', 'Date + summary note', 'Action items triggered', 'Assigned analyst'],
    outputs: ['Days since last touchpoint (red if > 30)', 'Touchpoint frequency trend', 'Open action items per company', 'Portfolio-wide engagement health score'] },

  { id: 'exit-ready', catId: 'exit', category: 'Exit & Secondary', name: 'Exit readiness assessment', tag: 'To build',
    description: 'Score a company on strategic acquirer attractiveness, IPO readiness, and secondary market appeal — produces an exit pathway recommendation.',
    inputs: ['Revenue scale + growth rate', 'Profitability trajectory', 'Comparable exit multiples (M&A + IPO)', 'Strategic buyer universe (named)', 'Management team: public-company ready?', 'Data room completeness'],
    outputs: ['Exit pathway score: M&A / IPO / secondary', 'Acquirer shortlist with strategic rationale', 'Exit value range at current and 2-year trajectory', 'Time-to-exit estimate per pathway'] },
  { id: 'secondary', catId: 'exit', category: 'Exit & Secondary', name: 'Secondary transaction analyser', tag: 'To build',
    description: 'Evaluate secondary sale requests from founders / employees — assess pricing vs last round, fund impact, and signal risk.',
    inputs: ['Last primary round valuation', 'Proposed secondary price', 'Seller: founder / employee / early investor', '% of ownership being sold', 'Time since last round', 'Comparable secondary market comps'],
    outputs: ['Discount / premium vs last round', 'MOIC impact on fund at secondary price', 'Signal risk assessment (why selling?)', 'Recommended: approve / counter / decline'] },
  { id: 'follow-on', catId: 'exit', category: 'Exit & Secondary', name: 'Follow-on decision framework', tag: 'To build',
    description: 'Structured IC-grade framework for every follow-on decision — conviction score, reserve capacity check, and dilution impact.',
    inputs: ['Company health score (KPI trend)', 'New round terms: pre-money + size', 'Current ownership + pro-rata right', 'Reserve available vs deployed', 'PMF confidence score', "Runway if we don't follow on"],
    outputs: ['Follow-on recommendation: lead / pro-rata / pass', 'Conviction score with component breakdown', 'Ownership post-round (if we follow)', 'Fund reserve impact: % of dry powder used'] },
];

// Quick lookup by id
export const TOOLKIT_BASE_MAP = new Map(TOOLKIT_BASE.map(t => [t.id, t]));
