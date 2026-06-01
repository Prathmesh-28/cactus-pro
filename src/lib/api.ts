const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function fetchNote(companyId: string): Promise<string> {
  const res = await fetch(`${BASE}/api/notes/${companyId}`);
  if (!res.ok) return '';
  const data = await res.json();
  return data.content ?? '';
}

export async function saveNote(companyId: string, content: string): Promise<void> {
  await fetch(`${BASE}/api/notes/${companyId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
  const res = await fetch(`${BASE}/api/files/${companyId}`);
  if (!res.ok) return [];
  return res.json();
}

export async function uploadFile(companyId: string, file: File): Promise<CompanyFile | null> {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`${BASE}/api/files/${companyId}`, { method: 'POST', body: fd });
  if (!res.ok) return null;
  return res.json();
}

export async function deleteFile(fileId: number): Promise<void> {
  await fetch(`${BASE}/api/files/${fileId}`, { method: 'DELETE' });
}

export function fileDownloadUrl(fileId: number): string {
  return `${BASE}/api/files/download/${fileId}`;
}
