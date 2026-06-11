/**
 * Admin → VC Toolkit Manager
 * Reads tools from store.toolkitTools (seeded from defaultConfig).
 * Super admin can toggle Built/To build, set external URLs, add custom tools, delete custom tools.
 */
import { useState } from 'react';
import { ExternalLink, Save, X, Check, Globe, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { defaultConfig } from '../../data/defaultConfig';
import type { ToolkitTool } from '../../data/types';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export default function ToolkitManager() {
  const { store, upsertToolkitTool, deleteToolkitTool, updateToolkitLinks } = useApp();
  const tools: ToolkitTool[] = (store.toolkitTools?.length ? store.toolkitTools : defaultConfig.toolkitTools)
    .slice()
    .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));

  const cats = [...new Set(tools.map(t => t.category))];

  // URL drafts (for the legacy toolkitLinks field — also update in parallel)
  const links: Record<string, string> = store.toolkitLinks ?? {};
  const [drafts, setDrafts] = useState<Record<string, string>>(links);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [filterCat, setFilterCat]   = useState('All');
  const [search, setSearch]         = useState('');
  const [saved, setSaved]           = useState(false);

  // New custom tool form
  const [showAddForm, setShowAddForm] = useState(false);
  const blankTool = (): Partial<ToolkitTool> => ({ name: '', category: '', catId: '', tag: 'To build', sortOrder: tools.length + 1 });
  const [newTool, setNewTool] = useState<Partial<ToolkitTool>>(blankTool());

  const handleSave = () => {
    // persist URL changes via both mechanisms
    updateToolkitLinks(drafts);
    // update externalUrl on each tool
    Object.entries(drafts).forEach(([id, url]) => {
      const t = tools.find(x => x.id === id);
      if (t) upsertToolkitTool({ ...t, externalUrl: url || undefined });
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditingId(null);
  };

  const toggleTag = (tool: ToolkitTool) => {
    upsertToolkitTool({ ...tool, tag: tool.tag === 'Built' ? 'To build' : 'Built' });
  };

  const clearUrl = (id: string) => {
    const next = { ...drafts }; delete next[id]; setDrafts(next);
  };

  const addCustomTool = () => {
    if (!newTool.name?.trim() || !newTool.category?.trim()) return;
    const id = `custom-${Date.now()}`;
    upsertToolkitTool({
      id,
      name: newTool.name.trim(),
      category: newTool.category.trim(),
      catId: slugify(newTool.category.trim()),
      tag: newTool.tag ?? 'To build',
      sortOrder: tools.length + 1,
      isCustom: true,
      createdAt: new Date().toISOString(),
    });
    setNewTool(blankTool());
    setShowAddForm(false);
  };

  const filtered = tools.filter(t =>
    (filterCat === 'All' || t.category === filterCat) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase())),
  );

  const builtCount  = tools.filter(t => t.tag === 'Built').length;
  const linkedCount = Object.values(drafts).filter(v => v?.trim()).length;

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Tools',   value: tools.length, color: 'bg-gray-100 text-gray-700'       },
          { label: 'Built / Active', value: builtCount,   color: 'bg-emerald-50 text-emerald-700'  },
          { label: 'Links Added',   value: linkedCount,  color: 'bg-blue-50 text-blue-700'         },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs font-medium mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
        <strong>How it works:</strong> Toggle Built/To build, paste an external URL next to any tool, or add custom tools.
        All changes sync instantly for all users.
      </div>

      {/* Filters + actions */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search tools…"
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none w-44" />
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white">
          <option value="All">All Categories</option>
          {cats.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={() => { setShowAddForm(f => !f); setNewTool(blankTool()); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Tool
        </button>
        <button onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg text-white bg-gray-800 hover:bg-gray-700 transition-colors">
          {saved ? <><Check className="w-3.5 h-3.5" /> Saved!</> : <><Save className="w-3.5 h-3.5" /> Save All Changes</>}
        </button>
      </div>

      {/* Add custom tool form */}
      {showAddForm && (
        <div className="rounded-xl border border-dashed border-blue-300 bg-blue-50 p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-700">New Custom Tool</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={newTool.name ?? ''} onChange={e => setNewTool(t => ({ ...t, name: e.target.value }))}
              placeholder="Tool name *"
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white col-span-2" />
            <input value={newTool.category ?? ''} onChange={e => setNewTool(t => ({ ...t, category: e.target.value }))}
              list="cat-options"
              placeholder="Category *"
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white" />
            <datalist id="cat-options">{cats.map(c => <option key={c} value={c} />)}</datalist>
            <select value={newTool.tag ?? 'To build'} onChange={e => setNewTool(t => ({ ...t, tag: e.target.value as ToolkitTool['tag'] }))}
              className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none bg-white">
              <option value="Built">Built</option>
              <option value="To build">To build</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={addCustomTool} disabled={!newTool.name?.trim() || !newTool.category?.trim()}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700">
              <Check className="w-3 h-3" /> Add
            </button>
            <button onClick={() => setShowAddForm(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        </div>
      )}

      {/* Tools table */}
      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Tool Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Category</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">External Link</th>
              <th className="px-4 py-3 w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(tool => {
              const url       = drafts[tool.id] ?? tool.externalUrl ?? '';
              const isEditing = editingId === tool.id;

              return (
                <tr key={tool.id} className={`hover:bg-gray-50 transition-colors ${tool.isCustom ? 'bg-blue-50/30' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gray-800 text-sm">
                    {tool.name}
                    {tool.isCustom && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-semibold">Custom</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{tool.category}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => toggleTag(tool)}
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                        tool.tag === 'Built'
                          ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {tool.tag}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input autoFocus value={url}
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
                              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 max-w-[180px] truncate">
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
                  <td className="px-4 py-3 text-right">
                    {tool.isCustom && (
                      <button onClick={() => deleteToolkitTool(tool.id)}
                        className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">
        Click status badge to toggle Built ↔ To build · Click "Add link" for external URL · Custom tools can be deleted
      </p>
    </div>
  );
}
