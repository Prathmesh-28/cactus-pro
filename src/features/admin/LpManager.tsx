import { useState } from 'react';
import { Plus, Pencil, Trash2, Check, X, Users } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { LP } from '../../data/types';

// ─── Blank form shape ─────────────────────────────────────────────────────────
type LpForm = Omit<LP, 'id'>;

const EMPTY_FORM: LpForm = {
  name: '',
  commitment: '',
  called: '',
  distributed: '',
  nav: '',
};

// ─── Inline form component ────────────────────────────────────────────────────
interface FormProps {
  form: LpForm;
  onChange: (f: LpForm) => void;
  onSave: () => void;
  onCancel: () => void;
  primaryColor: string;
  isNew: boolean;
}

function LpForm({ form, onChange, onSave, onCancel, primaryColor, isNew }: FormProps) {
  const inputCls =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-opacity-30 bg-white';

  const field = <K extends keyof LpForm>(key: K) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange({ ...form, [key]: e.target.value }),
  });

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3">
      <p className="text-sm font-semibold text-gray-700">
        {isNew ? 'Add New LP' : 'Edit LP'}
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="sm:col-span-2 lg:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">
            LP Name <span className="text-red-400">*</span>
          </label>
          <input
            className={inputCls}
            placeholder="e.g. Sequoia Capital"
            {...field('name')}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Commitment</label>
          <input className={inputCls} placeholder="e.g. ₹25 Cr" {...field('commitment')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Called</label>
          <input className={inputCls} placeholder="e.g. ₹18 Cr" {...field('called')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Distributed</label>
          <input className={inputCls} placeholder="e.g. ₹5 Cr" {...field('distributed')} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">NAV</label>
          <input className={inputCls} placeholder="e.g. ₹32 Cr" {...field('nav')} />
        </div>
      </div>
      <div className="flex gap-2 pt-1">
        <button
          onClick={onSave}
          disabled={!form.name.trim()}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: primaryColor }}
        >
          <Check className="w-4 h-4" />
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
        >
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LpManager() {
  const { store, addLP, updateLP, deleteLP } = useApp();
  const { lps, firm } = store;

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<LpForm>(EMPTY_FORM);
  const [editForm, setEditForm] = useState<LpForm>(EMPTY_FORM);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const startCreate = () => {
    setCreateForm(EMPTY_FORM);
    setCreating(true);
    setEditingId(null);
  };

  const cancelCreate = () => setCreating(false);

  const saveCreate = () => {
    if (!createForm.name.trim()) return;
    addLP({ id: generateId(), ...createForm });
    setCreating(false);
  };

  const startEdit = (lp: LP) => {
    setEditingId(lp.id);
    setEditForm({
      name: lp.name,
      commitment: lp.commitment,
      called: lp.called,
      distributed: lp.distributed,
      nav: lp.nav,
    });
    setCreating(false);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = (lp: LP) => {
    if (!editForm.name.trim()) return;
    updateLP({ ...lp, ...editForm });
    setEditingId(null);
  };

  const handleDelete = (lp: LP) => {
    if (window.confirm(`Delete "${lp.name}"? This action cannot be undone.`)) {
      deleteLP(lp.id);
      if (editingId === lp.id) setEditingId(null);
    }
  };

  // ── Table column header ───────────────────────────────────────────────────
  const thCls = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap';
  const tdCls = 'px-4 py-3 text-sm text-gray-800 whitespace-nowrap';
  const tdAmt = 'px-4 py-3 text-sm text-gray-700 whitespace-nowrap font-mono';

  // ── Footer totals (concatenate as string list for display) ────────────────
  // Since amounts are free-text strings, we just list them in the footer
  // using a em-dash separator so reviewers see all values at a glance.
  const footerValues = (key: keyof LpForm) =>
    lps.length === 0
      ? '—'
      : lps.map((lp) => lp[key] || '—').join('  |  ');

  return (
    <div className="space-y-4">
      {/* ── Header row ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {lps.length === 0 ? 'No LP investors yet' : `${lps.length} LP investor${lps.length === 1 ? '' : 's'}`}
        </p>
        <button
          onClick={startCreate}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: firm.primaryColor }}
        >
          <Plus className="w-4 h-4" />
          Add LP
        </button>
      </div>

      {/* ── Create form ─────────────────────────────────────────────────────── */}
      {creating && (
        <LpForm
          form={createForm}
          onChange={setCreateForm}
          onSave={saveCreate}
          onCancel={cancelCreate}
          primaryColor={firm.primaryColor}
          isNew={true}
        />
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {lps.length === 0 && !creating && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50">
          <Users className="w-10 h-10 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No LPs added yet.</p>
          <p className="text-xs text-gray-400 mt-1">Add your first LP investor.</p>
          <button
            onClick={startCreate}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
            style={{ backgroundColor: firm.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            Add LP
          </button>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      {lps.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className={thCls}>LP Name</th>
                <th className={thCls}>Commitment</th>
                <th className={thCls}>Called</th>
                <th className={thCls}>Distributed</th>
                <th className={thCls}>NAV</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lps.map((lp) =>
                editingId === lp.id ? (
                  // ── Inline edit row ────────────────────────────────────────
                  <tr key={lp.id}>
                    <td colSpan={6} className="px-4 py-3">
                      <LpForm
                        form={editForm}
                        onChange={setEditForm}
                        onSave={() => saveEdit(lp)}
                        onCancel={cancelEdit}
                        primaryColor={firm.primaryColor}
                        isNew={false}
                      />
                    </td>
                  </tr>
                ) : (
                  // ── Display row ────────────────────────────────────────────
                  <tr key={lp.id} className="hover:bg-gray-50 transition-colors group">
                    <td className={tdCls}>
                      <span className="font-medium text-gray-900">{lp.name}</span>
                    </td>
                    <td className={tdAmt}>{lp.commitment || <span className="text-gray-300">—</span>}</td>
                    <td className={tdAmt}>{lp.called || <span className="text-gray-300">—</span>}</td>
                    <td className={tdAmt}>{lp.distributed || <span className="text-gray-300">—</span>}</td>
                    <td className={tdAmt}>{lp.nav || <span className="text-gray-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(lp)}
                          title="Edit"
                          className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(lp)}
                          title="Delete"
                          className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )}
            </tbody>

            {/* ── Summary footer ──────────────────────────────────────────── */}
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                <td className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Total ({lps.length})
                </td>
                <td className="px-4 py-2">
                  <div className="text-[11px] text-gray-500 leading-relaxed font-mono">
                    {footerValues('commitment')}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="text-[11px] text-gray-500 leading-relaxed font-mono">
                    {footerValues('called')}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="text-[11px] text-gray-500 leading-relaxed font-mono">
                    {footerValues('distributed')}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <div className="text-[11px] text-gray-500 leading-relaxed font-mono">
                    {footerValues('nav')}
                  </div>
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
