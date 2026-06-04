import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, ExternalLink, Check, X, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import {
  getSyncSources, createSyncSource, deleteSyncSource,
  runSync, fetchExcelPreview,
  type SyncSource,
} from '../../lib/api';
import CsvTemplateLibrary from '../../components/ui/CsvTemplateLibrary';

const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';

// Pre-defined source names — picking one auto-wires the sheet mappings
const PRESET_SOURCES: Array<{
  name: string;
  description: string;
  team: string;
  sheets: Array<{ sheetName: string; label: string; kvNamespace: string; kvKey: string }>;
}> = [
  {
    name: 'Cactus Master Sheet',
    description: 'All data — Fund Metrics, Cash Flows, Expenses, Financial Periods, LP Summary',
    team: 'All Teams',
    sheets: [
      { sheetName: 'Fund Metrics',         label: 'Fund Metrics',       kvNamespace: 'finance',   kvKey: 'fund_1::fund_metrics' },
      { sheetName: 'Cash Flows',           label: 'Cash Flows',         kvNamespace: 'finance',   kvKey: 'fund_1::cash_flows' },
      { sheetName: 'Fund Expenses',        label: 'Fund Expenses',      kvNamespace: 'finance',   kvKey: 'et:fund_expenses' },
      { sheetName: 'IM Expenses',          label: 'IM Expenses',        kvNamespace: 'finance',   kvKey: 'et:im_expenses' },
      { sheetName: 'FY Revenue & Ops',     label: 'Financial Periods',  kvNamespace: 'portfolio', kvKey: 'financial_periods' },
      { sheetName: 'FY Returns (MOIC-IRR)',label: 'Valuation Log',      kvNamespace: 'finance',   kvKey: 'valuation_log' },
      { sheetName: 'LP Summary',           label: 'LP Summary',         kvNamespace: 'app',       kvKey: 'lp_summary' },
      { sheetName: 'Fund Summary',         label: 'Portfolio Snapshot', kvNamespace: 'finance',   kvKey: 'pm:Portfolio' },
    ],
  },
  {
    name: 'Finance Team Data',
    description: 'Fund Metrics, Expenses, Capital Calls, Valuation Log',
    team: 'Finance',
    sheets: [
      { sheetName: 'Fund Metrics',   label: 'Fund Metrics',    kvNamespace: 'finance', kvKey: 'fund_1::fund_metrics' },
      { sheetName: 'Cash Flows',     label: 'Cash Flows',      kvNamespace: 'finance', kvKey: 'fund_1::cash_flows' },
      { sheetName: 'Fund Expenses',  label: 'Fund Expenses',   kvNamespace: 'finance', kvKey: 'et:fund_expenses' },
      { sheetName: 'IM Expenses',    label: 'IM Expenses',     kvNamespace: 'finance', kvKey: 'et:im_expenses' },
      { sheetName: 'Capital Calls',  label: 'Capital Calls',   kvNamespace: 'finance', kvKey: 'capital_calls' },
      { sheetName: 'Valuation Log',  label: 'Valuation Log',   kvNamespace: 'finance', kvKey: 'valuation_log' },
    ],
  },
  {
    name: 'Portfolio Team Data',
    description: 'Financial Periods (FY/CY), Portfolio Updates, Company Health, Founder Contacts',
    team: 'Portfolio',
    sheets: [
      { sheetName: 'FY Revenue & Ops',  label: 'Financial Periods',  kvNamespace: 'portfolio', kvKey: 'financial_periods' },
      { sheetName: 'Portfolio Updates', label: 'Portfolio Updates',  kvNamespace: 'portfolio', kvKey: 'portfolio_updates' },
      { sheetName: 'Company Health',    label: 'Health Dashboard',   kvNamespace: 'portfolio', kvKey: 'health_dashboard' },
      { sheetName: 'Founder Contacts',  label: 'Founder Contacts',   kvNamespace: 'portfolio', kvKey: 'founder_contacts' },
    ],
  },
  {
    name: 'Investment Team Data',
    description: 'Deal Pipeline, IC Memos, Reference Checks, Co-investors',
    team: 'Investment',
    sheets: [
      { sheetName: 'Deal Pipeline',    label: 'Deal Pipeline',   kvNamespace: 'investment', kvKey: 'pipeline' },
      { sheetName: 'IC Memos',         label: 'IC Memos',        kvNamespace: 'investment', kvKey: 'ic_memos' },
      { sheetName: 'Reference Checks', label: 'Ref Checks',      kvNamespace: 'investment', kvKey: 'ref_checks' },
      { sheetName: 'Co-investors',     label: 'Co-investors',    kvNamespace: 'investment', kvKey: 'co_investors' },
    ],
  },
  {
    name: 'Operations Team Data',
    description: 'Tasks, Meeting Notes, Intro Requests, Recruitment',
    team: 'Operations',
    sheets: [
      { sheetName: 'Tasks',          label: 'Tasks',          kvNamespace: 'operations', kvKey: 'tasks' },
      { sheetName: 'Meeting Notes',  label: 'Meeting Notes',  kvNamespace: 'operations', kvKey: 'meeting_notes' },
      { sheetName: 'Intro Requests', label: 'Intro Requests', kvNamespace: 'operations', kvKey: 'intro_requests' },
      { sheetName: 'Candidates',     label: 'Recruitment',    kvNamespace: 'operations', kvKey: 'recruitment' },
    ],
  },
  {
    name: 'LP Investors',
    description: 'LP commitments, called capital, distributions, NAV',
    team: 'Finance',
    sheets: [
      { sheetName: 'LP Summary', label: 'LP Investors', kvNamespace: 'app', kvKey: 'lp_summary' },
    ],
  },
  {
    name: 'Compliance Calendar',
    description: 'Regulatory deadlines, compliance events',
    team: 'Finance',
    sheets: [
      { sheetName: 'Compliance Events', label: 'Compliance Events', kvNamespace: 'compliance', kvKey: 'events' },
    ],
  },
];

// Suggested sheet → KV mappings for common Cactus Excel structures
const SUGGESTED_MAPPINGS = PRESET_SOURCES.flatMap(s => s.sheets.map(sh => ({
  label: sh.label, kvNamespace: sh.kvNamespace, kvKey: sh.kvKey,
})));

interface SheetMapping { sheet: string; kvNamespace: string; kvKey: string; label: string; }

function StatusBadge({ status }: { status: SyncSource['last_sync_status'] }) {
  if (status === 'success') return <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Last sync successful</span>;
  if (status === 'error')   return <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="w-3.5 h-3.5" /> Last sync failed</span>;
  return <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3.5 h-3.5" /> Never synced</span>;
}

export default function SyncManager() {
  const { store } = useApp();
  const [sources, setSources] = useState<SyncSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [syncResult, setSyncResult] = useState<{ id: number; msg: string; ok: boolean } | null>(null);

  // New source form
  const [selectedPreset, setSelectedPreset] = useState<string>('Cactus Master Sheet');
  const [form, setForm] = useState({ name: 'Cactus Master Sheet', url: '' });
  const [preview, setPreview] = useState<{ sheets: string[]; rowCounts: Record<string, number> } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [mappings, setMappings] = useState<SheetMapping[]>([]);

  useEffect(() => {
    getSyncSources().then(s => { setSources(s); setLoading(false); });
  }, []);

  const loadPreview = async () => {
    if (!form.url.trim()) return;
    setPreviewLoading(true);
    setPreviewError('');
    setPreview(null);
    setMappings([]);
    const result = await fetchExcelPreview(form.url.trim());
    setPreviewLoading(false);
    if (result.error) { setPreviewError(result.error); return; }
    setPreview({ sheets: result.sheets, rowCounts: result.rowCounts });

    // Auto-wire from preset first, then fall back to fuzzy match
    const preset = PRESET_SOURCES.find(ps => ps.name === selectedPreset);
    const auto: SheetMapping[] = result.sheets.map((sheet: string) => {
      // Exact match against preset sheet names
      const presetSheet = preset?.sheets.find(ps =>
        ps.sheetName.toLowerCase() === sheet.toLowerCase()
      );
      if (presetSheet) {
        return { sheet, kvNamespace: presetSheet.kvNamespace, kvKey: presetSheet.kvKey, label: presetSheet.label };
      }
      // Fuzzy fallback
      const suggested = SUGGESTED_MAPPINGS.find(s =>
        s.label.toLowerCase().includes(sheet.toLowerCase().slice(0, 5)) ||
        sheet.toLowerCase().includes(s.label.toLowerCase().slice(0, 5))
      );
      return {
        sheet,
        kvNamespace: suggested?.kvNamespace ?? 'finance',
        kvKey: suggested?.kvKey ?? `data:${sheet.toLowerCase().replace(/\s+/g, '_')}`,
        label: suggested?.label ?? sheet,
      };
    });
    setMappings(auto);
  };

  const saveSource = async () => {
    if (!form.name.trim() || !form.url.trim()) return;
    const src = await createSyncSource({ name: form.name, url: form.url, sheet_mappings: mappings });
    if (src) {
      setSources(prev => [src, ...prev]);
      setCreating(false);
      setForm({ name: 'Cactus Master Sheet', url: '' });
      setSelectedPreset('Cactus Master Sheet');
      setPreview(null);
      setMappings([]);
    }
  };

  const doSync = async (id: number) => {
    setSyncing(id);
    setSyncResult(null);
    const result = await runSync(id);
    setSyncing(null);
    if (result.success) {
      setSyncResult({ id, msg: `Synced ${(result.stored as unknown[])?.length ?? 0} sheet(s) successfully`, ok: true });
      // Refresh source list
      getSyncSources().then(setSources);
    } else {
      setSyncResult({ id, msg: result.error ?? 'Sync failed', ok: false });
    }
  };

  const removeSource = async (id: number) => {
    if (!confirm('Remove this sync source?')) return;
    await deleteSyncSource(id);
    setSources(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Info box */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">How SharePoint/Teams sync works</p>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>Open the Excel file in SharePoint or OneDrive → Share → "Anyone with link" → Copy link</li>
          <li>Paste the link below → click <strong>Preview</strong> to see the sheets</li>
          <li>Map each sheet to where data goes in the dashboard</li>
          <li>Click <strong>Sync Now</strong> any time to pull the latest data</li>
        </ol>
        <p className="text-xs text-blue-600 mt-2">
          Data is stored in <strong>PostgreSQL on Render</strong> — shared across all users, permanent.
        </p>
      </div>

      {/* Add new source */}
      {creating ? (
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Add SharePoint / OneDrive Source</h3>
            <button onClick={() => setCreating(false)} className="p-1 rounded hover:bg-gray-200 text-gray-400"><X className="w-4 h-4" /></button>
          </div>

          <div className="space-y-3">
            {/* Preset source selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">What data are you syncing?</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_SOURCES.map(ps => (
                  <button
                    key={ps.name}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(ps.name);
                      setForm(f => ({ ...f, name: ps.name }));
                    }}
                    className={`text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
                      selectedPreset === ps.name
                        ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-gray-800">{ps.name}</p>
                    <p className="text-gray-500 mt-0.5 text-[10px]">{ps.description}</p>
                    <span className="text-[10px] mt-1 inline-block px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{ps.team}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* URL input */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">
                SharePoint / OneDrive URL
                <span className="ml-1 text-gray-400">(share file → "Anyone with link" → copy link)</span>
              </label>
              <div className="flex gap-2">
                <input className={ic + ' flex-1'} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://yourcompany.sharepoint.com/:x:/s/..." />
                <button onClick={loadPreview} disabled={previewLoading || !form.url}
                  className="px-3 py-2 text-xs font-medium rounded-lg text-white bg-emerald-600 disabled:opacity-50 whitespace-nowrap">
                  {previewLoading ? 'Loading…' : 'Preview'}
                </button>
              </div>
            </div>
          </div>

          {previewError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold">Could not fetch file</p>
                <p>{previewError}</p>
                <p className="mt-1 text-red-600">Make sure the file is shared with "Anyone with link can view"</p>
              </div>
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-700">
                  Found {preview.sheets.length} sheet(s) — map each to a destination below
                </p>
              </div>

              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Sheet</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Rows</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Label in Dashboard</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Destination</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mappings.map((m, i) => (
                      <tr key={m.sheet} className="hover:bg-gray-50">
                        <td className="px-3 py-2.5 font-medium text-gray-800">{m.sheet}</td>
                        <td className="px-3 py-2.5 text-gray-500">{preview.rowCounts[m.sheet] ?? 0}</td>
                        <td className="px-3 py-2.5">
                          <select className="border border-gray-200 rounded px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-emerald-300"
                            value={m.label}
                            onChange={e => {
                              const sug = SUGGESTED_MAPPINGS.find(s => s.label === e.target.value);
                              setMappings(prev => prev.map((mp, j) => j !== i ? mp : {
                                ...mp,
                                label: e.target.value,
                                kvNamespace: sug?.kvNamespace ?? mp.kvNamespace,
                                kvKey: sug?.kvKey ?? mp.kvKey,
                              }));
                            }}>
                            {SUGGESTED_MAPPINGS.map(s => <option key={s.label}>{s.label}</option>)}
                            <option value={m.sheet}>Custom: {m.sheet}</option>
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-gray-400 text-[10px]">{m.kvNamespace}/{m.kvKey}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={saveSource} disabled={!form.name || !form.url || !preview}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white bg-emerald-700 disabled:opacity-50">
              <Check className="w-4 h-4" /> Save Source
            </button>
            <button onClick={() => setCreating(false)} className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600">
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setCreating(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: store.firm.primaryColor }}>
          <Plus className="w-4 h-4" /> Add SharePoint Source
        </button>
      )}

      {/* Source list */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
      ) : sources.length === 0 ? (
        <div className="text-center py-8 rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-400">No sync sources yet.</p>
          <p className="text-xs text-gray-300 mt-1">Add a SharePoint or OneDrive Excel link above.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sources.map(src => (
            <div key={src.id} className="border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{src.name}</p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <StatusBadge status={src.last_sync_status} />
                    {src.last_synced_at && (
                      <span className="text-xs text-gray-400">
                        {new Date(src.last_synced_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    <a href={src.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-0.5 text-xs text-blue-500 hover:text-blue-700">
                      <ExternalLink className="w-3 h-3" /> Open file
                    </a>
                  </div>
                  {syncResult?.id === src.id && (
                    <p className={`text-xs mt-1 ${syncResult.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                      {syncResult.ok ? '✓' : '✗'} {syncResult.msg}
                    </p>
                  )}
                  {src.last_sync_status === 'error' && src.last_sync_error && (
                    <p className="text-xs text-red-400 mt-0.5 truncate">{src.last_sync_error}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => setExpandedId(expandedId === src.id ? null : src.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                    {expandedId === src.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => doSync(src.id)} disabled={syncing === src.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-emerald-700 disabled:opacity-60">
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing === src.id ? 'animate-spin' : ''}`} />
                    {syncing === src.id ? 'Syncing…' : 'Sync Now'}
                  </button>
                  <button onClick={() => removeSource(src.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {expandedId === src.id && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Sheet Mappings</p>
                  {src.sheet_mappings.length === 0 ? (
                    <p className="text-xs text-gray-400">No mappings configured</p>
                  ) : (
                    <div className="space-y-1.5">
                      {src.sheet_mappings.map((m, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <span className="font-medium text-gray-700 w-36 truncate">{m.sheet}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-600">{m.label}</span>
                          <span className="text-gray-300 font-mono text-[10px] ml-auto">{m.kvNamespace}/{m.kvKey}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── CSV Template Library ─────────────────────────────────────────────── */}
      <hr className="border-gray-100" />
      <CsvTemplateLibrary team="all" />
      <hr className="border-gray-100" />

      {/* Storage explanation */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 space-y-2">
        <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">Where your data is stored</p>
        <div className="space-y-1.5 text-xs text-gray-600">
          {[
            'Portfolio companies, valuations, financials',
            'Internal notes',
            'File uploads (PDFs, docs)',
            'Finance metrics & expense tables',
            'Compliance calendar events',
            'Deals pipeline',
            'LP data & cash flows',
            'SharePoint synced data',
          ].map(item => (
            <div key={item} className="flex justify-between gap-4 py-1 border-b border-emerald-100 last:border-0">
              <span className="font-medium">{item}</span>
              <span className="text-emerald-600 shrink-0 font-semibold">PostgreSQL ✓</span>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-emerald-600 mt-2">
          All data is shared across all users and devices. Changes made in Admin are saved automatically.
        </p>
      </div>
    </div>
  );
}
