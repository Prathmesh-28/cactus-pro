import { useState, useMemo } from 'react';
import {
  ExternalLink, Plus, Trash2, CheckCircle2, Clock, AlertCircle,
  FileSpreadsheet, FileText, FolderOpen, Presentation, Link2, File,
  MessageSquare, ChevronDown, ChevronUp, Search, Tag, Filter,
  BookOpen, Wrench, Users, Mail, Star, Edit2, Pin, Paperclip, Calendar,
  Download, Send, Phone, ArrowUpDown, Link as LinkIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import type {
  Resource, ResourceType, Gap, GapStatus, GapPriority, GapCategory,
  TeamNote, WorkspaceTeam,
} from '../../data/types';
import { cn, exportToCSV } from '../../lib/utils';
import { uploadFile, fileDownloadUrl } from '../../lib/api';

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
function isOverdue(d?: string) {
  return !!d && new Date(d) < new Date(today());
}
function faviconFor(url: string): string | null {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`; } catch { return null; }
}

const RESOURCE_ICONS: Record<ResourceType, React.ElementType> = {
  spreadsheet: FileSpreadsheet, document: FileText, folder: FolderOpen,
  presentation: Presentation, link: Link2, other: File,
};
const RESOURCE_COLORS: Record<ResourceType, string> = {
  spreadsheet: '#1D6F42', document: '#185FA5', folder: '#854F0B',
  presentation: '#993556', link: '#534AB7', other: '#6B7280',
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

// ─── Team scoping (visibility) ──────────────────────────────────────────────
const TEAM_ORDER: WorkspaceTeam[] = ['all', 'portfolio', 'investment', 'finance'];
const TEAM_LABELS: Record<WorkspaceTeam, string> = {
  all: 'Everyone', portfolio: 'Portfolio', investment: 'Investment', finance: 'Finance',
};
const TEAM_COLORS: Record<WorkspaceTeam, string> = {
  all: '#6B7280', portfolio: '#1C4B42', investment: '#B45309', finance: '#185FA5',
};
function teamForRole(role?: string): WorkspaceTeam | null {
  if (role === 'portfolio_team' || role === 'portfolio_viewer') return 'portfolio';
  if (role === 'investment_team') return 'investment';
  if (role === 'finance_team') return 'finance';
  return null;
}
function TeamBadge({ team }: { team?: WorkspaceTeam }) {
  const t = team ?? 'all';
  return (
    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: TEAM_COLORS[t] + '18', color: TEAM_COLORS[t] }}>
      {TEAM_LABELS[t]}
    </span>
  );
}

// Reusable gap templates (prefill the Log Gap form).
const GAP_TEMPLATES: { label: string; title: string; description: string; category: GapCategory; priority: GapPriority }[] = [
  { label: 'Missing financials', title: 'Missing financial data', description: 'Revenue / EBITDA / net profit missing for FY__.', category: 'data', priority: 'medium' },
  { label: 'Stale valuation', title: 'Valuation needs refresh', description: 'Current valuation looks older than the last round.', category: 'data', priority: 'medium' },
  { label: 'Cap table incomplete', title: 'Cap table incomplete', description: 'Shareholding % / share counts missing or unverified.', category: 'data', priority: 'low' },
  { label: 'DD checklist pending', title: 'DD checklist not started', description: 'Standard diligence checklist pending for this deal.', category: 'process', priority: 'high' },
  { label: 'Feature request', title: 'Feature request', description: '', category: 'feature', priority: 'low' },
];

type WorkspaceTab = 'resources' | 'gaps' | 'team';
type ResSort = 'recent' | 'az';

// ─── Resource form (add + edit + file attach) ───────────────────────────────

function ResourceForm({ onSave, onCancel, primaryColor, defaultTeam, initial }: {
  onSave: (r: Omit<Resource, 'id'> & { id?: string }) => void;
  onCancel: () => void; primaryColor: string; defaultTeam: WorkspaceTeam; initial?: Resource;
}) {
  const [form, setForm] = useState<Omit<Resource, 'id'> & { id?: string }>(initial ?? {
    name: '', url: '', type: 'document', description: '',
    addedBy: '', addedAt: today(), tags: [], team: defaultTeam,
  });
  const [tagInput, setTagInput] = useState('');
  const [uploading, setUploading] = useState(false);

  const set = (k: keyof typeof form, v: string | string[]) => setForm(f => ({ ...f, [k]: v }));
  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) { set('tags', [...form.tags, t]); setTagInput(''); }
  };
  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const res = await uploadFile('workspace', f);
    setUploading(false);
    if (res) {
      setForm(prev => ({ ...prev, fileId: res.id, fileName: res.original_name, url: prev.url || fileDownloadUrl(res.id) }));
    } else {
      alert('Upload failed — file may be too large (20 MB max) or an unsupported type.');
    }
  };
  const valid = form.name.trim() && form.url.trim();

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{initial ? 'Edit Resource' : 'Add Resource'}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Portfolio Master Tracker"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">SharePoint / URL *</label>
          <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://…  (auto-filled if you attach a file)"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Type</label>
          <select value={form.type} onChange={e => set('type', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
            {(['spreadsheet','document','folder','presentation','link','other'] as ResourceType[]).map(t => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Share with</label>
          <select value={form.team ?? 'all'} onChange={e => set('team', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
            {TEAM_ORDER.map(t => <option key={t} value={t}>{TEAM_LABELS[t]}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2}
            placeholder="What does this file / folder contain?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 resize-none" />
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Attach a file (optional · 20 MB max)</label>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-100 cursor-pointer bg-white">
              <Paperclip className="w-3.5 h-3.5" /> {uploading ? 'Uploading…' : 'Choose file'}
              <input type="file" className="hidden" onChange={onFile} disabled={uploading} />
            </label>
            {form.fileName && (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <FileText className="w-3.5 h-3.5" /> {form.fileName}
                <button onClick={() => setForm(p => ({ ...p, fileId: undefined, fileName: undefined }))} className="text-gray-400 hover:text-red-500">×</button>
              </span>
            )}
          </div>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Tags</label>
          <div className="flex gap-2">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
              placeholder="Type tag and press Enter"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
            <button onClick={addTag} className="px-3 py-2 text-xs border border-gray-200 rounded-lg hover:bg-gray-100">Add</button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {form.tags.map(t => (
                <span key={t} className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                  {t}<button onClick={() => set('tags', form.tags.filter(x => x !== t))} className="text-gray-400 hover:text-gray-700">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button disabled={!valid} onClick={() => onSave(form)}
          className="px-4 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-40" style={{ backgroundColor: primaryColor }}>
          {initial ? 'Save Changes' : 'Save Resource'}
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-100">Cancel</button>
      </div>
    </div>
  );
}

// ─── Gap form (add + edit + templates + due date) ───────────────────────────

function GapForm({ onSave, onCancel, primaryColor, people, defaultTeam, initial }: {
  onSave: (g: Omit<Gap, 'id'> & { id?: string }) => void;
  onCancel: () => void; primaryColor: string; people: string[]; defaultTeam: WorkspaceTeam; initial?: Gap;
}) {
  const [form, setForm] = useState<Omit<Gap, 'id'> & { id?: string }>(initial ?? {
    title: '', description: '', companyName: '', category: 'data',
    status: 'open', priority: 'medium', assignedTo: '',
    createdAt: today(), resolvedAt: '', resolutionNote: '', team: defaultTeam, dueDate: '',
  });
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));
  const valid = form.title.trim();

  const applyTemplate = (label: string) => {
    const t = GAP_TEMPLATES.find(x => x.label === label);
    if (t) setForm(f => ({ ...f, title: t.title, description: t.description, category: t.category, priority: t.priority }));
  };

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{initial ? 'Edit Gap' : 'Log a Gap'}</p>
        {!initial && (
          <select onChange={e => { if (e.target.value) applyTemplate(e.target.value); }} defaultValue=""
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none">
            <option value="">Use template…</option>
            {GAP_TEMPLATES.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
          </select>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Missing revenue data for FY22"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Company</label>
          <input value={form.companyName} onChange={e => set('companyName', e.target.value)} placeholder="Company name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
            {(['data','feature','process','other'] as GapCategory[]).map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Priority</label>
          <select value={form.priority} onChange={e => set('priority', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
            {(['high','medium','low'] as GapPriority[]).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Due date</label>
          <input type="date" value={form.dueDate ?? ''} onChange={e => set('dueDate', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white" />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Assigned to</label>
          <input value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)} list="people-list" placeholder="Team member name"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
          <datalist id="people-list">{people.map(p => <option key={p} value={p} />)}</datalist>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Share with</label>
          <select value={form.team ?? 'all'} onChange={e => set('team', e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none bg-white">
            {TEAM_ORDER.map(t => <option key={t} value={t}>{TEAM_LABELS[t]}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="text-xs text-gray-500 mb-1 block">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={2} placeholder="What exactly is missing or broken?"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 resize-none" />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button disabled={!valid} onClick={() => onSave(form)}
          className="px-4 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-40" style={{ backgroundColor: primaryColor }}>
          {initial ? 'Save Changes' : 'Log Gap'}
        </button>
        <button onClick={onCancel} className="px-4 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-100">Cancel</button>
      </div>
    </div>
  );
}

// ─── Gap card (due date + comments + edit + delete) ─────────────────────────

function GapCard({ gap, people, onUpdate, onDelete, onEdit, primaryColor, canManage, meName, meId }: {
  gap: Gap; people: string[]; onUpdate: (g: Gap) => void; onDelete: (g: Gap) => void; onEdit: (g: Gap) => void;
  primaryColor: string; canManage: boolean; meName: string; meId?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [note, setNote] = useState(gap.resolutionNote);
  const [comment, setComment] = useState('');
  const sc = STATUS_CONFIG[gap.status];
  const pc = PRIORITY_CONFIG[gap.priority];
  const StatusIcon = sc.Icon;
  const comments = gap.comments ?? [];
  const overdue = gap.status !== 'resolved' && isOverdue(gap.dueDate);

  const resolve = () => { onUpdate({ ...gap, status: 'resolved', resolvedAt: today(), resolutionNote: note }); setResolving(false); };
  const setStatus = (status: GapStatus) => onUpdate({ ...gap, status, resolvedAt: status === 'resolved' ? today() : '', resolutionNote: status === 'resolved' ? note : gap.resolutionNote });
  const addComment = () => {
    const t = comment.trim(); if (!t) return;
    onUpdate({ ...gap, comments: [...comments, { id: uid(), text: t, author: meName, authorId: meId, createdAt: today() }] });
    setComment('');
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
              <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: pc.bg, color: pc.color }}>{pc.label}</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{CAT_LABELS[gap.category]}</span>
              <TeamBadge team={gap.team} />
              {gap.companyName && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{gap.companyName}</span>}
              {gap.dueDate && (
                <span className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full', overdue ? 'bg-red-50 text-red-600 font-medium' : 'bg-gray-100 text-gray-500')}>
                  <Calendar className="w-3 h-3" /> {overdue ? 'Overdue · ' : 'Due '}{fmtDate(gap.dueDate)}
                </span>
              )}
              {comments.length > 0 && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                  <MessageSquare className="w-3 h-3" /> {comments.length}
                </span>
              )}
            </div>
            <p className={cn('text-sm font-semibold', gap.status === 'resolved' ? 'text-gray-500 line-through' : 'text-gray-900')}>{gap.title}</p>
            {gap.assignedTo && <p className="text-xs text-gray-400 mt-0.5">Assigned: {gap.assignedTo} · Added {fmtDate(gap.createdAt)}</p>}
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => setExpanded(e => !e)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
            {canManage && (
              <>
                <button onClick={() => onEdit(gap)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-300 hover:text-gray-600" title="Edit (owner / super admin)">
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete(gap)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400" title="Delete (owner / super admin)">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
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
                  <button onClick={() => setStatus('in_progress')} className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100">Mark In Progress</button>
                )}
                <button onClick={() => setResolving(r => !r)} className="text-xs px-3 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100">{resolving ? 'Cancel' : 'Resolve Gap'}</button>
                <select value={gap.assignedTo} onChange={e => onUpdate({ ...gap, assignedTo: e.target.value })}
                  className="text-xs px-2 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 focus:outline-none">
                  <option value="">Reassign…</option>
                  {people.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            )}

            {resolving && (
              <div className="space-y-2">
                <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder="Describe how this was resolved…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 resize-none" />
                <button onClick={resolve} className="text-xs px-4 py-1.5 rounded-lg text-white" style={{ backgroundColor: primaryColor }}>Confirm Resolution</button>
              </div>
            )}

            {/* Comments thread (anyone who can see the gap can comment) */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"><MessageSquare className="w-3 h-3" /> Discussion</p>
              {comments.map(c => (
                <div key={c.id} className="text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="font-medium text-gray-700">{c.author}</span> <span className="text-gray-400">· {fmtDate(c.createdAt)}</span>
                  <p className="text-gray-600 mt-0.5 leading-relaxed">{c.text}</p>
                </div>
              ))}
              <div className="flex gap-2">
                <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()}
                  placeholder="Add a comment…" className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-green-200" />
                <button onClick={addComment} disabled={!comment.trim()} className="px-3 py-1.5 rounded-lg text-white disabled:opacity-40" style={{ backgroundColor: primaryColor }}>
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { store, currentRole, addResource, updateResource, deleteResource, addGap, updateGap, deleteGap, addTeamNote, deleteTeamNote, logWorkspaceActivity } = useApp();
  const { user } = useAuth();
  const { firm, people: firmPeople } = store;
  const primaryColor = firm.primaryColor;
  const accentColor = firm.accentColor;

  // ── Identity & permissions ──────────────────────────────────────────────────
  const isSuperAdmin = user?.role === 'super_admin' || currentRole === 'super_admin';
  const myTeam = teamForRole(user?.role ?? currentRole);
  const myId = user?.id != null ? String(user.id) : undefined;
  const meName = user?.name || user?.email || 'Team';
  const defaultTeam: WorkspaceTeam = myTeam ?? 'all';
  const canSee = (it: { team?: WorkspaceTeam }) => isSuperAdmin || !it.team || it.team === 'all' || it.team === myTeam;
  const canManage = (it: { ownerId?: string }) => isSuperAdmin || (!!it.ownerId && it.ownerId === myId);

  const logAct = (action: 'added' | 'updated' | 'deleted', entity: 'resource' | 'gap' | 'note', title: string, team?: WorkspaceTeam) =>
    logWorkspaceActivity({ id: uid(), action, entity, title, actor: meName, at: new Date().toISOString(), team });

  const allResources = (store.resources ?? []).filter(canSee);
  const allGaps = (store.gaps ?? []).filter(canSee);
  const teamNotes = (store.teamNotes ?? []).filter(canSee);
  const peopleNames = firmPeople.map(p => p.name);

  const [activeTab, setActiveTab] = useState<WorkspaceTab>('resources');
  const [showResForm, setShowResForm] = useState(false);
  const [editingRes, setEditingRes] = useState<Resource | null>(null);
  const [resSearch, setResSearch] = useState('');
  const [resTeamFilter, setResTeamFilter] = useState<WorkspaceTeam | '*'>('*');
  const [resSort, setResSort] = useState<ResSort>('recent');

  const [showGapForm, setShowGapForm] = useState(false);
  const [editingGap, setEditingGap] = useState<Gap | null>(null);
  const [gapFilter, setGapFilter] = useState<GapStatus | 'all'>('all');
  const [gapSearch, setGapSearch] = useState('');
  const [gapCompany, setGapCompany] = useState('all');
  const [gapCat, setGapCat] = useState<GapCategory | 'all'>('all');
  const [gapAssignee, setGapAssignee] = useState('all');
  const [gapPriority, setGapPriority] = useState<GapPriority | 'all'>('all');
  const [myGapsOnly, setMyGapsOnly] = useState(false);

  const [noteContent, setNoteContent] = useState('');
  const [noteTeam, setNoteTeam] = useState<WorkspaceTeam>(defaultTeam);
  const [noteGapId, setNoteGapId] = useState('');
  const [noteSearch, setNoteSearch] = useState('');

  // ── Resources ──────────────────────────────────────────────────────────────
  const filteredRes = useMemo(() => {
    const list = allResources.filter(r =>
      (resTeamFilter === '*' || (r.team ?? 'all') === resTeamFilter) &&
      (!resSearch || r.name.toLowerCase().includes(resSearch.toLowerCase()) ||
        r.description.toLowerCase().includes(resSearch.toLowerCase()) ||
        r.tags.some(t => t.includes(resSearch.toLowerCase())))
    );
    return list.sort((a, b) => {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      if (resSort === 'az') return a.name.localeCompare(b.name);
      return (b.addedAt || '').localeCompare(a.addedAt || '');
    });
  }, [allResources, resTeamFilter, resSearch, resSort]);

  // ── Gaps ───────────────────────────────────────────────────────────────────
  const companies = useMemo(() => Array.from(new Set(allGaps.map(g => g.companyName).filter(Boolean))), [allGaps]);
  const filteredGaps = allGaps.filter(g =>
    (gapFilter === 'all' || g.status === gapFilter) &&
    (gapCompany === 'all' || g.companyName === gapCompany) &&
    (gapCat === 'all' || g.category === gapCat) &&
    (gapAssignee === 'all' || g.assignedTo === gapAssignee) &&
    (gapPriority === 'all' || g.priority === gapPriority) &&
    (!myGapsOnly || g.assignedTo === meName) &&
    (!gapSearch || g.title.toLowerCase().includes(gapSearch.toLowerCase()) || g.description.toLowerCase().includes(gapSearch.toLowerCase()))
  );
  const openCount = allGaps.filter(g => g.status !== 'resolved').length;
  const resolvedCount = allGaps.filter(g => g.status === 'resolved').length;
  const myOpen = allGaps.filter(g => g.assignedTo === meName && g.status !== 'resolved').length;

  const visibleNotes = teamNotes.filter(n => !noteSearch || n.content.toLowerCase().includes(noteSearch.toLowerCase()));

  // ── Mutations (with activity logging) ────────────────────────────────────────
  const saveResource = (r: Omit<Resource, 'id'> & { id?: string }) => {
    if (r.id) { updateResource(r as Resource); logAct('updated', 'resource', r.name, r.team); }
    else { addResource({ ...r, id: uid(), addedBy: meName, addedAt: today(), ownerId: myId }); logAct('added', 'resource', r.name, r.team); }
    setShowResForm(false); setEditingRes(null);
  };
  const removeResource = (r: Resource) => { deleteResource(r.id); logAct('deleted', 'resource', r.name, r.team); };
  const togglePin = (r: Resource) => updateResource({ ...r, pinned: !r.pinned });

  const saveGap = (g: Omit<Gap, 'id'> & { id?: string }) => {
    if (g.id) { updateGap(g as Gap); logAct('updated', 'gap', g.title, g.team); }
    else { addGap({ ...g, id: uid(), ownerId: myId }); logAct('added', 'gap', g.title, g.team); }
    setShowGapForm(false); setEditingGap(null);
  };
  const removeGap = (g: Gap) => { deleteGap(g.id); logAct('deleted', 'gap', g.title, g.team); };

  const postNote = () => {
    if (!noteContent.trim()) return;
    addTeamNote({ id: uid(), content: noteContent.trim(), author: meName, createdAt: today(), linkedGapId: noteGapId, tags: [], team: noteTeam, ownerId: myId });
    logAct('added', 'note', noteContent.trim().slice(0, 60), noteTeam);
    setNoteContent(''); setNoteTeam(defaultTeam); setNoteGapId('');
  };
  const removeNote = (n: TeamNote) => { deleteTeamNote(n.id); logAct('deleted', 'note', n.content.slice(0, 60), n.team); };

  const exportResources = () => exportToCSV(filteredRes.map(r => ({
    Name: r.name, Team: TEAM_LABELS[r.team ?? 'all'], Type: r.type, URL: r.url,
    Description: r.description, Tags: r.tags.join('; '), AddedBy: r.addedBy, AddedAt: r.addedAt,
  })), 'workspace-resources');
  const exportGaps = () => exportToCSV(filteredGaps.map(g => ({
    Title: g.title, Status: g.status, Priority: g.priority, Category: g.category, Company: g.companyName,
    AssignedTo: g.assignedTo, Team: TEAM_LABELS[g.team ?? 'all'], DueDate: g.dueDate ?? '', Created: g.createdAt,
    Resolved: g.resolvedAt, Comments: (g.comments ?? []).length,
  })), 'workspace-gaps');

  return (
    <div className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-xl font-heading font-semibold text-gray-900">Team Workspace</h1>
        <p className="text-sm text-gray-500 mt-0.5">Shared resources, progress log, and open gaps — scoped to your team{isSuperAdmin ? ' · you have super-admin control over every item' : ''}.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        {([
          { key: 'resources' as WorkspaceTab, label: 'Resources', Icon: BookOpen, count: allResources.length },
          { key: 'gaps' as WorkspaceTab, label: 'Progress & Gaps', Icon: Wrench, count: openCount },
          { key: 'team' as WorkspaceTab, label: 'Team', Icon: Users, count: firmPeople.length },
        ]).map(({ key, label, Icon, count }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all', activeTab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
            <Icon className="w-4 h-4" />{label}
            {count > 0 && (
              <span className={cn('text-xs px-1.5 py-0.5 rounded-full font-semibold', activeTab === key ? 'text-white' : 'bg-gray-200 text-gray-500')}
                style={activeTab === key ? { backgroundColor: primaryColor } : {}}>{count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Resources tab ─────────────────────────────────────────────────────── */}
      {activeTab === 'resources' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={resSearch} onChange={e => setResSearch(e.target.value)} placeholder="Search resources…"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
            </div>
            <select value={resTeamFilter} onChange={e => setResTeamFilter(e.target.value as WorkspaceTeam | '*')}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none" title="Filter by team">
              <option value="*">All teams</option>
              {TEAM_ORDER.map(t => <option key={t} value={t}>{TEAM_LABELS[t]}</option>)}
            </select>
            <button onClick={() => setResSort(s => s === 'recent' ? 'az' : 'recent')}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50" title="Toggle sort">
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" /> {resSort === 'recent' ? 'Recent' : 'A–Z'}
            </button>
            {filteredRes.length > 0 && (
              <button onClick={exportResources} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white hover:bg-gray-50" title="Export CSV">
                <Download className="w-3.5 h-3.5 text-gray-400" /> Export
              </button>
            )}
            <button onClick={() => { setEditingRes(null); setShowResForm(s => !s); }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: primaryColor }}>
              <Plus className="w-3.5 h-3.5" /> Add Resource
            </button>
          </div>

          {(showResForm || editingRes) && (
            <ResourceForm primaryColor={primaryColor} defaultTeam={defaultTeam} initial={editingRes ?? undefined}
              onSave={saveResource} onCancel={() => { setShowResForm(false); setEditingRes(null); }} />
          )}

          {filteredRes.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredRes.map(r => {
                const Icon = RESOURCE_ICONS[r.type];
                const color = RESOURCE_COLORS[r.type];
                const fav = faviconFor(r.url);
                let domain = '';
                try { domain = new URL(r.url).hostname.replace('www.', ''); } catch { domain = r.url.slice(0, 30); }
                return (
                  <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden" style={{ backgroundColor: color + '15', color }}>
                        {fav ? <img src={fav} alt="" className="w-4.5 h-4.5" style={{ width: 18, height: 18 }} onError={e => { (e.currentTarget.style.display = 'none'); }} /> : <Icon style={{ width: 18, height: 18 }} />}
                      </div>
                      <div className="flex items-center gap-0.5">
                        <button onClick={() => togglePin(r)} className={cn('p-1 rounded transition-colors', r.pinned ? 'text-amber-500' : 'opacity-0 group-hover:opacity-100 text-gray-300 hover:text-amber-500')} title={r.pinned ? 'Unpin' : 'Pin'}>
                          <Pin className="w-3.5 h-3.5" style={r.pinned ? { fill: 'currentColor' } : {}} />
                        </button>
                        {canManage(r) && (
                          <>
                            <button onClick={() => { setEditingRes(r); setShowResForm(false); }} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-600 transition-opacity" title="Edit"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => removeResource(r)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-opacity" title="Delete (owner / super admin)"><Trash2 className="w-3.5 h-3.5" /></button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 leading-snug">{r.name}</p>
                      <TeamBadge team={r.team} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-2">{r.description}</p>
                    {(r.tags.length > 0 || r.fileName) && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {r.fileName && <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600"><Paperclip className="w-2.5 h-2.5" />{r.fileName.slice(0, 18)}</span>}
                        {r.tags.map(t => <span key={t} className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500"><Tag className="w-2.5 h-2.5" />{t}</span>)}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-gray-400">{r.addedBy} · {fmtDate(r.addedAt)}</p>
                        <p className="text-[10px] text-gray-300 truncate max-w-36">{domain}</p>
                      </div>
                      <a href={r.fileId ? fileDownloadUrl(r.fileId) : r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors hover:text-white"
                        style={{ borderColor: color, color, backgroundColor: 'transparent' }}
                        onMouseEnter={e => (e.currentTarget.style.backgroundColor = color)}
                        onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
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
              <p className="text-sm">No resources here yet — add a link or attach a file above.</p>
            </div>
          )}
        </div>
      )}

      {/* ── Progress & Gaps tab ────────────────────────────────────────────────── */}
      {activeTab === 'gaps' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Open Gaps', value: allGaps.filter(g => g.status === 'open').length, color: '#EF4444', bg: '#FEF2F2' },
              { label: 'In Progress', value: allGaps.filter(g => g.status === 'in_progress').length, color: '#F59E0B', bg: '#FFFBEB' },
              { label: 'Resolved', value: resolvedCount, color: '#10B981', bg: '#ECFDF5' },
              { label: 'Assigned to me', value: myOpen, color: primaryColor, bg: '#F2F7F1' },
            ].map(s => (
              <div key={s.label} className="rounded-xl border p-4 text-center" style={{ borderColor: s.color + '30', backgroundColor: s.bg }}>
                <p className="text-2xl font-heading font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Search + filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-44">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input value={gapSearch} onChange={e => setGapSearch(e.target.value)} placeholder="Search gaps…"
                className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
            </div>
            <button onClick={() => setMyGapsOnly(v => !v)}
              className={cn('px-3 py-2 rounded-lg text-xs font-medium border', myGapsOnly ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200')}
              style={myGapsOnly ? { backgroundColor: primaryColor } : {}}>My gaps{myOpen ? ` (${myOpen})` : ''}</button>
            {filteredGaps.length > 0 && (
              <button onClick={exportGaps} className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-xs bg-white hover:bg-gray-50"><Download className="w-3.5 h-3.5 text-gray-400" /> Export</button>
            )}
            <button onClick={() => { setEditingGap(null); setShowGapForm(s => !s); }}
              className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: primaryColor }}>
              <Plus className="w-3.5 h-3.5" /> Log Gap
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Filter className="w-3.5 h-3.5 text-gray-400 ml-1.5" />
              {(['all', 'open', 'in_progress', 'resolved'] as const).map(f => (
                <button key={f} onClick={() => setGapFilter(f)}
                  className={cn('px-3 py-1 rounded-md text-xs font-medium transition-all', gapFilter === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700')}>
                  {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
            <select value={gapCompany} onChange={e => setGapCompany(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
              <option value="all">All companies</option>{companies.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={gapCat} onChange={e => setGapCat(e.target.value as GapCategory | 'all')} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
              <option value="all">All categories</option>{(['data','feature','process','other'] as GapCategory[]).map(c => <option key={c} value={c}>{CAT_LABELS[c]}</option>)}
            </select>
            <select value={gapPriority} onChange={e => setGapPriority(e.target.value as GapPriority | 'all')} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
              <option value="all">All priorities</option>{(['high','medium','low'] as GapPriority[]).map(p => <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>)}
            </select>
            <select value={gapAssignee} onChange={e => setGapAssignee(e.target.value)} className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs bg-white focus:outline-none">
              <option value="all">Anyone</option>{peopleNames.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {(showGapForm || editingGap) && (
            <GapForm primaryColor={primaryColor} people={peopleNames} defaultTeam={defaultTeam} initial={editingGap ?? undefined}
              onSave={saveGap} onCancel={() => { setShowGapForm(false); setEditingGap(null); }} />
          )}

          {filteredGaps.length > 0 ? (
            <div className="space-y-2">
              {filteredGaps.map(g => (
                <GapCard key={g.id} gap={g} people={peopleNames} primaryColor={primaryColor} canManage={canManage(g)} meName={meName} meId={myId}
                  onUpdate={updateGap} onDelete={removeGap} onEdit={(gg) => { setEditingGap(gg); setShowGapForm(false); }} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">No gaps match these filters.</p>
            </div>
          )}

          {/* Team Notes */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <h3 className="text-sm font-semibold text-gray-700">Team Notes</h3>
              <span className="text-xs text-gray-400">({visibleNotes.length})</span>
              <div className="relative ml-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
                <input value={noteSearch} onChange={e => setNoteSearch(e.target.value)} placeholder="Search notes…"
                  className="pl-7 pr-2 py-1 border border-gray-200 rounded-lg text-xs focus:outline-none w-40" />
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 space-y-2">
              <textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} rows={2}
                placeholder="Add a note for the team — observations, corrections, reminders…"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 resize-none bg-white" />
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400">As <span className="font-medium text-gray-600">{meName}</span></span>
                <select value={noteTeam} onChange={e => setNoteTeam(e.target.value as WorkspaceTeam)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none" title="Share with">
                  {TEAM_ORDER.map(t => <option key={t} value={t}>{TEAM_LABELS[t]}</option>)}
                </select>
                <select value={noteGapId} onChange={e => setNoteGapId(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none max-w-44" title="Link to a gap">
                  <option value="">No linked gap</option>
                  {allGaps.map(g => <option key={g.id} value={g.id}>🔗 {g.title.slice(0, 32)}</option>)}
                </select>
                <button onClick={postNote} disabled={!noteContent.trim()} className="ml-auto px-4 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-40" style={{ backgroundColor: accentColor }}>Post Note</button>
              </div>
            </div>

            {visibleNotes.length > 0 ? (
              <div className="space-y-2">
                {[...visibleNotes].reverse().map(n => {
                  const linked = n.linkedGapId ? allGaps.find(g => g.id === n.linkedGapId) : null;
                  return (
                    <div key={n.id} className="bg-white border border-gray-100 rounded-xl px-4 py-3 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] text-white font-bold flex-shrink-0" style={{ backgroundColor: accentColor }}>{(n.author || 'T')[0].toUpperCase()}</div>
                            <span className="text-xs font-medium text-gray-700">{n.author || 'Team'}</span>
                            <span className="text-xs text-gray-400">{fmtDate(n.createdAt)}</span>
                            <TeamBadge team={n.team} />
                            {linked && <span className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600"><LinkIcon className="w-2.5 h-2.5" />{linked.title.slice(0, 28)}</span>}
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">{n.content}</p>
                        </div>
                        {canManage(n) && (
                          <button onClick={() => removeNote(n)} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-opacity flex-shrink-0" title="Delete (owner / super admin)"><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                const assignedOpen = (store.gaps ?? []).filter(g => g.assignedTo === person.name && g.status !== 'resolved').length;
                return (
                  <div key={person.id} className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4 mb-4">
                      <div className="flex-shrink-0">
                        {person.photoUrl
                          ? <img src={person.photoUrl} alt={person.name} className="w-14 h-14 rounded-full object-cover border-2 border-gray-100" />
                          : <div className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold border-2 border-white shadow-sm" style={{ backgroundColor: primaryColor }}>{initials}</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h3 className="text-sm font-heading font-semibold text-gray-900">{person.name}</h3>
                          {person.isPartner && <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ backgroundColor: primaryColor + '15', color: primaryColor }}><Star className="w-2.5 h-2.5" /> Partner</span>}
                        </div>
                        <p className="text-xs font-medium mt-0.5" style={{ color: accentColor }}>{person.title}</p>
                        {person.department && <p className="text-[11px] text-gray-400 mt-0.5">{person.department}{person.reportsTo ? ` · reports to ${person.reportsTo}` : ''}</p>}
                      </div>
                    </div>
                    {person.bio && <p className="text-xs text-gray-500 leading-relaxed mb-3 line-clamp-3">{person.bio}</p>}
                    {assignedOpen > 0 && (
                      <button onClick={() => { setActiveTab('gaps'); setGapAssignee(person.name); setMyGapsOnly(false); setGapFilter('all'); }}
                        className="text-[11px] mb-3 px-2 py-1 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100">
                        {assignedOpen} open gap{assignedOpen > 1 ? 's' : ''} assigned →
                      </button>
                    )}
                    <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-gray-100">
                      {person.email && <a href={`mailto:${person.email}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"><Mail className="w-3.5 h-3.5" /><span className="truncate max-w-32">{person.email}</span></a>}
                      {person.phone && <a href={`tel:${person.phone}`} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"><Phone className="w-3.5 h-3.5" />{person.phone}</a>}
                      {person.linkedInUrl && <a href={person.linkedInUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 transition-colors ml-auto"><ExternalLink className="w-3.5 h-3.5" />LinkedIn</a>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-gray-400 text-center pt-2">Add or edit team members in <span className="font-medium text-gray-600">Admin → People</span></p>
        </div>
      )}
    </div>
  );
}
