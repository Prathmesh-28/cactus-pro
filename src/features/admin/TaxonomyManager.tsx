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
    </div>
  );
}
