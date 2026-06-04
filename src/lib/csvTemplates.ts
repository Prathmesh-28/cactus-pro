/**
 * CSV Template Library
 * Each template has: id, label, team, sheetName (matches SyncManager kvKey),
 * headers, and 2–3 example rows.
 * Download any template, fill it, upload to SharePoint, then sync via Data Sync.
 */

export interface CsvTemplate {
  id: string;
  label: string;
  team: 'finance' | 'portfolio' | 'investment' | 'operations' | 'global';
  sheetName: string;      // Recommended sheet name in Excel/SharePoint
  kvKey: string;          // Maps to SyncManager kvKey
  description: string;
  headers: string[];
  exampleRows: string[][];
  notes?: string;
}

export const CSV_TEMPLATES: CsvTemplate[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // FINANCE TEAM TEMPLATES
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'fund-metrics',
    label: 'Fund Metrics',
    team: 'finance',
    sheetName: 'Fund Metrics',
    kvKey: 'fund_1::fund_metrics',
    description: 'Core fund performance metrics — Called Capital, NAV, IRR, MOIC, TVPI, DPI',
    headers: ['Metric', 'Fund 1', 'Fund 2', 'Combined', 'Unit', 'Notes'],
    exampleRows: [
      ['Called Capital', '250', '350', '600', '₹ Cr', 'Total capital deployed'],
      ['NAV', '687', '510', '1197', '₹ Cr', 'Net Asset Value (FMV of all holdings)'],
      ['TVPI', '3.2', '2.1', '2.6', 'x', 'Total Value to Paid-In'],
      ['DPI', '0.4', '0.1', '0.25', 'x', 'Distributions to Paid-In'],
      ['Gross IRR', '38.5', '28.2', '33.8', '%', 'Before management fees'],
      ['Net IRR', '36.5', '26.2', '31.8', '%', 'After 2% management fee'],
      ['MOIC', '2.75', '1.46', '2.0', 'x', 'NAV / Called Capital'],
      ['Distributions', '100', '35', '135', '₹ Cr', 'Cash returned to LPs'],
    ],
    notes: 'Map this sheet to: Finance → Fund Metrics in Data Sync',
  },

  {
    id: 'cash-flows',
    label: 'Cash Flows (Quarterly)',
    team: 'finance',
    sheetName: 'Cash Flows',
    kvKey: 'fund_1::cash_flows',
    description: 'Quarterly cash flow statement — contributions, distributions, NAV',
    headers: ['Quarter', 'Capital Called (₹Cr)', 'Distributions (₹Cr)', 'NAV (₹Cr)', 'Cumulative Called', 'Cumulative Distributed', 'Notes'],
    exampleRows: [
      ['Q1 FY22', '45', '0', '42', '45', '0', 'Initial deployment'],
      ['Q2 FY22', '38', '0', '86', '83', '0', 'Lohum + Bellatrix'],
      ['Q3 FY22', '52', '0', '145', '135', '0', ''],
      ['Q4 FY22', '30', '0', '182', '165', '0', ''],
      ['Q1 FY23', '25', '0', '210', '190', '0', 'Auric first cheque'],
      ['Q2 FY23', '20', '0', '248', '210', '0', ''],
      ['Q3 FY23', '15', '100', '265', '225', '100', 'Rubix partial exit'],
      ['Q1 FY24', '18', '0', '310', '243', '100', ''],
    ],
  },

  {
    id: 'fund-expenses',
    label: 'Fund Expenses (Projected)',
    team: 'finance',
    sheetName: 'Fund Expenses',
    kvKey: 'et:fund_expenses',
    description: 'Fund-level operating expenses projected over fund life FY23–FY31',
    headers: ['Category', 'FY23', 'FY24', 'FY25', 'FY26', 'FY27', 'FY28', 'FY29', 'FY30', 'FY31', 'Total'],
    exampleRows: [
      ['Management Fees (2%)', '5.0', '5.0', '5.0', '5.0', '3.75', '3.75', '3.75', '3.75', '3.75', '39.75'],
      ['Legal & Compliance', '0.8', '0.6', '0.6', '0.8', '0.6', '0.6', '0.6', '0.8', '0.6', '6.0'],
      ['Audit & Accounting', '0.5', '0.5', '0.5', '0.5', '0.5', '0.5', '0.5', '0.5', '0.5', '4.5'],
      ['Travel & Diligence', '0.6', '0.8', '0.8', '0.6', '0.4', '0.4', '0.4', '0.4', '0.4', '5.4'],
      ['Admin & Other', '0.4', '0.4', '0.4', '0.4', '0.4', '0.4', '0.4', '0.4', '0.4', '3.6'],
      ['Total', '7.3', '7.3', '7.3', '7.3', '5.65', '5.65', '5.65', '5.85', '5.65', '59.25'],
    ],
  },

  {
    id: 'im-expenses',
    label: 'IM Expenses (Actual vs Budget)',
    team: 'finance',
    sheetName: 'IM Expenses',
    kvKey: 'et:im_expenses',
    description: 'Investment Manager operating expenses — actual vs budgeted by quarter',
    headers: ['Category', 'Budgeted (₹Cr)', 'Q1 Actual', 'Variance Q1 %', 'Q2 Actual', 'Variance Q2 %', 'Q3 Actual', 'Variance Q3 %', 'Q4 Actual', 'Variance Q4 %', 'FY Total'],
    exampleRows: [
      ['Salaries & Benefits', '2.4', '0.58', '-3.3', '0.62', '3.3', '0.60', '0.0', '0.61', '1.7', '2.41'],
      ['Rent & Utilities', '0.48', '0.12', '0.0', '0.12', '0.0', '0.12', '0.0', '0.12', '0.0', '0.48'],
      ['Technology & Software', '0.24', '0.05', '-16.7', '0.06', '0.0', '0.07', '16.7', '0.06', '0.0', '0.24'],
      ['Travel (Domestic)', '0.36', '0.08', '-11.1', '0.10', '11.1', '0.09', '0.0', '0.09', '0.0', '0.36'],
      ['Events & Conferences', '0.18', '0.03', '-33.3', '0.04', '-11.1', '0.05', '11.1', '0.06', '33.3', '0.18'],
      ['Total IM Expenses', '3.66', '0.86', '-6.0', '0.94', '2.7', '0.93', '1.6', '0.94', '2.7', '3.67'],
    ],
  },

  {
    id: 'capital-calls',
    label: 'Capital Calls & Distributions',
    team: 'finance',
    sheetName: 'Capital Calls',
    kvKey: 'capital_calls',
    description: 'Capital call notices and distribution notices to LPs',
    headers: ['Type', 'Notice Date', 'Due Date', 'Amount (₹Cr)', 'Fund', 'Purpose', 'Status', 'LP Name', 'LP Amount (₹Cr)', 'Received Date'],
    exampleRows: [
      ['capital_call', '2025-04-01', '2025-04-15', '25', 'Fund 2', 'Auric follow-on Series A', 'complete', 'HDFC Pension Fund', '6.25', '2025-04-14'],
      ['capital_call', '2025-04-01', '2025-04-15', '25', 'Fund 2', 'Auric follow-on Series A', 'complete', 'SBI Family Office', '4.17', '2025-04-15'],
      ['capital_call', '2025-04-01', '2025-04-15', '25', 'Fund 2', 'Auric follow-on Series A', 'partial', 'Premji Invest', '8.33', ''],
      ['distribution', '2025-03-01', '2025-03-15', '100', 'Fund 1', 'Rubix partial exit proceeds', 'complete', 'HDFC Pension Fund', '25', '2025-03-12'],
    ],
    notes: 'Type must be: capital_call or distribution. Status: draft/sent/partial/complete',
  },

  {
    id: 'valuation-log',
    label: 'Valuation Log (Quarterly Marks)',
    team: 'finance',
    sheetName: 'Valuation Log',
    kvKey: 'valuation_log',
    description: 'Fair market value marks per company per quarter for fund NAV calculation',
    headers: ['Company Name', 'Quarter', 'FMV (₹Cr)', 'Methodology', 'MOIC at Mark', 'Notes', 'Marked By', 'Marked At'],
    exampleRows: [
      ['Lohum', 'Q4 FY25', '4700', 'Last Round', '2.92', 'Series B valuation. Tata Capital led.', 'Rajeev Kumar', '2025-03-31'],
      ['Auric', 'Q4 FY25', '977', 'Revenue Multiple', '5.0', '7.7x FY25 revenue. Peer comp.', 'Amit Sharma', '2025-03-31'],
      ['Bellatrix', 'Q4 FY25', '836', 'Last Round', '3.6', 'Series A. ISRO contracts pipeline.', 'Rajeev Kumar', '2025-03-31'],
      ['Vitraya', 'Q4 FY25', '280', 'Revenue Multiple', '3.5', 'Profitable. 14x revenue multiple.', 'Amit Sharma', '2025-03-31'],
      ['Kapture', 'Q4 FY25', '446', 'Revenue Multiple', '3.1', 'NRR 118%. 8.6x ARR.', 'Rajeev Kumar', '2025-03-31'],
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // PORTFOLIO TEAM TEMPLATES
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'financial-periods',
    label: 'Financial Periods (FY/CY Quarterly)',
    team: 'portfolio',
    sheetName: 'FY Revenue & Ops',
    kvKey: 'financial_periods',
    description: 'Quarterly and annual revenue, ARR, MRR, margins, burn, MOIC, IRR per company. KEY: Company ID + Year Style + Period',
    headers: [
      'Company Name', 'Company ID', 'Year Style', 'Period', 'Period Type', 'Fiscal Year', 'Quarter',
      'Revenue (₹Cr)', 'ARR (₹Cr)', 'MRR (₹Cr)', 'GMV (₹Cr)',
      'Revenue Growth YoY %', 'ARR Growth YoY %', 'NRR %', 'Churn % (monthly)',
      'Gross Margin %', 'EBITDA Margin %', 'Net Margin %',
      'Valuation FMV (₹Cr)', 'MOIC', 'IRR %', 'Valuation Methodology',
      'Headcount', 'Monthly Burn (₹Cr)', 'Cash Balance (₹Cr)', 'Runway (months)',
      'CAC (₹)', 'LTV (₹)', 'LTV:CAC',
      'Notes', 'Source', 'Updated By', 'Updated At',
    ],
    exampleRows: [
      ['Lohum', 'c3', 'FY', 'FY2025-Q4', 'quarterly', 'FY2025', 'Q4', '235', '', '', '', '34', '', '', '', '47', '19', '14', '4700', '2.92', '38', 'Last Round', '520', '9', '150', '17', '', '', '', 'Q4 FY25 — DRHP filing expected', 'Manual', 'Portfolio Team', '2025-03-31'],
      ['Lohum', 'c3', 'FY', 'FY2025-Annual', 'annual', 'FY2025', '', '835', '', '', '', '39', '', '', '', '46', '18', '13', '4700', '2.92', '38', 'Last Round', '520', '10', '150', '15', '', '', '', 'FY25 Full Year. Profitable.', 'Manual', 'Portfolio Team', '2025-03-31'],
      ['Auric', 'c8', 'FY', 'FY2025-Annual', 'annual', 'FY2025', '', '126', '', '', '', '129', '', '', '', '58', '10', '5', '977', '3.4', '42', 'Revenue Multiple', '130', '3', '40', '13', '', '', '', '459% revenue CAGR', 'Manual', 'Portfolio Team', '2025-03-31'],
      ['Kapture CRM', 'c7', 'FY', 'FY2025-Q4', 'quarterly', 'FY2025', 'Q4', '14', '52', '4.3', '', '37', '37', '118', '1.8', '75', '18', '9', '446', '3.1', '38', 'Revenue Multiple', '200', '2', '35', '18', '', '', '', 'NRR 118%. B2B SaaS.', 'Manual', 'Portfolio Team', '2025-03-31'],
    ],
    notes: 'IMPORTANT: Do not change Company ID or Year Style + Period columns — these are the composite key for deduplication.',
  },

  {
    id: 'portfolio-updates',
    label: 'Monthly Portfolio Updates',
    team: 'portfolio',
    sheetName: 'Portfolio Updates',
    kvKey: 'portfolio_updates',
    description: 'Monthly update submissions from portfolio company founders',
    headers: ['Company Name', 'Month (YYYY-MM)', 'Status', 'Revenue (₹Cr)', 'Burn (₹Cr)', 'Cash (₹Cr)', 'Headcount', 'Highlights', 'Challenges', 'Asks', 'Next Month Goals', 'Submitted By'],
    exampleRows: [
      ['Lohum', '2025-03', 'reviewed', '235', '9', '150', '520', 'Signed 2 new OEM contracts. Plant 4 at 95% capacity.', 'DRHP preparation consuming bandwidth.', 'Intro to BPCL procurement head needed.', 'File DRHP by April 30. Hire CFO.', 'CEO'],
      ['Auric', '2025-03', 'submitted', '12.5', '3', '40', '130', 'New distribution deal with DMart for 200 stores.', 'Rising raw material costs for herbs.', 'Working capital support of ₹5Cr for Q1 FY26 inventory.', 'Launch 3 new SKUs. Reach ₹15Cr monthly.', 'COO'],
      ['Kapture CRM', '2025-03', 'submitted', '4.3', '2', '35', '200', 'Closed HDFC Bank enterprise deal (₹1.8Cr ARR).', 'US expansion slower than expected.', 'Intro to Axis Bank CTO for enterprise demo.', 'Reach $2M ARR. Hire VP Sales US.', 'CEO'],
    ],
  },

  {
    id: 'company-health',
    label: 'Portfolio Health Dashboard',
    team: 'portfolio',
    sheetName: 'Company Health',
    kvKey: 'health_dashboard',
    description: 'Quarterly health signal ratings per company (green/amber/red/grey)',
    headers: ['Company Name', 'Company ID', 'Quarter', 'Revenue Growth Signal', 'Burn Signal', 'Team Retention Signal', 'Product Progress Signal', 'Fundraising Signal', 'Overall Signal', 'Notes', 'Reviewed By', 'Reviewed At'],
    exampleRows: [
      ['Lohum', 'c3', 'Q4 FY25', 'green', 'green', 'green', 'green', 'green', 'green', 'IPO prep on track. All signals strong.', 'Rajeev Kumar', '2025-03-31'],
      ['Auric', 'c8', 'Q4 FY25', 'green', 'amber', 'green', 'green', 'green', 'green', 'Revenue strong but burn slightly elevated due to DMart inventory build.', 'Amit Sharma', '2025-03-31'],
      ['AMPM', 'c9', 'Q4 FY25', 'amber', 'amber', 'green', 'amber', 'amber', 'amber', 'Growth slower than plan. Watching closely.', 'Portfolio Team', '2025-03-31'],
      ['ParkMate', 'c12', 'Q4 FY25', 'green', 'amber', 'green', 'green', 'amber', 'green', 'Revenue growing but next round still being scoped.', 'Portfolio Team', '2025-03-31'],
    ],
    notes: 'Signal values: green | amber | red | grey. Overall derived from worst signal.',
  },

  {
    id: 'founder-contacts',
    label: 'Founder Directory',
    team: 'portfolio',
    sheetName: 'Founder Contacts',
    kvKey: 'founder_contacts',
    description: 'Founder and key contact details for all portfolio companies',
    headers: ['Company Name', 'Name', 'Role', 'Email', 'Phone', 'LinkedIn URL', 'Twitter/X URL', 'Birthday (YYYY-MM-DD)', 'Location', 'Last Contacted (YYYY-MM-DD)', 'Tags', 'Notes'],
    exampleRows: [
      ['Lohum', 'Kartik Hajela', 'Co-Founder & CEO', 'kartik@lohum.in', '+91 98765 43210', 'https://linkedin.com/in/kartik-hajela', '', '1985-06-15', 'Delhi', '2025-03-15', 'founder,battery,IPO', 'Led Lohum from seed to Series B. IIT Delhi + ISB.'],
      ['Auric', 'Deepak Agarwal', 'Co-Founder & CEO', 'deepak@auric.in', '+91 97654 32109', 'https://linkedin.com/in/deepakagarwal', '', '', 'Mumbai', '2025-02-28', 'founder,d2c,health', 'Health drinks. Building D2C brand across India.'],
      ['Kapture CRM', 'Sheshgiri Kamath', 'CEO', 'sheshgiri@kapturecrm.com', '+91 96543 21098', 'https://linkedin.com/in/sheshgiri', '', '', 'Bangalore', '2025-03-10', 'ceo,saas,crm', 'Built Kapture from 0 to ₹52Cr ARR. Ex-HCL.'],
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  // INVESTMENT TEAM TEMPLATES
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'deal-pipeline',
    label: 'Deal Pipeline',
    team: 'investment',
    sheetName: 'Deal Pipeline',
    kvKey: 'pipeline',
    description: 'Active deal pipeline — deals being evaluated for investment',
    headers: ['Company Name', 'Sector', 'Ticket Size (₹Cr)', 'Stage at Investment', 'Lead Partner', 'Date Added (YYYY-MM-DD)', 'Pipeline Stage', 'Notes'],
    exampleRows: [
      ['NeuralEdge AI', 'SaaS & AI', '25', 'Series A', 'Rajeev Kumar', '2025-01-10', 'Due Diligence', 'Strong team. GenAI infra play. Market validation in progress.'],
      ['GreenHeat Solutions', 'Energy & Sustainability', '16', 'Seed', 'Amit Sharma', '2025-02-01', 'Sourcing', 'Intro via IIT Bombay. Industrial heat-pump technology.'],
      ['UrbanLogix', 'Mobility & Smart City', '33', 'Series A', 'Rajeev Kumar', '2025-01-15', 'IC Review', 'Last-mile logistics AI platform. Term sheet under review.'],
      ['CropSense Tech', 'Energy & Sustainability', '12', 'Seed', 'Amit Sharma', '2025-03-01', 'Term Sheet', 'Precision agri IoT. Deal closing soon.'],
    ],
    notes: 'Pipeline Stage values: Sourcing | Due Diligence | IC Review | Term Sheet | Closed | Passed',
  },

  {
    id: 'ic-memos',
    label: 'IC Memo Tracker',
    team: 'investment',
    sheetName: 'IC Memos',
    kvKey: 'ic_memos',
    description: 'Investment Committee memo tracker — status and key details',
    headers: ['Company Name', 'Round Name', 'Ask Amount (₹Cr)', 'Proposed Valuation (₹Cr)', 'Status', 'IC Date (YYYY-MM-DD)', 'Recommendation', 'Prepared By', 'Reviewed By', 'Notes'],
    exampleRows: [
      ['UrbanLogix', 'Series A', '33', '250', 'under_review', '2025-04-10', 'invest', 'Rajeev Kumar', 'Amit Sharma,Board', 'Strong unit economics. Logistics AI with 3 enterprise clients.'],
      ['CropSense Tech', 'Seed', '12', '85', 'approved', '2025-03-15', 'invest', 'Amit Sharma', 'Rajeev Kumar', 'Agri IoT. 50 farmers on pilot. Deal closing.'],
      ['MediSync', 'Series A', '20', '140', 'rejected', '2024-12-10', 'pass', 'Rajeev Kumar', 'Board', 'Unit economics not viable. Revisit in 12 months.'],
    ],
    notes: 'Status: draft | under_review | approved | rejected. Recommendation: invest | pass | follow_up',
  },

  {
    id: 'reference-checks',
    label: 'Reference Checks',
    team: 'investment',
    sheetName: 'Reference Checks',
    kvKey: 'ref_checks',
    description: 'Reference check records for founders and key team members',
    headers: ['Company Name', 'Subject Name', 'Subject Role', 'Referent Name', 'Referent Role', 'Referent Company', 'Relationship', 'Date (YYYY-MM-DD)', 'Conducted By', 'Sentiment', 'Strengths', 'Weaknesses', 'Would Work Again', 'Raw Notes'],
    exampleRows: [
      ['UrbanLogix', 'Vikram Mehta', 'CEO', 'Rajan Sood', 'CTO', 'Flipkart', 'Ex-colleague (2018-21)', '2025-03-20', 'Rajeev Kumar', 'very_positive', 'Exceptional execution, team builder, data-driven.', 'Sometimes too detail-oriented, slows decisions.', 'TRUE', 'Vikram is one of the best operators I have worked with. Would hire again.'],
    ],
    notes: 'Sentiment: very_positive | positive | neutral | negative | very_negative. Would Work Again: TRUE or FALSE',
  },

  {
    id: 'co-investors',
    label: 'Co-investor CRM',
    team: 'investment',
    sheetName: 'Co-investors',
    kvKey: 'co_investors',
    description: 'Co-investor relationships for syndication and deal sharing',
    headers: ['Firm Name', 'Partner Name', 'Email', 'Phone', 'LinkedIn URL', 'Sectors (comma-sep)', 'Stages (comma-sep)', 'Check Size Min (₹Cr)', 'Check Size Max (₹Cr)', 'Geography', 'Warmth', 'Shared Deals (comma-sep)', 'Notes'],
    exampleRows: [
      ['360 ONE Asset Management', 'Dhanpal Jhaveri', 'dhanpal@360one.in', '+91 98765 11111', 'https://linkedin.com/in/dhanpal', 'Energy,Manufacturing,Tech', 'Series A,Series B', '20', '100', 'India', 'hot', 'Lohum,Indigrid', 'Co-led Lohum Series B. Strong manufacturing thesis.'],
      ['Tata Capital Innovations', 'Padmanabh Sinha', 'padmanabh@tatacapital.com', '', 'https://linkedin.com/in/padmanabh', 'Deeptech,Manufacturing', 'Series B,Growth', '50', '200', 'India', 'warm', 'Lohum', 'Tata strategic. Good for manufacturing portfolio.'],
      ['Blume Ventures', 'Sanjay Nath', 'sanjay@blume.vc', '', 'https://linkedin.com/in/sanjaynath', 'SaaS,Consumer,Fintech', 'Seed,Series A', '1', '15', 'India', 'warm', '', 'Seed fund. Good for SaaS co-investments.'],
    ],
    notes: 'Warmth: hot | warm | cold | unknown',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // OPERATIONS TEAM TEMPLATES
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'tasks',
    label: 'Team Tasks',
    team: 'operations',
    sheetName: 'Tasks',
    kvKey: 'tasks',
    description: 'Team task manager — assignable tasks with priorities and due dates',
    headers: ['Title', 'Description', 'Company', 'Assignee', 'Due Date (YYYY-MM-DD)', 'Priority', 'Status', 'Tags'],
    exampleRows: [
      ['Follow up with Lohum on board minutes', 'Get Q4 FY25 board minutes signed and filed.', 'Lohum', 'Rajeev Kumar', '2025-04-15', 'high', 'todo', 'board,compliance'],
      ['Review Auric Series A term sheet', 'Detailed review of Tata Capital term sheet. Flag any issues.', 'Auric', 'Amit Sharma', '2025-04-10', 'urgent', 'in_progress', 'termsheet,investment'],
      ['Update LP quarterly report template', 'Add new portfolio companies. Update metrics to FY25.', '', 'Finance Team', '2025-04-20', 'medium', 'todo', 'lp,report'],
      ['Schedule founder check-ins for Q1 FY26', 'Book 30-min calls with all 13 portfolio CEOs.', '', 'Rajeev Kumar', '2025-04-30', 'medium', 'todo', 'founder,operations'],
    ],
    notes: 'Priority: urgent | high | medium | low. Status: todo | in_progress | done',
  },

  {
    id: 'meeting-notes',
    label: 'Meeting Notes & Call Logs',
    team: 'operations',
    sheetName: 'Meeting Notes',
    kvKey: 'meeting_notes',
    description: 'Log of all meetings with founders, LPs, co-investors, and internal team',
    headers: ['Title', 'Meeting Type', 'Date (YYYY-MM-DD)', 'Company', 'Attendees (comma-sep)', 'Summary', 'Action Items (pipe-sep)', 'Next Meeting Date'],
    exampleRows: [
      ['Lohum Q4 FY25 Board Meeting', 'board_meeting', '2025-03-28', 'Lohum', 'Kartik Hajela,Rajeev Kumar,Amit Sharma,Tata Capital Rep', 'Q4 revenue ₹235Cr (+34% YoY). DRHP filing on track. Plant 4 at 95%.', 'Rajeev: file board resolution by Apr 5|Kartik: submit draft DRHP to SEBI by Apr 30|Amit: update LP report', '2025-06-27'],
      ['Auric Founder Call', 'founder_call', '2025-03-15', 'Auric', 'Deepak Agarwal,Rajeev Kumar', 'DMart deal finalised. 200 stores. Need ₹5Cr working capital.', 'Rajeev: explore WC options with SBI|Deepak: send updated projections by Mar 20', '2025-04-15'],
      ['HDFC Pension Fund LP Update', 'lp_meeting', '2025-03-10', '', 'LP Rep,Rajeev Kumar,Finance Team', 'Q3 FY25 fund update. DPI question raised. Addressed with Rubix exit proceeds.', 'Finance: send formal Q3 LP report|Rajeev: schedule one-on-one with LP head', '2025-06-10'],
    ],
    notes: 'Meeting Type: founder_call | lp_meeting | board_meeting | co_investor | intro | internal | other',
  },

  {
    id: 'intro-requests',
    label: 'Intro Request Tracker',
    team: 'operations',
    sheetName: 'Intro Requests',
    kvKey: 'intro_requests',
    description: 'Track intro requests from founders to potential partners, clients, or investors',
    headers: ['Requested By (Founder)', 'From Company', 'Target Name', 'Target Role', 'Target Company', 'Purpose', 'Assigned To', 'Status', 'Request Date', 'Closed Date', 'Notes'],
    exampleRows: [
      ['Kartik Hajela', 'Lohum', 'RK Singh', 'Director', 'BPCL', 'Battery recycling supply chain partnership', 'Rajeev Kumar', 'intro_sent', '2025-03-01', '', 'Warm intro via Tata network. Meeting scheduled April 8.'],
      ['Deepak Agarwal', 'Auric', 'Head of Procurement', 'VP', 'Reliance Retail', 'Retail distribution for health drinks', 'Amit Sharma', 'requested', '2025-03-20', '', 'Need to find right contact at Reliance.'],
    ],
    notes: 'Status: requested | intro_sent | responded | meeting_scheduled | closed_won | closed_lost',
  },

  // ══════════════════════════════════════════════════════════════════════════
  // SHARED / GLOBAL TEMPLATES
  // ══════════════════════════════════════════════════════════════════════════

  {
    id: 'lp-investors',
    label: 'LP Investors',
    team: 'global',
    sheetName: 'LP Summary',
    kvKey: 'lp_summary',
    description: 'Limited Partner investor details — commitment, called, distributed, NAV',
    headers: ['LP Name', 'LP Email', 'Total Commitment (₹Cr)', 'Capital Called (₹Cr)', 'Distributions Received (₹Cr)', 'Current NAV (₹Cr)', 'Fund', 'Lead Partner', 'Notes'],
    exampleRows: [
      ['HDFC Pension Fund', 'lp@hdfcpension.com', '150', '120', '45', '195', 'Fund 1', 'Rajeev Kumar', 'Anchor LP. Committed FY21.'],
      ['SBI Family Office', 'fo@sbi.co.in', '100', '85', '28', '132', 'Fund 1', 'Rajeev Kumar', 'Strategic LP.'],
      ['Premji Invest', 'invest@premji.com', '200', '180', '72', '310', 'Fund 1,Fund 2', 'Amit Sharma', 'Azim Premji family office. In both funds.'],
      ['Kotak Wealth HNI Pool', 'wealth@kotak.com', '75', '60', '18', '92', 'Fund 2', 'Rajeev Kumar', 'HNI pool via Kotak.'],
    ],
  },

  {
    id: 'candidates',
    label: 'Recruitment Candidates',
    team: 'operations',
    sheetName: 'Candidates',
    kvKey: 'recruitment',
    description: 'Bulk import candidates for open positions',
    headers: ['Job Title', 'Name', 'Email', 'Phone', 'LinkedIn URL', 'Current Company', 'Current Role', 'Notice Period', 'Expected CTC (₹)', 'Current CTC (₹)', 'Location', 'Source', 'Resume URL', 'Notes'],
    exampleRows: [
      ['Investment Analyst', 'Priya Sharma', 'priya.sharma@gmail.com', '+91 98765 43210', 'https://linkedin.com/in/priyasharma', 'Sequoia Capital India', 'Analyst', '30 days', '1800000', '1500000', 'Mumbai', 'LinkedIn', '', 'IIM Calcutta. 2 years PE/VC experience.'],
      ['Portfolio Manager', 'Arjun Verma', 'arjun.v@outlook.com', '+91 97654 32109', 'https://linkedin.com/in/arjunverma', 'Tata Capital', 'Senior Associate', '60 days', '2500000', '2000000', 'Mumbai', 'Referral', '', 'Referred by Tata Capital LP.'],
    ],
  },
];

// ── Download helper ──────────────────────────────────────────────────────────

// ── Data generators — pull actual store data as CSV rows ─────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Store = Record<string, any>;

function safe(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (Array.isArray(v)) return v.join(', ');
  return String(v);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DATA_GENERATORS: Record<string, (store: Store) => string[][]> = {
  'fund-metrics': (store) => {
    const invs: Store[] = store.fundInvestments ?? [];
    if (!invs.length) return [];
    const funds = [...new Set(invs.map((i: Store) => i.fund as string))];
    const rows: string[][] = [];
    const metrics = [
      { label: 'Called Capital', fn: (f: string) => String(invs.filter(i => !f || i.fund === f).reduce((s: number, i: Store) => s + parseFloat(i.totalInvested || '0'), 0).toFixed(2)) },
      { label: 'NAV', fn: (f: string) => String(invs.filter(i => !f || i.fund === f).reduce((s: number, i: Store) => s + parseFloat(i.currentFMV || '0'), 0).toFixed(2)) },
      { label: 'Distributions', fn: (f: string) => String(invs.filter(i => !f || i.fund === f).reduce((s: number, i: Store) => s + parseFloat(i.realizedValue || '0'), 0).toFixed(2)) },
      { label: 'TVPI', fn: (f: string) => { const t = invs.filter(i => !f || i.fund === f); const c = t.reduce((s: number, i: Store) => s + parseFloat(i.totalInvested || '0'), 0); const n = t.reduce((s: number, i: Store) => s + parseFloat(i.currentFMV || '0'), 0) + t.reduce((s: number, i: Store) => s + parseFloat(i.realizedValue || '0'), 0); return c > 0 ? (n/c).toFixed(2) : '0'; } },
      { label: 'DPI', fn: (f: string) => { const t = invs.filter(i => !f || i.fund === f); const c = t.reduce((s: number, i: Store) => s + parseFloat(i.totalInvested || '0'), 0); const d = t.reduce((s: number, i: Store) => s + parseFloat(i.realizedValue || '0'), 0); return c > 0 ? (d/c).toFixed(2) : '0'; } },
      { label: 'Gross IRR', fn: (f: string) => { const t = invs.filter(i => !f || i.fund === f); return t.length ? (t.reduce((s: number, i: Store) => s + parseFloat(i.irr || '0') * parseFloat(i.totalInvested || '0'), 0) / Math.max(t.reduce((s: number, i: Store) => s + parseFloat(i.totalInvested || '0'), 0), 1)).toFixed(1) : '0'; } },
      { label: 'MOIC', fn: (f: string) => { const t = invs.filter(i => !f || i.fund === f); const c = t.reduce((s: number, i: Store) => s + parseFloat(i.totalInvested || '0'), 0); const n = t.reduce((s: number, i: Store) => s + parseFloat(i.currentFMV || '0'), 0); return c > 0 ? (n/c).toFixed(2) : '0'; } },
    ];
    metrics.forEach(m => {
      rows.push([m.label, ...funds.map(f => m.fn(f)), m.fn(''), '₹ Cr or x', '']);
    });
    return rows;
  },

  'cash-flows': (store) => {
    const cf: Store[] = store.cashFlow ?? [];
    return cf.map(q => [safe(q.quarter), safe(q.contributions), safe(q.distributions), safe(q.nav), '', '', '']);
  },

  'financial-periods': (store) => {
    const periods: Store[] = store.financialPeriods ?? [];
    const companies: Store[] = store.companies ?? [];
    const cMap = Object.fromEntries(companies.map((c: Store) => [c.id, c.name]));
    return periods.map(p => [
      cMap[p.companyId] ?? p.companyId, safe(p.companyId), safe(p.yearStyle), safe(p.periodLabel),
      safe(p.periodType), safe(p.fiscalYear), safe(p.quarter),
      safe(p.revenue), safe(p.arr), safe(p.mrr), safe(p.gmv),
      safe(p.revenueGrowthYoY), safe(p.arrGrowthYoY), safe(p.nrr), safe(p.churnPct),
      safe(p.grossMarginPct), safe(p.ebitdaMarginPct), safe(p.netMarginPct),
      safe(p.currentValuation), safe(p.moic), safe(p.irr), safe(p.methodology),
      safe(p.headcount), safe(p.monthlyBurn), safe(p.cash), safe(p.runway),
      safe(p.cac), safe(p.ltv), safe(p.ltvCacRatio),
      safe(p.notes), safe(p.source), safe(p.updatedBy), safe(p.updatedAt),
    ]);
  },

  'portfolio-updates': (store) => {
    const updates: Store[] = store.portfolioUpdates ?? [];
    const companies: Store[] = store.companies ?? [];
    const cMap = Object.fromEntries(companies.map((c: Store) => [c.id, c.name]));
    return updates.map(u => [
      cMap[u.companyId] ?? u.companyId, safe(u.month), safe(u.status),
      safe(u.revenue), safe(u.burn), safe(u.cash), safe(u.headcount),
      safe(u.highlights), safe(u.challenges), safe(u.asks), safe(u.nextMonthGoals), safe(u.submittedBy),
    ]);
  },

  'company-health': (store) => {
    const health: Store[] = store.companyHealth ?? [];
    const companies: Store[] = store.companies ?? [];
    const cMap = Object.fromEntries(companies.map((c: Store) => [c.id, c.name]));
    return health.map(h => [
      cMap[h.companyId] ?? h.companyId, safe(h.companyId), safe(h.quarter),
      safe(h.revenueGrowth), safe(h.burn), safe(h.teamRetention),
      safe(h.productProgress), safe(h.fundraising), safe(h.overallSignal),
      safe(h.notes), safe(h.reviewedBy), safe(h.reviewedAt),
    ]);
  },

  'founder-contacts': (store) => {
    const contacts: Store[] = store.founderContacts ?? [];
    const companies: Store[] = store.companies ?? [];
    const cMap = Object.fromEntries(companies.map((c: Store) => [c.id, c.name]));
    return contacts.map(fc => [
      cMap[fc.companyId] ?? fc.companyId, safe(fc.name), safe(fc.role),
      safe(fc.email), safe(fc.phone), safe(fc.linkedInUrl), safe(fc.twitterUrl),
      safe(fc.birthday), safe(fc.location), safe(fc.lastContactedAt),
      safe(fc.tags), safe(fc.notes),
    ]);
  },

  'valuation-log': (store) => {
    const marks: Store[] = store.valuationMarks ?? [];
    const companies: Store[] = store.companies ?? [];
    const cMap = Object.fromEntries(companies.map((c: Store) => [c.id, c.name]));
    return marks.map(m => [
      cMap[m.companyId] ?? m.companyId, safe(m.quarter), safe(m.fmv),
      safe(m.methodology), safe(m.moicAtMark), safe(m.notes), safe(m.markedBy), safe(m.markedAt),
    ]);
  },

  'capital-calls': (store) => {
    const events: Store[] = store.capitalEvents ?? [];
    const rows: string[][] = [];
    events.forEach(e => {
      if (!e.lpReceipts?.length) {
        rows.push([safe(e.type), safe(e.noticeDate), safe(e.dueDate), safe(e.amount), safe(e.fund), safe(e.purpose), safe(e.status), '', '', '']);
      } else {
        e.lpReceipts.forEach((r: Store) => {
          rows.push([safe(e.type), safe(e.noticeDate), safe(e.dueDate), safe(e.amount), safe(e.fund), safe(e.purpose), safe(e.status), safe(r.lpId), safe(r.amount), safe(r.receivedAt)]);
        });
      }
    });
    return rows;
  },

  'deal-pipeline': (store) => {
    const deals: Store[] = store.deals ?? [];
    const sectors: Store[] = store.sectors ?? [];
    const people: Store[] = store.people ?? [];
    const sMap = Object.fromEntries(sectors.map((s: Store) => [s.id, s.name]));
    const pMap = Object.fromEntries(people.map((p: Store) => [p.id, p.name]));
    return deals.map(d => [
      safe(d.companyName), sMap[d.sectorId] ?? safe(d.sectorId), safe(d.ticketSize),
      '', pMap[d.leadPartnerId] ?? safe(d.leadPartnerId), safe(d.dateAdded), safe(d.stage), safe(d.notes),
    ]);
  },

  'ic-memos': (store) => {
    const memos: Store[] = store.icMemos ?? [];
    const companies: Store[] = store.companies ?? [];
    const cMap = Object.fromEntries(companies.map((c: Store) => [c.id, c.name]));
    return memos.map(m => [
      cMap[m.companyId] ?? m.companyId, safe(m.roundName), safe(m.askAmount), safe(m.proposedValuation),
      safe(m.status), safe(m.icDate), safe(m.recommendation), safe(m.preparedBy),
      Array.isArray(m.reviewedBy) ? m.reviewedBy.join(',') : safe(m.reviewedBy), safe(m.recommendationNote),
    ]);
  },

  'reference-checks': (store) => {
    const refs: Store[] = store.referenceChecks ?? [];
    const companies: Store[] = store.companies ?? [];
    const cMap = Object.fromEntries(companies.map((c: Store) => [c.id, c.name]));
    return refs.map(r => [
      cMap[r.companyId] ?? r.companyId, safe(r.subjectName), safe(r.subjectRole),
      safe(r.referentName), safe(r.referentRole), safe(r.referentCompany),
      safe(r.relationship), safe(r.date), safe(r.conductedBy), safe(r.sentiment),
      safe(r.strengthsNoted), safe(r.weaknessesNoted), safe(r.wouldWorkAgain), safe(r.rawNotes),
    ]);
  },

  'co-investors': (store) => {
    const coinvs: Store[] = store.coInvestors ?? [];
    return coinvs.map(c => [
      safe(c.firmName), safe(c.partnerName), safe(c.email), safe(c.phone), safe(c.linkedInUrl),
      safe(c.sectors), safe(c.stages), safe(c.checkSizeMin), safe(c.checkSizeMax),
      safe(c.geography), safe(c.warmth), safe(c.sharedDeals), safe(c.notes),
    ]);
  },

  'tasks': (store) => {
    const tasks: Store[] = store.tasks ?? [];
    const companies: Store[] = store.companies ?? [];
    const cMap = Object.fromEntries(companies.map((c: Store) => [c.id, c.name]));
    return tasks.map(t => [
      safe(t.title), safe(t.description), cMap[t.companyId] ?? safe(t.companyId),
      safe(t.assignee), safe(t.dueDate), safe(t.priority), safe(t.status), safe(t.tags),
    ]);
  },

  'meeting-notes': (store) => {
    const notes: Store[] = store.meetingNotes ?? [];
    const companies: Store[] = store.companies ?? [];
    const cMap = Object.fromEntries(companies.map((c: Store) => [c.id, c.name]));
    return notes.map(n => [
      safe(n.title), safe(n.type), safe(n.date),
      cMap[n.companyId] ?? safe(n.companyId),
      Array.isArray(n.attendees) ? n.attendees.join(',') : safe(n.attendees),
      safe(n.summary),
      Array.isArray(n.actionItems) ? n.actionItems.map((a: Store) => `${a.text} (${a.assignee})`).join(' | ') : '',
      safe(n.nextMeetingDate),
    ]);
  },

  'intro-requests': (store) => {
    const intros: Store[] = store.introRequests ?? [];
    const companies: Store[] = store.companies ?? [];
    const cMap = Object.fromEntries(companies.map((c: Store) => [c.id, c.name]));
    return intros.map(i => [
      safe(i.requestedBy), cMap[i.requestedByCompanyId] ?? safe(i.requestedByCompanyId),
      safe(i.targetName), safe(i.targetRole), safe(i.targetCompany),
      safe(i.purpose), safe(i.assignedTo), safe(i.status),
      safe(i.requestDate), safe(i.closedDate), safe(i.notes),
    ]);
  },

  'lp-investors': (store) => {
    const lps: Store[] = store.lps ?? [];
    return lps.map(lp => [
      safe(lp.name), '', safe(lp.commitment), safe(lp.called),
      safe(lp.distributed), safe(lp.nav), '', '', '',
    ]);
  },

  'candidates': (store) => {
    const candidates: Store[] = store.candidates ?? [];
    const jobs: Store[] = store.jobOpenings ?? [];
    const jMap = Object.fromEntries(jobs.map((j: Store) => [j.id, j.title]));
    return candidates.map(c => [
      jMap[c.jobId] ?? safe(c.jobId), safe(c.name), safe(c.email), safe(c.phone),
      safe(c.linkedInUrl), safe(c.currentCompany), safe(c.currentRole),
      safe(c.noticePeriod), safe(c.expectedCTC), safe(c.currentCTC),
      safe(c.location), safe(c.source), safe(c.resumeUrl), safe(c.notes),
    ]);
  },
};

export function downloadCsvTemplate(template: CsvTemplate, store?: Store): void {
  // Use real store data if provided and generator exists, else fall back to example rows
  let dataRows = template.exampleRows;
  if (store && DATA_GENERATORS[template.id]) {
    const generated = DATA_GENERATORS[template.id](store);
    if (generated.length > 0) dataRows = generated;
  }
  const rows = [template.headers, ...dataRows];
  const csvContent = rows.map(row =>
    row.map(cell => {
      const str = String(cell ?? '');
      // Wrap in quotes if contains comma, newline, or quote
      if (str.includes(',') || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }).join(',')
  ).join('\n');

  const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Cactus_${template.sheetName.replace(/\s+/g, '_')}_Template.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadAllTeamTemplates(team: string, store?: Store): void {
  const templates = CSV_TEMPLATES.filter(t => t.team === team || t.team === 'global');
  templates.forEach((t, i) => {
    setTimeout(() => downloadCsvTemplate(t, store), i * 300);
  });
}

export function getTemplatesForTeam(team: string): CsvTemplate[] {
  return CSV_TEMPLATES.filter(t => t.team === team || t.team === 'global');
}
