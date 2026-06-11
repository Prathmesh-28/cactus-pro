import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { FundMetricsRows } from './components/fund-metrics-rows';
import { PerformanceTable } from './components/performance-table';
import { useFund } from './lib/fund-context';
import { useApp } from '../../context/AppContext';
import { TrendingUp, TrendingDown, Minus, Upload, Download, Printer } from 'lucide-react';
import type { PortfolioSnapshotRow } from '../../data/types';
import { toastImportSuccess, toastImportError } from '../../lib/uploadToast';

function fmtCr(n: number | null): string {
  if (n === null || n === undefined) return '—';
  return `₹${(n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
}

function CompanyAvatar({ name, logoUrl }: { name: string; logoUrl: string }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  if (logoUrl) {
    return <img src={logoUrl} alt={name} className="w-8 h-8 object-contain" />;
  }
  return (
    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
      style={{ background: 'linear-gradient(135deg,#1E293B,#2D4A6B)' }}>
      {initials}
    </div>
  );
}

export default function FundOverviewPage() {
  const { fund, setFund } = useFund();
  const { store, updatePortfolioSnapshot } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [pendingRows, setPendingRows] = useState<PortfolioSnapshotRow[] | null>(null); // for duplicate protection
  const [editingCell, setEditingCell] = useState<{ companyId: string; field: keyof PortfolioSnapshotRow } | null>(null);
  const [draft, setDraft] = useState('');

  const downloadTemplate = () => {
    const headers = ['Company Name', 'Date of First Investment', 'Current Stake (₹ Cr)', 'Current Equity Value (₹ Cr)', 'Value of Investment (₹ Cr)', 'MOIC', 'IRR (%)'];
    const example = store.companies.map(c => [
      c.name, '', '', '', '', '', ''   // pre-fill names, leave numbers blank to fill in
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Portfolio Snapshot');
    XLSX.writeFile(wb, 'portfolio_snapshot_template.xlsx');
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const read = isCSV
      ? file.text().then(t => XLSX.read(t, { type: 'string' }))
      : file.arrayBuffer().then(b => XLSX.read(b, { type: 'array' }));
    read.then(wb => {
      try {
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as string[][];
        if (rows.length < 2) { toastImportError('File has no data rows.'); return; }
        const parsed: PortfolioSnapshotRow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i];
          const name = String(r[0] ?? '').trim();
          if (!name) continue;
          // Try to find matching company (optional — best effort)
          const company = store.companies.find(c =>
            c.name.toLowerCase() === name.toLowerCase() ||
            c.name.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(c.name.toLowerCase())
          );
          const n = (v: unknown) => { const x = parseFloat(String(v).replace(/[₹,\sCr]/g, '')); return isFinite(x) ? x * 1e7 : null; };
          parsed.push({
            companyId: company?.id,
            companyName: name,                     // always store name as-is
            dateOfFirstInvestment: String(r[1] ?? '').trim(),
            currentStake:        n(r[2]),
            currentEquityValue:  n(r[3]),
            valueOfInvestment:   n(r[4]),
            moic: parseFloat(String(r[5])) || 0,
            irr:  parseFloat(String(r[6])) || 0,
          });
        }
        if (parsed.length === 0) {
          toastImportError('File has no valid rows. Make sure Column A has company names.');
          return;
        }
        // #7 Duplicate protection — if data exists, ask replace or append
        if ((store.portfolioSnapshot ?? []).length > 0) {
          setPendingRows(parsed);
        } else {
          updatePortfolioSnapshot(parsed);
          toastImportSuccess(parsed.length, 'company');
        }
      } catch { toastImportError('Could not parse file.'); }
    }).catch(() => toastImportError('Could not read file.'));
    e.target.value = '';
  };

  const confirmReplace = () => {
    if (!pendingRows) return;
    updatePortfolioSnapshot(pendingRows);
    toastImportSuccess(pendingRows.length, 'company');
    setPendingRows(null);
  };
  const confirmAppend = () => {
    if (!pendingRows) return;
    const existing = store.portfolioSnapshot ?? [];
    const merged = [...existing.filter(r => !pendingRows.find(p => p.companyName === r.companyName)), ...pendingRows];
    updatePortfolioSnapshot(merged);
    toastImportSuccess(pendingRows.length, 'company');
    setPendingRows(null);
  };

  // #5 Inline edit helpers
  const commitEdit = () => {
    if (!editingCell) return;
    const { companyId, field } = editingCell;
    const updated = (store.portfolioSnapshot ?? []).map(r => {
      if (r.companyName !== companyId) return r; // companyId field here stores companyName
      const numFields: Array<keyof PortfolioSnapshotRow> = ['currentStake','currentEquityValue','valueOfInvestment','moic','irr'];
      if (numFields.includes(field)) {
        const n = parseFloat(draft.replace(/[₹,\s]/g, ''));
        const val = isFinite(n) ? (field === 'moic' || field === 'irr' ? n : n * 1e7) : r[field];
        return { ...r, [field]: val };
      }
      return { ...r, [field]: draft };
    });
    updatePortfolioSnapshot(updated);
    setEditingCell(null);
  };

  const snapshotData = store.portfolioSnapshot ?? [];
  const snapshot = snapshotData
    .map(row => ({
      company: store.companies.find(c => c.id === row.companyId || c.name.toLowerCase() === row.companyName?.toLowerCase()),
      csv: row,
    }))
    .filter(({ csv }) => !search || csv.companyName?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col min-h-full" style={{ background: 'var(--background)' }}>
      {/* Header */}
      <div className="border-b px-6 md:px-10 py-6 flex items-start justify-between gap-4"
        style={{ borderColor: 'var(--border)', backgroundColor: '#ffffff' }}>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold uppercase tracking-wide" style={{ color: 'var(--foreground)' }}>
            Fund Overview
          </h1>
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Last updated: {new Date().toLocaleDateString('en-IN', { day:'2-digit', month:'2-digit', year:'2-digit' })} at {new Date().toLocaleTimeString('en-IN', { hour:'2-digit', minute:'2-digit', hour12: false })} · Click any cell to edit inline · Amounts in INR Cr
          </p>
        </div>

        {/* Cactus logo */}
        {store.firm?.logoUrl && (
          <img src={store.firm.logoUrl} alt="Cactus Partners" className="h-12 object-contain hidden md:block" />
        )}

        <div className="flex items-center gap-2 no-print shrink-0">
          {/* Fund selector */}
          <div className="inline-flex items-center rounded-lg border p-0.5"
            style={{ borderColor: 'var(--border)', backgroundColor: '#F8FAFC' }}>
            {(store.financeConfig?.funds ?? [{ key: 'fund_1', label: 'Fund 1' }, { key: 'fund_2', label: 'Fund 2' }]).map(f => (
              <button key={f.key} onClick={() => setFund(f.key as 'fund_1' | 'fund_2')}
                className="px-4 py-1.5 text-xs font-semibold rounded-md transition-colors"
                style={fund === f.key
                  ? { backgroundColor: '#2D6A4F', color: '#fff' }
                  : { color: '#2D6A4F', backgroundColor: 'transparent' }}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Print / PDF */}
          <button onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)', backgroundColor: '#F8FAFC' }}
            title="Save as PDF / Print">
            <Printer className="w-3.5 h-3.5" /> PDF
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 md:px-10 py-8 space-y-10 flex-1">
        <FundMetricsRows />

        {/* Portfolio Snapshot */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted-foreground)' }}>
                Portfolio Snapshot
              </p>
              <span className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>(Amounts in INR Cr)</span>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {snapshotData.length > 0 && (
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search company…"
                  className="text-xs border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 w-36"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)', color: 'var(--foreground)' }} />
              )}
              <button onClick={downloadTemplate}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
                style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)', backgroundColor: 'var(--card)' }}>
                <Download className="w-3.5 h-3.5" /> Template
              </button>
              <button onClick={() => {
                  if (snapshotData.length === 0 && !localStorage.getItem('snapshot_uploaded_once')) {
                    if (!confirm('Tip: Download the Template first — it pre-fills your company names so nothing gets skipped.\n\nContinue to upload directly?')) {
                      downloadTemplate();
                      return;
                    }
                    localStorage.setItem('snapshot_uploaded_once', '1');
                  }
                  fileRef.current?.click();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white transition-colors"
                style={{ backgroundColor: '#1E293B' }}>
                <Upload className="w-3.5 h-3.5" /> Upload Excel / CSV
              </button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleUpload} />
            </div>
          </div>

          {/* #7 Duplicate upload protection dialog */}
          {pendingRows && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800">⚠️ Existing data found — {(store.portfolioSnapshot ?? []).length} companies already in snapshot</p>
              <p className="text-xs text-amber-700">Do you want to replace all existing data or append/update only the uploaded companies?</p>
              <div className="flex gap-2">
                <button onClick={confirmReplace} className="px-4 py-1.5 text-xs font-medium rounded-lg text-white bg-red-600 hover:bg-red-700">Replace all ({pendingRows.length} rows)</button>
                <button onClick={confirmAppend}  className="px-4 py-1.5 text-xs font-medium rounded-lg text-white bg-emerald-600 hover:bg-emerald-700">Append / update ({pendingRows.length} rows)</button>
                <button onClick={() => setPendingRows(null)} className="px-4 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-600">Cancel</button>
              </div>
            </div>
          )}

          {/* #2 Unmatched rows warning */}
          {unmatched.length > 0 && (
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-3 flex items-start gap-3">
              <span className="text-orange-500 text-sm mt-0.5">⚠</span>
              <div className="flex-1">
                <p className="text-xs font-semibold text-orange-800">{unmatched.length} company name{unmatched.length !== 1 ? 's' : ''} not matched — skipped</p>
                <p className="text-xs text-orange-600 mt-1">These names don't match your portfolio exactly: <span className="font-mono">{unmatched.join(', ')}</span></p>
                <p className="text-xs text-orange-500 mt-0.5">Download the Template — it pre-fills exact names from your portfolio.</p>
              </div>
              <button onClick={() => setUnmatched([])} className="text-orange-400 hover:text-orange-600 text-xs">✕</button>
            </div>
          )}

          <div className="rounded-lg border overflow-hidden shadow-[var(--shadow-card)]"
            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[800px]">
                <thead className="border-b text-[11px] font-semibold uppercase tracking-wider"
                  style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)', color: 'var(--muted-foreground)' }}>
                  <tr>
                    <th className="px-4 py-3 text-left">Portfolio Company</th>
                    <th className="px-4 py-3 text-left">Date of First Investment</th>
                    <th className="px-4 py-3 text-right">Current Stake</th>
                    <th className="px-4 py-3 text-right">Current Equity Value</th>
                    <th className="px-4 py-3 text-right">Value of Investment</th>
                    <th className="px-4 py-3 text-right">MOIC (x)</th>
                    <th className="px-4 py-3 text-right">IRR (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--border)' }}>
                  {snapshot.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      No data yet — click <strong>Upload Excel / CSV</strong> above to import, or download the Template first.
                    </td></tr>
                  )}
                  {snapshot.map(({ company, csv }, i) => (
                    <tr key={csv.companyName + i}
                      className="transition-colors hover:bg-[var(--muted)]"
                      style={{ backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(212,237,170,0.15)' }}>

                      {/* Company — uses name from file, logo from matched company if found */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 overflow-hidden"
                            style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}>
                            <CompanyAvatar name={csv.companyName} logoUrl={company?.logoUrl ?? ''} />
                          </div>
                          <div>
                            <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--foreground)' }}>
                              {csv.companyName}
                            </p>
                            <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                              {company?.stage ?? ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Date — editable */}
                      <td className="px-4 py-3 text-sm tabular-nums cursor-text" style={{ color: 'var(--foreground)' }}
                        onClick={() => { setEditingCell({ companyId: csv.companyName, field: 'dateOfFirstInvestment' }); setDraft(csv.dateOfFirstInvestment); }}>
                        {editingCell?.companyId === csv.companyName && editingCell.field === 'dateOfFirstInvestment'
                          ? <input autoFocus className="w-24 border rounded px-1 py-0.5 text-xs focus:outline-none" value={draft}
                              onChange={e => setDraft(e.target.value)}
                              onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }} />
                          : <span className="hover:underline decoration-dotted">{csv.dateOfFirstInvestment || '—'}</span>}
                      </td>

                      {/* Current Stake — editable */}
                      <td className="px-4 py-3 text-right font-medium tabular-nums cursor-text" style={{ color: 'var(--foreground)' }}
                        onClick={() => { setEditingCell({ companyId: csv.companyName, field: 'currentStake' }); setDraft(csv.currentStake != null ? String(csv.currentStake / 1e7) : ''); }}>
                        {editingCell?.companyId === csv.companyName && editingCell.field === 'currentStake'
                          ? <input autoFocus className="w-20 border rounded px-1 py-0.5 text-xs text-right focus:outline-none" value={draft}
                              onChange={e => setDraft(e.target.value)}
                              onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }} />
                          : <span className="hover:underline decoration-dotted">{fmtCr(csv.currentStake)}</span>}
                      </td>

                      {/* Equity Value — editable */}
                      <td className="px-4 py-3 text-right tabular-nums cursor-text" style={{ color: 'var(--muted-foreground)' }}
                        onClick={() => { setEditingCell({ companyId: csv.companyName, field: 'currentEquityValue' }); setDraft(csv.currentEquityValue != null ? String(csv.currentEquityValue / 1e7) : ''); }}>
                        {editingCell?.companyId === csv.companyName && editingCell.field === 'currentEquityValue'
                          ? <input autoFocus className="w-20 border rounded px-1 py-0.5 text-xs text-right focus:outline-none" value={draft}
                              onChange={e => setDraft(e.target.value)}
                              onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }} />
                          : <span className="hover:underline decoration-dotted">{fmtCr(csv.currentEquityValue)}</span>}
                      </td>

                      {/* Investment Value — editable */}
                      <td className="px-4 py-3 text-right tabular-nums cursor-text" style={{ color: 'var(--muted-foreground)' }}
                        onClick={() => { setEditingCell({ companyId: csv.companyName, field: 'valueOfInvestment' }); setDraft(csv.valueOfInvestment != null ? String(csv.valueOfInvestment / 1e7) : ''); }}>
                        {editingCell?.companyId === csv.companyName && editingCell.field === 'valueOfInvestment'
                          ? <input autoFocus className="w-20 border rounded px-1 py-0.5 text-xs text-right focus:outline-none" value={draft}
                              onChange={e => setDraft(e.target.value)}
                              onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }} />
                          : <span className="hover:underline decoration-dotted">{fmtCr(csv.valueOfInvestment)}</span>}
                      </td>

                      {/* MOIC — editable */}
                      <td className="px-4 py-3 text-right cursor-text"
                        onClick={() => { setEditingCell({ companyId: csv.companyName, field: 'moic' }); setDraft(String(csv.moic)); }}>
                        {editingCell?.companyId === csv.companyName && editingCell.field === 'moic'
                          ? <input autoFocus className="w-16 border rounded px-1 py-0.5 text-xs text-right focus:outline-none" value={draft}
                              onChange={e => setDraft(e.target.value)}
                              onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }} />
                          : <div className="flex items-center justify-end gap-1.5">
                              {csv.moic >= (store.kpiThresholds?.moic.good ?? 3)
                                ? <TrendingUp className="w-3.5 h-3.5" style={{ color: '#2D6A4F' }} />
                                : csv.moic < (store.kpiThresholds?.moic.warning ?? 2)
                                ? <TrendingDown className="w-3.5 h-3.5 text-red-500" />
                                : <Minus className="w-3.5 h-3.5 text-gray-400" />}
                              <span className="font-bold text-sm tabular-nums hover:underline decoration-dotted" style={{ color: 'var(--foreground)' }}>{csv.moic}x</span>
                            </div>}
                      </td>

                      {/* IRR — editable */}
                      <td className="px-4 py-3 text-right cursor-text"
                        onClick={() => { setEditingCell({ companyId: csv.companyName, field: 'irr' }); setDraft(String(csv.irr)); }}>
                        {editingCell?.companyId === csv.companyName && editingCell.field === 'irr'
                          ? <input autoFocus className="w-16 border rounded px-1 py-0.5 text-xs text-right focus:outline-none" value={draft}
                              onChange={e => setDraft(e.target.value)}
                              onBlur={commitEdit} onKeyDown={e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingCell(null); }} />
                          : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold tabular-nums hover:ring-1 hover:ring-gray-300"
                              style={{ backgroundColor: csv.irr >= 30 ? '#E2E8F0' : csv.irr >= 20 ? '#FEF9C3' : '#FEE2E2', color: csv.irr >= 30 ? '#2D6A4F' : csv.irr >= 20 ? '#854D0E' : '#991B1B' }}>
                              {csv.irr}%
                            </span>}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* Totals row */}
                <tfoot className="border-t-2" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--muted)' }}>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-sm" style={{ color: 'var(--foreground)' }}>
                      Total / Average
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: '#2D6A4F' }}>
                      {fmtCr(snapshotData.reduce((s, r) => s + (r.currentStake ?? 0), 0))}
                    </td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: '#2D6A4F' }}>
                      {snapshotData.length > 0 ? (snapshotData.reduce((s, r) => s + r.moic, 0) / snapshotData.length).toFixed(1) : '—'}x avg
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums" style={{ color: '#2D6A4F' }}>
                      {snapshotData.length > 0 ? Math.round(snapshotData.reduce((s, r) => s + r.irr, 0) / snapshotData.length) : '—'}% avg
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </section>

        {/* Excel-uploadable performance table */}
        <PerformanceTable />
      </div>
    </div>
  );
}
