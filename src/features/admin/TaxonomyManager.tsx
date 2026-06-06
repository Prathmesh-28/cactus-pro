import { useState } from 'react';
import { Plus, Trash2, Check, GripVertical } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function TaxonomyManager() {
  const { store, updateTaxonomy } = useApp();
  const [tax, setTax] = useState(store.taxonomy ?? { stages: [], statuses: [] });
  const [saved, setSaved] = useState(false);
  const [newStage, setNewStage] = useState('');
  const [newStatus, setNewStatus] = useState('');

  const save = () => { updateTaxonomy(tax); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const addStage = () => {
    const s = newStage.trim();
    if (s && !tax.stages.includes(s)) { setTax(t => ({ ...t, stages: [...t.stages, s] })); setNewStage(''); }
  };
  const addStatus = () => {
    const s = newStatus.trim();
    if (s && !tax.statuses.includes(s)) { setTax(t => ({ ...t, statuses: [...t.statuses, s] })); setNewStatus(''); }
  };

  const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Define the company stages and statuses available in dropdowns across the app.</p>
        <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600">
          <Check className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Stages */}
        <div className="border border-gray-200 rounded-xl p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Company Stages</p>
            <p className="text-xs text-gray-400">Used in company cards, filters, and the Admin company editor.</p>
          </div>
          <div className="space-y-2">
            {tax.stages.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                <input className={ic + ' flex-1'} value={s}
                  onChange={e => setTax(t => ({ ...t, stages: t.stages.map((x, j) => j === i ? e.target.value : x) }))} />
                <button onClick={() => setTax(t => ({ ...t, stages: t.stages.filter((_, j) => j !== i) }))}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={ic + ' flex-1'} value={newStage} onChange={e => setNewStage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addStage()} placeholder="Add stage..." />
            <button onClick={addStage} className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Statuses */}
        <div className="border border-gray-200 rounded-xl p-5 space-y-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">Company Statuses</p>
            <p className="text-xs text-gray-400">Status badges shown on portfolio cards and in company drawers.</p>
          </div>
          <div className="space-y-2">
            {tax.statuses.map((s, i) => (
              <div key={i} className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                <input className={ic + ' flex-1'} value={s}
                  onChange={e => setTax(t => ({ ...t, statuses: t.statuses.map((x, j) => j === i ? e.target.value : x) }))} />
                <button onClick={() => setTax(t => ({ ...t, statuses: t.statuses.filter((_, j) => j !== i) }))}
                  className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className={ic + ' flex-1'} value={newStatus} onChange={e => setNewStatus(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addStatus()} placeholder="Add status..." />
            <button onClick={addStatus} className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Extended Taxonomy Lists */}
      {[
        { field: 'boardRoles',             label: 'Board Member Roles',           desc: 'Titles used when adding board members to companies',        defaults: ['CEO','CTO','CFO','COO','Board Member','Board Observer','Independent Director'] },
        { field: 'newsCategories',         label: 'News Feed Categories',         desc: 'Tags for news items in the News Feed',                     defaults: ['Product','Funding','Exit','Market','Hiring','Partnership','Award'] },
        { field: 'healthMetricTypes',      label: 'Health Metric Types',          desc: 'Signal labels in the Health Dashboard',                    defaults: ['Revenue','Burn','Team','Product','Customer','Runway'] },
        { field: 'researchDocCategories',  label: 'Research Doc Categories',      desc: 'Categories for the Research Library',                      defaults: ['Market Map','Sector Report','Competitive Analysis','Thesis','Due Diligence'] },
        { field: 'capTableRoles',          label: 'Cap Table Investor Roles',     desc: 'Investor categories in cap table entries',                  defaults: ['Lead Investor','Co-investor','Angel','Fund','ESOP','Promoter'] },
        { field: 'introRequestCategories', label: 'Intro Request Categories',     desc: 'Reason types when requesting intros',                      defaults: ['Fundraising','Business Development','Hiring','Strategic Partner','Expert Advice'] },
      ].map(({ field, label, desc, defaults }) => {
        const arr: string[] = (tax as unknown as Record<string, string[]>)[field] ?? defaults;
        return (
          <div key={field} className="border border-gray-200 rounded-xl p-5 space-y-3">
            <div>
              <p className="text-sm font-semibold text-gray-700">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <div className="space-y-2">
              {arr.map((v, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className={ic + ' flex-1'} value={v}
                    onChange={e => {
                      const next = arr.map((x, j) => j === i ? e.target.value : x);
                      setTax(t => ({ ...t, [field]: next }));
                    }} />
                  <button onClick={() => setTax(t => ({ ...t, [field]: arr.filter((_, j) => j !== i) }))}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input className={ic + ' flex-1'}
                placeholder={`Add ${label.toLowerCase().replace('s','')}…`}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.target as HTMLInputElement).value.trim()) {
                    setTax(t => ({ ...t, [field]: [...arr, (e.target as HTMLInputElement).value.trim()] }));
                    (e.target as HTMLInputElement).value = '';
                  }
                }} />
              <button className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
