/**
 * Per-company per-tab data-source strip
 * Shows the linked sheet URL for the active drawer tab; admins can add / edit / remove.
 */
import { useState } from 'react';
import { Link2, ExternalLink, Pencil, X, Check, Plus, RefreshCw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { CompanyDrawerTab } from '../../data/types';

interface Props {
  companyId: string;
  tab: CompanyDrawerTab;
  tabLabel: string;   // e.g. "Overview / Sector KPIs"
}

export default function CompanyTabLinkStrip({ companyId, tab, tabLabel }: Props) {
  const { store, upsertCompanyTabLink, deleteCompanyTabLink, canEditPortfolio } = useApp();
  const canEdit = canEditPortfolio();

  const existing = (store.companyTabLinks ?? []).find(
    l => l.companyId === companyId && l.tab === tab,
  );

  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState('');
  const [labelDraft, setLabelDraft] = useState('');

  const openEdit = () => {
    setDraft(existing?.url ?? '');
    setLabelDraft(existing?.label ?? tabLabel);
    setEditing(true);
  };

  const save = () => {
    if (!draft.trim()) return;
    const id = existing?.id ?? `ctl-${companyId}-${tab}-${Date.now()}`;
    upsertCompanyTabLink({
      id,
      companyId,
      tab,
      label: labelDraft.trim() || tabLabel,
      url: draft.trim(),
      syncStatus: 'linked',
    });
    setEditing(false);
  };

  const remove = () => {
    if (existing) deleteCompanyTabLink(existing.id);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="mb-3 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 flex flex-col gap-2">
        <p className="text-[11px] font-semibold text-blue-700 uppercase tracking-wide">Link a sheet to {tabLabel}</p>
        <input
          autoFocus
          value={labelDraft}
          onChange={e => setLabelDraft(e.target.value)}
          placeholder="Label (e.g. Sector KPIs)"
          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/30 bg-white"
        />
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
          placeholder="https://docs.google.com/… or sharepoint.com/…"
          className="w-full text-xs border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400/30 bg-white"
        />
        <div className="flex items-center gap-2">
          <button onClick={save} disabled={!draft.trim()}
            className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-700">
            <Check className="w-3 h-3" /> Save Link
          </button>
          {existing && (
            <button onClick={remove}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100">
              <X className="w-3 h-3" /> Remove
            </button>
          )}
          <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600 ml-auto">Cancel</button>
        </div>
      </div>
    );
  }

  if (existing) {
    return (
      <div className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-xs">
        <RefreshCw className="w-3 h-3 text-emerald-500 shrink-0" />
        <span className="text-emerald-700 font-medium truncate max-w-[120px]">{existing.label}</span>
        <a href={existing.url} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1 text-blue-600 hover:text-blue-800 truncate flex-1 min-w-0">
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate">{existing.url}</span>
        </a>
        {canEdit && (
          <button onClick={openEdit} className="shrink-0 p-1 rounded hover:bg-emerald-100 text-emerald-600">
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  }

  if (!canEdit) return null;

  return (
    <div className="mb-3">
      <button onClick={openEdit}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors">
        <Plus className="w-3 h-3" />
        <Link2 className="w-3 h-3" />
        <span>Link a sheet to {tabLabel}</span>
      </button>
    </div>
  );
}
