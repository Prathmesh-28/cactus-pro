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

export type TabName = 'portfolio' | 'finance' | 'investment' | 'admin' | 'toolkit' | 'workspace';

export type RoleName = 'super_admin' | 'portfolio_team' | 'finance_team' | 'investment_team';

export interface RolePermissions {
  role: RoleName;
  displayName: string;
  visibleTabs: TabName[];
  accessibleTabs: TabName[];
  canExport: boolean;
  canAddNotes: boolean;
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

export interface Resource {
  id: string;
  name: string;
  url: string;
  type: ResourceType;
  description: string;
  addedBy: string;
  addedAt: string;
  tags: string[];
}

// ─── Workspace: Gaps ─────────────────────────────────────────────────────────

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
}

// ─── Workspace: Team Notes ────────────────────────────────────────────────────

export interface TeamNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
  linkedGapId: string;
  tags: string[];
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
}
