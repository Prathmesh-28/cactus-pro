import { useState } from 'react';
import {
  Plus, X, Check, ChevronLeft, FileText, Trash2, Pencil,
  UserPlus, Download, Clock, CheckCircle, XCircle, AlertCircle,
  TrendingUp, DollarSign, Calendar, Building2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { IcMemo, IcMemoStatus } from '../../data/types';
import jsPDF from 'jspdf';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMO_SECTIONS: { key: keyof IcMemo; label: string }[] = [
  { key: 'executiveSummary',    label: 'Executive Summary'      },
  { key: 'companyBackground',   label: 'Company Background'     },
  { key: 'productDescription',  label: 'Product Description'    },
  { key: 'marketOpportunity',   label: 'Market Opportunity'     },
  { key: 'businessModel',       label: 'Business Model'         },
  { key: 'tractionHighlights',  label: 'Traction Highlights'    },
  { key: 'teamAssessment',      label: 'Team Assessment'        },
  { key: 'financialSummary',    label: 'Financial Summary'      },
  { key: 'competitiveLandscape',label: 'Competitive Landscape'  },
  { key: 'investmentThesis',    label: 'Investment Thesis'      },
  { key: 'keyRisks',            label: 'Key Risks'              },
  { key: 'mitigants',           label: 'Mitigants'              },
  { key: 'dealTerms',           label: 'Deal Terms'             },
];

const STATUS_FLOW: IcMemoStatus[] = ['draft', 'under_review', 'approved', 'rejected'];

const STATUS_META: Record<IcMemoStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  draft:        { label: 'Draft',        bg: 'bg-gray-100',   text: 'text-gray-600',  icon: <Clock className="w-3 h-3" /> },
  under_review: { label: 'Under Review', bg: 'bg-amber-100',  text: 'text-amber-700', icon: <AlertCircle className="w-3 h-3" /> },
  approved:     { label: 'Approved',     bg: 'bg-green-100',  text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> },
  rejected:     { label: 'Rejected',     bg: 'bg-red-100',    text: 'text-red-700',   icon: <XCircle className="w-3 h-3" /> },
};

const REC_META: Record<'invest' | 'pass' | 'follow_up', { label: string; bg: string; text: string }> = {
  invest:    { label: 'Invest',     bg: 'bg-green-100', text: 'text-green-700' },
  pass:      { label: 'Pass',       bg: 'bg-red-100',   text: 'text-red-700'   },
  follow_up: { label: 'Follow Up',  bg: 'bg-amber-100', text: 'text-amber-700' },
};

// ─── Empty form factory ───────────────────────────────────────────────────────

function emptyMemo(companyId = ''): Omit<IcMemo, 'id'> {
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  return {
    companyId,
    version: 1,
    status: 'draft',
    roundName: '',
    askAmount: '',
    proposedValuation: '',
    executiveSummary: '',
    companyBackground: '',
    productDescription: '',
    marketOpportunity: '',
    businessModel: '',
    tractionHighlights: '',
    teamAssessment: '',
    financialSummary: '',
    competitiveLandscape: '',
    investmentThesis: '',
    keyRisks: '',
    mitigants: '',
    dealTerms: '',
    recommendation: 'follow_up',
    recommendationNote: '',
    preparedBy: '',
    reviewedBy: [],
    icDate: today,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── PDF Export ───────────────────────────────────────────────────────────────

function exportMemoPDF(memo: IcMemo, companyName: string, firmName: string) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const MARGIN = 14;
  const recMeta = REC_META[memo.recommendation];

  // Header
  doc.setFillColor(28, 75, 66);
  doc.rect(0, 0, W, 28, 'F');
  doc.setFillColor(134, 202, 15);
  doc.rect(0, 28, W, 2.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(firmName.toUpperCase(), MARGIN, 11);
  doc.setFontSize(15);
  doc.text('INVESTMENT COMMITTEE MEMO', MARGIN, 22);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, W - MARGIN, 11, { align: 'right' });
  doc.setFontSize(10);
  doc.text(companyName, W - MARGIN, 22, { align: 'right' });
  doc.setTextColor(25, 28, 20);

  let y = 38;

  // Meta row
  const meta = [
    { label: 'Company',    value: companyName },
    { label: 'Round',      value: memo.roundName || '—' },
    { label: 'Ask',        value: memo.askAmount || '—' },
    { label: 'Valuation',  value: memo.proposedValuation || '—' },
    { label: 'IC Date',    value: memo.icDate || '—' },
    { label: 'Status',     value: STATUS_META[memo.status].label },
  ];
  const colW = (W - 28) / meta.length;
  meta.forEach((item, i) => {
    const x = MARGIN + i * colW;
    doc.setFillColor(246, 250, 247);
    doc.roundedRect(x, y, colW - 2, 16, 2, 2, 'F');
    doc.setFontSize(6.5);
    doc.setTextColor(85, 89, 81);
    doc.setFont('helvetica', 'normal');
    doc.text(item.label.toUpperCase(), x + 3, y + 5);
    doc.setFontSize(9);
    doc.setTextColor(28, 75, 66);
    doc.setFont('helvetica', 'bold');
    doc.text(item.value, x + 3, y + 12);
  });
  doc.setTextColor(25, 28, 20);
  y += 22;

  // Recommendation badge
  const recLabel = recMeta.label.toUpperCase();
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`Recommendation: ${recLabel}`, MARGIN, y);
  y += 5;
  if (memo.recommendationNote) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(85, 89, 81);
    const wrapped = doc.splitTextToSize(memo.recommendationNote, W - MARGIN * 2);
    doc.text(wrapped, MARGIN, y);
    y += wrapped.length * 4.5 + 4;
    doc.setTextColor(25, 28, 20);
  } else {
    y += 4;
  }

  // Reviewers
  if (memo.reviewedBy.length > 0) {
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(85, 89, 81);
    doc.text(`Prepared by: ${memo.preparedBy || '—'}   |   Reviewers: ${memo.reviewedBy.join(', ')}`, MARGIN, y);
    doc.setTextColor(25, 28, 20);
    y += 7;
  }

  // Sections
  MEMO_SECTIONS.forEach(({ key, label }) => {
    const content = (memo[key] as string) || '';
    if (!content.trim()) return;

    if (y > 265) { doc.addPage(); y = 20; }

    doc.setFillColor(246, 250, 247);
    doc.rect(MARGIN, y, W - MARGIN * 2, 7, 'F');
    doc.setTextColor(28, 75, 66);
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.text(label.toUpperCase(), MARGIN + 2, y + 5);
    doc.setTextColor(25, 28, 20);
    doc.setFont('helvetica', 'normal');
    y += 10;

    doc.setFontSize(9);
    const lines = doc.splitTextToSize(content, W - MARGIN * 2);
    lines.forEach((line: string) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, MARGIN, y);
      y += 4.8;
    });
    y += 4;
  });

  // Footer on each page
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(150, 150, 150);
    doc.text(`${firmName} — Confidential — IC Memo v${memo.version}`, MARGIN, 293);
    doc.text(`Page ${i} of ${pageCount}`, W - MARGIN, 293, { align: 'right' });
  }

  doc.save(`IC_Memo_${companyName.replace(/\s+/g, '_')}_${memo.icDate || 'draft'}.pdf`);
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: IcMemoStatus }) {
  const m = STATUS_META[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${m.bg} ${m.text}`}>
      {m.icon}{m.label}
    </span>
  );
}

function RecBadge({ rec }: { rec: 'invest' | 'pass' | 'follow_up' }) {
  const m = REC_META[rec];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      {m.label}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type View = 'list' | 'view' | 'form';

export default function IcMemoBuilder() {
  const { store, addIcMemo, updateIcMemo, deleteIcMemo } = useApp();
  const { firm, companies, icMemos = [] } = store;

  const [view, setView] = useState<View>('list');
  const [selectedMemo, setSelectedMemo] = useState<IcMemo | null>(null);
  const [editingMemo, setEditingMemo] = useState<IcMemo | null>(null);
  const [form, setForm] = useState<Omit<IcMemo, 'id'>>(emptyMemo(companies[0]?.id ?? ''));
  const [newReviewer, setNewReviewer] = useState('');
  const [filterStatus, setFilterStatus] = useState<IcMemoStatus | 'all'>('all');
  const [searchQ, setSearchQ] = useState('');

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cactus-accent/30 bg-white';
  const textareaCls = `${inputCls} resize-none`;

  // Auto-fill basic company data when company selection changes
  const handleCompanyChange = (companyId: string) => {
    const co = companies.find(c => c.id === companyId);
    if (!co) { setForm(f => ({ ...f, companyId })); return; }

    // Pre-populate financial summary and company background if blank
    const finSummary = form.financialSummary || [
      co.revenue ? `Revenue: ${co.revenue}` : '',
      co.ebitda  ? `EBITDA: ${co.ebitda}`   : '',
      co.moic    ? `MOIC: ${co.moic}x`      : '',
      co.irr     ? `IRR: ${co.irr}%`        : '',
    ].filter(Boolean).join('  |  ');

    const coBg = form.companyBackground || [
      co.longDescription || co.shortDescription,
      co.foundedYear ? `Founded: ${co.foundedYear}` : '',
      co.hqCity ? `HQ: ${co.hqCity}, ${co.country}` : '',
      co.stage ? `Stage: ${co.stage}` : '',
    ].filter(Boolean).join('\n');

    const proposedVal = form.proposedValuation || co.currentValuation || '';

    setForm(f => ({
      ...f,
      companyId,
      financialSummary: finSummary,
      companyBackground: coBg,
      proposedValuation: proposedVal,
    }));
  };

  const openNew = () => {
    const firstCompany = companies[0]?.id ?? '';
    const base = emptyMemo(firstCompany);
    // Auto-fill from first company
    const co = companies.find(c => c.id === firstCompany);
    if (co) {
      base.proposedValuation = co.currentValuation || '';
      base.financialSummary = [
        co.revenue ? `Revenue: ${co.revenue}` : '',
        co.ebitda  ? `EBITDA: ${co.ebitda}`   : '',
      ].filter(Boolean).join('  |  ');
      base.companyBackground = [co.longDescription || co.shortDescription, co.foundedYear ? `Founded: ${co.foundedYear}` : ''].filter(Boolean).join('\n');
    }
    setForm(base);
    setEditingMemo(null);
    setView('form');
  };

  const openEdit = (memo: IcMemo) => {
    setForm({ ...memo });
    setEditingMemo(memo);
    setView('form');
  };

  const openView = (memo: IcMemo) => {
    setSelectedMemo(memo);
    setView('view');
  };

  const backToList = () => {
    setView('list');
    setSelectedMemo(null);
    setEditingMemo(null);
    setNewReviewer('');
  };

  const saveMemo = () => {
    if (!form.companyId) return;
    const now = new Date().toISOString();
    if (editingMemo) {
      updateIcMemo({ ...editingMemo, ...form, updatedAt: now });
    } else {
      addIcMemo({ id: generateId(), ...form, createdAt: now, updatedAt: now });
    }
    backToList();
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this IC Memo? This cannot be undone.')) {
      deleteIcMemo(id);
      if (view !== 'list') backToList();
    }
  };

  const advanceStatus = (memo: IcMemo) => {
    const idx = STATUS_FLOW.indexOf(memo.status);
    if (idx < STATUS_FLOW.length - 1) {
      updateIcMemo({ ...memo, status: STATUS_FLOW[idx + 1], updatedAt: new Date().toISOString() });
      // Keep view in sync
      if (selectedMemo?.id === memo.id) setSelectedMemo({ ...memo, status: STATUS_FLOW[idx + 1] });
    }
  };

  const addReviewer = () => {
    const name = newReviewer.trim();
    if (!name || form.reviewedBy.includes(name)) return;
    setForm(f => ({ ...f, reviewedBy: [...f.reviewedBy, name] }));
    setNewReviewer('');
  };

  const removeReviewer = (name: string) => {
    setForm(f => ({ ...f, reviewedBy: f.reviewedBy.filter(r => r !== name) }));
  };

  // ─── Filtered list ───────────────────────────────────────────────────────
  const filteredMemos = icMemos.filter(m => {
    const co = companies.find(c => c.id === m.companyId);
    const name = co?.name ?? '';
    const matchesSearch = !searchQ || name.toLowerCase().includes(searchQ.toLowerCase()) || m.roundName.toLowerCase().includes(searchQ.toLowerCase());
    const matchesStatus = filterStatus === 'all' || m.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // ─── VIEW: Form ──────────────────────────────────────────────────────────
  if (view === 'form') {
    const selectedCo = companies.find(c => c.id === form.companyId);
    return (
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={backToList} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-heading text-xl font-bold text-gray-900">
                {editingMemo ? 'Edit IC Memo' : 'New IC Memo'}
              </h1>
              {selectedCo && <p className="text-sm text-gray-500">{selectedCo.name}</p>}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={backToList} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200">
              Cancel
            </button>
            <button
              onClick={saveMemo}
              disabled={!form.companyId}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: firm.primaryColor }}
            >
              <Check className="w-4 h-4" />
              {editingMemo ? 'Update Memo' : 'Save Memo'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* ── Section 1: Basic Info ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Building2 className="w-4 h-4" style={{ color: firm.primaryColor }} />
              Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">Company *</label>
                <select
                  className={inputCls}
                  value={form.companyId}
                  onChange={e => handleCompanyChange(e.target.value)}
                >
                  <option value="">Select company…</option>
                  {companies.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Auto-filled company info chip */}
              {selectedCo && (
                <div className="sm:col-span-2 flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  {selectedCo.stage && (
                    <span className="text-xs bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-gray-600">
                      Stage: {selectedCo.stage}
                    </span>
                  )}
                  {selectedCo.revenue && (
                    <span className="text-xs bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-gray-600">
                      Revenue: {selectedCo.revenue}
                    </span>
                  )}
                  {selectedCo.currentValuation && (
                    <span className="text-xs bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-gray-600">
                      Valuation: {selectedCo.currentValuation}
                    </span>
                  )}
                  {selectedCo.ownershipPct > 0 && (
                    <span className="text-xs bg-white border border-gray-200 rounded-full px-2.5 py-0.5 text-gray-600">
                      Cactus: {selectedCo.ownershipPct}%
                    </span>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Round Name</label>
                <input
                  className={inputCls}
                  placeholder="e.g. Series A, Pre-Seed"
                  value={form.roundName}
                  onChange={e => setForm(f => ({ ...f, roundName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ask Amount</label>
                <input
                  className={inputCls}
                  placeholder="e.g. ₹50 Cr"
                  value={form.askAmount}
                  onChange={e => setForm(f => ({ ...f, askAmount: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Proposed Valuation</label>
                <input
                  className={inputCls}
                  placeholder="e.g. ₹300 Cr"
                  value={form.proposedValuation}
                  onChange={e => setForm(f => ({ ...f, proposedValuation: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">IC Date</label>
                <input
                  className={inputCls}
                  type="date"
                  value={form.icDate}
                  onChange={e => setForm(f => ({ ...f, icDate: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Prepared By</label>
                <input
                  className={inputCls}
                  placeholder="Analyst / Partner name"
                  value={form.preparedBy}
                  onChange={e => setForm(f => ({ ...f, preparedBy: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                <select
                  className={inputCls}
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as IcMemoStatus }))}
                >
                  {STATUS_FLOW.map(s => (
                    <option key={s} value={s}>{STATUS_META[s].label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* ── Section 2: Memo Sections ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4" style={{ color: firm.primaryColor }} />
              Memo Sections
            </h2>
            <div className="space-y-4">
              {MEMO_SECTIONS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <textarea
                    className={textareaCls}
                    rows={4}
                    placeholder={`Enter ${label.toLowerCase()}…`}
                    value={(form[key as keyof typeof form] as string) || ''}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Section 3: Recommendation ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: firm.primaryColor }} />
              Recommendation
            </h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {(['invest', 'pass', 'follow_up'] as const).map(rec => {
                const m = REC_META[rec];
                const active = form.recommendation === rec;
                return (
                  <button
                    key={rec}
                    onClick={() => setForm(f => ({ ...f, recommendation: rec }))}
                    className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                      active
                        ? `border-transparent ${m.bg} ${m.text} shadow-sm`
                        : 'border-gray-200 text-gray-400 hover:border-gray-300'
                    }`}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Recommendation Note</label>
              <textarea
                className={textareaCls}
                rows={3}
                placeholder="Rationale for the recommendation…"
                value={form.recommendationNote}
                onChange={e => setForm(f => ({ ...f, recommendationNote: e.target.value }))}
              />
            </div>
          </div>

          {/* ── Section 4: Reviewers ── */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4" style={{ color: firm.primaryColor }} />
              IC Reviewers
            </h2>
            <div className="flex gap-2 mb-3">
              <input
                className={inputCls}
                placeholder="Add reviewer name…"
                value={newReviewer}
                onChange={e => setNewReviewer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addReviewer(); } }}
              />
              <button
                onClick={addReviewer}
                className="flex-shrink-0 px-3 py-2 text-sm font-medium rounded-lg text-white"
                style={{ backgroundColor: firm.primaryColor }}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            {form.reviewedBy.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {form.reviewedBy.map(name => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                  >
                    {name}
                    <button
                      onClick={() => removeReviewer(name)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No reviewers added yet.</p>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ─── VIEW: Full Memo Document ─────────────────────────────────────────────
  if (view === 'view' && selectedMemo) {
    const co = companies.find(c => c.id === selectedMemo.companyId);
    const nextStatus = STATUS_FLOW[STATUS_FLOW.indexOf(selectedMemo.status) + 1];

    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Top nav */}
        <div className="flex items-center justify-between mb-6 gap-3">
          <button onClick={backToList} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 flex-shrink-0">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {nextStatus && (
              <button
                onClick={() => advanceStatus(selectedMemo)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
              >
                Move to {STATUS_META[nextStatus].label}
              </button>
            )}
            <button
              onClick={() => openEdit(selectedMemo)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => exportMemoPDF(selectedMemo, co?.name ?? 'Company', firm.name)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white"
              style={{ backgroundColor: firm.primaryColor }}
            >
              <Download className="w-3.5 h-3.5" /> Export PDF
            </button>
            <button
              onClick={() => handleDelete(selectedMemo.id)}
              className="p-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-400"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Document */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          {/* Document header */}
          <div className="p-6 border-b border-gray-100" style={{ backgroundColor: firm.primaryColor }}>
            <p className="text-xs font-semibold text-white/60 uppercase tracking-widest mb-1">{firm.name} — Investment Committee</p>
            <h1 className="text-2xl font-bold text-white mb-0.5">{co?.name ?? 'Unknown Company'}</h1>
            <p className="text-white/80 text-sm">{selectedMemo.roundName}</p>
          </div>

          {/* Meta strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-gray-100 border-b border-gray-100">
            {[
              { label: 'Ask Amount',  value: selectedMemo.askAmount || '—',        icon: <DollarSign className="w-3.5 h-3.5" /> },
              { label: 'Valuation',   value: selectedMemo.proposedValuation || '—', icon: <TrendingUp className="w-3.5 h-3.5" /> },
              { label: 'IC Date',     value: selectedMemo.icDate || '—',            icon: <Calendar className="w-3.5 h-3.5" /> },
              { label: 'Version',     value: `v${selectedMemo.version}`,            icon: <FileText className="w-3.5 h-3.5" /> },
            ].map(item => (
              <div key={item.label} className="p-4">
                <div className="flex items-center gap-1 text-xs text-gray-400 mb-0.5">
                  {item.icon}{item.label}
                </div>
                <p className="text-sm font-semibold text-gray-800">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Status + recommendation */}
          <div className="px-6 py-4 flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gray-50">
            <StatusBadge status={selectedMemo.status} />
            <RecBadge rec={selectedMemo.recommendation} />
            {selectedMemo.recommendationNote && (
              <p className="text-sm text-gray-600 italic flex-1">{selectedMemo.recommendationNote}</p>
            )}
          </div>

          {/* Prepared by / Reviewers */}
          {(selectedMemo.preparedBy || selectedMemo.reviewedBy.length > 0) && (
            <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
              {selectedMemo.preparedBy && <span>Prepared by: <strong className="text-gray-700">{selectedMemo.preparedBy}</strong></span>}
              {selectedMemo.reviewedBy.length > 0 && (
                <span>Reviewers: <strong className="text-gray-700">{selectedMemo.reviewedBy.join(', ')}</strong></span>
              )}
            </div>
          )}

          {/* Sections */}
          <div className="divide-y divide-gray-100">
            {MEMO_SECTIONS.map(({ key, label }) => {
              const content = (selectedMemo[key] as string) || '';
              if (!content.trim()) return null;
              return (
                <div key={key} className="px-6 py-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">{label}</h3>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{content}</p>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between text-xs text-gray-400">
            <span>Created {new Date(selectedMemo.createdAt).toLocaleDateString('en-IN')}</span>
            <span>Last updated {new Date(selectedMemo.updatedAt).toLocaleDateString('en-IN')}</span>
          </div>
        </div>
      </main>
    );
  }

  // ─── VIEW: List ───────────────────────────────────────────────────────────
  return (
    <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-0.5">IC Memo Builder</h1>
          <p className="text-sm text-gray-500">{icMemos.length} memo{icMemos.length !== 1 ? 's' : ''} total</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: firm.primaryColor }}
        >
          <Plus className="w-4 h-4" />
          New IC Memo
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cactus-accent/30 bg-white w-56"
          placeholder="Search company or round…"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
        />
        <div className="flex gap-1.5 flex-wrap">
          {(['all', ...STATUS_FLOW] as const).map(s => {
            const active = filterStatus === s;
            const label = s === 'all' ? 'All' : STATUS_META[s].label;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
                  active
                    ? 'text-white border-transparent'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
                style={active ? { backgroundColor: firm.primaryColor } : {}}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      {filteredMemos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-200 rounded-2xl">
          <FileText className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-gray-400 font-medium mb-1">No IC memos found</p>
          <p className="text-sm text-gray-300">
            {searchQ || filterStatus !== 'all' ? 'Try adjusting your filters.' : 'Create your first memo to get started.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredMemos
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map(memo => {
              const co = companies.find(c => c.id === memo.companyId);
              return (
                <div
                  key={memo.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => openView(memo)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      {/* Company logo or initial */}
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold"
                        style={{ backgroundColor: firm.primaryColor }}
                      >
                        {co?.logoUrl ? (
                          <img src={co.logoUrl} alt={co.name} className="w-10 h-10 rounded-xl object-contain" />
                        ) : (
                          (co?.name?.[0] ?? '?')
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 leading-tight truncate">
                          {co?.name ?? 'Unknown Company'}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {memo.roundName || 'No round specified'}
                          {memo.askAmount && <span className="ml-2 text-gray-400">· {memo.askAmount}</span>}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <StatusBadge status={memo.status} />
                          <RecBadge rec={memo.recommendation} />
                          {memo.icDate && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Calendar className="w-3 h-3" />{memo.icDate}
                            </span>
                          )}
                          {memo.proposedValuation && (
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" />{memo.proposedValuation}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div
                      className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => exportMemoPDF(memo, co?.name ?? 'Company', firm.name)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        title="Export PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => openEdit(memo)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(memo.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Executive summary preview */}
                  {memo.executiveSummary && (
                    <p className="text-xs text-gray-400 mt-3 line-clamp-2 ml-13 pl-1 italic">
                      {memo.executiveSummary}
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </main>
  );
}
