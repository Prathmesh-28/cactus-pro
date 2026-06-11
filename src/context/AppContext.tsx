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
  CompanyFinancialPeriod, CompanyStatus,
  NavTabConfig, RecruitmentAppConfig, OpsAppConfig, FundInvestment,
  DocTemplate, CompanyDocLink,
  CompanyTabLink, ToolkitTool,
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
  if (role === 'finance_admin')   return ['app','finance'];
  if (role === 'finance_viewer')  return ['app','finance'];
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

// ─── Sector normalisation — always enforce the 3-sector scheme ───────────────
// This runs on every load (initial + hydration + polling) to guarantee the
// live KV data never reverts to the old 11-sector scheme.
const _SECTOR_REMAP: Record<string, string> = {
  s1:'s1', s2:'s3', s3:'s1', s4:'s1',
  s5:'s2', s6:'s2', s7:'s3', s8:'s3',
  s9:'s2', s10:'s2', s11:'s2',
};
const _CANONICAL_SECTORS = [
  { id: 's1', name: 'Advanced Manufacturing', color: '#D97706', iconName: 'cpu'      },
  { id: 's2', name: 'Technology',             color: '#2563EB', iconName: 'brain'    },
  { id: 's3', name: 'Consumer',               color: '#DB2777', iconName: 'sparkles' },
];
// Name-based fallback: handles generated IDs from manually-created sectors
const _NAME_TO_SECTOR: Record<string, string> = {
  'advanced manufacturing':'s1','advance manufacturing':'s1',
  'aerospace & defence':'s1','energy & sustainability':'s1','manufacturing & electronics':'s1',
  'technology':'s2','mobility & smart city':'s2','saas & ai':'s2',
  'semiconductors':'s2','health & insurtech':'s2','fintech':'s2',
  'consumer':'s3','consumer (apparel)':'s3','consumer (ayurveda)':'s3','consumer (fashion)':'s3',
};
const _VALID_IDS = new Set(['s1','s2','s3']);

function normaliseSectors(s: AppStore): AppStore {
  const sectorsOk = s.sectors?.length === 3 &&
    s.sectors.every(x => ['Advanced Manufacturing','Technology','Consumer'].includes(x.name));
  const companiesOk = !s.companies?.some(c => !_VALID_IDS.has(c.sectorId));
  const dealsOk     = !s.deals?.some(d => !_VALID_IDS.has(d.sectorId));
  if (sectorsOk && companiesOk && dealsOk) return { ...s, sectors: _CANONICAL_SECTORS };

  // Build remap: standard IDs first, then name-based for generated IDs
  const idMap: Record<string, string> = { ..._SECTOR_REMAP };
  for (const sec of (s.sectors ?? [])) {
    if (!idMap[sec.id]) {
      const mapped = _NAME_TO_SECTOR[sec.name.toLowerCase().trim()];
      if (mapped) idMap[sec.id] = mapped;
    }
  }

  return {
    ...s,
    sectors: _CANONICAL_SECTORS,
    // Only remap IDs that aren't already canonical — prevents double-mapping (s2→s3 on 2nd run)
    companies: s.companies?.map(c => ({
      ...c,
      sectorId: _VALID_IDS.has(c.sectorId) ? c.sectorId : (idMap[c.sectorId] ?? 's1'),
    })),
    deals: s.deals?.map(d => ({
      ...d,
      sectorId: _VALID_IDS.has(d.sectorId) ? d.sectorId : (idMap[d.sectorId] ?? 's2'),
    })),
  };
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
  canEditFinance: () => boolean;    // finance admin — edit all finance tab data
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
  // Batch CSV import — single store write for bulk upserts
  batchUpsertFinancialPeriods: (rows: CompanyFinancialPeriod[]) => void;
  batchUpsertCompanyHealth: (rows: CompanyHealth[]) => void;
  batchUpsertPortfolioUpdates: (rows: PortfolioUpdate[]) => void;
  batchUpsertFounderContacts: (rows: FounderContact[]) => void;
  batchUpsertValuationMarks: (rows: ValuationMark[]) => void;
  batchUpdateCompanyMetrics: (patches: Array<{ id: string; revenue?: string; currentValuation?: string; moic?: number; irr?: number; ownershipPct?: number; status?: CompanyStatus; ceoName?: string; hqCity?: string; employees?: number; ebitda?: string }>) => void;
  // Fund investment ledger (Finance team — finance namespace)
  addFundInvestment: (x: FundInvestment) => void;
  updateFundInvestment: (x: FundInvestment) => void;
  deleteFundInvestment: (id: string) => void;
  // Portfolio team's independent fund view (portfolio namespace — NOT linked to finance)
  addPortfolioFundView: (x: FundInvestment) => void;
  updatePortfolioFundView: (x: FundInvestment) => void;
  deletePortfolioFundView: (id: string) => void;
  // Document templates & SharePoint link registry
  addDocTemplate: (x: DocTemplate) => void;           updateDocTemplate: (x: DocTemplate) => void;           deleteDocTemplate: (id: string) => void;
  upsertCompanyDocLink: (x: CompanyDocLink) => void;  // add or replace by companyId+templateId
  deleteCompanyDocLink: (id: string) => void;
  // Per-company per-tab data-source sheet links
  upsertCompanyTabLink: (x: CompanyTabLink) => void;
  deleteCompanyTabLink: (id: string) => void;
  // VC Toolkit tools (built-in + custom)
  upsertToolkitTool: (x: ToolkitTool) => void;
  deleteToolkitTool: (id: string) => void;
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
  const [store, setStoreRaw] = useState<AppStore>(() => normaliseSectors(seedPortfolioFundView(loadLocal() ?? defaultConfig)));
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
      const validPreviewRoles: RoleName[] = ['super_admin','portfolio_team','finance_team','finance_admin','finance_viewer','investment_team','portfolio_viewer'];
      if (!stored || !validPreviewRoles.includes(stored)) {
        setCurrentRoleState('super_admin');
        localStorage.setItem(ROLE_KEY, 'super_admin');
      }
      // If they deliberately switched to a test role, respect it — role switcher lets them change back
    }
  }, [user?.role]);

  // Debounce timer for backend saves
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Grace period: skip polling merges for 3s after any user write so the
  // debounced KV write (400ms) has time to complete before the poll overwrites.
  const lastUserWriteRef = useRef<number>(0);

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

        // Enforce 3-sector scheme — only write back to KV if something actually changed
        const beforeNorm = mergedStore;
        mergedStore = normaliseSectors(mergedStore);
        const needsSectorWrite = JSON.stringify(beforeNorm.sectors) !== JSON.stringify(mergedStore.sectors)
          || JSON.stringify(beforeNorm.companies?.map(c => c.sectorId)) !== JSON.stringify(mergedStore.companies?.map(c => c.sectorId));

        setStoreRaw(mergedStore);
        localStorage.setItem(LS_KEY, JSON.stringify(mergedStore));

        // Write back to KV only when something was actually migrated
        if (needsGapsBackfill || needsSectorWrite) {
          const buckets = splitStoreByNamespace(mergedStore);
          kvSet('app', KV_KEY, buckets['app']).catch(() => {});
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
  }, []); // eslint-disable-line

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
          // Skip merge if user wrote data within the last 3s — prevents the poll
          // from clobbering a change that hasn't reached KV yet.
          if (Date.now() - lastUserWriteRef.current < 3000) return;
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
            next = normaliseSectors(next);
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
      try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
      // Mark write time so polling skips the merge for the next 3s
      lastUserWriteRef.current = Date.now();
      // Debounced backend save — split by namespace, write each separately
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const role = (localStorage.getItem(ROLE_KEY) as string) ?? 'super_admin';
        const accessible = new Set(accessibleNamespaces(role));
        const buckets = splitStoreByNamespace(next);
        for (const [ns, data] of Object.entries(buckets)) {
          if (Object.keys(data).length > 0 && accessible.has(ns)) {
            kvSet(ns, KV_KEY, data).catch(() => {});
          }
        }
      }, 400);
      return next;
    });
  }, []);

  // ── One-time sector migration v5 — fixes double-mapping corruption ───────────
  // v4 only remapped non-canonical IDs. v5 additionally corrects companies that
  // got the wrong canonical ID (e.g. Technology→Consumer) from the pre-idempotency
  // bug by using defaultConfig sector assignments as ground truth.
  useEffect(() => {
    const V5_KEY = 'cactus_sectors_v5';
    if (!localStorage.getItem(V5_KEY)) {
      localStorage.setItem(V5_KEY, '1');
      const defaultSectorMap = new Map(defaultConfig.companies.map(c => [c.id, c.sectorId]));
      setStore(s => ({
        ...s,
        sectors: _CANONICAL_SECTORS,
        companies: s.companies?.map(c => ({
          ...c,
          sectorId: defaultSectorMap.get(c.id)
            ?? (_VALID_IDS.has(c.sectorId) ? c.sectorId : (_SECTOR_REMAP[c.sectorId] ?? 's1')),
        })),
        deals: s.deals?.map(d => ({
          ...d,
          sectorId: _VALID_IDS.has(d.sectorId) ? d.sectorId : (_SECTOR_REMAP[d.sectorId] ?? 's2'),
        })),
      }));
    }
  }, [setStore]);

  // v1: backfill sectorKpis from defaultConfig for any company missing it
  useEffect(() => {
    const KEY = 'cactus_kpis_v1';
    if (!localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, '1');
      const kpisMap = new Map(defaultConfig.companies.map(c => [c.id, c.sectorKpis]));
      setStore(s => ({
        ...s,
        companies: s.companies?.map(c => ({
          ...c,
          sectorKpis: c.sectorKpis?.length ? c.sectorKpis : (kpisMap.get(c.id) ?? []),
        })),
      }));
    }
  }, [setStore]);

  // v1: backfill docTemplates + companyDocLinks from defaultConfig for stores that lack them
  useEffect(() => {
    const KEY = 'cactus_doctpl_v1';
    if (!localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, '1');
      setStore(s => ({
        ...s,
        docTemplates:    s.docTemplates?.length    ? s.docTemplates    : defaultConfig.docTemplates,
        companyDocLinks: s.companyDocLinks?.length ? s.companyDocLinks : defaultConfig.companyDocLinks,
      }));
    }
  }, [setStore]);

  // v2: seed toolkitTools from defaultConfig for stores that lack them
  useEffect(() => {
    const KEY = 'cactus_toolkit_tools_v1';
    if (!localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, '1');
      setStore(s => ({
        ...s,
        companyTabLinks: s.companyTabLinks ?? [],
        toolkitTools:    s.toolkitTools?.length ? s.toolkitTools : defaultConfig.toolkitTools,
      }));
    }
  }, [setStore]);

  // v3: merge any roles added to defaultConfig that are missing from the store
  // (e.g. finance_admin, finance_viewer, portfolio_admin, portfolio_viewer added after initial seed)
  useEffect(() => {
    const KEY = 'cactus_roles_v3';
    if (!localStorage.getItem(KEY)) {
      localStorage.setItem(KEY, '1');
      setStore(s => {
        const existing = new Set(s.roles.map(r => r.role));
        const missing = defaultConfig.roles.filter(r => !existing.has(r.role));
        if (!missing.length) return s;
        return { ...s, roles: [...s.roles, ...missing] };
      });
    }
  }, [setStore]);

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
  const canEditFinance   = () => isSuperAdmin || !!(getRoleConfig().canEditFinance);
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
  const deleteCompany = (id: string) => setStore(s => {
    const name = s.companies.find(x => x.id === id)?.name;
    const noId = <T extends { companyId?: string | null }>(arr: T[] | undefined): T[] =>
      (arr ?? []).filter(x => x.companyId !== id);
    // capitalEvents, coInvestors, researchDocs are fund-level — no company link, not cascaded
    return {
      ...s,
      companies:        s.companies.filter(x => x.id !== id),
      financialPeriods: noId(s.financialPeriods),
      companyHealth:    noId(s.companyHealth),
      newsItems:        noId(s.newsItems),
      portfolioUpdates: noId(s.portfolioUpdates),
      founderContacts:  noId(s.founderContacts),
      valuationMarks:   noId(s.valuationMarks),
      signingDocs:      noId(s.signingDocs),
      icMemos:          noId(s.icMemos),
      referenceChecks:  noId(s.referenceChecks),
      jobOpenings:      noId(s.jobOpenings),
      meetingNotes:     noId(s.meetingNotes),
      companyDocLinks:  noId(s.companyDocLinks),
      ddChecklists:     (s.ddChecklists ?? []).filter(d => d.companyName !== name),
      introRequests:    (s.introRequests ?? []).filter(r => r.requestedByCompanyId !== id),
    };
  });

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

  // ── Document templates & SharePoint links ────────────────────────────────
  const addDocTemplate    = (x: DocTemplate) => setStore(s => ({ ...s, docTemplates: [...(s.docTemplates??[]), x] }));
  const updateDocTemplate = (x: DocTemplate) => setStore(s => ({ ...s, docTemplates: (s.docTemplates??[]).map((i:any)=>i.id===x.id?x:i) }));
  const deleteDocTemplate = (id: string) => setStore(s => ({
    ...s,
    docTemplates: (s.docTemplates??[]).filter((i:any)=>i.id!==id),
    // Cascade: remove every company link pointing at the deleted template
    companyDocLinks: (s.companyDocLinks??[]).filter((i:any)=>i.templateId!==id),
  }));
  // Upsert by composite key: companyId + templateId (keeps the existing link's id)
  const upsertCompanyDocLink = (x: CompanyDocLink) => setStore(s => {
    const match = (l: CompanyDocLink) => l.companyId === x.companyId && l.templateId === x.templateId;
    const existing = (s.companyDocLinks??[]).find((l: any) => match(l));
    if (existing) {
      return { ...s, companyDocLinks: (s.companyDocLinks??[]).map((l: any) => match(l) ? { ...l, ...x, id: l.id } : l) };
    }
    return { ...s, companyDocLinks: [...(s.companyDocLinks??[]), x] };
  });
  const deleteCompanyDocLink = (id: string) => setStore(s => ({ ...s, companyDocLinks: (s.companyDocLinks??[]).filter((i:any)=>i.id!==id) }));

  const upsertCompanyTabLink = (x: CompanyTabLink) => setStore(s => {
    const match = (l: CompanyTabLink) => l.companyId === x.companyId && l.tab === x.tab;
    const existing = (s.companyTabLinks??[]).find((l: any) => match(l));
    if (existing) {
      return { ...s, companyTabLinks: (s.companyTabLinks??[]).map((l: any) => match(l) ? { ...l, ...x, id: l.id } : l) };
    }
    return { ...s, companyTabLinks: [...(s.companyTabLinks??[]), x] };
  });
  const deleteCompanyTabLink = (id: string) => setStore(s => ({ ...s, companyTabLinks: (s.companyTabLinks??[]).filter((i:any)=>i.id!==id) }));

  const upsertToolkitTool = (x: ToolkitTool) => setStore(s => {
    const list = s.toolkitTools ?? defaultConfig.toolkitTools;
    const idx = list.findIndex((t: any) => t.id === x.id);
    if (idx >= 0) {
      const next = [...list]; next[idx] = { ...list[idx], ...x };
      return { ...s, toolkitTools: next };
    }
    return { ...s, toolkitTools: [...list, x] };
  });
  const deleteToolkitTool = (id: string) => setStore(s => ({
    ...s,
    toolkitTools: (s.toolkitTools ?? defaultConfig.toolkitTools).filter((t: any) => t.id !== id),
  }));

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

  // ── Batch CSV import (single setStore call per import) ───────────────────
  const batchUpsertFinancialPeriods = (rows: CompanyFinancialPeriod[]) => setStore(s => {
    const key = (p: CompanyFinancialPeriod) =>
      `${p.companyId}__${p.yearStyle}__${p.fiscalYear}__${p.periodType}__${p.quarter ?? 'annual'}`;
    const map = new Map((s.financialPeriods ?? []).map(p => [key(p as CompanyFinancialPeriod), p as CompanyFinancialPeriod]));
    rows.forEach(r => map.set(key(r), { ...(map.get(key(r)) ?? {}), ...r, id: map.get(key(r))?.id ?? r.id }));
    return { ...s, financialPeriods: Array.from(map.values()) };
  });

  const batchUpsertCompanyHealth = (rows: CompanyHealth[]) => setStore(s => {
    const key = (h: CompanyHealth) => `${h.companyId}__${h.quarter}`;
    const map = new Map((s.companyHealth ?? []).map(h => [key(h as CompanyHealth), h as CompanyHealth]));
    rows.forEach(r => map.set(key(r), { ...(map.get(key(r)) ?? {}), ...r, id: map.get(key(r))?.id ?? r.id }));
    return { ...s, companyHealth: Array.from(map.values()) };
  });

  const batchUpsertPortfolioUpdates = (rows: PortfolioUpdate[]) => setStore(s => {
    const key = (u: PortfolioUpdate) => `${u.companyId}__${u.month}`;
    const map = new Map((s.portfolioUpdates ?? []).map(u => [key(u as PortfolioUpdate), u as PortfolioUpdate]));
    rows.forEach(r => map.set(key(r), { ...(map.get(key(r)) ?? {}), ...r, id: map.get(key(r))?.id ?? r.id }));
    return { ...s, portfolioUpdates: Array.from(map.values()) };
  });

  const batchUpsertFounderContacts = (rows: FounderContact[]) => setStore(s => {
    const key = (f: FounderContact) => f.email ? `${f.companyId}__${f.email}` : `${f.companyId}__${f.name}`;
    const map = new Map((s.founderContacts ?? []).map(f => [key(f as FounderContact), f as FounderContact]));
    rows.forEach(r => map.set(key(r), { ...(map.get(key(r)) ?? {}), ...r, id: map.get(key(r))?.id ?? r.id }));
    return { ...s, founderContacts: Array.from(map.values()) };
  });

  const batchUpsertValuationMarks = (rows: ValuationMark[]) => setStore(s => {
    const key = (v: ValuationMark) => `${v.companyId}__${v.quarter}`;
    const map = new Map((s.valuationMarks ?? []).map(v => [key(v as ValuationMark), v as ValuationMark]));
    rows.forEach(r => map.set(key(r), { ...(map.get(key(r)) ?? {}), ...r, id: map.get(key(r))?.id ?? r.id }));
    return { ...s, valuationMarks: Array.from(map.values()) };
  });

  const batchUpdateCompanyMetrics = (patches: Array<{ id: string; revenue?: string; currentValuation?: string; moic?: number; irr?: number; ownershipPct?: number; status?: CompanyStatus; ceoName?: string; hqCity?: string; employees?: number; ebitda?: string }>) =>
    setStore(s => {
      const pMap = new Map(patches.map(p => [p.id, p]));
      return {
        ...s,
        companies: s.companies.map(c => {
          const p = pMap.get(c.id);
          if (!p) return c;
          return {
            ...c,
            ...(p.revenue !== undefined         && { revenue: p.revenue }),
            ...(p.currentValuation !== undefined && { currentValuation: p.currentValuation }),
            ...(p.moic !== undefined             && { moic: p.moic }),
            ...(p.irr !== undefined              && { irr: p.irr }),
            ...(p.ownershipPct !== undefined     && { ownershipPct: p.ownershipPct }),
            ...(p.status !== undefined           && { status: p.status }),
            ...(p.ceoName !== undefined          && { ceoName: p.ceoName }),
            ...(p.hqCity !== undefined           && { hqCity: p.hqCity }),
            ...(p.employees !== undefined        && { employees: p.employees }),
            ...(p.ebitda !== undefined           && { ebitda: p.ebitda }),
          };
        }),
      };
    });

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetToDefaults = () => {
    setStoreRaw(defaultConfig);
    localStorage.setItem(LS_KEY, JSON.stringify(defaultConfig));
    kvSet(KV_NS, KV_KEY, defaultConfig).catch(() => {});
  };

  const value: AppContextValue = {
    store, loading, currentRole, setCurrentRole,
    canAccess, canExport, canAddNotes, canEditPortfolio, canEditFinance, visiblePortfolioTabs,
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
    batchUpsertFinancialPeriods, batchUpsertCompanyHealth, batchUpsertPortfolioUpdates,
    batchUpsertFounderContacts, batchUpsertValuationMarks, batchUpdateCompanyMetrics,
    addFundInvestment, updateFundInvestment, deleteFundInvestment,
    addPortfolioFundView, updatePortfolioFundView, deletePortfolioFundView,
    addDocTemplate, updateDocTemplate, deleteDocTemplate,
    upsertCompanyDocLink, deleteCompanyDocLink,
    upsertCompanyTabLink, deleteCompanyTabLink,
    upsertToolkitTool, deleteToolkitTool,
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
