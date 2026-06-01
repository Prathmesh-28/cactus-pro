import { useState } from 'react';
import {
  ExternalLink, Plus, Trash2, CheckCircle2, Clock, AlertCircle,
  FileSpreadsheet, FileText, FolderOpen, Presentation, Link2, File,
  MessageSquare, ChevronDown, ChevronUp, Search, Tag, Filter,
  BookOpen, Wrench, Users, Mail, Star,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Resource, ResourceType, Gap, GapStatus, GapPriority, GapCategory, TeamNote } from '../data/types';
import { cn } from '../lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d: string) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

const RESOURCE_ICONS: Record<ResourceType, React.ElementType> = {
  spreadsheet: FileSpreadsheet,
  document: FileText,
  folder: FolderOpen,
  presentation: Presentation,
  link: Link2,
  other: File,
};

const RESOURCE_COLORS: Record<ResourceType, string> = {
  spreadsheet: '#1D6F42',
  document: '#185FA5',
  folder: '#854F0B',
  presentation: '#993556',
  link: '#534AB7',
  other: '#6B7280',
};

const STATUS_CONFIG: Record<GapStatus, { label: string; color: string; bg: string; Icon: React.ElementType }> = {
  open:        { label: 'Open',        color: '#EF4444', bg: '#FEF2F2', Icon: AlertCircle },
  in_progress: { label: 'In Progress', color: '#F59E0B', bg: '#FFFBEB', Icon: Clock },
  resolved:    { label: 'Resolved',    color: '#10B981', bg: '#ECFDF5', Icon: CheckCircle2 },
};

const PRIORITY_CONFIG: Record<GapPriority, { label: string; color: string; bg: string }> = {
  high:   { label: 'High',   color: '#EF4444', bg: '#FEF2F2' },
  medium: { label: 'Medium', color: '#F59E0B', bg: '#FFFBEB' },
  low:    { label: 'Low',    color: '#6B7280', bg: '#F3F4F6' },
};

const CAT_LABELS: Record<GapCategory, string> = {
  data: 'Data', feature: 'Feature', process: 'Process', other: 'Other',
};

type WorkspaceTab = 'resources' | 'gaps' | 'team';

// ─── Resource form ────────────────────────────────────────────────────────────

function ResourceForm({ onSave, onCancel, primaryColor }: {
  onSave: (r: Resource) => void; onCancel: () => void; primaryColor: string;
}) {
  const [form, setForm] = useState<Omit<Resource, 'id'>>({
    name: '', url: '', type: 'document', description: '',
    addedBy: '', addedAt: today(), tags: [],
  });
  const [tagInput, setTagInput] = useState('');

  const set = (k: keyof typeof form, v: string | string[]) => setForm(f => ({ ...f, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) { set('tags', [...form.tags, t]); setTagInput(''); }
  };

  const valid = form.name.trim() && form.url.trim();

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add Resource</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Name *</label>
          <input
            value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. Portfolio Master Tracker"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">SharePoint / URL *</label>
          <input
            value={form.url} onChange={e => set('url', e.target.value)}
            placeholder="https://yourcompany.sharepoint.com/..."
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Type</label>
          <select
            value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
          >
            {(['spreadsheet','document','folder','presentation','link','other'] as ResourceType[]).map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Added by</label>
          <input
            value={form.addedBy} onChange={e => set('addedBy', e.target.value)}
            placeholder="Your name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Description</label>
          <textarea
            value={form.description} onChange={e => set('description', e.target.value)}
            rows={2} placeholder="What does this file / folder contain?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 resize-none"
          />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Tags</label>
          <div className="flex gap-2">
            <input
              value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Type tag and press Enter"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
            />
            <button onClick={addTag} className="px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-100">Add</button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                  {t}
                  <button onClick={() => set('tags', form.tags.filter(x => x !== t))} className="text-gray-400 hover:text-gray-700">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          disabled={!valid}
          onClick={() => onSave({ ...form, id: uid() })}
          className="px-4 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-40"
          style={{ backgroundColor: primaryColor }}
        >
          Save Resource
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-100">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Gap form ─────────────────────────────────────────────────────────────────

function GapForm({ onSave, onCancel, primaryColor, people }: {
  onSave: (g: Gap) => void; onCancel: () => void; primaryColor: string; people: string[];
}) {
  const [form, setForm] = useState<Omit<Gap, 'id'>>({
    title: '', description: '', companyName: '', category: 'data',
    status: 'open', priority: 'medium', assignedTo: '',
    createdAt: today(), resolvedAt: '', resolutionNote: '',
  });
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.title.trim();

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Log a Gap</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Title *</label>
          <input
            value={form.title} onChange={e => set('title', e.target.value)}
            placeholder="e.g. Missing revenue data for FY22"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Company</label>
          <input
            value={form.companyName} onChange={e => set('companyName', e.target.value)}
            placeholder="Company name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Category</label>
          <select
            value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
          >
            {(['data','feature','process','other'] as GapCategory[]).map(c => (
              <option key={c} value={c}>{CAT_LABELS[c]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Priority</label>
          <select
            value={form.priority} onChange={e => set('priority', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white"
          >
            {(['high','medium','low'] as GapPriority[]).map(p => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Assigned to</label>
          <input
            value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}
            list="people-list"
            placeholder="Team member name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
          />
          <datalist id="people-list">
            {people.map(p => <option key={p} value={p} />)}
          </datalist>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Description</label>
          <textarea
            value={form.description} onChange={e => set('description', e.target.value)}
            rows={2} placeholder="What exactly is missing or broken?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 resize-none"
          />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          disabled={!valid}
          onClick={() => onSave({ ...form, id: uid() })}
          className="px-4 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-40"
          style={{ backgroundColor: primaryColor }}
        >
          Log Gap
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-100">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Gap card ─────────────────────────────────────────────────────────────────

function GapCard({ gap, people, onUpdate, onDelete, primaryColor }: {
  gap: Gap; people: string[]; onUpdate: (g: Gap) => void; onDelete: (id: string) => void; primaryColor: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState(gap.resolutionNote);
  const sc = STATUS_CONFIG[gap.status];
  const pc = PRIORITY_CONFIG[gap.priority];
  const StatusIcon = sc.Icon;

  const resolve = () => {
    onUpdate({ ...gap, status: 'resolved', resolvedAt: today(), resolutionNote: note });
    setResolving(false);
  };

  const setStatus = (status: GapStatus) => {
    onUpdate({ ...gap, status, resolvedAt: status === 'resolved' ? today() : '', resolutionNote: status === 'resolved' ? note : gap.resolutionNote });
  };

  return (
    <div className={cn('border rounded-xl transition-all', gap.status === 'resolved' ? 'border-gray-100 bg-gray-50/50' : 'border-gray-200 bg-white')}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.color }}>
                <StatusIcon className="w-3 h-3" /> {sc.label}
              </span>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: pc.bg, color: pc.color }}>
                {pc.label}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{CAT_LABELS[gap.category]}</span>
              {gap.companyName && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{gap.companyName}</span>
              )}
            </div>
            <p className={cn('text-sm font-semibold', gap.status === 'resolved' ? 'text-gray-500 line-through' : 'text-gray-900')}>
              {gap.title}
            </p>
            {gap.assignedTo && (
              <p className="text-xs text-gray-400 mt-0.5">Assigned: {gap.assignedTo} · Added {fmtDate(gap.createdAt)}</p>
            )}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            <button onClick={() => onDelete(gap.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 space-y-3 border-t border-gray-100 pt-3">
            {gap.description && <p className="text-sm text-gray-600 leading-relaxed">{gap.description}</p>}

            {gap.status === 'resolved' && gap.resolutionNote && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                <p className="text-xs font-semibold text-emerald-700 mb-0.5">Resolution — {fmtDate(gap.resolvedAt)}</p>
                <p className="text-xs text-emerald-700 leading-relaxed">{gap.resolutionNote}</p>
              </div>
            )}

            {gap.status !== 'resolved' && (
              <div className="flex flex-wrap gap-2">
                {gap.status === 'open' && (
                  <button onClick={() => setStatus('in_progress')} className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">
                    Mark In Progress
                  </button>
                )}
                <button onClick={() => setResolving(r => !r)} className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">
                  {resolving ? 'Cancel' : 'Resolve Gap'}
                </button>
                <select
                  value={gap.assignedTo}
                  onChange={e => onUpdate({ ...gap, assignedTo: e.target.value })}
                  className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none"
                >
                  <option value="">Reassign…</option>
                  {people.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            {resolving && (
              <div className="space-y-2">
                <textarea
                  value={note} onChange={e => setNote(e.target.value)}
                  rows={2} placeholder="Describe how this was resolved…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none"
                />
                <button
                  onClick={resolve}
                  className="text-xs px-4 py-1.5 rounded-lg text-white"
                  style={{ backgroundColor: primaryColor }}
                >
                  Confirm Resolution
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { store, addResource, deleteResource, addGap, updateGap, deleteGap, addTeamNote, deleteTeamNote } = useApp();
  const { firm, people: firmPeople } = store;
  const primaryColor = firm.primaryColor;
  const accentColor = firm.accentColor;

  const resources = store.resources ?? [];
  const gaps = store.gaps ?? [];
  const teamNotes = store.teamNotes ?? [];
  const peopleNames = firmPeople.map(p => p.name);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('resources');
  const [showResForm, setShowResForm] = useState(false);
  const [showGapForm, setShowGapForm] = useState(false);
  const [resSearch, setResSearch] = useState('');
  const [gapFilter, setGapFilter] = useState<GapStatus | 'all'>('all');
  const [noteContent, setNoteContent] = useState('');
  const [noteAuthor, setNoteAuthor] = useState('');

  // ── Resources ──────────────────────────────────────────────────────────────
  const filteredRes = resources.filter(r =>
    !resSearch || r.name.toLowerCase().includes(resSearch.toLowerCase()) ||
    r.description.toLowerCase().includes(resSearch.toLowerCase()) ||
    r.tags.some(t => t.includes(resSearch.toLowerCase()))
  );

  // ── Gaps ───────────────────────────────────────────────────────────────────
  const filteredGaps = gaps.filter(g => gapFilter === 'all' || g.status === gapFilter);
  const openCount = gaps.filter(g => g.status !== 'resolved').length;
  const resolvedCount = gaps.filter(g => g.status === 'resolved').length;

  const postNote = () => {
    if (!noteContent.trim()) return;
    addTeamNote({
      id: uid(), content: noteContent.trim(),
      author: noteAuthor.trim() || 'Team', createdAt: today(),
      linkedGapId: '', tags: [],
    });
    setNoteContent('');
    setNoteAuthor('');
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-heading font-semibold text-gray-900">Team Workspace</h1>
        <p className="text-sm text-gray-500 mt-0.5">Shared resources, progress log, and open gaps — visible to all team members</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {([
          { key: 'resources' as WorkspaceTab, label: 'Resources', Icon: BookOpen, count: resources.length },
          { key: 'gaps' as WorkspaceTab, label: 'Progress & Gaps', Icon: Wrench, count: openCount },
          { key: 'team' as WorkspaceTab, label: 'Team', Icon: Users, count: firmPeople.length },
        ]).map(({ key, label, Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count > 0 && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold', activeTab === key ? 'text-white' : 'bg-gray-200 text-gray-500')}
                style={activeTab === key ? { backgroundColor: primaryColor } : {}}>
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Resources tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={resSearch} onChange={e => setResSearch(e.target.value)}
                placeholder="Search resources…"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
              />
            </div>
            <button
              onClick={() => setShowResForm(s => !s)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add Resource
            </button>
          </div>

          {showResForm && (
            <ResourceForm
              primaryColor={primaryColor}
              onSave={r => { addResource(r); setShowResForm(false); }}
              onCancel={() => setShowResForm(false)}
            />
          )}

          {/* Resource grid */}
          {filteredRes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredRes.map(r => {
                const Icon = RESOURCE_ICONS[r.type];
                const color = RESOURCE_COLORS[r.type];
                let domain = '';
                try { domain = new URL(r.url).hostname.replace('www.', ''); } catch { domain = r.url.slice(0, 30); }
                return (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: color + '15', color }}>
                        <Icon className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} />
                      </div>
                      <button
                        onClick={() => deleteResource(r.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 mb-1 leading-snug">{r.name}</p>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{r.description}</p>
                    {r.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {r.tags.map(t => (
                          <span key={t} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                            <Tag className="w-2.5 h-2.5" />{t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400">{r.addedBy} · {fmtDate(r.addedAt)}</p>
                        <p className="text-[10px] text-gray-300 truncate max-w-36">{domain}</p>
                      </div>
                      <a
                        href={r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors hover:text-white"
                        style={{ borderColor: color, color, backgroundColor: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = color)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <FolderOpen className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">No resources yet — add your first SharePoint link above.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Progress & Gaps tab ────────────────────────────────────────────────── */}
      {activeTab === 'gaps' && (
        <div className="space-y-6">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Open Gaps', value: gaps.filter(g => g.status === 'open').length, color: '#EF4444', bg: '#FEF2F2' },
              { label: 'In Progress', value: gaps.filter(g => g.status === 'in_progress').length, color: '#F59E0B', bg: '#FFFBEB' },
              { label: 'Resolved', value: resolvedCount, color: '#10B981', bg: '#ECFDF5' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border p-4 text-center" style={{ borderColor: s.color + '30', backgroundColor: s.bg }}>
                <p className="text-2xl font-heading font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Filter + Add */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Filter className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
              {(['all', 'open', 'in_progress', 'resolved'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setGapFilter(f)}
                  className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all', gapFilter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}
                >
                  {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowGapForm(s => !s)}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="w-3.5 h-3.5" />
              Log Gap
            </button>
          </div>

          {showGapForm && (
            <GapForm
              primaryColor={primaryColor} people={peopleNames}
              onSave={g => { addGap(g); setShowGapForm(false); }}
              onCancel={() => setShowGapForm(false)}
            />
          )}

          {/* Gap list */}
          {filteredGaps.length > 0 ? (
            <div className="space-y-2">
              {filteredGaps.map(g => (
                <GapCard key={g.id} gap={g} people={peopleNames} primaryColor={primaryColor}
                  onUpdate={updateGap} onDelete={deleteGap} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">{gapFilter === 'resolved' ? 'No resolved gaps yet.' : 'No gaps in this category — great work!'}</p>
            </div>
          )}

          {/* Team Notes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Team Notes</h3>
              <span className="text-xs text-gray-400">({teamNotes.length})</span>
            </div>

            {/* Add note */}
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 space-y-2">
              <textarea
                value={noteContent} onChange={e => setNoteContent(e.target.value)}
                rows={2} placeholder="Add a note for the team — observations, corrections, reminders…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 resize-none bg-white"
              />
              <div className="flex items-center gap-2">
                <input
                  value={noteAuthor} onChange={e => setNoteAuthor(e.target.value)}
                  list="people-list-note"
                  placeholder="Your name"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-200"
                />
                <datalist id="people-list-note">
                  {peopleNames.map(p => <option key={p} value={p} />)}
                </datalist>
                <button
                  onClick={postNote}
                  disabled={!noteContent.trim()}
                  className="px-4 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-40"
                  style={{ backgroundColor: accentColor }}
                >
                  Post Note
                </button>
              </div>
            </div>

            {/* Notes list */}
            {teamNotes.length > 0 ? (
              <div className="space-y-2">
                {[...teamNotes].reverse().map(n => (
                  <div key={n.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 group">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0"
                            style={{ backgroundColor: accentColor }}>
                            {(n.author || 'T')[0].toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-gray-700">{n.author || 'Team'}</span>
                          <span className="text-xs text-gray-400">{fmtDate(n.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{n.content}</p>
                        {n.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {n.tags.map(t => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <button onClick={() => deleteTeamNote(n.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-opacity flex-shrink-0">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-400 py-6">No notes yet — post the first one above.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Team tab ──────────────────────────────────────────────────────────── */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          {firmPeople.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Users className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">No team members yet — add them in Admin → People.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {firmPeople.map(person => {
                const initials = person.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <div key={person.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
                    {/* Avatar */}
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0">
                        {person.photoUrl ? (
                          <img src={person.photoUrl} alt={person.name}
                            className="w-14 h-14 rounded-full object-cover border-2 border-gray-100" />
                        ) : (
                          <div
                            className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold border-2 border-white shadow-sm"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {initials}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-heading font-semibold text-gray-900">{person.name}</h3>
                          {person.isPartner && (
                            <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                              style={{ backgroundColor: primaryColor + '15', color: primaryColor }}>
                              <Star className="w-2.5 h-2.5" /> Partner
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-medium mt-0.5" style={{ color: accentColor }}>{person.title}</p>
                      </div>
                    </div>

                    {/* Bio */}
                    {person.bio && (
                      <p className="text-xs text-gray-500 leading-relaxed mb-4 line-clamp-3">{person.bio}</p>
                    )}

                    {/* Contact */}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                      {person.email && (
                        <a href={`mailto:${person.email}`}
                          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors">
                          <Mail className="w-3.5 h-3.5" />
                          <span className="truncate max-w-40">{person.email}</span>
                        </a>
                      )}
                      {person.linkedInUrl && (
                        <a href={person.linkedInUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors ml-auto">
                          <ExternalLink className="w-3.5 h-3.5" />
                          LinkedIn
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Manage link */}
          <p className="text-xs text-gray-400 text-center pt-2">
            Add or edit team members in <span className="font-medium text-gray-600">Admin → People</span>
          </p>
        </div>
      )}
    </div>
  );
}
