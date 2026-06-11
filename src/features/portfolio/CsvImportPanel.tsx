/**
 * CsvImportPanel — paste or upload a CSV and preview + import into the store.
 * Supports 6 data types: Financial Periods, Company Metrics, Health Signals,
 * Portfolio Updates, Founder Contacts, Valuation Marks.
 * Accessible to both super_admin and portfolio_team (same store namespace).
 */
import { useState, useRef } from 'react';
import {
  Upload, Download, CheckCircle2, AlertCircle, Info,
  FileSpreadsheet, TrendingUp, Activity, Users, BarChart2, DollarSign, RefreshCw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  parseCsv,
  parseFinancialPeriods,
  parseCompanyHealth,
  parsePortfolioUpdates,
  parseFounderContacts,
  parseValuationMarks,
  parseCompanyMetrics,
} from '../../lib/csvImport';
import { downloadCsvTemplate, CSV_TEMPLATES } from '../../lib/csvTemplates';

// ── Tab definitions ────────────────────────────────────────────────────────────

type ImportTabId =
  | 'financial_periods'
  | 'company_metrics'
  | 'health'
  | 'updates'
  | 'contacts'
  | 'valuations';

interface ImportTab {
  id: ImportTabId;
  label: string;
  icon: React.ReactNode;
  templateId: string;
  kvKey: string;
  description: string;
  keyNote: string;
  color: string;
}

const IMPORT_TABS: ImportTab[] = [
  {
    id: 'financial_periods',
    label: 'Financial Periods',
    icon: <BarChart2 size={14} />,
    templateId: 'financial-periods',
    kvKey: 'financial_periods',
    description: 'Quarterly & annual revenue, ARR, margins, burn, MOIC, IRR per company.',
    keyNote: 'Composite key: Company ID + Year Style + Fiscal Year + Quarter',
    color: '#7C3AED',
  },
  {
    id: 'company_metrics',
    label: 'Company Metrics',
    icon: <TrendingUp size={14} />,
    templateId: 'company-metrics',
    kvKey: 'company_metrics',
    description: 'Update top-level company numbers: revenue, valuation, MOIC, IRR, ownership, status.',
    keyNote: 'Key: Company Name (must match exactly)',
    color: '#0891B2',
  },
  {
    id: 'health',
    label: 'Health Signals',
    icon: <Activity size={14} />,
    templateId: 'company-health',
    kvKey: 'health_dashboard',
    description: 'Quarterly health signal ratings (green/amber/red/grey) for all 6 dimensions.',
    keyNote: 'Composite key: Company + Quarter',
    color: '#16A34A',
  },
  {
    id: 'updates',
    label: 'Portfolio Updates',
    icon: <RefreshCw size={14} />,
    templateId: 'portfolio-updates',
    kvKey: 'portfolio_updates',
    description: 'Monthly founder update submissions — highlights, challenges, asks.',
    keyNote: 'Composite key: Company + Month (YYYY-MM)',
    color: '#D97706',
  },
  {
    id: 'contacts',
    label: 'Founder Contacts',
    icon: <Users size={14} />,
    templateId: 'founder-contacts',
    kvKey: 'founder_contacts',
    description: 'Founder and key contact directory for all portfolio companies.',
    keyNote: 'Key: Company + Email (or Name if no email)',
    color: '#DB2777',
  },
  {
    id: 'valuations',
    label: 'Valuation Marks',
    icon: <DollarSign size={14} />,
    templateId: 'valuation-log',
    kvKey: 'valuation_log',
    description: 'Quarterly FMV marks per company for fund NAV calculation.',
    keyNote: 'Composite key: Company + Quarter',
    color: '#EA580C',
  },
];

// ── Preview row display ────────────────────────────────────────────────────────

function PreviewTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const preview = rows.slice(0, 3);
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white text-xs">
      <table className="min-w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {headers.map(h => (
              <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {preview.map((row, i) => (
            <tr key={i}>
              {headers.map((_, j) => (
                <td key={j} className="px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[150px] truncate">
                  {row[j] ?? ''}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function CsvImportPanel() {
  const {
    store,
    batchUpsertFinancialPeriods,
    batchUpsertCompanyHealth,
    batchUpsertPortfolioUpdates,
    batchUpsertFounderContacts,
    batchUpsertValuationMarks,
    batchUpdateCompanyMetrics,
  } = useApp();

  const [activeTab, setActiveTab] = useState<ImportTabId>('financial_periods');
  const [rawText, setRawText]     = useState('');
  const [preview, setPreview]     = useState<{ headers: string[]; rows: string[][]; total: number; errors: string[] } | null>(null);
  const [imported, setImported]   = useState<{ count: number; tab: ImportTabId } | null>(null);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const tab = IMPORT_TABS.find(t => t.id === activeTab)!;

  const handleTabChange = (id: ImportTabId) => {
    setActiveTab(id);
    setRawText('');
    setPreview(null);
    setImported(null);
  };

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      setRawText(text);
      runPreview(text);
    };
    reader.readAsText(file, 'utf-8');
  };

  const runPreview = (text: string = rawText) => {
    if (!text.trim()) return;
    const rows = parseCsv(text);
    if (rows.length < 2) {
      setPreview({ headers: [], rows: [], total: 0, errors: ['No data rows found — paste CSV including the header row'] });
      return;
    }
    const [header, ...dataRows] = rows;
    setPreview({ headers: header, rows: dataRows, total: dataRows.length, errors: [] });
  };

  const handleImport = () => {
    if (!rawText.trim()) return;
    setImporting(true);
    const rows = parseCsv(rawText);

    try {
      if (activeTab === 'financial_periods') {
        const result = parseFinancialPeriods(rows, store.companies, store.financialPeriods ?? []);
        if (result.upserted.length) batchUpsertFinancialPeriods(result.upserted);
        setImported({ count: result.upserted.length, tab: activeTab });
        if (result.errors.length) setPreview(p => p ? { ...p, errors: result.errors } : null);

      } else if (activeTab === 'company_metrics') {
        const result = parseCompanyMetrics(rows, store.companies);
        if (result.upserted.length) batchUpdateCompanyMetrics(result.upserted);
        setImported({ count: result.upserted.length, tab: activeTab });
        if (result.errors.length) setPreview(p => p ? { ...p, errors: result.errors } : null);

      } else if (activeTab === 'health') {
        const result = parseCompanyHealth(rows, store.companies, store.companyHealth ?? []);
        if (result.upserted.length) batchUpsertCompanyHealth(result.upserted);
        setImported({ count: result.upserted.length, tab: activeTab });
        if (result.errors.length) setPreview(p => p ? { ...p, errors: result.errors } : null);

      } else if (activeTab === 'updates') {
        const result = parsePortfolioUpdates(rows, store.companies, store.portfolioUpdates ?? []);
        if (result.upserted.length) batchUpsertPortfolioUpdates(result.upserted);
        setImported({ count: result.upserted.length, tab: activeTab });
        if (result.errors.length) setPreview(p => p ? { ...p, errors: result.errors } : null);

      } else if (activeTab === 'contacts') {
        const result = parseFounderContacts(rows, store.companies, store.founderContacts ?? []);
        if (result.upserted.length) batchUpsertFounderContacts(result.upserted);
        setImported({ count: result.upserted.length, tab: activeTab });
        if (result.errors.length) setPreview(p => p ? { ...p, errors: result.errors } : null);

      } else if (activeTab === 'valuations') {
        const result = parseValuationMarks(rows, store.companies, store.valuationMarks ?? []);
        if (result.upserted.length) batchUpsertValuationMarks(result.upserted);
        setImported({ count: result.upserted.length, tab: activeTab });
        if (result.errors.length) setPreview(p => p ? { ...p, errors: result.errors } : null);
      }
    } finally {
      setImporting(false);
    }
  };

  const handleDownload = () => {
    const tpl = CSV_TEMPLATES.find(t => t.id === tab.templateId);
    if (tpl) downloadCsvTemplate(tpl, store);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 rounded-xl p-4 border border-emerald-100 bg-emerald-50">
        <FileSpreadsheet className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-800">CSV / Excel Import</p>
          <p className="text-xs text-emerald-700 mt-0.5">
            Download a template → fill in Excel or Google Sheets → paste or upload here.
            Both Super Admin and Portfolio Admin see the same data.
          </p>
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex flex-wrap gap-1">
        {IMPORT_TABS.map(t => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
              style={active
                ? { backgroundColor: t.color, color: '#fff', borderColor: t.color }
                : { backgroundColor: '#fff', color: '#374151', borderColor: '#E5E7EB' }
              }
            >
              {t.icon}
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Active tab panel */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">

        {/* Tab description */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">{tab.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{tab.description}</p>
            <div className="flex items-center gap-1 mt-1">
              <Info size={11} className="text-gray-400" />
              <span className="text-[10px] text-gray-400 font-mono">{tab.keyNote}</span>
            </div>
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap shrink-0"
          >
            <Download size={13} />
            Download Template
          </button>
        </div>

        {/* Import success banner */}
        {imported && imported.tab === activeTab && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <p className="text-sm font-semibold text-emerald-800">
              Imported {imported.count} row{imported.count !== 1 ? 's' : ''} successfully.
              Changes are live and saved to the portal.
            </p>
          </div>
        )}

        {/* Paste area */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-500">
            Paste CSV data (or upload a file below)
          </label>
          <textarea
            className="w-full h-32 border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none bg-gray-50"
            placeholder={`Paste CSV here — first row must be the header row.\nExample:\nCompany Name,Revenue (₹Cr),Valuation (₹Cr),MOIC,...\nLohum,835,4700,2.92,...`}
            value={rawText}
            onChange={e => { setRawText(e.target.value); setPreview(null); setImported(null); }}
          />
        </div>

        {/* File upload */}
        <div className="flex items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            <Upload size={13} />
            Upload .csv file
          </button>
          <span className="text-xs text-gray-400">or paste above — both work the same way.</span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => runPreview()}
            disabled={!rawText.trim()}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40"
          >
            Preview
          </button>
          <button
            onClick={handleImport}
            disabled={!rawText.trim() || importing}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white disabled:opacity-40"
            style={{ backgroundColor: tab.color }}
          >
            {importing ? <RefreshCw size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
            {importing ? 'Importing…' : `Import ${tab.label}`}
          </button>
        </div>

        {/* Preview results */}
        {preview && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-gray-700">
                {preview.total} data row{preview.total !== 1 ? 's' : ''} found
              </span>
              {preview.headers.length > 0 && (
                <span className="text-xs text-gray-400">
                  {preview.headers.length} columns detected
                </span>
              )}
              {preview.errors.length > 0 && (
                <span className="text-xs text-amber-600 flex items-center gap-1">
                  <AlertCircle size={11} /> {preview.errors.length} warning{preview.errors.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {preview.errors.length > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                {preview.errors.slice(0, 5).map((e, i) => (
                  <p key={i} className="text-xs text-amber-700">{e}</p>
                ))}
                {preview.errors.length > 5 && (
                  <p className="text-xs text-amber-500">…and {preview.errors.length - 5} more</p>
                )}
              </div>
            )}

            {preview.headers.length > 0 && preview.rows.length > 0 && (
              <>
                <p className="text-[10px] text-gray-400">Preview — first 3 rows:</p>
                <PreviewTable headers={preview.headers.slice(0, 8)} rows={preview.rows} />
                {preview.headers.length > 8 && (
                  <p className="text-[10px] text-gray-400">+ {preview.headers.length - 8} more columns (truncated for display)</p>
                )}
              </>
            )}
          </div>
        )}

      </div>

      {/* Column reference */}
      <details className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <summary className="px-5 py-3 text-xs font-semibold text-gray-600 cursor-pointer hover:bg-gray-50 flex items-center gap-2">
          <Info size={13} className="text-gray-400" />
          Column reference — what each column maps to in the portal
        </summary>
        <div className="px-5 py-4 border-t border-gray-100">
          <ColumnReference tabId={activeTab} />
        </div>
      </details>
    </div>
  );
}

// ── Column reference (per tab) ─────────────────────────────────────────────────

function ColumnReference({ tabId }: { tabId: ImportTabId }) {
  const refs: Record<ImportTabId, Array<{ col: string; maps: string; required?: boolean }>> = {
    financial_periods: [
      { col: 'Company Name',        maps: 'Company lookup (use exact name from portal)', required: true },
      { col: 'Company ID',          maps: 'Fallback ID (e.g. c3 for Lohum) — optional if Name is correct' },
      { col: 'Year Style',          maps: 'FY or CY', required: true },
      { col: 'Fiscal Year',         maps: 'e.g. FY2025 or 2025', required: true },
      { col: 'Quarter',             maps: 'Q1/Q2/Q3/Q4 — blank for Annual rows' },
      { col: 'Revenue (₹Cr)',       maps: 'Company → Funding tab → Revenue column' },
      { col: 'ARR (₹Cr)',           maps: 'Annual Recurring Revenue (SaaS companies)' },
      { col: 'Gross Margin %',      maps: 'Gross margin — shown in financial table' },
      { col: 'EBITDA Margin %',     maps: 'EBITDA margin — shown in financial table' },
      { col: 'Valuation FMV (₹Cr)', maps: 'FMV mark → MOIC calculation' },
      { col: 'MOIC',                maps: 'Multiple on invested capital' },
      { col: 'IRR %',               maps: 'Annualised IRR' },
      { col: 'Monthly Burn (₹Cr)',  maps: 'Monthly cash burn' },
      { col: 'Cash Balance (₹Cr)',  maps: 'Cash in bank' },
      { col: 'Runway (months)',     maps: 'Cash / Burn' },
    ],
    company_metrics: [
      { col: 'Company Name',      maps: 'Must match company name exactly in portal', required: true },
      { col: 'Revenue (₹Cr)',     maps: 'Portfolio table → Revenue column; company card' },
      { col: 'Valuation (₹Cr)',   maps: 'Portfolio table → Valuation column; company card' },
      { col: 'MOIC',              maps: 'Portfolio table → MOIC column; fund summary' },
      { col: 'IRR (%)',           maps: 'Portfolio table → IRR column; fund summary' },
      { col: 'Ownership %',       maps: 'Cactus stake — portfolio table' },
      { col: 'Status',            maps: 'Active / Watch / Exited — status badge' },
      { col: 'CEO Name',          maps: 'Company drawer → Overview → CEO field' },
      { col: 'HQ City',           maps: 'Company drawer → Overview → Location' },
      { col: 'Employees',         maps: 'Company drawer → headcount' },
      { col: 'EBITDA (₹Cr)',      maps: 'Company financials EBITDA field' },
    ],
    health: [
      { col: 'Company Name',              maps: 'Lookup key', required: true },
      { col: 'Quarter',                   maps: 'e.g. "Q4 FY25" — must match format', required: true },
      { col: 'Revenue Growth Signal',     maps: 'Portfolio → Health Dashboard → Revenue dot (green/amber/red/grey)' },
      { col: 'Burn Signal',               maps: 'Health Dashboard → Burn dot' },
      { col: 'Team Retention Signal',     maps: 'Health Dashboard → Team dot' },
      { col: 'Product Progress Signal',   maps: 'Health Dashboard → Product dot' },
      { col: 'Fundraising Signal',        maps: 'Health Dashboard → Fundraising dot' },
      { col: 'Overall Signal',            maps: 'Health Dashboard → Overall summary dot' },
      { col: 'Notes',                     maps: 'Hover tooltip on health card' },
      { col: 'Reviewed By',               maps: 'Audit trail' },
      { col: 'Reviewed At',               maps: 'Date of review (YYYY-MM-DD)' },
    ],
    updates: [
      { col: 'Company Name',      maps: 'Lookup key', required: true },
      { col: 'Month (YYYY-MM)',   maps: 'e.g. 2025-06', required: true },
      { col: 'Status',            maps: 'submitted / reviewed / pending' },
      { col: 'Revenue (₹Cr)',     maps: 'Operations → Portfolio Updates → revenue cell' },
      { col: 'Burn (₹Cr)',        maps: 'Monthly burn' },
      { col: 'Cash (₹Cr)',        maps: 'Cash in bank' },
      { col: 'Headcount',         maps: 'Team size at month end' },
      { col: 'Highlights',        maps: 'Key wins — shown in update card' },
      { col: 'Challenges',        maps: 'Blockers — shown in update card' },
      { col: 'Asks',              maps: 'Help needed from Cactus' },
      { col: 'Next Month Goals',  maps: 'Stated targets for next month' },
    ],
    contacts: [
      { col: 'Company Name',      maps: 'Lookup key', required: true },
      { col: 'Name',              maps: 'Portfolio → Founder Directory → contact name', required: true },
      { col: 'Role',              maps: 'Title e.g. Co-Founder & CEO' },
      { col: 'Email',             maps: 'Primary email — used as dedup key' },
      { col: 'Phone',             maps: 'WhatsApp / mobile number' },
      { col: 'LinkedIn URL',      maps: 'LinkedIn profile link' },
      { col: 'Birthday',          maps: 'YYYY-MM-DD — shown in calendar reminders' },
      { col: 'Location',          maps: 'City where founder is based' },
      { col: 'Last Contacted',    maps: 'YYYY-MM-DD — used for recency tracking' },
      { col: 'Tags',              maps: 'Comma-separated e.g. founder,battery,ipo' },
    ],
    valuations: [
      { col: 'Company Name',     maps: 'Lookup key', required: true },
      { col: 'Quarter',          maps: 'e.g. "Q4 FY25" — composite key', required: true },
      { col: 'FMV (₹Cr)',        maps: 'Finance → Valuation Log; fund NAV calculation' },
      { col: 'Methodology',      maps: 'Last Round / Revenue Multiple / DCF / Comparable' },
      { col: 'MOIC at Mark',     maps: 'FMV / Total Invested at time of mark' },
      { col: 'Notes',            maps: 'Valuation rationale — shown in log' },
      { col: 'Marked By',        maps: 'Person who set the mark' },
      { col: 'Marked At',        maps: 'Date of mark (YYYY-MM-DD)' },
    ],
  };

  const cols = refs[tabId] ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="text-left py-1.5 pr-4 text-gray-500 font-semibold w-48">Column</th>
            <th className="text-left py-1.5 text-gray-500 font-semibold">Where it appears in the portal</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {cols.map(c => (
            <tr key={c.col}>
              <td className="py-1.5 pr-4 font-mono text-gray-700 whitespace-nowrap">
                {c.col}
                {c.required && <span className="ml-1 text-red-400">*</span>}
              </td>
              <td className="py-1.5 text-gray-500">{c.maps}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-[10px] text-gray-400 mt-2">* Required columns — import will skip rows where these are missing or unrecognised.</p>
    </div>
  );
}
