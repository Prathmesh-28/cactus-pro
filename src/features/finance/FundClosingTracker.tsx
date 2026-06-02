import { useState, useMemo } from 'react';
import {
  Plus, X, ChevronDown, ChevronUp, Edit2, Save,
  Users, Target, CheckCircle2, DollarSign, TrendingUp,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { LpCommitment, ClosingStatus } from '../../data/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseCr(val: string): number {
  const n = parseFloat(val.replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmtCr(val: number | string): string {
  const n = typeof val === 'string' ? parseCr(val) : val;
  if (n >= 100) return `₹${(n / 100).toFixed(2)}Cr`;
  if (n > 0) return `₹${n.toFixed(2)}L`;
  return '₹0';
}

function pct(num: number, denom: number): string {
  if (denom === 0) return '0%';
  return `${Math.min(100, Math.round((num / denom) * 100))}%`;
}

// ─── Status meta ─────────────────────────────────────────────────────────────

const STATUS_META: Record<ClosingStatus, { label: string; bg: string; text: string; border: string }> = {
  targeted:    { label: 'Targeted',    bg: 'bg-gray-100',    text: 'text-gray-600',   border: '#9CA3AF' },
  soft_circled:{ label: 'Soft Circled',bg: 'bg-blue-100',    text: 'text-blue-700',   border: '#3B82F6' },
  lpa_sent:    { label: 'LPA Sent',    bg: 'bg-purple-100',  text: 'text-purple-700', border: '#9333EA' },
  lpa_signed:  { label: 'LPA Signed',  bg: 'bg-indigo-100',  text: 'text-indigo-700', border: '#4F46E5' },
  funded:      { label: 'Funded',      bg: 'bg-green-100',   text: 'text-green-700',  border: '#16A34A' },
  declined:    { label: 'Declined',    bg: 'bg-red-100',     text: 'text-red-600',    border: '#DC2626' },
};

function StatusBadge({ status }: { status: ClosingStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

// ─── Progress Bars ────────────────────────────────────────────────────────────

interface ProgressBarProps {
  softCircled: number;
  signed: number;
  funded: number;
  target: number;
}

function ProgressBars({ softCircled, signed, funded, target }: ProgressBarProps) {
  if (target === 0) return null;
  const softPct  = Math.min(100, (softCircled / target) * 100);
  const signPct  = Math.min(100, (signed / target) * 100);
  const fundPct  = Math.min(100, (funded / target) * 100);

  return (
    <div className="space-y-2">
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span className="font-medium text-blue-600">Soft Circled</span>
          <span>{fmtCr(softCircled)} / {fmtCr(target)} ({pct(softCircled, target)})</span>
        </div>
        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-blue-400 transition-all" style={{ width: `${softPct}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span className="font-medium text-indigo-600">LPA Signed</span>
          <span>{fmtCr(signed)} / {fmtCr(target)} ({pct(signed, target)})</span>
        </div>
        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-indigo-400 transition-all" style={{ width: `${signPct}%` }} />
        </div>
      </div>
      <div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span className="font-medium text-green-600">Funded</span>
          <span>{fmtCr(funded)} / {fmtCr(target)} ({pct(funded, target)})</span>
        </div>
        <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${fundPct}%`, backgroundColor: '#1C4B42' }} />
        </div>
      </div>
    </div>
  );
}

// ─── Add LP Modal ─────────────────────────────────────────────────────────────

interface AddLpModalProps {
  fundName: string;
  onSave: (c: LpCommitment) => void;
  onClose: () => void;
}

function AddLpModal({ fundName, onSave, onClose }: AddLpModalProps) {
  const [lpName, setLpName]                   = useState('');
  const [lpEmail, setLpEmail]                 = useState('');
  const [targetCommitment, setTargetCommitment] = useState('');
  const [softCircledAmount, setSoftCircledAmount] = useState('');
  const [signedAmount, setSignedAmount]         = useState('');
  const [calledAmount, setCalledAmount]         = useState('');
  const [status, setStatus]                   = useState<ClosingStatus>('targeted');
  const [leadPartner, setLeadPartner]         = useState('');
  const [notes, setNotes]                     = useState('');
  const [lpaSentDate, setLpaSentDate]         = useState('');
  const [lpaSignedDate, setLpaSignedDate]     = useState('');
  const [firstCloseDate, setFirstCloseDate]   = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lpName || !targetCommitment) return;
    onSave({
      id: generateId(),
      fund: fundName,
      lpName,
      lpEmail,
      targetCommitment,
      softCircledAmount: softCircledAmount || '0',
      signedAmount: signedAmount || '0',
      calledAmount: calledAmount || '0',
      status,
      lpaSentDate: lpaSentDate || undefined,
      lpaSignedDate: lpaSignedDate || undefined,
      firstCloseDate: firstCloseDate || undefined,
      notes,
      leadPartner,
    });
    onClose();
  };

  const inputCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500";
  const borderStyle = { borderColor: '#D4EDAA' };
  const labelCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] flex flex-col" style={{ borderTop: '4px solid #1C4B42' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add LP Commitment</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className={labelCls}>LP Name *</label>
              <input type="text" value={lpName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLpName(e.target.value)} required className={inputCls} style={borderStyle} placeholder="Investor name" />
            </div>
            <div>
              <label className={labelCls}>LP Email</label>
              <input type="email" value={lpEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLpEmail(e.target.value)} className={inputCls} style={borderStyle} placeholder="email@example.com" />
            </div>
            <div>
              <label className={labelCls}>Lead Partner</label>
              <input type="text" value={leadPartner} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeadPartner(e.target.value)} className={inputCls} style={borderStyle} placeholder="Partner name" />
            </div>
            <div>
              <label className={labelCls}>Target Commitment (₹L) *</label>
              <input type="text" value={targetCommitment} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetCommitment(e.target.value)} required className={inputCls} style={borderStyle} placeholder="e.g. 500" />
            </div>
            <div>
              <label className={labelCls}>Soft Circled (₹L)</label>
              <input type="text" value={softCircledAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSoftCircledAmount(e.target.value)} className={inputCls} style={borderStyle} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>LPA Signed (₹L)</label>
              <input type="text" value={signedAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSignedAmount(e.target.value)} className={inputCls} style={borderStyle} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Called (₹L)</label>
              <input type="text" value={calledAmount} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCalledAmount(e.target.value)} className={inputCls} style={borderStyle} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setStatus(e.target.value as ClosingStatus)} className={inputCls} style={borderStyle}>
                {(Object.keys(STATUS_META) as ClosingStatus[]).map((s: ClosingStatus) => (
                  <option key={s} value={s}>{STATUS_META[s].label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>LPA Sent Date</label>
              <input type="date" value={lpaSentDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLpaSentDate(e.target.value)} className={inputCls} style={borderStyle} />
            </div>
            <div>
              <label className={labelCls}>LPA Signed Date</label>
              <input type="date" value={lpaSignedDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLpaSignedDate(e.target.value)} className={inputCls} style={borderStyle} />
            </div>
            <div>
              <label className={labelCls}>First Close Date</label>
              <input type="date" value={firstCloseDate} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstCloseDate(e.target.value)} className={inputCls} style={borderStyle} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes</label>
              <textarea rows={2} value={notes} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)} className={`${inputCls} resize-none`} style={borderStyle} placeholder="Internal notes..." />
            </div>
          </div>
        </form>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={(e: React.MouseEvent) => { e.preventDefault(); if (lpName && targetCommitment) { const form = { lpName, lpEmail, targetCommitment, softCircledAmount: softCircledAmount || '0', signedAmount: signedAmount || '0', calledAmount: calledAmount || '0', status, leadPartner, notes, lpaSentDate: lpaSentDate || undefined, lpaSignedDate: lpaSignedDate || undefined, firstCloseDate: firstCloseDate || undefined }; onSave({ id: generateId(), fund: fundName, ...form }); onClose(); } }} className="px-5 py-2 text-sm font-semibold rounded-lg text-white" style={{ backgroundColor: '#1C4B42' }}>
            Add LP
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Commitment Row ───────────────────────────────────────────────────────────

interface CommitmentRowProps {
  commitment: LpCommitment;
  onUpdate: (c: LpCommitment) => void;
  onDelete: (id: string) => void;
}

function CommitmentRow({ commitment, onUpdate, onDelete }: CommitmentRowProps) {
  const [expanded, setExpanded]       = useState(false);
  const [editingAmount, setEditingAmount] = useState<string | null>(null);
  const [amountDraft, setAmountDraft] = useState('');

  const startEdit = (field: string, value: string) => {
    setEditingAmount(field);
    setAmountDraft(value);
  };

  const saveEdit = (field: keyof LpCommitment) => {
    onUpdate({ ...commitment, [field]: amountDraft });
    setEditingAmount(null);
  };

  const amountCell = (field: keyof LpCommitment, value: string) => {
    if (editingAmount === field) {
      return (
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={amountDraft}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmountDraft(e.target.value)}
            className="w-20 border rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
            style={{ borderColor: '#D4EDAA' }}
            autoFocus
          />
          <button onClick={() => saveEdit(field)} className="text-green-600 hover:text-green-800">
            <Save className="w-3 h-3" />
          </button>
          <button onClick={() => setEditingAmount(null)} className="text-gray-400 hover:text-gray-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      );
    }
    return (
      <button
        onClick={() => startEdit(field, value)}
        className="flex items-center gap-1 text-gray-700 hover:text-green-700 group"
      >
        <span className="tabular-nums">{fmtCr(value)}</span>
        <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 text-gray-400" />
      </button>
    );
  };

  return (
    <>
      <tr
        className="border-b border-gray-100 hover:bg-green-50/30 transition-colors cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        <td className="px-4 py-3 text-sm font-medium text-gray-900">{commitment.lpName}</td>
        <td className="px-4 py-3 text-xs text-gray-500">{commitment.lpEmail}</td>
        <td className="px-4 py-3 text-sm" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          {amountCell('targetCommitment', commitment.targetCommitment)}
        </td>
        <td className="px-4 py-3 text-sm" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          {amountCell('softCircledAmount', commitment.softCircledAmount)}
        </td>
        <td className="px-4 py-3 text-sm" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          {amountCell('signedAmount', commitment.signedAmount)}
        </td>
        <td className="px-4 py-3 text-sm" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
          {amountCell('calledAmount', commitment.calledAmount)}
        </td>
        <td className="px-4 py-3"><StatusBadge status={commitment.status} /></td>
        <td className="px-4 py-3 text-xs text-gray-500">{commitment.leadPartner}</td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={(e: React.MouseEvent) => { e.stopPropagation(); if (window.confirm('Remove this LP?')) onDelete(commitment.id); }}
              className="text-gray-300 hover:text-red-400 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            {expanded
              ? <ChevronUp className="w-4 h-4 text-gray-400" />
              : <ChevronDown className="w-4 h-4 text-gray-400" />
            }
          </div>
        </td>
      </tr>
      {expanded && (
        <tr className="bg-green-50/40">
          <td colSpan={9} className="px-6 py-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">LPA Sent</p>
                <p className="font-medium text-gray-800">{commitment.lpaSentDate ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">LPA Signed</p>
                <p className="font-medium text-gray-800">{commitment.lpaSignedDate ?? '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">First Close</p>
                <p className="font-medium text-gray-800">{commitment.firstCloseDate ?? '—'}</p>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Notes</p>
                <p className="text-gray-700 text-sm">{commitment.notes || <span className="italic text-gray-400">No notes</span>}</p>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── Stats Cards ──────────────────────────────────────────────────────────────

interface StatsCardsProps {
  commitments: LpCommitment[];
  target: number;
}

function StatsCards({ commitments, target }: StatsCardsProps) {
  const softCircled = commitments.reduce((s: number, c: LpCommitment) => s + parseCr(c.softCircledAmount), 0);
  const signed      = commitments.reduce((s: number, c: LpCommitment) => s + parseCr(c.signedAmount), 0);
  const funded      = commitments.reduce((s: number, c: LpCommitment) => s + parseCr(c.calledAmount), 0);
  const toTarget    = target > 0 ? pct(funded, target) : '—';

  const cards = [
    { label: 'Target Size',     value: fmtCr(target),       icon: <Target className="w-5 h-5" />,       color: '#374151', bg: '#F3F4F6' },
    { label: 'Soft Circled',    value: fmtCr(softCircled),  icon: <TrendingUp className="w-5 h-5" />,   color: '#1D4ED8', bg: '#EFF6FF' },
    { label: 'LPA Signed',      value: fmtCr(signed),       icon: <CheckCircle2 className="w-5 h-5" />, color: '#4F46E5', bg: '#EEF2FF' },
    { label: 'Funded / Called', value: fmtCr(funded),       icon: <DollarSign className="w-5 h-5" />,   color: '#1C4B42', bg: '#F0F7E6' },
    { label: '% to Target',     value: toTarget,             icon: <Users className="w-5 h-5" />,        color: '#047857', bg: '#ECFDF5' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map(c => (
        <div key={c.label} className="rounded-xl border p-4 flex items-center gap-3" style={{ backgroundColor: c.bg, borderColor: c.color + '30' }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ color: c.color, backgroundColor: c.color + '18' }}>
            {c.icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-gray-500 font-medium truncate">{c.label}</p>
            <p className="text-base font-bold tabular-nums" style={{ color: c.color }}>{c.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FundClosingTracker() {
  const { store, addLpCommitment, updateLpCommitment, deleteLpCommitment } = useApp();

  const commitments: LpCommitment[] = store.lpCommitments ?? [];

  // Fund header config (local state — fund-level metadata)
  const [fundName, setFundName]           = useState('Cactus Fund II');
  const [targetFundSize, setTargetFundSize] = useState('10000');
  const [firstCloseDate, setFirstCloseDate] = useState('');
  const [finalCloseDate, setFinalCloseDate] = useState('');
  const [showAddModal, setShowAddModal]   = useState(false);

  // Filter to current fund
  const fundCommitments = useMemo(() => {
    return commitments.filter((c: LpCommitment) => c.fund === fundName);
  }, [commitments, fundName]);

  const targetNum = parseCr(targetFundSize);
  const softCircled = fundCommitments.reduce((s: number, c: LpCommitment) => s + parseCr(c.softCircledAmount), 0);
  const signed      = fundCommitments.reduce((s: number, c: LpCommitment) => s + parseCr(c.signedAmount), 0);
  const funded      = fundCommitments.reduce((s: number, c: LpCommitment) => s + parseCr(c.calledAmount), 0);

  const inputCls = "border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-green-500";

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: '#F6FAF7' }}>
      {/* Header */}
      <div className="border-b px-6 md:px-10 py-6 bg-white/70" style={{ borderColor: '#D4EDAA' }}>
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide" style={{ color: '#1C4B42' }}>
            Fund Closing Tracker
          </h1>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: '#1C4B42' }}
          >
            <Plus className="w-4 h-4" /> Add LP
          </button>
        </div>

        {/* Fund config row */}
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Fund Name</label>
            <input
              type="text"
              value={fundName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFundName(e.target.value)}
              className={inputCls}
              style={{ borderColor: '#D4EDAA' }}
              placeholder="Fund name"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Target Fund Size (₹L)</label>
            <input
              type="text"
              value={targetFundSize}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTargetFundSize(e.target.value)}
              className={inputCls}
              style={{ borderColor: '#D4EDAA' }}
              placeholder="e.g. 10000"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">First Close Date</label>
            <input
              type="date"
              value={firstCloseDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFirstCloseDate(e.target.value)}
              className={inputCls}
              style={{ borderColor: '#D4EDAA' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Final Close Date</label>
            <input
              type="date"
              value={finalCloseDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFinalCloseDate(e.target.value)}
              className={inputCls}
              style={{ borderColor: '#D4EDAA' }}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 md:px-10 py-8 space-y-8">
        {/* Stats */}
        <StatsCards commitments={fundCommitments} target={targetNum} />

        {/* Progress bars */}
        <div className="bg-white rounded-2xl border p-6 shadow-sm" style={{ borderColor: '#D4EDAA' }}>
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Fund Closing Progress</h2>
          <ProgressBars softCircled={softCircled} signed={signed} funded={funded} target={targetNum} />
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: '#D4EDAA' }}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">LP Commitments ({fundCommitments.length})</h2>
          </div>
          {fundCommitments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-10 h-10 text-gray-300" />
              <p className="text-gray-500 font-medium">No LP commitments yet</p>
              <p className="text-xs text-gray-400">Click "Add LP" to track a new commitment</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: '#F0F7E6' }}>
                  <tr>
                    {['LP Name', 'Email', 'Target (₹L)', 'Soft Circled', 'LPA Signed', 'Called', 'Status', 'Lead Partner', ''].map((h: string) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fundCommitments.map((c: LpCommitment) => (
                    <CommitmentRow
                      key={c.id}
                      commitment={c}
                      onUpdate={updateLpCommitment}
                      onDelete={deleteLpCommitment}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <AddLpModal
          fundName={fundName}
          onSave={addLpCommitment}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
