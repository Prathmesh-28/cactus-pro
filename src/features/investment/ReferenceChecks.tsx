import { useState, useMemo } from 'react';
import {
  ClipboardList, Plus, Search, X, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, User, Building2, Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { ReferenceCheck, RefCheckSentiment } from '../../data/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY = '#1C4B42';

interface SentimentMeta {
  emoji: string;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

const SENTIMENT_META: Record<RefCheckSentiment, SentimentMeta> = {
  very_positive: {
    emoji: '🌟',
    label: 'Very Positive',
    bgClass: 'bg-emerald-100',
    textClass: 'text-emerald-800',
    borderClass: 'border-emerald-200',
  },
  positive: {
    emoji: '😊',
    label: 'Positive',
    bgClass: 'bg-green-100',
    textClass: 'text-green-800',
    borderClass: 'border-green-200',
  },
  neutral: {
    emoji: '😐',
    label: 'Neutral',
    bgClass: 'bg-gray-100',
    textClass: 'text-gray-700',
    borderClass: 'border-gray-200',
  },
  negative: {
    emoji: '😟',
    label: 'Negative',
    bgClass: 'bg-orange-100',
    textClass: 'text-orange-800',
    borderClass: 'border-orange-200',
  },
  very_negative: {
    emoji: '🚨',
    label: 'Very Negative',
    bgClass: 'bg-red-100',
    textClass: 'text-red-800',
    borderClass: 'border-red-200',
  },
};

const SENTIMENT_OPTIONS: RefCheckSentiment[] = [
  'very_positive', 'positive', 'neutral', 'negative', 'very_negative',
];

// ─── Blank form ───────────────────────────────────────────────────────────────

function blankForm(): Omit<ReferenceCheck, 'id'> {
  return {
    companyId: '',
    subjectName: '',
    subjectRole: '',
    referentName: '',
    referentRole: '',
    referentCompany: '',
    relationship: '',
    date: new Date().toISOString().split('T')[0],
    conductedBy: '',
    sentiment: 'neutral',
    strengthsNoted: '',
    weaknessesNoted: '',
    wouldWorkAgain: true,
    rawNotes: '',
  };
}

// ─── Form Modal ───────────────────────────────────────────────────────────────

function ReferenceCheckModal({
  initial,
  companies,
  onSave,
  onClose,
}: {
  initial?: ReferenceCheck;
  companies: Array<{ id: string; name: string }>;
  onSave: (data: Omit<ReferenceCheck, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<ReferenceCheck, 'id'>>(
    initial ? { ...initial } : blankForm()
  );

  function set<K extends keyof Omit<ReferenceCheck, 'id'>>(key: K, val: Omit<ReferenceCheck, 'id'>[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.subjectName.trim() || !form.companyId) return;
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial ? 'Edit Reference Check' : 'New Reference Check'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Company */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Company *</label>
            <select
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
              value={form.companyId}
              onChange={e => set('companyId', e.target.value)}
            >
              <option value="">Select company...</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
              <input
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.subjectName}
                onChange={e => set('subjectName', e.target.value)}
                placeholder="Founder / executive name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject Role</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.subjectRole}
                onChange={e => set('subjectRole', e.target.value)}
                placeholder="CEO, CTO..."
              />
            </div>
          </div>

          {/* Referent */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referent Name</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.referentName}
                onChange={e => set('referentName', e.target.value)}
                placeholder="Who gave the reference"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referent Role</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.referentRole}
                onChange={e => set('referentRole', e.target.value)}
                placeholder="VP Engineering, Investor..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Referent Company</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.referentCompany}
                onChange={e => set('referentCompany', e.target.value)}
                placeholder="Previous employer"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Relationship</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.relationship}
                onChange={e => set('relationship', e.target.value)}
                placeholder="Former manager, co-founder..."
              />
            </div>
          </div>

          {/* Meta */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.date}
                onChange={e => set('date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Conducted By</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.conductedBy}
                onChange={e => set('conductedBy', e.target.value)}
                placeholder="Team member name"
              />
            </div>
          </div>

          {/* Sentiment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Overall Sentiment</label>
            <select
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
              value={form.sentiment}
              onChange={e => set('sentiment', e.target.value as RefCheckSentiment)}
            >
              {SENTIMENT_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {SENTIMENT_META[s].emoji} {SENTIMENT_META[s].label}
                </option>
              ))}
            </select>
          </div>

          {/* Strengths & Weaknesses */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strengths Noted</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42] resize-none"
              value={form.strengthsNoted}
              onChange={e => set('strengthsNoted', e.target.value)}
              placeholder="Key positive attributes mentioned..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weaknesses Noted</label>
            <textarea
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42] resize-none"
              value={form.weaknessesNoted}
              onChange={e => set('weaknessesNoted', e.target.value)}
              placeholder="Areas of concern or growth..."
            />
          </div>

          {/* Would work again */}
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
            <span className="text-sm font-medium text-gray-700">Would work with again?</span>
            <button
              type="button"
              onClick={() => set('wouldWorkAgain', !form.wouldWorkAgain)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.wouldWorkAgain ? 'bg-[#1C4B42]' : 'bg-gray-300'}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.wouldWorkAgain ? 'translate-x-5' : 'translate-x-0'}`}
              />
            </button>
          </div>

          {/* Raw notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Raw Notes</label>
            <textarea
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42] resize-none"
              value={form.rawNotes}
              onChange={e => set('rawNotes', e.target.value)}
              placeholder="Full conversation notes, direct quotes..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
              style={{ background: PRIMARY }}
            >
              {initial ? 'Save Changes' : 'Save Check'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Expanded Row ─────────────────────────────────────────────────────────────

function CheckDetail({ check, onDelete }: { check: ReferenceCheck; onDelete: () => void }) {
  const sm = SENTIMENT_META[check.sentiment];

  return (
    <div className="px-4 pb-4 pt-2 space-y-3 bg-gray-50 rounded-b-xl border-t border-gray-100">
      <div className="grid grid-cols-2 gap-3 text-sm">
        {check.relationship && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Relationship</p>
            <p className="text-gray-800 font-medium">{check.relationship}</p>
          </div>
        )}
        {check.conductedBy && (
          <div>
            <p className="text-xs text-gray-500 mb-0.5">Conducted By</p>
            <p className="text-gray-800 font-medium">{check.conductedBy}</p>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${sm.bgClass} ${sm.textClass} ${sm.borderClass}`}>
          <span>{sm.emoji}</span> {sm.label}
        </span>
        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${check.wouldWorkAgain ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {check.wouldWorkAgain
            ? <><CheckCircle2 size={13} /> Would work again</>
            : <><XCircle size={13} /> Would not work again</>
          }
        </span>
      </div>

      {check.strengthsNoted && (
        <div>
          <p className="text-xs font-semibold text-emerald-700 mb-1">Strengths</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-emerald-50 rounded-lg p-3">{check.strengthsNoted}</p>
        </div>
      )}

      {check.weaknessesNoted && (
        <div>
          <p className="text-xs font-semibold text-orange-700 mb-1">Weaknesses / Areas of Concern</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-orange-50 rounded-lg p-3">{check.weaknessesNoted}</p>
        </div>
      )}

      {check.rawNotes && (
        <div>
          <p className="text-xs font-semibold text-gray-600 mb-1">Raw Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-white rounded-lg p-3 border border-gray-200 font-mono">{check.rawNotes}</p>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <button
          onClick={onDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
        >
          <X size={12} /> Delete
        </button>
      </div>
    </div>
  );
}

// ─── Check Row ────────────────────────────────────────────────────────────────

function CheckRow({
  check,
  onDelete,
}: {
  check: ReferenceCheck;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const sm = SENTIMENT_META[check.sentiment];

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setExpanded(p => !p)}
        className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3 flex-wrap">
          {/* Subject */}
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <User size={14} className="text-gray-400 flex-shrink-0" />
            <div className="min-w-0">
              <span className="font-medium text-gray-900 text-sm">{check.subjectName}</span>
              {check.subjectRole && (
                <span className="text-gray-500 text-xs ml-1">· {check.subjectRole}</span>
              )}
            </div>
          </div>

          {/* Referent */}
          {check.referentName && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 min-w-0">
              <Building2 size={12} className="flex-shrink-0" />
              <span className="truncate">
                {check.referentName}
                {check.referentCompany ? ` · ${check.referentCompany}` : ''}
              </span>
            </div>
          )}

          {/* Date */}
          {check.date && (
            <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
              <Calendar size={11} />
              {check.date}
            </div>
          )}

          {/* Sentiment */}
          <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${sm.bgClass} ${sm.textClass} ${sm.borderClass}`}>
            {sm.emoji} {sm.label}
          </span>

          {/* Would work again badge */}
          <span className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${check.wouldWorkAgain ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {check.wouldWorkAgain ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
            {check.wouldWorkAgain ? 'Yes' : 'No'}
          </span>

          {/* Conductor */}
          {check.conductedBy && (
            <span className="flex-shrink-0 text-xs text-gray-400">by {check.conductedBy}</span>
          )}

          {expanded ? <ChevronUp size={14} className="flex-shrink-0 text-gray-400 ml-auto" /> : <ChevronDown size={14} className="flex-shrink-0 text-gray-400 ml-auto" />}
        </div>
      </button>

      {expanded && <CheckDetail check={check} onDelete={onDelete} />}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ReferenceChecks() {
  const { store, addReferenceCheck, deleteReferenceCheck } = useApp();
  const checks: ReferenceCheck[] = store.referenceChecks ?? [];
  const companies = store.companies ?? [];

  const [search, setSearch]         = useState('');
  const [companyFilter, setCompanyFilter] = useState<string>('all');
  const [showModal, setShowModal]   = useState(false);
  const [showCompanyDd, setShowCompanyDd] = useState(false);

  // Filtered checks
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return checks.filter(c => {
      const matchesSearch =
        c.subjectName.toLowerCase().includes(q) ||
        c.referentName.toLowerCase().includes(q) ||
        c.referentCompany.toLowerCase().includes(q);
      const matchesCompany = companyFilter === 'all' || c.companyId === companyFilter;
      return matchesSearch && matchesCompany;
    });
  }, [checks, search, companyFilter]);

  // Grouped by company
  const grouped = useMemo(() => {
    const map = new Map<string, ReferenceCheck[]>();
    filtered.forEach(c => {
      const arr = map.get(c.companyId) ?? [];
      arr.push(c);
      map.set(c.companyId, arr);
    });
    return map;
  }, [filtered]);

  // Stats
  const totalPositive  = checks.filter(c => c.sentiment === 'very_positive' || c.sentiment === 'positive').length;
  const totalConcerns  = checks.filter(c => c.sentiment === 'negative' || c.sentiment === 'very_negative').length;

  function companyName(id: string): string {
    return companies.find(c => c.id === id)?.name ?? id;
  }

  function handleSave(data: Omit<ReferenceCheck, 'id'>) {
    addReferenceCheck({ id: generateId(), ...data });
    setShowModal(false);
  }

  function handleDelete(id: string) {
    const check = checks.find(c => c.id === id);
    if (!check) return;
    if (window.confirm(`Delete reference check for ${check.subjectName}? This cannot be undone.`)) {
      deleteReferenceCheck(id);
    }
  }

  const selectedCompanyName = companyFilter === 'all'
    ? 'All Companies'
    : (companies.find(c => c.id === companyFilter)?.name ?? 'Unknown');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="px-6 py-5 border-b bg-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: PRIMARY }}>
              <ClipboardList size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Reference Checks</h1>
              <p className="text-sm text-gray-500">Track founder & team reference conversations</p>
            </div>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors"
            style={{ background: PRIMARY }}
          >
            <Plus size={16} /> New Reference Check
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-3 bg-white border-b">
        <div className="flex items-center gap-6 flex-wrap text-sm">
          <span className="text-gray-500">Total <span className="font-bold text-gray-900">{checks.length}</span></span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            Positive{' '}
            <span className="font-bold text-emerald-600">{totalPositive}</span>
          </span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">
            Concerns{' '}
            <span className="font-bold text-red-600">{totalConcerns}</span>
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
            placeholder="Search subject or referent name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Company filter */}
        <div className="relative">
          <button
            onClick={() => setShowCompanyDd(p => !p)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors max-w-[200px]"
          >
            <span className="truncate">{selectedCompanyName}</span>
            <ChevronDown size={14} className="flex-shrink-0" />
          </button>
          {showCompanyDd && (
            <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[180px] max-h-60 overflow-y-auto">
              <button
                onClick={() => { setCompanyFilter('all'); setShowCompanyDd(false); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${companyFilter === 'all' ? 'font-semibold text-[#1C4B42]' : 'text-gray-700'}`}
              >
                All Companies
              </button>
              {companies.map(c => (
                <button
                  key={c.id}
                  onClick={() => { setCompanyFilter(c.id); setShowCompanyDd(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${companyFilter === c.id ? 'font-semibold text-[#1C4B42]' : 'text-gray-700'}`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-8">
        {grouped.size === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ClipboardList size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No reference checks found</p>
            <p className="text-sm mt-1">
              {checks.length === 0
                ? 'Add your first reference check to get started'
                : 'Try adjusting your search or filter'}
            </p>
            {checks.length === 0 && (
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-5 py-2 text-sm font-semibold text-white rounded-xl transition-colors"
                style={{ background: PRIMARY }}
              >
                <Plus size={14} className="inline mr-1" />
                New Reference Check
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([cid, cChecks]) => (
              <div key={cid}>
                {/* Company Group Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold text-white"
                    style={{ background: PRIMARY }}
                  >
                    <Building2 size={13} />
                    {companyName(cid)}
                  </div>
                  <span className="text-sm text-gray-400">
                    {cChecks.length} check{cChecks.length !== 1 ? 's' : ''}
                  </span>

                  {/* Quick sentiment summary */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    {SENTIMENT_OPTIONS.filter(s => cChecks.some(c => c.sentiment === s)).map(s => {
                      const cnt = cChecks.filter(c => c.sentiment === s).length;
                      const sm = SENTIMENT_META[s];
                      return (
                        <span
                          key={s}
                          title={sm.label}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium border ${sm.bgClass} ${sm.textClass} ${sm.borderClass}`}
                        >
                          {sm.emoji} {cnt}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Check rows */}
                <div className="space-y-2 pl-2">
                  {cChecks.map(check => (
                    <CheckRow
                      key={check.id}
                      check={check}
                      onDelete={() => handleDelete(check.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Check Modal */}
      {showModal && (
        <ReferenceCheckModal
          companies={companies.map(c => ({ id: c.id, name: c.name }))}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
