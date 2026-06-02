import { useState } from 'react';
import { Plus, Trash2, Check, GripVertical } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { DealStageConfig } from '../../data/types';

const ic = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';

const PRESET_COLORS = [
  { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB', label: 'Gray' },
  { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE', label: 'Blue' },
  { bg: '#F5F3FF', text: '#6D28D9', border: '#DDD6FE', label: 'Purple' },
  { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A', label: 'Amber' },
  { bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7', label: 'Green' },
  { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA', label: 'Red' },
  { bg: '#FFF7ED', text: '#C2410C', border: '#FED7AA', label: 'Orange' },
  { bg: '#F0FDF4', text: '#15803D', border: '#BBF7D0', label: 'Emerald' },
];

export default function InvestmentSettings() {
  const { store, updateDealStages } = useApp();
  const [stages, setStages] = useState<DealStageConfig[]>(store.dealStages ?? []);
  const [saved, setSaved] = useState(false);
  const [editIdx, setEditIdx] = useState<number | null>(null);

  const save = () => { updateDealStages(stages); setSaved(true); setTimeout(() => setSaved(false), 2000); };

  const addStage = () => {
    setStages(s => [...s, { name: 'New Stage', bgColor: '#F3F4F6', textColor: '#4B5563', borderColor: '#E5E7EB' }]);
    setEditIdx(stages.length);
  };

  const remove = (i: number) => setStages(s => s.filter((_, j) => j !== i));

  const update = (i: number, patch: Partial<DealStageConfig>) =>
    setStages(s => s.map((x, j) => j === i ? { ...x, ...patch } : x));

  const applyPreset = (i: number, preset: typeof PRESET_COLORS[0]) => {
    update(i, { bgColor: preset.bg, textColor: preset.text, borderColor: preset.border });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Customise the deal pipeline stages, their order, and badge colours.</p>
          <p className="text-xs text-gray-400 mt-0.5">Drag rows to reorder (coming soon). Changes apply to all users.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addStage} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white"
            style={{ backgroundColor: store.firm.primaryColor }}>
            <Plus className="w-3.5 h-3.5" /> Add Stage
          </button>
          <button onClick={save} className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg text-white bg-emerald-600">
            <Check className="w-3.5 h-3.5" /> {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="flex flex-wrap gap-2 p-4 rounded-xl bg-gray-50 border border-gray-100">
        <p className="w-full text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Preview</p>
        {stages.map((s, i) => (
          <span key={i} className="px-3 py-1 rounded-lg border text-xs font-semibold"
            style={{ backgroundColor: s.bgColor, color: s.textColor, borderColor: s.borderColor }}>
            {s.name}
          </span>
        ))}
      </div>

      {/* Stage list */}
      <div className="space-y-2">
        {stages.map((stage, i) => (
          <div key={i} className="border border-gray-200 rounded-xl bg-white overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <GripVertical className="w-4 h-4 text-gray-300 cursor-grab shrink-0" />
              <span className="px-3 py-1 rounded-lg border text-xs font-semibold shrink-0"
                style={{ backgroundColor: stage.bgColor, color: stage.textColor, borderColor: stage.borderColor }}>
                {stage.name}
              </span>
              <input className={ic + ' flex-1'} value={stage.name} onChange={e => update(i, { name: e.target.value })}
                placeholder="Stage name" />
              <button onClick={() => setEditIdx(editIdx === i ? null : i)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">
                Colours
              </button>
              <button onClick={() => remove(i)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {editIdx === i && (
              <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick colour presets</p>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(p => (
                    <button key={p.label} onClick={() => applyPreset(i, p)}
                      className="px-3 py-1 rounded-lg border text-xs font-semibold transition-transform hover:scale-105"
                      style={{ backgroundColor: p.bg, color: p.text, borderColor: p.border }}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['bgColor', 'textColor', 'borderColor'] as const).map(field => (
                    <div key={field}>
                      <label className="block text-[10px] font-medium text-gray-400 mb-1">
                        {field === 'bgColor' ? 'Background' : field === 'textColor' ? 'Text' : 'Border'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input type="color" value={stage[field]}
                          onChange={e => update(i, { [field]: e.target.value })}
                          className="w-8 h-8 rounded cursor-pointer border border-gray-200" />
                        <input className={ic + ' flex-1 font-mono text-xs'} value={stage[field]}
                          onChange={e => update(i, { [field]: e.target.value })} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
