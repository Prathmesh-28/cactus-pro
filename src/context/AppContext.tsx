import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { defaultConfig } from '../data/defaultConfig';
import { kvGet, kvSet } from '../lib/api';
import type {
  AppStore, FirmConfig, Sector, Person, PortfolioCompany,
  FundMetric, RolePermissions, Announcement, Deal, LP, CashFlowPoint,
  RoleName, TabName, Resource, Gap, TeamNote, WorkspaceActivity, WorkspaceTeam,
  DealStageConfig, KpiThresholds, HomepageConfig, FinanceConfig,
  CompanyTaxonomy, PortfolioSnapshotRow,
  PortfolioUpdate, MeetingNote, Task, IcMemo, DdChecklist,
  CapitalEvent, ValuationMark, FounderContact, CoInvestor,
  ReferenceCheck, NewsItem, SigningDoc, CompanyHealth,
  IntroRequest, LpCommunication, LpCommitment, FirmEvent,
  ResearchDocument, FounderPortalAccess,
  JobOpening, Candidate, Interview, OfferLetter, OnboardingTask,
  CompanyFinancialPeriod,
  NavTabConfig, RecruitmentAppConfig, OpsAppConfig, FundInvestment,
} from '../data/types';

const LS_KEY   = 'cactus_store';
const ROLE_KEY = 'cactus_role';
const KV_NS    = 'app';
const KV_KEY   = 'store';

// ─── Team data isolation ──────────────────────────────────────────────────────
// Each team's private fields live in their own KV namespace.
// Super admin reads & writes all. Other roles only touch their namespace.

const FINANCE_FIELDS = new Set([
  'capitalEvents','valuationMarks','lpCommunications','lpCommitments',
  'financeData','fundInvestments','opsConfig','firmEvents',
]);
const PORTFOLIO_FIELDS = new Set([
  'founderContacts','companyHealth','newsItems','portfolioUpdates',
  'financialPeriods','researchDocs','founderPortalAccess',
  'portfolioFundView', // Portfolio team's independent copy of fund investment data
]);
const INVESTMENT_FIELDS = new Set([
  'icMemos','ddChecklists','referenceChecks','coInvestors','introRequests',
]);
const OPERATIONS_FIELDS = new Set([
  'tasks','meetingNotes','signingDocs','firmEvents',
  'recruitmentConfig','jobOpenings','candidates','interviews',
  'offerLetters','onboardingTasks','introRequests',
]);

// Which namespace a field belongs to
function fieldNamespace(field: string): string {
  if (FINANCE_FIELDS.has(field))    return 'finance';
  if (PORTFOLIO_FIELDS.has(field))  return 'portfolio';
  if (INVESTMENT_FIELDS.has(field)) return 'investment';
  if (OPERATIONS_FIELDS.has(field)) return 'operations';
  return 'app'; // global — shared
}

// Fields accessible to a given role
function accessibleNamespaces(role: string): string[] {
  if (role === 'super_admin') return ['app','finance','portfolio','investment','operations','compliance'];
  if (role === 'finance_team')    return ['app','finance'];
  if (role === 'portfolio_team')  return ['app','portfolio','operations','compliance'];
  if (role === 'investment_team') return ['app','investment','operations'];
  return ['app','operations','compliance'];
}

// Split a store object into per-namespace buckets
function splitStoreByNamespace(store: AppStore): Record<string, Partial<AppStore>> {
  const buckets: Record<string, Partial<AppStore>> = {
    app: {}, finance: {}, portfolio: {}, investment: {}, operations: {},
  };
  for (const [k, v] of Object.entries(store)) {
    const ns = fieldNamespace(k);
    (buckets[ns] as Record<string, unknown>)[k] = v;
  }
  return buckets;
}

// ─── Read from localStorage (fast, synchronous) ───────────────────────────────
function loadLocal(): AppStore | null {
  try {
    const s = localStorage.getItem(LS_KEY);
    return s ? (JSON.parse(s) as AppStore) : null;
  } catch { return null; }
}

// ─── Context shape ────────────────────────────────────────────────────────────
interface AppContextValue {
  store: AppStore;
  loading: boolean;
  currentRole: RoleName;
  setCurrentRole: (r: RoleName) => void;
  canAccess: (tab: TabName) => boolean;
  canExport: () => boolean;
  canAddNotes: () => boolean;
  canEditPortfolio: () => boolean;  // portfolio team admin — edit company data, financial periods, fund view
  visiblePortfolioTabs: () => string[];  // which portfolio sub-tabs the current role can see
  updateFirm: (f: FirmConfig) => void;
  addSector: (s: Sector) => void;
  updateSector: (s: Sector) => void;
  deleteSector: (id: string) => void;
  addPerson: (p: Person) => void;
  updatePerson: (p: Person) => void;
  deletePerson: (id: string) => void;
  addCompany: (c: PortfolioCompany) => void;
  updateCompany: (c: PortfolioCompany) => void;
  deleteCompany: (id: string) => void;
  addMetric: (m: FundMetric) => void;
  updateMetric: (m: FundMetric) => void;
  deleteMetric: (id: string) => void;
  updateRole: (r: RolePermissions) => void;
  addAnnouncement: (a: Announcement) => void;
  updateAnnouncement: (a: Announcement) => void;
  deleteAnnouncement: (id: string) => void;
  addDeal: (d: Deal) => void;
  updateDeal: (d: Deal) => void;
  deleteDeal: (id: string) => void;
  addLP: (lp: LP) => void;
  updateLP: (lp: LP) => void;
  deleteLP: (id: string) => void;
  updateCashFlow: (d: CashFlowPoint[]) => void;
  addResource: (r: Resource) => void;
  updateResource: (r: Resource) => void;
  deleteResource: (id: string) => void;
  addGap: (g: Gap) => void;
  updateGap: (g: Gap) => void;
  deleteGap: (id: string) => void;
  addTeamNote: (n: TeamNote) => void;
  updateTeamNote: (n: TeamNote) => void;
  deleteTeamNote: (id: string) => void;
  logWorkspaceActivity: (a: WorkspaceActivity) => void;
  clearWorkspace: (team?: WorkspaceTeam) => void;  // super-admin governance: wipe all, or one team's items
  // Features 1–20 CRUD helpers
  addPortfolioUpdate: (x: PortfolioUpdate) => void;   updatePortfolioUpdate: (x: PortfolioUpdate) => void;   deletePortfolioUpdate: (id: string) => void;
  addMeetingNote: (x: MeetingNote) => void;           updateMeetingNote: (x: MeetingNote) => void;           deleteMeetingNote: (id: string) => void;
  addTask: (x: Task) => void;                         updateTask: (x: Task) => void;                         deleteTask: (id: string) => void;
  addIcMemo: (x: IcMemo) => void;                     updateIcMemo: (x: IcMemo) => void;                     deleteIcMemo: (id: string) => void;
  addDdChecklist: (x: DdChecklist) => void;           updateDdChecklist: (x: DdChecklist) => void;           deleteDdChecklist: (id: string) => void;
  addCapitalEvent: (x: CapitalEvent) => void;         updateCapitalEvent: (x: CapitalEvent) => void;         deleteCapitalEvent: (id: string) => void;
  addValuationMark: (x: ValuationMark) => void;       updateValuationMark: (x: ValuationMark) => void;       deleteValuationMark: (id: string) => void;
  addFounderContact: (x: FounderContact) => void;     updateFounderContact: (x: FounderContact) => void;     deleteFounderContact: (id: string) => void;
  addCoInvestor: (x: CoInvestor) => void;             updateCoInvestor: (x: CoInvestor) => void;             deleteCoInvestor: (id: string) => void;
  addReferenceCheck: (x: ReferenceCheck) => void;     updateReferenceCheck: (x: ReferenceCheck) => void;     deleteReferenceCheck: (id: string) => void;
  addNewsItem: (x: NewsItem) => void;                 updateNewsItem: (x: NewsItem) => void;                  deleteNewsItem: (id: string) => void;
  addSigningDoc: (x: SigningDoc) => void;             updateSigningDoc: (x: SigningDoc) => void;             deleteSigningDoc: (id: string) => void;
  addCompanyHealth: (x: CompanyHealth) => void;       updateCompanyHealth: (x: CompanyHealth) => void;       deleteCompanyHealth: (id: string) => void;
  addIntroRequest: (x: IntroRequest) => void;         updateIntroRequest: (x: IntroRequest) => void;         deleteIntroRequest: (id: string) => void;
  addLpCommunication: (x: LpCommunication) => void;  updateLpCommunication: (x: LpCommunication) => void;  deleteLpCommunication: (id: string) => void;
  addLpCommitment: (x: LpCommitment) => void;        updateLpCommitment: (x: LpCommitment) => void;        deleteLpCommitment: (id: string) => void;
  addFirmEvent: (x: FirmEvent) => void;               updateFirmEvent: (x: FirmEvent) => void;               deleteFirmEvent: (id: string) => void;
  addResearchDoc: (x: ResearchDocument) => void;      updateResearchDoc: (x: ResearchDocument) => void;      deleteResearchDoc: (id: string) => void;
  addFounderPortalAccess: (x: FounderPortalAccess) => void; updateFounderPortalAccess: (x: FounderPortalAccess) => void; deleteFounderPortalAccess: (id: string) => void;
  // Recruitment
  addJobOpening: (x: JobOpening) => void; updateJobOpening: (x: JobOpening) => void; deleteJobOpening: (id: string) => void;
  addCandidate: (x: Candidate) => void; updateCandidate: (x: Candidate) => void; deleteCandidate: (id: string) => void;
  addInterview: (x: Interview) => void; updateInterview: (x: Interview) => void; deleteInterview: (id: string) => void;
  addOfferLetter: (x: OfferLetter) => void; updateOfferLetter: (x: OfferLetter) => void; deleteOfferLetter: (id: string) => void;
  addOnboardingTask: (x: OnboardingTask) => void; updateOnboardingTask: (x: OnboardingTask) => void; deleteOnboardingTask: (id: string) => void;
  // Financial time series
  addFinancialPeriod: (x: CompanyFinancialPeriod) => void;
  updateFinancialPeriod: (x: CompanyFinancialPeriod) => void;
  deleteFinancialPeriod: (id: string) => void;
  upsertFinancialPeriod: (x: CompanyFinancialPeriod) => void; // add or update by composite key
  // Fund investment ledger (Finance team — finance namespace)
  addFundInvestment: (x: FundInvestment) => void;
  updateFundInvestment: (x: FundInvestment) => void;
  deleteFundInvestment: (id: string) => void;
  // Portfolio team's independent fund view (portfolio namespace — NOT linked to finance)
  addPortfolioFundView: (x: FundInvestment) => void;
  updatePortfolioFundView: (x: FundInvestment) => void;
  deletePortfolioFundView: (id: string) => void;
  // Shared config setters (synced to PostgreSQL for all users)
  setNavConfig: (cfg: NavTabConfig[]) => void;
  updateToolkitLinks: (links: Record<string, string>) => void;
  updateEmailTemplates: (t: import('../data/types').EmailTemplates) => void;
  updateContentConfig: (c: import('../data/types').ContentConfig) => void;
  setRecruitmentConfig: (cfg: RecruitmentAppConfig) => void;
  setOpsConfig: (cfg: OpsAppConfig) => void;
  setFinanceData: (key: string, val: unknown) => void;
  getFinanceData: <T>(key: string) => T | null;

  // Config sections
  updateDealStages: (stages: DealStageConfig[]) => void;
  updateKpiThresholds: (t: KpiThresholds) => void;
  updateHomepage: (h: HomepageConfig) => void;
  updateFinanceConfig: (f: FinanceConfig) => void;
  updateTaxonomy: (t: CompanyTaxonomy) => void;
  updatePortfolioSnapshot: (rows: PortfolioSnapshotRow[]) => void;
  resetToDefaults: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function seedPortfolioFundView(s: AppStore): AppStore {
  if ((!s.portfolioFundView || s.portfolioFundView.length === 0) && s.fundInvestments?.length > 0) {
    return {
      ...s,
      portfolioFundView: s.fundInvestments.map(inv => ({
        ...inv,
        id: `pf_${inv.id}`,
        followOns: (inv.followOns ?? []).map(fo => ({ ...fo, id: `pf_${fo.id}` })),
      })),
    };
  }
  return s;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  // Start with localStorage for instant render, then hydrate from PostgreSQL
  const [store, setStoreRaw] = useState<AppStore>(() => seedPortfolioFundView(loadLocal() ?? defaultConfig));
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRoleState] = useState<RoleName>(
    () => (localStorage.getItem(ROLE_KEY) as RoleName) ?? 'super_admin'
  );

  // ── Sync currentRole from authenticated user's real role ──────────────────
  // Non-super-admin users always get their DB role — no manual switching.
  // Super admin keeps the role switcher for demo/preview purposes.
  useEffect(() => {
    if (!user?.role) return;
    const dbRole = user.role as RoleName;
    if (dbRole !== 'super_admin') {
      // Non-super-admin: always force their actual DB role, no switching allowed
      setCurrentRoleState(dbRole);
      localStorage.setItem(ROLE_KEY, dbRole);
    } else {
      // Super admin: default to super_admin on fresh load or if stuck in a non-super-admin role
      // (allows them to switch for testing, but resets on every login)
      const stored = localStorage.getItem(ROLE_KEY) as RoleName | null;
      const validPreviewRoles: RoleName[] = ['super_admin','portfolio_team','finance_team','investment_team','portfolio_viewer'];
      if (!stored || !validPreviewRoles.includes(stored)) {
        setCurrentRoleState('super_admin');
        localStorage.setItem(ROLE_KEY, 'super_admin');
      }
      // If they deliberately switched to a test role, respect it — role switcher lets them change back
    }
  }, [user?.role]);

  // Debounce timer for backend saves
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hydrate from PostgreSQL on mount (team-namespaced) ──────────────────────
  useEffect(() => {
    const role = (localStorage.getItem(ROLE_KEY) as string) ?? 'super_admin';
    const namespaces = accessibleNamespaces(role);

    Promise.all(
      namespaces.map(ns => kvGet(ns, KV_KEY).then(v => ({ ns, v })).catch(() => ({ ns, v: null })))
    ).then(results => {
      // Merge all namespace stores into one
      let merged: Partial<AppStore> = {};
      for (const { v } of results) {
        if (v && typeof v === 'object') merged = { ...merged, ...(v as Partial<AppStore>) };
      }

      if (Object.keys(merged).length > 0) {
        let mergedStore = { ...(loadLocal() ?? defaultConfig), ...merged } as AppStore;

        // Seed portfolioFundView from fundInvestments if empty (first load)
        if ((!mergedStore.portfolioFundView || mergedStore.portfolioFundView.length === 0)
            && mergedStore.fundInvestments?.length > 0) {
          mergedStore = {
            ...mergedStore,
            portfolioFundView: mergedStore.fundInvestments.map(inv => ({
              ...inv,
              id: `pf_${inv.id}`,
              followOns: (inv.followOns ?? []).map(fo => ({ ...fo, id: `pf_${fo.id}` })),
            })),
          };
        }

        // Backfill companyGaps for companies loaded from KV that predate this field
        let needsGapsBackfill = false;
        if (mergedStore.companies?.some(c => !c.companyGaps)) {
          needsGapsBackfill = true;
          const defaultGapsMap = new Map(defaultConfig.companies.map(c => [c.id, c.companyGaps ?? []]));
          mergedStore = {
            ...mergedStore,
            companies: mergedStore.companies.map(c => ({
              ...c,
              companyGaps: c.companyGaps ?? defaultGapsMap.get(c.id) ?? [],
            })),
          };
        }

        // Migrate old 11-sector scheme → 3 consolidated sectors
        const OLD_TO_NEW: Record<string, string> = {
          s1: 's1', s2: 's3', s3: 's1', s4: 's1',
          s5: 's2', s6: 's2', s7: 's3', s8: 's3',
          s9: 's2', s10: 's2', s11: 's2',
        };
        const NEW_SECTORS = [
          { id: 's1', name: 'Advanced Manufacturing', color: '#D97706', iconName: 'cpu'      },
          { id: 's2', name: 'Technology',             color: '#2563EB', iconName: 'brain'    },
          { id: 's3', name: 'Consumer',               color: '#DB2777', iconName: 'sparkles' },
        ];
        let needsSectorMigration = false;
        if (mergedStore.sectors?.some(s => !['s1','s2','s3'].includes(s.id) || !['Advanced Manufacturing','Technology','Consumer'].includes(s.name))) {
          needsSectorMigration = true;
          mergedStore = {
            ...mergedStore,
            sectors: NEW_SECTORS,
            companies: mergedStore.companies?.map(c => ({
              ...c,
              sectorId: OLD_TO_NEW[c.sectorId] ?? c.sectorId,
            })),
            deals: mergedStore.deals?.map(d => ({
              ...d,
              sectorId: OLD_TO_NEW[d.sectorId] ?? d.sectorId,
            })),
          };
        }

        setStoreRaw(mergedStore);
        localStorage.setItem(LS_KEY, JSON.stringify(mergedStore));

        // Write backfilled data back to KV so the next poll doesn't overwrite it
        if (needsGapsBackfill || needsSectorMigration) {
          const appBucket = splitStoreByNamespace(mergedStore)['app'];
          kvSet('app', KV_KEY, appBucket).catch(() => {});
        }

        // Push finance data keys into localStorage for finance tab hooks
        if (mergedStore.financeData) {
          Object.entries(mergedStore.financeData).forEach(([k, v]) => {
            try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
          });
        }
      }
      setLoading(false);
    });
  }, []);

  // ── Real-time cross-user polling — re-fetch KV every 15 s ───────────────────
  // Also runs immediately on mount so Finance team always sees latest Portfolio data.
  useEffect(() => {
    const poll = async () => {
      try {
        const role = (localStorage.getItem(ROLE_KEY) as string) ?? 'super_admin';
        const namespaces = accessibleNamespaces(role);
        const results = await Promise.all(
          namespaces.map(ns => kvGet(ns, KV_KEY).then(v => ({ ns, v })).catch(() => ({ ns, v: null })))
        );
        let merged: Partial<AppStore> = {};
        for (const { v } of results) {
          if (v && typeof v === 'object') merged = { ...merged, ...(v as Partial<AppStore>) };
        }
        if (Object.keys(merged).length > 0) {
          setStoreRaw(prev => {
            let next = { ...prev, ...merged } as AppStore;
            // Backfill companyGaps if KV data predates the field
            if (next.companies?.some(c => !c.companyGaps)) {
              const defaultGapsMap = new Map(defaultConfig.companies.map(c => [c.id, c.companyGaps ?? []]));
              next = {
                ...next,
                companies: next.companies.map(c => ({
                  ...c,
                  companyGaps: c.companyGaps ?? defaultGapsMap.get(c.id) ?? [],
                })),
              };
            }
            // Keep sectors normalized to 3-sector scheme
            const OLD_TO_NEW_POLL: Record<string, string> = {
              s1:'s1',s2:'s3',s3:'s1',s4:'s1',s5:'s2',s6:'s2',s7:'s3',s8:'s3',s9:'s2',s10:'s2',s11:'s2',
            };
            if (next.sectors?.some(s => !['Advanced Manufacturing','Technology','Consumer'].includes(s.name))) {
              next = {
                ...next,
                sectors: [
                  { id: 's1', name: 'Advanced Manufacturing', color: '#D97706', iconName: 'cpu'      },
                  { id: 's2', name: 'Technology',             color: '#2563EB', iconName: 'brain'    },
                  { id: 's3', name: 'Consumer',               color: '#DB2777', iconName: 'sparkles' },
                ],
                companies: next.companies?.map(c => ({ ...c, sectorId: OLD_TO_NEW_POLL[c.sectorId] ?? c.sectorId })),
                deals:     next.deals?.map(d => ({ ...d, sectorId: OLD_TO_NEW_POLL[d.sectorId] ?? d.sectorId })),
              };
            }
            try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
            return next;
          });
        }
      } catch {}
    };
    poll(); // immediate fetch on mount
    const id = setInterval(poll, 5_000); // poll every 5s — near-instant cross-user sync
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  // ── Save to localStorage immediately + PostgreSQL debounced (team-namespaced)
  const setStore = useCallback((updater: AppStore | ((prev: AppStore) => AppStore)) => {
    setStoreRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Instant local cache
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      // Debounced backend save — split by namespace, write each separately
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const buckets = splitStoreByNamespace(next);
        for (const [ns, data] of Object.entries(buckets)) {
          if (Object.keys(data).length > 0) {
            kvSet(ns, KV_KEY, data).catch(() => {});
          }
        }
      }, 400);
      return next;
    });
  }, []);

  const setCurrentRole = (role: RoleName) => {
    // Only users whose DB role is super_admin can switch (preview other roles)
    if (user?.role && user.role !== 'super_admin') return;
    setCurrentRoleState(role);
    localStorage.setItem(ROLE_KEY, role);
  };

  const getRoleConfig = () => store.roles.find(r => r.role === currentRole) ?? store.roles[0];

  // Super admin: check both auth user role (DB) and stored role (localStorage fallback for first render)
  const isSuperAdmin = user?.role === 'super_admin' || (currentRole as string) === 'super_admin';

  const canAccess  = (tab: TabName) => isSuperAdmin || getRoleConfig().accessibleTabs.includes(tab);
  const canExport  = () => isSuperAdmin || getRoleConfig().canExport;
  const canAddNotes = () => isSuperAdmin || getRoleConfig().canAddNotes;
  const canEditPortfolio = () => isSuperAdmin || !!(getRoleConfig().canEditPortfolio);
  const visiblePortfolioTabs = (): string[] => {
    if (isSuperAdmin || currentRole === 'super_admin' || currentRole === 'portfolio_team') return []; // all visible
    return getRoleConfig().visiblePortfolioTabs ?? [];
  };

  // ── Firm ──────────────────────────────────────────────────────────────────
  const updateFirm = (firm: FirmConfig) => setStore(s => ({ ...s, firm }));

  // ── Sectors ───────────────────────────────────────────────────────────────
  const addSector    = (sector: Sector)  => setStore(s => ({ ...s, sectors: [...s.sectors, sector] }));
  const updateSector = (sector: Sector)  => setStore(s => ({ ...s, sectors: s.sectors.map(x => x.id === sector.id ? sector : x) }));
  const deleteSector = (id: string)      => setStore(s => ({ ...s, sectors: s.sectors.filter(x => x.id !== id) }));

  // ── People ────────────────────────────────────────────────────────────────
  const addPerson    = (p: Person)  => setStore(s => ({ ...s, people: [...s.people, p] }));
  const updatePerson = (p: Person)  => setStore(s => ({ ...s, people: s.people.map(x => x.id === p.id ? p : x) }));
  const deletePerson = (id: string) => setStore(s => ({ ...s, people: s.people.filter(x => x.id !== id) }));

  // ── Companies ─────────────────────────────────────────────────────────────
  const addCompany    = (c: PortfolioCompany)  => setStore(s => ({ ...s, companies: [...s.companies, c] }));
  const updateCompany = (c: PortfolioCompany)  => setStore(s => ({ ...s, companies: s.companies.map(x => x.id === c.id ? c : x) }));
  const deleteCompany = (id: string)           => setStore(s => ({ ...s, companies: s.companies.filter(x => x.id !== id) }));

  // ── Metrics ───────────────────────────────────────────────────────────────
  const addMetric    = (m: FundMetric)  => setStore(s => ({ ...s, fundMetrics: [...s.fundMetrics, m] }));
  const updateMetric = (m: FundMetric)  => setStore(s => ({ ...s, fundMetrics: s.fundMetrics.map(x => x.id === m.id ? m : x) }));
  const deleteMetric = (id: string)     => setStore(s => ({ ...s, fundMetrics: s.fundMetrics.filter(x => x.id !== id) }));

  // ── Roles ─────────────────────────────────────────────────────────────────
  const updateRole = (role: RolePermissions) => setStore(s => ({ ...s, roles: s.roles.map(x => x.role === role.role ? role : x) }));

  // ── Announcements ─────────────────────────────────────────────────────────
  const addAnnouncement    = (a: Announcement)  => setStore(s => ({ ...s, announcements: [...s.announcements, a] }));
  const updateAnnouncement = (a: Announcement)  => setStore(s => ({ ...s, announcements: s.announcements.map(x => x.id === a.id ? a : x) }));
  const deleteAnnouncement = (id: string)       => setStore(s => ({ ...s, announcements: s.announcements.filter(x => x.id !== id) }));

  // ── Deals ─────────────────────────────────────────────────────────────────
  const addDeal    = (d: Deal)   => setStore(s => ({ ...s, deals: [...s.deals, d] }));
  const updateDeal = (d: Deal)   => setStore(s => ({ ...s, deals: s.deals.map(x => x.id === d.id ? d : x) }));
  const deleteDeal = (id: string) => setStore(s => ({ ...s, deals: s.deals.filter(x => x.id !== id) }));

  // ── LPs ───────────────────────────────────────────────────────────────────
  const addLP    = (lp: LP)    => setStore(s => ({ ...s, lps: [...s.lps, lp] }));
  const updateLP = (lp: LP)    => setStore(s => ({ ...s, lps: s.lps.map(x => x.id === lp.id ? lp : x) }));
  const deleteLP = (id: string) => setStore(s => ({ ...s, lps: s.lps.filter(x => x.id !== id) }));

  // ── Cash Flow ─────────────────────────────────────────────────────────────
  const updateCashFlow = (data: CashFlowPoint[]) => setStore(s => ({ ...s, cashFlow: data }));

  // ── Resources ─────────────────────────────────────────────────────────────
  const addResource    = (r: Resource)  => setStore(s => ({ ...s, resources: [...(s.resources ?? []), r] }));
  const updateResource = (r: Resource)  => setStore(s => ({ ...s, resources: (s.resources ?? []).map(x => x.id === r.id ? r : x) }));
  const deleteResource = (id: string)   => setStore(s => ({ ...s, resources: (s.resources ?? []).filter(x => x.id !== id) }));

  // ── Gaps ──────────────────────────────────────────────────────────────────
  const addGap    = (g: Gap)    => setStore(s => ({ ...s, gaps: [...(s.gaps ?? []), g] }));
  const updateGap = (g: Gap)    => setStore(s => ({ ...s, gaps: (s.gaps ?? []).map(x => x.id === g.id ? g : x) }));
  const deleteGap = (id: string) => setStore(s => ({ ...s, gaps: (s.gaps ?? []).filter(x => x.id !== id) }));

  // ── Team Notes ────────────────────────────────────────────────────────────
  const addTeamNote    = (n: TeamNote)  => setStore(s => ({ ...s, teamNotes: [...(s.teamNotes ?? []), n] }));
  const updateTeamNote = (n: TeamNote)  => setStore(s => ({ ...s, teamNotes: (s.teamNotes ?? []).map(x => x.id === n.id ? n : x) }));
  const deleteTeamNote = (id: string)   => setStore(s => ({ ...s, teamNotes: (s.teamNotes ?? []).filter(x => x.id !== id) }));

  // Activity log — keep the most recent 200 entries.
  const logWorkspaceActivity = (a: WorkspaceActivity) =>
    setStore(s => ({ ...s, workspaceActivity: [a, ...(s.workspaceActivity ?? [])].slice(0, 200) }));
  const clearWorkspace = (team?: WorkspaceTeam) => setStore(s => {
    if (!team) return { ...s, resources: [], gaps: [], teamNotes: [] };
    const keep = <T extends { team?: WorkspaceTeam }>(arr: T[]) => (arr ?? []).filter(x => (x.team ?? 'all') !== team);
    return { ...s, resources: keep(s.resources ?? []), gaps: keep(s.gaps ?? []), teamNotes: keep(s.teamNotes ?? []) };
  });


  // ── Features 1–20 implementations ───────────────────────────────────────
  const addPortfolioUpdate  = (x: PortfolioUpdate) => setStore(s => ({ ...s, portfolioUpdates: [...(s.portfolioUpdates??[]), x] }));
  const updatePortfolioUpdate  = (x: PortfolioUpdate) => setStore(s => ({ ...s, portfolioUpdates: (s.portfolioUpdates??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deletePortfolioUpdate = (id: string) => setStore(s => ({ ...s, portfolioUpdates: (s.portfolioUpdates??[]).filter((i:any)=>i.id!==id) }));
  const addMeetingNote  = (x: MeetingNote) => setStore(s => ({ ...s, meetingNotes: [...(s.meetingNotes??[]), x] }));
  const updateMeetingNote  = (x: MeetingNote) => setStore(s => ({ ...s, meetingNotes: (s.meetingNotes??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteMeetingNote = (id: string) => setStore(s => ({ ...s, meetingNotes: (s.meetingNotes??[]).filter((i:any)=>i.id!==id) }));
  const addTask  = (x: Task) => setStore(s => ({ ...s, tasks: [...(s.tasks??[]), x] }));
  const updateTask  = (x: Task) => setStore(s => ({ ...s, tasks: (s.tasks??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteTask = (id: string) => setStore(s => ({ ...s, tasks: (s.tasks??[]).filter((i:any)=>i.id!==id) }));
  const addIcMemo  = (x: IcMemo) => setStore(s => ({ ...s, icMemos: [...(s.icMemos??[]), x] }));
  const updateIcMemo  = (x: IcMemo) => setStore(s => ({ ...s, icMemos: (s.icMemos??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteIcMemo = (id: string) => setStore(s => ({ ...s, icMemos: (s.icMemos??[]).filter((i:any)=>i.id!==id) }));
  const addDdChecklist  = (x: DdChecklist) => setStore(s => ({ ...s, ddChecklists: [...(s.ddChecklists??[]), x] }));
  const updateDdChecklist  = (x: DdChecklist) => setStore(s => ({ ...s, ddChecklists: (s.ddChecklists??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteDdChecklist = (id: string) => setStore(s => ({ ...s, ddChecklists: (s.ddChecklists??[]).filter((i:any)=>i.id!==id) }));
  const addCapitalEvent  = (x: CapitalEvent) => setStore(s => ({ ...s, capitalEvents: [...(s.capitalEvents??[]), x] }));
  const updateCapitalEvent  = (x: CapitalEvent) => setStore(s => ({ ...s, capitalEvents: (s.capitalEvents??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteCapitalEvent = (id: string) => setStore(s => ({ ...s, capitalEvents: (s.capitalEvents??[]).filter((i:any)=>i.id!==id) }));
  const addValuationMark  = (x: ValuationMark) => setStore(s => ({ ...s, valuationMarks: [...(s.valuationMarks??[]), x] }));
  const updateValuationMark  = (x: ValuationMark) => setStore(s => ({ ...s, valuationMarks: (s.valuationMarks??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteValuationMark = (id: string) => setStore(s => ({ ...s, valuationMarks: (s.valuationMarks??[]).filter((i:any)=>i.id!==id) }));
  const addFounderContact  = (x: FounderContact) => setStore(s => ({ ...s, founderContacts: [...(s.founderContacts??[]), x] }));
  const updateFounderContact  = (x: FounderContact) => setStore(s => ({ ...s, founderContacts: (s.founderContacts??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteFounderContact = (id: string) => setStore(s => ({ ...s, founderContacts: (s.founderContacts??[]).filter((i:any)=>i.id!==id) }));
  const addCoInvestor  = (x: CoInvestor) => setStore(s => ({ ...s, coInvestors: [...(s.coInvestors??[]), x] }));
  const updateCoInvestor  = (x: CoInvestor) => setStore(s => ({ ...s, coInvestors: (s.coInvestors??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteCoInvestor = (id: string) => setStore(s => ({ ...s, coInvestors: (s.coInvestors??[]).filter((i:any)=>i.id!==id) }));
  const addReferenceCheck  = (x: ReferenceCheck) => setStore(s => ({ ...s, referenceChecks: [...(s.referenceChecks??[]), x] }));
  const updateReferenceCheck  = (x: ReferenceCheck) => setStore(s => ({ ...s, referenceChecks: (s.referenceChecks??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteReferenceCheck = (id: string) => setStore(s => ({ ...s, referenceChecks: (s.referenceChecks??[]).filter((i:any)=>i.id!==id) }));
  const addNewsItem  = (x: NewsItem) => setStore(s => ({ ...s, newsItems: [...(s.newsItems??[]), x] }));
  const updateNewsItem  = (x: NewsItem) => setStore(s => ({ ...s, newsItems: (s.newsItems??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteNewsItem = (id: string) => setStore(s => ({ ...s, newsItems: (s.newsItems??[]).filter((i:any)=>i.id!==id) }));
  const addSigningDoc  = (x: SigningDoc) => setStore(s => ({ ...s, signingDocs: [...(s.signingDocs??[]), x] }));
  const updateSigningDoc  = (x: SigningDoc) => setStore(s => ({ ...s, signingDocs: (s.signingDocs??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteSigningDoc = (id: string) => setStore(s => ({ ...s, signingDocs: (s.signingDocs??[]).filter((i:any)=>i.id!==id) }));
  const addCompanyHealth  = (x: CompanyHealth) => setStore(s => ({ ...s, companyHealth: [...(s.companyHealth??[]), x] }));
  const updateCompanyHealth  = (x: CompanyHealth) => setStore(s => ({ ...s, companyHealth: (s.companyHealth??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteCompanyHealth = (id: string) => setStore(s => ({ ...s, companyHealth: (s.companyHealth??[]).filter((i:any)=>i.id!==id) }));
  const addIntroRequest  = (x: IntroRequest) => setStore(s => ({ ...s, introRequests: [...(s.introRequests??[]), x] }));
  const updateIntroRequest  = (x: IntroRequest) => setStore(s => ({ ...s, introRequests: (s.introRequests??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteIntroRequest = (id: string) => setStore(s => ({ ...s, introRequests: (s.introRequests??[]).filter((i:any)=>i.id!==id) }));
  const addLpCommunication  = (x: LpCommunication) => setStore(s => ({ ...s, lpCommunications: [...(s.lpCommunications??[]), x] }));
  const updateLpCommunication  = (x: LpCommunication) => setStore(s => ({ ...s, lpCommunications: (s.lpCommunications??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteLpCommunication = (id: string) => setStore(s => ({ ...s, lpCommunications: (s.lpCommunications??[]).filter((i:any)=>i.id!==id) }));
  const addLpCommitment  = (x: LpCommitment) => setStore(s => ({ ...s, lpCommitments: [...(s.lpCommitments??[]), x] }));
  const updateLpCommitment  = (x: LpCommitment) => setStore(s => ({ ...s, lpCommitments: (s.lpCommitments??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteLpCommitment = (id: string) => setStore(s => ({ ...s, lpCommitments: (s.lpCommitments??[]).filter((i:any)=>i.id!==id) }));
  const addFirmEvent  = (x: FirmEvent) => setStore(s => ({ ...s, firmEvents: [...(s.firmEvents??[]), x] }));
  const updateFirmEvent  = (x: FirmEvent) => setStore(s => ({ ...s, firmEvents: (s.firmEvents??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteFirmEvent = (id: string) => setStore(s => ({ ...s, firmEvents: (s.firmEvents??[]).filter((i:any)=>i.id!==id) }));
  const addResearchDoc  = (x: ResearchDocument) => setStore(s => ({ ...s, researchDocs: [...(s.researchDocs??[]), x] }));
  const updateResearchDoc  = (x: ResearchDocument) => setStore(s => ({ ...s, researchDocs: (s.researchDocs??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteResearchDoc = (id: string) => setStore(s => ({ ...s, researchDocs: (s.researchDocs??[]).filter((i:any)=>i.id!==id) }));
  const addFounderPortalAccess  = (x: FounderPortalAccess) => setStore(s => ({ ...s, founderPortalAccess: [...(s.founderPortalAccess??[]), x] }));
  const updateFounderPortalAccess  = (x: FounderPortalAccess) => setStore(s => ({ ...s, founderPortalAccess: (s.founderPortalAccess??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteFounderPortalAccess = (id: string) => setStore(s => ({ ...s, founderPortalAccess: (s.founderPortalAccess??[]).filter((i:any)=>i.id!==id) }));
  // Recruitment
  const addJobOpening = (x: JobOpening) => setStore(s => ({ ...s, jobOpenings: [...(s.jobOpenings??[]), x] }));
  const updateJobOpening = (x: JobOpening) => setStore(s => ({ ...s, jobOpenings: (s.jobOpenings??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteJobOpening = (id: string) => setStore(s => ({ ...s, jobOpenings: (s.jobOpenings??[]).filter((i:any)=>i.id!==id) }));
  const addCandidate = (x: Candidate) => setStore(s => ({ ...s, candidates: [...(s.candidates??[]), x] }));
  const updateCandidate = (x: Candidate) => setStore(s => ({ ...s, candidates: (s.candidates??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteCandidate = (id: string) => setStore(s => ({ ...s, candidates: (s.candidates??[]).filter((i:any)=>i.id!==id) }));
  const addInterview = (x: Interview) => setStore(s => ({ ...s, interviews: [...(s.interviews??[]), x] }));
  const updateInterview = (x: Interview) => setStore(s => ({ ...s, interviews: (s.interviews??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteInterview = (id: string) => setStore(s => ({ ...s, interviews: (s.interviews??[]).filter((i:any)=>i.id!==id) }));
  const addOfferLetter = (x: OfferLetter) => setStore(s => ({ ...s, offerLetters: [...(s.offerLetters??[]), x] }));
  const updateOfferLetter = (x: OfferLetter) => setStore(s => ({ ...s, offerLetters: (s.offerLetters??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteOfferLetter = (id: string) => setStore(s => ({ ...s, offerLetters: (s.offerLetters??[]).filter((i:any)=>i.id!==id) }));
  const addOnboardingTask = (x: OnboardingTask) => setStore(s => ({ ...s, onboardingTasks: [...(s.onboardingTasks??[]), x] }));
  const updateOnboardingTask = (x: OnboardingTask) => setStore(s => ({ ...s, onboardingTasks: (s.onboardingTasks??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteOnboardingTask = (id: string) => setStore(s => ({ ...s, onboardingTasks: (s.onboardingTasks??[]).filter((i:any)=>i.id!==id) }));

  // ── Financial Time Series ─────────────────────────────────────────────────
  const addFinancialPeriod    = (x: CompanyFinancialPeriod) => setStore(s => ({ ...s, financialPeriods: [...(s.financialPeriods??[]), x] }));
  const updateFinancialPeriod = (x: CompanyFinancialPeriod) => setStore(s => ({ ...s, financialPeriods: (s.financialPeriods??[]).map((i:any) => i.id===x.id ? x : i) }));
  const deleteFinancialPeriod = (id: string) => setStore(s => ({ ...s, financialPeriods: (s.financialPeriods??[]).filter((i:any) => i.id!==id) }));
  // Upsert by composite key: companyId + yearStyle + fiscalYear + quarter + periodType
  const upsertFinancialPeriod = (x: CompanyFinancialPeriod) => setStore(s => {
    const key = (p: CompanyFinancialPeriod) =>
      `${p.companyId}__${p.yearStyle}__${p.fiscalYear}__${p.periodType}__${p.quarter ?? 'annual'}`;
    const existing = (s.financialPeriods??[]).find((p: any) => key(p) === key(x));
    if (existing) {
      return { ...s, financialPeriods: (s.financialPeriods??[]).map((p: any) => key(p) === key(x) ? { ...p, ...x, id: p.id } : p) };
    }
    return { ...s, financialPeriods: [...(s.financialPeriods??[]), x] };
  });

  // ── Fund investment ledger (Finance namespace) ───────────────────────────
  const addFundInvestment    = (x: FundInvestment) => setStore(s => ({ ...s, fundInvestments: [...(s.fundInvestments??[]), x] }));
  const updateFundInvestment = (x: FundInvestment) => setStore(s => ({ ...s, fundInvestments: (s.fundInvestments??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteFundInvestment = (id: string) => setStore(s => ({
    ...s,
    fundInvestments: (s.fundInvestments??[]).filter((i:any)=>i.id!==id),
    // Cascade: also remove the matching portfolioFundView entry (pf_ prefix)
    portfolioFundView: (s.portfolioFundView??[]).filter((i:any)=>i.id!==`pf_${id}`),
  }));
  // ── Portfolio fund view (Portfolio namespace — completely independent) ────
  const addPortfolioFundView    = (x: FundInvestment) => setStore(s => ({ ...s, portfolioFundView: [...(s.portfolioFundView??[]), x] }));
  const updatePortfolioFundView = (x: FundInvestment) => setStore(s => ({ ...s, portfolioFundView: (s.portfolioFundView??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deletePortfolioFundView = (id: string) => setStore(s => ({ ...s, portfolioFundView: (s.portfolioFundView??[]).filter((i:any)=>i.id!==id) }));

  // ── Shared config (all users see same values via PostgreSQL) ─────────────
  const setNavConfig         = (cfg: NavTabConfig[])         => setStore(s => ({ ...s, navConfig: cfg }));
  const updateToolkitLinks    = (links: Record<string, string>) => setStore(s => ({ ...s, toolkitLinks: links }));
  const updateEmailTemplates  = (t: import('../data/types').EmailTemplates) => setStore(s => ({ ...s, emailTemplates: t }));
  const updateContentConfig   = (c: import('../data/types').ContentConfig) => setStore(s => ({ ...s, contentConfig: c }));
  const setRecruitmentConfig = (cfg: RecruitmentAppConfig)   => setStore(s => ({ ...s, recruitmentConfig: cfg }));
  const setOpsConfig         = (cfg: OpsAppConfig)           => setStore(s => ({ ...s, opsConfig: cfg }));
  const setFinanceData       = (key: string, val: unknown)   => setStore(s => ({ ...s, financeData: { ...(s.financeData??{}), [key]: val } }));
  const getFinanceData       = <T,>(key: string): T | null   => (store.financeData?.[key] as T) ?? null;

  // ── New config sections ──────────────────────────────────────────────────
  const updateDealStages       = (stages: DealStageConfig[])      => setStore(s => ({ ...s, dealStages: stages }));
  const updateKpiThresholds    = (t: KpiThresholds)               => setStore(s => ({ ...s, kpiThresholds: t }));
  const updateHomepage         = (h: HomepageConfig)              => setStore(s => ({ ...s, homepage: h }));
  const updateFinanceConfig    = (f: FinanceConfig)               => setStore(s => ({ ...s, financeConfig: f }));
  const updateTaxonomy         = (t: CompanyTaxonomy)             => setStore(s => ({ ...s, taxonomy: t }));
  const updatePortfolioSnapshot= (rows: PortfolioSnapshotRow[])   => setStore(s => ({ ...s, portfolioSnapshot: rows }));

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetToDefaults = () => {
    setStoreRaw(defaultConfig);
    localStorage.setItem(LS_KEY, JSON.stringify(defaultConfig));
    kvSet(KV_NS, KV_KEY, defaultConfig).catch(() => {});
  };

  const value: AppContextValue = {
    store, loading, currentRole, setCurrentRole,
    canAccess, canExport, canAddNotes, canEditPortfolio, visiblePortfolioTabs,
    updateFirm,
    addSector, updateSector, deleteSector,
    addPerson, updatePerson, deletePerson,
    addCompany, updateCompany, deleteCompany,
    addMetric, updateMetric, deleteMetric,
    updateRole,
    addAnnouncement, updateAnnouncement, deleteAnnouncement,
    addDeal, updateDeal, deleteDeal,
    addLP, updateLP, deleteLP,
    updateCashFlow,
    addResource, updateResource, deleteResource,
    addGap, updateGap, deleteGap,
    addTeamNote, updateTeamNote, deleteTeamNote, logWorkspaceActivity, clearWorkspace,

    // Features 1–20
    addPortfolioUpdate, updatePortfolioUpdate, deletePortfolioUpdate,
    addMeetingNote, updateMeetingNote, deleteMeetingNote,
    addTask, updateTask, deleteTask,
    addIcMemo, updateIcMemo, deleteIcMemo,
    addDdChecklist, updateDdChecklist, deleteDdChecklist,
    addCapitalEvent, updateCapitalEvent, deleteCapitalEvent,
    addValuationMark, updateValuationMark, deleteValuationMark,
    addFounderContact, updateFounderContact, deleteFounderContact,
    addCoInvestor, updateCoInvestor, deleteCoInvestor,
    addReferenceCheck, updateReferenceCheck, deleteReferenceCheck,
    addNewsItem, updateNewsItem, deleteNewsItem,
    addSigningDoc, updateSigningDoc, deleteSigningDoc,
    addCompanyHealth, updateCompanyHealth, deleteCompanyHealth,
    addIntroRequest, updateIntroRequest, deleteIntroRequest,
    addLpCommunication, updateLpCommunication, deleteLpCommunication,
    addLpCommitment, updateLpCommitment, deleteLpCommitment,
    addFirmEvent, updateFirmEvent, deleteFirmEvent,
    addResearchDoc, updateResearchDoc, deleteResearchDoc,
    addFounderPortalAccess, updateFounderPortalAccess, deleteFounderPortalAccess,
    addJobOpening, updateJobOpening, deleteJobOpening,
    addCandidate, updateCandidate, deleteCandidate,
    addInterview, updateInterview, deleteInterview,
    addOfferLetter, updateOfferLetter, deleteOfferLetter,
    addOnboardingTask, updateOnboardingTask, deleteOnboardingTask,
    addFinancialPeriod, updateFinancialPeriod, deleteFinancialPeriod, upsertFinancialPeriod,
    addFundInvestment, updateFundInvestment, deleteFundInvestment,
    addPortfolioFundView, updatePortfolioFundView, deletePortfolioFundView,
    setNavConfig, setRecruitmentConfig, setOpsConfig, setFinanceData, getFinanceData,
    updateToolkitLinks, updateEmailTemplates, updateContentConfig,
    updateDealStages, updateKpiThresholds, updateHomepage,
    updateFinanceConfig, updateTaxonomy, updatePortfolioSnapshot,
    resetToDefaults,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
