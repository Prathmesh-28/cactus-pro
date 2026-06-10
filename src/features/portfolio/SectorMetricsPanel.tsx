import { useState } from 'react';
import { ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';

interface Metric {
  name: string;
  abbr: string;
  tags: string[];
  formula: string;
  freq: string;
  benchmark: string;
  why: string;
}

interface MetricSection {
  label: string;
  metrics: Metric[];
}

// ─── Tag colours (static map — Tailwind purges dynamic strings) ───────────────

const TAG_STYLES: Record<string, string> = {
  growth:   'bg-emerald-50 text-emerald-700 border border-emerald-200',
  health:   'bg-lime-50 text-lime-700 border border-lime-200',
  unit:     'bg-violet-50 text-violet-700 border border-violet-200',
  ops:      'bg-amber-50 text-amber-700 border border-amber-200',
  risk:     'bg-red-50 text-red-700 border border-red-200',
  customer: 'bg-blue-50 text-blue-700 border border-blue-200',
  fin:      'bg-pink-50 text-pink-700 border border-pink-200',
};

// ─── Metric data by sector ────────────────────────────────────────────────────

const TECH_SECTIONS: MetricSection[] = [
  {
    label: 'Growth',
    metrics: [
      { name: 'ARR / MRR', abbr: 'Annual & Monthly Recurring Revenue', tags: ['growth','fin'],
        formula: 'MRR = sum of all active subscription revenue in the month',
        freq: 'Monthly', benchmark: 'Series A: >$1M ARR; good MoM growth: 10–15%',
        why: 'Primary top-line for any subscription business. Replaces revenue as the health signal.' },
      { name: 'MoM Revenue Growth', abbr: 'Month-on-month growth rate', tags: ['growth'],
        formula: '(MRR this month − MRR last month) / MRR last month × 100',
        freq: 'Monthly', benchmark: 'Early stage: 10–20% MoM; growth stage: 5–10%',
        why: 'Faster and more actionable than annual growth. Spot deceleration early.' },
      { name: 'ARR Growth (YoY)', abbr: 'Year-on-year ARR growth', tags: ['growth'],
        formula: '(ARR end of year − ARR start of year) / ARR start of year × 100',
        freq: 'Quarterly / Annual', benchmark: 'T2D3 rule: 3× in year 1–2, 2× in year 3–5',
        why: 'Used for fundraising benchmarking and comp analysis.' },
    ],
  },
  {
    label: 'Retention & Churn',
    metrics: [
      { name: 'Net Revenue Retention', abbr: 'NRR — expansion minus churn from existing base', tags: ['health','growth'],
        formula: '(Starting MRR + expansion − contraction − churn) / Starting MRR × 100',
        freq: 'Monthly', benchmark: 'Good: >100%; great: >120% (grows without new customers)',
        why: 'NRR >100% means the existing cohort alone grows revenue — best PMF indicator in B2B SaaS.' },
      { name: 'Gross Revenue Churn', abbr: 'GRC — lost MRR from cancellations/downgrades', tags: ['health','risk'],
        formula: 'MRR lost (cancels + downgrades) / MRR at start of period × 100',
        freq: 'Monthly', benchmark: 'Good: <1% monthly (<12% annual); great: <0.5%',
        why: 'The single most important SaaS health metric. High churn kills growth no matter how good acquisition is.' },
      { name: 'Logo Churn Rate', abbr: 'Customer count churn', tags: ['health','customer'],
        formula: 'Customers lost in period / Customers at start × 100',
        freq: 'Monthly', benchmark: 'SMB: <3% monthly; Mid-market: <1.5%; Enterprise: <0.5%',
        why: 'Distinct from revenue churn — a small customer churning is less bad than a large one. Track both.' },
    ],
  },
  {
    label: 'Unit Economics',
    metrics: [
      { name: 'LTV : CAC Ratio', abbr: 'Customer lifetime value vs acquisition cost', tags: ['unit','customer'],
        formula: 'LTV = ARPU / Gross churn rate; CAC = S&M spend / New customers',
        freq: 'Quarterly', benchmark: '>3× = healthy SaaS; >5× = strong',
        why: 'Tells you the ceiling on what you can spend to acquire a customer.' },
      { name: 'CAC Payback Period', abbr: 'Months to recover customer acquisition cost', tags: ['unit','fin'],
        formula: 'CAC / (ARPU × Gross margin %)',
        freq: 'Quarterly', benchmark: 'Best-in-class: <12 months; acceptable: <18 months',
        why: 'How long cash is locked up per customer. Shorter = better capital efficiency.' },
      { name: 'Magic Number', abbr: 'Sales efficiency ratio', tags: ['unit','growth'],
        formula: 'Net new ARR (quarter) / S&M spend (prior quarter)',
        freq: 'Quarterly', benchmark: '>0.75 = efficient; >1.0 = excellent; <0.5 = problem',
        why: 'Below 0.5 means over-investing in go-to-market relative to output.' },
    ],
  },
  {
    label: 'Profitability & Efficiency',
    metrics: [
      { name: 'Gross Margin', abbr: 'Revenue minus COGS as % of revenue', tags: ['fin','health'],
        formula: '(Revenue − COGS) / Revenue × 100',
        freq: 'Monthly', benchmark: 'SaaS target: >70%; pure software: >80%',
        why: 'Below 60% often indicates infrastructure/hosting cost problems or heavy services revenue.' },
      { name: 'Burn Multiple', abbr: 'Cash burned per ₹1 of net new ARR', tags: ['fin','risk'],
        formula: 'Net burn / Net new ARR',
        freq: 'Quarterly', benchmark: '<1× = great; 1–1.5× = good; >2× = concerning',
        why: 'Contextualises burn against the growth it\'s producing — replaces raw burn rate.' },
      { name: 'Rule of 40', abbr: 'Revenue growth % + EBITDA margin %', tags: ['fin','health'],
        formula: 'ARR growth rate (YoY %) + EBITDA margin (%)',
        freq: 'Annual / Quarterly', benchmark: '>40 = healthy; >60 = elite',
        why: 'Classic SaaS health benchmark. Balances growth and profitability in one number.' },
      { name: 'ARR per FTE', abbr: 'Headcount efficiency', tags: ['ops','fin'],
        formula: 'ARR / Total full-time headcount',
        freq: 'Quarterly', benchmark: 'Series B: $150K–$200K ARR/FTE; mature: $300K+',
        why: 'Proxy for organisational efficiency. Declining ratio signals over-hiring ahead of revenue.' },
    ],
  },
  {
    label: 'Product Engagement',
    metrics: [
      { name: 'DAU / MAU Ratio', abbr: 'Daily active / Monthly active users', tags: ['health','customer'],
        formula: 'DAU / MAU × 100',
        freq: 'Weekly', benchmark: '>20% = good engagement; >50% = excellent (Slack-level)',
        why: 'Stickiness metric. Low ratio means users sign up but don\'t habitually return.' },
      { name: 'Feature Adoption Rate', abbr: '% of customers using a specific feature', tags: ['health','customer'],
        formula: 'Customers using feature X / Total customers × 100',
        freq: 'Monthly', benchmark: 'Core features: >60%',
        why: 'Leading indicator of churn and expansion. Low adoption = customer not realising value.' },
    ],
  },
];

const CONSUMER_SECTIONS: MetricSection[] = [
  {
    label: 'Revenue & Growth',
    metrics: [
      { name: 'GMV', abbr: 'Gross Merchandise Value — total transaction value', tags: ['growth','fin'],
        formula: 'Sum of all orders at retail price (pre-returns, pre-discounts)',
        freq: 'Monthly', benchmark: 'Track MoM growth %; D2C target: 10–20% MoM early stage',
        why: 'Top-of-funnel health for commerce businesses. Revenue = GMV × take rate.' },
      { name: 'Net Revenue', abbr: 'Revenue after returns and discounts', tags: ['growth','fin'],
        formula: 'Gross revenue − returns − refunds − discounts',
        freq: 'Monthly', benchmark: 'Return rate benchmarks: apparel 20–30%; FMCG <5%',
        why: 'Gross revenue is misleading in consumer. Net revenue is what you actually keep.' },
      { name: 'Repeat Purchase Rate', abbr: 'RPR — % customers who buy again', tags: ['customer','health'],
        formula: 'Customers with 2+ orders / Total customers × 100',
        freq: 'Monthly (cohort)', benchmark: 'Good D2C: >30% within 90 days of first purchase',
        why: 'Core loyalty signal. Businesses with RPR >40% can build sustainable unit economics.' },
    ],
  },
  {
    label: 'Customer Economics',
    metrics: [
      { name: 'CAC', abbr: 'Customer Acquisition Cost — blended', tags: ['unit','fin'],
        formula: 'Total marketing + sales spend / New customers acquired',
        freq: 'Monthly', benchmark: 'CAC:LTV <1:3; CAC payback <6 months for D2C',
        why: 'For consumer brands, CAC is often dominated by paid social. Benchmark against LTV, not in isolation.' },
      { name: 'LTV', abbr: 'Customer Lifetime Value', tags: ['unit','customer'],
        formula: 'AOV × Purchase frequency × Gross margin × Avg customer lifespan',
        freq: 'Quarterly', benchmark: 'LTV:CAC >3× is minimum viable; >5× is healthy',
        why: 'Drives marketing budget decisions. Tells you how much to spend acquiring and retaining.' },
      { name: 'AOV', abbr: 'Average Order Value', tags: ['unit','customer'],
        formula: 'Net revenue / Number of orders',
        freq: 'Monthly', benchmark: 'Increasing AOV signals upsell/bundling success',
        why: 'Lever for improving unit economics without acquiring more customers.' },
      { name: 'Customer Churn Rate', abbr: '% of customers who stop buying', tags: ['risk','customer'],
        formula: 'Customers who did not repurchase within X days / Total customers',
        freq: 'Monthly (90/180-day window)', benchmark: 'Annual churn: FMCG <30%; premium D2C <20%',
        why: 'Define a clear window (e.g. 180 days no order = churned) for consistency.' },
    ],
  },
  {
    label: 'Profitability',
    metrics: [
      { name: 'Contribution Margin', abbr: 'Revenue minus all variable costs', tags: ['fin','unit'],
        formula: 'Net revenue − COGS − shipping − returns − payment fees − CAC',
        freq: 'Monthly', benchmark: 'Target >30% for sustainable D2C; below 20% is a warning',
        why: 'True profitability metric for consumer brands. Gross margin alone ignores shipping and CAC.' },
      { name: 'Gross Margin', abbr: 'Revenue minus product COGS', tags: ['fin','health'],
        formula: '(Net revenue − COGS) / Net revenue × 100',
        freq: 'Monthly', benchmark: 'FMCG: 40–60%; premium D2C: 60–75%',
        why: 'Ceiling on how profitable the business can become. Low gross margin = structurally hard to be profitable.' },
      { name: 'EBITDA Margin', abbr: 'Operating profitability as % of revenue', tags: ['fin','health'],
        formula: 'EBITDA / Net revenue × 100',
        freq: 'Quarterly', benchmark: 'Mature consumer brand: 10–20%; early stage often negative',
        why: 'Path to EBITDA positivity is the core LP narrative for consumer businesses.' },
    ],
  },
  {
    label: 'Channel & Operations',
    metrics: [
      { name: 'Channel Mix', abbr: 'D2C vs retail vs marketplace revenue split', tags: ['ops','growth'],
        formula: 'Revenue per channel / Total revenue × 100',
        freq: 'Monthly', benchmark: 'D2C share >50% = brand control; heavy marketplace = margin risk',
        why: 'D2C channels have higher margins and data. Heavy marketplace dependence compresses margins.' },
      { name: 'Inventory Turnover', abbr: 'How quickly inventory is sold', tags: ['ops','fin'],
        formula: 'COGS / Average inventory value',
        freq: 'Monthly', benchmark: 'FMCG: >8×/year; apparel: 4–6×; electronics: 6–8×',
        why: 'Low turnover = capital locked in stock, risk of obsolescence.' },
      { name: 'Return Rate', abbr: '% of orders returned', tags: ['ops','risk'],
        formula: 'Orders returned / Orders shipped × 100',
        freq: 'Monthly', benchmark: 'Apparel online: 20–30%; electronics: 10–15%; food: <5%',
        why: 'High return rate destroys unit economics — each return typically costs 2–3× the item value.' },
      { name: 'NPS', abbr: 'Net Promoter Score — customer satisfaction proxy', tags: ['customer','health'],
        formula: '% Promoters (9–10) − % Detractors (0–6)',
        freq: 'Quarterly', benchmark: 'Consumer brand: >40 is good; >60 is excellent',
        why: 'Leading indicator of organic growth (referrals) and churn risk.' },
    ],
  },
];

const MFG_SECTIONS: MetricSection[] = [
  {
    label: 'Revenue & Pipeline',
    metrics: [
      { name: 'Revenue Growth (YoY / QoQ)', abbr: 'Top-line growth rate', tags: ['growth','fin'],
        formula: '(Revenue this period − prior period) / prior period × 100',
        freq: 'Quarterly', benchmark: 'Industrial: 8–15% YoY healthy; deep-tech: 20–40%',
        why: 'Manufacturing revenue is lumpy (large contracts). QoQ trends are as important as YoY.' },
      { name: 'Order Book / Backlog', abbr: 'Confirmed orders not yet fulfilled', tags: ['growth','ops'],
        formula: 'Sum of confirmed purchase orders × contract value',
        freq: 'Monthly', benchmark: 'Backlog >3 months of revenue = visibility; >6 months = strong',
        why: 'Primary forward-looking indicator. Growing backlog = demand confidence. Shrinking = pipeline problem.' },
      { name: 'Contract Win Rate', abbr: '% of tenders / RFQs won', tags: ['growth','customer'],
        formula: 'Contracts won / Total RFQs submitted × 100',
        freq: 'Quarterly', benchmark: '25–40% typical in industrial B2B; below 20% is concerning',
        why: 'Indicates pricing competitiveness, PMF, and sales execution in B2B manufacturing.' },
      { name: 'Revenue Concentration', abbr: 'Top customer % of total revenue', tags: ['risk','customer'],
        formula: 'Top 1/3/5 customer revenue / Total revenue × 100',
        freq: 'Quarterly', benchmark: 'No single customer >20% of revenue (common VC threshold)',
        why: 'High concentration = key-customer risk. A single contract loss can materially impact the company.' },
    ],
  },
  {
    label: 'Operational Efficiency',
    metrics: [
      { name: 'Capacity Utilisation', abbr: '% of production capacity in use', tags: ['ops','health'],
        formula: 'Actual output / Maximum possible output × 100',
        freq: 'Monthly', benchmark: '>75% = healthy; <60% = over-invested; >90% = bottleneck risk',
        why: 'Low utilisation means fixed costs are under-absorbed. High without investment signals growth constraint.' },
      { name: 'OEE', abbr: 'Overall Equipment Effectiveness: Availability × Performance × Quality', tags: ['ops','health'],
        formula: 'Availability % × Performance % × Quality %',
        freq: 'Weekly / Monthly', benchmark: 'World class: >85%; average manufacturing: 60–65%',
        why: 'Gold standard manufacturing efficiency metric. Captures downtime, speed losses, and defect losses.' },
      { name: 'On-Time Delivery Rate', abbr: 'OTD — orders delivered on schedule', tags: ['ops','customer'],
        formula: 'Orders delivered on time / Total orders × 100',
        freq: 'Monthly', benchmark: '>95% is table stakes for tier-1 industrial customers',
        why: 'Directly impacts customer retention and penalty clauses. Below 90% triggers customer escalation.' },
      { name: 'Manufacturing Cycle Time', abbr: 'Time from order to finished goods', tags: ['ops'],
        formula: 'Average days from production start to goods ready to ship',
        freq: 'Monthly', benchmark: 'Track trend; reducing cycle time = operational improvement',
        why: 'Shorter cycle time = faster cash conversion and ability to take on more orders without capex.' },
    ],
  },
  {
    label: 'Cost & Margin',
    metrics: [
      { name: 'Gross Margin', abbr: 'Revenue minus manufacturing COGS', tags: ['fin','health'],
        formula: '(Revenue − Direct materials − Direct labour − Mfg overhead) / Revenue × 100',
        freq: 'Quarterly', benchmark: 'Capital equipment: 40–60%; components: 25–40%; deep-tech HW: 50–65%',
        why: 'Manufacturing gross margin varies widely by sector. Compare within peer group only.' },
      { name: 'EBITDA Margin', abbr: 'Operating profitability as % of revenue', tags: ['fin','health'],
        formula: 'EBITDA / Revenue × 100',
        freq: 'Quarterly', benchmark: 'Industrial: 10–18%; capital equipment: 12–20%; specialty: 15–25%',
        why: 'Primary investor profitability benchmark for capex-heavy businesses.' },
      { name: 'Raw Material Cost %', abbr: 'Input cost as % of revenue', tags: ['fin','ops'],
        formula: 'Raw material spend / Revenue × 100',
        freq: 'Monthly', benchmark: 'Track trend — rising % = margin compression from commodity prices',
        why: 'Key sensitivity for manufacturing. Commodity spikes (steel, aluminium, rare earths) hit this directly.' },
      { name: 'Cash Conversion Cycle', abbr: 'CCC — days from cash-out to cash-in', tags: ['fin','risk'],
        formula: 'Days inventory outstanding + Days sales outstanding − Days payables outstanding',
        freq: 'Quarterly', benchmark: 'Target <60 days; above 90 days = capital efficiency problem',
        why: 'Long CCC ties up cash in inventory and receivables. Shortening it frees capital for growth.' },
    ],
  },
  {
    label: 'Quality & Asset Efficiency',
    metrics: [
      { name: 'First Pass Yield', abbr: 'FPY — % of units passing QC first time', tags: ['ops','health'],
        formula: 'Units passing QC first time / Total units produced × 100',
        freq: 'Weekly', benchmark: 'World class: >99.5%; acceptable: >98%',
        why: 'Defects cost 5–10× to fix downstream vs. at source. Low FPY = rework cost and delivery delays.' },
      { name: 'Warranty Claim Rate', abbr: '% of units sold triggering warranty', tags: ['risk','customer'],
        formula: 'Warranty claims / Units sold × 100',
        freq: 'Monthly (lagged)', benchmark: 'Industrial: <1%; consumer hardware: <2–3%',
        why: 'Lagged quality indicator. High warranty rates signal systemic production quality issues.' },
      { name: 'Capex as % of Revenue', abbr: 'Capital expenditure intensity', tags: ['fin','ops'],
        formula: 'Capital expenditure / Revenue × 100',
        freq: 'Annual', benchmark: 'Mature manufacturing: 3–6%; growth phase: 10–20%',
        why: 'High capex during growth is expected. Sustained high capex without revenue growth is a red flag.' },
      { name: 'Debt / EBITDA', abbr: 'Leverage ratio', tags: ['fin','risk'],
        formula: 'Total debt / EBITDA (trailing 12 months)',
        freq: 'Quarterly', benchmark: '<2× = conservative; 2–4× = moderate; >4× = high leverage risk',
        why: 'Manufacturing is capital-intensive. Above 4× starts to constrain operational flexibility.' },
    ],
  },
];

const UNIVERSAL_SECTIONS: MetricSection[] = [
  {
    label: 'Cash & Burn',
    metrics: [
      { name: 'Net Burn Rate', abbr: 'Cash consumed per month', tags: ['risk','fin'],
        formula: 'Cash at start of month − Cash at end of month',
        freq: 'Monthly', benchmark: 'Runway >18 months post-raise is a common VC expectation',
        why: 'Most critical short-term risk metric. Running out of cash is existential regardless of all other metrics.' },
      { name: 'Runway', abbr: 'Months of cash remaining at current burn', tags: ['risk','fin'],
        formula: 'Cash on hand / Monthly net burn',
        freq: 'Monthly', benchmark: 'Green: >18 months; Amber: 12–18 months; Red: <12 months',
        why: 'Below 12 months = fundraising process must already be underway.' },
    ],
  },
  {
    label: 'Revenue Quality',
    metrics: [
      { name: 'Revenue Growth (YoY)', abbr: 'Year-on-year top-line growth', tags: ['growth','fin'],
        formula: '(Revenue this year − last year) / last year × 100',
        freq: 'Annual', benchmark: 'Track against sector benchmark and funding stage expectations',
        why: 'Baseline growth metric. Always disaggregate by product, channel, and geography.' },
      { name: 'Revenue Concentration', abbr: 'Top customer dependency', tags: ['risk','customer'],
        formula: 'Top customer(s) revenue / Total revenue × 100',
        freq: 'Quarterly', benchmark: 'No single customer >20%; top 3 customers <40%',
        why: 'Universal risk regardless of sector. High concentration shifts negotiating leverage to the customer.' },
      { name: 'Recurring Revenue %', abbr: '% of revenue that is contracted / recurring', tags: ['fin','health'],
        formula: 'Recurring or contracted revenue / Total revenue × 100',
        freq: 'Quarterly', benchmark: '>60% recurring = higher multiple, lower risk in investor perception',
        why: 'Higher recurring revenue = more predictable financials = higher valuation multiple.' },
    ],
  },
  {
    label: 'Team & Governance',
    metrics: [
      { name: 'Revenue per Employee', abbr: 'Headcount efficiency', tags: ['ops','fin'],
        formula: 'Annual revenue / Total headcount',
        freq: 'Annual', benchmark: 'Varies heavily by sector — track trend, not absolute',
        why: 'Tracks whether hiring is keeping pace with revenue. Declining ratio during flat growth is a red flag.' },
      { name: 'Attrition Rate', abbr: 'Annual employee turnover', tags: ['risk','ops'],
        formula: 'Employees who left in year / Average headcount × 100',
        freq: 'Annual', benchmark: 'Tech: <15%; manufacturing: <10%; leadership attrition: watch closely',
        why: 'High attrition — especially at leadership level — is a leading indicator of execution risk.' },
      { name: 'Board Action Item Completion', abbr: 'Governance execution rate', tags: ['ops','health'],
        formula: '% of prior board action items completed by next meeting',
        freq: 'Per board cycle', benchmark: '>80% completion signals strong management execution',
        why: 'Highly predictive of management quality. Used at Cactus to assess execution rigour.' },
    ],
  },
];

// ─── Single expandable metric card ───────────────────────────────────────────

function MetricCard({ metric }: { metric: Metric }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className={`rounded-lg border cursor-pointer transition-colors ${open ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-white'}`}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-start justify-between gap-2 p-2.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-800 leading-tight">{metric.name}</p>
          <p className="text-[10px] text-gray-400 mt-0.5 font-mono leading-tight truncate">{metric.abbr}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex gap-1 flex-wrap justify-end">
            {metric.tags.map(t => (
              <span key={t} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${TAG_STYLES[t] ?? 'bg-gray-100 text-gray-500'}`}>
                {t}
              </span>
            ))}
          </div>
          {open
            ? <ChevronUp className="w-3 h-3 text-gray-400 flex-shrink-0" />
            : <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
          }
        </div>
      </div>

      {open && (
        <div className="px-2.5 pb-2.5 pt-0 border-t border-gray-100 mt-0.5 space-y-1.5">
          {[
            ['Formula',        metric.formula],
            ['Frequency',      metric.freq],
            ['Benchmark',      metric.benchmark],
            ['Why it matters', metric.why],
          ].map(([label, value]) => (
            <div key={label} className="flex gap-2">
              <span className="text-[10px] text-gray-400 w-20 flex-shrink-0 pt-0.5">{label}</span>
              <span className="text-[10px] text-gray-600 leading-relaxed">{value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Section group ────────────────────────────────────────────────────────────

function MetricGroup({ section }: { section: MetricSection }) {
  return (
    <div>
      <p className="text-[9px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-0.5">{section.label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
        {section.metrics.map(m => <MetricCard key={m.name} metric={m} />)}
      </div>
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────

type PanelTab = 'sector' | 'universal';

interface Props {
  sectorId: string;
  sectorName: string;
}

export default function SectorMetricsPanel({ sectorId, sectorName }: Props) {
  const [activeTab, setActiveTab] = useState<PanelTab>('sector');
  const [open, setOpen] = useState(false);

  const sectorSections: MetricSection[] =
    sectorId === 's2' ? TECH_SECTIONS :
    sectorId === 's3' ? CONSUMER_SECTIONS :
    MFG_SECTIONS;

  const sectorLabel =
    sectorId === 's2' ? 'Technology / SaaS' :
    sectorId === 's3' ? 'Consumer / D2C' :
    'Advanced Manufacturing';

  const sections = activeTab === 'sector' ? sectorSections : UNIVERSAL_SECTIONS;

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Sector Metrics Framework
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-medium">
            {sectorName}
          </span>
        </div>
        {open
          ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
          : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        }
      </button>

      {open && (
        <div className="p-4 space-y-4">
          {/* Tab switcher */}
          <div className="flex gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            {([['sector', sectorLabel], ['universal', 'Universal']] as [PanelTab, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={e => { e.stopPropagation(); setActiveTab(key); }}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  activeTab === key
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Metric groups */}
          <div className="space-y-4">
            {sections.map(s => <MetricGroup key={s.label} section={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}
