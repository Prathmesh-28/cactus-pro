import { useState } from 'react';
import { Pencil, Trash2, Plus, X, Check, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { FundMetric, DeltaDirection } from '../../data/types';

const EMPTY: Omit<FundMetric, 'id'> = {
  label: '',
  value: '',
  delta: '',
  deltaDirection: 'neutral',
  visible: true,
};

export default function MetricsManager() {
  const { store, addMetric, updateMetric, deleteMetric } = useApp();
  const [editing, setEditing] = useState<FundMetric | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<FundMetric, 'id'>>(EMPTY);

  const inputCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cactus-accent/30';

  const startCreate = () => { setForm(EMPTY); setCreating(true); setEditing(null); };
  const startEdit = (m: FundMetric) => { setEditing(m); setForm({ label: m.label, value: m.value, delta: m.delta, deltaDirection: m.deltaDirection, visible: m.visible }); setCreating(false); };
  const cancel = () => { setEditing(null); setCreating(false); };

  const save = () => {
    if (!form.label.trim()) return;
    if (creating) addMetric({ id: generateId(), ...form });
    else if (editing) updateMetric({ ...editing, ...form });
    cancel();
  };

  const FormRow = () => (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <input className={inputCls} placeholder="Label" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} />
      <input className={inputCls} placeholder="Value" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
      <input className={inputCls} placeholder="Delta text" value={form.delta} onChange={(e) => setForm((f) => ({ ...f, delta: e.target.value }))} />
      <select className={inputCls} value={form.deltaDirection} onChange={(e) => setForm((f) => ({ ...f, deltaDirection: e.target.value as DeltaDirection }))}>
        <option value="up">Up</option>
        <option value="down">Down</option>
        <option value="neutral">Neutral</option>
      </select>
      <div className="flex items-center gap-1">
        <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
          <input type="checkbox" checked={form.visible} onChange={(e) => setForm((f) => ({ ...f, visible: e.target.checked }))} className="rounded" />
          Visible
        </label>
        <button onClick={save} className="p-1.5 rounded-lg bg-emerald-500 text-white ml-auto"><Check className="w-4 h-4" /></button>
        <button onClick={cancel} className="p-1.5 rounded-lg bg-gray-200 text-gray-600"><X className="w-4 h-4" /></button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{store.fundMetrics.length} metrics</p>
        <button onClick={startCreate} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white" style={{ backgroundColor: store.firm.primaryColor }}>
          <Plus className="w-4 h-4" /> Add Metric
        </button>
      </div>

      {creating && <FormRow />}

      <div className="space-y-2">
        {store.fundMetrics.map((m) => (
          <div key={m.id}>
            {editing?.id === m.id ? (
              <FormRow />
            ) : (
              <div className={`flex items-center gap-3 p-3 border rounded-lg ${m.visible ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                <div className="flex-1 grid grid-cols-4 gap-2 text-sm">
                  <span className="font-medium text-gray-800">{m.label}</span>
                  <span className="text-gray-600">{m.value}</span>
                  <span className="text-gray-500">{m.delta}</span>
                  <span className={`capitalize text-xs ${m.deltaDirection === 'up' ? 'text-emerald-600' : m.deltaDirection === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                    {m.deltaDirection}
                  </span>
                </div>
                <button onClick={() => updateMetric({ ...m, visible: !m.visible })} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                  {m.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => startEdit(m)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => deleteMetric(m.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
