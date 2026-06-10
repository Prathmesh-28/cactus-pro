// ─── Firm ────────────────────────────────────────────────────────────────────

export interface FirmConfig {
  name: string;
  tagline: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  lightColor: string;
  email: string;
  phone: string;
  locations: string[];
  websiteUrl: string;
  investorPortalUrl: string;
  // Admin-editable text fields
  footerText?: string;           // custom footer tagline/copyright override
  footerDisclaimer?: string;     // legal disclaimer in footer
  founderPortalMessage?: string; // welcome message shown to founders in portal
}

// ─── Sectors ─────────────────────────────────────────────────────────────────

export interface Sector {
  id: string;
  name: string;
  color: string;
  iconName: string;
}

// ─── People ──────────────────────────────────────────────────────────────────

export interface Person {
  id: string;
  name: string;
  title: string;
  bio: string;
  photoUrl: string;
  email: string;
  linkedInUrl: string;
  isPartner: boolean;
  isVisibleOnWebsite: boolean;
  phone?: string;
  department?: string;
  reportsTo?: string;   // name of manager
}

// ─── Company Employees (from Apollo/CSV) ─────────────────────────────────────

export interface CompanyEmployee {
  id: string;
  name: string;
  title: string;
  email: string;
  emailStatus: string; // 'verified' | 'extrapolated' | 'unavailable' | ''
  linkedInUrl: string;
  city: string;
  state: string;
  country: string;
}

// ─── Portfolio Companies ──────────────────────────────────────────────────────

export type CompanyStage =
  | 'Seed'
  | 'Series A'
  | 'Series B'
  | 'Series C'
  | 'Growth'
  | 'Late'
  | 'Exited';

export type CompanyStatus = 'Active' | 'Exited' | 'Watch';

export interface FundingRound {
  date: string;
  roundName: string;
  amount: string;
  postMoneyValuation: string;
  leadInvestors: string[];
  allInvestors: string[];
}

export interface FinancialYear {
  year: string;
  revenue: string;
  netProfit: string;
  ebitda: string;
  ebitdaMargin: string;
  totalAssets: string;
  totalDebt: string;
  employees: number;
}

export interface CapTableEntry {
  investor: string;
  category: string;
  holdingPct: number;
  investment: string;
  shares: string;
}

export type CompanyGapType = 'Strategy' | 'Organisation Design' | 'International Expansion' | 'Governance';

export interface CompanyGap {
  id: string;
  name: string;
  type: CompanyGapType;
  issue: string;        // what was the issue
  resolution: string;   // how the problem got solved
  impact: string;       // what impact it has created
  resolvedAt: string;   // YYYY-MM-DD or empty if open
}

export interface Patent {
  title: string;
  status: string;
  filingLocation: string;
  applicationDate: string;
  grantDate: string;
}

export interface CompanyKeyPerson {
  name: string;
  title: string;
  background: string;
}

export interface PortfolioCompany {
  id: string;
  name: string;
  logoUrl: string;
  sectorId: string;
  stage: CompanyStage;
  status: CompanyStatus;
  shortDescription: string;
  longDescription: string;
  foundedYear: number;
  hqCity: string;
  country: string;
  ceoName: string;
  totalFunding: string;
  cactusInvestment: string;
  currentValuation: string;
  ownershipPct: number;
  moic: number;
  irr: number;
  revenue: string;
  ebitda: string;
  employees: number;
  boardMemberIds: string[];
  websiteUrl: string;
  isFeatured: boolean;
  notes: string;
  testimonialQuote: string;
  testimonialAuthorName: string;
  testimonialAuthorTitle: string;
  // Rich data
  tracxnScore: number;
  tracxnTag: string;
  email: string;
  fundingRounds: FundingRound[];
  financialHistory: FinancialYear[];
  capTable: CapTableEntry[];
  patents: Patent[];
  companyGaps: CompanyGap[];
  keyPeople: CompanyKeyPerson[];
  competitors: string[];
  revenueGrowthCagr1yr: string;
  revenueGrowthCagr3yr: string;
  ipoPlans: string;
  coverageAreas: string[];
  legalEntityName: string;
  cin: string;
  teamMembers: CompanyEmployee[];
}

// ─── Fund Metrics ─────────────────────────────────────────────────────────────

export type DeltaDirection = 'up' | 'down' | 'neutral';

export interface FundMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  deltaDirection: DeltaDirection;
  visible: boolean;
}

// ─── Roles & Permissions ─────────────────────────────────────────────────────

export type TabName = 'portfolio' | 'finance' | 'investment' | 'admin' | 'toolkit' | 'workspace' | 'operations';

export type RoleName = 'super_admin' | 'portfolio_team' | 'finance_team' | 'investment_team' | 'portfolio_viewer';

// Which portfolio sub-tabs a viewer is allowed to see (controlled by Portfolio Admin)
export type PortfolioSubTab = 'companies' | 'founders' | 'health' | 'news' | 'research' | 'portal' | 'fund_view';

export interface RolePermissions {
  role: RoleName;
  displayName: string;
  visibleTabs: TabName[];
  accessibleTabs: TabName[];
  canExport: boolean;
  canAddNotes: boolean;
  canEditPortfolio?: boolean;   // Portfolio admin — can edit company data, financial periods, fund view
  visiblePortfolioTabs?: PortfolioSubTab[]; // Which portfolio sub-tabs this role can see
}

// ─── Announcements ────────────────────────────────────────────────────────────

export type AnnouncementPriority = 'info' | 'warning' | 'urgent';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  targetRoles: RoleName[];
  priority: AnnouncementPriority;
  expiryDate: string;
  createdAt: string;
}

// ─── Deal Pipeline ────────────────────────────────────────────────────────────

export type DealStage =
  | 'Sourcing'
  | 'Due Diligence'
  | 'IC Review'
  | 'Term Sheet'
  | 'Closed'
  | 'Passed';

export interface Deal {
  id: string;
  companyName: string;
  sectorId: string;
  ticketSize: string;
  leadPartnerId: string;
  dateAdded: string;
  stage: DealStage;
  notes: string;
}

// ─── LP / Finance ─────────────────────────────────────────────────────────────

export interface LP {
  id: string;
  name: string;
  commitment: string;
  called: string;
  distributed: string;
  nav: string;
}

export interface CashFlowPoint {
  quarter: string;
  contributions: number;
  distributions: number;
  nav: number;
}

// ─── Workspace: Resources ─────────────────────────────────────────────────────

export type ResourceType = 'spreadsheet' | 'document' | 'presentation' | 'folder' | 'link' | 'other';

// Which team a workspace item is shared with. 'all' = visible to everyone.
export type WorkspaceTeam = 'all' | 'portfolio' | 'investment' | 'finance';

export interface Resource {
  id: string;
  name: string;
  url: string;
  type: ResourceType;
  description: string;
  addedBy: string;
  addedAt: string;
  tags: string[];
  team?: WorkspaceTeam;   // visibility scope (defaults to 'all' when absent)
  ownerId?: string;       // id of the creator (for owner-only edit/delete)
  pinned?: boolean;       // pinned resources sort to the top
  fileId?: number;        // attached uploaded file (via /api/files)
  fileName?: string;      // original name of the attached file
}

// ─── Workspace: Gaps ─────────────────────────────────────────────────────────

export interface GapComment {
  id: string;
  text: string;
  author: string;
  authorId?: string;
  createdAt: string;
}

export type GapCategory = 'data' | 'feature' | 'process' | 'other';
export type GapPriority = 'high' | 'medium' | 'low';
export type GapStatus = 'open' | 'in_progress' | 'resolved';

export interface Gap {
  id: string;
  title: string;
  description: string;
  companyName: string;
  category: GapCategory;
  status: GapStatus;
  priority: GapPriority;
  assignedTo: string;
  createdAt: string;
  resolvedAt: string;
  resolutionNote: string;
  team?: WorkspaceTeam;   // visibility scope (defaults to 'all' when absent)
  ownerId?: string;       // id of the creator (for owner-only delete)
  dueDate?: string;       // optional target date (YYYY-MM-DD)
  comments?: GapComment[];// discussion thread
}

// ─── Workspace: Activity log ─────────────────────────────────────────────────
export interface WorkspaceActivity {
  id: string;
  action: 'added' | 'updated' | 'deleted';
  entity: 'resource' | 'gap' | 'note';
  title: string;
  actor: string;
  at: string;
  team?: WorkspaceTeam;
}

// ─── Workspace: Team Notes ────────────────────────────────────────────────────

export interface TeamNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  linkedGapId: string;
  tags: string[];
  team?: WorkspaceTeam;   // visibility scope (defaults to 'all' when absent)
  ownerId?: string;       // id of the creator (for owner-only delete)
}

// ─── Deal Stage Config ────────────────────────────────────────────────────────

export interface DealStageConfig {
  name: string;
  bgColor: string;   // Tailwind-compatible hex
  textColor: string;
  borderColor: string;
}

// ─── KPI Thresholds ───────────────────────────────────────────────────────────

export interface KpiThresholds {
  moic: { good: number; warning: number };   // good >= X, warning >= Y
  irr:  { good: number; warning: number };
}

// ─── Homepage Content ─────────────────────────────────────────────────────────

export interface ValuePillar { title: string; description: string; }

export interface HomepageConfig {
  badge: string;
  heroTitle: string;
  heroSubtitle: string;
  ctaLabel: string;
  pillars: ValuePillar[];
  navLinks: Array<{ label: string; href: string }>;
  // Admin-editable content sections
  aboutText?: string;          // "About" section first paragraph
  aboutSubText?: string;       // "About" section second paragraph
  philosophyTitle?: string;    // Philosophy section heading
  ctaHeading?: string;         // Bottom CTA heading
  ctaSubtext?: string;         // Bottom CTA subtext
}

// ─── Finance Configuration ────────────────────────────────────────────────────

export interface FundConfig { key: string; label: string; }

export interface FinanceConfig {
  funds: FundConfig[];
  fiscalYears: string[];
  fundMetricLabels: Array<{ key: string; label: string; type: 'currency' | 'percent' | 'number' }>;
  cashFlowLabels: Array<{ key: string; label: string }>;
  capitalCallTemplate?: string;        // Template text for capital call notices
  distributionWaterfallText?: string;  // Distribution waterfall description
  lpReportTemplate?: string;           // LP quarterly report email template
}

// ─── Company Taxonomy ─────────────────────────────────────────────────────────

export interface CompanyTaxonomy {
  stages: string[];
  statuses: string[];
  boardRoles: string[];           // Board member titles (CEO, CTO, Board Observer…)
  newsCategories: string[];       // News feed categories (Tech, Exit, Market…)
  healthMetricTypes: string[];    // Health signal labels
  researchDocCategories: string[]; // Research library doc categories
  capTableRoles: string[];        // Cap table investor categories
  introRequestCategories: string[]; // Intro request reason types
}

// ─── Portfolio Snapshot ───────────────────────────────────────────────────────

export interface PortfolioSnapshotRow {
  companyId?: string;        // optional — resolved from name if available
  companyName: string;       // always stored directly from the file
  dateOfFirstInvestment: string;
  currentStake: number | null;
  currentEquityValue: number | null;
  valueOfInvestment: number | null;
  moic: number;
  irr: number;
}

// ─── Root App Store ───────────────────────────────────────────────────────────

export interface AppStore {
  firm: FirmConfig;
  sectors: Sector[];
  people: Person[];
  companies: PortfolioCompany[];
  fundMetrics: FundMetric[];
  roles: RolePermissions[];
  announcements: Announcement[];
  deals: Deal[];
  lps: LP[];
  cashFlow: CashFlowPoint[];
  resources: Resource[];
  gaps: Gap[];
  teamNotes: TeamNote[];
  workspaceActivity: WorkspaceActivity[];
  // ── Configurable sections (never hardcoded) ──
  dealStages: DealStageConfig[];
  kpiThresholds: KpiThresholds;
  homepage: HomepageConfig;
  financeConfig: FinanceConfig;
  taxonomy: CompanyTaxonomy;
  portfolioSnapshot: PortfolioSnapshotRow[];
  // ── Features 1–20 ───────────────────────────────────────────────────────
  portfolioUpdates:    PortfolioUpdate[];
  meetingNotes:        MeetingNote[];
  tasks:               Task[];
  icMemos:             IcMemo[];
  ddChecklists:        DdChecklist[];
  capitalEvents:       CapitalEvent[];
  valuationMarks:      ValuationMark[];
  founderContacts:     FounderContact[];
  coInvestors:         CoInvestor[];
  referenceChecks:     ReferenceCheck[];
  newsItems:           NewsItem[];
  signingDocs:         SigningDoc[];
  companyHealth:       CompanyHealth[];
  introRequests:       IntroRequest[];
  lpCommunications:    LpCommunication[];
  lpCommitments:       LpCommitment[];
  firmEvents:          FirmEvent[];
  researchDocs:        ResearchDocument[];
  founderPortalAccess: FounderPortalAccess[];
  // ── Recruitment ──────────────────────────────────────────────────────────
  jobOpenings:         JobOpening[];
  candidates:          Candidate[];
  interviews:          Interview[];
  offerLetters:        OfferLetter[];
  onboardingTasks:     OnboardingTask[];
  // ── Financial Time Series ─────────────────────────────────────────────────
  financialPeriods:    CompanyFinancialPeriod[];
  fundInvestments:     FundInvestment[];          // Finance team only (finance namespace)
  portfolioFundView:   FundInvestment[];          // Portfolio team only (portfolio namespace) — independent copy
  // ── Shared admin configs (synced to PostgreSQL, shared across all users) ───
  navConfig:           NavTabConfig[] | null;
  recruitmentConfig:   RecruitmentAppConfig | null;
  opsConfig:           OpsAppConfig | null;
  financeData:         Record<string, unknown>; // finance tab KV data
  toolkitLinks:        Record<string, string>;  // frameworkId → external URL (admin-managed)
  emailTemplates:      EmailTemplates | null;   // admin-managed email templates
  contentConfig:       ContentConfig | null;    // admin-managed page descriptions/headers
}

// ── Shared config types ───────────────────────────────────────────────────────

export interface NavTabConfig {
  key: string;
  label: string;
  customLabel: string;
  visible: boolean;
}

export interface RecruitmentAppConfig {
  departments: string[];
  candidateSources: string[];
  onboardingTasks: Array<{
    id: string;
    task: string;
    category: string;
    dueDays: number;
  }>;
  offerLetterTemplate: string;
  interviewRounds: string[]; // e.g. ["Screening", "Technical", "Culture Fit", "Final"]
}

export interface OpsAppConfig {
  meetingTypes: Array<{ key: string; label: string; icon: string }>;
  taskPriorities: Array<{ key: string; label: string; color: string }>;
  introStatuses: Array<{ key: string; label: string; color: string }>;
  eventTypes: string[];       // Calendar event categories
  documentTypes: string[];    // Signing workflow doc types
  pageDescriptions: Record<string, string>; // tab key → custom description
}

// ─── Email Templates ──────────────────────────────────────────────────────────
export interface EmailTemplates {
  lpReport: string;      // Quarterly LP report email
  inviteUser: string;    // New user invite override
  capitalCall: string;   // Capital call notice email
  founderWelcome: string; // Founder portal welcome
}

export interface ContentConfig {
  pageDescriptions: Record<string, string>; // tab → subtitle text
  sectionHeaders: Record<string, string>;   // section key → heading text
}

// ═══════════════════════════════════════════════════════════════════════════
// FINANCIAL TIME-SERIES TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type YearStyle  = 'FY' | 'CY';          // FY = Indian Apr-Mar, CY = Jan-Dec
export type PeriodType = 'quarterly' | 'annual';
export type FYQuarter  = 'Q1' | 'Q2' | 'Q3' | 'Q4';

// Indian FY quarter months: Q1=Apr-Jun, Q2=Jul-Sep, Q3=Oct-Dec, Q4=Jan-Mar
// Calendar year quarters:   Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec

export interface CompanyFinancialPeriod {
  id: string;
  companyId: string;

  // Period identity — composite key: companyId + yearStyle + fiscalYear + quarter
  yearStyle:   YearStyle;    // 'FY' | 'CY'
  fiscalYear:  string;       // 'FY2024' or '2024'
  periodType:  PeriodType;
  quarter?:    FYQuarter;    // undefined for annual rows

  // Derived label e.g. "FY2024-Q1", "FY2024-Annual", "2024-Q3", "2024-Annual"
  periodLabel: string;

  // ── Revenue metrics (₹ Cr) ────────────────────────────────────────────────
  revenue:        string;   // Total revenue
  arr:            string;   // Annual Recurring Revenue (SaaS/subscription)
  mrr:            string;   // Monthly Recurring Revenue
  gmv:            string;   // Gross Merchandise Value (marketplace)

  // ── Profitability (%) ─────────────────────────────────────────────────────
  grossMarginPct: string;
  ebitdaMarginPct: string;
  netMarginPct:   string;

  // ── Growth (%) ───────────────────────────────────────────────────────────
  revenueGrowthYoY: string;  // vs same quarter prior year
  arrGrowthYoY:     string;
  nrr:              string;  // Net Revenue Retention %
  churnPct:         string;  // Monthly churn %

  // ── Returns (calculated / marked) ────────────────────────────────────────
  currentValuation: string;  // ₹Cr FMV at end of period
  moic:             string;  // x
  irr:              string;  // % (cumulative IRR to end of period)
  methodology:      string;  // How valuation was determined

  // ── Operations ───────────────────────────────────────────────────────────
  headcount:        number;
  monthlyBurn:      string;  // ₹Cr
  cash:             string;  // ₹Cr
  runway:           string;  // months

  // ── Unit economics ────────────────────────────────────────────────────────
  cac:              string;  // Customer Acquisition Cost ₹
  ltv:              string;  // Lifetime Value ₹
  ltvCacRatio:      string;  // calculated

  // ── Metadata ─────────────────────────────────────────────────────────────
  notes:            string;
  source:           string;  // 'Manual' | 'Excel Sync' | 'GNews'
  updatedBy:        string;
  updatedAt:        string;
  createdAt:        string;
}

// ═══════════════════════════════════════════════════════════════════════════
// RECRUITMENT TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type JobType       = 'full_time' | 'part_time' | 'contract' | 'internship';
export type JobStatus     = 'draft' | 'active' | 'paused' | 'closed';
export type CandidateStage =
  | 'applied' | 'ai_screened' | 'shortlisted'
  | 'interview_1' | 'interview_2' | 'final_interview'
  | 'offer_sent' | 'offer_accepted' | 'hired' | 'rejected' | 'withdrawn';
export type InterviewMode = 'video' | 'phone' | 'in_person';
export type InterviewRec  = 'strong_yes' | 'yes' | 'maybe' | 'no' | 'strong_no';
export type OfferStatus   = 'draft' | 'sent' | 'accepted' | 'rejected' | 'expired';
export type OnboardingCategory = 'documents' | 'it_setup' | 'orientation' | 'training' | 'compliance' | 'other';

export interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  type: JobType;
  status: JobStatus;
  description: string;
  requirements: string[];
  niceToHave: string[];
  salaryMin: string;
  salaryMax: string;
  hiringManager: string;
  targetDate: string;
  companyId?: string;
  createdAt: string;
}

export interface Candidate {
  id: string;
  jobId: string;
  name: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  resumeText: string;
  resumeUrl: string;
  currentCompany: string;
  currentRole: string;
  noticePeriod: string;
  expectedCTC: string;
  currentCTC: string;
  location: string;
  stage: CandidateStage;
  aiScore: number;
  aiSummary: string;
  tags: string[];
  source: string;
  appliedAt: string;
  notes: string;
}

export interface Interview {
  id: string;
  candidateId: string;
  jobId: string;
  round: string;
  interviewers: string[];
  scheduledAt: string;
  duration: number;
  mode: InterviewMode;
  meetLink?: string;
  feedback: string;
  rating: number;
  recommendation: InterviewRec;
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
}

export interface OfferLetter {
  id: string;
  candidateId: string;
  jobId: string;
  designation: string;
  department: string;
  startDate: string;
  ctc: string;
  fixedPay: string;
  variablePay: string;
  equity: string;
  expiryDate: string;
  status: OfferStatus;
  sentAt?: string;
  respondedAt?: string;
  notes: string;
  createdAt: string;
}

export interface OnboardingTask {
  id: string;
  candidateId: string;
  task: string;
  category: OnboardingCategory;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'done';
  notes: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FEATURES 1–20: NEW TYPES
// ═══════════════════════════════════════════════════════════════════════════

// ─── 1. Monthly Portfolio Updates ────────────────────────────────────────────
export type UpdateStatus = 'draft' | 'submitted' | 'reviewed';
export interface PortfolioUpdate {
  id: string;
  companyId: string;
  month: string;                // "2025-06"
  submittedBy: string;
  status: UpdateStatus;
  revenue: string;
  burn: string;
  cash: string;
  headcount: number;
  highlights: string;
  challenges: string;
  asks: string;
  nextMonthGoals: string;
  createdAt: string;
  reviewedAt?: string;
  reviewNote?: string;
}

// ─── 2. Meeting Notes & Call Logs ────────────────────────────────────────────
export type MeetingType = 'founder_call' | 'lp_meeting' | 'board_meeting' | 'co_investor' | 'intro' | 'internal' | 'other';
export interface MeetingNote {
  id: string;
  companyId?: string;
  title: string;
  type: MeetingType;
  date: string;
  attendees: string[];
  summary: string;
  actionItems: Array<{ text: string; assignee: string; dueDate: string; done: boolean }>;
  nextMeetingDate?: string;
  createdBy: string;
  createdAt: string;
}

// ─── 3. Task Manager ─────────────────────────────────────────────────────────
export type TaskStatus   = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export interface Task {
  id: string;
  title: string;
  description: string;
  companyId?: string;
  dealId?: string;
  assignee: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
  linkedMeetingId?: string;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
}

// ─── 4. IC Memo ───────────────────────────────────────────────────────────────
export type IcMemoStatus = 'draft' | 'under_review' | 'approved' | 'rejected';
export interface IcMemo {
  id: string;
  companyId: string;
  version: number;
  status: IcMemoStatus;
  roundName: string;
  askAmount: string;
  proposedValuation: string;
  // Sections
  executiveSummary: string;
  companyBackground: string;
  productDescription: string;
  marketOpportunity: string;
  businessModel: string;
  tractionHighlights: string;
  teamAssessment: string;
  financialSummary: string;
  competitiveLandscape: string;
  investmentThesis: string;
  keyRisks: string;
  mitigants: string;
  dealTerms: string;
  recommendation: 'invest' | 'pass' | 'follow_up';
  recommendationNote: string;
  // Meta
  preparedBy: string;
  reviewedBy: string[];
  icDate: string;
  createdAt: string;
  updatedAt: string;
}

// ─── 5. Due Diligence Checklist ───────────────────────────────────────────────
export type DdItemStatus = 'pending' | 'in_progress' | 'complete' | 'na' | 'red_flag';
export interface DdItem {
  id: string;
  category: string;
  item: string;
  status: DdItemStatus;
  assignee: string;
  note: string;
  completedAt?: string;
}
export interface DdChecklist {
  id: string;
  dealId: string;
  companyName: string;
  items: DdItem[];
  createdAt: string;
  updatedAt: string;
}

// ─── 6. Capital Calls & Distributions ────────────────────────────────────────
export type CapEventType = 'capital_call' | 'distribution';
export interface CapitalEvent {
  id: string;
  type: CapEventType;
  noticeDate: string;
  dueDate: string;
  amount: string;
  fund: string;
  purpose: string;
  status: 'draft' | 'sent' | 'partial' | 'complete';
  lpReceipts: Array<{ lpId: string; amount: string; receivedAt?: string }>;
  notes: string;
  createdAt: string;
}

// ─── 7. Valuation Log ────────────────────────────────────────────────────────
export interface ValuationMark {
  id: string;
  companyId: string;
  quarter: string;         // "Q4 2024"
  fmv: string;             // Fair Market Value
  methodology: string;     // "Last round", "Revenue multiple", "DCF"
  moicAtMark: number;
  notes: string;
  markedBy: string;
  markedAt: string;
}

// ─── 8. Founder Directory ────────────────────────────────────────────────────
export interface FounderContact {
  id: string;
  companyId: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  twitterUrl: string;
  birthday?: string;
  location: string;
  notes: string;
  lastContactedAt?: string;
  tags: string[];
}

// ─── 9. Co-investor CRM ──────────────────────────────────────────────────────
export interface CoInvestor {
  id: string;
  firmName: string;
  partnerName: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  sectors: string[];
  stages: string[];
  checkSizeMin: string;
  checkSizeMax: string;
  geography: string;
  warmth: 'hot' | 'warm' | 'cold' | 'unknown';
  sharedDeals: string[];     // company names
  notes: string;
  lastInteractionAt?: string;
  tags: string[];
}

// ─── 10. Reference Checks ────────────────────────────────────────────────────
export type RefCheckSentiment = 'very_positive' | 'positive' | 'neutral' | 'negative' | 'very_negative';
export interface ReferenceCheck {
  id: string;
  companyId: string;
  subjectName: string;
  subjectRole: string;
  referentName: string;
  referentRole: string;
  referentCompany: string;
  relationship: string;
  date: string;
  conductedBy: string;
  sentiment: RefCheckSentiment;
  strengthsNoted: string;
  weaknessesNoted: string;
  wouldWorkAgain: boolean;
  rawNotes: string;
}

// ─── 11. News & Monitoring ───────────────────────────────────────────────────
export interface NewsItem {
  id: string;
  companyId?: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  publishedAt: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
  tags: string[];
  isManuallyAdded: boolean;
  addedBy?: string;
  savedAt: string;
}

// ─── 12. Document Signing Workflow ───────────────────────────────────────────
export type DocSignStatus = 'draft' | 'sent' | 'partially_signed' | 'signed' | 'expired' | 'cancelled';
export interface SigningDoc {
  id: string;
  companyId?: string;
  dealId?: string;
  title: string;
  type: 'term_sheet' | 'sha' | 'ssha' | 'investment_agreement' | 'nda' | 'other';
  status: DocSignStatus;
  sentDate?: string;
  expiryDate?: string;
  signatories: Array<{ name: string; email: string; role: string; signedAt?: string }>;
  fileUrl?: string;
  notes: string;
  createdAt: string;
}

// ─── 13. Portfolio Health Dashboard ──────────────────────────────────────────
export type HealthSignal = 'green' | 'amber' | 'red' | 'grey';
export interface CompanyHealth {
  id: string;
  companyId: string;
  quarter: string;
  revenueGrowth: HealthSignal;
  burn: HealthSignal;
  teamRetention: HealthSignal;
  productProgress: HealthSignal;
  fundraising: HealthSignal;
  overallSignal: HealthSignal;
  notes: string;
  reviewedBy: string;
  reviewedAt: string;
}

// ─── 14. Intro Request Tracker ───────────────────────────────────────────────
export type IntroStatus = 'requested' | 'intro_sent' | 'responded' | 'meeting_scheduled' | 'closed_won' | 'closed_lost';
export interface IntroRequest {
  id: string;
  requestedBy: string;        // founder name / company
  requestedByCompanyId?: string;
  targetName: string;         // person they want intro to
  targetRole: string;
  targetCompany: string;
  purpose: string;
  status: IntroStatus;
  assignedTo: string;         // team member handling it
  introducedVia?: string;     // who made the intro
  requestDate: string;
  closedDate?: string;
  notes: string;
}

// ─── 15. LP Communication Hub ────────────────────────────────────────────────
export type LpCommType = 'quarterly_update' | 'capital_call_notice' | 'distribution_notice' | 'annual_report' | 'ad_hoc';
export interface LpCommunication {
  id: string;
  type: LpCommType;
  subject: string;
  body: string;
  attachmentUrls: string[];
  targetLpIds: string[];     // 'all' or specific LP ids
  sentAt?: string;
  sentBy?: string;
  status: 'draft' | 'sent';
  openCount: number;
  createdAt: string;
}

// ─── 16. Fund Closing Tracker ────────────────────────────────────────────────
export type ClosingStatus = 'targeted' | 'soft_circled' | 'lpa_sent' | 'lpa_signed' | 'funded' | 'declined';
export interface LpCommitment {
  id: string;
  fund: string;
  lpName: string;
  lpEmail: string;
  targetCommitment: string;
  softCircledAmount: string;
  signedAmount: string;
  calledAmount: string;
  status: ClosingStatus;
  lpaSentDate?: string;
  lpaSignedDate?: string;
  firstCloseDate?: string;
  notes: string;
  leadPartner: string;
}

// ─── 17. Event Calendar ──────────────────────────────────────────────────────
export type EventType = 'board_meeting' | 'lp_meeting' | 'demo_day' | 'conference' | 'team_offsite' | 'founder_meeting' | 'ic_meeting' | 'other';
export interface FirmEvent {
  id: string;
  title: string;
  type: EventType;
  date: string;
  endDate?: string;
  time?: string;
  location: string;
  isVirtual: boolean;
  meetingLink?: string;
  companyId?: string;
  attendees: string[];
  agenda: string;
  notes: string;
  reminderDays: number;
  createdBy: string;
  createdAt: string;
}

// ─── 18. Sector Research Library ─────────────────────────────────────────────
export interface ResearchDocument {
  id: string;
  title: string;
  sectorId?: string;
  type: 'market_map' | 'thesis' | 'report' | 'article' | 'deck' | 'model' | 'other';
  source: string;
  url?: string;
  fileUrl?: string;
  summary: string;
  tags: string[];
  addedBy: string;
  addedAt: string;
  isFeatured: boolean;
}

// ─── 19. Founder Portal Submissions ──────────────────────────────────────────
export interface FounderPortalAccess {
  id: string;
  companyId: string;
  founderEmail: string;
  founderName: string;
  isActive: boolean;
  lastLoginAt?: string;
  invitedAt: string;
  invitedBy: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// FUND INVESTMENT LEDGER
// ═══════════════════════════════════════════════════════════════════════════

export interface FundFollowOn {
  id: string;
  date: string;           // YYYY-MM-DD
  round: string;          // "Series A", "Series B", "Bridge"
  amount: string;         // ₹Cr invested by Cactus in this round
  preMoneyVal: string;    // ₹Cr company pre-money
  postMoneyVal: string;   // ₹Cr company post-money
  ownershipPost: string;  // Cactus % after this round
  leadInvestor: string;
  notes: string;
}

export interface FundInvestment {
  id: string;
  fund: string;           // 'Fund 1' | 'Fund 2'
  companyId: string;

  // ── Initial investment ─────────────────────────────────────────────────
  investmentDate: string;       // First cheque date YYYY-MM-DD
  stageAtEntry: string;         // Seed / Pre-Series A / Series A / Series B
  preMoneyAtEntry: string;      // ₹Cr valuation before Cactus invested
  postMoneyAtEntry: string;     // ₹Cr valuation after Cactus first cheque
  firstCheque: string;          // ₹Cr — first investment
  ownershipAtEntry: string;     // % after first investment
  instrument: string;           // Equity / SAFE / Convertible Note

  // ── Follow-on rounds ───────────────────────────────────────────────────
  followOns: FundFollowOn[];

  // ── Totals (auto-calc from first + follow-ons) ─────────────────────────
  totalInvested: string;        // ₹Cr — sum of all cheques
  currentOwnership: string;     // % today after all dilution
  currentFMV: string;           // ₹Cr — Cactus stake FMV today
  currentValuation: string;     // ₹Cr — company total valuation

  // ── Returns ────────────────────────────────────────────────────────────
  moic: string;                 // currentFMV / totalInvested
  irr: string;                  // % annualized IRR
  dpi: string;                  // Distributions / Paid-In (cash returned)
  unrealizedValue: string;      // ₹Cr — paper gain
  realizedValue: string;        // ₹Cr — actual cash returned

  // ── Latest operating metrics (auto-pulled from financialPeriods) ───────
  latestFY: string;             // 'FY2025'
  revenue: string;              // ₹Cr
  revenueGrowthYoY: string;     // %
  arr: string;                  // ₹Cr Annual Recurring Revenue
  mrr: string;                  // ₹Cr Monthly Recurring Revenue
  grossMargin: string;          // %
  ebitdaMargin: string;         // %
  monthlyBurn: string;          // ₹Cr
  cash: string;                 // ₹Cr
  runway: string;               // months
  headcount: number;
  nrr: string;                  // % Net Revenue Retention

  // ── Status ────────────────────────────────────────────────────────────
  status: 'Active' | 'Watch' | 'Exited' | 'Written Off';
  exitDate?: string;
  exitProceeds?: string;
  exitType?: 'IPO' | 'M&A' | 'Secondary' | 'Buyback';

  // ── Notes ─────────────────────────────────────────────────────────────
  boardSeat: boolean;
  leadOrFollow: 'Lead' | 'Follow' | 'Co-lead';
  nextRoundExpected: string;
  nextRoundSize: string;
  notes: string;
  updatedAt: string;
}
