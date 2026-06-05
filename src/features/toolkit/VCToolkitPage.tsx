import { useState } from 'react';
import { Wrench, Building2, Rocket, BarChart2, TrendingUp, Calculator, Globe, Activity, DoorOpen, ExternalLink, X, Play } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getToolComponent } from './tools/_registry';
import { useApp } from '../../context/AppContext';

// ─── Data ─────────────────────────────────────────────────────────────────────

type CatId = 'all' | 'ibank' | 'fundraising' | 'valuation' | 'uniteco' | 'market' | 'operations' | 'exit';

interface FwCategory { id: CatId; label: string; color: string; }
interface Framework {
  id: string; cat: CatId; name: string; desc: string; tag: 'Built' | 'To build';
  inputs: string[]; outputs: string[];
  url?: string; // external link to access the tool
}

const CATS: FwCategory[] = [
  { id: 'all', label: 'All frameworks', color: '#6B7280' },
  { id: 'ibank', label: 'Transaction advisors', color: '#185FA5' },
  { id: 'fundraising', label: 'Fundraising', color: '#0F6E56' },
  { id: 'valuation', label: 'Valuation', color: '#534AB7' },
  { id: 'uniteco', label: 'Unit economics', color: '#854F0B' },
  { id: 'market', label: 'Market & competitive', color: '#993C1D' },
  { id: 'operations', label: 'Operational health', color: '#3B6D11' },
  { id: 'exit', label: 'Exit & secondary', color: '#993556' },
];

const CAT_MAP: Record<CatId, { bg: string; text: string }> = {
  all:        { bg: '#F3F4F6', text: '#6B7280' },
  ibank:      { bg: '#E6F1FB', text: '#185FA5' },
  fundraising:{ bg: '#E1F5EE', text: '#0F6E56' },
  valuation:  { bg: '#EEEDFE', text: '#534AB7' },
  uniteco:    { bg: '#FAEEDA', text: '#854F0B' },
  market:     { bg: '#FAECE7', text: '#993C1D' },
  operations: { bg: '#EAF3DE', text: '#3B6D11' },
  exit:       { bg: '#FBEAF0', text: '#993556' },
};

const FW: Framework[] = [
  { id: 'ibank-rec', cat: 'ibank', name: 'IBank advisor recommender', tag: 'Built',
    desc: 'Find top 5–10 transaction advisors by sector, deal size, and FY — scored on min-max normalised deals, amount, and avg deal size.',
    inputs: ['Target sector (multi-select)', 'Deal size in USD M', 'FY weights 2024/25/26', 'Table weight: overview vs sector', 'Column weights: deals / amount / avg deal'],
    outputs: ['Top 10 advisor league with match %', 'Per-FY breakdown of normalised scores', 'Size filter pass/fail per advisor', 'Sub-sector keyword match bonus'] },
  { id: 'ibank-upload', cat: 'ibank', name: 'VI data uploader', tag: 'Built',
    desc: 'Upload year-wise Venture Intelligence Excel sheets with column mapping, persistent storage, and TypeScript export.',
    inputs: ['Excel / CSV file (drag-drop)', 'Table type: Overview or Sector', 'Financial year', 'Column mapper: name / deals / amount'],
    outputs: ['Parsed preview table', 'Mapped advisor rows with avg deal', 'Persistent cross-session storage', 'data.ts export for Lovable project'] },
  { id: 'legal-advisor', cat: 'ibank', name: 'Legal advisor tracker', tag: 'To build',
    desc: 'Track which law firms have advised on deals in your sector, deal size range, and jurisdiction — scored the same way as transaction advisors.',
    inputs: ['Sector + deal size', 'Jurisdiction (India / cross-border)', 'Deal type: PE / M&A / IPO', 'Firm preference (Big Four / boutique)'],
    outputs: ['Top 5 law firms with deal history', 'Per-firm avg deal size and deal count', 'Conflict-of-interest flag', 'Fee range benchmarks by deal size'] },

  { id: 'investor-ready', cat: 'fundraising', name: 'Investor readiness scorecard', tag: 'To build',
    desc: 'Score a portfolio company across 8 dimensions to assess if they are ready to raise — gives an overall readiness % and flags gaps.',
    inputs: ['Team completeness (CXO coverage)', 'Revenue trajectory (MoM consistency)', 'Unit economics (LTV/CAC, payback)', 'Market size evidence (TAM/SAM)', 'Product differentiation score', 'Customer concentration risk', 'Data room completeness checklist', 'Narrative coherence (1-sentence test)'],
    outputs: ['Readiness score 0–100', 'Red / amber / green per dimension', 'Gap list with fix recommendations', 'Estimated weeks to raise-ready'] },
  { id: 'pitch-eval', cat: 'fundraising', name: 'Pitch deck evaluator', tag: 'To build',
    desc: 'Structured framework to evaluate an incoming pitch deck or help a portfolio company improve theirs before going to investors.',
    inputs: ['Problem slide: clarity + pain evidence', 'Solution: differentiation vs alternatives', 'Market: TAM method + defensibility', 'Business model: revenue mechanics', 'Traction: key milestones hit', 'Team: domain expertise + relevant exits', 'Ask: round size + use of funds', 'Financials: 18-month plan + assumptions'],
    outputs: ['Slide-by-slide score', 'Investor objection forecast', 'Missing slide detector', 'Recommended order and narrative arc'] },
  { id: 'investor-crm', cat: 'fundraising', name: 'Investor pipeline CRM', tag: 'To build',
    desc: 'Track every investor across the funnel for a portfolio company\'s raise — from warm intro to signed term sheet.',
    inputs: ['Investor name + fund', 'Stage: sourced / intro / meeting / diligence / TS / closed', 'Check size range', 'Lead vs follow capacity', 'Intro source (warm / cold)', 'Last touchpoint + notes'],
    outputs: ['Funnel conversion by stage', 'Days-in-stage heatmap', 'Soft-commit tracker vs target raise', 'Recommended next 5 intros based on profile match'] },
  { id: 'ts-compare', cat: 'fundraising', name: 'Term sheet comparator', tag: 'To build',
    desc: 'Side-by-side comparison of competing term sheets across all economic and control terms — highlights founder-unfriendly clauses.',
    inputs: ['Pre-money valuation', 'Liquidation preference (1× / 2× / participating)', 'Anti-dilution (broad / narrow / full ratchet)', 'Option pool size + timing', 'Board composition', 'Pro-rata rights', 'Information rights', 'Protective provisions'],
    outputs: ['Side-by-side term comparison', 'Founder-friendliness score per TS', 'Dilution impact at exit (waterfall preview)', 'Recommended negotiation points'] },
  { id: 'round-size', cat: 'fundraising', name: 'Round sizing calculator', tag: 'To build',
    desc: 'Calculate the right round size based on runway target, milestone plan, and valuation expectations.',
    inputs: ['Current monthly burn', 'Target runway (months)', 'Planned headcount additions', 'Key milestones to fund (product / revenue / geo)', 'Target valuation at next round', 'Acceptable dilution range'],
    outputs: ['Recommended raise amount', 'Use of funds breakdown (%)', 'Post-money valuation at target ownership', 'Months to next raise at current burn + growth'] },

  { id: 'venture-val', cat: 'valuation', name: 'Venture method valuation', tag: 'To build',
    desc: 'Bottom-up valuation using the VC method — works backwards from exit value to determine acceptable entry valuation.',
    inputs: ['Target exit year (3–7 yrs)', 'Exit revenue multiple (sector benchmark)', 'Projected revenue at exit', 'Target fund MOIC (3× / 5× / 10×)', 'Dilution through future rounds (%)', 'Current stage and check size'],
    outputs: ['Maximum acceptable pre-money today', 'Post-money valuation', 'Implied ownership needed', 'MOIC sensitivity table (best / base / bear)'] },
  { id: 'comps-val', cat: 'valuation', name: 'Comparable company analysis', tag: 'To build',
    desc: 'Build a comparables set for any portfolio company — pull sector revenue multiples and benchmark current valuation against peers.',
    inputs: ['Sector + sub-sector', 'Stage + geography filter', 'Comparable companies (name + last round)', 'Current ARR / GMV / Revenue', 'Last round valuation', 'Growth rate'],
    outputs: ['Revenue multiple vs comps (EV/ARR)', 'Percentile rank in comp set', 'Premium / discount to median', 'Suggested valuation range based on growth-adjusted comps'] },
  { id: 'moic-tracker', cat: 'valuation', name: 'MOIC & IRR tracker', tag: 'To build',
    desc: 'Track realised and unrealised returns per company and across the fund — updated at every funding round mark.',
    inputs: ['Investment date + cost basis', 'All follow-on amounts + dates', 'Current fair value mark', 'Exit proceeds (if realised)', 'Pro-rata adjustments'],
    outputs: ['MOIC per company (realised + unrealised)', 'IRR per company', 'Portfolio-level TVPI / RVPI / DPI', 'Fund waterfall preview at current marks'] },
  { id: 'cap-table', cat: 'valuation', name: 'Cap table & dilution model', tag: 'To build',
    desc: 'Model cap table through future rounds — simulate dilution, option pool expansion, and liquidation waterfall.',
    inputs: ['Current cap table (shares per holder)', 'New round: pre-money + round size', 'Option pool top-up', 'Liquidation preference per class', 'Exit price (multiple scenarios)'],
    outputs: ['Post-round ownership by holder', 'Dilution waterfall per round', 'Proceeds by holder at exit (3 scenarios)', 'Anti-dilution trigger analysis'] },

  { id: 'ltv-cac', cat: 'uniteco', name: 'LTV / CAC analyser', tag: 'To build',
    desc: 'Calculate LTV, CAC, payback period, and LTV:CAC ratio — benchmark against sector norms and flag deterioration trends.',
    inputs: ['ARPU (average revenue per user)', 'Gross margin %', 'Monthly / annual churn rate', 'Blended CAC by channel', 'Sales cycle length', 'Expansion revenue (upsell %)'],
    outputs: ['LTV / CAC ratio (flag if < 3×)', 'Payback period in months (flag if > 18)', 'Blended vs channel CAC breakdown', 'LTV sensitivity to churn (±1%)'] },
  { id: 'burn-multiple', cat: 'uniteco', name: 'Burn multiple calculator', tag: 'To build',
    desc: 'Burn multiple = net burn / net new ARR. The single most important efficiency metric for growth-stage companies.',
    inputs: ['Net burn per month', 'New ARR added this month', 'Churned ARR this month', 'Expansion ARR this month', 'Headcount by function'],
    outputs: ['Burn multiple (flag if > 2× at Series B)', 'Benchmark vs stage peers', 'Burn per FTE by function', 'Efficiency improvement needed to hit target'] },
  { id: 'rule40', cat: 'uniteco', name: 'Rule of 40', tag: 'To build',
    desc: 'Revenue growth % + EBITDA margin % — the core SaaS health metric. Track trend over 8 quarters and benchmark against public comparables.',
    inputs: ['ARR this quarter + last 8 quarters', 'EBITDA or FCF margin per quarter', 'Public comp set (Bessemer Cloud Index)'],
    outputs: ['Rule of 40 score per quarter', 'Trend chart (8Q)', 'Percentile vs public SaaS peers', 'Growth vs profitability decomposition'] },
  { id: 'cohort', cat: 'uniteco', name: 'Cohort retention analyser', tag: 'To build',
    desc: 'Upload monthly cohort data and visualise retention curves — identify when churn stabilises and which cohorts perform best.',
    inputs: ['Monthly cohort CSV (month × cohort matrix)', 'Revenue or user retention toggle', 'Segment filter (plan / geo / channel)'],
    outputs: ['Cohort heatmap (colour-coded by retention %)', 'Retention curve overlay (all cohorts)', 'Month-N retention benchmark', 'Average stabilised retention prediction'] },
  { id: 'nrr', cat: 'uniteco', name: 'NRR / GRR dashboard', tag: 'To build',
    desc: 'Net Revenue Retention and Gross Revenue Retention — the definitive indicators of product stickiness and pricing power.',
    inputs: ['Starting ARR (beginning of period)', 'Expansion ARR (upsells + seat adds)', 'Contraction ARR (downgrades)', 'Churned ARR', 'Customer segment breakdown'],
    outputs: ['NRR % and GRR % (flag if NRR < 100%)', 'Expansion vs churn waterfall chart', 'Rolling 12-month NRR trend', 'Benchmark vs SaaS stage peers'] },
  { id: 'magic-number', cat: 'uniteco', name: 'Magic number', tag: 'To build',
    desc: 'Magic number = net new ARR × 4 / prior-quarter S&M spend. Measures how efficiently sales spend converts to recurring revenue.',
    inputs: ['Net new ARR this quarter', 'S&M spend last quarter', 'Headcount: sales vs marketing split', 'Blended S&M cost per head'],
    outputs: ['Magic number (flag if < 0.75)', 'Trend over 6 quarters', 'Sales efficiency by segment', 'Implied S&M budget for ARR target'] },

  { id: 'tam-sizing', cat: 'market', name: 'TAM / SAM / SOM model', tag: 'To build',
    desc: 'Build defensible market sizing using both top-down (industry reports) and bottom-up (customers × ARPU) methods — critical for IC memos.',
    inputs: ['Industry: total market size (top-down)', 'Target customer segment definition', 'Addressable customers (count)', 'Average contract value or ARPU', 'Win rate assumption', 'Geographic scope'],
    outputs: ['TAM / SAM / SOM with methodology note', 'Top-down vs bottom-up reconciliation', 'Market share needed to hit $X ARR', 'Penetration rate benchmark vs peers'] },
  { id: 'competitive', cat: 'market', name: 'Competitive positioning matrix', tag: 'To build',
    desc: '2×2 and feature-comparison matrix to map a portfolio company\'s position vs direct and indirect competitors.',
    inputs: ['Competitor list (up to 12)', 'X axis: price / market segment / tech', 'Y axis: feature depth / scale / margin', 'Feature checklist (up to 20 features)'],
    outputs: ['2×2 scatter plot with company positions', 'Feature comparison table (green/red cells)', 'Differentiation score per competitor', 'White space opportunity map'] },
  { id: 'pmf', cat: 'market', name: 'PMF scorecard', tag: 'To build',
    desc: 'Measure product-market fit using the Sean Ellis test, NPS, and organic growth signals — helps analysts judge whether a company has found PMF.',
    inputs: ['Sean Ellis score (% "very disappointed")', 'NPS score + trend', 'Organic vs paid traffic ratio', 'Word-of-mouth growth rate', 'Retention at month 1 / 3 / 6', 'Support ticket volume per MAU'],
    outputs: ['PMF confidence score (0–100)', 'Signal breakdown by category', 'Red flags: which signals lag', 'Recommendation: lead / wait / pass'] },
  { id: 'category-def', cat: 'market', name: 'Category definition framework', tag: 'To build',
    desc: 'Assess whether a company is creating a new category or competing in an existing one — determines narrative strategy and investor positioning.',
    inputs: ['How customers describe the problem today', 'Existing solution categories in market', 'Company\'s proposed category name', 'Evangelical customers (count + profile)', 'Analyst coverage: existing category or new?'],
    outputs: ['Category type: new / sub / existing', 'Narrative strength score', 'Category creation risk vs reward analysis', 'Recommended investor narrative frame'] },

  { id: 'kpi-tracker', cat: 'operations', name: 'KPI tracker & milestone log', tag: 'To build',
    desc: 'Structured monthly KPI submission from portfolio companies — actual vs target, trend sparklines, and auto-alerts on miss or no-data.',
    inputs: ['Company-specific KPI set (agreed at investment)', 'Monthly submission (actual values)', 'Milestone plan from IC memo', 'Analyst notes per company'],
    outputs: ['Traffic-light per KPI (above / on plan / miss / no data)', 'Trend sparklines (6 months)', 'Auto-alert: 2+ months miss or data overdue', 'Portfolio-wide KPI health heatmap'] },
  { id: 'board-prep', cat: 'operations', name: 'Board meeting prep template', tag: 'To build',
    desc: 'Standardised pre-board pack — pulls live KPI data, open action items, and generates talking points for the investor director attending.',
    inputs: ['Company + board date', 'KPI actuals vs plan', 'Open action items (from last board)', 'Fundraising status', 'Key hires in progress', 'Risks to flag to board'],
    outputs: ['One-page board summary (PDF-ready)', 'Action item status (open / closed / overdue)', 'Recommended agenda with time allocation', 'Questions for management to prepare'] },
  { id: 'runway-alert', cat: 'operations', name: 'Runway & burn monitor', tag: 'To build',
    desc: 'Auto-calculated runway from cash balance and burn rate — with scenario modelling for cut and growth-mode burn, and alert triggers.',
    inputs: ['Cash balance (current month)', 'Net burn (last 3-month average)', 'Planned increases in burn (hires)', 'Receivables / prepaid not yet in bank'],
    outputs: ['Runway in months (base / conservative)', 'Month when cash reaches ₹50L (trigger)', 'Burn scenario: cut to 12 months vs maintain', 'Alert: when to start raise process (6 months before)'] },
  { id: 'okr', cat: 'operations', name: 'OKR tracking framework', tag: 'To build',
    desc: 'Track quarterly OKRs across portfolio companies — holds founders accountable on the objectives agreed at the last board meeting.',
    inputs: ['Company OKR set (Q objectives + key results)', 'Scoring: 0.0 to 1.0 per KR', 'Carry-forward from last quarter', 'Analyst commentary'],
    outputs: ['OKR score per company (avg KR score)', 'Quarter-on-quarter trend', 'Mis-set objectives detector (all scored 1.0 = gaming)', 'Cross-portfolio OKR health summary'] },
  { id: 'founder-eng', cat: 'operations', name: 'Founder engagement log', tag: 'To build',
    desc: 'Log every touchpoint with founders and key C-suite — tracks recency, topic, and follow-up actions. Flags when a company goes silent.',
    inputs: ['Company + contact (name + role)', 'Touchpoint type: 1:1 / board / intro / escalation', 'Date + summary note', 'Action items triggered', 'Assigned analyst'],
    outputs: ['Days since last touchpoint (red if > 30)', 'Touchpoint frequency trend', 'Open action items per company', 'Portfolio-wide engagement health score'] },

  { id: 'exit-ready', cat: 'exit', name: 'Exit readiness assessment', tag: 'To build',
    desc: 'Score a company on strategic acquirer attractiveness, IPO readiness, and secondary market appeal — produces an exit pathway recommendation.',
    inputs: ['Revenue scale + growth rate', 'Profitability trajectory', 'Comparable exit multiples (M&A + IPO)', 'Strategic buyer universe (named)', 'Management team: public-company ready?', 'Data room completeness'],
    outputs: ['Exit pathway score: M&A / IPO / secondary', 'Acquirer shortlist with strategic rationale', 'Exit value range at current and 2-year trajectory', 'Time-to-exit estimate per pathway'] },
  { id: 'secondary', cat: 'exit', name: 'Secondary transaction analyser', tag: 'To build',
    desc: 'Evaluate secondary sale requests from founders / employees — assess pricing vs last round, fund impact, and signal risk.',
    inputs: ['Last primary round valuation', 'Proposed secondary price', 'Seller: founder / employee / early investor', '% of ownership being sold', 'Time since last round', 'Comparable secondary market comps'],
    outputs: ['Discount / premium vs last round', 'MOIC impact on fund at secondary price', 'Signal risk assessment (why selling?)', 'Recommended: approve / counter / decline'] },
  { id: 'follow-on', cat: 'exit', name: 'Follow-on decision framework', tag: 'To build',
    desc: 'Structured IC-grade framework for every follow-on decision — conviction score, reserve capacity check, and dilution impact.',
    inputs: ['Company health score (KPI trend)', 'New round terms: pre-money + size', 'Current ownership + pro-rata right', 'Reserve available vs deployed', 'PMF confidence score', 'Runway if we don\'t follow on'],
    outputs: ['Follow-on recommendation: lead / pro-rata / pass', 'Conviction score with component breakdown', 'Ownership post-round (if we follow)', 'Fund reserve impact: % of dry powder used'] },
];

// ─── Toolkit sections (the 4 heading cards) ──────────────────────────────────

interface ToolkitSection {
  id: string;
  label: string;
  subLabel: string;
  description: string;
  catFilter: CatId[];
  count: number;
  builtCount: number;
  color: string;
  icon: React.ReactNode;
}

const TOOLKIT_SECTIONS: ToolkitSection[] = [
  {
    id: 'suite',
    label: 'VC Framework Suite',
    subLabel: 'Full library',
    description: 'All 35 analytical frameworks for every stage of the investment lifecycle.',
    catFilter: ['all'],
    count: FW.length,
    builtCount: FW.filter(f => f.tag === 'Built').length,
    color: '#2D6A4F',
    icon: <Wrench className="w-5 h-5" />,
  },
  {
    id: 'deal',
    label: 'Transaction Advisors',
    subLabel: 'IBank & legal',
    description: 'IBank recommender, VI data uploader, and legal advisor tracker for deal execution.',
    catFilter: ['ibank'],
    count: FW.filter(f => f.cat === 'ibank').length,
    builtCount: FW.filter(f => f.cat === 'ibank' && f.tag === 'Built').length,
    color: '#185FA5',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    id: 'fundraising',
    label: 'Fundraising Suite',
    subLabel: 'Raise & terms',
    description: 'Readiness scorecards, pitch evaluation, investor CRM, term sheet comparison, and round sizing.',
    catFilter: ['fundraising'],
    count: FW.filter(f => f.cat === 'fundraising').length,
    builtCount: FW.filter(f => f.cat === 'fundraising' && f.tag === 'Built').length,
    color: '#0F6E56',
    icon: <Rocket className="w-5 h-5" />,
  },
  {
    id: 'analytics',
    label: 'Portfolio Analytics',
    subLabel: 'Valuation & unit eco',
    description: 'Valuation models, cap table simulation, MOIC/IRR tracking, and all unit economics frameworks.',
    catFilter: ['valuation', 'uniteco'],
    count: FW.filter(f => f.cat === 'valuation' || f.cat === 'uniteco').length,
    builtCount: FW.filter(f => (f.cat === 'valuation' || f.cat === 'uniteco') && f.tag === 'Built').length,
    color: '#534AB7',
    icon: <BarChart2 className="w-5 h-5" />,
  },
];

// ─── Cat icons ────────────────────────────────────────────────────────────────

function CatIcon({ id }: { id: CatId }) {
  const cls = 'w-4 h-4';
  switch (id) {
    case 'ibank':      return <Building2 className={cls} />;
    case 'fundraising':return <Rocket className={cls} />;
    case 'valuation':  return <TrendingUp className={cls} />;
    case 'uniteco':    return <Calculator className={cls} />;
    case 'market':     return <Globe className={cls} />;
    case 'operations': return <Activity className={cls} />;
    case 'exit':       return <DoorOpen className={cls} />;
    default:           return <Wrench className={cls} />;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VCToolkitPage() {
  const { store } = useApp();
  const adminLinks: Record<string, string> = store.toolkitLinks ?? {};

  const [activeSection, setActiveSection] = useState<string>('suite');
  const [activeCat, setActiveCat] = useState<CatId>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [launchedId, setLaunchedId] = useState<string | null>(null);

  // Merge admin-set URLs over static defaults
  const FRAMEWORKS_WITH_LINKS = FW.map((fw: typeof FW[0]) => ({
    ...fw,
    url: adminLinks[fw.id] || fw.url,
  }));

  const section = TOOLKIT_SECTIONS.find(s => s.id === activeSection)!;

  const visibleFrameworks = FRAMEWORKS_WITH_LINKS.filter(f => {
    if (activeCat !== 'all') return f.cat === activeCat;
    if (section.catFilter[0] === 'all') return true;
    return section.catFilter.includes(f.cat);
  });

  const selectedFw = FRAMEWORKS_WITH_LINKS.find(f => f.id === activeId) ?? null;

  function handleSectionClick(sId: string) {
    setActiveSection(sId);
    setActiveId(null);
    const sec = TOOLKIT_SECTIONS.find(s => s.id === sId)!;
    setActiveCat(sec.catFilter[0] === 'all' ? 'all' : sec.catFilter[0]);
  }

  function handleCatClick(cId: CatId) {
    setActiveCat(cId);
    setActiveId(null);
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">

      {/* ── 4 Toolkit section cards ─────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="mb-4">
          <h1 className="text-xl font-heading font-semibold text-gray-900">VC Toolkit</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analytical frameworks, tools, and scorecards for every stage of the investment lifecycle</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TOOLKIT_SECTIONS.map(sec => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => handleSectionClick(sec.id)}
                className={cn(
                  'text-left rounded-xl border p-4 transition-all cursor-pointer group',
                  isActive
                    ? 'shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                )}
                style={isActive ? { backgroundColor: sec.color + '0D', borderColor: sec.color, borderWidth: 2 } : {}}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: sec.color + '18', color: sec.color }}
                  >
                    {sec.icon}
                  </div>
                  {isActive && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: sec.color + '18', color: sec.color }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <div className="font-heading font-semibold text-sm text-gray-900 mb-0.5 leading-snug">
                  {sec.label}
                </div>
                <div className="text-xs text-gray-500 mb-2">{sec.subLabel}</div>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{sec.description}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium" style={{ color: sec.color }}>
                    {sec.count} frameworks
                  </span>
                  {sec.builtCount > 0 && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                      {sec.builtCount} live
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Category tabs ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATS.filter(c => {
          if (section.catFilter[0] === 'all') return true;
          return c.id === 'all' || section.catFilter.includes(c.id as CatId);
        }).map(c => {
          const isOn = activeCat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleCatClick(c.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                isOn ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
              style={isOn ? { backgroundColor: c.color, borderColor: c.color } : {}}
            >
              <CatIcon id={c.id} />
              {c.label}
            </button>
          );
        })}
      </div>

      {/* ── Framework grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
        {visibleFrameworks.map(fw => {
          const cm = CAT_MAP[fw.cat];
          
          return (
            <button
              key={fw.id}
              onClick={() => setActiveId(fw.id)}
              className="text-left bg-white rounded-xl border border-gray-200 p-3.5 cursor-pointer transition-all hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cm.bg, color: cm.text }}
                >
                  <CatIcon id={fw.cat} />
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={fw.tag === 'Built'
                    ? { backgroundColor: '#E1F5EE', color: '#0F6E56' }
                    : { backgroundColor: '#F3F4F6', color: '#6B7280' }}
                >
                  {fw.tag}
                </span>
              </div>
              <div className="text-xs font-semibold text-gray-900 mb-1 leading-snug">{fw.name}</div>
              <div className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                {fw.desc.length > 80 ? fw.desc.substring(0, 80) + '…' : fw.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Info popup modal — shown when any tool card is clicked ─────────── */}
      {selectedFw && (() => {
        const cm = CAT_MAP[selectedFw.cat];
        const catLabel = CATS.find(c => c.id === selectedFw.cat)?.label ?? '';
        const hasComponent = selectedFw.tag === 'Built' && !!getToolComponent(selectedFw.id);
        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setActiveId(null)}
            />
            {/* Popup modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 pointer-events-none">
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col pointer-events-auto overflow-hidden"
                style={{ borderTop: `4px solid ${cm.text}` }}
              >
                {/* Header */}
                <div className="flex items-start gap-3 px-6 py-5 border-b border-gray-100">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cm.bg, color: cm.text }}>
                    <CatIcon id={selectedFw.cat} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-gray-900 text-base leading-tight">{selectedFw.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cm.bg, color: cm.text }}>{catLabel}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={selectedFw.tag === 'Built'
                          ? { backgroundColor: '#E1F5EE', color: '#0F6E56' }
                          : { backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                        {selectedFw.tag}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setActiveId(null)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedFw.desc}</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: cm.text }}>
                        Inputs
                      </h4>
                      <div className="space-y-1.5">
                        {selectedFw.inputs.map((inp, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: cm.text }} />
                            <span className="text-xs text-gray-600">{inp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-emerald-700">
                        Outputs
                      </h4>
                      <div className="space-y-1.5">
                        {selectedFw.outputs.map((out, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-emerald-500" />
                            <span className="text-xs text-gray-600">{out}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Launch tool inside portal */}
                    {hasComponent && (
                      <button
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: '#1C4B42' }}
                        onClick={() => { setLaunchedId(selectedFw.id); setActiveId(null); }}
                      >
                        <Play className="w-4 h-4" />
                        Launch Tool
                      </button>
                    )}
                    {/* External link */}
                    {selectedFw.url ? (
                      <a
                        href={selectedFw.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors hover:bg-white"
                        style={{ borderColor: cm.text, color: cm.text }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open External Tool
                      </a>
                    ) : selectedFw.tag === 'Built' && !hasComponent ? (
                      <span className="text-xs text-gray-400 italic">External link not configured for this tool.</span>
                    ) : selectedFw.tag === 'To build' ? (
                      <span className="text-xs text-gray-400 italic flex items-center gap-1">
                        <DoorOpen className="w-3.5 h-3.5" /> Coming soon — not yet built.
                      </span>
                    ) : null}
                    <button
                      onClick={() => setActiveId(null)}
                      className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Full tool modal — renders the live tool component ────────────────── */}
      {launchedId && (() => {
        const ToolComponent = getToolComponent(launchedId);
        const fw = FW.find(f => f.id === launchedId);
        const cm = fw ? CAT_MAP[fw.cat] : CAT_MAP.all;
        if (!ToolComponent || !fw) return null;
        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setLaunchedId(null)} />
            <div className="fixed inset-4 md:inset-8 z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0"
                style={{ backgroundColor: cm.bg }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: cm.text + '20', color: cm.text }}>
                  <CatIcon id={fw.cat} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-heading font-bold text-gray-900 text-base">{fw.name}</h2>
                  <p className="text-xs text-gray-500 truncate">{fw.desc.slice(0, 80)}…</p>
                </div>
                {fw.url && (
                  <a href={fw.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/60 mr-2"
                    style={{ borderColor: cm.text, color: cm.text }}>
                    <ExternalLink className="w-3.5 h-3.5" /> Open External
                  </a>
                )}
                <button onClick={() => setLaunchedId(null)}
                  className="p-2 rounded-xl hover:bg-white/60 text-gray-500 shrink-0 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <ToolComponent />
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
