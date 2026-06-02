import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { DdChecklist, DdItem, DdItemStatus } from '../../data/types';
import {
  Plus,
  ChevronRight,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MinusCircle,
  Circle,
  Loader2,
  Trash2,
} from 'lucide-react';

// ─── Default template ─────────────────────────────────────────────────────────

const DEFAULT_CATEGORIES: { category: string; items: string[] }[] = [
  {
    category: 'Legal',
    items: [
      'Incorporation documents received',
      'Shareholder agreements reviewed',
      'IP ownership verified',
      'Pending litigation checked',
      'Regulatory licenses confirmed',
      'ESOP pool documentation verified',
    ],
  },
  {
    category: 'Financial',
    items: [
      'Audited financials (last 3 years) obtained',
      'Management accounts reviewed',
      'Revenue recognition policy assessed',
      'Cap table verified',
      'Outstanding liabilities checked',
      'Cash flow projections reviewed',
    ],
  },
  {
    category: 'Technical',
    items: [
      'Product demo completed',
      'Tech stack architecture reviewed',
      'Security & data privacy audit done',
      'IP / patents assessed',
      'Scalability of infrastructure confirmed',
      'Third-party dependencies documented',
    ],
  },
  {
    category: 'Commercial',
    items: [
      'Customer references checked',
      'Key contracts reviewed',
      'Revenue concentration risk assessed',
      'Competitive landscape mapped',
      'Market size validated',
      'Pricing model stress-tested',
    ],
  },
  {
    category: 'Team',
    items: [
      'Founders background checked',
      'Key person dependencies identified',
      'Reference calls completed',
      'Leadership team assessed',
      'Compensation benchmarks reviewed',
      'Succession plan noted',
    ],
  },
  {
    category: 'Operations',
    items: [
      'Supply chain / vendor risk assessed',
      'Operational processes documented',
      'Insurance coverage confirmed',
      'IT systems reviewed',
      'Headcount plan validated',
    ],
  },
  {
    category: 'Regulatory',
    items: [
      'Sector-specific licenses checked',
      'Compliance with data protection laws verified',
      'Environmental & social obligations reviewed',
      'Tax compliance confirmed',
      'FDI / foreign ownership restrictions reviewed',
      'Industry-body registrations confirmed',
    ],
  },
];

function buildDefaultItems(): DdItem[] {
  const items: DdItem[] = [];
  for (const cat of DEFAULT_CATEGORIES) {
    for (const text of cat.items) {
      items.push({
        id: generateId(),
        category: cat.category,
        item: text,
        status: 'pending',
        assignee: '',
        note: '',
      });
    }
  }
  return items;
}

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_OPTIONS: { value: DdItemStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'na', label: 'N/A' },
  { value: 'red_flag', label: 'Red Flag' },
];

function statusColor(s: DdItemStatus): string {
  switch (s) {
    case 'complete':    return 'text-green-600 bg-green-50 border-green-200';
    case 'red_flag':   return 'text-red-600 bg-red-50 border-red-200';
    case 'in_progress': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'na':         return 'text-gray-400 bg-gray-50 border-gray-200';
    default:           return 'text-gray-500 bg-white border-gray-200';
  }
}

function StatusIcon({ status }: { status: DdItemStatus }) {
  const cls = 'w-4 h-4 flex-shrink-0';
  switch (status) {
    case 'complete':    return <CheckCircle2 className={`${cls} text-green-500`} />;
    case 'red_flag':   return <AlertTriangle className={`${cls} text-red-500`} />;
    case 'in_progress': return <Loader2 className={`${cls} text-blue-500`} />;
    case 'na':         return <MinusCircle className={`${cls} text-gray-400`} />;
    default:           return <Circle className={`${cls} text-gray-300`} />;
  }
}

// ─── Progress helpers ─────────────────────────────────────────────────────────

function calcProgress(items: DdItem[]) {
  const nonNa = items.filter(i => i.status !== 'na');
  const complete = nonNa.filter(i => i.status === 'complete').length;
  const redFlags = items.filter(i => i.status === 'red_flag').length;
  const pending = items.filter(i => i.status === 'pending').length;
  const pct = nonNa.length === 0 ? 0 : Math.round((complete / nonNa.length) * 100);
  return { complete, redFlags, pending, total: nonNa.length, pct };
}

// ─── Sub-component: Checklist Card ───────────────────────────────────────────

function ChecklistCard({
  checklist,
  onClick,
  onDelete,
}: {
  checklist: DdChecklist;
  onClick: () => void;
  onDelete: () => void;
}) {
  const { complete, redFlags, pending, total, pct } = calcProgress(checklist.items);

  return (
    <div
      className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
      onClick={onClick}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 truncate text-base leading-snug">
              {checklist.companyName}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Updated {new Date(checklist.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 font-medium">Completion</span>
            <span className="text-xs font-semibold text-gray-700">{pct}%</span>
          </div>
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: pct === 100 ? '#22c55e' : redFlags > 0 ? '#f97316' : '#3b82f6',
              }}
            />
          </div>
        </div>

        {/* Summary badges */}
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-700 border border-green-200">
            <CheckCircle2 className="w-3 h-3" />{complete} complete
          </span>
          {redFlags > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-50 text-red-700 border border-red-200">
              <AlertTriangle className="w-3 h-3" />{redFlags} red flag{redFlags > 1 ? 's' : ''}
            </span>
          )}
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-600 border border-gray-200">
            <Clock className="w-3 h-3" />{pending} pending
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-50 text-gray-500 border border-gray-200">
            {total} items tracked
          </span>
        </div>

        {/* Category chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {DEFAULT_CATEGORIES.map(c => {
            const catItems = checklist.items.filter(i => i.category === c.category);
            const catDone = catItems.filter(i => i.status === 'complete').length;
            const catNonNa = catItems.filter(i => i.status !== 'na').length;
            const catPct = catNonNa === 0 ? 0 : Math.round((catDone / catNonNa) * 100);
            const hasFlag = catItems.some(i => i.status === 'red_flag');
            return (
              <span
                key={c.category}
                className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                  hasFlag
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : catPct === 100
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}
              >
                {c.category} {catPct}%
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-component: Full Checklist View ──────────────────────────────────────

function ChecklistDetail({
  checklist,
  onBack,
  onUpdate,
}: {
  checklist: DdChecklist;
  onBack: () => void;
  onUpdate: (updated: DdChecklist) => void;
}) {
  const { complete, redFlags, pending, total, pct } = calcProgress(checklist.items);

  function updateItem(itemId: string, patch: Partial<DdItem>) {
    const now = new Date().toISOString();
    const items = checklist.items.map(i => {
      if (i.id !== itemId) return i;
      const updated = { ...i, ...patch };
      if (patch.status === 'complete' && !updated.completedAt) {
        updated.completedAt = now.slice(0, 10);
      }
      if (patch.status && patch.status !== 'complete') {
        updated.completedAt = undefined;
      }
      return updated;
    });
    onUpdate({ ...checklist, items, updatedAt: now });
  }

  const categories = DEFAULT_CATEGORIES.map(c => c.category);

  return (
    <div className="space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{checklist.companyName}</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Last updated: {new Date(checklist.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
              <CheckCircle2 className="w-4 h-4" />{complete} complete
            </span>
            {redFlags > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 font-medium">
                <AlertTriangle className="w-4 h-4" />{redFlags} red flag{redFlags > 1 ? 's' : ''}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-50 text-gray-600 border border-gray-200 font-medium">
              <Clock className="w-4 h-4" />{pending} pending
            </span>
          </div>
        </div>

        {/* Overall progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-gray-600 font-medium">Overall Progress</span>
            <span className="text-sm font-bold text-gray-700">{pct}% ({complete}/{total} non-N/A)</span>
          </div>
          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: pct === 100 ? '#22c55e' : redFlags > 0 ? '#f97316' : '#3b82f6',
              }}
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      {categories.map(cat => {
        const catItems = checklist.items.filter(i => i.category === cat);
        if (catItems.length === 0) return null;
        const catNonNa = catItems.filter(i => i.status !== 'na').length;
        const catDone = catItems.filter(i => i.status === 'complete').length;
        const catPct = catNonNa === 0 ? 0 : Math.round((catDone / catNonNa) * 100);
        const hasFlag = catItems.some(i => i.status === 'red_flag');

        return (
          <div key={cat} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            {/* Category header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-800 text-sm">{cat}</h3>
                {hasFlag && <AlertTriangle className="w-3.5 h-3.5 text-red-500" />}
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${catPct}%`,
                      backgroundColor: hasFlag ? '#ef4444' : catPct === 100 ? '#22c55e' : '#3b82f6',
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 font-medium w-10 text-right">{catPct}%</span>
              </div>
            </div>

            {/* Items */}
            <div className="divide-y divide-gray-50">
              {catItems.map(item => (
                <ChecklistItemRow key={item.id} item={item} onChange={patch => updateItem(item.id, patch)} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Sub-component: Item Row ──────────────────────────────────────────────────

function ChecklistItemRow({
  item,
  onChange,
}: {
  item: DdItem;
  onChange: (patch: Partial<DdItem>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isNa = item.status === 'na';

  return (
    <div className={`px-5 py-3 transition-colors ${isNa ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-shrink-0">
          <StatusIcon status={item.status} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap">
            <span className={`text-sm font-medium flex-1 min-w-0 ${isNa ? 'line-through text-gray-400' : 'text-gray-800'}`}>
              {item.item}
            </span>

            {/* Status dropdown */}
            <select
              value={item.status}
              onChange={e => onChange({ status: e.target.value as DdItemStatus })}
              className={`text-xs px-2 py-1 rounded-lg border font-medium focus:outline-none focus:ring-2 focus:ring-blue-300 cursor-pointer ${statusColor(item.status)}`}
            >
              {STATUS_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {/* Assignee */}
            <input
              type="text"
              placeholder="Assignee"
              value={item.assignee}
              onChange={e => onChange({ assignee: e.target.value })}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1 w-28 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white text-gray-700 placeholder-gray-300"
            />

            {/* Completed date (only if complete) */}
            {item.status === 'complete' && (
              <input
                type="date"
                value={item.completedAt ?? ''}
                onChange={e => onChange({ completedAt: e.target.value })}
                className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-200 bg-white text-gray-700"
              />
            )}

            {/* Toggle notes */}
            <button
              onClick={() => setExpanded(p => !p)}
              className="text-xs text-blue-500 hover:text-blue-700 underline underline-offset-2 whitespace-nowrap"
            >
              {expanded ? 'Hide notes' : item.note ? 'View notes' : 'Add notes'}
            </button>
          </div>

          {/* Notes textarea */}
          {expanded && (
            <textarea
              rows={2}
              placeholder="Add notes, observations, or links..."
              value={item.note}
              onChange={e => onChange({ note: e.target.value })}
              className="mt-2 w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white text-gray-700 placeholder-gray-300 resize-none"
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── New Checklist Modal ──────────────────────────────────────────────────────

function NewChecklistModal({
  deals,
  onClose,
  onCreate,
}: {
  deals: { id: string; companyName: string }[];
  onClose: () => void;
  onCreate: (c: DdChecklist) => void;
}) {
  const [companyName, setCompanyName] = useState('');
  const [selectedDealId, setSelectedDealId] = useState(deals[0]?.id ?? '');
  const [mode, setMode] = useState<'deal' | 'custom'>('deal');

  function handleCreate() {
    const name =
      mode === 'deal'
        ? deals.find(d => d.id === selectedDealId)?.companyName ?? ''
        : companyName.trim();
    if (!name) return;
    const now = new Date().toISOString();
    onCreate({
      id: generateId(),
      dealId: mode === 'deal' ? selectedDealId : '',
      companyName: name,
      items: buildDefaultItems(),
      createdAt: now,
      updatedAt: now,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">New DD Checklist</h2>

        <div className="space-y-4">
          {deals.length > 0 && (
            <div className="flex gap-3">
              <button
                onClick={() => setMode('deal')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  mode === 'deal'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                From Deal
              </button>
              <button
                onClick={() => setMode('custom')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  mode === 'custom'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                }`}
              >
                Custom Name
              </button>
            </div>
          )}

          {mode === 'deal' && deals.length > 0 ? (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Select Deal</label>
              <select
                value={selectedDealId}
                onChange={e => setSelectedDealId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
              >
                {deals.map(d => (
                  <option key={d.id} value={d.id}>{d.companyName}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Company / Deal Name</label>
              <input
                type="text"
                placeholder="e.g. Acme Corp"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                autoFocus
              />
            </div>
          )}

          <p className="text-xs text-gray-400">
            A full checklist with {DEFAULT_CATEGORIES.reduce((a, c) => a + c.items.length, 0)} items across{' '}
            {DEFAULT_CATEGORIES.length} categories will be created from the default template.
          </p>
        </div>

        <div className="mt-6 flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={mode === 'custom' ? !companyName.trim() : !selectedDealId}
            className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create Checklist
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DdChecklistPage() {
  const { store, addDdChecklist, updateDdChecklist, deleteDdChecklist } = useApp();
  const checklists: DdChecklist[] = store.ddChecklists ?? [];
  const deals = store.deals ?? [];

  const [selected, setSelected] = useState<DdChecklist | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState('');

  // Keep selected in sync if updated
  function handleUpdate(updated: DdChecklist) {
    updateDdChecklist(updated);
    setSelected(updated);
  }

  const filtered = checklists.filter(c =>
    c.companyName.toLowerCase().includes(search.toLowerCase())
  );

  if (selected) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <ChecklistDetail
          checklist={selected}
          onBack={() => setSelected(null)}
          onUpdate={handleUpdate}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Due Diligence Checklists</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track DD progress across deals with structured, categorised checklists.
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Checklist
        </button>
      </div>

      {/* Search */}
      {checklists.length > 0 && (
        <input
          type="text"
          placeholder="Search by company name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:max-w-xs border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
        />
      )}

      {/* Summary bar */}
      {checklists.length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          <span><strong className="text-gray-900">{checklists.length}</strong> checklists</span>
          <span>
            <strong className="text-green-600">
              {checklists.filter(c => calcProgress(c.items).pct === 100).length}
            </strong>{' '}
            fully complete
          </span>
          <span>
            <strong className="text-red-500">
              {checklists.filter(c => calcProgress(c.items).redFlags > 0).length}
            </strong>{' '}
            with red flags
          </span>
        </div>
      )}

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          {checklists.length === 0 ? (
            <div className="space-y-3">
              <p className="text-lg font-medium text-gray-500">No checklists yet</p>
              <p className="text-sm">Create your first DD checklist to track due diligence progress on a deal.</p>
              <button
                onClick={() => setShowNew(true)}
                className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" /> New Checklist
              </button>
            </div>
          ) : (
            <p>No checklists match your search.</p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <ChecklistCard
              key={c.id}
              checklist={c}
              onClick={() => setSelected(c)}
              onDelete={() => {
                if (confirm(`Delete checklist for "${c.companyName}"?`)) {
                  deleteDdChecklist(c.id);
                }
              }}
            />
          ))}
        </div>
      )}

      {/* New checklist modal */}
      {showNew && (
        <NewChecklistModal
          deals={deals}
          onClose={() => setShowNew(false)}
          onCreate={addDdChecklist}
        />
      )}
    </div>
  );
}
