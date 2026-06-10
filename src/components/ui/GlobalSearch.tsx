import { useState, useEffect, useRef, useMemo } from 'react';
import { Search, X, Building2, Users, TrendingUp, Tag, BarChart2, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import type { PortfolioCompany, TabName } from '../../data/types';

type ResultKind = 'company' | 'person' | 'deal' | 'sector' | 'metric' | 'nav';
interface Result {
  id: string;
  kind: ResultKind;
  title: string;
  subtitle: string;
  logoUrl?: string;
  action: () => void;
}

const KIND_META: Record<ResultKind, { label: string; Icon: React.ElementType; color: string }> = {
  company: { label: 'Company',    Icon: Building2,  color: '#1C4B42' },
  person:  { label: 'Team',       Icon: Users,      color: '#6D28D9' },
  deal:    { label: 'Deal',       Icon: TrendingUp, color: '#B45309' },
  sector:  { label: 'Sector',     Icon: Tag,        color: '#0369A1' },
  metric:  { label: 'Metric',     Icon: BarChart2,  color: '#065F46' },
  nav:     { label: 'Navigate',   Icon: Zap,        color: '#86CA0F' },
};

const QUICK_NAV: { title: string; subtitle: string; path: string; tab: TabName }[] = [
  { title: 'Portfolio', subtitle: 'View all portfolio companies',     path: '/dashboard',  tab: 'portfolio' },
  { title: 'Finance',   subtitle: 'Fund metrics, LP table, expenses', path: '/finance',    tab: 'finance' },
  { title: 'Investment Pipeline', subtitle: 'Deal Kanban board',      path: '/investment', tab: 'investment' },
  { title: 'VC Toolkit',  subtitle: 'Calculators and templates',      path: '/toolkit',    tab: 'toolkit' },
  { title: 'Workspace',   subtitle: 'Resources, gaps, team notes',    path: '/workspace',  tab: 'workspace' },
  { title: 'Operations',  subtitle: 'Tasks, meeting notes, intros',   path: '/operations', tab: 'operations' },
  { title: 'Admin',       subtitle: 'Settings and configuration',     path: '/admin',      tab: 'admin' },
  { title: 'Admin → Firm Settings',    subtitle: 'Logo, colours, tagline', path: '/admin',  tab: 'admin' },
  { title: 'Admin → Portfolio Snapshot', subtitle: 'Edit MOIC, IRR data', path: '/admin',  tab: 'admin' },
  { title: 'Admin → Data Sync',   subtitle: 'SharePoint / Excel sync',  path: '/admin',    tab: 'admin' },
  { title: 'Admin → Homepage',    subtitle: 'Hero text, value pillars',  path: '/admin',   tab: 'admin' },
];

function fuzzy(str: string, q: string): boolean {
  if (!q) return true;
  const s = str.toLowerCase();
  const words = q.toLowerCase().split(' ').filter(Boolean);
  return words.every(w => s.includes(w));
}


interface Props {
  onSelectCompany?: (c: PortfolioCompany) => void;
}

export default function GlobalSearch({ onSelectCompany: _oc }: Props) {
  const { store, currentRole, canAccess } = useApp();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Only surface nav targets the current role can actually open.
  const navItems = useMemo(() => QUICK_NAV.filter(n => canAccess(n.tab)), [canAccess, currentRole]);
  const canPortfolio  = canAccess('portfolio');
  const canFinance    = canAccess('finance');
  const canInvestment = canAccess('investment');
  const canAdmin      = canAccess('admin');

  const results = useMemo((): Result[] => {
    if (!query.trim() && open) {
      // Show quick nav when no query
      return navItems.slice(0, 6).map((n, i) => ({
        id: `nav-${i}`, kind: 'nav' as ResultKind,
        title: n.title, subtitle: n.subtitle,
        action: () => { navigate(n.path); setOpen(false); },
      }));
    }
    if (!query.trim()) return [];
    const q = query.trim();
    const res: Result[] = [];

    // Companies (portfolio access)
    if (canPortfolio) {
      store.companies.filter(c => fuzzy(c.name + ' ' + c.ceoName + ' ' + c.hqCity + ' ' + c.stage + ' ' + c.shortDescription, q))
        .slice(0, 5).forEach(c => res.push({
          id: `co-${c.id}`, kind: 'company', title: c.name,
          subtitle: `${store.sectors.find(s=>s.id===c.sectorId)?.name??''} · ${c.stage} · ${c.hqCity}`,
          logoUrl: c.logoUrl,
          action: () => { navigate(`/dashboard?open=${c.id}`); setOpen(false); },
        }));
    }

    // People (firm team) — managed in Admin
    if (canAdmin) {
      store.people.filter(p => fuzzy(p.name + ' ' + p.title + ' ' + p.bio, q))
        .slice(0, 3).forEach(p => res.push({
          id: `pe-${p.id}`, kind: 'person', title: p.name, subtitle: p.title,
          action: () => { navigate('/admin'); setOpen(false); },
        }));
    }

    // Company key people (portfolio access)
    if (canPortfolio) {
      store.companies.forEach(c => {
        c.keyPeople.filter(p => fuzzy(p.name + ' ' + p.title, q)).slice(0,2).forEach((p,i) => {
          res.push({
            id: `kp-${c.id}-${i}`, kind: 'person', title: p.name,
            subtitle: `${p.title} · ${c.name}`,
            action: () => { navigate(`/dashboard?open=${c.id}`); setOpen(false); },
          });
        });
      });
    }

    // Deals (investment access)
    if (canInvestment) {
      store.deals.filter(d => fuzzy(d.companyName + ' ' + d.stage + ' ' + d.ticketSize, q))
        .slice(0, 3).forEach(d => res.push({
          id: `de-${d.id}`, kind: 'deal', title: d.companyName,
          subtitle: `${d.stage} · ${d.ticketSize}`,
          action: () => { navigate('/investment'); setOpen(false); },
        }));
    }

    // Sectors (portfolio access)
    if (canPortfolio) {
      store.sectors.filter(s => fuzzy(s.name, q)).forEach(s => res.push({
        id: `se-${s.id}`, kind: 'sector', title: s.name,
        subtitle: `${store.companies.filter(c=>c.sectorId===s.id).length} companies`,
        action: () => { navigate(`/dashboard?sector=${s.id}`); setOpen(false); },
      }));
    }

    // Fund Metrics (finance access)
    if (canFinance) {
      store.fundMetrics.filter(m => fuzzy(m.label + ' ' + m.value, q)).slice(0,2).forEach(m => res.push({
        id: `me-${m.id}`, kind: 'metric', title: m.label,
        subtitle: `${m.value}${m.delta ? ' · '+m.delta : ''}`,
        action: () => { navigate('/finance'); setOpen(false); },
      }));
    }

    // Quick nav (already access-filtered)
    navItems.filter(n => fuzzy(n.title + ' ' + n.subtitle, q)).slice(0,3).forEach((n,i) => res.push({
      id: `na-${i}`, kind: 'nav', title: n.title, subtitle: n.subtitle,
      action: () => { navigate(n.path); setOpen(false); },
    }));

    return res.slice(0, 10);
  }, [query, open, store, navItems, canPortfolio, canFinance, canInvestment, canAdmin]);

  useEffect(() => { setActiveIdx(0); }, [results]);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i+1, results.length-1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIdx(i => Math.max(i-1, 0)); }
    if (e.key === 'Enter' && results[activeIdx]) results[activeIdx].action();
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.75)', border: '1px solid rgba(255,255,255,0.2)' }}
      >
        <Search className="w-3.5 h-3.5" />
        <span className="hidden xl:inline text-xs">Search everything…</span>
        <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.6)' }}>⌘K</kbd>
      </button>

      {/* Mobile icon */}
      <button onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="md:hidden p-2 rounded-lg hover:bg-white/10">
        <Search className="w-4 h-4 text-white" />
      </button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[10vh] px-4"
          style={{ backgroundColor: 'rgba(10,35,33,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={() => setOpen(false)}>
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ border: '1px solid #E3EDE9' }}
            onClick={e => e.stopPropagation()}>

            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor: '#E3EDE9' }}>
              <Search className="w-4 h-4 shrink-0" style={{ color: '#86CA0F' }} />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Search companies, people, deals, metrics…"
                className="flex-1 text-sm outline-none"
                style={{ color: '#191c14' }}
              />
              {query && (
                <button onClick={() => setQuery('')} className="p-1 rounded hover:bg-gray-100">
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
              <kbd className="text-[10px] px-2 py-1 rounded text-gray-400" style={{ backgroundColor: '#F2F7F1' }}>Esc</kbd>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[400px] overflow-y-auto">
              {!query && (
                <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#86CA0F' }}>
                  Quick Navigation
                </p>
              )}
              {results.length === 0 && query && (
                <div className="px-4 py-8 text-center text-sm text-gray-400">
                  No results for "<strong>{query}</strong>"
                </div>
              )}
              {results.map((r, i) => {
                const meta = KIND_META[r.kind];
                const Icon = meta.Icon;
                return (
                  <button
                    key={r.id}
                    onClick={r.action}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                    style={{ backgroundColor: i === activeIdx ? '#F6FAF7' : 'transparent' }}
                    onMouseEnter={() => setActiveIdx(i)}
                  >
                    {/* Icon or logo */}
                    {r.kind === 'company' && r.logoUrl
                      ? <img src={r.logoUrl} alt={r.title} className="w-8 h-8 object-contain rounded shrink-0" />
                      : (
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: meta.color + '18' }}>
                          <Icon className="w-4 h-4" style={{ color: meta.color }} />
                        </div>
                      )
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: '#191c14' }}>{r.title}</p>
                      <p className="text-xs truncate" style={{ color: '#555951' }}>{r.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                        style={{ backgroundColor: meta.color + '18', color: meta.color }}>
                        {meta.label}
                      </span>
                      {i === activeIdx && <ArrowRight className="w-3.5 h-3.5 text-gray-300" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer hint */}
            <div className="px-4 py-2 border-t flex items-center gap-4 text-[10px]"
              style={{ borderColor: '#E3EDE9', backgroundColor: '#F6FAF7', color: '#555951' }}>
              <span><kbd className="px-1 py-0.5 rounded bg-white border border-gray-200">↑</kbd><kbd className="ml-1 px-1 py-0.5 rounded bg-white border border-gray-200">↓</kbd> Navigate</span>
              <span><kbd className="px-1 py-0.5 rounded bg-white border border-gray-200">↵</kbd> Open</span>
              <span><kbd className="px-1 py-0.5 rounded bg-white border border-gray-200">Esc</kbd> Close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
