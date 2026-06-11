import { useState, useMemo } from 'react';
import { Wrench, Building2, Rocket, BarChart2, TrendingUp, Calculator, Globe, Activity, DoorOpen, ExternalLink, X, Play } from 'lucide-react';
import { cn } from '../../lib/utils';
import { getToolComponent } from './tools/_registry';
import { useApp } from '../../context/AppContext';
import { TOOLKIT_BASE } from '../../data/toolkitData';

// ─── Data ─────────────────────────────────────────────────────────────────────
// Tool definitions live in src/data/toolkitData.ts (shared with ToolkitManager).

type CatId = 'all' | 'ibank' | 'fundraising' | 'valuation' | 'uniteco' | 'market' | 'operations' | 'exit';

interface FwCategory { id: CatId; label: string; color: string; }
interface Framework {
  id: string; cat: CatId; name: string; desc: string; tag: 'Built' | 'To build';
  inputs: string[]; outputs: string[];
  url?: string;
}

const CATS: FwCategory[] = [
  { id: 'all', label: 'All frameworks', color: '#6B7280' },
  { id: 'ibank', label: 'Transaction advisors', color: '#185FA5' },
  { id: 'fundraising', label: 'Fundraising', color: '#0F6E56' },
  { id: 'valuation', label: 'Valuation', color: '#534AB7' },
  { id: 'uniteco', label: 'Unit economics', color: '#854F0B' },
  { id: 'market', label: 'Market & competitive', color: '#993C1D' },
  { id: 'operations', label: 'Operational health', color: '#3B6D11' },
  { id: 'exit', label: 'Exit & secondary', color: '#993556' },
];

const CAT_MAP: Record<CatId, { bg: string; text: string }> = {
  all:        { bg: '#F3F4F6', text: '#6B7280' },
  ibank:      { bg: '#E6F1FB', text: '#185FA5' },
  fundraising:{ bg: '#E1F5EE', text: '#0F6E56' },
  valuation:  { bg: '#EEEDFE', text: '#534AB7' },
  uniteco:    { bg: '#FAEEDA', text: '#854F0B' },
  market:     { bg: '#FAECE7', text: '#993C1D' },
  operations: { bg: '#EAF3DE', text: '#3B6D11' },
  exit:       { bg: '#FBEAF0', text: '#993556' },
};

// FW_BASE = static defaults from toolkitData.ts mapped to Framework shape.
// At render time this is merged with store overrides → FRAMEWORKS_WITH_LINKS.
const FW_BASE: Framework[] = TOOLKIT_BASE.map(t => ({
  id: t.id, cat: t.catId as CatId, name: t.name, tag: t.tag,
  desc: t.description, inputs: t.inputs, outputs: t.outputs,
}));

// Keep a dummy FW reference for TOOLKIT_SECTIONS (static counts based on base data)
const FW = FW_BASE;

// (removed — tool data now lives in src/data/toolkitData.ts)

// ─── Toolkit sections (the 4 heading cards) ──────────────────────────────────

interface ToolkitSection {
  id: string;
  label: string;
  subLabel: string;
  description: string;
  catFilter: CatId[];
  count: number;
  builtCount: number;
  color: string;
  icon: React.ReactNode;
}

const TOOLKIT_SECTIONS: ToolkitSection[] = [
  {
    id: 'suite',
    label: 'VC Framework Suite',
    subLabel: 'Full library',
    description: 'All 35 analytical frameworks for every stage of the investment lifecycle.',
    catFilter: ['all'],
    count: FW.length,
    builtCount: FW.filter(f => f.tag === 'Built').length,
    color: '#2D6A4F',
    icon: <Wrench className="w-5 h-5" />,
  },
  {
    id: 'deal',
    label: 'Transaction Advisors',
    subLabel: 'IBank & legal',
    description: 'IBank recommender, VI data uploader, and legal advisor tracker for deal execution.',
    catFilter: ['ibank'],
    count: FW.filter(f => f.cat === 'ibank').length,
    builtCount: FW.filter(f => f.cat === 'ibank' && f.tag === 'Built').length,
    color: '#185FA5',
    icon: <Building2 className="w-5 h-5" />,
  },
  {
    id: 'fundraising',
    label: 'Fundraising Suite',
    subLabel: 'Raise & terms',
    description: 'Readiness scorecards, pitch evaluation, investor CRM, term sheet comparison, and round sizing.',
    catFilter: ['fundraising'],
    count: FW.filter(f => f.cat === 'fundraising').length,
    builtCount: FW.filter(f => f.cat === 'fundraising' && f.tag === 'Built').length,
    color: '#0F6E56',
    icon: <Rocket className="w-5 h-5" />,
  },
  {
    id: 'analytics',
    label: 'Portfolio Analytics',
    subLabel: 'Valuation & unit eco',
    description: 'Valuation models, cap table simulation, MOIC/IRR tracking, and all unit economics frameworks.',
    catFilter: ['valuation', 'uniteco'],
    count: FW.filter(f => f.cat === 'valuation' || f.cat === 'uniteco').length,
    builtCount: FW.filter(f => (f.cat === 'valuation' || f.cat === 'uniteco') && f.tag === 'Built').length,
    color: '#534AB7',
    icon: <BarChart2 className="w-5 h-5" />,
  },
];

// ─── Cat icons ────────────────────────────────────────────────────────────────

function CatIcon({ id }: { id: CatId }) {
  const cls = 'w-4 h-4';
  switch (id) {
    case 'ibank':      return <Building2 className={cls} />;
    case 'fundraising':return <Rocket className={cls} />;
    case 'valuation':  return <TrendingUp className={cls} />;
    case 'uniteco':    return <Calculator className={cls} />;
    case 'market':     return <Globe className={cls} />;
    case 'operations': return <Activity className={cls} />;
    case 'exit':       return <DoorOpen className={cls} />;
    default:           return <Wrench className={cls} />;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VCToolkitPage() {
  const { store } = useApp();
  const adminLinks: Record<string, string> = store.toolkitLinks ?? {};
  const storedTools = store.toolkitTools ?? [];

  const [activeSection, setActiveSection] = useState<string>('suite');
  const [activeCat, setActiveCat] = useState<CatId>('all');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [launchedId, setLaunchedId] = useState<string | null>(null);

  // Merge store overrides (name/tag/desc/inputs/outputs/url) over FW_BASE, then append custom tools
  const FRAMEWORKS_WITH_LINKS = useMemo(() => [
    ...FW_BASE.map(fw => {
      const s = storedTools.find(t => t.id === fw.id);
      return {
        ...fw,
        name:    s?.name        ?? fw.name,
        tag:     s?.tag         ?? fw.tag,
        desc:    s?.description ?? fw.desc,
        inputs:  s?.inputs      ?? fw.inputs,
        outputs: s?.outputs     ?? fw.outputs,
        url:     adminLinks[fw.id] || s?.externalUrl || fw.url || '',
      };
    }),
    ...storedTools.filter(t => t.isCustom).map(t => ({
      id: t.id, cat: (t.catId || 'ibank') as CatId, name: t.name, tag: t.tag,
      desc: t.description ?? '',
      inputs: t.inputs ?? [], outputs: t.outputs ?? [],
      url: adminLinks[t.id] || t.externalUrl || '',
    })),
  ], [storedTools, adminLinks]);

  const section = TOOLKIT_SECTIONS.find(s => s.id === activeSection)!;

  const visibleFrameworks = FRAMEWORKS_WITH_LINKS.filter(f => {
    if (activeCat !== 'all') return f.cat === activeCat;
    if (section.catFilter[0] === 'all') return true;
    return section.catFilter.includes(f.cat);
  });

  const selectedFw = FRAMEWORKS_WITH_LINKS.find(f => f.id === activeId) ?? null;

  function handleSectionClick(sId: string) {
    setActiveSection(sId);
    setActiveId(null);
    const sec = TOOLKIT_SECTIONS.find(s => s.id === sId)!;
    setActiveCat(sec.catFilter[0] === 'all' ? 'all' : sec.catFilter[0]);
  }

  function handleCatClick(cId: CatId) {
    setActiveCat(cId);
    setActiveId(null);
  }

  return (
    <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">

      {/* ── 4 Toolkit section cards ─────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="mb-4">
          <h1 className="text-xl font-heading font-semibold text-gray-900">VC Toolkit</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analytical frameworks, tools, and scorecards for every stage of the investment lifecycle</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {TOOLKIT_SECTIONS.map(sec => {
            const isActive = activeSection === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => handleSectionClick(sec.id)}
                className={cn(
                  'text-left rounded-xl border p-4 transition-all cursor-pointer group',
                  isActive
                    ? 'shadow-md'
                    : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                )}
                style={isActive ? { backgroundColor: sec.color + '0D', borderColor: sec.color, borderWidth: 2 } : {}}
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: sec.color + '18', color: sec.color }}
                  >
                    {sec.icon}
                  </div>
                  {isActive && (
                    <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: sec.color + '18', color: sec.color }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <div className="font-heading font-semibold text-sm text-gray-900 mb-0.5 leading-snug">
                  {sec.label}
                </div>
                <div className="text-xs text-gray-500 mb-2">{sec.subLabel}</div>
                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-3">{sec.description}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium" style={{ color: sec.color }}>
                    {sec.count} frameworks
                  </span>
                  {sec.builtCount > 0 && (
                    <span className="text-xs bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-full font-medium">
                      {sec.builtCount} live
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Category tabs ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {CATS.filter(c => {
          if (section.catFilter[0] === 'all') return true;
          return c.id === 'all' || section.catFilter.includes(c.id as CatId);
        }).map(c => {
          const isOn = activeCat === c.id;
          return (
            <button
              key={c.id}
              onClick={() => handleCatClick(c.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                isOn ? 'text-white border-transparent' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              )}
              style={isOn ? { backgroundColor: c.color, borderColor: c.color } : {}}
            >
              <CatIcon id={c.id} />
              {c.label}
            </button>
          );
        })}
      </div>

      {/* ── Framework grid ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mb-4">
        {visibleFrameworks.map(fw => {
          const cm = CAT_MAP[fw.cat];
          
          return (
            <button
              key={fw.id}
              onClick={() => setActiveId(fw.id)}
              className="text-left bg-white rounded-xl border border-gray-200 p-3.5 cursor-pointer transition-all hover:shadow-md hover:border-gray-300 hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: cm.bg, color: cm.text }}
                >
                  <CatIcon id={fw.cat} />
                </div>
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full"
                  style={fw.tag === 'Built'
                    ? { backgroundColor: '#E1F5EE', color: '#0F6E56' }
                    : { backgroundColor: '#F3F4F6', color: '#6B7280' }}
                >
                  {fw.tag}
                </span>
              </div>
              <div className="text-xs font-semibold text-gray-900 mb-1 leading-snug">{fw.name}</div>
              <div className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                {fw.desc.length > 80 ? fw.desc.substring(0, 80) + '…' : fw.desc}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Info popup modal — shown when any tool card is clicked ─────────── */}
      {selectedFw && (() => {
        const cm = CAT_MAP[selectedFw.cat];
        const catLabel = CATS.find(c => c.id === selectedFw.cat)?.label ?? '';
        const hasComponent = selectedFw.tag === 'Built' && !!getToolComponent(selectedFw.id);
        return (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
              onClick={() => setActiveId(null)}
            />
            {/* Popup modal */}
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8 pointer-events-none">
              <div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col pointer-events-auto overflow-hidden"
                style={{ borderTop: `4px solid ${cm.text}` }}
              >
                {/* Header */}
                <div className="flex items-start gap-3 px-6 py-5 border-b border-gray-100">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: cm.bg, color: cm.text }}>
                    <CatIcon id={selectedFw.cat} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-bold text-gray-900 text-base leading-tight">{selectedFw.name}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: cm.bg, color: cm.text }}>{catLabel}</span>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={selectedFw.tag === 'Built'
                          ? { backgroundColor: '#E1F5EE', color: '#0F6E56' }
                          : { backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                        {selectedFw.tag}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => setActiveId(null)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedFw.desc}</p>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider mb-2.5" style={{ color: cm.text }}>
                        Inputs
                      </h4>
                      <div className="space-y-1.5">
                        {selectedFw.inputs.map((inp, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: cm.text }} />
                            <span className="text-xs text-gray-600">{inp}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-emerald-700">
                        Outputs
                      </h4>
                      <div className="space-y-1.5">
                        {selectedFw.outputs.map((out, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-emerald-500" />
                            <span className="text-xs text-gray-600">{out}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Launch tool inside portal */}
                    {hasComponent && (
                      <button
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: '#1C4B42' }}
                        onClick={() => { setLaunchedId(selectedFw.id); setActiveId(null); }}
                      >
                        <Play className="w-4 h-4" />
                        Launch Tool
                      </button>
                    )}
                    {/* External link */}
                    {selectedFw.url ? (
                      <a
                        href={selectedFw.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-colors hover:bg-white"
                        style={{ borderColor: cm.text, color: cm.text }}
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open External Tool
                      </a>
                    ) : selectedFw.tag === 'Built' && !hasComponent ? (
                      <span className="text-xs text-gray-400 italic">External link not configured for this tool.</span>
                    ) : selectedFw.tag === 'To build' ? (
                      <span className="text-xs text-gray-400 italic flex items-center gap-1">
                        <DoorOpen className="w-3.5 h-3.5" /> Coming soon — not yet built.
                      </span>
                    ) : null}
                    <button
                      onClick={() => setActiveId(null)}
                      className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Full tool modal — renders the live tool component ────────────────── */}
      {launchedId && (() => {
        const ToolComponent = getToolComponent(launchedId);
        const fw = FRAMEWORKS_WITH_LINKS.find(f => f.id === launchedId);
        const cm = fw ? CAT_MAP[fw.cat] : CAT_MAP.all;
        if (!ToolComponent || !fw) return null;
        return (
          <>
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" onClick={() => setLaunchedId(null)} />
            <div className="fixed inset-4 md:inset-8 z-50 bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 shrink-0"
                style={{ backgroundColor: cm.bg }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: cm.text + '20', color: cm.text }}>
                  <CatIcon id={fw.cat} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-heading font-bold text-gray-900 text-base">{fw.name}</h2>
                  <p className="text-xs text-gray-500 truncate">{fw.desc.slice(0, 80)}…</p>
                </div>
                {fw.url && (
                  <a href={fw.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors hover:bg-white/60 mr-2"
                    style={{ borderColor: cm.text, color: cm.text }}>
                    <ExternalLink className="w-3.5 h-3.5" /> Open External
                  </a>
                )}
                <button onClick={() => setLaunchedId(null)}
                  className="p-2 rounded-xl hover:bg-white/60 text-gray-500 shrink-0 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6">
                <ToolComponent />
              </div>
            </div>
          </>
        );
      })()}
    </div>
  );
}
