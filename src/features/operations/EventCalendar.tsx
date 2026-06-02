import { useState, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, X, Video, MapPin,
  Users, Clock, Calendar, AlignLeft,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { FirmEvent, EventType } from '../../data/types';

const EVENT_COLORS: Record<EventType, { bg: string; text: string; dot: string }> = {
  board_meeting:   { bg: 'bg-purple-100', text: 'text-purple-800', dot: '#9333EA' },
  lp_meeting:      { bg: 'bg-blue-100',   text: 'text-blue-800',   dot: '#2563EB' },
  demo_day:        { bg: 'bg-lime-100',   text: 'text-lime-800',   dot: '#65A30D' },
  conference:      { bg: 'bg-orange-100', text: 'text-orange-800', dot: '#EA580C' },
  team_offsite:    { bg: 'bg-teal-100',   text: 'text-teal-800',   dot: '#0D9488' },
  founder_meeting: { bg: 'bg-green-100',  text: 'text-green-800',  dot: '#16A34A' },
  ic_meeting:      { bg: 'bg-slate-100',  text: 'text-slate-800',  dot: '#475569' },
  other:           { bg: 'bg-gray-100',   text: 'text-gray-700',   dot: '#6B7280' },
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  board_meeting:   'Board Meeting',
  lp_meeting:      'LP Meeting',
  demo_day:        'Demo Day',
  conference:      'Conference',
  team_offsite:    'Team Offsite',
  founder_meeting: 'Founder Meeting',
  ic_meeting:      'IC Meeting',
  other:           'Other',
};

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function fmtDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

interface AddEventModalProps {
  initialDate?: string;
  companies: Array<{ id: string; name: string }>;
  onSave: (e: FirmEvent) => void;
  onClose: () => void;
}

function AddEventModal({ initialDate, companies, onSave, onClose }: AddEventModalProps) {
  const [title, setTitle]             = useState('');
  const [type, setType]               = useState<EventType>('board_meeting');
  const [date, setDate]               = useState(initialDate ?? toDateKey(new Date()));
  const [endDate, setEndDate]         = useState('');
  const [time, setTime]               = useState('');
  const [location, setLocation]       = useState('');
  const [isVirtual, setIsVirtual]     = useState(false);
  const [meetingLink, setMeetingLink] = useState('');
  const [companyId, setCompanyId]     = useState('');
  const [attendees, setAttendees]     = useState<string[]>([]);
  const [newAttendee, setNewAttendee] = useState('');
  const [agenda, setAgenda]           = useState('');
  const [notes, setNotes]             = useState('');
  const [reminderDays, setReminderDays] = useState(1);

  const addAttendee = () => {
    if (newAttendee.trim() && !attendees.includes(newAttendee.trim())) {
      setAttendees(prev => [...prev, newAttendee.trim()]);
      setNewAttendee('');
    }
  };

  const removeAttendee = (name: string) => setAttendees(prev => prev.filter((a: string) => a !== name));

  const handleSave = () => {
    if (!title || !date) return;
    onSave({
      id: generateId(), title, type, date,
      endDate: endDate || undefined, time: time || undefined,
      location, isVirtual, meetingLink: isVirtual ? meetingLink : undefined,
      companyId: companyId || undefined, attendees, agenda, notes,
      reminderDays, createdBy: 'Admin', createdAt: new Date().toISOString(),
    });
    onClose();
  };

  const iCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500";
  const bSt  = { borderColor: '#D4EDAA' };
  const lCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col" style={{ borderTop: '4px solid #1C4B42' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add Event</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div><label className={lCls}>Title *</label>
            <input type="text" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} className={iCls} style={bSt} placeholder="Event title" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lCls}>Type</label>
              <select value={type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as EventType)} className={iCls} style={bSt}>
                {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((k: EventType) => <option key={k} value={k}>{EVENT_TYPE_LABELS[k]}</option>)}
              </select>
            </div>
            <div><label className={lCls}>Date *</label>
              <input type="date" value={date} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDate(e.target.value)} className={iCls} style={bSt} />
            </div>
            <div><label className={lCls}>End Date</label>
              <input type="date" value={endDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEndDate(e.target.value)} className={iCls} style={bSt} />
            </div>
            <div><label className={lCls}>Time</label>
              <input type="time" value={time} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTime(e.target.value)} className={iCls} style={bSt} />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isVirtual} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsVirtual(e.target.checked)} className="w-4 h-4 accent-green-600" />
            <span className="text-sm text-gray-700">Virtual event</span>
          </label>
          {isVirtual
            ? <div><label className={lCls}>Meeting Link</label><input type="url" value={meetingLink} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setMeetingLink(e.target.value)} className={iCls} style={bSt} placeholder="https://meet.google.com/..." /></div>
            : <div><label className={lCls}>Location</label><input type="text" value={location} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)} className={iCls} style={bSt} placeholder="Office / venue" /></div>
          }
          <div><label className={lCls}>Company (optional)</label>
            <select value={companyId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCompanyId(e.target.value)} className={iCls} style={bSt}>
              <option value="">— None —</option>
              {companies.map((c: { id: string; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lCls}>Attendees</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {attendees.map((a: string) => (
                <span key={a} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-100">
                  {a}<button onClick={() => removeAttendee(a)} className="text-green-500 hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newAttendee} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAttendee(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addAttendee()} className={`${iCls} flex-1`} style={bSt} placeholder="Add attendee" />
              <button onClick={addAttendee} className="px-3 py-2 text-xs rounded-lg border font-medium" style={{ borderColor: '#86CA0F', color: '#1C4B42' }}>Add</button>
            </div>
          </div>
          <div><label className={lCls}>Agenda</label>
            <textarea rows={3} value={agenda} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAgenda(e.target.value)} className={`${iCls} resize-none`} style={bSt} placeholder="Meeting agenda..." />
          </div>
          <div><label className={lCls}>Notes</label>
            <textarea rows={2} value={notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)} className={`${iCls} resize-none`} style={bSt} placeholder="Internal notes..." />
          </div>
          <div><label className={lCls}>Reminder (days before)</label>
            <input type="number" min={0} max={30} value={reminderDays} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReminderDays(Number(e.target.value))} className={iCls} style={bSt} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={handleSave} disabled={!title || !date} className="px-5 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-40" style={{ backgroundColor: '#1C4B42' }}>Save Event</button>
        </div>
      </div>
    </div>
  );
}

interface DayPopupProps {
  dateKey: string;
  events: FirmEvent[];
  onAddEvent: () => void;
  onClose: () => void;
}

function DayPopup({ dateKey, events, onAddEvent, onClose }: DayPopupProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/20 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={(e: React.MouseEvent) => e.stopPropagation()} style={{ borderTop: '3px solid #1C4B42' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-semibold text-gray-900">{fmtDisplayDate(dateKey)}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-2 max-h-72 overflow-y-auto">
          {events.length === 0
            ? <p className="text-sm text-gray-400 italic">No events on this day.</p>
            : events.map((ev: FirmEvent) => {
                const c = EVENT_COLORS[ev.type];
                return (
                  <div key={ev.id} className={`rounded-lg p-3 ${c.bg}`}>
                    <p className={`text-xs font-semibold ${c.text}`}>{EVENT_TYPE_LABELS[ev.type]}</p>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{ev.title}</p>
                    {ev.time && <p className="text-xs text-gray-500 mt-0.5"><Clock className="w-3 h-3 inline mr-1" />{ev.time}</p>}
                    {ev.isVirtual
                      ? <p className="text-xs text-gray-500"><Video className="w-3 h-3 inline mr-1" />Virtual</p>
                      : ev.location && <p className="text-xs text-gray-500"><MapPin className="w-3 h-3 inline mr-1" />{ev.location}</p>
                    }
                  </div>
                );
              })
          }
        </div>
        <div className="px-5 py-3 border-t border-gray-100">
          <button onClick={() => { onAddEvent(); onClose(); }} className="flex items-center gap-2 text-sm font-medium w-full justify-center py-2 rounded-lg" style={{ color: '#1C4B42', backgroundColor: '#F0F7E6' }}>
            <Plus className="w-4 h-4" /> Add Event for this day
          </button>
        </div>
      </div>
    </div>
  );
}

export default function EventCalendar() {
  const { store, addFirmEvent, deleteFirmEvent } = useApp();
  const events: FirmEvent[] = store.firmEvents ?? [];
  const companies = store.companies ?? [];

  const now = new Date();
  const [viewYear, setViewYear]     = useState(now.getFullYear());
  const [viewMonth, setViewMonth]   = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addInitialDate, setAddInitialDate] = useState<string | undefined>(undefined);

  const eventsByDate = useMemo(() => {
    const map: Record<string, FirmEvent[]> = {};
    events.forEach((ev: FirmEvent) => { if (!map[ev.date]) map[ev.date] = []; map[ev.date].push(ev); });
    return map;
  }, [events]);

  const upcomingEvents = useMemo(() => {
    const todayKey = toDateKey(now);
    const limit = new Date(now); limit.setDate(limit.getDate() + 30);
    const limitKey = toDateKey(limit);
    return [...events].filter((ev: FirmEvent) => ev.date >= todayKey && ev.date <= limitKey).sort((a: FirmEvent, b: FirmEvent) => a.date.localeCompare(b.date));
  }, [events]);

  const prevMonth = () => { if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); } else setViewMonth(m => m + 1); };
  const goToday   = () => { setViewYear(now.getFullYear()); setViewMonth(now.getMonth()); };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay    = getFirstDayOfWeek(viewYear, viewMonth);
  const todayKey    = toDateKey(now);

  const calendarCells: Array<{ key: string | null; day: number | null }> = [];
  for (let i = 0; i < firstDay; i++) calendarCells.push({ key: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    calendarCells.push({ key, day: d });
  }

  const selectedDayEvents = selectedDay ? (eventsByDate[selectedDay] ?? []) : [];

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: '#F6FAF7' }}>
      <div className="border-b px-6 md:px-10 py-6 bg-white/70" style={{ borderColor: '#D4EDAA' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide" style={{ color: '#1C4B42' }}>Event Calendar</h1>
          <button onClick={() => { setAddInitialDate(undefined); setShowAddModal(true); }} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm" style={{ backgroundColor: '#1C4B42' }}>
            <Plus className="w-4 h-4" /> Add Event
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 md:px-10 py-8 flex flex-col xl:flex-row gap-8">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-5">
            <button onClick={prevMonth} className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-100"><ChevronLeft className="w-4 h-4 text-gray-600" /></button>
            <span className="flex-1 text-center text-base font-bold text-gray-800">{MONTHS[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} className="w-8 h-8 rounded-full flex items-center justify-center border border-gray-200 hover:bg-gray-100"><ChevronRight className="w-4 h-4 text-gray-600" /></button>
            <button onClick={goToday} className="px-3 py-1.5 text-xs font-medium rounded-lg border" style={{ borderColor: '#86CA0F', color: '#1C4B42' }}>Today</button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d: string) => <div key={d} className="text-center text-xs font-semibold text-gray-400 py-2">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((cell: { key: string | null; day: number | null }, idx: number) => {
              if (!cell.key || !cell.day) return <div key={`e-${idx}`} className="h-20 rounded-xl" />;
              const cellEvents = eventsByDate[cell.key] ?? [];
              const isToday = cell.key === todayKey;
              return (
                <div key={cell.key} onClick={() => setSelectedDay(cell.key)}
                  className={`h-20 rounded-xl p-1.5 cursor-pointer border transition-shadow hover:shadow-md ${isToday ? 'border-2' : 'border border-gray-100 hover:border-green-200 bg-white'}`}
                  style={isToday ? { borderColor: '#1C4B42', backgroundColor: '#F0F7E6' } : {}}>
                  <div className={`text-xs font-semibold mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? 'text-white' : 'text-gray-600'}`}
                    style={isToday ? { backgroundColor: '#1C4B42' } : {}}>{cell.day}</div>
                  <div className="space-y-0.5 overflow-hidden">
                    {cellEvents.slice(0, 2).map((ev: FirmEvent) => {
                      const c = EVENT_COLORS[ev.type];
                      return <div key={ev.id} className={`text-xs px-1 py-0.5 rounded truncate ${c.bg} ${c.text} leading-tight`}>{ev.title}</div>;
                    })}
                    {cellEvents.length > 2 && <div className="text-xs text-gray-400">+{cellEvents.length - 2}</div>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            {(Object.keys(EVENT_COLORS) as EventType[]).map((k: EventType) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: EVENT_COLORS[k].dot }} />
                <span className="text-xs text-gray-500">{EVENT_TYPE_LABELS[k]}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="w-full xl:w-80 shrink-0">
          <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4" style={{ color: '#1C4B42' }} /> Upcoming (30 days)
          </h2>
          {upcomingEvents.length === 0
            ? <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center"><Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" /><p className="text-sm text-gray-400">No upcoming events</p></div>
            : <div className="space-y-2">
                {upcomingEvents.map((ev: FirmEvent) => {
                  const c = EVENT_COLORS[ev.type];
                  return (
                    <div key={ev.id} className={`rounded-xl p-4 border ${c.bg}`} style={{ borderColor: EVENT_COLORS[ev.type].dot + '30' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-semibold ${c.text}`}>{EVENT_TYPE_LABELS[ev.type]}</p>
                          <p className="text-sm font-medium text-gray-900 truncate">{ev.title}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{fmtDisplayDate(ev.date)}{ev.time && ` · ${ev.time}`}</p>
                          {ev.isVirtual
                            ? <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Video className="w-3 h-3" /> Virtual</p>
                            : ev.location && <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" /> {ev.location}</p>
                          }
                          {ev.attendees.length > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Users className="w-3 h-3" /> {ev.attendees.slice(0, 2).join(', ')}{ev.attendees.length > 2 ? ` +${ev.attendees.length - 2}` : ''}
                            </p>
                          )}
                        </div>
                        <button onClick={() => { if (window.confirm('Delete event?')) deleteFirmEvent(ev.id); }} className="text-gray-300 hover:text-red-400 shrink-0">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {ev.agenda && (
                        <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
                          <AlignLeft className="w-3 h-3 mt-0.5 shrink-0" /><span className="line-clamp-2">{ev.agenda}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
          }
        </div>
      </div>

      {selectedDay && (
        <DayPopup dateKey={selectedDay} events={selectedDayEvents}
          onAddEvent={() => { setAddInitialDate(selectedDay); setShowAddModal(true); }}
          onClose={() => setSelectedDay(null)} />
      )}

      {showAddModal && (
        <AddEventModal initialDate={addInitialDate} companies={companies}
          onSave={(ev: FirmEvent) => { addFirmEvent(ev); setShowAddModal(false); }}
          onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}
