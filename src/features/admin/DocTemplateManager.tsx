import { useState } from 'react';
import { Pencil, Trash2, Plus, X, Check, FileText, Link2, ExternalLink, Save } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { DocTemplate, DocTemplateCategory, DocTemplateFrequency, CompanyDocLink, PortfolioCompany } from '../../data/types';

// ─── Constants ────────────────────────────────────────────────────────────────
const CATEGORIES: DocTemplateCategory[] = ['governance', 'financial', 'legal', 'operational', 'fundraise', 'compliance', 'other'];
const FREQUENCIES: DocTemplateFrequency[] = ['monthly', 'quarterly', 'annual', 'one_time', 'ad_hoc'];

const CATEGORY_COLORS: Record<DocTemplateCategory, string> = {
  governance:  '#1C4B42',
  financial:   '#185FA5',
  legal:       '#7C3AED',
  operational: '#0891B2',
  fundraise:   '#B45309',
  compliance:  '#DC2626',
  other:       '#6B7280',
};

const FREQ_LABELS: Record<DocTemplateFrequency, string> = {
  monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual', one_time: 'One-time', ad_hoc: 'Ad hoc',
};

const SYNC_STATUSES: CompanyDocLink['syncStatus'][] = ['linked', 'pending', 'broken'];
const SYNC_COLORS: Record<CompanyDocLink['syncStatus'], string> = {
  linked: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', broken: 'bg-red-100 text-red-600',
};

const EMPTY: Omit<DocTemplate, 'id' | 'sortOrder' | 'createdAt'> = {
  name: '', category: 'governance', description: '', frequency: 'quarterly', required: true,
};

const inputCls = 'border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-cactus-accent/30';

function CategoryChip({ category }: { category: DocTemplateCategory }) {
  const c = CATEGORY_COLORS[category];
  return (
    <span className="text-[11px] px-2 py-0.5 rounded-full font-medium capitalize" style={{ backgroundColor: c + '18', color: c }}>
      {category}
    </span>
  );
}

// ─── SharePoint link row (top-level component — per-row draft state) ──────────
function LinkRow({
  template, company, link, onSave, onUnlink,
}: {
  template: DocTemplate;
  company: PortfolioCompany;
  link?: CompanyDocLink;
  onSave: (url: string, status: CompanyDocLink['syncStatus']) => void;
  onUnlink: () => void;
}) {
  const [url, setUrl] = useState(link?.url ?? '');
  const [status, setStatus] = useState<CompanyDocLink['syncStatus']>(link?.syncStatus ?? 'pending');

  const placeholder = `https://cactuspartners.sharepoint.com/sites/Portfolio/${company.name.replace(/\s+/g, '')}/${template.name.replace(/\s+/g, '')}`;
  const dirty = url.trim() !== (link?.url ?? '') || status !== (link?.syncStatus ?? 'pending');

  const handleUnlink = () => {
    if (!window.confirm(`Remove the ${template.name} link for ${company.name}?`)) return;
    onUnlink();
    setUrl('');
    setStatus('pending');
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
      <div className="w-44 flex items-center gap-1.5 min-w-0">
        <span className="text-sm font-medium text-gray-800 truncate">{template.name}</span>
        {template.required && <span className="text-[10px] text-amber-500 font-semibold" title="Required template">*</span>}
      </div>
      <input
        className={inputCls + ' flex-1 min-w-48 text-xs font-mono'}
        placeholder={placeholder}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      <select
        className={inputCls + ' text-xs bg-white'}
        value={status}
        onChange={(e) => setStatus(e.target.value as CompanyDocLink['syncStatus'])}
      >
        {SYNC_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
      </select>
      {link && (
        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${SYNC_COLORS[link.syncStatus]}`}>
          {link.syncStatus}
        </span>
      )}
      {link?.url && (
        <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-600" title="Open in SharePoint">
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
      <button
        onClick={() => onSave(url.trim(), status)}
        disabled={!url.trim() || !dirty}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Save className="w-3.5 h-3.5" /> Save
      </button>
      {link ? (
        <button onClick={handleUnlink} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500" title="Unlink">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <span className="w-[26px]" />
      )}
    </div>
  );
}

// ─── Main manager ─────────────────────────────────────────────────────────────
export default function DocTemplateManager() {
  const { store, addDocTemplate, updateDocTemplate, deleteDocTemplate, upsertCompanyDocLink, deleteCompanyDocLink } = useApp();
  const [editing, setEditing] = useState<DocTemplate | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<DocTemplate, 'id' | 'sortOrder' | 'createdAt'>>(EMPTY);

  const templates = [...(store.docTemplates ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const links = store.companyDocLinks ?? [];
  const companies = [...(store.companies ?? [])].sort((a, b) => a.name.localeCompare(b.name));

  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(companies[0]?.id ?? '');
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const companyLinks = links.filter((l) => l.companyId === selectedCompanyId);

  const requiredTemplates = templates.filter((t) => t.required);
  const linkedRequired = requiredTemplates.filter((t) => companyLinks.some((l) => l.templateId === t.id && l.url));

  const startCreate = () => { setForm(EMPTY); setCreating(true); setEditing(null); };
  const startEdit = (t: DocTemplate) => {
    setEditing(t);
    setForm({ name: t.name, category: t.category, description: t.description, frequency: t.frequency, required: t.required });
    setCreating(false);
  };
  const cancel = () => { setEditing(null); setCreating(false); };

  const save = () => {
    if (!form.name.trim()) return;
    if (creating) {
      const maxSort = templates.reduce((m, t) => Math.max(m, t.sortOrder), 0);
      addDocTemplate({ id: generateId(), ...form, sortOrder: maxSort + 1, createdAt: new Date().toISOString().slice(0, 10) });
    } else if (editing) {
      updateDocTemplate({ ...editing, ...form });
    }
    cancel();
  };

  const handleDelete = (t: DocTemplate) => {
    const n = links.filter((l) => l.templateId === t.id).length;
    if (window.confirm(`Delete template "${t.name}"?${n ? ` This also removes ${n} company SharePoint link${n > 1 ? 's' : ''}.` : ''}`)) {
      deleteDocTemplate(t.id);
    }
  };

  const saveLink = (template: DocTemplate, url: string, syncStatus: CompanyDocLink['syncStatus']) => {
    if (!selectedCompanyId || !url) return;
    const existing = companyLinks.find((l) => l.templateId === template.id);
    upsertCompanyDocLink({
      id: existing?.id ?? generateId(),
      companyId: selectedCompanyId,
      templateId: template.id,
      url,
      syncStatus,
      lastSyncedAt: syncStatus === 'linked' ? new Date().toISOString() : existing?.lastSyncedAt,
    });
  };

  // Inlined to avoid inner-component remount on every keystroke (kills focus)
  const formRow = (
    <div className="flex flex-wrap items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <input
        autoFocus
        className={inputCls + ' flex-1 min-w-40'}
        placeholder="Template name"
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
      />
      <select
        className={inputCls + ' bg-white capitalize'}
        value={form.category}
        onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as DocTemplateCategory }))}
      >
        {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
      </select>
      <select
        className={inputCls + ' bg-white'}
        value={form.frequency}
        onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value as DocTemplateFrequency }))}
      >
        {FREQUENCIES.map((fr) => <option key={fr} value={fr}>{FREQ_LABELS[fr]}</option>)}
      </select>
      <input
        className={inputCls + ' flex-[2] min-w-56'}
        placeholder="Description"
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
      />
      <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={form.required}
          onChange={(e) => setForm((f) => ({ ...f, required: e.target.checked }))}
          className="rounded border-gray-300"
        />
        Required
      </label>
      <button onClick={save} className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600">
        <Check className="w-4 h-4" />
      </button>
      <button onClick={cancel} className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300">
        <X className="w-4 h-4" />
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* ── Section 1: Document Templates ─────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: store.firm.primaryColor }} />
            <p className="text-sm font-semibold text-gray-800">Document Templates</p>
            <span className="text-xs text-gray-400">{templates.length} templates · {requiredTemplates.length} required</span>
          </div>
          <button
            onClick={startCreate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg text-white"
            style={{ backgroundColor: store.firm.primaryColor }}
          >
            <Plus className="w-4 h-4" />
            Add Template
          </button>
        </div>

        {creating && formRow}

        <div className="rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Frequency</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Required</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Description</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {templates.length === 0 && (
                <tr><td colSpan={6} className="p-6 text-center text-sm text-gray-400">No document templates yet.</td></tr>
              )}
              {templates.map((t) => (
                editing?.id === t.id ? (
                  <tr key={t.id}>
                    <td colSpan={6} className="p-2">{formRow}</td>
                  </tr>
                ) : (
                  <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                    <td className="px-4 py-3"><CategoryChip category={t.category} /></td>
                    <td className="px-4 py-3 text-xs text-gray-500">{FREQ_LABELS[t.frequency]}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => updateDocTemplate({ ...t, required: !t.required })}
                        title="Click to toggle"
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold transition-colors ${
                          t.required
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {t.required ? 'Required' : 'Optional'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate" title={t.description}>{t.description}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => startEdit(t)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(t)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Section 2: Company SharePoint Links ───────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4" style={{ color: store.firm.primaryColor }} />
            <p className="text-sm font-semibold text-gray-800">Company SharePoint Links</p>
          </div>
          <select
            className={inputCls + ' bg-white min-w-48'}
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {selectedCompany ? (
          <>
            <p className="text-xs text-gray-500">
              <span className="font-semibold" style={{ color: store.firm.primaryColor }}>
                {linkedRequired.length} of {requiredTemplates.length}
              </span>{' '}
              required templates linked for {selectedCompany.name} · {companyLinks.length} total links
            </p>

            <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100">
              {templates.length === 0 ? (
                <p className="p-6 text-center text-sm text-gray-400">Add a document template above to start linking.</p>
              ) : (
                templates.map((t) => {
                  const link = companyLinks.find((l) => l.templateId === t.id);
                  return (
                    <LinkRow
                      key={`${selectedCompany.id}-${t.id}`}
                      template={t}
                      company={selectedCompany}
                      link={link}
                      onSave={(url, status) => saveLink(t, url, status)}
                      onUnlink={() => { if (link) deleteCompanyDocLink(link.id); }}
                    />
                  );
                })
              )}
            </div>
            <p className="text-[11px] text-gray-400">* required template · Paste the SharePoint folder/file URL and click Save. The greyed placeholder shows the suggested path convention.</p>
          </>
        ) : (
          <p className="p-6 text-center text-sm text-gray-400">No companies in the portfolio yet.</p>
        )}
      </div>
    </div>
  );
}
