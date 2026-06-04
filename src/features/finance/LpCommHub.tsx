import { useState, useMemo } from 'react';
import {
  Plus, Mail, Send, FileText, X, Paperclip, Users,
  CheckCircle2, Clock, ChevronRight, Inbox,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { LpCommunication, LpCommType } from '../../data/types';

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
  onClose: () => void;
  onSend: (id: string) => void;
  onDelete: (id: string) => void;
}

function DetailPanel({ comm, lpNames, onClose, onSend, onDelete }: DetailPanelProps) {
  const targetLabel =
    comm.targetLpIds.length === 0
      ? 'All LPs'
      : `${comm.targetLpIds.length} LP${comm.targetLpIds.length !== 1 ? 's' : ''}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" style={{ borderTop: '4px solid #1C4B42' }}>
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
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100"
            >
              Close
            </button>
            {comm.status === 'draft' && (
              <button
                onClick={() => onSend(comm.id)}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ backgroundColor: '#1C4B42' }}
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col" style={{ borderTop: '4px solid #1C4B42' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">New Communication</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Templates */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Quick Templates</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(TEMPLATES).map((key: string) => (
                <button
                  key={key}
                  onClick={() => applyTemplate(key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors hover:bg-green-50"
                  style={{ borderColor: '#86CA0F', color: '#1C4B42' }}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Type *</label>
            <select
              value={type}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as LpCommType)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500"
              style={{ borderColor: '#D4EDAA' }}
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
              style={{ borderColor: '#D4EDAA' }}
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
              style={{ borderColor: '#D4EDAA' }}
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
                style={{ borderColor: '#D4EDAA' }}
              />
              <button
                onClick={addAttachment}
                className="px-3 py-1.5 text-xs rounded-lg border font-medium"
                style={{ borderColor: '#86CA0F', color: '#1C4B42' }}
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
              <div className="max-h-40 overflow-y-auto rounded-lg border divide-y divide-gray-100" style={{ borderColor: '#D4EDAA' }}>
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
              style={{ borderColor: '#86CA0F', color: '#1C4B42' }}
            >
              <FileText className="w-4 h-4" /> Save Draft
            </button>
            <button
              onClick={() => { if (subject && body) { onSave(buildComm('sent')); onClose(); } }}
              disabled={!subject || !body}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-40"
              style={{ backgroundColor: '#1C4B42' }}
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
      style={{ borderColor: comm.status === 'draft' ? '#D1D5DB' : '#D4EDAA' }}
    >
      <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: '#F0F7E6', color: '#1C4B42' }}>
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
  const { store, addLpCommunication, updateLpCommunication, deleteLpCommunication } = useApp();

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
      <div className="border-b px-6 md:px-10 py-6 bg-white/70" style={{ borderColor: '#D4EDAA' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide" style={{ color: '#1C4B42' }}>
              LP Communication Hub
            </h1>
            <p className="text-xs text-gray-400 mt-1 italic">
              Compose, manage and track all LP communications
            </p>
          </div>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: '#1C4B42' }}
          >
            <Plus className="w-4 h-4" /> New Communication
          </button>
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
          onSave={addLpCommunication}
          onClose={() => setShowCompose(false)}
        />
      )}

      {/* Detail panel */}
      {selectedComm && (
        <DetailPanel
          comm={selectedComm}
          lpNames={lpNames}
          onClose={() => setSelectedId(null)}
          onSend={handleSend}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}
