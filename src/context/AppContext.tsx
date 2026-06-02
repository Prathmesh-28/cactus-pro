import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { defaultConfig } from '../data/defaultConfig';
import { kvGet, kvSet } from '../lib/api';
import type {
  AppStore, FirmConfig, Sector, Person, PortfolioCompany,
  FundMetric, RolePermissions, Announcement, Deal, LP, CashFlowPoint,
  RoleName, TabName, Resource, Gap, TeamNote,
  DealStageConfig, KpiThresholds, HomepageConfig, FinanceConfig,
  CompanyTaxonomy, PortfolioSnapshotRow,
} from '../data/types';

const LS_KEY   = 'cactus_store';
const ROLE_KEY = 'cactus_role';
const KV_NS    = 'app';
const KV_KEY   = 'store';

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

export function AppProvider({ children }: { children: ReactNode }) {
  // Start with localStorage for instant render, then hydrate from PostgreSQL
  const [store, setStoreRaw] = useState<AppStore>(loadLocal() ?? defaultConfig);
  const [loading, setLoading] = useState(true);
  const [currentRole, setCurrentRoleState] = useState<RoleName>(
    () => (localStorage.getItem(ROLE_KEY) as RoleName) ?? 'super_admin'
  );

  // Debounce timer for backend saves
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Hydrate from PostgreSQL on mount ────────────────────────────────────────
  useEffect(() => {
    kvGet(KV_NS, KV_KEY).then(remote => {
      if (remote && typeof remote === 'object') {
        const remoteStore = remote as AppStore;
        setStoreRaw(remoteStore);
        localStorage.setItem(LS_KEY, JSON.stringify(remoteStore));
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // ── Save to localStorage immediately + PostgreSQL debounced ─────────────────
  const setStore = useCallback((updater: AppStore | ((prev: AppStore) => AppStore)) => {
    setStoreRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Instant local save
      localStorage.setItem(LS_KEY, JSON.stringify(next));
      // Debounced backend save (400ms after last change)
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        kvSet(KV_NS, KV_KEY, next).catch(() => {});
      }, 400);
      return next;
    });
  }, []);

  const setCurrentRole = (role: RoleName) => {
    setCurrentRoleState(role);
    localStorage.setItem(ROLE_KEY, role);
  };

  const getRoleConfig = () => store.roles.find(r => r.role === currentRole) ?? store.roles[0];
  const canAccess  = (tab: TabName) => getRoleConfig().accessibleTabs.includes(tab);
  const canExport  = () => getRoleConfig().canExport;
  const canAddNotes = () => getRoleConfig().canAddNotes;

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
    canAccess, canExport, canAddNotes,
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
    addTeamNote, updateTeamNote, deleteTeamNote,
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
