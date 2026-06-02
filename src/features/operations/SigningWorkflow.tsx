import { useState, useMemo } from 'react';
import {
  Plus, X, ExternalLink, Building2, ChevronDown,
  FileText, Clock, CheckCircle2, AlertTriangle,
  Bell, Check, Trash2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { SigningDoc } from '../../data/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type DocStatus = SigningDoc['status'];
type DocType = SigningDoc['type'];
type Signatory = SigningDoc['signatories'][number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function daysSince(iso?: string): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  return Math.floor((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

function startOfMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

// ─── Doc type config ──────────────────────────────────────────────────────────

const TYPE_META: Record<DocType, { label: string; bg: string; text: string }> = {
  term_sheet:          { label: 'Term Sheet',          bg: 'bg-purple-100', text: 'text-purple-700' },
  sha:                 { label: 'SHA',                 bg: 'bg-blue-100',   text: 'text-blue-700'   },
  ssha:                { label: 'SSHA',                bg: 'bg-indigo-100', text: 'text-indigo-700' },
  investment_agreement:{ label: 'Investment Agreement',bg: 'bg-emerald-100',text: 'text-emerald-700'},
  nda:                 { label: 'NDA',                 bg: 'bg-amber-100',  text: 'text-amber-700'  },
  other:               { label: 'Other',               bg: 'bg-gray-100',   text: 'text-gray-600'   },
};

const STATUS_TABS: { key: DocStatus; label: string }[] = [
  { key: 'draft',            label: 'Draft'            },
  { key: 'sent',             label: 'Sent'             },
  { key: 'partially_signed', label: 'Partially Signed' },
  { key: 'signed',           label: 'Signed'           },
  { key: 'expired',          label: 'Expired'          },
  { key: 'cancelled',        label: 'Cancelled'        },
];

// ─── Badges ───────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: DocType }) {
  const m = TYPE_META[type];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

function StatusDot({ status }: { status: DocStatus }) {
  const color: Record<DocStatus, string> = {
    draft:            'bg-gray-400',
    sent:             'bg-blue-500',
    partially_signed: 'bg-amber-500',
    signed:           'bg-emerald-500',
    expired:          'bg-red-400',
    cancelled:        'bg-gray-300',
  };
  return <span className={`inline-block w-2 h-2 rounded-full ${color[status]}`} />;
}

// ─── Auto-derive status from signatories ──────────────────────────────────────

function deriveStatus(doc: SigningDoc): DocStatus {
  if (doc.status === 'draft' || doc.status === 'expired' || doc.status === 'cancelled') {
    return doc.status;
  }
  const total = doc.signatories.length;
  if (total === 0) return doc.status;
  const signed = doc.signatories.filter(s => !!s.signedAt).length;
  if (signed === 0) return 'sent';
  if (signed === total) return 'signed';
  return 'partially_signed';
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────

function StatsCards({ docs }: { docs: SigningDoc[] }) {
  const monthStart = startOfMonth();

  const awaitingCount = docs.filter(
    d => d.status === 'sent' || d.status === 'partially_signed',
  ).length;

  const expiringCount = docs.filter(d => {
    const days = daysUntil(d.expiryDate);
    return days !== null && days >= 0 && days <= 7 && d.status !== 'signed' && d.status !== 'cancelled';
  }).length;

  const signedThisMonth = docs.filter(
    d => d.status === 'signed' && !!d.sentDate && d.sentDate >= monthStart,
  ).length;

  const cards = [
    {
      label: 'Awaiting Signature',
      value: awaitingCount,
      icon: <Clock size={18} />,
      color: '#2563EB',
      bg: '#EFF6FF',
    },
    {
      label: 'Expiring in 7 Days',
      value: expiringCount,
      icon: <AlertTriangle size={18} />,
      color: expiringCount > 0 ? '#DC2626' : '#6B7280',
      bg: expiringCount > 0 ? '#FEF2F2' : '#F9FAFB',
    },
    {
      label: 'Signed This Month',
      value: signedThisMonth,
      icon: <CheckCircle2 size={18} />,
      color: '#059669',
      bg: '#ECFDF5',
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
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: c.color + '1A', color: c.color }}
          >
            {c.icon}
          </div>
          <div>
            <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{c.label}</p>
            <p className="text-2xl font-bold mt-0.5 tabular-nums" style={{ color: c.color }}>
              {c.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

function SigningProgress({ signed, total }: { signed: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((signed / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${pct}%`,
            backgroundColor: pct === 100 ? '#059669' : '#86CA0F',
          }}
        />
      </div>
      <span className="text-[10px] text-gray-500 whitespace-nowrap font-medium">
        {signed}/{total}
      </span>
    </div>
  );
}

// ─── Doc Card ────────────────────────────────────────────────────────────────

interface DocCardProps {
  doc: SigningDoc;
  companyName?: string;
  onClick: () => void;
}

function DocCard({ doc, companyName, onClick }: DocCardProps) {
  const signedCount = doc.signatories.filter(s => !!s.signedAt).length;
  const totalCount = doc.signatories.length;
  const days = daysSince(doc.sentDate);
  const expDays = daysUntil(doc.expiryDate);
  const expiryUrgent = expDays !== null && expDays >= 0 && expDays <= 7;

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-[#86CA0F]/40 transition-all group"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <TypeBadge type={doc.type} />
        <StatusDot status={doc.status} />
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-gray-900 leading-snug mb-1 line-clamp-2">
        {doc.title}
      </p>

      {/* Company tag */}
      {companyName && (
        <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-[#1C4B42]/10 text-[#1C4B42] border border-[#1C4B42]/20 mb-2">
          <Building2 size={9} />
          {companyName}
        </span>
      )}

      {/* Dates row */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] text-gray-400 mb-2">
        {doc.sentDate && (
          <span className="flex items-center gap-1">
            <Clock size={9} />
            Sent {fmtDate(doc.sentDate)}
            {days !== null && <span className="text-gray-300">({days}d ago)</span>}
          </span>
        )}
        {doc.expiryDate && (
          <span className={`flex items-center gap-1 ${expiryUrgent ? 'text-red-500 font-semibold' : ''}`}>
            {expiryUrgent && <AlertTriangle size={9} />}
            Expires {fmtDate(doc.expiryDate)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <SigningProgress signed={signedCount} total={totalCount} />
      )}
    </div>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  doc: SigningDoc;
  companyName?: string;
  onClose: () => void;
  onUpdate: (doc: SigningDoc) => void;
  onDelete: (id: string) => void;
}

function DetailPanel({ doc, companyName, onClose, onUpdate, onDelete }: DetailPanelProps) {
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleMarkSigned = (idx: number) => {
    const updated = {
      ...doc,
      signatories: doc.signatories.map((s, i) =>
        i === idx ? { ...s, signedAt: new Date().toISOString() } : s,
      ),
    };
    updated.status = deriveStatus(updated);
    onUpdate(updated);
    showToast(`${doc.signatories[idx].name} marked as signed`);
  };

  const handleReminder = () => {
    showToast('Reminder logged — no email sent');
  };

  const handleDelete = () => {
    if (!window.confirm('Delete this document?')) return;
    onDelete(doc.id);
    onClose();
  };

  const signedCount = doc.signatories.filter(s => !!s.signedAt).length;
  const totalCount = doc.signatories.length;
  const expDays = daysUntil(doc.expiryDate);
  const expiryUrgent = expDays !== null && expDays >= 0 && expDays <= 7;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Toast */}
        {toast && (
          <div className="fixed top-4 right-4 z-[60] bg-[#1C4B42] text-white text-sm px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2">
            <Check size={14} />
            {toast}
          </div>
        )}

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex items-center justify-between z-10">
          <h2 className="font-semibold text-gray-900 text-sm">Document Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={handleReminder}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Bell size={12} />
              Send Reminder
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 p-5 space-y-5 overflow-y-auto">
          {/* Title + badges */}
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <TypeBadge type={doc.type} />
              <StatusDot status={doc.status} />
              <span className="text-xs text-gray-500 capitalize">{doc.status.replace(/_/g, ' ')}</span>
            </div>
            <h3 className="text-base font-bold text-gray-900 leading-snug">{doc.title}</h3>
            {companyName && (
              <span className="inline-flex items-center gap-1 text-xs mt-1.5 px-2 py-0.5 rounded-full bg-[#1C4B42]/10 text-[#1C4B42] border border-[#1C4B42]/20">
                <Building2 size={10} />
                {companyName}
              </span>
            )}
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Sent Date</p>
              <p className="font-medium text-gray-800">{fmtDate(doc.sentDate)}</p>
            </div>
            <div className={`rounded-xl p-3 ${expiryUrgent ? 'bg-red-50' : 'bg-gray-50'}`}>
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Expiry Date</p>
              <p className={`font-medium ${expiryUrgent ? 'text-red-600' : 'text-gray-800'}`}>
                {fmtDate(doc.expiryDate)}
                {expiryUrgent && expDays !== null && (
                  <span className="ml-1 text-[10px]">({expDays}d left)</span>
                )}
              </p>
            </div>
            {doc.dealId && (
              <div className="bg-gray-50 rounded-xl p-3 col-span-2">
                <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-0.5">Deal Ref</p>
                <p className="font-medium text-gray-800">{doc.dealId}</p>
              </div>
            )}
          </div>

          {/* Signing progress */}
          {totalCount > 0 && (
            <div className="bg-gray-50 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-gray-700">Signing Progress</p>
                <span className="text-xs font-semibold text-gray-500">{signedCount}/{totalCount} signed</span>
              </div>
              <SigningProgress signed={signedCount} total={totalCount} />
            </div>
          )}

          {/* Signatories table */}
          <div>
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
              Signatories
            </h4>
            {doc.signatories.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No signatories added.</p>
            ) : (
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Name / Role</th>
                      <th className="text-left px-3 py-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {doc.signatories.map((s, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-3 py-2.5">
                          <p className="font-medium text-gray-800 text-xs">{s.name}</p>
                          <p className="text-[10px] text-gray-400">{s.role}</p>
                          <p className="text-[10px] text-gray-400">{s.email}</p>
                        </td>
                        <td className="px-3 py-2.5">
                          {s.signedAt ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                              <Check size={9} />
                              {fmtDate(s.signedAt)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                              <Clock size={9} />
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {!s.signedAt && (
                            <button
                              onClick={() => handleMarkSigned(idx)}
                              className="text-[10px] px-2 py-1 rounded-lg text-white font-medium transition-opacity hover:opacity-90"
                              style={{ backgroundColor: '#1C4B42' }}
                            >
                              Mark Signed
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* File URL */}
          {doc.fileUrl && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
                Document File
              </h4>
              <a
                href={doc.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-[#1C4B42] hover:underline"
              >
                <ExternalLink size={13} />
                Open Document
              </a>
            </div>
          )}

          {/* Notes */}
          {doc.notes && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Notes</h4>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 whitespace-pre-wrap">
                {doc.notes}
              </p>
            </div>
          )}

          {/* Danger zone */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={handleDelete}
              className="inline-flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={12} />
              Delete document
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── New Document Modal ────────────────────────────────────────────────────────

interface NewDocModalProps {
  companyOptions: { id: string; name: string }[];
  onSave: (doc: SigningDoc) => void;
  onClose: () => void;
}

function blankSignatory(): Signatory {
  return { name: '', email: '', role: '' };
}

function NewDocModal({ companyOptions, onSave, onClose }: NewDocModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<DocType>('term_sheet');
  const [companyId, setCompanyId] = useState('');
  const [dealId, setDealId] = useState('');
  const [sentDate, setSentDate] = useState(todayStr());
  const [expiryDate, setExpiryDate] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [notes, setNotes] = useState('');
  const [signatories, setSignatories] = useState<Signatory[]>([blankSignatory()]);

  const updateSignatory = (idx: number, field: keyof Signatory, value: string) => {
    setSignatories(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const addSignatory = () => setSignatories(prev => [...prev, blankSignatory()]);

  const removeSignatory = (idx: number) =>
    setSignatories(prev => prev.filter((_, i) => i !== idx));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const validSignatories = signatories.filter(s => s.name.trim());

    const doc: SigningDoc = {
      id: generateId(),
      companyId: companyId || undefined,
      dealId: dealId.trim() || undefined,
      title: title.trim(),
      type,
      status: 'sent',
      sentDate: sentDate || undefined,
      expiryDate: expiryDate || undefined,
      signatories: validSignatories,
      fileUrl: fileUrl.trim() || undefined,
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };
    onSave(doc);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="font-semibold text-gray-900">New Document</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Series A Term Sheet — Lohum"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
            />
          </div>

          {/* Type + Company */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Document Type</label>
              <div className="relative">
                <select
                  value={type}
                  onChange={e => setType(e.target.value as DocType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40 appearance-none bg-white"
                >
                  {Object.entries(TYPE_META).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Company (optional)</label>
              <div className="relative">
                <select
                  value={companyId}
                  onChange={e => setCompanyId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40 appearance-none bg-white"
                >
                  <option value="">— None —</option>
                  {companyOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Deal + Expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Deal Ref (optional)</label>
              <input
                value={dealId}
                onChange={e => setDealId(e.target.value)}
                placeholder="e.g. DEAL-2025-001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
              />
            </div>
          </div>

          {/* Sent date + File URL */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Sent Date</label>
              <input
                type="date"
                value={sentDate}
                onChange={e => setSentDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">File URL (optional)</label>
              <input
                type="url"
                value={fileUrl}
                onChange={e => setFileUrl(e.target.value)}
                placeholder="https://…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
              />
            </div>
          </div>

          {/* Signatories */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-700">Signatories</label>
              <button
                type="button"
                onClick={addSignatory}
                className="inline-flex items-center gap-1 text-xs text-[#1C4B42] hover:underline"
              >
                <Plus size={11} />
                Add Signatory
              </button>
            </div>
            <div className="space-y-2">
              {signatories.map((s, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center">
                  <input
                    value={s.name}
                    onChange={e => updateSignatory(idx, 'name', e.target.value)}
                    placeholder="Name"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
                  />
                  <input
                    type="email"
                    value={s.email}
                    onChange={e => updateSignatory(idx, 'email', e.target.value)}
                    placeholder="Email"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
                  />
                  <input
                    value={s.role}
                    onChange={e => updateSignatory(idx, 'role', e.target.value)}
                    placeholder="Role"
                    className="border border-gray-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
                  />
                  {signatories.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSignatory(idx)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional internal notes…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1C4B42' }}
            >
              Create Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SigningWorkflow() {
  const { store, addSigningDoc, updateSigningDoc, deleteSigningDoc } = useApp();
  const signingDocs: SigningDoc[] = store.signingDocs ?? [];
  const companies = store.companies ?? [];

  // ── Maps ───────────────────────────────────────────────────────────────────
  const companyMap = useMemo(() => {
    const m = new Map<string, { name: string; logoUrl: string }>();
    companies.forEach(c => m.set(c.id, { name: c.name, logoUrl: c.logoUrl }));
    return m;
  }, [companies]);

  const companyOptions = useMemo(
    () => [...companies].map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  );

  // ── State ──────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<DocStatus>('draft');
  const [selectedDoc, setSelectedDoc] = useState<SigningDoc | null>(null);
  const [showNewModal, setShowNewModal] = useState(false);

  // ── Filtered docs ──────────────────────────────────────────────────────────
  const docsByStatus = useMemo((): Record<DocStatus, SigningDoc[]> => {
    const groups: Record<DocStatus, SigningDoc[]> = {
      draft: [], sent: [], partially_signed: [], signed: [], expired: [], cancelled: [],
    };
    signingDocs.forEach(d => {
      if (groups[d.status]) groups[d.status].push(d);
    });
    // Sort each group by sentDate desc
    (Object.keys(groups) as DocStatus[]).forEach(k => {
      groups[k].sort((a, b) => (a.createdAt > b.createdAt ? -1 : 1));
    });
    return groups;
  }, [signingDocs]);

  const visibleDocs = docsByStatus[activeTab] ?? [];

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAdd = (doc: SigningDoc) => {
    addSigningDoc(doc);
    setShowNewModal(false);
  };

  const handleUpdate = (doc: SigningDoc) => {
    updateSigningDoc(doc);
    // refresh selected doc if same
    if (selectedDoc?.id === doc.id) setSelectedDoc(doc);
  };

  const handleDelete = (id: string) => {
    deleteSigningDoc(id);
    if (selectedDoc?.id === id) setSelectedDoc(null);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#F6FAF7]">
      {/* Page Header */}
      <div className="border-b border-gray-200 bg-white/70 px-6 md:px-10 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide text-gray-900">
              Document Signing Workflow
            </h1>
            <p className="text-xs text-gray-400 mt-1 italic">
              Track term sheets, agreements and NDAs through the signing pipeline
            </p>
          </div>
          <button
            onClick={() => setShowNewModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#1C4B42' }}
          >
            <Plus size={15} />
            New Document
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-1 mt-5">
          {STATUS_TABS.map(tab => {
            const count = docsByStatus[tab.key].length;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 bg-white/60 hover:bg-white'
                }`}
                style={isActive ? { backgroundColor: '#1C4B42' } : {}}
              >
                {tab.label}
                <span
                  className="ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.25)' : '#E9F5D4',
                    color: isActive ? 'white' : '#1C4B42',
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Body */}
      <div className="px-6 md:px-10 py-8 space-y-6">
        {/* Stats */}
        <StatsCards docs={signingDocs} />

        {/* Grid */}
        {visibleDocs.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-14 text-center">
            <FileText size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              No {STATUS_TABS.find(t => t.key === activeTab)?.label.toLowerCase()} documents
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {activeTab === 'draft'
                ? 'Create your first document to get started'
                : 'Documents will appear here once they reach this status'}
            </p>
            {activeTab === 'draft' && (
              <button
                onClick={() => setShowNewModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-white text-sm rounded-lg transition-opacity hover:opacity-90"
                style={{ backgroundColor: '#1C4B42' }}
              >
                <Plus size={14} />
                New Document
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {visibleDocs.map(doc => {
              const co = doc.companyId ? companyMap.get(doc.companyId) : undefined;
              return (
                <DocCard
                  key={doc.id}
                  doc={doc}
                  companyName={co?.name}
                  onClick={() => setSelectedDoc(doc)}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Detail Panel */}
      {selectedDoc && (
        <DetailPanel
          doc={selectedDoc}
          companyName={selectedDoc.companyId ? companyMap.get(selectedDoc.companyId)?.name : undefined}
          onClose={() => setSelectedDoc(null)}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
        />
      )}

      {/* New Document Modal */}
      {showNewModal && (
        <NewDocModal
          companyOptions={companyOptions}
          onSave={handleAdd}
          onClose={() => setShowNewModal(false)}
        />
      )}
    </div>
  );
}
