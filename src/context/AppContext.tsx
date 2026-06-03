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
  PortfolioUpdate, MeetingNote, Task, IcMemo, DdChecklist,
  CapitalEvent, ValuationMark, FounderContact, CoInvestor,
  ReferenceCheck, NewsItem, SigningDoc, CompanyHealth,
  IntroRequest, LpCommunication, LpCommitment, FirmEvent,
  ResearchDocument, FounderPortalAccess,
  JobOpening, Candidate, Interview, OfferLetter, OnboardingTask,
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
