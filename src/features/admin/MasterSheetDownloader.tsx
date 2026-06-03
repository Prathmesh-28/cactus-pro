import * as XLSX from 'xlsx';
import { Download, Clock } from 'lucide-react';
import { useState } from 'react';
import { useApp } from '../../context/AppContext';

const LS_KEY = 'cactus_master_sheet_last_downloaded';

const FUND_COLS = [
  'Company', 'Sector', 'Stage', 'Investment (₹Cr)', 'Valuation (₹Cr)',
  'Ownership %', 'MOIC', 'IRR %', 'Revenue FY25 (₹Cr)', 'Gross Margin %',
  'Monthly Burn (₹Cr)', 'Cash (₹Cr)', 'Runway (months)', 'Status', 'Notes',
];

const SECTOR_EXTRA = [
  'ARR/MRR (₹Cr)', 'GMV (₹Cr)', 'NRR %', 'CAC (₹)', 'LTV (₹)',
  'LTV:CAC', 'Headcount', 'Next Round (₹Cr)', 'Key Risks', 'Milestones',
];

const SECTOR_COLS = [...FUND_COLS, ...SECTOR_EXTRA];

const LP_COLS = ['LP Name', 'Commitment', 'Called', 'Distributed', 'NAV', 'Notes'];

const COL_WIDTH = (n: number) => Array(n).fill({ wch: 20 });

export default function MasterSheetDownloader() {
  const { store } = useApp();
  const [lastDownloaded, setLastDownloaded] = useState<string | null>(
    () => localStorage.getItem(LS_KEY)
  );

  function companyRow(c: (typeof store.companies)[0]) {
    const sector = store.sectors.find(s => s.id === c.sectorId);
    return [
      c.name,
      sector?.name ?? '',
      c.stage,
      c.cactusInvestment,
      c.currentValuation,
      c.ownershipPct,
      c.moic,
      c.irr,
      c.revenue,
      '',               // Gross Margin % — yellow/user-fill
      '',               // Monthly Burn
      '',               // Cash
      '',               // Runway
      c.status,
      c.notes,
    ];
  }

  function handleDownload() {
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Fund Summary ──────────────────────────────────────────────────
    const fundData = [FUND_COLS, ...store.companies.map(companyRow)];
    const fundWs = XLSX.utils.aoa_to_sheet(fundData);
    fundWs['!cols'] = COL_WIDTH(FUND_COLS.length);
    XLSX.utils.book_append_sheet(wb, fundWs, 'Fund Summary');

    // ── One sheet per sector ──────────────────────────────────────────────────
    for (const sector of store.sectors) {
      const companies = store.companies.filter(c => c.sectorId === sector.id);
      const rows = companies.map(c => [...companyRow(c), '', '', '', '', '', '', c.employees, '', '', '']);
      const ws = XLSX.utils.aoa_to_sheet([SECTOR_COLS, ...rows]);
      ws['!cols'] = COL_WIDTH(SECTOR_COLS.length);
      // Truncate sheet name to 31 chars (Excel limit)
      const sheetName = sector.name.slice(0, 31);
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    // ── Sheet: LP Summary ────────────────────────────────────────────────────
    const lpData = [
      LP_COLS,
      ...store.lps.map(lp => [lp.name, lp.commitment, lp.called, lp.distributed, lp.nav, '']),
    ];
    const lpWs = XLSX.utils.aoa_to_sheet(lpData);
    lpWs['!cols'] = COL_WIDTH(LP_COLS.length);
    XLSX.utils.book_append_sheet(wb, lpWs, 'LP Summary');

    // ── Download ──────────────────────────────────────────────────────────────
    const today = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `Cactus_MasterSheet_${today}.xlsx`);

    const ts = new Date().toLocaleString();
    localStorage.setItem(LS_KEY, ts);
    setLastDownloaded(ts);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-start justify-between gap-6 flex-wrap">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            Download Master Sheet Template
          </h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            Pre-filled Excel workbook with one sheet per sector. Fill the yellow columns,
            save to SharePoint, then sync using Data Sync above.
          </p>
          {lastDownloaded && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-gray-400">
              <Clock size={12} />
              Last downloaded: {lastDownloaded}
            </p>
          )}
        </div>

        <button
          onClick={handleDownload}
          className="flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 active:opacity-80 whitespace-nowrap"
          style={{ backgroundColor: '#1C4B42' }}
        >
          <Download size={16} style={{ color: '#86CA0F' }} />
          Download Template
        </button>
      </div>
    </div>
  );
}
