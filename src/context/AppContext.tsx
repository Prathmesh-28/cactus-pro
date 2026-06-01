import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { defaultConfig } from '../data/defaultConfig';
import type {
  AppStore,
  FirmConfig,
  Sector,
  Person,
  PortfolioCompany,
  FundMetric,
  RolePermissions,
  Announcement,
  Deal,
  LP,
  CashFlowPoint,
  RoleName,
  TabName,
  Resource,
  Gap,
  TeamNote,
} from '../data/types';

const STORAGE_KEY = 'cactus_store';
const ROLE_KEY = 'cactus_role';

interface AppContextValue {
  store: AppStore;
  currentRole: RoleName;
  setCurrentRole: (role: RoleName) => void;
  canAccess: (tab: TabName) => boolean;
  canExport: () => boolean;
  canAddNotes: () => boolean;
  // Firm
  updateFirm: (firm: FirmConfig) => void;
  // Sectors
  addSector: (sector: Sector) => void;
  updateSector: (sector: Sector) => void;
  deleteSector: (id: string) => void;
  // People
  addPerson: (person: Person) => void;
  updatePerson: (person: Person) => void;
  deletePerson: (id: string) => void;
  // Companies
  addCompany: (company: PortfolioCompany) => void;
  updateCompany: (company: PortfolioCompany) => void;
  deleteCompany: (id: string) => void;
  // Metrics
  addMetric: (metric: FundMetric) => void;
  updateMetric: (metric: FundMetric) => void;
  deleteMetric: (id: string) => void;
  // Roles
  updateRole: (role: RolePermissions) => void;
  // Announcements
  addAnnouncement: (ann: Announcement) => void;
  updateAnnouncement: (ann: Announcement) => void;
  deleteAnnouncement: (id: string) => void;
  // Deals
  addDeal: (deal: Deal) => void;
  updateDeal: (deal: Deal) => void;
  deleteDeal: (id: string) => void;
  // LPs
  addLP: (lp: LP) => void;
  updateLP: (lp: LP) => void;
  deleteLP: (id: string) => void;
  // Cash flow
  updateCashFlow: (data: CashFlowPoint[]) => void;
  // Resources
  addResource: (r: Resource) => void;
  updateResource: (r: Resource) => void;
  deleteResource: (id: string) => void;
  // Gaps
  addGap: (g: Gap) => void;
  updateGap: (g: Gap) => void;
  deleteGap: (id: string) => void;
  // Team Notes
  addTeamNote: (n: TeamNote) => void;
  updateTeamNote: (n: TeamNote) => void;
  deleteTeamNote: (id: string) => void;
  // Reset
  resetToDefaults: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<AppStore>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as AppStore) : defaultConfig;
    } catch {
      return defaultConfig;
    }
  });

  const [currentRole, setCurrentRoleState] = useState<RoleName>(() => {
    const saved = localStorage.getItem(ROLE_KEY);
    return (saved as RoleName) ?? 'super_admin';
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  const setCurrentRole = (role: RoleName) => {
    setCurrentRoleState(role);
    localStorage.setItem(ROLE_KEY, role);
  };

  const getRoleConfig = () =>
    store.roles.find((r) => r.role === currentRole) ?? store.roles[0];

  const canAccess = (tab: TabName) =>
    getRoleConfig().accessibleTabs.includes(tab);

  const canExport = () => getRoleConfig().canExport;

  const canAddNotes = () => getRoleConfig().canAddNotes;

  // ─── Firm ─────────────────────────────────────────────────────────────────
  const updateFirm = (firm: FirmConfig) =>
    setStore((s) => ({ ...s, firm }));

  // ─── Sectors ──────────────────────────────────────────────────────────────
  const addSector = (sector: Sector) =>
    setStore((s) => ({ ...s, sectors: [...s.sectors, sector] }));

  const updateSector = (sector: Sector) =>
    setStore((s) => ({
      ...s,
      sectors: s.sectors.map((x) => (x.id === sector.id ? sector : x)),
    }));

  const deleteSector = (id: string) =>
    setStore((s) => ({ ...s, sectors: s.sectors.filter((x) => x.id !== id) }));

  // ─── People ───────────────────────────────────────────────────────────────
  const addPerson = (person: Person) =>
    setStore((s) => ({ ...s, people: [...s.people, person] }));

  const updatePerson = (person: Person) =>
    setStore((s) => ({
      ...s,
      people: s.people.map((x) => (x.id === person.id ? person : x)),
    }));

  const deletePerson = (id: string) =>
    setStore((s) => ({ ...s, people: s.people.filter((x) => x.id !== id) }));

  // ─── Companies ────────────────────────────────────────────────────────────
  const addCompany = (company: PortfolioCompany) =>
    setStore((s) => ({ ...s, companies: [...s.companies, company] }));

  const updateCompany = (company: PortfolioCompany) =>
    setStore((s) => ({
      ...s,
      companies: s.companies.map((x) => (x.id === company.id ? company : x)),
    }));

  const deleteCompany = (id: string) =>
    setStore((s) => ({
      ...s,
      companies: s.companies.filter((x) => x.id !== id),
    }));

  // ─── Metrics ──────────────────────────────────────────────────────────────
  const addMetric = (metric: FundMetric) =>
    setStore((s) => ({ ...s, fundMetrics: [...s.fundMetrics, metric] }));

  const updateMetric = (metric: FundMetric) =>
    setStore((s) => ({
      ...s,
      fundMetrics: s.fundMetrics.map((x) => (x.id === metric.id ? metric : x)),
    }));

  const deleteMetric = (id: string) =>
    setStore((s) => ({
      ...s,
      fundMetrics: s.fundMetrics.filter((x) => x.id !== id),
    }));

  // ─── Roles ────────────────────────────────────────────────────────────────
  const updateRole = (role: RolePermissions) =>
    setStore((s) => ({
      ...s,
      roles: s.roles.map((x) => (x.role === role.role ? role : x)),
    }));

  // ─── Announcements ────────────────────────────────────────────────────────
  const addAnnouncement = (ann: Announcement) =>
    setStore((s) => ({
      ...s,
      announcements: [...s.announcements, ann],
    }));

  const updateAnnouncement = (ann: Announcement) =>
    setStore((s) => ({
      ...s,
      announcements: s.announcements.map((x) => (x.id === ann.id ? ann : x)),
    }));

  const deleteAnnouncement = (id: string) =>
    setStore((s) => ({
      ...s,
      announcements: s.announcements.filter((x) => x.id !== id),
    }));

  // ─── Deals ────────────────────────────────────────────────────────────────
  const addDeal = (deal: Deal) =>
    setStore((s) => ({ ...s, deals: [...s.deals, deal] }));

  const updateDeal = (deal: Deal) =>
    setStore((s) => ({
      ...s,
      deals: s.deals.map((x) => (x.id === deal.id ? deal : x)),
    }));

  const deleteDeal = (id: string) =>
    setStore((s) => ({ ...s, deals: s.deals.filter((x) => x.id !== id) }));

  // ─── LPs ──────────────────────────────────────────────────────────────────
  const addLP = (lp: LP) =>
    setStore((s) => ({ ...s, lps: [...s.lps, lp] }));

  const updateLP = (lp: LP) =>
    setStore((s) => ({
      ...s,
      lps: s.lps.map((x) => (x.id === lp.id ? lp : x)),
    }));

  const deleteLP = (id: string) =>
    setStore((s) => ({ ...s, lps: s.lps.filter((x) => x.id !== id) }));

  // ─── Cash Flow ────────────────────────────────────────────────────────────
  const updateCashFlow = (data: CashFlowPoint[]) =>
    setStore((s) => ({ ...s, cashFlow: data }));

  // ─── Resources ────────────────────────────────────────────────────────────
  const addResource = (r: Resource) =>
    setStore(s => ({ ...s, resources: [...(s.resources ?? []), r] }));
  const updateResource = (r: Resource) =>
    setStore(s => ({ ...s, resources: (s.resources ?? []).map(x => x.id === r.id ? r : x) }));
  const deleteResource = (id: string) =>
    setStore(s => ({ ...s, resources: (s.resources ?? []).filter(x => x.id !== id) }));

  // ─── Gaps ─────────────────────────────────────────────────────────────────
  const addGap = (g: Gap) =>
    setStore(s => ({ ...s, gaps: [...(s.gaps ?? []), g] }));
  const updateGap = (g: Gap) =>
    setStore(s => ({ ...s, gaps: (s.gaps ?? []).map(x => x.id === g.id ? g : x) }));
  const deleteGap = (id: string) =>
    setStore(s => ({ ...s, gaps: (s.gaps ?? []).filter(x => x.id !== id) }));

  // ─── Team Notes ───────────────────────────────────────────────────────────
  const addTeamNote = (n: TeamNote) =>
    setStore(s => ({ ...s, teamNotes: [...(s.teamNotes ?? []), n] }));
  const updateTeamNote = (n: TeamNote) =>
    setStore(s => ({ ...s, teamNotes: (s.teamNotes ?? []).map(x => x.id === n.id ? n : x) }));
  const deleteTeamNote = (id: string) =>
    setStore(s => ({ ...s, teamNotes: (s.teamNotes ?? []).filter(x => x.id !== id) }));

  // ─── Reset ────────────────────────────────────────────────────────────────
  const resetToDefaults = () => {
    setStore(defaultConfig);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value: AppContextValue = {
    store,
    currentRole,
    setCurrentRole,
    canAccess,
    canExport,
    canAddNotes,
    updateFirm,
    addSector,
    updateSector,
    deleteSector,
    addPerson,
    updatePerson,
    deletePerson,
    addCompany,
    updateCompany,
    deleteCompany,
    addMetric,
    updateMetric,
    deleteMetric,
    updateRole,
    addAnnouncement,
    updateAnnouncement,
    deleteAnnouncement,
    addDeal,
    updateDeal,
    deleteDeal,
    addLP,
    updateLP,
    deleteLP,
    updateCashFlow,
    addResource, updateResource, deleteResource,
    addGap, updateGap, deleteGap,
    addTeamNote, updateTeamNote, deleteTeamNote,
    resetToDefaults,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
