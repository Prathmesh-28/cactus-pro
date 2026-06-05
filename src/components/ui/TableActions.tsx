/**
 * TableActions — reusable Export CSV + Import CSV bar for any table.
 * Export: downloads current data as CSV.
 * Import: parses uploaded CSV and calls onImport with parsed rows.
 * Keeps data in sync between the table and the CSV.
 */
import { useState, useRef } from 'react';
import { Download, Upload, Check, AlertCircle, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  label: string;                          // e.g. "Financial Periods"
  headers: string[];                      // CSV column headers
  rows: string[][];                       // Current data rows (already exported format)
  onImport: (rows: Record<string, string>[]) => void; // Called with parsed rows
  className?: string;
}

function escapeCell(v: string): string {
  if (v.includes(',') || v.includes('\n') || v.includes('"')) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}

function parseCsv(text: string): string[][] {
  const result: string[][] = [];
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  for (const line of lines) {
    const cells: string[] = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        cells.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    cells.push(cur.trim());
    result.push(cells);
  }
  return result;
}

export default function TableActions({ label, headers, rows, onImport, className = '' }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Export current data
  const handleExport = () => {
    const allRows = [headers, ...rows];
    const csv = allRows.map(r => r.map(escapeCell).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Cactus_${label.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Parse uploaded CSV or XLSX into preview
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg(null);

    const isXlsx = /\.(xlsx|xls)$/i.test(file.name);
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        let text: string;
        if (isXlsx) {
          const wb = XLSX.read(ev.target?.result as ArrayBuffer, { type: 'array' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          text = XLSX.utils.sheet_to_csv(ws);
        } else {
          text = (ev.target?.result as string) ?? '';
        }
        const parsed = parseCsv(text);
        if (parsed.length < 2) {
          setImportMsg({ ok: false, text: 'CSV must have a header row and at least one data row.' });
          setImporting(false);
          return;
        }
        const fileHeaders = parsed[0];
        const dataRows = parsed.slice(1).filter(r => r.some(c => c.trim()));
        const mapped = dataRows.map(row => {
          const obj: Record<string, string> = {};
          fileHeaders.forEach((h, i) => { obj[h] = row[i] ?? ''; });
          return obj;
        });
        setPreview(mapped);
        setShowPreview(true);
        setImportMsg({ ok: true, text: `Found ${mapped.length} rows ready to import.` });
      } catch {
        setImportMsg({ ok: false, text: 'Could not parse CSV. Check the file format.' });
      }
      setImporting(false);
    };
    if (isXlsx) reader.readAsArrayBuffer(file); else reader.readAsText(file);
    e.target.value = '';
  };

  const confirmImport = () => {
    onImport(preview);
    setShowPreview(false);
    setPreview([]);
    setImportMsg({ ok: true, text: `✓ ${preview.length} rows imported successfully.` });
    setTimeout(() => setImportMsg(null), 3000);
  };

  const previewHeaders = preview.length > 0 ? Object.keys(preview[0]) : [];

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Action bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">{label}:</span>

        {/* Export */}
        <button
          onClick={handleExport}
          disabled={rows.length === 0}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          title={`Export ${rows.length} rows as CSV`}
        >
          <Download size={12} />
          Export CSV {rows.length > 0 && <span className="text-gray-400">({rows.length})</span>}
        </button>

        {/* Import */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={importing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[#1C4B42] text-[#1C4B42] bg-white hover:bg-[#F0F7E6] disabled:opacity-40 transition-colors"
          title="Import rows from CSV"
        >
          <Upload size={12} />
          {importing ? 'Parsing…' : 'Import CSV'}
        </button>
        <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFile} />

        {/* Status */}
        {importMsg && (
          <span className={`flex items-center gap-1 text-xs font-medium ${importMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>
            {importMsg.ok ? <Check size={12} /> : <AlertCircle size={12} />}
            {importMsg.text}
          </span>
        )}
      </div>

      {/* Import preview modal */}
      {showPreview && preview.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setShowPreview(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}
            style={{ borderTop: '4px solid #1C4B42' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Import Preview — {label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{preview.length} rows found. Review before importing.</p>
              </div>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="flex-1 overflow-auto p-4">
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {previewHeaders.map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap"
                          style={{ color: headers.includes(h) ? '#1C4B42' : '#9CA3AF' }}>
                          {h}
                          {!headers.includes(h) && <span className="ml-1 text-[10px] text-amber-500">?new</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.slice(0, 20).map((row, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {previewHeaders.map(h => (
                          <td key={h} className="px-3 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                            {row[h] || <span className="text-gray-300">—</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                    {preview.length > 20 && (
                      <tr><td colSpan={previewHeaders.length} className="px-3 py-2 text-xs text-gray-400 text-center">
                        … and {preview.length - 20} more rows
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
              <p className="text-xs text-gray-500">
                Importing will <strong>add</strong> these rows. Existing data is not deleted.
              </p>
              <div className="flex gap-2">
                <button onClick={() => setShowPreview(false)}
                  className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">
                  Cancel
                </button>
                <button onClick={confirmImport}
                  className="px-5 py-2 text-sm font-semibold rounded-lg text-white"
                  style={{ backgroundColor: '#1C4B42' }}>
                  Import {preview.length} Rows
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
