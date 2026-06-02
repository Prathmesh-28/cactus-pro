import { useState } from 'react';
import { Plus, Trash2, Check, GripVertical } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { HomepageConfig, ValuePillar } from '../../data/types';

const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';
const ta = ic + ' resize-none';

export default function HomepageEditor() {
  const { store, updateHomepage } = useApp();
  const [h, setH] = useState<HomepageConfig>(store.homepage ?? {
    badge: '', heroTitle: '', heroSubtitle: '', ctaLabel: '', pillars: [], navLinks: [],
  });
  const [saved, setSaved] = useState(false);

  const save = () => { updateHomepage(h); setSaved(true); setTimeout(() => setSaved(false), 2000); };
  const set = <K extends keyof HomepageConfig>(k: K, v: HomepageConfig[K]) => setH(x => ({ ...x, [k]: v }));

  const updatePillar = (i: number, patch: Partial<ValuePillar>) =>
    set('pillars', h.pillars.map((p, j) => j === i ? { ...p, ...patch } : p));
  const addPillar = () => set('pillars', [...h.pillars, { title: 'New Pillar', description: '' }]);
  const removePillar = (i: number) => set('pillars', h.pillars.filter((_, j) => j !== i));

  const updateNavLink = (i: number, patch: Partial<{ label: string; href: string }>) =>
    set('navLinks', h.navLinks.map((n, j) => j === i ? { ...n, ...patch } : n));
  const addNavLink = () => set('navLinks', [...h.navLinks, { label: 'New Link', href: '#' }]);
  const removeNavLink = (i: number) => set('navLinks', h.navLinks.filter((_, j) => j !== i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Edit all homepage content — hero text, value pillars, badge, navigation links.</p>
        <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600">
          <Check className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Hero */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Hero Section</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Badge text</label>
            <input className={ic} value={h.badge} onChange={e => set('badge', e.target.value)}
              placeholder="e.g. Venture Capital · India" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">CTA button label</label>
            <input className={ic} value={h.ctaLabel} onChange={e => set('ctaLabel', e.target.value)}
              placeholder="e.g. Explore Portfolio" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Hero title</label>
            <input className={ic} value={h.heroTitle} onChange={e => set('heroTitle', e.target.value)}
              placeholder="Building Tomorrow's Indian Champions" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Hero subtitle</label>
            <textarea className={ta} rows={3} value={h.heroSubtitle} onChange={e => set('heroSubtitle', e.target.value)}
              placeholder="We partner with exceptional founders..." />
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Navigation Links</p>
          <button onClick={addNavLink} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        {h.navLinks.map((link, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            <input className={ic + ' flex-1'} value={link.label} onChange={e => updateNavLink(i, { label: e.target.value })} placeholder="Label" />
            <input className={ic + ' flex-1'} value={link.href}  onChange={e => updateNavLink(i, { href: e.target.value })}  placeholder="#section" />
            <button onClick={() => removeNavLink(i)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Value Pillars */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Value Pillars</p>
          <button onClick={addPillar} className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            <Plus className="w-3.5 h-3.5" /> Add Pillar
          </button>
        </div>
        {h.pillars.map((p, i) => (
          <div key={i} className="border border-gray-100 rounded-xl p-4 bg-gray-50 space-y-2">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
              <input className={ic + ' flex-1 font-medium'} value={p.title}
                onChange={e => updatePillar(i, { title: e.target.value })} placeholder="Pillar title" />
              <button onClick={() => removePillar(i)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea className={ta} rows={2} value={p.description}
              onChange={e => updatePillar(i, { description: e.target.value })}
              placeholder="Description shown on homepage..." />
          </div>
        ))}
      </div>
    </div>
  );
}
