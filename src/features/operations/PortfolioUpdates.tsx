import { useState, useMemo } from 'react';
import {
  Plus, ChevronDown, ChevronUp, Search, X, CheckCircle2,
  Clock, FileText, Building2, Calendar, Users, TrendingUp,
  Flame, Banknote, MessageSquare, Target, AlertCircle, Lightbulb,
  Edit2, Trash2, Eye,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { PortfolioUpdate, UpdateStatus } from '../../data/types';

// ─── Color palette ────────────────────────────────────────────────────────────
const C = {
  primary: '#1C4B42',
  accent:  '#86CA0F',
  bg:      '#F6FAF7',
  primaryLight: '#2a6b5e',
  border:  '#d1e8d4',
  muted:   '#6b7c75',
};

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: UpdateStatus }) {
  const map: Record<UpdateStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
    draft:     { label: 'Draft',     bg: '#F3F4F6', text: '#6B7280', icon: <FileText size={11} /> },
    submitted: { label: 'Submitted', bg: '#DBEAFE', text: '#1D4ED8', icon: <Clock size={11} /> },
    reviewed:  { label: 'Reviewed',  bg: '#DCFCE7', text: '#15803D', icon: <CheckCircle2 size={11} /> },
  };
  const s = map[status];
  return (
    <span
      style={{ background: s.bg, color: s.text }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
    >
      {s.icon}
      {s.label}
    </span>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────
function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <span style={{ color: C.accent }}>{icon}</span>
      <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>{label}</span>
    </div>
  );
}

// ─── Form field ───────────────────────────────────────────────────────────────
function Field({
  label, required, children,
}: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1" style={{ color: C.primary }}>
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full rounded-lg border px-3 py-2 text-sm outline-none transition focus:ring-2';
const inputStyle = {
  borderColor: C.border,
  background: '#fff',
};
const focusRingStyle = { '--tw-ring-color': C.accent } as React.CSSProperties;

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: '#e6f4ea' }}
      >
        <FileText size={28} style={{ color: C.primary }} />
      </div>
      <p className="text-base font-semibold" style={{ color: C.primary }}>No updates yet</p>
      <p className="text-sm" style={{ color: C.muted }}>Portfolio companies haven't submitted any monthly updates.</p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
        style={{ background: C.primary }}
      >
        <Plus size={14} />
        Add First Update
      </button>
    </div>
  );
}

// ─── Blank form state ─────────────────────────────────────────────────────────
function blankForm(companyId = ''): Omit<PortfolioUpdate, 'id' | 'createdAt'> {
  return {
    companyId,
    month: new Date().toISOString().slice(0, 7),
    submittedBy: '',
    status: 'draft',
    revenue: '',
    burn: '',
    cash: '',
    headcount: 0,
    highlights: '',
    challenges: '',
    asks: '',
    nextMonthGoals: '',
  };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function PortfolioUpdates() {
  const {
    store,
    addPortfolioUpdate,
    updatePortfolioUpdate,
    deletePortfolioUpdate,
    currentRole,
  } = useApp();
  const { companies, portfolioUpdates = [] } = store;

  // ── Local state ──────────────────────────────────────────────────────────────
  const [search, setSearch]               = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterMonth, setFilterMonth]     = useState('');
  const [expandedId, setExpandedId]       = useState<string | null>(null);
  const [showForm, setShowForm]           = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<PortfolioUpdate | null>(null);
  const [reviewingId, setReviewingId]     = useState<string | null>(null);
  const [reviewNote, setReviewNote]       = useState('');
  const [form, setForm]                   = useState<Omit<PortfolioUpdate, 'id' | 'createdAt'>>(blankForm());
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const isReviewer = currentRole === 'super_admin' || currentRole === 'portfolio_team';

  // ── Unique months from existing updates ───────────────────────────────────
  const allMonths = useMemo(() => {
    const s = new Set(portfolioUpdates.map(u => u.month));
    return [...s].sort((a, b) => b.localeCompare(a));
  }, [portfolioUpdates]);

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...portfolioUpdates];
    if (filterCompany !== 'all') list = list.filter(u => u.companyId === filterCompany);
    if (filterMonth)             list = list.filter(u => u.month === filterMonth);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(u => {
        const co = companies.find(c => c.id === u.companyId);
        return (
          co?.name.toLowerCase().includes(q) ||
          u.submittedBy.toLowerCase().includes(q) ||
          u.month.includes(q)
        );
      });
    }
    return list.sort((a, b) => b.month.localeCompare(a.month));
  }, [portfolioUpdates, filterCompany, filterMonth, search, companies]);

  // ── Open add form ─────────────────────────────────────────────────────────
  function openAddForm() {
    setEditingUpdate(null);
    setForm(blankForm());
    setShowForm(true);
  }

  // ── Open edit form ────────────────────────────────────────────────────────
  function openEditForm(u: PortfolioUpdate) {
    setEditingUpdate(u);
    const { id, createdAt, reviewedAt, reviewNote: rn, ...rest } = u;
    setForm(rest);
    setShowForm(true);
  }

  // ── Save form ─────────────────────────────────────────────────────────────
  function handleSave() {
    if (!form.companyId || !form.month) return;
    if (editingUpdate) {
      updatePortfolioUpdate({ ...editingUpdate, ...form });
    } else {
      const newUpdate: PortfolioUpdate = {
        ...form,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      addPortfolioUpdate(newUpdate);
    }
    setShowForm(false);
    setEditingUpdate(null);
    setForm(blankForm());
  }

  // ── Submit update (draft → submitted) ────────────────────────────────────
  function handleSubmit(u: PortfolioUpdate) {
    updatePortfolioUpdate({ ...u, status: 'submitted' });
  }

  // ── Save review ───────────────────────────────────────────────────────────
  function handleSaveReview(u: PortfolioUpdate) {
    updatePortfolioUpdate({
      ...u,
      status: 'reviewed',
      reviewNote,
      reviewedAt: new Date().toISOString(),
    });
    setReviewingId(null);
    setReviewNote('');
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function handleDelete(id: string) {
    deletePortfolioUpdate(id);
    setDeleteConfirmId(null);
    if (expandedId === id) setExpandedId(null);
  }

  // ── Format month display ──────────────────────────────────────────────────
  function formatMonth(m: string) {
    const d = new Date(`${m}-01`);
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  return (
    <div className="min-h-screen" style={{ background: C.bg }}>
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div
        className="px-6 py-5 border-b"
        style={{ background: C.primary, borderColor: C.accent }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Monthly Portfolio Updates</h1>
            <p className="text-sm mt-0.5" style={{ color: '#a8d8a8' }}>
              {portfolioUpdates.length} update{portfolioUpdates.length !== 1 ? 's' : ''} across {companies.length} companies
            </p>
          </div>
          <button
            onClick={openAddForm}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition hover:opacity-90 self-start sm:self-auto"
            style={{ background: C.accent, color: C.primary }}
          >
            <Plus size={16} />
            Add Update
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-5">

        {/* ── Filters ─────────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.muted }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search company, submitter..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border text-sm outline-none focus:ring-2"
              style={{ ...inputStyle, borderColor: C.border, ...focusRingStyle }}
            />
          </div>

          {/* Company filter */}
          <select
            value={filterCompany}
            onChange={e => setFilterCompany(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{ ...inputStyle, borderColor: C.border, color: C.primary, ...focusRingStyle }}
          >
            <option value="all">All Companies</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Month filter */}
          <select
            value={filterMonth}
            onChange={e => setFilterMonth(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{ ...inputStyle, borderColor: C.border, color: C.primary, ...focusRingStyle }}
          >
            <option value="">All Months</option>
            {allMonths.map(m => (
              <option key={m} value={m}>{formatMonth(m)}</option>
            ))}
          </select>

          {/* Clear filters */}
          {(filterCompany !== 'all' || filterMonth || search) && (
            <button
              onClick={() => { setFilterCompany('all'); setFilterMonth(''); setSearch(''); }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border text-sm transition hover:bg-red-50"
              style={{ borderColor: '#fca5a5', color: '#dc2626' }}
            >
              <X size={13} /> Clear
            </button>
          )}
        </div>

        {/* ── Stats row ───────────────────────────────────────────────────────── */}
        {portfolioUpdates.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            {(['draft', 'submitted', 'reviewed'] as UpdateStatus[]).map(st => {
              const count = portfolioUpdates.filter(u => u.status === st).length;
              const cfg = {
                draft:     { label: 'Draft',     bg: '#F3F4F6', border: '#d1d5db', text: '#374151' },
                submitted: { label: 'Submitted', bg: '#DBEAFE', border: '#93c5fd', text: '#1D4ED8' },
                reviewed:  { label: 'Reviewed',  bg: '#DCFCE7', border: '#86efac', text: '#15803D' },
              }[st];
              return (
                <div
                  key={st}
                  className="rounded-xl p-4 border cursor-pointer transition hover:shadow-sm"
                  style={{ background: cfg.bg, borderColor: cfg.border }}
                  onClick={() => {
                    // toggle filter by status via search isn't available; just highlight
                  }}
                >
                  <p className="text-2xl font-bold" style={{ color: cfg.text }}>{count}</p>
                  <p className="text-xs font-semibold mt-0.5" style={{ color: cfg.text }}>{cfg.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Empty state ──────────────────────────────────────────────────────── */}
        {portfolioUpdates.length === 0 && <EmptyState onAdd={openAddForm} />}

        {/* ── No results (filtered) ─────────────────────────────────────────── */}
        {portfolioUpdates.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm font-medium" style={{ color: C.muted }}>No updates match your filters.</p>
          </div>
        )}

        {/* ── Updates list ──────────────────────────────────────────────────── */}
        <div className="space-y-3">
          {filtered.map(u => {
            const company = companies.find(c => c.id === u.companyId);
            const isExpanded = expandedId === u.id;
            const isReviewingThis = reviewingId === u.id;

            return (
              <div
                key={u.id}
                className="rounded-xl border bg-white shadow-sm overflow-hidden"
                style={{ borderColor: C.border }}
              >
                {/* ── Row ───────────────────────────────────────────────────────── */}
                <div
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-[#f0faf2] transition"
                  onClick={() => setExpandedId(isExpanded ? null : u.id)}
                >
                  {/* Logo */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden border"
                    style={{ borderColor: C.border, background: '#f3faf4' }}
                  >
                    {company?.logoUrl ? (
                      <img src={company.logoUrl} alt={company.name} className="w-full h-full object-contain" />
                    ) : (
                      <Building2 size={18} style={{ color: C.primary }} />
                    )}
                  </div>

                  {/* Company + month */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: C.primary }}>
                      {company?.name ?? 'Unknown Company'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: C.muted }}>
                      {formatMonth(u.month)}
                    </p>
                  </div>

                  {/* Metrics */}
                  <div className="hidden sm:flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs" style={{ color: C.muted }}>Revenue</p>
                      <p className="text-sm font-semibold" style={{ color: C.primary }}>
                        {u.revenue || '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: C.muted }}>Burn</p>
                      <p className="text-sm font-semibold" style={{ color: u.burn ? '#dc2626' : C.primary }}>
                        {u.burn || '—'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs" style={{ color: C.muted }}>Headcount</p>
                      <p className="text-sm font-semibold" style={{ color: C.primary }}>
                        {u.headcount || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Status + chevron */}
                  <div className="flex items-center gap-2 ml-2">
                    <StatusBadge status={u.status} />
                    {isExpanded
                      ? <ChevronUp size={16} style={{ color: C.muted }} />
                      : <ChevronDown size={16} style={{ color: C.muted }} />
                    }
                  </div>
                </div>

                {/* ── Expanded detail ───────────────────────────────────────────── */}
                {isExpanded && (
                  <div
                    className="border-t px-5 py-5 space-y-5"
                    style={{ borderColor: C.border, background: '#fafffe' }}
                  >
                    {/* Mobile metrics */}
                    <div className="sm:hidden grid grid-cols-3 gap-3">
                      {[
                        { label: 'Revenue', value: u.revenue },
                        { label: 'Burn', value: u.burn },
                        { label: 'Headcount', value: String(u.headcount || '—') },
                      ].map(m => (
                        <div key={m.label} className="rounded-lg p-3 text-center" style={{ background: '#f0faf2' }}>
                          <p className="text-xs" style={{ color: C.muted }}>{m.label}</p>
                          <p className="text-sm font-bold mt-0.5" style={{ color: C.primary }}>{m.value || '—'}</p>
                        </div>
                      ))}
                    </div>

                    {/* All financials */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { icon: <TrendingUp size={14} />, label: 'Revenue', value: u.revenue },
                        { icon: <Flame size={14} />,      label: 'Monthly Burn', value: u.burn },
                        { icon: <Banknote size={14} />,   label: 'Cash on Hand', value: u.cash },
                        { icon: <Users size={14} />,      label: 'Headcount', value: u.headcount ? String(u.headcount) : '' },
                      ].map(item => (
                        <div
                          key={item.label}
                          className="rounded-lg p-3 border"
                          style={{ borderColor: C.border, background: '#fff' }}
                        >
                          <div className="flex items-center gap-1.5 mb-1" style={{ color: C.muted }}>
                            {item.icon}
                            <span className="text-xs">{item.label}</span>
                          </div>
                          <p className="text-base font-bold" style={{ color: C.primary }}>
                            {item.value || '—'}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Narrative sections */}
                    <div className="grid sm:grid-cols-2 gap-4">
                      {[
                        { icon: <Lightbulb size={13} />,    label: 'Highlights',       value: u.highlights },
                        { icon: <AlertCircle size={13} />,  label: 'Challenges',       value: u.challenges },
                        { icon: <MessageSquare size={13} />,label: 'Asks / Help Needed',value: u.asks },
                        { icon: <Target size={13} />,       label: 'Next Month Goals', value: u.nextMonthGoals },
                      ].map(s => (
                        <div key={s.label} className="rounded-lg p-3 border" style={{ borderColor: C.border, background: '#fff' }}>
                          <SectionLabel icon={s.icon} label={s.label} />
                          <p className="text-sm whitespace-pre-line" style={{ color: s.value ? '#1a2e28' : C.muted }}>
                            {s.value || 'Not provided'}
                          </p>
                        </div>
                      ))}
                    </div>

                    {/* Submitted by */}
                    <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: C.muted }}>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Submitted by <strong className="ml-1" style={{ color: C.primary }}>{u.submittedBy || 'Unknown'}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        Created {new Date(u.createdAt).toLocaleDateString('en-IN')}
                      </span>
                      {u.reviewedAt && (
                        <span className="flex items-center gap-1">
                          <CheckCircle2 size={12} style={{ color: '#15803D' }} />
                          Reviewed {new Date(u.reviewedAt).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>

                    {/* Review note (if reviewed) */}
                    {u.reviewNote && (
                      <div
                        className="rounded-lg p-3 border-l-4"
                        style={{ borderColor: C.accent, background: '#f0faf2' }}
                      >
                        <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: C.primary }}>
                          <Eye size={12} /> Reviewer Note
                        </p>
                        <p className="text-sm" style={{ color: '#1a2e28' }}>{u.reviewNote}</p>
                      </div>
                    )}

                    {/* Reviewer: add/edit review note */}
                    {isReviewer && u.status === 'submitted' && !isReviewingThis && (
                      <button
                        onClick={() => { setReviewingId(u.id); setReviewNote(u.reviewNote ?? ''); }}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                        style={{ background: '#15803D' }}
                      >
                        <CheckCircle2 size={14} />
                        Mark as Reviewed
                      </button>
                    )}

                    {isReviewingThis && (
                      <div
                        className="rounded-xl p-4 border space-y-3"
                        style={{ borderColor: C.accent, background: '#f0faf2' }}
                      >
                        <p className="text-sm font-semibold" style={{ color: C.primary }}>Add Review Note</p>
                        <textarea
                          value={reviewNote}
                          onChange={e => setReviewNote(e.target.value)}
                          rows={3}
                          placeholder="Add your observations, feedback, or follow-up items..."
                          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 resize-none"
                          style={{ borderColor: C.border, ...focusRingStyle }}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveReview(u)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90"
                            style={{ background: '#15803D' }}
                          >
                            <CheckCircle2 size={13} />
                            Confirm Reviewed
                          </button>
                          <button
                            onClick={() => setReviewingId(null)}
                            className="px-3 py-2 rounded-lg text-sm border transition hover:bg-gray-50"
                            style={{ borderColor: C.border, color: C.muted }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Row actions */}
                    <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: C.border }}>
                      {u.status === 'draft' && (
                        <button
                          onClick={() => handleSubmit(u)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition hover:opacity-90"
                          style={{ background: '#1D4ED8' }}
                        >
                          <Clock size={12} />
                          Mark Submitted
                        </button>
                      )}
                      <button
                        onClick={() => openEditForm(u)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition hover:bg-gray-50"
                        style={{ borderColor: C.border, color: C.primary }}
                      >
                        <Edit2 size={12} />
                        Edit
                      </button>
                      {deleteConfirmId === u.id ? (
                        <div className="flex items-center gap-2 ml-auto">
                          <span className="text-xs" style={{ color: C.muted }}>Delete this update?</span>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="px-2 py-1 rounded text-xs font-semibold text-white"
                            style={{ background: '#dc2626' }}
                          >
                            Yes, delete
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 rounded text-xs border"
                            style={{ borderColor: C.border, color: C.muted }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirmId(u.id)}
                          className="ml-auto flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs transition hover:bg-red-50"
                          style={{ color: '#dc2626' }}
                        >
                          <Trash2 size={12} />
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════════════════════
          Add / Edit Modal
      ════════════════════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 pb-6 px-4 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.45)' }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: '#fff' }}
          >
            {/* Modal header */}
            <div
              className="flex items-center justify-between px-6 py-4"
              style={{ background: C.primary }}
            >
              <h2 className="text-base font-bold text-white">
                {editingUpdate ? 'Edit Update' : 'Add Monthly Update'}
              </h2>
              <button
                onClick={() => { setShowForm(false); setEditingUpdate(null); }}
                className="text-white opacity-70 hover:opacity-100 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5 overflow-y-auto max-h-[75vh]">

              {/* Company + Month */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Company" required>
                  <select
                    value={form.companyId}
                    onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}
                    className={inputClass}
                    style={{ ...inputStyle, color: C.primary }}
                  >
                    <option value="">Select company...</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Month" required>
                  <input
                    type="month"
                    value={form.month}
                    onChange={e => setForm(f => ({ ...f, month: e.target.value }))}
                    className={inputClass}
                    style={{ ...inputStyle, color: C.primary }}
                  />
                </Field>
              </div>

              {/* Submitted by + Status */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Submitted By">
                  <input
                    type="text"
                    value={form.submittedBy}
                    onChange={e => setForm(f => ({ ...f, submittedBy: e.target.value }))}
                    placeholder="Founder name..."
                    className={inputClass}
                    style={inputStyle}
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as UpdateStatus }))}
                    className={inputClass}
                    style={{ ...inputStyle, color: C.primary }}
                  >
                    <option value="draft">Draft</option>
                    <option value="submitted">Submitted</option>
                    {isReviewer && <option value="reviewed">Reviewed</option>}
                  </select>
                </Field>
              </div>

              {/* Financials */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.primary }}>
                  Financials
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Field label="Revenue">
                    <input
                      type="text"
                      value={form.revenue}
                      onChange={e => setForm(f => ({ ...f, revenue: e.target.value }))}
                      placeholder="e.g. ₹12 Cr"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Monthly Burn">
                    <input
                      type="text"
                      value={form.burn}
                      onChange={e => setForm(f => ({ ...f, burn: e.target.value }))}
                      placeholder="e.g. ₹80 L"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Cash on Hand">
                    <input
                      type="text"
                      value={form.cash}
                      onChange={e => setForm(f => ({ ...f, cash: e.target.value }))}
                      placeholder="e.g. ₹4 Cr"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Headcount">
                    <input
                      type="number"
                      min={0}
                      value={form.headcount || ''}
                      onChange={e => setForm(f => ({ ...f, headcount: parseInt(e.target.value) || 0 }))}
                      placeholder="42"
                      className={inputClass}
                      style={inputStyle}
                    />
                  </Field>
                </div>
              </div>

              {/* Narrative */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: C.primary }}>
                  Narrative
                </p>
                <div className="space-y-3">
                  <Field label="Highlights">
                    <textarea
                      value={form.highlights}
                      onChange={e => setForm(f => ({ ...f, highlights: e.target.value }))}
                      rows={3}
                      placeholder="Key wins, milestones, and positive developments this month..."
                      className={inputClass + ' resize-none'}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Challenges">
                    <textarea
                      value={form.challenges}
                      onChange={e => setForm(f => ({ ...f, challenges: e.target.value }))}
                      rows={3}
                      placeholder="Issues faced, blockers, market headwinds..."
                      className={inputClass + ' resize-none'}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Asks / Help Needed">
                    <textarea
                      value={form.asks}
                      onChange={e => setForm(f => ({ ...f, asks: e.target.value }))}
                      rows={2}
                      placeholder="Intros needed, hiring help, strategic advice..."
                      className={inputClass + ' resize-none'}
                      style={inputStyle}
                    />
                  </Field>
                  <Field label="Next Month Goals">
                    <textarea
                      value={form.nextMonthGoals}
                      onChange={e => setForm(f => ({ ...f, nextMonthGoals: e.target.value }))}
                      rows={2}
                      placeholder="Top 3 priorities for the coming month..."
                      className={inputClass + ' resize-none'}
                      style={inputStyle}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* Modal footer */}
            <div
              className="flex items-center justify-end gap-3 px-6 py-4 border-t"
              style={{ borderColor: C.border, background: C.bg }}
            >
              <button
                onClick={() => { setShowForm(false); setEditingUpdate(null); }}
                className="px-4 py-2 rounded-lg text-sm border transition hover:bg-gray-50"
                style={{ borderColor: C.border, color: C.muted }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!form.companyId || !form.month}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: C.primary }}
              >
                {editingUpdate ? <Edit2 size={14} /> : <Plus size={14} />}
                {editingUpdate ? 'Save Changes' : 'Add Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
