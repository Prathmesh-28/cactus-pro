const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ─── Notes ────────────────────────────────────────────────────────────────────

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = localStorage.getItem('cactus_access');
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

export async function fetchNote(companyId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/notes/${companyId}`, { headers: authHeaders() });
  if (!res.ok) return '';
  const data = await res.json();
  return data.content ?? '';
}

export async function saveNote(companyId: string, content: string): Promise<void> {
  await fetch(`${BASE}/api/notes/${companyId}`, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ content }),
  });
}

// ─── Files ────────────────────────────────────────────────────────────────────

export interface CompanyFile {
  id: number;
  company_id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  uploaded_at: string;
}

export async function fetchFiles(companyId: string): Promise<CompanyFile[]> {
  const res = await fetch(`${BASE}/api/files/${companyId}`, { headers: authHeaders() });
  if (!res.ok) return [];
  return res.json();
}

export async function uploadFile(companyId: string, file: File): Promise<CompanyFile | null> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/api/files/${companyId}`, {
    method: 'POST',
    headers: authHeaders(),
    body: fd,
  });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteFile(fileId: number): Promise<void> {
  await fetch(`${BASE}/api/files/${fileId}`, { method: 'DELETE', headers: authHeaders() });
}

export function fileDownloadUrl(fileId: number): string {
  return `${BASE}/api/files/download/${fileId}`;
}

// ─── KV Store ────────────────────────────────────────────────────────────────

export async function kvGet(namespace: string, key: string): Promise<unknown> {
  try {
    const res = await fetch(`${BASE}/api/kv/${namespace}/${encodeURIComponent(key)}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.value ?? null;
  } catch { return null; }
}

export async function kvSet(namespace: string, key: string, value: unknown): Promise<void> {
  const { markSaving, markSaved, markError } = await import('../hooks/useSaveState');
  markSaving();
  try {
    const res = await fetch(`${BASE}/api/kv/${namespace}/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ value }),
    });
    if (res.ok) markSaved(); else markError();
  } catch { markError(); }
}

export async function kvGetAll(namespace: string): Promise<Record<string, unknown>> {
  try {
    const res = await fetch(`${BASE}/api/kv/${namespace}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return {};
    const data = await res.json();
    return data.data ?? {};
  } catch { return {}; }
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: number;
  user_email: string;
  action: string;
  resource: string | null;
  ip_address: string | null;
  created_at: string;
}

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  try {
    const token = localStorage.getItem('cactus_access');
    const res = await fetch(`${BASE}/api/users/audit`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

// ─── Sync sources ─────────────────────────────────────────────────────────────

export interface SyncSource {
  id: number;
  name: string;
  url: string;
  sheet_mappings: Array<{ sheet: string; kvNamespace: string; kvKey: string; label: string }>;
  last_synced_at: string | null;
  last_sync_status: 'never' | 'success' | 'error';
  last_sync_error: string | null;
}

export async function getSyncSources(): Promise<SyncSource[]> {
  try {
    const res = await fetch(`${BASE}/api/sync/sources`, { headers: authHeaders() });
    if (!res.ok) return [];
    return res.json();
  } catch { return []; }
}

export async function createSyncSource(data: { name: string; url: string; sheet_mappings: unknown[] }): Promise<SyncSource | null> {
  try {
    const res = await fetch(`${BASE}/api/sync/sources`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

export async function updateSyncSource(id: number, data: Partial<SyncSource>): Promise<void> {
  try {
    await fetch(`${BASE}/api/sync/sources/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  } catch {}
}

export async function deleteSyncSource(id: number): Promise<void> {
  try { await fetch(`${BASE}/api/sync/sources/${id}`, { method: 'DELETE' }); } catch {}
}

export async function runSync(sourceId: number): Promise<{ success: boolean; stored?: unknown[]; error?: string }> {
  try {
    const res = await fetch(`${BASE}/api/sync/sources/${sourceId}/run`, { method: 'POST' });
    return res.json();
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function fetchExcelPreview(url: string): Promise<{
  sheets: string[];
  preview: Record<string, unknown[]>;
  rowCounts: Record<string, number>;
  error?: string;
}> {
  try {
    const res = await fetch(`${BASE}/api/sync/fetch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    const data = await res.json();
    if (!res.ok) return { sheets: [], preview: {}, rowCounts: {}, error: data.error };
    return data;
  } catch (e: unknown) {
    return { sheets: [], preview: {}, rowCounts: {}, error: e instanceof Error ? e.message : 'Network error' };
  }
}
