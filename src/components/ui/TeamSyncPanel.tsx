/**
 * TeamSyncPanel — per-team data sync embedded in each team's tab.
 * Each team sees only their own sync sources and data namespace.
 * Finance team → finance/* KV. Portfolio → portfolio/*. Investment → investment/*.
 */
import { useState, useEffect } from 'react';
import { RefreshCw, Plus, Trash2, ExternalLink, CheckCircle2, AlertCircle, Clock, X, Check, Link2, Link2Off } from 'lucide-react';
import CsvTemplateLibrary from './CsvTemplateLibrary';
import TeamGuide from './TeamGuide';
import {
  getSyncSources, createSyncSource, deleteSyncSource,
  runSync, fetchExcelPreview,
  type SyncSource,
} from '../../lib/api';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = localStorage.getItem('cactus_access');
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

const TEAM_META: Record<string, {
  label: string;
  color: string;
  namespace: string;
  suggestedMappings: Array<{ label: string; kvNamespace: string; kvKey: string }>;
  description: string;
}> = {
  finance: {
    label: 'Finance Team',
    color: '#1C4B42',
    namespace: 'finance',
    description: 'Your finance data is stored in a private namespace — not visible to Portfolio or Investment teams.',
    // Only kvKeys with a real backend transformer are offered. Cash Flows / Fund &
    // IM Expenses are managed via the in-app Finance dynamic tables, not the store-blob
    // sync, so they are intentionally NOT listed here (syncing them was a silent no-op).
    suggestedMappings: [
      { label: 'Fund Metric Cards',    kvNamespace: 'app',     kvKey: 'fund_metric_cards' },
      { label: 'Fund Investments',     kvNamespace: 'finance', kvKey: 'fund_investments' },
      { label: 'Portfolio Snapshot',   kvNamespace: 'app',     kvKey: 'pm:Portfolio' },
      { label: 'Capital Calls',        kvNamespace: 'finance', kvKey: 'capital_calls' },
      { label: 'Valuation Log',        kvNamespace: 'app',     kvKey: 'valuation_log' },
      { label: 'LP Summary',           kvNamespace: 'app',     kvKey: 'lp_summary' },
    ],
  },
  portfolio: {
    label: 'Portfolio Team',
    color: '#7C3AED',
    namespace: 'portfolio',
    description: 'Your portfolio data (founder contacts, health signals, news) is private to the Portfolio team.',
    suggestedMappings: [
      { label: 'Portfolio Updates',    kvNamespace: 'portfolio', kvKey: 'portfolio_updates' },
      { label: 'Company Health',       kvNamespace: 'portfolio', kvKey: 'health_dashboard' },
      { label: 'Financial Periods',    kvNamespace: 'portfolio', kvKey: 'financial_periods' },
      { label: 'Founder Contacts',     kvNamespace: 'portfolio', kvKey: 'founder_contacts' },
      { label: 'Research Library',     kvNamespace: 'portfolio', kvKey: 'research_docs' },
      // Company-nested sheets write into companies[], which lives in the 'app'
      // namespace — they MUST sync to 'app' or the merged companies array would be
      // written to the wrong blob and clobber the real one on next hydrate.
      { label: 'Sector KPIs',          kvNamespace: 'app', kvKey: 'sector_kpis' },
      { label: 'Funding Rounds',       kvNamespace: 'app', kvKey: 'funding_rounds' },
      { label: 'Cap Table',            kvNamespace: 'app', kvKey: 'cap_table' },
      { label: 'Financial History',    kvNamespace: 'app', kvKey: 'financial_history' },
      { label: 'Portfolio Fund View',  kvNamespace: 'portfolio', kvKey: 'portfolio_fund_view' },
    ],
  },
  investment: {
    label: 'Investment Team',
    color: '#0891B2',
    namespace: 'investment',
    description: 'Your deal data (IC memos, DD checklists, reference checks) is private to the Investment team.',
    suggestedMappings: [
      { label: 'IC Memos',             kvNamespace: 'investment', kvKey: 'ic_memos' },
      { label: 'Due Diligence',        kvNamespace: 'investment', kvKey: 'dd_checklists' },
      { label: 'Reference Checks',     kvNamespace: 'investment', kvKey: 'ref_checks' },
      { label: 'Co-investor CRM',      kvNamespace: 'investment', kvKey: 'co_investors' },
      { label: 'Deal Pipeline',        kvNamespace: 'investment', kvKey: 'pipeline' },
    ],
  },
  operations: {
    label: 'Operations Team',
    color: '#D97706',
    namespace: 'operations',
    description: 'Your operations data (tasks, meeting notes, recruitment) is private to the Operations team.',
    suggestedMappings: [
      { label: 'Tasks',                kvNamespace: 'operations', kvKey: 'tasks' },
      { label: 'Meeting Notes',        kvNamespace: 'operations', kvKey: 'meeting_notes' },
      { label: 'Recruitment',          kvNamespace: 'operations', kvKey: 'recruitment' },
      { label: 'Event Calendar',       kvNamespace: 'operations', kvKey: 'firm_events' },
    ],
  },
};

const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';

interface SheetMapping { sheet: string; kvNamespace: string; kvKey: string; label: string; }

function StatusBadge({ status }: { status: SyncSource['last_sync_status'] }) {
  if (status === 'success') return <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> Synced successfully</span>;
  if (status === 'error')   return <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="w-3.5 h-3.5" /> Sync failed</span>;
  return <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="w-3.5 h-3.5" /> Never synced</span>;
}

interface Props {
  team: 'finance' | 'portfolio' | 'investment' | 'operations';
}

export default function TeamSyncPanel({ team }: Props) {
  const meta = TEAM_META[team];
  const [sources, setSources] = useState<SyncSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [syncResult, setSyncResult] = useState<{ id: number; msg: string; ok: boolean } | null>(null);
  const [form, setForm] = useState({ name: '', url: '' });
  const [preview, setPreview] = useState<{ sheets: string[]; rowCounts: Record<string, number> } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [mappings, setMappings] = useState<SheetMapping[]>([]);
  const [msStatus, setMsStatus] = useState<{ connected: boolean; expiresAt?: string } | null>(null);
  const [msDisconnecting, setMsDisconnecting] = useState(false);

  useEffect(() => {
    // Filter sync sources for this team's namespace
    getSyncSources().then(all => {
      const teamSources = all.filter(s =>
        s.sheet_mappings.some(m => m.kvNamespace === meta.namespace) ||
        s.name.toLowerCase().includes(team)
      );
      setSources(teamSources);
      setLoading(false);
    });
    // Check Microsoft connection status
    fetch(`${BASE}/api/microsoft/status`, { headers: authHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setMsStatus(d))
      .catch(() => {});
    // Handle OAuth redirect params
    const params = new URLSearchParams(window.location.search);
    if (params.get('ms_connected')) {
      setMsStatus({ connected: true });
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('ms_error')) {
      alert('Microsoft connection failed: ' + decodeURIComponent(params.get('ms_error')!));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [team]);

  const disconnectMicrosoft = async () => {
    if (!confirm('Disconnect Microsoft account? SharePoint sync will stop working.')) return;
    setMsDisconnecting(true);
    await fetch(`${BASE}/api/microsoft/disconnect`, { method: 'POST', headers: authHeaders() }).catch(() => {});
    setMsStatus({ connected: false });
    setMsDisconnecting(false);
  };

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
    const auto: SheetMapping[] = result.sheets.map((sheet: string) => {
      const suggested = meta.suggestedMappings.find(s =>
        s.label.toLowerCase().includes(sheet.toLowerCase().slice(0, 5)) ||
        sheet.toLowerCase().includes(s.label.toLowerCase().slice(0, 5))
      );
      return {
        sheet,
        kvNamespace: suggested?.kvNamespace ?? meta.namespace,
        kvKey: suggested?.kvKey ?? `${meta.namespace}:${sheet.toLowerCase().replace(/\s+/g, '_')}`,
        label: suggested?.label ?? sheet,
      };
    });
    setMappings(auto);
  };

  const saveSource = async () => {
    if (!form.name.trim() || !form.url.trim()) return;
    const name = `[${meta.label}] ${form.name}`;
    const src = await createSyncSource({ name, url: form.url, sheet_mappings: mappings });
    if (src) {
      setSources(prev => [src, ...prev]);
      setCreating(false);
      setForm({ name: '', url: '' });
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
      setSyncResult({ id, msg: `Synced ${(result.stored as unknown[])?.length ?? 0} sheet(s) to ${meta.namespace} namespace`, ok: true });
      getSyncSources().then(all => setSources(all.filter(s =>
        s.sheet_mappings.some(m => m.kvNamespace === meta.namespace) ||
        s.name.toLowerCase().includes(team)
      )));
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
    <div className="space-y-4">
      {/* Privacy banner */}
      <div className="flex items-start gap-3 rounded-xl p-4 border border-blue-100 bg-blue-50">
        <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-blue-800">{meta.label} — Private Data Namespace</p>
          <p className="text-xs text-blue-700 mt-0.5">{meta.description}</p>
          <p className="text-xs text-blue-500 mt-1">
            KV namespace: <code className="bg-blue-100 px-1 rounded">{meta.namespace}</code> — isolated from other teams.
          </p>
        </div>
      </div>

      {/* Microsoft Account Connection */}
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
        msStatus?.connected ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'
      }`}>
        <div className="flex items-start gap-3 min-w-0">
          {msStatus?.connected
            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
            : <AlertCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
          }
          <div className="min-w-0">
            <p className={`text-sm font-semibold ${msStatus?.connected ? 'text-emerald-800' : 'text-amber-800'}`}>
              {msStatus?.connected ? 'Microsoft Account Connected' : 'Microsoft Account Not Connected'}
            </p>
            <p className={`text-xs mt-0.5 ${msStatus?.connected ? 'text-emerald-600' : 'text-amber-600'}`}>
              {msStatus?.connected
                ? 'SharePoint files restricted by your org policy can be synced via Microsoft Graph API.'
                : 'Connect your Microsoft 365 account to sync SharePoint files that require org login (not just "Anyone with link").'}
            </p>
            {msStatus?.connected && msStatus.expiresAt && (
              <p className="text-[10px] text-emerald-500 mt-0.5">
                Token valid until {new Date(msStatus.expiresAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0">
          {msStatus?.connected ? (
            <button
              onClick={disconnectMicrosoft}
              disabled={msDisconnecting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Link2Off className="w-3.5 h-3.5" />
              {msDisconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          ) : (
            <a
              href={`${BASE}/api/microsoft/connect?token=${encodeURIComponent(localStorage.getItem('cactus_access') ?? '')}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white"
              style={{ backgroundColor: '#0078D4' }}
            >
              <Link2 className="w-3.5 h-3.5" />
              Connect Microsoft
            </a>
          )}
        </div>
      </div>

      {/* Add source */}
      {creating ? (
        <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Add SharePoint / OneDrive Source</h3>
            <button onClick={() => setCreating(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Source Name</label>
              <input className={ic} value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder={`e.g. ${meta.label} FY25 Data`} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">SharePoint / OneDrive URL</label>
              <div className="flex gap-2">
                <input className={ic + ' flex-1'} value={form.url}
                  onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                  placeholder="https://yourcompany.sharepoint.com/..." />
                <button onClick={loadPreview} disabled={previewLoading || !form.url}
                  className="px-3 py-2 text-xs font-medium rounded-lg text-white disabled:opacity-50"
                  style={{ backgroundColor: meta.color }}>
                  {previewLoading ? '…' : 'Preview'}
                </button>
              </div>
            </div>
          </div>

          {previewError && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div>{previewError} — make sure the file is shared with "Anyone with link can view"</div>
            </div>
          )}

          {preview && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <p className="text-xs font-semibold text-emerald-700">
                  Found {preview.sheets.length} sheet(s) — all will sync to <strong>{meta.namespace}</strong> namespace
                </p>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Sheet</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Rows</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Maps To</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-gray-600">Namespace</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mappings.map((m, i) => (
                      <tr key={m.sheet}>
                        <td className="px-3 py-2.5 font-medium text-gray-800">{m.sheet}</td>
                        <td className="px-3 py-2.5 text-gray-500">{preview.rowCounts[m.sheet] ?? 0}</td>
                        <td className="px-3 py-2.5">
                          <select className="border border-gray-200 rounded px-2 py-1 text-xs bg-white"
                            value={m.label}
                            onChange={e => {
                              const sug = meta.suggestedMappings.find(s => s.label === e.target.value);
                              setMappings(prev => prev.map((mp, j) => j !== i ? mp : {
                                ...mp, label: e.target.value,
                                kvNamespace: sug?.kvNamespace ?? meta.namespace,
                                kvKey: sug?.kvKey ?? mp.kvKey,
                              }));
                            }}>
                            {meta.suggestedMappings.map(s => <option key={s.label}>{s.label}</option>)}
                            <option value={m.sheet}>Custom: {m.sheet}</option>
                          </select>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-gray-400 text-[10px]"
                            style={{ color: meta.color }}>{meta.namespace}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={saveSource} disabled={!form.name || !form.url || !preview}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white disabled:opacity-50"
              style={{ backgroundColor: meta.color }}>
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
          style={{ backgroundColor: meta.color }}>
          <Plus className="w-4 h-4" /> Add {meta.label} SharePoint Source
        </button>
      )}

      {/* Source list */}
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4">Loading…</p>
      ) : sources.length === 0 ? (
        <div className="text-center py-8 rounded-xl border-2 border-dashed border-gray-200">
          <p className="text-sm text-gray-400">No {meta.label.toLowerCase()} sync sources yet.</p>
          <p className="text-xs text-gray-300 mt-1">Add a SharePoint link above to start syncing your team's data.</p>
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
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => doSync(src.id)} disabled={syncing === src.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-60"
                    style={{ backgroundColor: meta.color }}>
                    <RefreshCw className={`w-3.5 h-3.5 ${syncing === src.id ? 'animate-spin' : ''}`} />
                    {syncing === src.id ? 'Syncing…' : 'Sync Now'}
                  </button>
                  <button onClick={() => removeSource(src.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Team Guide — explains every CSV and where it goes ─────────────── */}
      <hr className="border-gray-100" />
      <TeamGuide team={team as 'finance' | 'portfolio' | 'investment' | 'operations'} />

      {/* ── CSV Template Library ─────────────────────────────────────────────── */}
      <hr className="border-gray-100" />
      <CsvTemplateLibrary team={team as 'finance' | 'portfolio' | 'investment' | 'operations'} />
    </div>
  );
}
