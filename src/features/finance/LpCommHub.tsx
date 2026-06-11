import { useState, useMemo } from 'react';
import {
  Plus, Mail, Send, FileText, X, Paperclip, Users,
  CheckCircle2, Clock, ChevronRight, Inbox, Download, Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import { exportLpCommPDF } from '../../lib/export';
import type { LpCommunication, LpCommType } from '../../data/types';
import type { AppStore } from '../../data/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const COMM_TYPE_LABELS: Record<LpCommType, string> = {
  quarterly_update:    'Quarterly Update',
  capital_call_notice: 'Capital Call Notice',
  distribution_notice: 'Distribution Notice',
  annual_report:       'Annual Report',
  ad_hoc:              'Ad Hoc',
};

const COMM_TYPE_COLORS: Record<LpCommType, { bg: string; text: string }> = {
  quarterly_update:    { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  capital_call_notice: { bg: 'bg-indigo-100', text: 'text-indigo-700' },
  distribution_notice: { bg: 'bg-teal-100',   text: 'text-teal-700'   },
  annual_report:       { bg: 'bg-amber-100',  text: 'text-amber-700'  },
  ad_hoc:              { bg: 'bg-gray-100',   text: 'text-gray-600'   },
};

const TEMPLATES: Record<string, { type: LpCommType; subject: string; body: string }> = {
  'Quarterly Update': {
    type: 'quarterly_update',
    subject: 'Q[X] FY[YY] – Cactus Fund Portfolio Update',
    body: `Dear [LP Name],\n\nWe are pleased to share the Quarterly Update for Q[X] FY[YY].\n\n**Portfolio Highlights**\n- [Key milestone 1]\n- [Key milestone 2]\n\n**Fund Performance**\nNAV: ₹[X]Cr | MOIC: [X]x | IRR: [X]%\n\n**Key Developments**\n[Describe major events this quarter]\n\n**Upcoming**\n[Next quarter focus areas]\n\nPlease feel free to reach out with any questions.\n\nWarm regards,\nCactus Investment Team`,
  },
  'Capital Call': {
    type: 'capital_call_notice',
    subject: 'Capital Call Notice – Cactus Fund [X] – [Date]',
    body: `Dear [LP Name],\n\nPursuant to Section [X] of the LPA, we hereby issue a Capital Call Notice.\n\n**Amount Called:** ₹[X]L\n**Due Date:** [Date]\n**Purpose:** [Investment purpose / fund expenses]\n\n**Wire Instructions:**\nBank: [Bank Name]\nAccount No: [XXXX]\nIFSC: [XXXX]\n\nPlease ensure funds are received by the due date. Contact us at finance@cactus.vc for any queries.\n\nRegards,\nCactus Finance Team`,
  },
  'Distribution': {
    type: 'distribution_notice',
    subject: 'Distribution Notice – Cactus Fund [X] – [Date]',
    body: `Dear [LP Name],\n\nWe are pleased to inform you of a distribution from Cactus Fund [X].\n\n**Distribution Amount:** ₹[X]L\n**Distribution Date:** [Date]\n**Source:** [Exit / Dividend / Other]\n**Your Pro-Rata Share:** ₹[X]L\n\nFunds will be transferred to your registered bank account within 5 business days.\n\nThank you for your continued trust in Cactus.\n\nRegards,\nCactus Finance Team`,
  },
};

// ─── Live-data fill ───────────────────────────────────────────────────────────

function currentQuarterFY() {
  const now = new Date();
  const m = now.getMonth() + 1;
  const yr = now.getFullYear();
  let q: number, fy1: number;
  if (m >= 4) { fy1 = yr; q = m < 7 ? 1 : m < 10 ? 2 : 3; }
  else         { fy1 = yr - 1; q = 4; }
  return { q, label: `Q${q} FY${fy1}-${String(fy1 + 1).slice(2)}`, fy: `FY${fy1}-${String(fy1 + 1).slice(2)}` };
}

function getFM(store: AppStore, ...keys: string[]): string {
  for (const k of keys) {
    const m = (store.fundMetrics ?? []).find(fm => fm.label.toLowerCase().includes(k.toLowerCase()));
    if (m?.value) return m.value;
  }
  return '—';
}

function fillFromLiveData(type: LpCommType, store: AppStore): { subject: string; body: string } {
  const { label, fy } = currentQuarterFY();
  const firmName = store.firm?.name ?? 'Cactus Partners';
  const active = store.companies.filter(c => c.status === 'Active');
  const exited = store.companies.filter(c => c.status === 'Exited').length;
  const top = [...active].sort((a, b) => (Number(b.moic) || 0) - (Number(a.moic) || 0)).slice(0, 3);
  const topAll = [...active].sort((a, b) => (Number(b.moic) || 0) - (Number(a.moic) || 0)).slice(0, 5);

  const tvpi      = getFM(store, 'tvpi', 'net moic', 'gross moic');
  const irr       = getFM(store, 'net irr', 'irr');
  const nav       = getFM(store, 'nav', 'net asset', 'aum');
  const invested  = getFM(store, 'total invested', 'deployed', 'invested capital');
  const dateStr   = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

  if (type === 'quarterly_update') {
    const highlights = top.length
      ? top.map(c => `- ${c.name}: ${c.moic}x MOIC${c.revenue ? ` | Rev ₹${c.revenue}` : ''}${c.stage ? ` | ${c.stage}` : ''}`).join('\n')
      : '- [Add key portfolio highlights]';
    return {
      subject: `${label} – ${firmName} Portfolio Update`,
      body: `Dear [LP Name],

We are pleased to share the Portfolio Update for ${label}.

**Portfolio Highlights**
${highlights}

**Portfolio Summary**
Active: ${active.length} companies | Exited: ${exited} | Total: ${store.companies.length}

**Fund Performance**
TVPI: ${tvpi} | Net IRR: ${irr} | NAV: ${nav} | Total Invested: ${invested}

**Key Developments**
[Describe major events this quarter — board changes, product launches, key hires, follow-on rounds]

**Upcoming**
[Next quarter focus areas and planned follow-on investments]

Please feel free to reach out with any questions.

Warm regards,
${firmName}`,
    };
  }

  if (type === 'annual_report') {
    const companyList = topAll.length
      ? topAll.map(c => `- ${c.name}: ${c.moic}x MOIC | ${c.stage} | ${c.ownershipPct}% Cactus stake`).join('\n')
      : '- [Add portfolio companies]';
    return {
      subject: `Annual Report ${fy} – ${firmName}`,
      body: `Dear [LP Name],

We are pleased to share the Annual Report for ${fy}.

**Portfolio Overview**
${store.companies.length} total companies — ${active.length} active, ${exited} exited

**Top Portfolio Companies by MOIC**
${companyList}

**Fund Performance**
TVPI: ${tvpi} | Net IRR: ${irr} | NAV: ${nav} | Total Invested: ${invested}

**Year in Review**
[Key milestones, exits, new investments, and strategic developments during ${fy}]

**Strategy & Outlook**
[Investment thesis, focus sectors, and deployment plans for the year ahead]

Thank you for your continued trust and partnership.

Warm regards,
${firmName}`,
    };
  }

  if (type === 'capital_call_notice') {
    return {
      subject: `Capital Call Notice – ${firmName} – ${dateStr}`,
      body: `Dear [LP Name],

Pursuant to Section [X] of the Limited Partnership Agreement, we hereby issue a Capital Call Notice.

**Amount Called:** ₹[X]L
**Due Date:** [Date — 10 business days from today]
**Purpose:** [Investment in portfolio company / fund management expenses]
**Your Pro-Rata Share:** ₹[X]L (based on your [X]% commitment)

**Wire Instructions:**
Bank: [Bank Name]
Account No: [XXXX]
IFSC: [XXXX]
Reference: Capital Call – ${fy} – [LP Name]

Please ensure funds are received by the due date. Contact finance@cactuspartners.in for any queries.

Regards,
${firmName} Finance Team`,
    };
  }

  if (type === 'distribution_notice') {
    return {
      subject: `Distribution Notice – ${firmName} – ${dateStr}`,
      body: `Dear [LP Name],

We are pleased to inform you of a distribution from ${firmName}.

**Distribution Amount:** ₹[X]Cr
**Distribution Date:** ${dateStr}
**Source:** [Exit proceeds / Dividend / Other]
**Your Pro-Rata Share:** ₹[X]L (based on your [X]% commitment)
**DPI to Date:** ${getFM(store, 'dpi', 'distributions')}

Funds will be transferred to your registered bank account within 5 business days.

Thank you for your continued trust in ${firmName}.

Regards,
${firmName} Finance Team`,
    };
  }

  // ad_hoc
  return {
    subject: `Update from ${firmName} — ${dateStr}`,
    body: `Dear [LP Name],\n\n[Message body]\n\nWarm regards,\n${firmName}`,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString();
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Type Badge ───────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: LpCommType }) {
  const c = COMM_TYPE_COLORS[type];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${c.bg} ${c.text}`}>
      {COMM_TYPE_LABELS[type]}
    </span>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: 'draft' | 'sent' }) {
  return status === 'sent' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
      <CheckCircle2 className="w-3 h-3" /> Sent
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
      <Clock className="w-3 h-3" /> Draft
    </span>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

interface DetailPanelProps {
  comm: LpCommunication;
  lpNames: Record<string, string>;
  firmName: string;
  onClose: () => void;
  onSend: (id: string) => void;
  onDelete: (id: string) => void;
}

function DetailPanel({ comm, lpNames, firmName, onClose, onSend, onDelete }: DetailPanelProps) {
  const targetLabel =
    comm.targetLpIds.length === 0
      ? 'All LPs'
      : `${comm.targetLpIds.length} LP${comm.targetLpIds.length !== 1 ? 's' : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ borderTop: '4px solid #1E293B' }}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <TypeBadge type={comm.type} />
              <StatusBadge status={comm.status} />
              {comm.openCount > 0 && (
                <span className="text-xs text-gray-400">{comm.openCount} opens</span>
              )}
            </div>
            <h3 className="text-base font-semibold text-gray-900 break-words">{comm.subject}</h3>
            <p className="text-xs text-gray-400 mt-1">
              {comm.status === 'sent' && comm.sentAt ? `Sent ${fmtDate(comm.sentAt)}` : `Created ${fmtDate(comm.createdAt)}`}
              {' · '}{targetLabel}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Message body */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Message</p>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap font-mono leading-relaxed max-h-72 overflow-y-auto border border-gray-100">
              {comm.body || <span className="text-gray-400 italic">No content</span>}
            </div>
          </div>

          {/* Attachments */}
          {comm.attachmentUrls.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Attachments</p>
              <div className="space-y-1.5">
                {comm.attachmentUrls.map((url: string, i: number) => (
                  <a
                    key={i}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{url}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* LP targets */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Target LPs — {targetLabel}
            </p>
            {comm.targetLpIds.length === 0 ? (
              <p className="text-sm text-gray-500 italic">Sent to all LPs in the fund.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {comm.targetLpIds.map((lpId: string) => (
                  <span key={lpId} className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                    {lpNames[lpId] ?? lpId}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={() => { if (window.confirm('Delete this communication?')) onDelete(comm.id); }}
            className="text-sm text-red-500 hover:text-red-700"
          >
            Delete
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => exportLpCommPDF(comm, firmName)}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border font-medium text-gray-600 hover:bg-gray-50"
              style={{ borderColor: '#94A3B8' }}
            >
              <Download className="w-4 h-4" /> Export PDF
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
            >
              Close
            </button>
            {comm.status === 'draft' && (
              <button
                onClick={() => onSend(comm.id)}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#1E293B' }}
              >
                <Send className="w-4 h-4" /> Send Now
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Compose Modal ────────────────────────────────────────────────────────────

interface ComposeModalProps {
  lps: Array<{ id: string; name: string }>;
  onSave: (comm: LpCommunication) => void;
  onClose: () => void;
}

function ComposeModal({ lps, onSave, onClose }: ComposeModalProps) {
  const { store } = useApp();
  const [type, setType]             = useState<LpCommType>('quarterly_update');
  const [subject, setSubject]       = useState('');
  const [body, setBody]             = useState('');
  const [allLps, setAllLps]         = useState(true);
  const [selectedLps, setSelectedLps] = useState<Set<string>>(new Set());
  const [attachments, setAttachments] = useState<string[]>([]);
  const [newAttachment, setNewAttachment] = useState('');

  const applyTemplate = (key: string) => {
    const t = TEMPLATES[key];
    if (!t) return;
    setType(t.type);
    setSubject(t.subject);
    setBody(t.body);
  };

  const toggleLp = (id: string) => {
    setSelectedLps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const addAttachment = () => {
    if (newAttachment.trim()) {
      setAttachments(prev => [...prev, newAttachment.trim()]);
      setNewAttachment('');
    }
  };

  const removeAttachment = (i: number) => {
    setAttachments(prev => prev.filter((_: string, idx: number) => idx !== i));
  };

  const buildComm = (status: 'draft' | 'sent'): LpCommunication => ({
    id: generateId(),
    type,
    subject,
    body,
    attachmentUrls: attachments,
    targetLpIds: allLps ? [] : Array.from(selectedLps),
    sentAt: status === 'sent' ? today() : undefined,
    sentBy: status === 'sent' ? 'Admin' : undefined,
    status,
    openCount: 0,
    createdAt: today(),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col" style={{ borderTop: '4px solid #1E293B' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">New Communication</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Templates + Live Fill */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Quick Templates</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(TEMPLATES).map((key: string) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-green-50"
                  style={{ borderColor: '#94A3B8', color: '#1E293B' }}
                >
                  {key}
                </button>
              ))}
              <button
                onClick={() => {
                  const filled = fillFromLiveData(type, store);
                  setSubject(filled.subject);
                  setBody(filled.body);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors hover:bg-lime-50"
                style={{ borderColor: '#86CA0F', color: '#3A6B00' }}
                title="Auto-fill this template with live fund metrics and portfolio data"
              >
                <Sparkles className="w-3.5 h-3.5" /> Fill from Live Data
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              "Fill from Live Data" pulls your current fund TVPI, IRR, NAV, and top companies.
            </p>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
            <select
              value={type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as LpCommType)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              style={{ borderColor: '#E2E8F0' }}
            >
              {(Object.keys(COMM_TYPE_LABELS) as LpCommType[]).map((k: LpCommType) => (
                <option key={k} value={k}>{COMM_TYPE_LABELS[k]}</option>
              ))}
            </select>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Subject *</label>
            <input
              type="text"
              value={subject}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSubject(e.target.value)}
              placeholder="Email subject line"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              style={{ borderColor: '#E2E8F0' }}
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Body *</label>
            <textarea
              rows={10}
              value={body}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setBody(e.target.value)}
              placeholder="Write your message here..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500 resize-none font-mono"
              style={{ borderColor: '#E2E8F0' }}
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Attachments (URLs)</label>
            <div className="space-y-2 mb-2">
              {attachments.map((url: string, i: number) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-blue-600 truncate border rounded px-2 py-1 bg-blue-50 border-blue-100">{url}</span>
                  <button onClick={() => removeAttachment(i)} className="text-gray-400 hover:text-red-500">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="url"
                value={newAttachment}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewAttachment(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addAttachment()}
                placeholder="https://..."
                className="flex-1 border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-green-500"
                style={{ borderColor: '#E2E8F0' }}
              />
              <button
                onClick={addAttachment}
                className="px-3 py-1.5 text-xs rounded-lg border font-medium"
                style={{ borderColor: '#94A3B8', color: '#1E293B' }}
              >
                Add
              </button>
            </div>
          </div>

          {/* Target LPs */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Target LPs</label>
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input
                type="checkbox"
                checked={allLps}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAllLps(e.target.checked)}
                className="w-4 h-4 accent-green-600"
              />
              <span className="text-sm text-gray-700">Send to All LPs</span>
            </label>
            {!allLps && (
              <div className="max-h-40 overflow-y-auto rounded-lg border divide-y divide-gray-100" style={{ borderColor: '#E2E8F0' }}>
                {lps.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-400 italic">No LPs found. Add LPs in the Finance section.</p>
                ) : (
                  lps.map((lp: { id: string; name: string }) => (
                    <label key={lp.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-green-50">
                      <input
                        type="checkbox"
                        checked={selectedLps.has(lp.id)}
                        onChange={() => toggleLp(lp.id)}
                        className="w-4 h-4 accent-green-600"
                      />
                      <span className="text-sm text-gray-800">{lp.name}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => { if (subject && body) { onSave(buildComm('draft')); onClose(); } }}
              disabled={!subject || !body}
              className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg border font-medium disabled:opacity-40"
              style={{ borderColor: '#94A3B8', color: '#1E293B' }}
            >
              <FileText className="w-4 h-4" /> Save Draft
            </button>
            <button
              onClick={() => { if (subject && body) { onSave(buildComm('sent')); onClose(); } }}
              disabled={!subject || !body}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-40"
              style={{ backgroundColor: '#1E293B' }}
            >
              <Send className="w-4 h-4" /> Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Comm Row ─────────────────────────────────────────────────────────────────

interface CommRowProps {
  comm: LpCommunication;
  lpNames: Record<string, string>;
  onClick: () => void;
}

function CommRow({ comm, lpNames: _lpNames, onClick }: CommRowProps) {
  const targetLabel =
    comm.targetLpIds.length === 0
      ? 'All LPs'
      : `${comm.targetLpIds.length} LP${comm.targetLpIds.length !== 1 ? 's' : ''}`;

  return (
    <div
      onClick={onClick}
      className="flex flex-wrap items-center gap-3 px-5 py-4 bg-white rounded-xl border cursor-pointer hover:shadow-md transition-shadow"
      style={{ borderColor: comm.status === 'draft' ? '#D1D5DB' : '#E2E8F0' }}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: '#F8FAFC', color: '#1E293B' }}>
        <Mail className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-0.5">
          <TypeBadge type={comm.type} />
          <StatusBadge status={comm.status} />
        </div>
        <p className="text-sm font-semibold text-gray-900 truncate">{comm.subject || '(No subject)'}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {fmtDate(comm.createdAt)} · {targetLabel}
          {comm.attachmentUrls.length > 0 && (
            <span className="ml-2 inline-flex items-center gap-1"><Paperclip className="w-3 h-3" />{comm.attachmentUrls.length}</span>
          )}
          {comm.status === 'sent' && comm.openCount > 0 && (
            <span className="ml-2">{comm.openCount} opens</span>
          )}
        </p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LpCommHub() {
  const { store, addLpCommunication, updateLpCommunication, deleteLpCommunication, canEditFinance } = useApp();
  const canEdit = canEditFinance();

  const comms: LpCommunication[] = store.lpCommunications ?? [];
  const lps = store.lps ?? [];

  const [showCompose, setShowCompose] = useState(false);
  const [selectedId, setSelectedId]   = useState<string | null>(null);

  // Build LP name map
  const lpNames = useMemo(() => {
    const m: Record<string, string> = {};
    lps.forEach((lp: { id: string; name: string }) => { m[lp.id] = lp.name; });
    return m;
  }, [lps]);

  // Sort: drafts first, then by createdAt desc
  const sorted = useMemo(() => {
    return [...comms].sort((a: LpCommunication, b: LpCommunication) => {
      if (a.status === 'draft' && b.status !== 'draft') return -1;
      if (b.status === 'draft' && a.status !== 'draft') return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [comms]);

  const thisYear = new Date().getFullYear().toString();
  const sentThisYear = comms.filter(
    (c: LpCommunication) => c.status === 'sent' && c.sentAt && c.sentAt.startsWith(thisYear)
  ).length;
  const drafts = comms.filter((c: LpCommunication) => c.status === 'draft').length;

  const selectedComm = selectedId ? comms.find((c: LpCommunication) => c.id === selectedId) ?? null : null;

  const handleSend = async (id: string) => {
    const comm = comms.find((c: LpCommunication) => c.id === id);
    if (!comm) return;

    // Dispatch actual emails to target LPs via backend
    const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    const token = localStorage.getItem('cactus_token') || localStorage.getItem('cactus_access');
    const targetLps = comm.targetLpIds.includes('all')
      ? store.lps
      : store.lps.filter((lp: { id: string }) => comm.targetLpIds.includes(lp.id));

    let sent = 0;
    for (const lp of targetLps as { id: string; name: string }[]) {
      try {
        await fetch(`${BASE}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            to: (lp as Record<string, string>).email || '',
            subject: comm.subject,
            body: `Dear ${lp.name},\n\n${comm.body}`,
            from_name: store.firm?.name || 'Cactus Partners',
          }),
        });
        sent++;
      } catch { /* best-effort */ }
    }

    updateLpCommunication({
      ...comm,
      status: 'sent',
      sentAt: today(),
      sentBy: 'Admin',
      openCount: 0,
    });
    setSelectedId(null);
    if (targetLps.length > 0) {
      alert(`Communication sent to ${sent} of ${targetLps.length} LP${targetLps.length !== 1 ? 's' : ''}.`);
    }
  };

  const handleDelete = (id: string) => {
    deleteLpCommunication(id);
    setSelectedId(null);
  };

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: '#F6FAF7' }}>
      {/* Header */}
      <div className="border-b px-6 md:px-10 py-6 bg-white/70" style={{ borderColor: '#E2E8F0' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide" style={{ color: '#1E293B' }}>
              LP Communication Hub
            </h1>
            <p className="text-xs text-gray-400 mt-1 italic">
              Compose, manage and track all LP communications
            </p>
          </div>
          {canEdit && <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: '#1E293B' }}
          >
            <Plus className="w-4 h-4" /> New Communication
          </button>}
        </div>

        {/* Stats bar */}
        <div className="flex flex-wrap gap-6 mt-5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DCFCE7' }}>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{sentThisYear}</p>
              <p className="text-xs text-gray-400">Sent this year</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100">
              <Clock className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{drafts}</p>
              <p className="text-xs text-gray-400">Drafts</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#EEF2FF' }}>
              <Users className="w-4 h-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{lps.length}</p>
              <p className="text-xs text-gray-400">Total LPs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 px-6 md:px-10 py-8">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Inbox className="w-12 h-12 text-gray-300" />
            <p className="text-gray-500 font-medium">No communications yet</p>
            <p className="text-xs text-gray-400">Click "New Communication" to compose your first message</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sorted.map((comm: LpCommunication) => (
              <CommRow
                key={comm.id}
                comm={comm}
                lpNames={lpNames}
                onClick={() => setSelectedId(comm.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Compose modal */}
      {showCompose && (
        <ComposeModal
          lps={lps}
          onSave={canEdit ? addLpCommunication : () => {}}
          onClose={() => setShowCompose(false)}
        />
      )}

      {/* Detail panel */}
      {selectedComm && (
        <DetailPanel
          comm={selectedComm}
          lpNames={lpNames}
          firmName={store.firm?.name ?? 'Cactus Partners'}
          onClose={() => setSelectedId(null)}
          onSend={canEdit ? handleSend : () => {}}
          onDelete={canEdit ? handleDelete : () => {}}
        />
      )}
    </div>
  );
}
