import { useState } from 'react';
import { Check, Mail, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { EmailTemplates } from '../../data/types';

const ta = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white resize-none font-mono leading-relaxed';

const DEFAULT: EmailTemplates = {
  lpReport: `Dear [LP_NAME],\n\nPlease find attached our [QUARTER] [YEAR] portfolio update from Cactus Partners.\n\n[PERFORMANCE_SUMMARY]\n\nWarm regards,\n[PARTNER_NAME]\nCactus Partners`,
  capitalCall: `Dear [LP_NAME],\n\nWe are writing to inform you of a capital call.\n\nAmount Due: [AMOUNT]\nDue Date: [DUE_DATE]\nBank Details: [BANK_DETAILS]\n\nRegards,\n[PARTNER_NAME]`,
  founderWelcome: `Welcome to the Cactus Partners Founder Portal.\n\nYou now have access to your company's performance data and board materials.\n\nFor questions, contact [CONTACT_EMAIL].\n\nBest,\nThe Cactus Partners Team`,
  inviteUser: `You have been invited to join the Cactus Partners Portal.\n\nClick below to set your password:\n[INVITE_LINK]\n\nThis link expires in 48 hours.`,
};

const TEMPLATES: Array<{ key: keyof EmailTemplates; label: string; desc: string; vars: string[] }> = [
  { key: 'lpReport',       label: 'LP Quarterly Report',    desc: 'Sent to LPs with quarterly updates',          vars: ['[LP_NAME]','[QUARTER]','[YEAR]','[PERFORMANCE_SUMMARY]','[PARTNER_NAME]'] },
  { key: 'capitalCall',    label: 'Capital Call Notice',    desc: 'Capital call notification sent to LPs',       vars: ['[LP_NAME]','[AMOUNT]','[DUE_DATE]','[BANK_DETAILS]','[PARTNER_NAME]'] },
  { key: 'founderWelcome', label: 'Founder Portal Welcome', desc: 'Sent when a founder is given portal access',  vars: ['[CONTACT_EMAIL]'] },
  { key: 'inviteUser',     label: 'User Invite Email',      desc: 'Override the default invite email',           vars: ['[INVITE_LINK]'] },
];

export default function EmailTemplatesManager() {
  const { store, updateEmailTemplates } = useApp();
  const [templates, setTemplates] = useState<EmailTemplates>(store.emailTemplates ?? DEFAULT);
  const [active, setActive] = useState<keyof EmailTemplates>('lpReport');
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateEmailTemplates(templates);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const t = TEMPLATES.find(x => x.key === active)!;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">Email Templates</p>
          <p className="text-xs text-gray-400 mt-0.5">Customize email text. Use <code className="bg-gray-100 px-1 rounded">[VARIABLES]</code> as dynamic placeholders.</p>
        </div>
        <button onClick={save}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700">
          <Check className="w-4 h-4" /> {saved ? 'Saved!' : 'Save All'}
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {TEMPLATES.map(tp => (
          <button key={tp.key} onClick={() => setActive(tp.key)}
            className={`text-left px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors flex flex-col gap-1 ${
              active === tp.key ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}>
            <Mail className="w-3.5 h-3.5" />
            {tp.label}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <p className="text-xs font-semibold text-gray-700">{t.label}</p>
          <p className="text-xs text-gray-400">{t.desc}</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {t.vars.map(v => (
              <span key={v} className="text-[11px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono">{v}</span>
            ))}
          </div>
        </div>
        <div className="p-4 space-y-3">
          <textarea className={ta} rows={12}
            value={templates[active]}
            onChange={e => setTemplates(prev => ({ ...prev, [active]: e.target.value }))} />
          <div className="flex items-start gap-2 text-xs text-gray-400">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            Variables in brackets are auto-replaced when emails are sent.
          </div>
        </div>
      </div>
    </div>
  );
}
