import { useState } from 'react';
import { Plus, Trash2, Check, GripVertical } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { FinanceConfig } from '../../data/types';

const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';

export default function FinanceConfigManager() {
  const { store, updateFinanceConfig } = useApp();
  const [cfg, setCfg] = useState<FinanceConfig>(store.financeConfig ?? {
    funds: [{ key: 'fund_1', label: 'Fund 1' }, { key: 'fund_2', label: 'Fund 2' }],
    fiscalYears: ['FY23','FY24','FY25','FY26','FY27','FY28','FY29','FY30','FY31'],
    fundMetricLabels: [],
    cashFlowLabels: [],
  });
  const [saved, setSaved] = useState(false);

  const save = () => { updateFinanceConfig(cfg); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Configure fund names, fiscal years, and metric labels used across the Finance tab.</p>
        <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-600">
          <Check className="w-4 h-4" /> {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Fund names */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Fund Names</p>
            <p className="text-xs text-gray-400">Shown in the Fund 1 / Fund 2 selector in Finance → Fund Overview.</p>
          </div>
          <button onClick={() => setCfg(c => ({ ...c, funds: [...c.funds, { key: `fund_${c.funds.length + 1}`, label: `Fund ${c.funds.length + 1}` }] }))}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            <Plus className="w-3.5 h-3.5" /> Add Fund
          </button>
        </div>
        {cfg.funds.map((f, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            <div className="flex-1 grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Key (internal, no spaces)</label>
                <input className={ic + ' font-mono text-xs'} value={f.key}
                  onChange={e => setCfg(c => ({ ...c, funds: c.funds.map((x, j) => j === i ? { ...x, key: e.target.value } : x) }))} />
              </div>
              <div>
                <label className="block text-[10px] text-gray-400 mb-0.5">Display Label</label>
                <input className={ic} value={f.label}
                  onChange={e => setCfg(c => ({ ...c, funds: c.funds.map((x, j) => j === i ? { ...x, label: e.target.value } : x) }))} />
              </div>
            </div>
            <button onClick={() => setCfg(c => ({ ...c, funds: c.funds.filter((_, j) => j !== i) }))}
              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Fiscal years */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">Fiscal Year Columns</p>
          <p className="text-xs text-gray-400">Column headers in Finance → Expenses tables.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {cfg.fiscalYears.map((fy, i) => (
            <span key={i} className="flex items-center gap-1 bg-gray-100 rounded-full px-3 py-1 text-xs font-medium text-gray-700">
              {fy}
              <button onClick={() => setCfg(c => ({ ...c, fiscalYears: c.fiscalYears.filter((_, j) => j !== i) }))}
                className="text-gray-400 hover:text-red-500 ml-1">✕</button>
            </span>
          ))}
          <button onClick={() => {
            const last = cfg.fiscalYears[cfg.fiscalYears.length - 1] ?? 'FY30';
            const num = parseInt(last.replace('FY', '')) + 1;
            setCfg(c => ({ ...c, fiscalYears: [...c.fiscalYears, `FY${num}`] }));
          }} className="flex items-center gap-1 px-3 py-1 text-xs rounded-full border border-dashed border-gray-300 text-gray-500 hover:bg-gray-50">
            <Plus className="w-3 h-3" /> Add FY
          </button>
        </div>
      </div>

      {/* Fund Metric labels */}
      <div className="border border-gray-200 rounded-xl p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700">Fund Metric Cards</p>
            <p className="text-xs text-gray-400">The dark-green cards in Finance → Fund Overview.</p>
          </div>
          <button onClick={() => setCfg(c => ({ ...c, fundMetricLabels: [...c.fundMetricLabels, { key: `metric_${Date.now()}`, label: 'New Metric', type: 'currency' }] }))}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            <Plus className="w-3.5 h-3.5" /> Add Metric
          </button>
        </div>
        {cfg.fundMetricLabels.map((m, i) => (
          <div key={i} className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
            <input className={ic + ' font-mono text-xs flex-1'} value={m.key}
              onChange={e => setCfg(c => ({ ...c, fundMetricLabels: c.fundMetricLabels.map((x, j) => j === i ? { ...x, key: e.target.value } : x) }))}
              placeholder="key (no spaces)" />
            <input className={ic + ' flex-1'} value={m.label}
              onChange={e => setCfg(c => ({ ...c, fundMetricLabels: c.fundMetricLabels.map((x, j) => j === i ? { ...x, label: e.target.value } : x) }))}
              placeholder="Display label" />
            <select className="border border-gray-200 rounded-lg px-2 py-2 text-xs bg-white focus:outline-none"
              value={m.type}
              onChange={e => setCfg(c => ({ ...c, fundMetricLabels: c.fundMetricLabels.map((x, j) => j === i ? { ...x, type: e.target.value as 'currency'|'percent'|'number' } : x) }))}>
              <option value="currency">₹ Currency (Cr)</option>
              <option value="percent">% Percent</option>
              <option value="number">Number</option>
            </select>
            <button onClick={() => setCfg(c => ({ ...c, fundMetricLabels: c.fundMetricLabels.filter((_, j) => j !== i) }))}
              className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
