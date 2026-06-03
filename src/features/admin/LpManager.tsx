import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Check, X, Users, Upload, Download, FileText, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { LP } from '../../data/types';
import { useBulkSelect } from '../../hooks/useBulkSelect';
import BulkActionBar from '../../components/ui/BulkActionBar';

// ─── Blank form shape ─────────────────────────────────────────────────────────
type LpForm = Omit<LP, 'id'>;

const EMPTY_FORM: LpForm = {
  name: '',
  commitment: '',
  called: '',
  distributed: '',
  nav: '',
};

// ─── CSV Types ────────────────────────────────────────────────────────────────
interface CsvRow {
  _rowIndex: number;
  name: string;
  commitment: string;
  called: string;
  distributed: string;
  nav: string;
  included: boolean;
}

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

// ─── CSV Upload Section ───────────────────────────────────────────────────────
interface CsvUploadProps {
  primaryColor: string;
  onImport: (rows: Omit<LP, 'id'>[]) => void;
}

function CsvUploadSection({ primaryColor, onImport }: CsvUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const downloadTemplate = () => {
    const content = [
      'Name,Commitment,Called,Distributed,NAV',
      '₹Example LP,₹50 Cr,₹30 Cr,₹5 Cr,₹42 Cr',
    ].join('\n');
    const blob = new Blob([content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'lp_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setParseError(null);
    setImportedCount(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setParseError('CSV must have a header row and at least one data row.');
        return;
      }
      // Skip header (first row)
      const dataLines = lines.slice(1);
      const parsed: CsvRow[] = dataLines.map((line, idx) => {
        // Handle quoted fields with commas
        const cols = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) ?? line.split(',');
        const clean = (s?: string) => (s ?? '').replace(/^"|"$/g, '').trim();
        return {
          _rowIndex: idx,
          name: clean(cols[0]),
          commitment: clean(cols[1]),
          called: clean(cols[2]),
          distributed: clean(cols[3]),
          nav: clean(cols[4]),
          included: true,
        };
      }).filter(r => r.name);
      if (parsed.length === 0) {
        setParseError('No valid rows found. Ensure each row has a Name.');
        return;
      }
      setCsvRows(parsed);
      setIsExpanded(true);
    };
    reader.readAsText(file);
    // Reset file input so same file can be re-uploaded
    e.target.value = '';
  };

  const toggleRow = (idx: number) => {
    setCsvRows(rows => rows.map(r => r._rowIndex === idx ? { ...r, included: !r.included } : r));
  };

  const toggleAll = () => {
    const allIncluded = csvRows.every(r => r.included);
    setCsvRows(rows => rows.map(r => ({ ...r, included: !allIncluded })));
  };

  const handleImport = () => {
    const selected = csvRows.filter(r => r.included);
    if (selected.length === 0) return;
    onImport(selected.map(r => ({
      name: r.name,
      commitment: r.commitment,
      called: r.called,
      distributed: r.distributed,
      nav: r.nav,
    })));
    setImportedCount(selected.length);
    setCsvRows([]);
    setIsExpanded(false);
  };

  const includedCount = csvRows.filter(r => r.included).length;
  const allIncluded = csvRows.length > 0 && csvRows.every(r => r.included);
  const someIncluded = csvRows.some(r => r.included) && !allIncluded;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Upload LPs from CSV</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Download Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
            style={{ backgroundColor: primaryColor }}
          >
            <Upload className="w-3.5 h-3.5" />
            Choose CSV File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Success message */}
      {importedCount !== null && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border-b border-emerald-100">
          <Check className="w-4 h-4 text-emerald-600" />
          <span className="text-sm text-emerald-700 font-medium">{importedCount} LP{importedCount !== 1 ? 's' : ''} imported successfully</span>
          <button onClick={() => setImportedCount(null)} className="ml-auto text-emerald-400 hover:text-emerald-600">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 border-b border-red-100">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span className="text-sm text-red-600">{parseError}</span>
        </div>
      )}

      {/* CSV Preview Table */}
      {isExpanded && csvRows.length > 0 && (
        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">{csvRows.length} rows parsed — select rows to import</p>
            <button
              onClick={handleImport}
              disabled={includedCount === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: primaryColor }}
            >
              <Check className="w-3.5 h-3.5" />
              Import {includedCount} LP{includedCount !== 1 ? 's' : ''}
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 w-8">
                    <input
                      type="checkbox"
                      checked={allIncluded}
                      ref={el => { if (el) el.indeterminate = someIncluded; }}
                      onChange={toggleAll}
                      className="rounded border-gray-300"
                    />
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Commitment</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Called</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">Distributed</th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wider">NAV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {csvRows.map(row => (
                  <tr
                    key={row._rowIndex}
                    className={`transition-colors ${row.included ? 'bg-white' : 'bg-gray-50 opacity-50'}`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={row.included}
                        onChange={() => toggleRow(row._rowIndex)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-800">{row.name || <span className="text-red-400 italic">Missing</span>}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono">{row.commitment || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono">{row.called || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono">{row.distributed || '—'}</td>
                    <td className="px-3 py-2 text-gray-600 font-mono">{row.nav || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={() => { setCsvRows([]); setIsExpanded(false); }}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Cancel import
          </button>
        </div>
      )}
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

  // ── Bulk selection ────────────────────────────────────────────────────────
  const bulk = useBulkSelect<LP>(lps);

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

  const handleBulkDelete = () => {
    const count = bulk.count;
    if (!window.confirm(`Delete ${count} LP${count !== 1 ? 's' : ''}? This action cannot be undone.`)) return;
    bulk.selectedItems.forEach(lp => deleteLP(lp.id));
    bulk.clear();
    if (editingId && bulk.selectedItems.some(l => l.id === editingId)) setEditingId(null);
  };

  const handleCsvImport = (rows: Omit<LP, 'id'>[]) => {
    rows.forEach(row => addLP({ id: generateId(), ...row }));
  };

  // ── Table column header ───────────────────────────────────────────────────
  const thCls = 'px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap';
  const tdCls = 'px-4 py-3 text-sm text-gray-800 whitespace-nowrap';
  const tdAmt = 'px-4 py-3 text-sm text-gray-700 whitespace-nowrap font-mono';

  // ── Footer totals (concatenate as string list for display) ────────────────
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

      {/* ── CSV Upload ──────────────────────────────────────────────────────── */}
      <CsvUploadSection primaryColor={firm.primaryColor} onImport={handleCsvImport} />

      {/* ── Bulk Action Bar ─────────────────────────────────────────────────── */}
      {bulk.count > 0 && (
        <BulkActionBar
          count={bulk.count}
          total={lps.length}
          onClear={bulk.clear}
          onSelectAll={bulk.toggleAll}
          actions={[
            {
              label: 'Delete Selected',
              variant: 'danger' as const,
              onClick: handleBulkDelete,
            },
          ]}
        />
      )}

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
          <p className="text-xs text-gray-400 mt-1">Add your first LP investor or upload a CSV.</p>
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
                {/* Checkbox column header */}
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={bulk.isAllSelected}
                    ref={el => { if (el) el.indeterminate = bulk.isIndeterminate; }}
                    onChange={bulk.toggleAll}
                    className="rounded border-gray-300 cursor-pointer"
                    title="Select all"
                  />
                </th>
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
                    <td colSpan={7} className="px-4 py-3">
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
                  <tr
                    key={lp.id}
                    className={`hover:bg-gray-50 transition-colors group ${bulk.isSelected(lp.id) ? 'bg-[#1C4B42]/5' : ''}`}
                  >
                    {/* Checkbox cell */}
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={bulk.isSelected(lp.id)}
                        onChange={() => bulk.toggle(lp.id)}
                        onClick={e => e.stopPropagation()}
                        className="rounded border-gray-300 cursor-pointer"
                      />
                    </td>
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
                <td />
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
