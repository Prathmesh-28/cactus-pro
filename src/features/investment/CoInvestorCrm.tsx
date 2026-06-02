import { useState, useMemo } from 'react';
import {
  Users, Plus, Search, X, Edit2, Trash2, ExternalLink,
  Phone, Mail, MapPin, Building2, Tag, ChevronDown, Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { CoInvestor } from '../../data/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIMARY = '#1C4B42';
const ACCENT  = '#86CA0F';

const WARMTH_STYLES: Record<CoInvestor['warmth'], { bg: string; text: string; label: string }> = {
  hot:     { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Hot'     },
  warm:    { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Warm'    },
  cold:    { bg: 'bg-blue-100',  text: 'text-blue-700',  label: 'Cold'    },
  unknown: { bg: 'bg-gray-100',  text: 'text-gray-600',  label: 'Unknown' },
};

const WARMTH_OPTIONS: CoInvestor['warmth'][] = ['hot', 'warm', 'cold', 'unknown'];

// ─── Blank form ───────────────────────────────────────────────────────────────

function blankForm(): Omit<CoInvestor, 'id'> {
  return {
    firmName: '',
    partnerName: '',
    email: '',
    phone: '',
    linkedInUrl: '',
    sectors: [],
    stages: [],
    checkSizeMin: '',
    checkSizeMax: '',
    geography: '',
    warmth: 'unknown',
    sharedDeals: [],
    notes: '',
    lastInteractionAt: undefined,
    tags: [],
  };
}

// ─── TagInput ─────────────────────────────────────────────────────────────────

function TagInput({
  label,
  values,
  onChange,
  placeholder,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState('');

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = input.trim();
      if (trimmed && !values.includes(trimmed)) {
        onChange([...values, trimmed]);
      }
      setInput('');
    }
    if (e.key === 'Backspace' && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-1 p-2 border border-gray-300 rounded-lg min-h-[42px] focus-within:ring-2 focus-within:ring-[#1C4B42] bg-white">
        {values.map(v => (
          <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#1C4B42] text-white text-xs rounded-full">
            {v}
            <button type="button" onClick={() => onChange(values.filter(x => x !== v))}>
              <X size={10} />
            </button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[120px] outline-none text-sm bg-transparent"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={values.length === 0 ? (placeholder ?? 'Type + Enter to add') : ''}
        />
      </div>
    </div>
  );
}

// ─── CoInvestor Form Modal ────────────────────────────────────────────────────

function CoInvestorModal({
  initial,
  onSave,
  onClose,
}: {
  initial?: CoInvestor;
  onSave: (data: Omit<CoInvestor, 'id'>) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<CoInvestor, 'id'>>(
    initial ? { ...initial } : blankForm()
  );

  function set<K extends keyof Omit<CoInvestor, 'id'>>(key: K, val: Omit<CoInvestor, 'id'>[K]) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!form.firmName.trim()) return;
    onSave(form);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {initial ? 'Edit Co-investor' : 'Add Co-investor'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Firm & Partner */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Firm Name *</label>
              <input
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.firmName}
                onChange={e => set('firmName', e.target.value)}
                placeholder="Sequoia Capital"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Partner Name</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.partnerName}
                onChange={e => set('partnerName', e.target.value)}
                placeholder="Rohan Malhotra"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="partner@firm.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {/* LinkedIn & Geography */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.linkedInUrl}
                onChange={e => set('linkedInUrl', e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Geography</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.geography}
                onChange={e => set('geography', e.target.value)}
                placeholder="India, SEA"
              />
            </div>
          </div>

          {/* Check Size & Warmth */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check Min (₹Cr)</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.checkSizeMin}
                onChange={e => set('checkSizeMin', e.target.value)}
                placeholder="5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check Max (₹Cr)</label>
              <input
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.checkSizeMax}
                onChange={e => set('checkSizeMax', e.target.value)}
                placeholder="50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Warmth</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
                value={form.warmth}
                onChange={e => set('warmth', e.target.value as CoInvestor['warmth'])}
              >
                {WARMTH_OPTIONS.map(w => (
                  <option key={w} value={w}>{WARMTH_STYLES[w].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tag inputs */}
          <TagInput label="Sectors" values={form.sectors} onChange={v => set('sectors', v)} placeholder="FinTech, HealthTech..." />
          <TagInput label="Stages" values={form.stages} onChange={v => set('stages', v)} placeholder="Seed, Series A..." />
          <TagInput label="Shared Deals" values={form.sharedDeals} onChange={v => set('sharedDeals', v)} placeholder="Company name..." />
          <TagInput label="Tags" values={form.tags} onChange={v => set('tags', v)} placeholder="lead, syndicate..." />

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42] resize-none"
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Relationship context, preferences..."
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
              {initial ? 'Save Changes' : 'Add Co-investor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({
  investor,
  onClose,
  onEdit,
  onDelete,
  onLogInteraction,
}: {
  investor: CoInvestor;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLogInteraction: () => void;
}) {
  const warmth = WARMTH_STYLES[investor.warmth];

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Backdrop */}
      <div className="flex-1 bg-black/30" onClick={onClose} />

      {/* Panel */}
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-start justify-between" style={{ background: PRIMARY }}>
          <div>
            <h2 className="text-lg font-bold text-white">{investor.firmName}</h2>
            {investor.partnerName && (
              <p className="text-sm text-green-200 mt-0.5">{investor.partnerName}</p>
            )}
          </div>
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors mt-0.5">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Warmth badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${warmth.bg} ${warmth.text}`}>
              {warmth.label}
            </span>
            {investor.geography && (
              <span className="flex items-center gap-1 text-sm text-gray-500">
                <MapPin size={13} /> {investor.geography}
              </span>
            )}
          </div>

          {/* Contact info */}
          <div className="space-y-2">
            {investor.email && (
              <a href={`mailto:${investor.email}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#1C4B42]">
                <Mail size={14} className="text-gray-400" /> {investor.email}
              </a>
            )}
            {investor.phone && (
              <a href={`tel:${investor.phone}`} className="flex items-center gap-2 text-sm text-gray-700 hover:text-[#1C4B42]">
                <Phone size={14} className="text-gray-400" /> {investor.phone}
              </a>
            )}
            {investor.linkedInUrl && (
              <a href={investor.linkedInUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <ExternalLink size={14} /> LinkedIn Profile
              </a>
            )}
          </div>

          {/* Check size */}
          {(investor.checkSizeMin || investor.checkSizeMax) && (
            <div className="rounded-xl bg-gray-50 px-4 py-3">
              <p className="text-xs text-gray-500 mb-1">Check Size Range</p>
              <p className="text-sm font-semibold text-gray-800">
                {investor.checkSizeMin ? `₹${investor.checkSizeMin}Cr` : '—'} – {investor.checkSizeMax ? `₹${investor.checkSizeMax}Cr` : '—'}
              </p>
            </div>
          )}

          {/* Sectors */}
          {investor.sectors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Sectors</p>
              <div className="flex flex-wrap gap-1.5">
                {investor.sectors.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stages */}
          {investor.stages.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Stages</p>
              <div className="flex flex-wrap gap-1.5">
                {investor.stages.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Shared deals */}
          {investor.sharedDeals.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Shared Deals ({investor.sharedDeals.length})</p>
              <div className="space-y-1">
                {investor.sharedDeals.map(d => (
                  <div key={d} className="flex items-center gap-2 text-sm text-gray-700">
                    <Building2 size={12} className="text-gray-400 flex-shrink-0" /> {d}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {investor.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {investor.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                    <Tag size={10} /> {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Last interaction */}
          {investor.lastInteractionAt && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar size={13} />
              Last interaction: <span className="font-medium text-gray-700">{investor.lastInteractionAt}</span>
            </div>
          )}

          {/* Notes */}
          {investor.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{investor.notes}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t bg-gray-50 space-y-2">
          <button
            onClick={onLogInteraction}
            className="w-full py-2 text-sm font-semibold text-white rounded-lg transition-colors"
            style={{ background: ACCENT, color: '#1C4B42' }}
          >
            Log Interaction Today
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onEdit}
              className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Edit2 size={14} /> Edit
            </button>
            <button
              onClick={onDelete}
              className="flex items-center justify-center gap-2 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CoInvestorCrm() {
  const { store, addCoInvestor, updateCoInvestor, deleteCoInvestor } = useApp();
  const investors: CoInvestor[] = store.coInvestors ?? [];

  const [search, setSearch]           = useState('');
  const [warmthFilter, setWarmthFilter] = useState<CoInvestor['warmth'] | 'all'>('all');
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [showModal, setShowModal]     = useState(false);
  const [editTarget, setEditTarget]   = useState<CoInvestor | undefined>(undefined);
  const [showWarmthDd, setShowWarmthDd] = useState(false);

  const selected = investors.find(i => i.id === selectedId) ?? null;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return investors.filter(inv => {
      const matchesSearch =
        inv.firmName.toLowerCase().includes(q) ||
        inv.partnerName.toLowerCase().includes(q) ||
        inv.sectors.some(s => s.toLowerCase().includes(q));
      const matchesWarmth = warmthFilter === 'all' || inv.warmth === warmthFilter;
      return matchesSearch && matchesWarmth;
    });
  }, [investors, search, warmthFilter]);

  // Stats
  const totalHot  = investors.filter(i => i.warmth === 'hot').length;
  const totalWarm = investors.filter(i => i.warmth === 'warm').length;
  const avgCheckMin = investors.length
    ? investors.reduce((a, i) => a + (parseFloat(i.checkSizeMin) || 0), 0) / investors.length
    : 0;

  function handleSave(data: Omit<CoInvestor, 'id'>) {
    if (editTarget) {
      updateCoInvestor({ ...editTarget, ...data });
    } else {
      addCoInvestor({ id: generateId(), ...data });
    }
    setShowModal(false);
    setEditTarget(undefined);
  }

  function handleEdit() {
    if (selected) {
      setEditTarget(selected);
      setShowModal(true);
    }
  }

  function handleDelete() {
    if (!selected) return;
    if (window.confirm(`Delete ${selected.firmName}? This cannot be undone.`)) {
      deleteCoInvestor(selected.id);
      setSelectedId(null);
    }
  }

  function handleLogInteraction() {
    if (!selected) return;
    if (window.confirm(`Mark today as last interaction date for ${selected.firmName}?`)) {
      const today = new Date().toISOString().split('T')[0];
      updateCoInvestor({ ...selected, lastInteractionAt: today });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="px-6 py-5 border-b bg-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ background: PRIMARY }}>
              <Users size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Co-investor CRM</h1>
              <p className="text-sm text-gray-500">Manage your co-investor relationships</p>
            </div>
          </div>
          <button
            onClick={() => { setEditTarget(undefined); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white rounded-xl transition-colors"
            style={{ background: PRIMARY }}
          >
            <Plus size={16} /> Add Co-investor
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="px-6 py-3 bg-white border-b">
        <div className="flex items-center gap-6 flex-wrap text-sm">
          <span className="text-gray-500">Total <span className="font-bold text-gray-900">{investors.length}</span></span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">Hot <span className="font-bold text-red-600">{totalHot}</span></span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">Warm <span className="font-bold text-amber-600">{totalWarm}</span></span>
          <span className="text-gray-300">|</span>
          <span className="text-gray-500">Avg min check <span className="font-bold text-gray-900">₹{avgCheckMin.toFixed(1)}Cr</span></span>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-4 flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1C4B42]"
            placeholder="Search firm, partner, sector..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Warmth filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowWarmthDd(p => !p)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-xl bg-white hover:bg-gray-50 transition-colors"
          >
            Warmth: <span className="font-medium capitalize">{warmthFilter}</span>
            <ChevronDown size={14} />
          </button>
          {showWarmthDd && (
            <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1 min-w-[130px]">
              {(['all', ...WARMTH_OPTIONS] as const).map(w => (
                <button
                  key={w}
                  onClick={() => { setWarmthFilter(w); setShowWarmthDd(false); }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors capitalize ${warmthFilter === w ? 'font-semibold text-[#1C4B42]' : 'text-gray-700'}`}
                >
                  {w}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="px-6 pb-8">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">No co-investors found</p>
            <p className="text-sm mt-1">Add your first co-investor to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(inv => {
              const ws = WARMTH_STYLES[inv.warmth];
              return (
                <button
                  key={inv.id}
                  onClick={() => setSelectedId(inv.id)}
                  className="text-left bg-white rounded-2xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#1C4B42]/20 transition-all group"
                >
                  {/* Firm + warmth */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate group-hover:text-[#1C4B42] transition-colors">
                        {inv.firmName}
                      </p>
                      {inv.partnerName && (
                        <p className="text-sm text-gray-500 truncate mt-0.5">{inv.partnerName}</p>
                      )}
                    </div>
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-semibold ${ws.bg} ${ws.text}`}>
                      {ws.label}
                    </span>
                  </div>

                  {/* Sectors */}
                  {inv.sectors.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {inv.sectors.slice(0, 3).map(s => (
                        <span key={s} className="px-1.5 py-0.5 bg-emerald-50 text-emerald-700 text-xs rounded-md border border-emerald-100">
                          {s}
                        </span>
                      ))}
                      {inv.sectors.length > 3 && (
                        <span className="text-xs text-gray-400">+{inv.sectors.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* Check range */}
                  {(inv.checkSizeMin || inv.checkSizeMax) && (
                    <p className="text-xs text-gray-500 mb-2">
                      Check: {inv.checkSizeMin ? `₹${inv.checkSizeMin}Cr` : '—'} – {inv.checkSizeMax ? `₹${inv.checkSizeMax}Cr` : '—'}
                    </p>
                  )}

                  {/* Shared deals count */}
                  {inv.sharedDeals.length > 0 && (
                    <p className="text-xs text-gray-400">
                      {inv.sharedDeals.length} shared deal{inv.sharedDeals.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selected && (
        <DetailPanel
          investor={selected}
          onClose={() => setSelectedId(null)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onLogInteraction={handleLogInteraction}
        />
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <CoInvestorModal
          initial={editTarget}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditTarget(undefined); }}
        />
      )}
    </div>
  );
}
