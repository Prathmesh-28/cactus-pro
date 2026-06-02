import { useState } from 'react';
import { Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function KpiThresholds() {
  const { store, updateKpiThresholds } = useApp();
  const [t, setT] = useState(store.kpiThresholds ?? { moic: { good: 3, warning: 2 }, irr: { good: 30, warning: 20 } });
  const [saved, setSaved] = useState(false);

  const save = () => { updateKpiThresholds(t); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';

  const ThresholdCard = ({ metric, label, unit }: { metric: 'moic' | 'irr'; label: string; unit: string }) => {
    const vals = t[metric];
    const preview = (v: number) => metric === 'moic' ? `${v}x` : `${v}%`;
    return (
      <div className="border border-gray-200 rounded-xl p-5 bg-white space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-800">{label}</p>
          <span className="text-xs text-gray-400">{unit}</span>
        </div>
        {/* Live preview */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            ≥ {preview(vals.good)} → Green
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            ≥ {preview(vals.warning)} → Amber
          </span>
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
            &lt; {preview(vals.warning)} → Red
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Green threshold (good)</label>
            <input type="number" step={metric === 'moic' ? 0.1 : 1} className={ic} value={vals.good}
              onChange={e => setT(x => ({ ...x, [metric]: { ...x[metric], good: parseFloat(e.target.value) || 0 } }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Amber threshold (warning)</label>
            <input type="number" step={metric === 'moic' ? 0.1 : 1} className={ic} value={vals.warning}
              onChange={e => setT(x => ({ ...x, [metric]: { ...x[metric], warning: parseFloat(e.target.value) || 0 } }))} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Set colour-coding breakpoints for MOIC and IRR across portfolio cards, tables, and charts.</p>
        <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600">
          <Check className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ThresholdCard metric="moic" label="MOIC (Multiple on Invested Capital)" unit="× multiple" />
        <ThresholdCard metric="irr"  label="IRR (Internal Rate of Return)" unit="% per annum" />
      </div>
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-xs text-gray-500 space-y-1">
        <p className="font-semibold text-gray-600">Where these thresholds apply:</p>
        <ul className="list-disc list-inside space-y-0.5">
          <li>Portfolio tab — company card MOIC/IRR badges</li>
          <li>Finance → Fund Overview — Portfolio Snapshot table</li>
          <li>Portfolio → Operational Metrics view</li>
          <li>CompanyDrawer → Overview metrics</li>
        </ul>
      </div>
    </div>
  );
}
