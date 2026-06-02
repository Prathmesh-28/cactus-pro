import { useState, useMemo } from 'react';
import {
  Users, Plus, X, ChevronRight, ArrowRight,
  CheckCircle, XCircle, Clock, Send, MessageSquare, Calendar,
  Search, Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { IntroRequest, IntroStatus } from '../../data/types';

// ─── Status Config ────────────────────────────────────────────────────────────

interface StatusConfig {
  label:      string;
  bg:         string;
  text:       string;
  border:     string;
  icon:       React.ElementType;
}

const STATUS_CONFIG: Record<IntroStatus, StatusConfig> = {
  requested:          { label: 'Requested',          bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',  icon: Clock         },
  intro_sent:         { label: 'Intro Sent',         bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200',icon: Send          },
  responded:          { label: 'Responded',           bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200', icon: MessageSquare },
  meeting_scheduled:  { label: 'Meeting Scheduled',  bg: 'bg-teal-50',    text: 'text-teal-700',   border: 'border-teal-200',  icon: Calendar      },
  closed_won:         { label: 'Closed Won',         bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200',icon: CheckCircle   },
  closed_lost:        { label: 'Closed Lost',        bg: 'bg-gray-50',    text: 'text-gray-500',   border: 'border-gray-200',  icon: XCircle       },
};

const ALL_STATUSES: IntroStatus[] = [
  'requested', 'intro_sent', 'responded', 'meeting_scheduled', 'closed_won', 'closed_lost',
];

const NEXT_STATUS: Partial<Record<IntroStatus, IntroStatus>> = {
  requested:         'intro_sent',
  intro_sent:        'responded',
  responded:         'meeting_scheduled',
  meeting_scheduled: 'closed_won',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function formatDate(d: string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IntroStatus }) {
  const cfg = STATUS_CONFIG[status];
  const Icon = cfg.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}
    >
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ─── New Intro Modal Form ──────────────────────────────────────────────────────

interface IntroFormState {
  requestedBy:          string;
  requestedByCompanyId: string;
  targetName:           string;
  targetRole:           string;
  targetCompany:        string;
  purpose:              string;
  assignedTo:           string;
  status:               IntroStatus;
  notes:                string;
  requestDate:          string;
}

function blankIntroForm(): IntroFormState {
  return {
    requestedBy:          '',
    requestedByCompanyId: '',
    targetName:           '',
    targetRole:           '',
    targetCompany:        '',
    purpose:              '',
    assignedTo:           '',
    status:               'requested',
    notes:                '',
    requestDate:          new Date().toISOString().split('T')[0],
  };
}

interface NewIntroModalProps {
  companies: Array<{ id: string; name: string }>;
  teamMembers: string[];
  onSave: (data: IntroFormState) => void;
  onClose: () => void;
}

function NewIntroModal({ companies, teamMembers, onSave, onClose }: NewIntroModalProps) {
  const [form, setForm] = useState<IntroFormState>(blankIntroForm());
  const set = (key: keyof IntroFormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const valid = form.requestedBy.trim() && form.targetName.trim() && form.targetCompany.trim() && form.purpose.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="font-semibold text-gray-900 text-lg">New Intro Request</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Requested By *</label>
              <input
                type="text"
                value={form.requestedBy}
                onChange={set('requestedBy')}
                placeholder="Founder / person name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From Company</label>
              <select
                value={form.requestedByCompanyId}
                onChange={set('requestedByCompanyId')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42] bg-white"
              >
                <option value="">— None —</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Name *</label>
              <input
                type="text"
                value={form.targetName}
                onChange={set('targetName')}
                placeholder="Person to be introduced to"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Role</label>
              <input
                type="text"
                value={form.targetRole}
                onChange={set('targetRole')}
                placeholder="e.g. CTO, Partner"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Company *</label>
            <input
              type="text"
              value={form.targetCompany}
              onChange={set('targetCompany')}
              placeholder="Company of the target"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Purpose *</label>
            <textarea
              rows={2}
              value={form.purpose}
              onChange={set('purpose')}
              placeholder="Why is this intro needed?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              {teamMembers.length > 0 ? (
                <select
                  value={form.assignedTo}
                  onChange={set('assignedTo')}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42] bg-white"
                >
                  <option value="">— Unassigned —</option>
                  {teamMembers.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={form.assignedTo}
                  onChange={set('assignedTo')}
                  placeholder="Team member"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                />
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={form.status}
                onChange={set('status')}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42] bg-white"
              >
                {ALL_STATUSES.map((s) => (
                  <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Request Date</label>
            <input
              type="date"
              value={form.requestDate}
              onChange={set('requestDate')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Any context or next steps..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42] resize-none"
            />
          </div>
        </div>

        <div className="p-5 pt-0 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            disabled={!valid}
            onClick={() => { onSave(form); onClose(); }}
            className="px-4 py-2 rounded-lg bg-[#1C4B42] text-white text-sm font-medium hover:bg-[#163d35] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Add Request
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  request:    IntroRequest;
  companyName: string;
  onClose:    () => void;
  onUpdate:   (r: IntroRequest) => void;
}

function DetailPanel({ request, companyName, onClose, onUpdate }: DetailPanelProps) {
  const [notes, setNotes]             = useState(request.notes);
  const [introducedVia, setIntroducedVia] = useState(request.introducedVia ?? '');
  const [dirty, setDirty]             = useState(false);

  const nextStatus = NEXT_STATUS[request.status];

  function advance() {
    if (!nextStatus) return;
    onUpdate({ ...request, status: nextStatus, notes, introducedVia: introducedVia || undefined });
  }

  function close(won: boolean) {
    const now = new Date().toISOString().split('T')[0];
    onUpdate({
      ...request,
      status:     won ? 'closed_won' : 'closed_lost',
      closedDate: now,
      notes,
      introducedVia: introducedVia || undefined,
    });
  }

  function saveNotes() {
    onUpdate({ ...request, notes, introducedVia: introducedVia || undefined });
    setDirty(false);
  }

  const isOpen = request.status !== 'closed_won' && request.status !== 'closed_lost';
  const daysOpen = request.closedDate
    ? daysBetween(request.requestDate, request.closedDate)
    : daysBetween(request.requestDate, new Date().toISOString().split('T')[0]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="relative bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Intro Request</p>
            <h2 className="font-semibold text-gray-900">
              {request.requestedBy} → {request.targetName}
            </h2>
            <p className="text-sm text-gray-500">{request.targetRole} · {request.targetCompany}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors mt-0.5">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5 space-y-5 flex-1">
          {/* Status + meta */}
          <div className="flex flex-wrap gap-2 items-center">
            <StatusBadge status={request.status} />
            {request.assignedTo && (
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {request.assignedTo}
              </span>
            )}
            <span className="text-xs text-gray-400 ml-auto">{daysOpen}d {request.closedDate ? 'to close' : 'open'}</span>
          </div>

          {/* Details */}
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">From Company</dt>
              <dd className="font-medium text-gray-900">{companyName || '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Request Date</dt>
              <dd className="font-medium text-gray-900">{formatDate(request.requestDate)}</dd>
            </div>
            {request.closedDate && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Closed Date</dt>
                <dd className="font-medium text-gray-900">{formatDate(request.closedDate)}</dd>
              </div>
            )}
          </dl>

          {/* Purpose */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Purpose</p>
            <p className="text-sm text-gray-800">{request.purpose}</p>
          </div>

          {/* Introduced Via */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
              Introduced Via
            </label>
            <input
              type="text"
              value={introducedVia}
              onChange={(e) => { setIntroducedVia(e.target.value); setDirty(true); }}
              placeholder="Who made the intro?"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Notes</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => { setNotes(e.target.value); setDirty(true); }}
              placeholder="Updates, context..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42] resize-none"
            />
            {dirty && (
              <button
                onClick={saveNotes}
                className="mt-1 text-xs text-[#1C4B42] underline hover:text-[#86CA0F] transition-colors"
              >
                Save notes
              </button>
            )}
          </div>

          {/* Action Buttons */}
          {isOpen && (
            <div className="space-y-2">
              {nextStatus && (
                <button
                  onClick={advance}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#1C4B42] text-white text-sm font-medium hover:bg-[#163d35] transition-colors"
                >
                  <ArrowRight size={15} />
                  Move to: {STATUS_CONFIG[nextStatus].label}
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => close(true)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium hover:bg-emerald-100 transition-colors"
                >
                  <CheckCircle size={14} />
                  Close Won
                </button>
                <button
                  onClick={() => close(false)}
                  className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
                >
                  <XCircle size={14} />
                  Close Lost
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Row Card ─────────────────────────────────────────────────────────────────

interface RowCardProps {
  request:     IntroRequest;
  companyName: string;
  onClick:     () => void;
}

function RowCard({ request, companyName, onClick }: RowCardProps) {
  const purposeTruncated =
    request.purpose.length > 80 ? request.purpose.slice(0, 80) + '…' : request.purpose;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-xl border border-gray-100 px-4 py-3.5 hover:border-[#1C4B42]/30 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Main line */}
          <p className="text-sm font-semibold text-gray-900 group-hover:text-[#1C4B42] transition-colors">
            <span className="text-[#1C4B42]">{request.requestedBy}</span>
            {companyName && <span className="text-gray-400 font-normal"> ({companyName})</span>}
            {' '}wants intro to{' '}
            <span className="text-[#1C4B42]">{request.targetName}</span>
            {request.targetRole && <span className="text-gray-500 font-normal"> · {request.targetRole}</span>}
            {' '}at{' '}
            <span className="font-semibold text-gray-800">{request.targetCompany}</span>
          </p>
          {/* Purpose */}
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">{purposeTruncated}</p>
          {/* Meta row */}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <StatusBadge status={request.status} />
            {request.assignedTo && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                {request.assignedTo}
              </span>
            )}
            <span className="text-xs text-gray-400">{formatDate(request.requestDate)}</span>
          </div>
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-[#1C4B42] transition-colors flex-shrink-0 mt-1" />
      </div>
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabFilter = 'all' | IntroStatus;

export default function IntroTracker() {
  const { store, addIntroRequest, updateIntroRequest } = useApp();

  const [activeTab, setActiveTab]       = useState<TabFilter>('all');
  const [selectedId, setSelectedId]     = useState<string | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [search, setSearch]             = useState('');
  const [filterAssignee, setFilterAssignee] = useState('');
  const [filterCompany, setFilterCompany]   = useState('');

  const requests  = store.introRequests ?? [];
  const companies = store.companies     ?? [];

  // Team members derived from people store
  const teamMembers = useMemo(
    () => (store.people ?? []).map((p) => p.name),
    [store.people]
  );

  // Company name lookup
  const companyNameMap = useMemo(() => {
    const map = new Map<string, string>();
    companies.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [companies]);

  // All assignees for quick filter
  const allAssignees = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => { if (r.assignedTo) set.add(r.assignedTo); });
    return Array.from(set).sort();
  }, [requests]);

  // All requesting companies for quick filter
  const allFromCompanies = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => { if (r.requestedByCompanyId) set.add(r.requestedByCompanyId); });
    return Array.from(set);
  }, [requests]);

  // Stats
  const openCount = requests.filter(
    (r) => r.status !== 'closed_won' && r.status !== 'closed_lost'
  ).length;

  const thisMonthWon = useMemo(() => {
    const now = new Date();
    return requests.filter((r) => {
      if (r.status !== 'closed_won' || !r.closedDate) return false;
      const d = new Date(r.closedDate);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [requests]);

  const avgDaysToClose = useMemo(() => {
    const closed = requests.filter((r) => r.closedDate && r.requestDate);
    if (closed.length === 0) return null;
    const total = closed.reduce((acc, r) => acc + daysBetween(r.requestDate, r.closedDate!), 0);
    return Math.round(total / closed.length);
  }, [requests]);

  // Filtered list
  const filtered = useMemo(() => {
    let list = requests;
    if (activeTab !== 'all') list = list.filter((r) => r.status === activeTab);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.requestedBy.toLowerCase().includes(q) ||
          r.targetName.toLowerCase().includes(q) ||
          r.targetCompany.toLowerCase().includes(q) ||
          r.purpose.toLowerCase().includes(q)
      );
    }
    if (filterAssignee) list = list.filter((r) => r.assignedTo === filterAssignee);
    if (filterCompany)  list = list.filter((r) => r.requestedByCompanyId === filterCompany);
    return [...list].sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
  }, [requests, activeTab, search, filterAssignee, filterCompany]);

  const selected = selectedId ? requests.find((r) => r.id === selectedId) : null;

  function handleAdd(formData: ReturnType<typeof blankIntroForm>) {
    addIntroRequest({
      id:                  `ir-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      requestedBy:          formData.requestedBy,
      requestedByCompanyId: formData.requestedByCompanyId || undefined,
      targetName:           formData.targetName,
      targetRole:           formData.targetRole,
      targetCompany:        formData.targetCompany,
      purpose:              formData.purpose,
      status:               formData.status,
      assignedTo:           formData.assignedTo,
      requestDate:          formData.requestDate || new Date().toISOString().split('T')[0],
      notes:                formData.notes,
    });
  }

  const TABS: Array<{ key: TabFilter; label: string }> = [
    { key: 'all',               label: 'All' },
    { key: 'requested',         label: 'Requested' },
    { key: 'intro_sent',        label: 'Intro Sent' },
    { key: 'responded',         label: 'Responded' },
    { key: 'meeting_scheduled', label: 'Meeting Scheduled' },
    { key: 'closed_won',        label: 'Closed Won' },
    { key: 'closed_lost',       label: 'Closed Lost' },
  ];

  return (
    <div className="p-6 space-y-6 bg-[#F6FAF7] min-h-screen">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1C4B42]">Intro Request Tracker</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track and manage warm introductions for portfolio companies</p>
        </div>
        <button
          onClick={() => setShowNewModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#86CA0F] text-[#1C4B42] text-sm font-semibold hover:bg-[#79b80e] transition-colors"
        >
          <Plus size={16} />
          New Intro Request
        </button>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
            <Clock size={18} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{openCount}</p>
            <p className="text-xs text-gray-500">Open</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
            <CheckCircle size={18} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">{thisMonthWon}</p>
            <p className="text-xs text-gray-500">Won this month</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
            <Calendar size={18} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-gray-900">
              {avgDaysToClose !== null ? `${avgDaysToClose}d` : '—'}
            </p>
            <p className="text-xs text-gray-500">Avg days to close</p>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
        {TABS.map(({ key, label }) => {
          const count = key === 'all'
            ? requests.length
            : requests.filter((r) => r.status === key).length;
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === key
                  ? 'bg-[#1C4B42] text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {label}
              <span
                className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search + Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, company, purpose…"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
          />
        </div>
        {allAssignees.length > 0 && (
          <div className="relative">
            <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1C4B42] appearance-none"
            >
              <option value="">All Assignees</option>
              {allAssignees.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        )}
        {allFromCompanies.length > 0 && (
          <div className="relative">
            <Filter size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterCompany}
              onChange={(e) => setFilterCompany(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1C4B42] appearance-none"
            >
              <option value="">All Companies</option>
              {allFromCompanies.map((id) => (
                <option key={id} value={id}>{companyNameMap.get(id) ?? id}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <Users size={48} className="mx-auto text-gray-200 mb-4" />
          <h3 className="font-semibold text-gray-700 mb-1">No intro requests yet</h3>
          <p className="text-sm text-gray-400 mb-5">
            {requests.length === 0
              ? 'Start by adding your first intro request.'
              : 'No requests match your current filters.'}
          </p>
          {requests.length === 0 && (
            <button
              onClick={() => setShowNewModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1C4B42] text-white text-sm font-semibold hover:bg-[#163d35] transition-colors"
            >
              <Plus size={15} />
              New Intro Request
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <RowCard
              key={r.id}
              request={r}
              companyName={r.requestedByCompanyId ? (companyNameMap.get(r.requestedByCompanyId) ?? '') : ''}
              onClick={() => setSelectedId(r.id)}
            />
          ))}
        </div>
      )}

      {/* Detail Panel */}
      {selected && (
        <DetailPanel
          request={selected}
          companyName={
            selected.requestedByCompanyId
              ? (companyNameMap.get(selected.requestedByCompanyId) ?? '')
              : ''
          }
          onClose={() => setSelectedId(null)}
          onUpdate={(updated) => { updateIntroRequest(updated); }}
        />
      )}

      {/* New Intro Modal */}
      {showNewModal && (
        <NewIntroModal
          companies={companies}
          teamMembers={teamMembers}
          onSave={handleAdd}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
}
