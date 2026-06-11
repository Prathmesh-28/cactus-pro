/**
 * Admin → VC Toolkit Manager
 * Full CRUD: edit name, category, tag, description, inputs, outputs, external URL.
 * Delete any tool. Add custom tools.
 * All changes sync instantly to store (KV) for all users.
 */
import { useState, useMemo } from 'react';
import { X, Check, Plus, Trash2, Pencil, Globe } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { defaultConfig } from '../../data/defaultConfig';
import { TOOLKIT_BASE_MAP } from '../../data/toolkitData';
import type { ToolkitTool } from '../../data/types';

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseLines(s: string): string[] {
  return s.split('\n').map(l => l.trim()).filter(Boolean);
}

// ── Edit Panel ────────────────────────────────────────────────────────────────

interface EditPanelProps {
  tool: ToolkitTool & { descFallback?: string; inputsFallback?: string[]; outputsFallback?: string[] };
  cats: string[];
  onSave: (t: ToolkitTool) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function EditPanel({ tool, cats, onSave, onDelete, onClose }: EditPanelProps) {
  const [name,        setName]        = useState(tool.name);
  const [category,    setCategory]    = useState(tool.category);
  const [tag,         setTag]         = useState<'Built' | 'To build'>(tool.tag);
  const [desc,        setDesc]        = useState(tool.description ?? tool.descFallback ?? '');
  const [inputs,      setInputs]      = useState((tool.inputs ?? tool.inputsFallback ?? []).join('\n'));
  const [outputs,     setOutputs]     = useState((tool.outputs ?? tool.outputsFallback ?? []).join('\n'));
  const [externalUrl, setExternalUrl] = useState(tool.externalUrl ?? '');
  const [confirmDel,  setConfirmDel]  = useState(false);

  const handleSave = () => {
    onSave({
      ...tool,
      name:        name.trim() || tool.name,
      category:    category.trim() || tool.category,
      catId:       slugify(category.trim() || tool.category),
      tag,
      description: desc.trim() || undefined,
      inputs:      parseLines(inputs).length ? parseLines(inputs) : undefined,
      outputs:     parseLines(outputs).length ? parseLines(outputs) : undefined,
      externalUrl: externalUrl.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden border-l border-gray-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Edit Tool</p>
            <h3 className="font-heading font-bold text-gray-900 text-base leading-tight truncate max-w-[280px]">{tool.name}</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Tool Name</label>
            <input value={name} onChange={e => setName(e.target.value)}
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Category</label>
              <input value={category} onChange={e => setCategory(e.target.value)}
                list="edit-cat-options"
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
              <datalist id="edit-cat-options">{cats.map(c => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Status</label>
              <select value={tag} onChange={e => setTag(e.target.value as 'Built' | 'To build')}
                className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none bg-white">
                <option value="Built">Built</option>
                <option value="To build">To build</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Description</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3}
              placeholder="What does this tool do?"
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/30 resize-none" />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Inputs <span className="text-gray-400 normal-case font-normal">(one per line)</span></label>
            <textarea value={inputs} onChange={e => setInputs(e.target.value)} rows={5}
              placeholder={"Input 1\nInput 2\nInput 3"}
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/30 resize-none font-mono text-xs" />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Outputs <span className="text-gray-400 normal-case font-normal">(one per line)</span></label>
            <textarea value={outputs} onChange={e => setOutputs(e.target.value)} rows={5}
              placeholder={"Output 1\nOutput 2\nOutput 3"}
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/30 resize-none font-mono text-xs" />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">External URL</label>
            <input value={externalUrl} onChange={e => setExternalUrl(e.target.value)}
              placeholder="https://docs.google.com/… or sharepoint.com/…"
              className="mt-1 w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400/30" />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-2">
          <button onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-gray-700 transition-colors">
            <Check className="w-3.5 h-3.5" /> Save Changes
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          <div className="flex-1" />
          {!confirmDel ? (
            <button onClick={() => setConfirmDel(true)}
              className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg text-red-500 hover:bg-red-50 transition-colors">
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-600">Sure?</span>
              <button onClick={() => { onDelete(tool.id); onClose(); }}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700">Yes</button>
              <button onClick={() => setConfirmDel(false)} className="text-xs text-gray-400 hover:text-gray-600">No</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ToolkitManager() {
  const { store, upsertToolkitTool, deleteToolkitTool, updateToolkitLinks } = useApp();

  const tools: ToolkitTool[] = useMemo(() =>
    (store.toolkitTools?.length ? store.toolkitTools : defaultConfig.toolkitTools)
      .slice().sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)),
  [store.toolkitTools]);

  const cats = useMemo(() => [...new Set(tools.map(t => t.category))], [tools]);

  const [filterCat, setFilterCat]   = useState('All');
  const [search, setSearch]         = useState('');
  const [editingTool, setEditingTool] = useState<ToolkitTool | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saved, setSaved]           = useState(false);

  // New custom tool form
  const blankTool = (): Partial<ToolkitTool> => ({ name: '', category: '', catId: '', tag: 'To build', sortOrder: tools.length + 1 });
  const [newTool, setNewTool] = useState<Partial<ToolkitTool>>(blankTool());

  const handleSaveTool = (t: ToolkitTool) => {
    upsertToolkitTool(t);
    // also sync externalUrl → toolkitLinks for VCToolkitPage legacy merge
    if (t.externalUrl !== undefined) {
      const links = { ...(store.toolkitLinks ?? {}), [t.id]: t.externalUrl ?? '' };
      updateToolkitLinks(links);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setEditingTool(null);
  };

  const addCustomTool = () => {
    if (!newTool.name?.trim() || !newTool.category?.trim()) return;
    const id = `custom-${Date.now()}`;
    upsertToolkitTool({
      id, name: newTool.name.trim(), category: newTool.category.trim(),
      catId: slugify(newTool.category.trim()), tag: newTool.tag ?? 'To build',
      sortOrder: tools.length + 1, isCustom: true, createdAt: new Date().toISOString(),
    });
    setNewTool(blankTool());
    setShowAddForm(false);
  };

  const filtered = tools.filter(t =>
    (filterCat === 'All' || t.category === filterCat) &&
    (!search || t.name.toLowerCase().includes(search.toLowerCase())),
  );

  const builtCount  = tools.filter(t => t.tag === 'Built').length;
  const linkedCount = tools.filter(t => t.externalUrl?.trim()).length;

  return (
    <>
      <div className="space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Tools',    value: tools.length, color: 'bg-gray-100 text-gray-700'      },
            { label: 'Built / Active', value: builtCount,   color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Links Added',    value: linkedCount,  color: 'bg-blue-50 text-blue-700'        },
          ].map(s => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
              <p className="text-2xl font-bold">{s.value}</p>
              <p className="text-xs font-medium mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {saved && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-2.5 text-xs text-emerald-700 flex items-center gap-2">
            <Check className="w-3.5 h-3.5" /> Changes saved and synced for all users.
          </div>
        )}

        <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 text-xs text-blue-700">
          <strong>How it works:</strong> Click any row to edit name, description, inputs, outputs, status, and external URL.
          All changes sync instantly. Custom tools can be deleted; built-in tools can be fully customised.
        </div>

        {/* Filters */}
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
                list="cat-options" placeholder="Category *"
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
                <th className="px-4 py-3 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(tool => {
                const base = TOOLKIT_BASE_MAP.get(tool.id);
                const url = tool.externalUrl ?? (store.toolkitLinks ?? {})[tool.id] ?? '';

                return (
                  <tr key={tool.id}
                    onClick={() => setEditingTool({ ...tool, description: tool.description ?? base?.description, inputs: tool.inputs ?? base?.inputs, outputs: tool.outputs ?? base?.outputs } as ToolkitTool)}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${tool.isCustom ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-4 py-3 font-medium text-gray-800 text-sm">
                      {tool.name}
                      {tool.isCustom && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-semibold">Custom</span>}
                      {(tool.description ?? base?.description) && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 font-normal">
                          {(tool.description ?? base?.description)?.slice(0, 70)}…
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{tool.category}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        tool.tag === 'Built' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {tool.tag}
                      </span>
                    </td>
                    <td className="px-4 py-3 max-w-[160px]">
                      {url ? (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 truncate">
                          <Globe className="w-3 h-3 shrink-0" /><span className="truncate">{url}</span>
                        </a>
                      ) : (
                        <span className="text-xs text-gray-300 italic">No link</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => setEditingTool({ ...tool, description: tool.description ?? base?.description, inputs: tool.inputs ?? base?.inputs, outputs: tool.outputs ?? base?.outputs } as ToolkitTool)}
                          className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteToolkitTool(tool.id)}
                          className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Click any row to edit all fields · Pencil = edit · Trash = delete
        </p>
      </div>

      {/* Edit panel */}
      {editingTool && (
        <EditPanel
          tool={editingTool}
          cats={cats}
          onSave={handleSaveTool}
          onDelete={deleteToolkitTool}
          onClose={() => setEditingTool(null)}
        />
      )}
    </>
  );
}
