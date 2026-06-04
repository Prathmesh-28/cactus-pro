/**
 * CsvTemplateLibrary — shows all CSV templates for a team with download buttons.
 * Used in TeamSyncPanel, Admin Data Sync, and Portfolio Admin.
 */
import { useState } from 'react';
import { Download, FileSpreadsheet, ChevronDown, ChevronUp, Info } from 'lucide-react';
import {
  CSV_TEMPLATES, downloadCsvTemplate, downloadAllTeamTemplates,
  type CsvTemplate,
} from '../../lib/csvTemplates';

const TEAM_COLORS: Record<string, string> = {
  finance:    '#1C4B42',
  portfolio:  '#7C3AED',
  investment: '#0891B2',
  operations: '#D97706',
  global:     '#6B7280',
};

function TemplateRow({ t }: { t: CsvTemplate }) {
  const [open, setOpen] = useState(false);
  const color = TEAM_COLORS[t.team] ?? '#6B7280';

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer"
        onClick={() => setOpen(o => !o)}>
        <FileSpreadsheet size={15} style={{ color }} className="shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-800">{t.label}</p>
          <p className="text-xs text-gray-500 truncate">{t.description}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 hidden sm:inline">
            {t.headers.length} columns
          </span>
          <button
            onClick={e => { e.stopPropagation(); downloadCsvTemplate(t); }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: color }}
          >
            <Download size={12} />
            Download
          </button>
          {open ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100 space-y-3">
          {/* Notes */}
          {t.notes && (
            <div className="flex items-start gap-2 mt-3 bg-blue-50 border border-blue-100 rounded-lg p-2.5">
              <Info size={13} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700">{t.notes}</p>
            </div>
          )}

          {/* SharePoint mapping */}
          <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
            <span>Sheet name: <strong className="text-gray-700">{t.sheetName}</strong></span>
            <span>·</span>
            <span>Maps to KV key: <code className="bg-gray-200 px-1.5 py-0.5 rounded text-gray-700">{t.kvKey}</code></span>
          </div>

          {/* Column headers */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Columns ({t.headers.length})</p>
            <div className="flex flex-wrap gap-1">
              {t.headers.map(h => (
                <span key={h} className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 bg-white text-gray-600">{h}</span>
              ))}
            </div>
          </div>

          {/* Preview rows */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Example Rows</p>
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="text-[10px] w-full">
                <thead>
                  <tr style={{ backgroundColor: color + '18' }}>
                    {t.headers.map(h => (
                      <th key={h} className="px-2 py-1.5 text-left font-semibold whitespace-nowrap" style={{ color }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {t.exampleRows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate">
                          {cell || <span className="text-gray-300">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface Props {
  team: 'finance' | 'portfolio' | 'investment' | 'operations' | 'all';
  compact?: boolean;
}

export default function CsvTemplateLibrary({ team, compact = false }: Props) {
  const templates = team === 'all'
    ? CSV_TEMPLATES
    : CSV_TEMPLATES.filter(t => t.team === team || t.team === 'global');

  const color = team === 'all' ? '#1C4B42' : (TEAM_COLORS[team] ?? '#1C4B42');

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-gray-900">CSV Templates</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Download → Fill → Upload to SharePoint → Sync via Data Sync above
          </p>
        </div>
        <button
          onClick={() => team === 'all' ? CSV_TEMPLATES.forEach((t, i) => setTimeout(() => downloadCsvTemplate(t), i * 300)) : downloadAllTeamTemplates(team)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: color }}
        >
          <Download size={13} />
          Download All ({templates.length})
        </button>
      </div>

      {/* How it works */}
      {!compact && (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">How to use these templates:</p>
          <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
            <li>Download the CSV template for the data you want to add</li>
            <li>Fill in your data (keep column headers exactly as is)</li>
            <li>Upload to your SharePoint / OneDrive folder</li>
            <li>In <strong>Data Sync</strong> above → Add SharePoint Source → paste the file link</li>
            <li>Map the sheet name to the correct destination → Sync Now</li>
          </ol>
        </div>
      )}

      {/* Template list */}
      <div className="space-y-2">
        {templates.map(t => (
          <TemplateRow key={t.id} t={t} />
        ))}
      </div>
    </div>
  );
}
