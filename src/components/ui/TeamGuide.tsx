/**
 * TeamGuide — explains what each CSV maps to, where SharePoint URL goes,
 * and what each tab/feature does. Shown in every team's Data Sync panel.
 */

interface GuideEntry {
  csv: string;       // CSV sheet name
  mapsTo: string;    // Where in portal it appears
  kvKey: string;     // Data Sync → kvKey to use when mapping
  columns: string;   // Key columns / composite key
}

interface TeamGuideConfig {
  team: string;
  color: string;
  bgColor: string;
  borderColor: string;
  presetName: string;  // Exact name to select in Data Sync → Add Source
  steps: string[];
  entries: GuideEntry[];
  tabGuides: Array<{ tab: string; what: string; appearsIn: string }>;
}

const GUIDES: Record<string, TeamGuideConfig> = {
  finance: {
    team: 'Finance Team',
    color: '#1C4B42',
    bgColor: '#F0F7E6',
    borderColor: '#86CA0F40',
    presetName: 'Finance Team Data',
    steps: [
      'Download the template from CSV Templates below → "Export Data" fills it with current values',
      'Edit in Excel — add/update rows for new quarters or corrected figures',
      'Upload to SharePoint → Share → "Anyone with link" → copy the URL',
      'Data Sync tab → "Add SharePoint Source" → select "Finance Team Data" → paste URL → Preview → Save',
      'Click "Sync Now" — data flows into the Finance tab instantly',
      'OR click "Sync" in the top header bar from any page',
    ],
    entries: [
      { csv: 'Fund Metrics', mapsTo: 'Finance → Fund Overview → Fund Metrics cards (Called Capital, NAV, TVPI, IRR, MOIC, DPI)', kvKey: 'fund_1::fund_metrics', columns: 'Metric, Fund 1, Fund 2, Combined, Unit' },
      { csv: 'Cash Flows', mapsTo: 'Finance → Fund Overview → Cash flow chart and statement', kvKey: 'fund_1::cash_flows', columns: 'Quarter, Capital Called, Distributions, NAV, Cumulative Called' },
      { csv: 'Fund Expenses', mapsTo: 'Finance → Expenses → Projected Expenses table (FY23–FY31)', kvKey: 'et:fund_expenses', columns: 'Category, FY23, FY24, FY25, FY26... FY31, Total' },
      { csv: 'IM Expenses', mapsTo: 'Finance → Expenses → IM Expenses table (Actual vs Budget)', kvKey: 'et:im_expenses', columns: 'Category, Budgeted, Q1 Actual, Variance Q1%... Q4 Actual' },
      { csv: 'Capital Calls', mapsTo: 'Finance → Capital Calls tab — all call notices and LP receipts', kvKey: 'capital_calls', columns: 'Type, Notice Date, Due Date, Amount, Fund, LP Name, LP Amount' },
      { csv: 'Valuation Log', mapsTo: 'Finance → Valuation Log tab — quarterly FMV marks per company', kvKey: 'valuation_log', columns: 'Company Name, Quarter, FMV (₹Cr), Methodology, MOIC, Marked By' },
      { csv: 'LP Summary', mapsTo: 'Admin → LP Investors — commitment, called, distributed, NAV per LP', kvKey: 'lp_summary', columns: 'LP Name, LP Email, Total Commitment, Capital Called, Distributions, NAV' },
      { csv: 'Compliance Events', mapsTo: 'Finance → Compliances tab — regulatory deadline calendar', kvKey: 'events', columns: 'Event Name, Due Date, Category, Status, Notes' },
    ],
    tabGuides: [
      { tab: 'Fund Overview', what: 'Reads from Fund Metrics + Cash Flows CSVs. Called Capital, NAV, TVPI, DPI, IRR, MOIC cards. Chart from Cash Flows.', appearsIn: 'Finance → Fund Overview' },
      { tab: 'Expenses', what: 'Reads from Fund Expenses + IM Expenses CSVs. Projected multi-year expense table + actual vs budget quarterly.', appearsIn: 'Finance → Expenses' },
      { tab: 'Capital Calls', what: 'Reads from Capital Calls CSV. Shows each capital call notice with per-LP status.', appearsIn: 'Finance → Capital Calls' },
      { tab: 'Valuation Log', what: 'Reads from Valuation Log CSV. Quarterly FMV marks used for fund NAV calculation.', appearsIn: 'Finance → Valuation Log' },
      { tab: 'LP Comms', what: 'Written directly in the portal (no CSV sync). Quarterly updates, capital call notices, distribution notices.', appearsIn: 'Finance → LP Comms' },
      { tab: 'Fund Closing', what: 'Written directly in the portal. LP commitment pipeline for new fund raise.', appearsIn: 'Finance → Fund Closing' },
      { tab: 'Fund Ledger', what: 'Portfolio team manages this. Finance team maintains their own copy via Finance → Fund Ledger.', appearsIn: 'Finance → Fund Ledger' },
    ],
  },

  portfolio: {
    team: 'Portfolio Team',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#7C3AED40',
    presetName: 'Portfolio Team Data',
    steps: [
      'Download template from CSV Templates below → "Export Data" fills it with current values',
      'Edit in Excel — add quarterly data, update metrics, add new contacts',
      'Upload to SharePoint → Share → "Anyone with link" → copy URL',
      'Data Sync tab → "Add SharePoint Source" → select "Portfolio Team Data" → paste URL → Preview → Save',
      'Click "Sync Now" — data flows into Portfolio tab features',
      'Header "Sync" button works from any page',
    ],
    entries: [
      { csv: 'FY Revenue & Ops', mapsTo: 'Click any company → Funding tab → quarterly FY/CY table. Also: Portfolio → Fund View revenue history. COMPOSITE KEY: Company ID + Year Style + Period (never change these).', kvKey: 'financial_periods', columns: 'Company Name, Company ID *, Year Style *, Period *, Period Type, Fiscal Year, Quarter, Revenue, ARR, MRR, Gross Margin %, EBITDA %, MOIC, IRR %...' },
      { csv: 'Portfolio Updates', mapsTo: 'Operations → Portfolio Updates tab — monthly founder update feed', kvKey: 'portfolio_updates', columns: 'Company Name, Month (YYYY-MM), Status, Revenue, Burn, Cash, Headcount, Highlights, Challenges, Asks' },
      { csv: 'Company Health', mapsTo: 'Portfolio → Health Dashboard tab — traffic-light signals per company per quarter', kvKey: 'health_dashboard', columns: 'Company Name, Company ID, Quarter, Revenue Growth Signal, Burn Signal, Team Signal, Product Signal, Fundraising Signal, Overall' },
      { csv: 'Founder Contacts', mapsTo: 'Portfolio → Founder Directory tab — all founder and key contact details', kvKey: 'founder_contacts', columns: 'Company Name, Name, Role, Email, Phone, LinkedIn URL, Location, Last Contacted' },
    ],
    tabGuides: [
      { tab: 'Company Metrics', what: 'Inline-editable table of all company valuations, MOIC, IRR. Changes save to portfolio namespace only. Appears on Portfolio → Companies cards and company drawer.', appearsIn: 'Portfolio Admin → Company Metrics tab' },
      { tab: 'Financial Periods', what: 'Add/edit quarterly data per company. One row = company + quarter. The FY/CY toggle in company drawer auto-converts. Enter data ONCE as FY — CY view derives automatically.', appearsIn: 'Portfolio Admin → Financial Periods + Company Drawer → Funding tab' },
      { tab: 'Fund View', what: 'Portfolio team\'s independent copy of fund investment ledger (NOT linked to Finance copy). Shows Called Capital, NAV, TVPI, DPI, Gross IRR, MOIC for each investment.', appearsIn: 'Portfolio → Fund View tab + Company Drawer → Financials tab' },
      { tab: 'Company Health', what: 'Set green/amber/red/grey signals per company per quarter. Appears in Portfolio → Health Dashboard grid and 4-quarter trend chart.', appearsIn: 'Portfolio Admin → Company Health + Portfolio → Health Dashboard' },
    ],
  },

  investment: {
    team: 'Investment Team',
    color: '#0891B2',
    bgColor: '#EFF6FF',
    borderColor: '#0891B240',
    presetName: 'Investment Team Data',
    steps: [
      'Download template → "Export Data" exports current pipeline, memos, ref checks',
      'Edit in Excel — add new deals, update IC memo status, log reference checks',
      'Upload to SharePoint → Share → copy URL',
      'Data Sync → "Add SharePoint Source" → select "Investment Team Data" → paste URL → Sync',
    ],
    entries: [
      { csv: 'Deal Pipeline', mapsTo: 'Investment → Pipeline tab (kanban). Each row = one deal. Stage must match pipeline stage names.', kvKey: 'pipeline', columns: 'Company Name, Sector, Ticket Size (₹Cr), Stage at Investment, Lead Partner, Date Added, Pipeline Stage, Notes' },
      { csv: 'IC Memos', mapsTo: 'Investment → IC Memos tab. One row per IC memo per company.', kvKey: 'ic_memos', columns: 'Company Name, Round Name, Ask Amount, Proposed Valuation, Status, IC Date, Recommendation, Prepared By' },
      { csv: 'Reference Checks', mapsTo: 'Investment → Reference Checks tab. One row per reference call.', kvKey: 'ref_checks', columns: 'Company Name, Subject Name, Subject Role, Referent Name, Sentiment, Strengths, Weaknesses, Would Work Again' },
      { csv: 'Co-investors', mapsTo: 'Investment → Co-investors tab. VC/angel relationship CRM.', kvKey: 'co_investors', columns: 'Firm Name, Partner Name, Email, Sectors, Check Size Min/Max, Warmth (hot/warm/cold)' },
    ],
    tabGuides: [
      { tab: 'Pipeline (Kanban)', what: 'Reads from Deal Pipeline CSV. Columns = stages configured in Admin → Deal Stages. Each card = one deal.', appearsIn: 'Investment → Pipeline tab' },
      { tab: 'IC Memos', what: 'Full IC memo builder with all sections. Status tracks: draft → under_review → approved/rejected. Can export as PDF.', appearsIn: 'Investment → IC Memos tab' },
      { tab: 'Due Diligence', what: 'DD checklist per deal. Default 30+ items across Legal, Financial, Technical, Commercial, Team. No CSV sync — managed directly.', appearsIn: 'Investment → Due Diligence tab' },
      { tab: 'Co-investors', what: 'CRM for VC/angel relationships. Warmth rating, check size, shared deals, sectors. Key for syndication.', appearsIn: 'Investment → Co-investors tab' },
    ],
  },

  operations: {
    team: 'Operations Team',
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#D9770640',
    presetName: 'Operations Team Data',
    steps: [
      'Download template → exports current tasks, meeting notes, intro requests',
      'Edit in Excel — bulk-add tasks, log meetings from external notes',
      'Upload to SharePoint → copy URL',
      'Data Sync → "Add SharePoint Source" → select "Operations Team Data" → Sync',
    ],
    entries: [
      { csv: 'Tasks', mapsTo: 'Operations → Tasks tab (kanban). Assignee, due date, priority, status per task.', kvKey: 'tasks', columns: 'Title, Description, Company, Assignee, Due Date (YYYY-MM-DD), Priority (urgent/high/medium/low), Status (todo/in_progress/done)' },
      { csv: 'Meeting Notes', mapsTo: 'Operations → Meeting Notes tab. Searchable log of all calls, board meetings, LP meetings.', kvKey: 'meeting_notes', columns: 'Title, Meeting Type, Date, Company, Attendees, Summary, Action Items (pipe-separated)' },
      { csv: 'Intro Requests', mapsTo: 'Operations → Intros tab. Track who wants intro to whom, assigned to whom, status.', kvKey: 'intro_requests', columns: 'Requested By, From Company, Target Name, Target Role, Target Company, Purpose, Assigned To, Status' },
      { csv: 'Candidates', mapsTo: 'Operations → Recruitment → Candidates tab. Bulk import candidates for open positions.', kvKey: 'recruitment', columns: 'Job Title (matches open job), Name, Email, Phone, Current Company, Notice Period, Source, Resume URL' },
    ],
    tabGuides: [
      { tab: 'Meeting Notes', what: 'Searchable log of all founder calls, LP meetings, board meetings, internal. Filter by type, company, date.', appearsIn: 'Operations → Meeting Notes tab' },
      { tab: 'Tasks', what: 'Kanban with To Do / In Progress / Done. Assignee, company tag, due date, priority. Bulk assign, bulk complete.', appearsIn: 'Operations → Tasks tab' },
      { tab: 'Portfolio Updates', what: 'Monthly founder check-ins. Founders submit via CSV sync or directly in portal. Team reviews in one feed.', appearsIn: 'Operations → Portfolio Updates tab' },
      { tab: 'Recruitment', what: 'Full ATS: Jobs → Pipeline (kanban) → AI Resume Screen → Interviews → Offer Letter → Onboarding checklist.', appearsIn: 'Operations → Recruitment tab' },
    ],
  },
};

interface Props {
  team: 'finance' | 'portfolio' | 'investment' | 'operations';
}

export default function TeamGuide({ team }: Props) {
  const guide = GUIDES[team];
  if (!guide) return null;

  return (
    <div className="rounded-xl border p-5 space-y-5"
      style={{ backgroundColor: guide.bgColor, borderColor: guide.borderColor }}>

      {/* Header */}
      <div>
        <p className="text-sm font-bold mb-0.5" style={{ color: guide.color }}>
          {guide.team} — Data Sync Guide
        </p>
        <p className="text-xs text-gray-500">
          Select <strong>"{guide.presetName}"</strong> when adding a SharePoint source — all sheet mappings auto-fill.
        </p>
      </div>

      {/* Steps */}
      <div>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">How to sync data</p>
        <ol className="space-y-1">
          {guide.steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
              <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 mt-0.5"
                style={{ backgroundColor: guide.color }}>
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </div>

      {/* CSV → Portal mapping */}
      <div>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">What each CSV sheet does</p>
        <div className="space-y-2">
          {guide.entries.map(e => (
            <div key={e.csv} className="bg-white rounded-lg border border-gray-100 p-3 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <code className="text-xs font-bold px-2 py-0.5 rounded" style={{ backgroundColor: guide.color + '18', color: guide.color }}>
                  {e.csv}
                </code>
                <span className="text-[10px] text-gray-400">→ kvKey:</span>
                <code className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">{e.kvKey}</code>
              </div>
              <p className="text-xs text-gray-600">{e.mapsTo}</p>
              <p className="text-[10px] text-gray-400">
                <span className="font-medium text-gray-500">Columns: </span>{e.columns}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Tab guide */}
      <div>
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">What each portal tab does</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {guide.tabGuides.map(t => (
            <div key={t.tab} className="bg-white rounded-lg border border-gray-100 p-2.5 space-y-1">
              <p className="text-xs font-semibold text-gray-800">{t.tab}</p>
              <p className="text-[10px] text-gray-500">{t.what}</p>
              <p className="text-[10px] font-medium" style={{ color: guide.color }}>📍 {t.appearsIn}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
