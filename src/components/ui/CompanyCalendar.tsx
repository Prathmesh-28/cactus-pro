/**
 * CompanyCalendar — reusable compliance calendar scoped to a company (or all companies).
 * - companyId = undefined  → shows ALL portfolio deadlines (Portfolio page bottom section)
 * - companyId = "c1"       → shows only that company's deadlines (CompanyDrawer tab)
 *
 * Storage: KV namespace 'app', key 'portfolio_compliance_events' — synced across all users.
 */
import { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, format, isSameMonth, isToday, parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Check, Upload, Download, FileSpreadsheet } from 'lucide-react';
import { cn } from '../../lib/utils';
import { kvGet, kvSet } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalEvent {
  id: string;
  companyId: string;
  companyName: string;
  due_date: string;   // yyyy-MM-dd
  title: string;
  assigned_to: string;
  notes: string;
}

// ─── KV-backed event store ────────────────────────────────────────────────────

const KV_NS  = 'app';
const KV_KEY = 'portfolio_compliance_events';
const EVT    = 'portfolio-cal-changed';

function dispatchLocal() {
  window.dispatchEvent(new CustomEvent(EVT));
}

function genId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `e_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export async function loadEvents(): Promise<CalEvent[]> {
  const v = await kvGet(KV_NS, KV_KEY);
  return Array.isArray(v) ? (v as CalEvent[]) : [];
}

export async function saveEvents(events: CalEvent[]) {
  await kvSet(KV_NS, KV_KEY, events);
  dispatchLocal();
}

function useEvents(companyId?: string): [CalEvent[], (e: CalEvent[]) => void, boolean] {
  const [all, setAll] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await loadEvents();
    setAll(data);
    setLoading(false);
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  useEffect(() => {
    const h = () => { void refresh(); };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, [refresh]);

  const filtered = companyId ? all.filter(e => e.companyId === companyId) : all;

  const save = (next: CalEvent[]) => {
    const kept = companyId ? all.filter(e => e.companyId !== companyId) : [];
    const merged = [...kept, ...next];
    setAll(merged);
    void saveEvents(merged);
  };

  return [filtered, save, loading];
}

// ─── CSV template ─────────────────────────────────────────────────────────────

const TEMPLATE_HEADERS = ['title', 'due_date', 'assigned_to', 'notes'];
const TEMPLATE_EXAMPLE = [
  ['ROC Annual Filing', '2026-07-15', 'Finance Team', 'MCA portal submission'],
  ['GST Return Q1', '2026-07-20', 'Accounts', ''],
  ['Board Meeting Minutes', '2026-08-01', 'Company Secretary', 'File within 30 days'],
];

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS, ...TEMPLATE_EXAMPLE];
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'compliance_deadlines_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text: string): { rows: Partial<CalEvent>[]; errors: string[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { rows: [], errors: ['File has no data rows.'] };

  const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
  const ti = header.indexOf('title');
  const di = header.indexOf('due_date');
  const ai = header.indexOf('assigned_to');
  const ni = header.indexOf('notes');

  if (ti === -1 || di === -1) {
    return { rows: [], errors: ['Missing required columns: "title" and "due_date" must be present.'] };
  }

  const rows: Partial<CalEvent>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].match(/("(?:[^"]|"")*"|[^,]*)/g)?.map(c =>
      c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c
    ) ?? [];

    const title    = (cols[ti] ?? '').trim();
    const due_date = (cols[di] ?? '').trim();
    const assigned = ai >= 0 ? (cols[ai] ?? '').trim() : '';
    const notes    = ni >= 0 ? (cols[ni] ?? '').trim() : '';

    if (!title) { errors.push(`Row ${i}: title is empty — skipped`); continue; }
    if (!due_date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      errors.push(`Row ${i}: due_date "${due_date}" is not in YYYY-MM-DD format — skipped`);
      continue;
    }

    rows.push({ title, due_date, assigned_to: assigned, notes });
  }

  return { rows, errors };
}

// ─── Bulk Upload Panel ────────────────────────────────────────────────────────

function BulkUploadPanel({
  companyId, companyName, onImport, onClose,
}: {
  companyId: string; companyName: string;
  onImport: (rows: Partial<CalEvent>[]) => void; onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Partial<CalEvent>[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState('');

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target?.result as string;
      const { rows, errors: errs } = parseCSV(text);
      setPreview(rows);
      setErrors(errs);
    };
    reader.readAsText(file);
  };

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 text-green-700" />
          <p className="text-sm font-semibold text-gray-800">Bulk Upload Deadlines</p>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-200 text-gray-400"><X className="w-4 h-4" /></button>
      </div>

      <div className="p-4 space-y-4">
        {/* Step 1 — download template */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 border border-blue-100">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-blue-800">Download the template</p>
            <p className="text-xs text-blue-600 mt-0.5">Fill it in Excel or Google Sheets. Columns: <code className="bg-blue-100 px-1 rounded">title</code>, <code className="bg-blue-100 px-1 rounded">due_date</code> (YYYY-MM-DD), <code className="bg-blue-100 px-1 rounded">assigned_to</code>, <code className="bg-blue-100 px-1 rounded">notes</code></p>
          </div>
          <button onClick={downloadTemplate}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-blue-300 text-blue-700 bg-white hover:bg-blue-50 transition-colors">
            <Download className="w-3.5 h-3.5" /> Template
          </button>
        </div>

        {/* Step 2 — upload */}
        <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-600 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-700">Upload your filled CSV</p>
            {fileName && <p className="text-xs text-green-700 mt-0.5 truncate">📎 {fileName}</p>}
          </div>
          <button onClick={() => fileRef.current?.click()}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition-colors">
            <Upload className="w-3.5 h-3.5" /> Choose File
          </button>
          <input ref={fileRef} type="file" accept=".csv" hidden onChange={onFile} />
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
            <p className="text-xs font-semibold text-amber-700">Warnings ({errors.length})</p>
            {errors.map((e, i) => <p key={i} className="text-xs text-amber-600">{e}</p>)}
          </div>
        )}

        {/* Preview */}
        {preview && preview.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-600">{preview.length} deadline{preview.length !== 1 ? 's' : ''} ready to import</p>
            <div className="rounded-lg border border-gray-200 overflow-hidden max-h-48 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    {['Title', 'Due Date', 'Assigned To', 'Notes'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {preview.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-800">{r.title}</td>
                      <td className="px-3 py-2 text-gray-600 tabular-nums">{r.due_date}</td>
                      <td className="px-3 py-2 text-gray-500">{r.assigned_to || '—'}</td>
                      <td className="px-3 py-2 text-gray-400 max-w-[150px] truncate">{r.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => onImport(preview)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg text-white bg-green-700 hover:bg-green-800 transition-colors">
              <Check className="w-4 h-4" /> Import {preview.length} Deadline{preview.length !== 1 ? 's' : ''} for {companyName}
            </button>
          </div>
        )}

        {preview && preview.length === 0 && errors.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">No valid rows found in the file.</p>
        )}
      </div>
    </div>
  );
}

// ─── Colour palette per company ───────────────────────────────────────────────

const PALETTE = [
  '#1E293B','#2D4A6B','#1D4ED8','#7C3AED','#DB2777',
  '#D97706','#059669','#DC2626','#0891B2','#16A34A',
];
function companyColor(id: string) {
  const n = id.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  return PALETTE[n % PALETTE.length];
}

// ─── Event form ───────────────────────────────────────────────────────────────

interface FormState { title: string; assigned_to: string; notes: string; due_date: string; }
const BLANK: FormState = { title: '', assigned_to: '', notes: '', due_date: '' };

function EventForm({
  initial, companyId: _cid, companyName, onSave, onCancel,
}: {
  initial: FormState; companyId: string; companyName: string;
  onSave: (f: FormState) => void; onCancel: () => void;
}) {
  const [form, setForm] = useState(initial);
  const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30';
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
        {form.title ? 'Edit Deadline' : 'New Deadline'} — {companyName}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
          <input className={ic} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. ROC Annual Filing" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Due Date *</label>
          <input className={ic} type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
          <input className={ic} value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} placeholder="Person or team" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <textarea className={ic} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => form.title && form.due_date && onSave(form)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white bg-green-700">
          <Check className="w-3.5 h-3.5" /> Save
        </button>
        <button onClick={onCancel} className="px-4 py-2 text-xs font-medium rounded-lg bg-gray-200 text-gray-600">
          <X className="w-3.5 h-3.5 inline mr-1" /> Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main calendar component ──────────────────────────────────────────────────

interface Props {
  companyId?: string;
  companyName?: string;
  allCompanies?: { id: string; name: string }[];
  compact?: boolean;
}

export default function CompanyCalendar({ companyId, companyName = 'All Companies', allCompanies: _ac = [], compact = false }: Props) {
  const [events, setEvents, loading] = useEvents(companyId);
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventsMap = useMemo(() => {
    const m = new Map<string, CalEvent[]>();
    events.forEach(e => {
      const k = e.due_date;
      if (!k) return;
      const list = m.get(k) ?? [];
      list.push(e);
      m.set(k, list);
    });
    return m;
  }, [events]);

  const selectedEvents = selected ? (eventsMap.get(selected) ?? []) : [];

  const upcoming = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return [...events]
      .filter(e => e.due_date >= today)
      .sort((a, b) => a.due_date.localeCompare(b.due_date))
      .slice(0, 10);
  }, [events]);

  const addEvent = (form: FormState) => {
    const cid = companyId ?? '';
    setEvents([...events, { id: genId(), companyId: cid, companyName: companyName, ...form }]);
    setCreating(false);
  };

  const updateEvent = (form: FormState) => {
    if (!editing) return;
    setEvents(events.map(e => e.id === editing.id ? { ...e, ...form } : e));
    setEditing(null);
  };

  const deleteEvent = (id: string) => {
    if (!confirm('Delete this deadline?')) return;
    setEvents(events.filter(e => e.id !== id));
  };

  const createForDate = (dateStr: string) => {
    setSelected(dateStr);
    setCreating(true);
    setEditing(null);
    setBulkOpen(false);
  };

  const handleBulkImport = (rows: Partial<CalEvent>[]) => {
    const cid = companyId ?? '';
    const newEvents = rows.map(r => ({
      id: genId(),
      companyId: cid,
      companyName: companyName,
      title: r.title ?? '',
      due_date: r.due_date ?? '',
      assigned_to: r.assigned_to ?? '',
      notes: r.notes ?? '',
    }));
    setEvents([...events, ...newEvents]);
    setBulkOpen(false);
  };

  const DAYS_SHORT = compact ? ['M','T','W','T','F','S','S'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrent(d => subMonths(d, 1))}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <h3 className={cn('font-semibold text-gray-800', compact ? 'text-sm min-w-[130px] text-center' : 'text-base min-w-[160px] text-center')}>
            {format(current, compact ? 'MMM yyyy' : 'MMMM yyyy')}
          </h3>
          <button onClick={() => setCurrent(d => addMonths(d, 1))}
            className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setCurrent(new Date())}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
            Today
          </button>
        </div>
        {companyId && (
          <div className="flex items-center gap-2">
            <button onClick={() => { setBulkOpen(v => !v); setCreating(false); setEditing(null); }}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                bulkOpen
                  ? 'border-green-700 text-green-700 bg-green-50'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              )}>
              <Upload className="w-3.5 h-3.5" /> Bulk Upload
            </button>
            <button onClick={() => { setCreating(true); setEditing(null); setBulkOpen(false); setSelected(format(new Date(), 'yyyy-MM-dd')); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-green-700">
              <Plus className="w-3.5 h-3.5" /> Add Deadline
            </button>
          </div>
        )}
      </div>

      {/* Bulk upload panel */}
      {bulkOpen && companyId && (
        <BulkUploadPanel
          companyId={companyId}
          companyName={companyName}
          onImport={handleBulkImport}
          onClose={() => setBulkOpen(false)}
        />
      )}

      {/* Create / Edit form */}
      {(creating || editing) && (
        <EventForm
          initial={editing ? { title: editing.title, assigned_to: editing.assigned_to, notes: editing.notes, due_date: editing.due_date } : { ...BLANK, due_date: selected ?? format(new Date(), 'yyyy-MM-dd') }}
          companyId={companyId ?? ''}
          companyName={companyName}
          onSave={editing ? updateEvent : addEvent}
          onCancel={() => { setCreating(false); setEditing(null); }}
        />
      )}

      {loading && (
        <div className="text-center py-8 text-gray-400 text-sm">Loading deadlines…</div>
      )}

      {!loading && (
        <div className={cn('grid gap-4', !compact && 'lg:grid-cols-[1fr_280px]')}>
          {/* Calendar grid */}
          <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
            <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
              {DAYS_SHORT.map((d, i) => (
                <div key={i} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayEvents = eventsMap.get(dateStr) ?? [];
                const inMonth = isSameMonth(day, current);
                const isSelected = selected === dateStr;
                const today = isToday(day);
                return (
                  <div key={i} onClick={() => setSelected(isSelected ? null : dateStr)}
                    className={cn(
                      'border-b border-r border-gray-100 cursor-pointer transition-colors',
                      compact ? 'min-h-[60px] p-1' : 'min-h-[80px] p-1.5',
                      !inMonth && 'opacity-30',
                      isSelected && 'ring-2 ring-inset ring-green-600 z-10',
                      'hover:bg-green-50/50',
                    )}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={cn(
                        'inline-flex items-center justify-center rounded-full font-medium',
                        compact ? 'w-5 h-5 text-[10px]' : 'w-6 h-6 text-xs',
                        today ? 'text-white bg-green-700' : 'text-gray-700',
                      )}>
                        {format(day, 'd')}
                      </span>
                      {dayEvents.length > 0 && (
                        <button onClick={e => { e.stopPropagation(); createForDate(dateStr); }}
                          className="opacity-0 hover:opacity-100 group-hover:opacity-100 p-0.5 rounded hover:bg-green-100 text-green-700 transition-opacity">
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <div className="space-y-0.5">
                      {dayEvents.slice(0, compact ? 1 : 2).map(e => {
                        const color = companyId ? '#2D6A4F' : companyColor(e.companyId);
                        return (
                          <div key={e.id} onClick={ev => { ev.stopPropagation(); setSelected(dateStr); setEditing(null); setCreating(false); }}
                            className={cn('truncate rounded px-1 text-white leading-tight', compact ? 'text-[9px] py-px' : 'text-[10px] py-0.5')}
                            style={{ backgroundColor: color }}
                            title={e.title}>
                            {!companyId && <span className="opacity-70">{e.companyName.split(' ')[0]} · </span>}
                            {e.title}
                          </div>
                        );
                      })}
                      {dayEvents.length > (compact ? 1 : 2) && (
                        <div className="text-[9px] text-gray-400 px-1">+{dayEvents.length - (compact ? 1 : 2)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Side panel */}
          {!compact && (
            <div className="space-y-3">
              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-600">
                    {selected ? format(parseISO(selected), 'EEE, d MMM yyyy') : 'Select a date'}
                  </p>
                  {selected && (
                    <button onClick={() => createForDate(selected)}
                      className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-white bg-green-700">
                      <Plus className="w-3 h-3" /> Add
                    </button>
                  )}
                </div>
                <div className="p-3 space-y-2 min-h-[80px]">
                  {!selected && <p className="text-xs text-gray-400 text-center pt-4">Click any date</p>}
                  {selected && selectedEvents.length === 0 && <p className="text-xs text-gray-400 text-center pt-4">No deadlines — click Add</p>}
                  {selectedEvents.map(e => (
                    <div key={e.id} className="rounded-lg border border-gray-100 p-3 group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-800 truncate">{e.title}</p>
                          {!companyId && <span className="text-[10px] px-1.5 py-0.5 rounded-full text-white mr-1"
                            style={{ backgroundColor: companyColor(e.companyId) }}>{e.companyName}</span>}
                          {e.assigned_to && <p className="text-[10px] text-gray-400 mt-0.5">👤 {e.assigned_to}</p>}
                          {e.notes && <p className="text-[10px] text-gray-400 italic mt-0.5 truncate">{e.notes}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          {companyId && (
                            <button onClick={() => { setEditing(e); setCreating(false); }} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3 h-3" /></button>
                          )}
                          <button onClick={() => deleteEvent(e.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-600">Upcoming Deadlines</p>
                </div>
                <div className="divide-y divide-gray-50 max-h-[300px] overflow-y-auto">
                  {upcoming.length === 0 && <p className="text-xs text-gray-400 p-4 text-center">No upcoming deadlines</p>}
                  {upcoming.map(e => (
                    <button key={e.id} onClick={() => setSelected(e.due_date)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50/50 transition-colors text-left">
                      <div className="w-9 text-center shrink-0">
                        <p className="text-base font-bold leading-none text-green-700">{format(parseISO(e.due_date), 'd')}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{format(parseISO(e.due_date), 'MMM')}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-800 truncate">{e.title}</p>
                        {!companyId && (
                          <span className="text-[10px] px-1.5 py-px rounded-full text-white"
                            style={{ backgroundColor: companyColor(e.companyId) }}>{e.companyName}</span>
                        )}
                        {e.assigned_to && <p className="text-[10px] text-gray-400 truncate">{e.assigned_to}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Compact: upcoming list */}
      {compact && !loading && upcoming.length > 0 && (
        <div className="rounded-xl border border-gray-100 bg-white overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Upcoming Deadlines</p>
          </div>
          <div className="divide-y divide-gray-50 max-h-[200px] overflow-y-auto">
            {upcoming.map(e => (
              <div key={e.id} className="flex items-center gap-2 px-3 py-2 group hover:bg-green-50/30">
                <div className="shrink-0 text-center w-8">
                  <p className="text-sm font-bold text-green-700 leading-none">{format(parseISO(e.due_date), 'd')}</p>
                  <p className="text-[9px] text-gray-400 uppercase">{format(parseISO(e.due_date), 'MMM')}</p>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{e.title}</p>
                  {e.assigned_to && <p className="text-[10px] text-gray-400 truncate">{e.assigned_to}</p>}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditing(e); setCreating(false); }} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => deleteEvent(e.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
