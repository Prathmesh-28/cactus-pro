import { useState, useEffect, useCallback } from 'react';
import {
  addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval,
  startOfWeek, endOfWeek, format, isSameDay, isSameMonth, isToday, parseISO,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Pencil, Trash2, X, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { kvGet, kvSet } from '../../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ComplianceEvent {
  id: string;
  due_date: string;      // ISO yyyy-MM-dd
  title: string;
  assigned_to: string;
  notes: string;
}

function genId() { return `e_${Math.random().toString(36).slice(2)}_${Date.now()}`; }

const EVT = 'fin-compliance-changed';
const memCache = { current: null as ComplianceEvent[] | null };

function useEvents() {
  const [events, setEvents] = useState<ComplianceEvent[]>(memCache.current ?? []);
  const [loaded, setLoaded] = useState(memCache.current !== null);

  const refresh = useCallback(async () => {
    const v = await kvGet('finance', 'fin_compliance_events');
    const data = Array.isArray(v) ? (v as ComplianceEvent[]) : DEFAULT_EVENTS;
    memCache.current = data;
    setEvents(data);
    setLoaded(true);
  }, []);

  useEffect(() => { void refresh(); }, []); // eslint-disable-line
  useEffect(() => {
    const h = () => { if (memCache.current) setEvents([...memCache.current]); };
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);

  const save = (next: ComplianceEvent[]) => {
    memCache.current = next;
    setEvents(next);
    window.dispatchEvent(new CustomEvent(EVT));
    kvSet('finance', 'fin_compliance_events', next).catch(() => {});
  };

  return [events, save, loaded] as const;
}

const DEFAULT_EVENTS: ComplianceEvent[] = [
  { id: genId(), due_date: format(new Date(), 'yyyy-MM-') + '10', title: 'TDS Filing',        assigned_to: 'Finance Team', notes: 'Monthly TDS return' },
  { id: genId(), due_date: format(new Date(), 'yyyy-MM-') + '15', title: 'GST Return (GSTR-3B)', assigned_to: 'Finance Team', notes: '' },
  { id: genId(), due_date: format(new Date(), 'yyyy-MM-') + '20', title: 'Board Meeting',      assigned_to: 'All Partners',  notes: 'Q1 review' },
  { id: genId(), due_date: format(addMonths(new Date(), 1), 'yyyy-MM-') + '07', title: 'LP Report Due',   assigned_to: 'Reporting Team', notes: 'Quarterly LP update' },
];

// ─── Event form ───────────────────────────────────────────────────────────────

const BLANK: Omit<ComplianceEvent, 'id'> = { due_date: format(new Date(), 'yyyy-MM-dd'), title: '', assigned_to: '', notes: '' };

function EventForm({ initial, onSave, onCancel }:
  { initial: Omit<ComplianceEvent,'id'>; onSave: (e: Omit<ComplianceEvent,'id'>) => void; onCancel: () => void }) {
  const [form, setForm] = useState(initial);
  const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500/30';
  return (
    <div className="border rounded-xl p-4 bg-white space-y-3 shadow-sm" style={{ borderColor: '#E2E8F0' }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Title *</label>
          <input className={ic} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Due Date</label>
          <input className={ic} type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
          <input className={ic} value={form.assigned_to} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
          <input className={ic} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => form.title && onSave(form)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg text-white"
          style={{ backgroundColor: '#1E293B' }}>
          <Check className="w-3.5 h-3.5" /> Save
        </button>
        <button onClick={onCancel} className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600">
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Calendar ────────────────────────────────────────────────────────────────

export default function CompliancesSection() {
  const [events, setEvents, loaded] = useEvents();
  const [current, setCurrent] = useState(new Date());
  const [selected, setSelected] = useState<Date | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ComplianceEvent | null>(null);

  const monthStart = startOfMonth(current);
  const monthEnd   = endOfMonth(current);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd,     { weekStartsOn: 1 });
  const days       = eachDayOfInterval({ start: calStart, end: calEnd });

  const eventsOn = (day: Date) => events.filter(e => {
    try { return isSameDay(parseISO(e.due_date), day); } catch { return false; }
  });

  const selectedEvents = selected ? eventsOn(selected) : [];

  const addEvent = (data: Omit<ComplianceEvent,'id'>) => {
    setEvents([...events, { id: genId(), ...data }]);
    setCreating(false);
  };

  const saveEdit = (data: Omit<ComplianceEvent,'id'>) => {
    if (!editing) return;
    setEvents(events.map(e => e.id === editing.id ? { ...e, ...data } : e));
    setEditing(null);
  };

  const deleteEvent = (id: string) => setEvents(events.filter(e => e.id !== id));

  const upcomingEvents = [...events]
    .filter(e => { try { return parseISO(e.due_date) >= new Date(); } catch { return false; } })
    .sort((a, b) => a.due_date.localeCompare(b.due_date))
    .slice(0, 8);

  if (!loaded) return <div className="flex items-center justify-center min-h-[200px] text-sm text-gray-400">Loading…</div>;

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="border-b px-6 md:px-10 py-6 bg-white/50" style={{ borderColor: '#E2E8F0' }}>
        <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide text-gray-900">Compliances</h1>
        <p className="text-xs text-gray-400 mt-1 italic">Click a date to add or view events</p>
      </div>

      <div className="px-6 md:px-10 py-8 space-y-6">

        {/* Add form */}
        {creating && (
          <EventForm
            initial={{ ...BLANK, due_date: selected ? format(selected, 'yyyy-MM-dd') : BLANK.due_date }}
            onSave={addEvent}
            onCancel={() => setCreating(false)}
          />
        )}
        {editing && (
          <EventForm initial={editing} onSave={saveEdit} onCancel={() => setEditing(null)} />
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Calendar */}
          <div className="lg:col-span-2 rounded-xl border bg-white shadow-sm overflow-hidden" style={{ borderColor: '#E2E8F0' }}>

            {/* Nav */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
              <button onClick={() => setCurrent(d => subMonths(d, 1))}
                className="p-1.5 rounded-lg hover:bg-white transition-colors text-gray-600">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h2 className="font-serif text-lg text-gray-900 tracking-wide">{format(current, 'MMMM yyyy')}</h2>
              <button onClick={() => setCurrent(d => addMonths(d, 1))}
                className="p-1.5 rounded-lg hover:bg-white transition-colors text-gray-600">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day names */}
            <div className="grid grid-cols-7 border-b" style={{ borderColor: '#E2E8F0' }}>
              {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">{d}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const dayEvents = eventsOn(day);
                const isSelected = selected && isSameDay(day, selected);
                const inMonth = isSameMonth(day, current);
                return (
                  <button key={i}
                    onClick={() => { setSelected(isSameDay(day, selected ?? new Date(0)) ? null : day); }}
                    className={cn(
                      'relative min-h-[72px] p-2 border-b border-r text-left transition-colors',
                      i % 7 === 6 && 'border-r-0',
                      !inMonth && 'opacity-30',
                      isSelected && 'ring-2 ring-inset z-10',
                      isToday(day) && 'bg-[#F8FAFC]',
                    )}
                    style={{ borderColor: '#F8FAFC', ...(isSelected ? { '--tw-ring-color': '#1E293B' } as React.CSSProperties : {}) }}>
                    <span className={cn(
                      'inline-flex w-6 h-6 items-center justify-center rounded-full text-xs font-medium',
                      isToday(day) ? 'text-white' : 'text-gray-700',
                    )} style={isToday(day) ? { backgroundColor: '#1E293B' } : {}}>
                      {format(day, 'd')}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 2).map(e => (
                        <div key={e.id} className="truncate text-[10px] font-medium px-1 py-0.5 rounded"
                          style={{ backgroundColor: '#E2E8F0', color: '#2D6A4F' }}>
                          {e.title}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <div className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 2} more</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right panel: selected day events + upcoming */}
          <div className="space-y-4">
            {/* Selected day panel */}
            <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: '#E2E8F0' }}>
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
                <h3 className="text-sm font-semibold text-gray-700">
                  {selected ? format(selected, 'EEEE, d MMM yyyy') : 'Select a date'}
                </h3>
                {selected && (
                  <button onClick={() => { setCreating(true); setEditing(null); }}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-white"
                    style={{ backgroundColor: '#1E293B' }}>
                    <Plus className="w-3 h-3" /> Add
                  </button>
                )}
              </div>
              <div className="p-4 space-y-3 min-h-[100px]">
                {!selected && <p className="text-xs text-gray-400 text-center pt-4">Click any date on the calendar</p>}
                {selected && selectedEvents.length === 0 && <p className="text-xs text-gray-400 text-center pt-4">No events — click Add</p>}
                {selectedEvents.map(e => (
                  <div key={e.id} className="rounded-lg border p-3 group" style={{ borderColor: '#E2E8F0' }}>
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">{e.title}</p>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        <button onClick={() => { setEditing(e); setCreating(false); }} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => deleteEvent(e.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>
                    {e.assigned_to && <p className="text-xs text-gray-500 mt-1">👤 {e.assigned_to}</p>}
                    {e.notes && <p className="text-xs text-gray-400 mt-0.5 italic">{e.notes}</p>}
                  </div>
                ))}
              </div>
            </div>

            {/* Upcoming events */}
            <div className="rounded-xl border bg-white shadow-sm" style={{ borderColor: '#E2E8F0' }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
                <h3 className="text-sm font-semibold text-gray-700">Upcoming Deadlines</h3>
              </div>
              <div className="divide-y" style={{ borderColor: '#F8FAFC' }}>
                {upcomingEvents.length === 0 && <p className="text-xs text-gray-400 p-4 text-center">No upcoming events</p>}
                {upcomingEvents.map(e => (
                  <div key={e.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors">
                    <div className="w-10 text-center shrink-0">
                      <p className="text-lg font-serif font-bold leading-none" style={{ color: '#2D6A4F' }}>
                        {format(parseISO(e.due_date), 'd')}
                      </p>
                      <p className="text-[10px] text-gray-400 uppercase">{format(parseISO(e.due_date), 'MMM')}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{e.title}</p>
                      {e.assigned_to && <p className="text-[10px] text-gray-400 truncate">{e.assigned_to}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
