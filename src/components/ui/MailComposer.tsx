import { useState, useEffect } from 'react';
import { X, Mail, Send, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface MailComposerProps {
  isOpen: boolean;
  onClose: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  initialCc?: string;
  initialBcc?: string;
  recipientName?: string;
  context?: 'founder' | 'lp' | 'co_investor' | 'team' | 'general';
}

const FROM_EMAIL = 'prathmeshwalimbe.cactuspartners@gmail.com';

const now = new Date();
const MONTH_YEAR = now.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
const QUARTER = `Q${Math.ceil((now.getMonth() + 1) / 3)}`;
const YEAR = now.getFullYear();

type TemplateKey = 'Portfolio Update' | 'LP Quarterly' | 'Founder Check-in' | 'Co-investor Intro' | 'Board Pack' | 'Custom';

const TEMPLATES: Record<TemplateKey, { subject: string; body: string }> = {
  'Portfolio Update': {
    subject: `Portfolio Update — ${MONTH_YEAR}`,
    body: `Dear [Name],\n\nPlease find below the latest update from Cactus Partners.\n\n[Add update content here]\n\nBest regards,\nCactus Partners Team`,
  },
  'LP Quarterly': {
    subject: `Cactus Fund — ${QUARTER} ${YEAR} Investor Update`,
    body: `Dear [Name],\n\nWe are pleased to share our quarterly update.\n\nFUND HIGHLIGHTS\n• [Add highlights]\n\nPORTFOLIO UPDATES\n• [Add company updates]\n\nOUTLOOK\n[Add outlook]\n\nAs always, please reach out if you have any questions.\n\nWarm regards,\nCactus Partners`,
  },
  'Founder Check-in': {
    subject: `Checking In — [Company Name]`,
    body: `Hi [Name],\n\nHope all is well! Wanted to check in and see how things are progressing.\n\nA few questions:\n1. How is the team?\n2. Any blockers we can help with?\n3. Runway and fundraise timeline?\n\nHappy to jump on a call anytime.\n\nBest,\nCactus Partners`,
  },
  'Co-investor Intro': {
    subject: `Introduction — Cactus Partners`,
    body: `Hi [Name],\n\nGreat connecting with you. As discussed, we'd love to explore co-investment opportunities.\n\nCactus Partners is an early and growth-stage VC firm based in Mumbai, focused on deep-tech, sustainability, and consumer innovation.\n\nWould love to set up a call to discuss potential synergies.\n\nBest regards,\nCactus Partners`,
  },
  'Board Pack': {
    subject: `Board Meeting — [Company Name] — ${MONTH_YEAR}`,
    body: `Dear Board Members,\n\nPlease find attached the board pack for our upcoming meeting.\n\nAgenda:\n1. Business update\n2. Financial review\n3. Key decisions\n4. AOB\n\nPlease come prepared with questions.\n\nRegards,\nCactus Partners`,
  },
  'Custom': {
    subject: '',
    body: '',
  },
};

const TEMPLATE_KEYS = Object.keys(TEMPLATES) as TemplateKey[];

type SendState = 'idle' | 'sending' | 'success' | 'error';

export default function MailComposer({
  isOpen,
  onClose,
  initialTo = '',
  initialSubject = '',
  initialBody = '',
  initialCc = '',
  initialBcc = '',
}: MailComposerProps) {
  const { getAccessToken } = useAuth();

  const [to, setTo]           = useState(initialTo);
  const [cc, setCc]           = useState(initialCc);
  const [bcc, setBcc]         = useState(initialBcc);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody]       = useState(initialBody);
  const [showCc, setShowCc]   = useState(!!initialCc);
  const [showBcc, setShowBcc] = useState(!!initialBcc);
  const [activeTemplate, setActiveTemplate] = useState<TemplateKey | null>(null);
  const [sendState, setSendState] = useState<SendState>('idle');
  const [sentTo, setSentTo]   = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Sync props when modal opens
  useEffect(() => {
    if (isOpen) {
      setTo(initialTo);
      setCc(initialCc);
      setBcc(initialBcc);
      setSubject(initialSubject);
      setBody(initialBody);
      setShowCc(!!initialCc);
      setShowBcc(!!initialBcc);
      setActiveTemplate(null);
      setSendState('idle');
      setSentTo('');
    }
  }, [isOpen]);

  const applyTemplate = (key: TemplateKey) => {
    setActiveTemplate(key);
    if (key !== 'Custom') {
      setSubject(TEMPLATES[key].subject);
      setBody(TEMPLATES[key].body);
    }
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim()) return;
    setSendState('sending');

    const token = getAccessToken() || localStorage.getItem('cactus_token');
    if (token) {
      try {
        const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
        const res = await fetch(`${BASE}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            to: to.trim(),
            subject: subject.trim(),
            body: body.trim(),
            ...(cc.trim()  ? { cc: cc.trim() }   : {}),
            ...(bcc.trim() ? { bcc: bcc.trim() } : {}),
            from_name: 'Cactus Partners',
          }),
        });
        if (res.ok) {
          setSentTo(to.trim());
          setSendState('success');
          return;
        }
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || `Server error ${res.status}. Check Render logs.`);
      } catch (e: unknown) {
        setErrorMsg(e instanceof Error ? e.message : 'Network error — is the backend running?');
      }
    } else {
      setErrorMsg('Not authenticated. Please log out and log back in.');
    }
    setSendState('error');
  };

  const handleClose = () => {
    setSendState('idle');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        className="relative w-full bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ maxWidth: 680 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: '#E3EDE9' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1C4B42' }}>
              <Mail className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-base font-bold" style={{ color: '#1C4B42' }}>Compose Email</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success state */}
        {sendState === 'success' && (
          <div className="flex flex-col items-center justify-center py-16 px-8 gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: '#E5F7DB' }}>
              <Check className="w-7 h-7" style={{ color: '#1C4B42' }} />
            </div>
            <p className="text-base font-semibold" style={{ color: '#1C4B42' }}>Email sent!</p>
            <p className="text-sm text-gray-500">Delivered to <span className="font-medium text-gray-700">{sentTo}</span></p>
            <button
              onClick={handleClose}
              className="mt-2 px-5 py-2 rounded-lg text-sm font-medium text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1C4B42' }}
            >
              Close
            </button>
          </div>
        )}

        {/* Error state */}
        {sendState === 'error' && (
          <div className="flex flex-col items-center justify-center py-12 px-8 gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center bg-red-50">
              <X className="w-7 h-7 text-red-500" />
            </div>
            <p className="text-base font-semibold text-gray-800">Email not sent</p>
            <p className="text-sm text-red-500 text-center max-w-sm">{errorMsg}</p>
            <p className="text-xs text-gray-400 text-center max-w-sm">
              Gmail is not configured yet. Complete the setup in Render env vars (GMAIL_USER, GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN) then redeploy.
            </p>
            <button
              onClick={() => setSendState('idle')}
              className="mt-2 px-5 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#1C4B42' }}
            >
              Back to compose
            </button>
          </div>
        )}

        {/* Compose form */}
        {sendState !== 'success' && sendState !== 'error' && (
          <div className="flex flex-col overflow-y-auto" style={{ maxHeight: '80vh' }}>
            {/* From */}
            <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: '#F2F7F1' }}>
              <span className="text-xs font-medium text-gray-400 w-14 shrink-0">From</span>
              <span
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{ backgroundColor: '#E5F7DB', color: '#1C4B42' }}
              >
                {FROM_EMAIL}
              </span>
            </div>

            {/* To */}
            <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: '#F2F7F1' }}>
              <label className="text-xs font-medium text-gray-400 w-14 shrink-0">To</label>
              <input
                type="email"
                value={to}
                onChange={e => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-300"
              />
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowCc(v => !v)}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5 transition-colors"
                >
                  CC {showCc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                <span className="text-gray-200">|</span>
                <button
                  onClick={() => setShowBcc(v => !v)}
                  className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-0.5 transition-colors"
                >
                  BCC {showBcc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* CC — collapsible */}
            {showCc && (
              <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: '#F2F7F1' }}>
                <label className="text-xs font-medium text-gray-400 w-14 shrink-0">CC</label>
                <input
                  type="text"
                  value={cc}
                  onChange={e => setCc(e.target.value)}
                  placeholder="cc@example.com, another@example.com"
                  className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-300"
                />
              </div>
            )}

            {/* BCC — collapsible */}
            {showBcc && (
              <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: '#F2F7F1' }}>
                <label className="text-xs font-medium text-gray-400 w-14 shrink-0">BCC</label>
                <input
                  type="text"
                  value={bcc}
                  onChange={e => setBcc(e.target.value)}
                  placeholder="bcc@example.com, another@example.com"
                  className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-300"
                />
              </div>
            )}

            {/* Subject */}
            <div className="flex items-center gap-3 px-6 py-3 border-b" style={{ borderColor: '#F2F7F1' }}>
              <label className="text-xs font-medium text-gray-400 w-14 shrink-0">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Email subject"
                className="flex-1 text-sm outline-none text-gray-800 placeholder-gray-300 font-medium"
              />
            </div>

            {/* Templates */}
            <div className="px-6 py-3 border-b" style={{ borderColor: '#F2F7F1' }}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Templates</p>
              <div className="flex flex-wrap gap-1.5">
                {TEMPLATE_KEYS.map(key => (
                  <button
                    key={key}
                    onClick={() => applyTemplate(key)}
                    className="px-2.5 py-1 rounded-full text-xs font-medium border transition-all"
                    style={
                      activeTemplate === key
                        ? { backgroundColor: '#1C4B42', color: '#fff', borderColor: '#1C4B42' }
                        : { backgroundColor: '#fff', color: '#555', borderColor: '#D1D5DB' }
                    }
                  >
                    {key}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 flex-1">
              <textarea
                rows={12}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your message here…"
                className="w-full text-sm text-gray-800 placeholder-gray-300 outline-none resize-none"
                style={{ fontFamily: "'Courier New', Courier, monospace", lineHeight: '1.6' }}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: '#E3EDE9', backgroundColor: '#F9FBFA' }}>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-500 hover:bg-gray-100 transition-colors"
              >
                Discard
              </button>
              <button
                onClick={handleSend}
                disabled={!to.trim() || !subject.trim() || sendState === 'sending'}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                style={{ backgroundColor: '#1C4B42' }}
              >
                {sendState === 'sending' ? (
                  <>
                    <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Sending…
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Send
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
