/**
 * Admin → VC Toolkit Manager
 * Super admin can set/edit external URLs for any VC toolkit framework
 * and toggle each tool between "Built" / "To build" status.
 * Changes saved to PostgreSQL KV and reflected for all users instantly.
 */
import { useState } from 'react';
import { ExternalLink, Save, X, Check, Globe } from 'lucide-react';
import { useApp } from '../../context/AppContext';

// ── Mirror the framework list from VCToolkitPage (source of truth stays there) ─

interface ToolEntry {
  id: string;
  cat: string;
  name: string;
  tag: 'Built' | 'To build';
}

const TOOLS: ToolEntry[] = [
  { id: 'ibank-rec',       cat: 'Transaction advisors',   name: 'IBank advisor recommender',          tag: 'Built'    },
  { id: 'ibank-upload',    cat: 'Transaction advisors',   name: 'VI data uploader',                   tag: 'Built'    },
  { id: 'legal-advisor',   cat: 'Transaction advisors',   name: 'Legal advisor tracker',              tag: 'To build' },
  { id: 'investor-ready',  cat: 'Fundraising',            name: 'Investor readiness scorecard',       tag: 'To build' },
  { id: 'pitch-eval',      cat: 'Fundraising',            name: 'Pitch deck evaluator',               tag: 'To build' },
  { id: 'investor-crm',    cat: 'Fundraising',            name: 'Investor pipeline CRM',              tag: 'To build' },
  { id: 'ts-compare',      cat: 'Fundraising',            name: 'Term sheet comparator',              tag: 'To build' },
  { id: 'round-size',      cat: 'Fundraising',            name: 'Round sizing calculator',            tag: 'To build' },
  { id: 'venture-val',     cat: 'Valuation',              name: 'Venture method valuation',           tag: 'To build' },
  { id: 'comps-val',       cat: 'Valuation',              name: 'Comparable company analysis',        tag: 'To build' },
  { id: 'moic-tracker',    cat: 'Valuation',              name: 'MOIC & IRR tracker',                 tag: 'To build' },
  { id: 'cap-table',       cat: 'Valuation',              name: 'Cap table & dilution model',         tag: 'To build' },
  { id: 'ltv-cac',         cat: 'Unit Economics',         name: 'LTV / CAC analyser',                 tag: 'To build' },
  { id: 'burn-multiple',   cat: 'Unit Economics',         name: 'Burn multiple calculator',           tag: 'To build' },
  { id: 'rule40',          cat: 'Unit Economics',         name: 'Rule of 40',                         tag: 'To build' },
  { id: 'cohort',          cat: 'Unit Economics',         name: 'Cohort retention analyser',          tag: 'To build' },
  { id: 'nrr',             cat: 'Unit Economics',         name: 'NRR / GRR dashboard',                tag: 'To build' },
  { id: 'magic-number',    cat: 'Unit Economics',         name: 'Magic number',                       tag: 'To build' },
  { id: 'tam-sizing',      cat: 'Market & Competitive',   name: 'TAM / SAM / SOM model',              tag: 'To build' },
  { id: 'competitive',     cat: 'Market & Competitive',   name: 'Competitive positioning matrix',     tag: 'To build' },
  { id: 'market-map',      cat: 'Market & Competitive',   name: 'Sector market map',                  tag: 'To build' },
  { id: 'exit-timing',     cat: 'Exit & Secondary',       name: 'Exit timing framework',              tag: 'To build' },
  { id: 'secondary-val',   cat: 'Exit & Secondary',       name: 'Secondary valuation model',          tag: 'To build' },
  { id: 'buyer-matrix',    cat: 'Exit & Secondary',       name: 'Strategic buyer matrix',             tag: 'To build' },
  { id: 'ops-health',      cat: 'Operational Health',     name: 'Portfolio ops health score',         tag: 'To build' },
  { id: 'ceo-score',       cat: 'Operational Health',     name: 'CEO performance dashboard',          tag: 'To build' },
  { id: 'board-prep',      cat: 'Operational Health',     name: 'Board meeting prep kit',             tag: 'To build' },
  { id: 'hiring-plan',     cat: 'Operational Health',     name: 'Hiring plan optimizer',              tag: 'To build' },
];

const CATS = [...new Set(TOOLS.map(t => t.cat))];

export default function ToolkitManager() {
  const { store, updateToolkitLinks } = useApp();
  const links: Record<string, string> = store.toolkitLinks ?? {};

  const [drafts, setDrafts] = useState<Record<string, string>>(links);
  const [tags, setTags] = useState<Record<string, 'Built' | 'To build'>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [filterCat, setFilterCat] = useState<string>('All');
  const [search, setSearch] = useState('');

  const handleSave = () => {
    updateToolkitLinks(drafts);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditingId(null);
  };

  const clearUrl = (id: string) => {
    const next = { ...drafts };
    delete next[id];
    setDrafts(next);
  };

  const filteredTools = TOOLS.filter(t =>
    (filterCat === 'All' || t.cat === filterCat) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase()))
  );

  const builtCount = TOOLS.filter(t => tags[t.id] === 'Built' || (!tags[t.id] && t.tag === 'Built')).length;
  const linkedCount = Object.keys(drafts).filter(k => drafts[k]?.trim()).length;

  return (
    <div className="space-y-5">
      {/* Header stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Tools', value: TOOLS.length, color: 'bg-gray-100 text-gray-700' },
          { label: 'Built / Active', value: builtCount, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Links Added', value: linkedCount, color: 'bg-blue-50 text-blue-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Info banner */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
        <strong>How it works:</strong> Paste an external URL (Google Sheets, Notion, Airtable, custom app, etc.) next to any tool.
        Users will see an <strong>"Open External ↗"</strong> button on that tool in VC Toolkit. Changes save instantly for all users.
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search tools…"
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none w-44" />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white">
          <option value="All">All Categories</option>
          {CATS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg text-white bg-gray-800 hover:bg-gray-700 transition-colors">
          {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><Save className="w-3.5 h-3.5" /> Save All Changes</>}
        </button>
      </div>

      {/* Tools table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Tool Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">External Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredTools.map(tool => {
              const currentTag = tags[tool.id] ?? tool.tag;
              const url = drafts[tool.id] ?? '';
              const isEditing = editingId === tool.id;

              return (
                <tr key={tool.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800 text-sm">{tool.name}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{tool.cat}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setTags(t => ({ ...t, [tool.id]: currentTag === 'Built' ? 'To build' : 'Built' }))}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                        currentTag === 'Built'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {currentTag}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input autoFocus
                          value={url}
                          onChange={e => setDrafts(d => ({ ...d, [tool.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') setEditingId(null); if (e.key === 'Escape') setEditingId(null); }}
                          placeholder="https://…"
                          className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 min-w-0" />
                        <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-gray-100 text-gray-400">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                        {url && (
                          <button onClick={() => clearUrl(tool.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {url ? (
                          <>
                            <a href={url} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 max-w-[200px] truncate">
                              <Globe className="w-3 h-3 shrink-0" />
                              <span className="truncate">{url}</span>
                            </a>
                            <button onClick={() => setEditingId(tool.id)}
                              className="text-[10px] text-gray-400 hover:text-gray-600 underline shrink-0">Edit</button>
                          </>
                        ) : (
                          <button onClick={() => setEditingId(tool.id)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 transition-colors">
                            <ExternalLink className="w-3 h-3" />
                            <span>Add link</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Click any row in the Status column to toggle Built ↔ To build · Click "Add link" to attach an external URL
      </p>
    </div>
  );
}
