import { useState, useMemo } from 'react';
import {
  Plus, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle,
  FileText, DollarSign, Users, Calendar, X, Edit2, Save,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { CapitalEvent, CapEventType } from '../../data/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const CURRENT_FY_START = '2025-04-01';
const CURRENT_FY_END   = '2026-03-31';

function parseCrore(val: string): number {
  const n = parseFloat(val.replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : n;
}

// Amounts are stored and entered in Lakhs (forms say "₹L"). Format CONSISTENTLY in
// Lakhs — do NOT switch units at the 100 boundary, which made ₹99L and ₹101L render
// in different units (₹99L vs ₹1.01Cr) and corrupted summary cards/progress bars.
function fmtCr(val: string | number): string {
  const n = typeof val === 'string' ? parseCrore(val) : val;
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}L`;
}

function inFY(dateStr: string): boolean {
  return dateStr >= CURRENT_FY_START && dateStr <= CURRENT_FY_END;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_META: Record<
  CapitalEvent['status'],
  { label: string; bg: string; text: string }
> = {
  draft:    { label: 'Draft',    bg: 'bg-gray-100',   text: 'text-gray-600'  },
  sent:     { label: 'Sent',     bg: 'bg-blue-100',   text: 'text-blue-700'  },
  partial:  { label: 'Partial',  bg: 'bg-amber-100',  text: 'text-amber-700' },
  complete: { label: 'Complete', bg: 'bg-green-100',  text: 'text-green-700' },
};

function StatusBadge({ status }: { status: CapitalEvent['status'] }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

function TypeBadge({ type }: { type: CapEventType }) {
  return type === 'capital_call' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
      <DollarSign className="w-3 h-3" /> Call
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-700">
      <DollarSign className="w-3 h-3" /> Dist.
    </span>
  );
}

// ─── Derive event status from LP receipts ────────────────────────────────────

function deriveStatus(
  event: CapitalEvent,
): CapitalEvent['status'] {
  if (event.status === 'draft') return 'draft';
  const total = event.lpReceipts.length;
  if (total === 0) return event.status;
  const received = event.lpReceipts.filter(r => !!r.receivedAt).length;
  if (received === 0) return 'sent';
  if (received === total) return 'complete';
  return 'partial';
}

// ─── LP Receipt Row ───────────────────────────────────────────────────────────

interface LpReceiptRowProps {
  lpId: string;
  lpName: string;
  amount: string;
  receivedAt?: string;
  onSave: (lpId: string, receivedAt: string) => void;
}

function LpReceiptRow({ lpId, lpName, amount, receivedAt, onSave }: LpReceiptRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(receivedAt ?? today());

  const handleSave = () => {
    onSave(lpId, draft);
    setEditing(false);
  };

  const received = !!receivedAt;

  return (
    <tr className="border-b last:border-0 border-gray-100 hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-3 text-sm text-gray-800 font-medium">{lpName}</td>
      <td className="px-4 py-3 text-sm text-gray-700 tabular-nums">{fmtCr(amount)}</td>
      <td className="px-4 py-3 text-sm text-gray-500">
        {editing ? (
          <input
            type="date"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
          />
        ) : (
          receivedAt ? (
            <span className="text-green-700 font-medium">{receivedAt}</span>
          ) : (
            <span className="text-gray-400 italic">Pending</span>
          )
        )}
      </td>
      <td className="px-4 py-3">
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
          received ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
        }`}>
          {received ? 'Received' : 'Pending'}
        </span>
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="flex items-center gap-1 text-xs font-medium text-green-700 hover:text-green-900"
            >
              <Save className="w-3 h-3" /> Save
            </button>
            <button
              onClick={() => { setEditing(false); setDraft(receivedAt ?? today()); }}
              className="text-xs text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => { setEditing(true); setDraft(receivedAt ?? today()); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
          >
            <Edit2 className="w-3 h-3" />
            {received ? 'Edit' : 'Mark Received'}
          </button>
        )}
      </td>
    </tr>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────

interface EventCardProps {
  event: CapitalEvent;
  lps: Array<{ id: string; name: string }>;
  onUpdate?: (e: CapitalEvent) => void;
  onDelete?: (id: string) => void;
}

function EventCard({ event, lps, onUpdate, onDelete }: EventCardProps) {
  const [expanded, setExpanded] = useState(false);

  const lpMap = useMemo(() => {
    const m: Record<string, string> = {};
    lps.forEach(lp => { m[lp.id] = lp.name; });
    return m;
  }, [lps]);

  const handleReceiptSave = (lpId: string, receivedAt: string) => {
    const updated: CapitalEvent = {
      ...event,
      lpReceipts: event.lpReceipts.map(r =>
        r.lpId === lpId ? { ...r, receivedAt } : r
      ),
    };
    updated.status = deriveStatus(updated);
    onUpdate?.(updated);
  };

  const totalAmount = parseCrore(event.amount);
  const receivedCount = event.lpReceipts.filter(r => !!r.receivedAt).length;
  const totalCount = event.lpReceipts.length;
  const receivedAmount = event.lpReceipts
    .filter(r => !!r.receivedAt)
    .reduce((s, r) => s + parseCrore(r.amount), 0);

  const isOverdue = !['complete'].includes(event.status) && event.dueDate < today();

  return (
    <div
      className={`rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md ${
        isOverdue ? 'border-red-200' : 'border-gray-200'
      }`}
      style={{ borderColor: isOverdue ? undefined : '#E2E8F0' }}
    >
      {/* Header row */}
      <div
        className="flex flex-wrap items-center gap-3 px-5 py-4 cursor-pointer select-none"
        onClick={() => setExpanded(v => !v)}
      >
        <TypeBadge type={event.type} />
        <StatusBadge status={event.status} />

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{event.purpose || 'No purpose stated'}</p>
          <p className="text-xs text-gray-500 mt-0.5">{event.fund}</p>
        </div>

        <div className="flex items-center gap-5 text-sm">
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-gray-900 tabular-nums">{fmtCr(event.amount)}</p>
            <p className="text-xs text-gray-400">Total</p>
          </div>
          <div className="text-right hidden sm:block">
            <p className="font-semibold text-gray-700 tabular-nums">{fmtCr(receivedAmount)}</p>
            <p className="text-xs text-gray-400">Received</p>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users className="w-3.5 h-3.5" />
            {receivedCount}/{totalCount} LPs
          </div>
          <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
            <Calendar className="w-3.5 h-3.5" />
            Due {event.dueDate}
            {isOverdue && <AlertCircle className="w-3.5 h-3.5 ml-0.5" />}
          </div>
        </div>

        {onDelete && <button
          onClick={e => { e.stopPropagation(); onDelete(event.id); }}
          className="ml-1 text-gray-300 hover:text-red-400 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>}

        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
        }
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-5 pb-5" style={{ borderColor: '#E9F5D4' }}>
          {/* Meta grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 text-sm">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Notice Date</p>
              <p className="font-medium text-gray-800">{event.noticeDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Due Date</p>
              <p className={`font-medium ${isOverdue ? 'text-red-600' : 'text-gray-800'}`}>{event.dueDate}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Fund</p>
              <p className="font-medium text-gray-800">{event.fund}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Total Amount</p>
              <p className="font-semibold text-gray-900 tabular-nums">{fmtCr(event.amount)}</p>
            </div>
          </div>
          {event.notes && (
            <p className="text-xs text-gray-500 italic mb-4">{event.notes}</p>
          )}

          {/* LP Receipts table */}
          <h4 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-2">LP Receipts</h4>
          {event.lpReceipts.length === 0 ? (
            <p className="text-sm text-gray-400 italic">No LPs assigned to this event.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border" style={{ borderColor: '#E2E8F0' }}>
              <table className="w-full text-sm">
                <thead className="text-xs font-semibold text-gray-500 border-b" style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}>
                  <tr>
                    <th className="px-4 py-2 text-left">LP Name</th>
                    <th className="px-4 py-2 text-left">Amount</th>
                    <th className="px-4 py-2 text-left">Received Date</th>
                    <th className="px-4 py-2 text-left">Status</th>
                    <th className="px-4 py-2 text-left">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {event.lpReceipts.map(r => (
                    <LpReceiptRow
                      key={r.lpId}
                      lpId={r.lpId}
                      lpName={lpMap[r.lpId] ?? r.lpId}
                      amount={r.amount}
                      receivedAt={r.receivedAt}
                      onSave={handleReceiptSave}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Progress bar */}
          {totalCount > 0 && (
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Collection Progress</span>
                <span className="font-semibold" style={{ color: '#2D6A4F' }}>
                  {fmtCr(receivedAmount)} / {fmtCr(totalAmount)} ({totalCount > 0 ? Math.round((receivedAmount / totalAmount) * 100) : 0}%)
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${totalAmount > 0 ? Math.min(100, (receivedAmount / totalAmount) * 100) : 0}%`,
                    backgroundColor: '#2D6A4F',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── New Event Form ───────────────────────────────────────────────────────────

interface NewEventFormProps {
  type: CapEventType;
  funds: string[];
  lps: Array<{ id: string; name: string; commitment: string }>;
  onSubmit: (e: CapitalEvent) => void;
  onCancel: () => void;
}

function NewEventForm({ type, funds, lps, onSubmit, onCancel }: NewEventFormProps) {
  const [noticeDate, setNoticeDate] = useState(today());
  const [dueDate, setDueDate]       = useState('');
  const [amount, setAmount]         = useState('');
  const [fund, setFund]             = useState(funds[0] ?? '');
  const [purpose, setPurpose]       = useState('');
  const [notes, setNotes]           = useState('');
  const [selectedLps, setSelectedLps] = useState<Set<string>>(new Set());
  const [lpAmounts, setLpAmounts]   = useState<Record<string, string>>({});

  const toggleLp = (id: string) => {
    setSelectedLps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dueDate || !amount || !fund || !purpose) return;

    const event: CapitalEvent = {
      id: generateId(),
      type,
      noticeDate,
      dueDate,
      amount,
      fund,
      purpose,
      notes,
      status: 'sent',
      lpReceipts: Array.from(selectedLps).map(lpId => ({
        lpId,
        amount: lpAmounts[lpId] || '0',
      })),
      createdAt: new Date().toISOString(),
    };
    onSubmit(event);
  };

  const label = type === 'capital_call' ? 'Capital Call' : 'Distribution';

  return (
    <div className="rounded-xl border bg-white shadow-lg p-6" style={{ borderColor: '#E2E8F0' }}>
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-gray-900">New {label}</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Notice date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notice Date *</label>
            <input
              type="date"
              value={noticeDate}
              onChange={e => setNoticeDate(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              style={{ borderColor: '#E2E8F0' }}
            />
          </div>

          {/* Due date */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              style={{ borderColor: '#E2E8F0' }}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount (₹L) *</label>
            <input
              type="text"
              placeholder="e.g. 500 (Lakhs)"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              style={{ borderColor: '#E2E8F0' }}
            />
          </div>

          {/* Fund */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fund *</label>
            <select
              value={fund}
              onChange={e => setFund(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              style={{ borderColor: '#E2E8F0' }}
            >
              {funds.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Purpose *</label>
          <input
            type="text"
            placeholder={type === 'capital_call' ? 'e.g. Follow-on investment in Lohum' : 'e.g. Exit proceeds from Auric'}
            value={purpose}
            onChange={e => setPurpose(e.target.value)}
            required
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
            style={{ borderColor: '#E2E8F0' }}
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <textarea
            rows={2}
            placeholder="Optional internal notes..."
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 resize-none"
            style={{ borderColor: '#E2E8F0' }}
          />
        </div>

        {/* LP selection */}
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-2">
            Select LPs ({selectedLps.size} selected)
          </label>
          {lps.length === 0 ? (
            <p className="text-xs text-gray-400 italic">No LPs configured. Add LPs in the Finance section.</p>
          ) : (
            <div className="max-h-52 overflow-y-auto rounded-lg border divide-y divide-gray-100" style={{ borderColor: '#E2E8F0' }}>
              {lps.map(lp => (
                <div
                  key={lp.id}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-green-50/60 transition-colors ${
                    selectedLps.has(lp.id) ? 'bg-green-50' : ''
                  }`}
                  onClick={() => toggleLp(lp.id)}
                >
                  <input
                    type="checkbox"
                    checked={selectedLps.has(lp.id)}
                    onChange={() => toggleLp(lp.id)}
                    className="w-4 h-4 accent-green-600"
                    onClick={e => e.stopPropagation()}
                  />
                  <span className="flex-1 text-sm font-medium text-gray-800">{lp.name}</span>
                  <span className="text-xs text-gray-400">Commitment: {fmtCr(lp.commitment)}</span>
                  {selectedLps.has(lp.id) && (
                    <input
                      type="text"
                      placeholder="Amount (₹L)"
                      value={lpAmounts[lp.id] ?? ''}
                      onChange={e => {
                        e.stopPropagation();
                        setLpAmounts(prev => ({ ...prev, [lp.id]: e.target.value }));
                      }}
                      onClick={e => e.stopPropagation()}
                      className="w-28 border rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                      style={{ borderColor: '#E2E8F0' }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-lg border text-gray-600 hover:bg-gray-50"
            style={{ borderColor: '#E2E8F0' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 text-sm font-semibold rounded-lg text-white"
            style={{ backgroundColor: '#1E293B' }}
          >
            Create {label === 'Capital Call' ? 'Call' : 'Distribution'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ events }: { events: CapitalEvent[] }) {
  const fyEvents = events.filter(e => inFY(e.dueDate));

  const totalCalled = fyEvents
    .filter(e => e.type === 'capital_call')
    .reduce((s, e) => s + parseCrore(e.amount), 0);

  const totalDistributed = fyEvents
    .filter(e => e.type === 'distribution')
    .reduce((s, e) => s + parseCrore(e.amount), 0);

  const pendingAmount = events
    .filter(e => e.status !== 'complete')
    .reduce((s, e) => {
      const received = e.lpReceipts
        .filter(r => !!r.receivedAt)
        .reduce((rs, r) => rs + parseCrore(r.amount), 0);
      return s + Math.max(0, parseCrore(e.amount) - received);
    }, 0);

  const cards = [
    {
      label: 'Total Called (FY)',
      value: fmtCr(totalCalled),
      icon: <DollarSign className="w-5 h-5" />,
      color: '#2D6A4F',
      bg: '#F8FAFC',
    },
    {
      label: 'Total Distributed (FY)',
      value: fmtCr(totalDistributed),
      icon: <CheckCircle2 className="w-5 h-5" />,
      color: '#0D7461',
      bg: '#ECFDF5',
    },
    {
      label: 'Pending Amount',
      value: fmtCr(pendingAmount),
      icon: <Clock className="w-5 h-5" />,
      color: '#B45309',
      bg: '#FFFBEB',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(c => (
        <div
          key={c.label}
          className="rounded-xl border p-5 flex items-center gap-4"
          style={{ backgroundColor: c.bg, borderColor: c.color + '33' }}
        >
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: c.color + '1A', color: c.color }}>
            {c.icon}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{c.label}</p>
            <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: c.color }}>{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CapitalCallTracker() {
  const { store, addCapitalEvent, updateCapitalEvent, deleteCapitalEvent, canEditFinance } = useApp();
  const canEdit = canEditFinance();

  const events: CapitalEvent[] = store.capitalEvents ?? [];
  const lps = store.lps ?? [];
  const funds = (store.financeConfig?.funds ?? []).map(f => f.label);
  const fundsWithFallback = funds.length > 0 ? funds : ['Cactus Fund I', 'Cactus Fund II'];

  const [activeTab, setActiveTab] = useState<CapEventType>('capital_call');
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    return [...events]
      .filter(e => e.type === activeTab)
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
  }, [events, activeTab]);

  const handleAdd = (event: CapitalEvent) => {
    addCapitalEvent(event);
    setShowForm(false);
  };

  const handleUpdate = (event: CapitalEvent) => {
    updateCapitalEvent(event);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Delete this event?')) deleteCapitalEvent(id);
  };

  return (
    <div className="flex flex-col min-h-full bg-[#F8FAFC]">
      {/* Page header */}
      <div className="border-b px-6 md:px-10 py-6 bg-white/60" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide text-gray-900">
              Capital Calls &amp; Distributions
            </h1>
            <p className="text-xs text-gray-400 mt-1 italic">
              Track LP capital calls and fund distributions with receipt management
            </p>
          </div>
          {canEdit && <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: '#1E293B' }}
          >
            <Plus className="w-4 h-4" />
            {activeTab === 'capital_call' ? 'New Capital Call' : 'New Distribution'}
          </button>}
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 mt-5">
          {(['capital_call', 'distribution'] as CapEventType[]).map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setShowForm(false); }}
              className={`px-5 py-2 rounded-t-lg text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900 bg-white/60'
              }`}
              style={activeTab === tab ? { backgroundColor: '#1E293B' } : {}}
            >
              {tab === 'capital_call' ? 'Capital Calls' : 'Distributions'}
              <span className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: activeTab === tab ? 'rgba(255,255,255,0.25)' : '#E9F5D4',
                  color: activeTab === tab ? 'white' : '#2D6A4F',
                }}>
                {events.filter(e => e.type === tab).length}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 md:px-10 py-8 space-y-8">
        {/* Summary */}
        <SummaryCards events={events} />

        {/* New event form */}
        {canEdit && showForm && (
          <NewEventForm
            type={activeTab}
            funds={fundsWithFallback}
            lps={lps}
            onSubmit={handleAdd}
            onCancel={() => setShowForm(false)}
          />
        )}

        {/* Event list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-800">
              {activeTab === 'capital_call' ? 'Capital Calls' : 'Distributions'}
              <span className="ml-2 text-sm font-normal text-gray-400">
                — sorted by due date
              </span>
            </h2>
            <span className="text-xs text-gray-400">
              {filtered.length} event{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border bg-white/70 py-16 flex flex-col items-center gap-3"
              style={{ borderColor: '#E2E8F0' }}>
              <FileText className="w-10 h-10 text-gray-300" />
              <p className="text-gray-500 font-medium">
                No {activeTab === 'capital_call' ? 'capital calls' : 'distributions'} yet
              </p>
              <p className="text-xs text-gray-400">
                Click &ldquo;{activeTab === 'capital_call' ? 'New Capital Call' : 'New Distribution'}&rdquo; to create one
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                  lps={lps}
                  onUpdate={canEdit ? handleUpdate : undefined}
                  onDelete={canEdit ? handleDelete : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
