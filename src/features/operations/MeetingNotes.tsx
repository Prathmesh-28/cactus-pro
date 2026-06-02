import { useState, useMemo } from 'react';
import {
  Phone, Handshake, ClipboardList, Users, Info, Building2, MoreHorizontal,
  Plus, Trash2, ChevronDown, ChevronUp, Search, Filter, Calendar,
  CheckSquare, Square, X, Edit3, Save, AlertCircle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { MeetingNote, MeetingType } from '../../data/types';
import { cn } from '../../lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEETING_TYPE_CONFIG: Record<
  MeetingType,
  { label: string; color: string; bg: string; border: string; Icon: React.ElementType }
> = {
  founder_call:  { label: 'Founder Call',   color: '#059669', bg: '#ECFDF5', border: '#6EE7B7', Icon: Phone },
  lp_meeting:    { label: 'LP Meeting',      color: '#2563EB', bg: '#EFF6FF', border: '#93C5FD', Icon: Users },
  board_meeting: { label: 'Board Meeting',   color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD', Icon: Building2 },
  co_investor:   { label: 'Co-investor',     color: '#0891B2', bg: '#ECFEFF', border: '#67E8F9', Icon: Handshake },
  intro:         { label: 'Intro',           color: '#D97706', bg: '#FFFBEB', border: '#FCD34D', Icon: Info },
  internal:      { label: 'Internal',        color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB', Icon: ClipboardList },
  other:         { label: 'Other',           color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB', Icon: MoreHorizontal },
};

const MEETING_TYPES: MeetingType[] = [
  'founder_call', 'lp_meeting', 'board_meeting', 'co_investor', 'intro', 'internal', 'other',
];

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Empty form factory ───────────────────────────────────────────────────────

type ActionItemDraft = { text: string; assignee: string; dueDate: string; done: boolean };

interface MeetingFormState {
  title: string;
  type: MeetingType;
  companyId: string;
  date: string;
  attendeesRaw: string;      // comma-separated input
  summary: string;
  actionItems: ActionItemDraft[];
  nextMeetingDate: string;
}

function emptyForm(): MeetingFormState {
  return {
    title: '',
    type: 'founder_call',
    companyId: '',
    date: today(),
    attendeesRaw: '',
    summary: '',
    actionItems: [],
    nextMeetingDate: '',
  };
}

// ─── Action Item Row ──────────────────────────────────────────────────────────

function ActionItemRow({
  item,
  index,
  editable,
  onChange,
  onRemove,
  onToggle,
}: {
  item: ActionItemDraft;
  index: number;
  editable: boolean;
  onChange?: (index: number, field: keyof ActionItemDraft, value: string | boolean) => void;
  onRemove?: (index: number) => void;
  onToggle?: (index: number) => void;
}) {
  if (!editable) {
    return (
      <div className={cn('flex items-start gap-3 py-2 px-3 rounded-lg transition-colors', item.done ? 'bg-gray-50' : 'bg-white border border-gray-100')}>
        <button
          onClick={() => onToggle?.(index)}
          className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-green-600 transition-colors"
        >
          {item.done
            ? <CheckSquare size={16} className="text-green-600" />
            : <Square size={16} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm', item.done && 'line-through text-gray-400')}>{item.text}</p>
          <div className="flex gap-3 mt-0.5">
            {item.assignee && (
              <span className="text-xs text-gray-500">{item.assignee}</span>
            )}
            {item.dueDate && (
              <span className="text-xs text-gray-400">Due {fmtDate(item.dueDate)}</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg border border-gray-200">
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input
          className="sm:col-span-3 px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Action item description"
          value={item.text}
          onChange={e => onChange?.(index, 'text', e.target.value)}
        />
        <input
          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
          placeholder="Assignee"
          value={item.assignee}
          onChange={e => onChange?.(index, 'assignee', e.target.value)}
        />
        <input
          type="date"
          className="px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-400"
          value={item.dueDate}
          onChange={e => onChange?.(index, 'dueDate', e.target.value)}
        />
      </div>
      <button
        type="button"
        onClick={() => onRemove?.(index)}
        className="flex-shrink-0 mt-1 p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

// ─── Meeting Note Form (new + edit) ──────────────────────────────────────────

function MeetingNoteForm({
  initialValues,
  companyOptions,
  onSave,
  onCancel,
  primaryColor,
}: {
  initialValues?: MeetingFormState;
  companyOptions: { id: string; name: string }[];
  onSave: (form: MeetingFormState) => void;
  onCancel: () => void;
  primaryColor: string;
}) {
  const [form, setForm] = useState<MeetingFormState>(initialValues ?? emptyForm());
  const [errors, setErrors] = useState<Partial<Record<keyof MeetingFormState, string>>>({});

  const set = <K extends keyof MeetingFormState>(k: K, v: MeetingFormState[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.date) e.date = 'Date is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (validate()) onSave(form);
  };

  const addActionItem = () =>
    set('actionItems', [...form.actionItems, { text: '', assignee: '', dueDate: '', done: false }]);

  const removeActionItem = (i: number) =>
    set('actionItems', form.actionItems.filter((_, idx) => idx !== i));

  const changeActionItem = (i: number, field: keyof ActionItemDraft, value: string | boolean) =>
    set('actionItems', form.actionItems.map((item, idx) =>
      idx === i ? { ...item, [field]: value } : item
    ));

  const typeConfig = MEETING_TYPE_CONFIG[form.type];

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-start justify-center overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {initialValues ? 'Edit Meeting Note' : 'New Meeting Note'}
          </h2>
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              className={cn(
                'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400',
                errors.title ? 'border-red-400' : 'border-gray-300'
              )}
              placeholder="e.g. Q2 Founder Update Call — Lohum"
              value={form.title}
              onChange={e => set('title', e.target.value)}
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Type + Date row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                value={form.type}
                onChange={e => set('type', e.target.value as MeetingType)}
              >
                {MEETING_TYPES.map(t => (
                  <option key={t} value={t}>{MEETING_TYPE_CONFIG[t].label}</option>
                ))}
              </select>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                  style={{ background: typeConfig.bg, color: typeConfig.color, border: `1px solid ${typeConfig.border}` }}
                >
                  <typeConfig.Icon size={11} />
                  {typeConfig.label}
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                className={cn(
                  'w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400',
                  errors.date ? 'border-red-400' : 'border-gray-300'
                )}
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
              {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company (optional)</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.companyId}
              onChange={e => set('companyId', e.target.value)}
            >
              <option value="">— No company —</option>
              {companyOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attendees <span className="text-gray-400 font-normal">(comma-separated)</span>
            </label>
            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              placeholder="e.g. Amit Sharma, Priya Mehta, John Doe"
              value={form.attendeesRaw}
              onChange={e => set('attendeesRaw', e.target.value)}
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none"
              placeholder="Key discussion points, decisions made, context..."
              value={form.summary}
              onChange={e => set('summary', e.target.value)}
            />
          </div>

          {/* Action Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Action Items</label>
              <button
                type="button"
                onClick={addActionItem}
                className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors"
                style={{ color: primaryColor, borderColor: primaryColor, background: `${primaryColor}10` }}
              >
                <Plus size={12} /> Add Item
              </button>
            </div>
            {form.actionItems.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-3 border border-dashed border-gray-200 rounded-lg">
                No action items yet. Click "Add Item" to add one.
              </p>
            ) : (
              <div className="space-y-2">
                {form.actionItems.map((item, i) => (
                  <ActionItemRow
                    key={i}
                    item={item}
                    index={i}
                    editable
                    onChange={changeActionItem}
                    onRemove={removeActionItem}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Next Meeting Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Meeting Date (optional)</label>
            <input
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={form.nextMeetingDate}
              onChange={e => set('nextMeetingDate', e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors"
            style={{ background: primaryColor }}
          >
            <Save size={14} />
            {initialValues ? 'Save Changes' : 'Create Note'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Meeting Note Card ────────────────────────────────────────────────────────

function MeetingNoteCard({
  note,
  companyName,
  primaryColor: _primaryColor,
  onEdit,
  onDelete,
  onToggleActionItem,
}: {
  note: MeetingNote;
  companyName?: string;
  primaryColor: string;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActionItem: (noteId: string, index: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = MEETING_TYPE_CONFIG[note.type];
  const TypeIcon = cfg.Icon;
  const doneCount = note.actionItems.filter(a => a.done).length;

  return (
    <div
      className="bg-white rounded-xl border shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      style={{ borderColor: expanded ? cfg.border : '#E5E7EB' }}
    >
      {/* Top color bar */}
      <div className="h-1 w-full" style={{ background: cfg.color }} />

      {/* Card body — click to expand */}
      <button
        className="w-full text-left px-5 py-4 focus:outline-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-start gap-3">
          {/* Type icon */}
          <span
            className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
          >
            <TypeIcon size={18} />
          </span>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900 text-sm leading-snug pr-2 truncate">{note.title}</h3>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={e => { e.stopPropagation(); onEdit(); }}
                  className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Edit"
                >
                  <Edit3 size={13} />
                </button>
                <button
                  onClick={e => { e.stopPropagation(); onDelete(); }}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
                {expanded ? <ChevronUp size={15} className="text-gray-400 ml-1" /> : <ChevronDown size={15} className="text-gray-400 ml-1" />}
              </div>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {/* Type badge */}
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
              >
                {cfg.label}
              </span>

              {/* Company */}
              {companyName && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <Building2 size={10} />
                  {companyName}
                </span>
              )}

              {/* Date */}
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Calendar size={11} />
                {fmtDate(note.date)}
              </span>

              {/* Action items count */}
              {note.actionItems.length > 0 && (
                <span
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full',
                    doneCount === note.actionItems.length
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  )}
                >
                  <CheckSquare size={10} />
                  {doneCount}/{note.actionItems.length} done
                </span>
              )}
            </div>

            {/* Attendees chips */}
            {note.attendees.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {note.attendees.slice(0, 5).map((a, i) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs">
                    {a.trim()}
                  </span>
                ))}
                {note.attendees.length > 5 && (
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">
                    +{note.attendees.length - 5} more
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 space-y-4 bg-gray-50/50">
          {/* Summary */}
          {note.summary && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Summary</h4>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{note.summary}</p>
            </div>
          )}

          {/* Action Items */}
          {note.actionItems.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Action Items ({doneCount}/{note.actionItems.length} complete)
              </h4>
              <div className="space-y-1.5">
                {note.actionItems.map((item, i) => (
                  <ActionItemRow
                    key={i}
                    item={item}
                    index={i}
                    editable={false}
                    onToggle={idx => onToggleActionItem(note.id, idx)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Next meeting */}
          {note.nextMeetingDate && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Meeting:</span>
              <span
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
              >
                <Calendar size={11} />
                {fmtDate(note.nextMeetingDate)}
              </span>
            </div>
          )}

          {/* Created by */}
          <p className="text-xs text-gray-400">
            Created by {note.createdBy} &middot; {fmtDate(note.createdAt.slice(0, 10))}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MeetingNotes() {
  const { store, addMeetingNote, updateMeetingNote, deleteMeetingNote } = useApp();
  const primaryColor = store.firm.primaryColor || '#4F46E5';

  const notes: MeetingNote[] = store.meetingNotes ?? [];
  const companies = store.companies ?? [];

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [editingNote, setEditingNote] = useState<MeetingNote | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MeetingType | 'all'>('all');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const companyOptions = companies.map(c => ({ id: c.id, name: c.name }));

  const getCompanyName = (id?: string): string | undefined =>
    id ? companies.find(c => c.id === id)?.name : undefined;

  const formToNote = (form: MeetingFormState, existing?: MeetingNote): MeetingNote => ({
    id: existing?.id ?? generateId(),
    title: form.title.trim(),
    type: form.type,
    companyId: form.companyId || undefined,
    date: form.date,
    attendees: form.attendeesRaw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    summary: form.summary.trim(),
    actionItems: form.actionItems.map(a => ({ ...a })),
    nextMeetingDate: form.nextMeetingDate || undefined,
    createdBy: existing?.createdBy ?? 'Team',
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  });

  const noteToForm = (note: MeetingNote): MeetingFormState => ({
    title: note.title,
    type: note.type,
    companyId: note.companyId ?? '',
    date: note.date,
    attendeesRaw: note.attendees.join(', '),
    summary: note.summary,
    actionItems: note.actionItems.map(a => ({ ...a })),
    nextMeetingDate: note.nextMeetingDate ?? '',
  });

  const handleSaveNew = (form: MeetingFormState) => {
    addMeetingNote(formToNote(form));
    setShowForm(false);
  };

  const handleSaveEdit = (form: MeetingFormState) => {
    if (!editingNote) return;
    updateMeetingNote(formToNote(form, editingNote));
    setEditingNote(null);
  };

  const handleDelete = (id: string) => {
    deleteMeetingNote(id);
    setDeleteConfirm(null);
  };

  const handleToggleActionItem = (noteId: string, index: number) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    const updated: MeetingNote = {
      ...note,
      actionItems: note.actionItems.map((item, i) =>
        i === index ? { ...item, done: !item.done } : item
      ),
    };
    updateMeetingNote(updated);
  };

  // ── Filtered & sorted notes ───────────────────────────────────────────────

  const filteredNotes = useMemo(() => {
    return notes
      .filter(n => {
        if (filterType !== 'all' && n.type !== filterType) return false;
        if (filterCompany !== 'all' && (n.companyId ?? '') !== filterCompany) return false;
        if (filterDateFrom && n.date < filterDateFrom) return false;
        if (filterDateTo && n.date > filterDateTo) return false;
        if (search.trim()) {
          const q = search.toLowerCase();
          const compName = getCompanyName(n.companyId)?.toLowerCase() ?? '';
          if (
            !n.title.toLowerCase().includes(q) &&
            !n.summary.toLowerCase().includes(q) &&
            !compName.includes(q) &&
            !n.attendees.some(a => a.toLowerCase().includes(q))
          ) return false;
        }
        return true;
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  }, [notes, filterType, filterCompany, filterDateFrom, filterDateTo, search]);

  // ── Type counts for filter badges ─────────────────────────────────────────
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: notes.length };
    notes.forEach(n => {
      counts[n.type] = (counts[n.type] ?? 0) + 1;
    });
    return counts;
  }, [notes]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meeting Notes & Call Logs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {notes.length} note{notes.length !== 1 ? 's' : ''} across all meeting types
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl shadow-sm hover:opacity-90 transition-opacity"
          style={{ background: primaryColor }}
        >
          <Plus size={16} />
          New Meeting Note
        </button>
      </div>

      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...MEETING_TYPES] as const).map(t => {
          const isAll = t === 'all';
          const cfg = isAll ? null : MEETING_TYPE_CONFIG[t];
          const active = filterType === t;
          const count = typeCounts[t] ?? 0;
          return (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                active
                  ? 'shadow-sm'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              )}
              style={active && cfg ? {
                background: cfg.bg,
                color: cfg.color,
                borderColor: cfg.border,
              } : active ? {
                background: '#F3F4F6',
                color: '#374151',
                borderColor: '#D1D5DB',
              } : undefined}
            >
              {cfg && <cfg.Icon size={11} />}
              {isAll ? 'All Types' : cfg!.label}
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-xs',
                active ? 'bg-white/60' : 'bg-gray-100 text-gray-500'
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Search notes, companies, attendees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => setShowFilters(f => !f)}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors',
            showFilters
              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
              : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
          )}
        >
          <Filter size={14} />
          Filters
          {(filterCompany !== 'all' || filterDateFrom || filterDateTo) && (
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          )}
        </button>
      </div>

      {/* Expanded filter panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Company</label>
            <select
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={filterCompany}
              onChange={e => setFilterCompany(e.target.value)}
            >
              <option value="all">All Companies</option>
              <option value="">No company</option>
              {companyOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date From</label>
            <input
              type="date"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Date To</label>
            <input
              type="date"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
            />
          </div>
          {(filterCompany !== 'all' || filterDateFrom || filterDateTo) && (
            <div className="sm:col-span-3 flex justify-end">
              <button
                onClick={() => { setFilterCompany('all'); setFilterDateFrom(''); setFilterDateTo(''); }}
                className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <X size={12} /> Clear filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Notes list */}
      {filteredNotes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300">
          <AlertCircle size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No meeting notes found</p>
          <p className="text-sm text-gray-400 mt-1">
            {notes.length === 0
              ? 'Create your first meeting note using the button above.'
              : 'Try adjusting your filters or search query.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map(note => (
            <MeetingNoteCard
              key={note.id}
              note={note}
              companyName={getCompanyName(note.companyId)}
              primaryColor={primaryColor}
              onEdit={() => setEditingNote(note)}
              onDelete={() => setDeleteConfirm(note.id)}
              onToggleActionItem={handleToggleActionItem}
            />
          ))}
        </div>
      )}

      {/* New note form modal */}
      {showForm && (
        <MeetingNoteForm
          companyOptions={companyOptions}
          onSave={handleSaveNew}
          onCancel={() => setShowForm(false)}
          primaryColor={primaryColor}
        />
      )}

      {/* Edit note form modal */}
      {editingNote && (
        <MeetingNoteForm
          initialValues={noteToForm(editingNote)}
          companyOptions={companyOptions}
          onSave={handleSaveEdit}
          onCancel={() => setEditingNote(null)}
          primaryColor={primaryColor}
        />
      )}

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete Meeting Note</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
