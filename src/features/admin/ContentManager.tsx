import { useState } from 'react';
import { Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ContentConfig } from '../../data/types';

const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';

const PAGES = [
  { key: 'portfolio',  label: 'Portfolio',  icon: '📊', hPh: 'Portfolio',  dPh: 'Your portfolio companies and investment performance' },
  { key: 'finance',    label: 'Finance',    icon: '💰', hPh: 'Finance',    dPh: 'Fund operations, capital calls, LP reporting' },
  { key: 'investment', label: 'Investment', icon: '🎯', hPh: 'Investment', dPh: 'Deal pipeline, IC memos, due diligence' },
  { key: 'operations', label: 'Operations', icon: '⚙️', hPh: 'Operations', dPh: 'Meeting notes, tasks, portfolio updates' },
  { key: 'toolkit',    label: 'VC Toolkit', icon: '🔧', hPh: 'VC Toolkit', dPh: 'Analytical frameworks and tools' },
  { key: 'workspace',  label: 'Workspace',  icon: '🏢', hPh: 'Workspace',  dPh: 'Resources, gaps tracker, team notes' },
  { key: 'admin',      label: 'Admin',      icon: '⚙️', hPh: 'Admin',      dPh: 'Platform administration and configuration' },
];

export default function ContentManager() {
  const { store, updateContentConfig } = useApp();
  const existing = store.contentConfig;
  const [content, setContent] = useState<ContentConfig>({
    pageDescriptions: existing?.pageDescriptions ?? {},
    sectionHeaders: existing?.sectionHeaders ?? {},
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateContentConfig(content);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-700">Content & Page Descriptions</p>
          <p className="text-xs text-gray-400 mt-0.5">Customize the heading and subtitle shown under each main tab. Leave blank to use defaults.</p>
        </div>
        <button onClick={save}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700">
          <Check className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-3">
        {PAGES.map(p => (
          <div key={p.key} className="border border-gray-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <span>{p.icon}</span>
              <p className="text-sm font-semibold text-gray-700">{p.label}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Page heading override</label>
                <input className={ic}
                  value={content.sectionHeaders[p.key] ?? ''}
                  onChange={e => setContent(c => ({ ...c, sectionHeaders: { ...c.sectionHeaders, [p.key]: e.target.value } }))}
                  placeholder={p.hPh} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Page subtitle / description</label>
                <input className={ic}
                  value={content.pageDescriptions[p.key] ?? ''}
                  onChange={e => setContent(c => ({ ...c, pageDescriptions: { ...c.pageDescriptions, [p.key]: e.target.value } }))}
                  placeholder={p.dPh} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
