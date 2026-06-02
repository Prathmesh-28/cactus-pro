/**
 * CompanyCalendar — reusable compliance calendar scoped to a company (or all companies).
 * - companyId = undefined  → shows ALL portfolio deadlines (Portfolio page bottom section)
 * - companyId = "c1"       → shows only that company's deadlines (CompanyDrawer tab)
 */
import { useMemo, useState } from 'react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, format, isSameMonth, isToday, parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

// ─── Shared localStorage event store ─────────────────────────────────────────

export interface CalEvent {
  id: string;
  companyId: string;       // company the deadline belongs to
  companyName: string;
  due_date: string;        // yyyy-MM-dd
  title: string;
  assigned_to: string;
  notes: string;
}

const STORE_KEY = 'portfolio_compliance_events';

function genId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `e_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function loadEvents(): CalEvent[] {
  try { const s = localStorage.getItem(STORE_KEY); return s ? JSON.parse(s) : []; } catch { return []; }
}

export function saveEvents(events: CalEvent[]) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(events));
    window.dispatchEvent(new CustomEvent('portfolio-cal-changed'));
  } catch {}
}

function useEvents(companyId?: string): [CalEvent[], (e: CalEvent[]) => void] {
  const [all, setAll] = useState<CalEvent[]>(loadEvents);

  const listen = () => {
    const handler = () => setAll(loadEvents());
    window.addEventListener('portfolio-cal-changed', handler);
    return () => window.removeEventListener('portfolio-cal-changed', handler);
  };
  useMemo(listen, []); // eslint-disable-line

  const filtered = companyId ? all.filter(e => e.companyId === companyId) : all;
  const save = (next: CalEvent[]) => {
    const kept = companyId ? all.filter(e => e.companyId !== companyId) : [];
    saveEvents([...kept, ...next]);
    setAll(loadEvents());
  };
  return [filtered, save];
}

// ─── Colour palette per company (stable by id hash) ──────────────────────────

const PALETTE = [
  '#3B6D11','#5A9E1B','#1D4ED8','#7C3AED','#DB2777',
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
  /** If provided, scopes calendar to one company. If omitted, shows all companies. */
  companyId?: string;
  companyName?: string;
  /** List of all companies for "all" mode — used to show company badge on events */
  allCompanies?: { id: string; name: string }[];
  compact?: boolean;
}

export default function CompanyCalendar({ companyId, companyName = 'All Companies', allCompanies: _ac = [], compact = false }: Props) {
  const [events, setEvents] = useEvents(companyId);
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<string | null>(null);   // yyyy-MM-dd
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CalEvent | null>(null);

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
    const cname = companyId ? companyName : companyName;
    setEvents([...events, { id: genId(), companyId: cid, companyName: cname, ...form }]);
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
  };

  const DAYS_SHORT = compact ? ['M','T','W','T','F','S','S'] : ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

  return (
    <div className="space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
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
          <button onClick={() => { setCreating(true); setEditing(null); setSelected(format(new Date(), 'yyyy-MM-dd')); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-green-700">
            <Plus className="w-3.5 h-3.5" /> Add Deadline
          </button>
        )}
      </div>

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

      <div className={cn('grid gap-4', !compact && 'lg:grid-cols-[1fr_280px]')}>
        {/* Calendar grid */}
        <div className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm">
          {/* Day names */}
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-100">
            {DAYS_SHORT.map((d, i) => (
              <div key={i} className="py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-gray-400">{d}</div>
            ))}
          </div>
          {/* Days */}
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
                      const color = companyId ? '#3B6D11' : companyColor(e.companyId);
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

        {/* Side panel — selected day + upcoming */}
        {!compact && (
          <div className="space-y-3">
            {/* Selected day */}
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

            {/* Upcoming */}
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

      {/* Compact mode: upcoming list below */}
      {compact && upcoming.length > 0 && (
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
