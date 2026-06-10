import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function n(v: string | undefined): number {
  const x = parseFloat(v ?? '0');
  return isNaN(x) ? 0 : x;
}

function fmt(v: number): string {
  return v === 0 ? '—' : `₹${v.toFixed(2)} Cr`;
}

function pct(num: number, den: number): string {
  if (!den) return '—';
  return `${((num / den) * 100).toFixed(1)}%`;
}

export default function LpReconciliation() {
  const { store } = useApp();
  const lps = store.lps ?? [];

  const rows = useMemo(() => lps.map(lp => {
    const commitment  = n(lp.commitment);
    const called      = n(lp.called);
    const distributed = n(lp.distributed);
    const nav         = n(lp.nav);
    const uncalled    = Math.max(0, commitment - called);
    const tvpi        = called > 0 ? ((nav + distributed) / called) : 0;
    return { lp, commitment, called, distributed, nav, uncalled, tvpi };
  }), [lps]);

  const totals = useMemo(() => ({
    commitment:  rows.reduce((s, r) => s + r.commitment, 0),
    called:      rows.reduce((s, r) => s + r.called, 0),
    uncalled:    rows.reduce((s, r) => s + r.uncalled, 0),
    distributed: rows.reduce((s, r) => s + r.distributed, 0),
    nav:         rows.reduce((s, r) => s + r.nav, 0),
  }), [rows]);

  function exportExcel() {
    const wb = XLSX.utils.book_new();
    const h = ['LP Name','Commitment (Cr)','Capital Called (Cr)','Uncalled Balance (Cr)','Distributions (Cr)','NAV (Cr)','% Called','TVPI'];
    const data = rows.map(r => [
      r.lp.name, r.commitment, r.called, r.uncalled, r.distributed, r.nav,
      pct(r.called, r.commitment), r.tvpi > 0 ? r.tvpi.toFixed(2) + 'x' : '—',
    ]);
    data.push(['TOTAL', totals.commitment, totals.called, totals.uncalled, totals.distributed, totals.nav, pct(totals.called, totals.commitment), '']);
    const ws = XLSX.utils.aoa_to_sheet([h, ...data]);
    ws['!cols'] = h.map(() => ({ wch: 22 }));
    XLSX.utils.book_append_sheet(wb, ws, 'LP Reconciliation');
    XLSX.writeFile(wb, 'LP Reconciliation.xlsx');
  }

  function exportPDF() {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    doc.setFillColor(28, 75, 66);
    doc.rect(0, 0, W, 22, 'F');
    doc.setFillColor(134, 202, 15);
    doc.rect(0, 22, W, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text((store.firm?.name ?? 'Cactus Partners').toUpperCase(), 14, 10);
    doc.setFontSize(14);
    doc.text('LP Reconciliation', 14, 19);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.text(`Generated ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`, W - 14, 10, { align: 'right' });
    doc.setTextColor(25, 28, 20);
    autoTable(doc, {
      startY: 30,
      head: [['LP Name','Commitment (Cr)','Called (Cr)','Uncalled (Cr)','Distributions (Cr)','NAV (Cr)','% Called','TVPI']],
      body: [
        ...rows.map(r => [r.lp.name, r.commitment.toFixed(2), r.called.toFixed(2), r.uncalled.toFixed(2), r.distributed.toFixed(2), r.nav.toFixed(2), pct(r.called, r.commitment), r.tvpi > 0 ? r.tvpi.toFixed(2) + 'x' : '—']),
        ['TOTAL', totals.commitment.toFixed(2), totals.called.toFixed(2), totals.uncalled.toFixed(2), totals.distributed.toFixed(2), totals.nav.toFixed(2), pct(totals.called, totals.commitment), ''],
      ],
      headStyles: { fillColor: [28,75,66], textColor: [255,255,255], fontStyle: 'bold', fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [246,250,247] },
      margin: { left: 14, right: 14 },
      didDrawCell: (_data) => {
        // Bold total row styling handled via alternateRowStyles
      },
    });
    const pages = doc.getNumberOfPages();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      const H = doc.internal.pageSize.getHeight();
      doc.setDrawColor(210, 219, 217);
      doc.line(14, H - 10, W - 14, H - 10);
      doc.setFontSize(7); doc.setTextColor(85, 89, 81);
      doc.text('CONFIDENTIAL — Internal use only', 14, H - 5);
      doc.text(`Page ${i} of ${pages}`, W - 14, H - 5, { align: 'right' });
    }
    doc.save('LP Reconciliation.pdf');
  }

  if (!lps.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3">
        <p className="text-gray-500 font-medium">No LPs configured</p>
        <p className="text-xs text-gray-400">Add LPs in Admin → LP Manager or Finance → Fund Overview</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">LP Reconciliation</h2>
          <p className="text-xs text-gray-400 mt-0.5">Commitment vs called vs uncalled balance per LP</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportExcel}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            Export Excel
          </button>
          <button onClick={exportPDF}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg text-white"
            style={{ backgroundColor: '#1C4B42' }}>
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Commitment', value: fmt(totals.commitment) },
          { label: 'Capital Called',   value: fmt(totals.called), sub: pct(totals.called, totals.commitment) + ' called' },
          { label: 'Uncalled Balance', value: fmt(totals.uncalled) },
          { label: 'Distributions',    value: fmt(totals.distributed) },
          { label: 'Current NAV',      value: fmt(totals.nav) },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-xs text-gray-400 mb-1">{c.label}</p>
            <p className="text-base font-bold" style={{ color: '#1C4B42' }}>{c.value}</p>
            {c.sub && <p className="text-xs text-gray-400 mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['LP Name','Commitment','Capital Called','Uncalled','Distributions','NAV','% Called','TVPI'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.map(({ lp, commitment, called, uncalled, distributed, nav, tvpi }) => {
              const calledPct = commitment > 0 ? (called / commitment) * 100 : 0;
              return (
                <tr key={lp.id} className="hover:bg-green-50/40 transition-colors">
                  <td className="px-4 py-3 font-semibold text-gray-900">{lp.name}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(commitment)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-700">{fmt(called)}</span>
                      <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(calledPct, 100)}%`, backgroundColor: '#1C4B42' }} />
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{fmt(uncalled)}</td>
                  <td className="px-4 py-3 text-gray-700">{fmt(distributed)}</td>
                  <td className="px-4 py-3 font-semibold" style={{ color: '#1C4B42' }}>{fmt(nav)}</td>
                  <td className="px-4 py-3 text-gray-600">{pct(called, commitment)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{tvpi > 0 ? `${tvpi.toFixed(2)}x` : '—'}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-200 bg-gray-50">
              <td className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
              <td className="px-4 py-3 font-bold" style={{ color: '#1C4B42' }}>{fmt(totals.commitment)}</td>
              <td className="px-4 py-3 font-bold" style={{ color: '#1C4B42' }}>{fmt(totals.called)}</td>
              <td className="px-4 py-3 font-bold" style={{ color: '#1C4B42' }}>{fmt(totals.uncalled)}</td>
              <td className="px-4 py-3 font-bold" style={{ color: '#1C4B42' }}>{fmt(totals.distributed)}</td>
              <td className="px-4 py-3 font-bold" style={{ color: '#1C4B42' }}>{fmt(totals.nav)}</td>
              <td className="px-4 py-3 font-bold text-gray-600">{pct(totals.called, totals.commitment)}</td>
              <td className="px-4 py-3 text-gray-400">—</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
