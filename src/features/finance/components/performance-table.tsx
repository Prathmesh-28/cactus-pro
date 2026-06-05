import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useAuth } from "../lib/store";
import {
  buildShapeFromAOA,
  coerceDynValue,
  formatDynCell,
  newDynRow,
  useDynamicTable,
  useDynamicTablesByPrefix,
  useMutateDynamicTable,
  useReplaceDynamicTable,
  useDeleteDynamicTable,
  type DynColumn,
  type DynRow,
} from "../lib/store";
import { extractXlsxImages, isImageDataUrl } from "../lib/xlsx-images";
import { toast } from "sonner";

const PM_PREFIX = "pm:";
const INDEX_KEY = "pm:__index__";

// The index entry stores the ordered sheet list in `rows`:
// rows = [{ id, name }]. Its `columns` are ignored.

export function PerformanceTable() {
  const { canEdit } = useAuth();
  const { data: idx } = useDynamicTable(INDEX_KEY);
  const { data: allSheets = [] } = useDynamicTablesByPrefix(PM_PREFIX);
  const replace = useReplaceDynamicTable("fund_overview");
  const mutate = useMutateDynamicTable("fund_overview");
  const del = useDeleteDynamicTable("fund_overview");
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<{ id: string; key: string } | null>(null);
  const [draft, setDraft] = useState("");

  // Build ordered list of sheet names from index; fall back to discovered keys.
  const sheetNames = useMemo(() => {
    const fromIndex = (idx?.rows ?? [])
      .map((r) => String(r.name ?? "").trim())
      .filter(Boolean);
    if (fromIndex.length > 0) return fromIndex;
    return allSheets
      .filter((s) => s.table_key !== INDEX_KEY && s.table_key.startsWith(PM_PREFIX))
      .map((s) => s.table_key.slice(PM_PREFIX.length))
      .sort();
  }, [idx, allSheets]);

  const [sheet, setSheet] = useState<string>("");
  useEffect(() => {
    if (sheetNames.length === 0) {
      if (sheet !== "") setSheet("");
      return;
    }
    if (!sheetNames.includes(sheet)) setSheet(sheetNames[0]);
  }, [sheetNames, sheet]);

  const currentKey = sheet ? `${PM_PREFIX}${sheet}` : "";
  const current = allSheets.find((s) => s.table_key === currentKey) ?? null;
  const dynColumns: DynColumn[] = current?.columns ?? [];
  const dynRows: DynRow[] = current?.rows ?? [];

  async function persist(next: { columns: DynColumn[]; rows: DynRow[] }) {
    if (!currentKey) return;
    await mutate.mutateAsync({ tableKey: currentKey, columns: next.columns, rows: next.rows });
  }

  function startEdit(row: DynRow, k: string) {
    if (!canEdit) return;
    setEditing({ id: row.id, key: k });
    const v = row[k];
    setDraft(v === null || v === undefined ? "" : String(v));
  }

  async function commitEdit(row: DynRow, col: DynColumn) {
    if (!editing) return;
    const newValue = coerceDynValue(draft, col.type);
    if (newValue !== row[col.key]) {
      const nextRows = dynRows.map((r) => (r.id === row.id ? { ...r, [col.key]: newValue } : r));
      await persist({ columns: dynColumns, rows: nextRows });
    }
    setEditing(null);
  }

  function exportXlsx() {
    if (!current) return;
    const aoa = [
      dynColumns.map((c) => c.label),
      ...dynRows.map((r) => dynColumns.map((c) => r[c.key] ?? "")),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet || "Data");
    XLSX.writeFile(wb, `performance-${sheet || "data"}.xlsx`);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      const wb = isCSV
        ? XLSX.read(await file.text(), { type: 'string' })
        : XLSX.read(await file.arrayBuffer(), { type: 'array' });
      // Extract any embedded images keyed by sheet + (row,col).
      let imagesBySheet = new Map<string, Map<string, string>>();
      try {
        imagesBySheet = await extractXlsxImages(file);
      } catch {
        // Non-fatal — proceed without images.
      }
      const matched: { name: string; columns: DynColumn[]; rows: DynRow[] }[] = [];
      for (const sheetName of wb.SheetNames) {
        const name = sheetName.trim();
        if (!name) continue;
        const ws = wb.Sheets[sheetName];
        const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];

        // Inject image data URLs into their anchor cells (only if cell is empty).
        const imgs = imagesBySheet.get(name);
        if (imgs) {
          for (const [k, url] of imgs) {
            const [r, c] = k.split(",").map(Number);
            while (aoa.length <= r) aoa.push([]);
            const row = aoa[r] as unknown[];
            while (row.length <= c) row.push("");
            if (row[c] === "" || row[c] === null || row[c] === undefined) row[c] = url;
          }
        }

        const shape = buildShapeFromAOA(aoa);
        if (shape.columns.length === 0) continue;
        matched.push({ name, ...shape });
      }
      if (matched.length === 0) {
        toast.error("Workbook has no usable sheets.");
        return;
      }
      const summary = matched.map((m) => `${m.name} (${m.rows.length})`).join(", ");
      if (!confirm(`Replace performance data with sheets: ${summary}?`)) return;

      // Delete existing pm:* entries
      for (const s of allSheets) {
        await del.mutateAsync(s.table_key);
      }
      // Write each sheet
      for (const m of matched) {
        await replace.mutateAsync({
          tableKey: `${PM_PREFIX}${m.name}`,
          columns: m.columns,
          rows: m.rows,
        });
      }
      // Write index
      await replace.mutateAsync({
        tableKey: INDEX_KEY,
        columns: [{ key: "name", label: "Sheet", type: "text" }],
        rows: matched.map((m, i) => ({ id: `s_${i}`, name: m.name })),
      });
      setSheet(matched[0].name);
      toast.success(`Imported ${matched.length} sheet(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function addRow() {
    if (!current || dynColumns.length === 0) return;
    const blank = newDynRow(dynColumns);
    await persist({ columns: dynColumns, rows: [...dynRows, blank] });
  }

  async function delRow(id: string) {
    if (!confirm("Delete this row?")) return;
    await persist({ columns: dynColumns, rows: dynRows.filter((r) => r.id !== id) });
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 border-b border-border">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-serif uppercase tracking-wide">Portfolio Snapshot</h2>
          {sheetNames.length > 0 && (
            <Select value={sheet} onValueChange={setSheet}>
              <SelectTrigger className="h-8 min-w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sheetNames.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={onImport} />
            <Button variant="outline" size="sm" onClick={exportXlsx} disabled={!current}>
              <Download className="size-3.5 mr-1" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-3.5 mr-1" /> Upload Excel
            </Button>
            <Button size="sm" onClick={addRow} disabled={dynColumns.length === 0}>
              <Plus className="size-3.5 mr-1" /> Add row
            </Button>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {dynColumns.map((c) => (
                <TableHead key={c.key}>{c.label}</TableHead>
              ))}
              {canEdit && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {dynRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={Math.max(dynColumns.length, 1) + 1} className="text-center text-sm text-muted-foreground py-8">
                  {sheetNames.length === 0
                    ? canEdit ? "No data yet. Upload an Excel file." : "No data."
                    : `No rows for "${sheet}".`}
                </TableCell>
              </TableRow>
            )}
            {dynRows.map((row) => (
              <TableRow key={row.id}>
                {dynColumns.map((col) => {
                  const isEditing = editing?.id === row.id && editing?.key === col.key;
                  return (
                    <TableCell
                      key={col.key}
                      className={canEdit ? "cursor-text" : ""}
                      onClick={() => !isEditing && startEdit(row, col.key)}
                    >
                      {isEditing ? (
                        <Input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => commitEdit(row, col)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitEdit(row, col);
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="h-8 text-sm"
                          type={col.type === "number" ? "number" : col.type === "date" ? "date" : "text"}
                          step="any"
                        />
                      ) : isImageDataUrl(row[col.key]) ? (
                        <img
                          src={row[col.key] as string}
                          alt=""
                          className="max-h-16 max-w-[120px] object-contain rounded"
                          loading="lazy"
                        />
                      ) : (
                        <span className={col.type === "number" ? "font-numeric" : ""}>
                          {(() => {
                            const isRaw = /\b(moic|irr)\b/i.test(col.label);
                            if (isRaw && col.type === "number") {
                              const v = row[col.key];
                              if (v === null || v === undefined || v === "") return "—";
                              const n = Number(v);
                              return Number.isFinite(n)
                                ? n.toLocaleString("en-IN", { maximumFractionDigits: 2 })
                                : String(v);
                            }
                            return formatDynCell(row[col.key], col.type);
                          })()}
                        </span>
                      )}
                    </TableCell>
                  );
                })}
                {canEdit && (
                  <TableCell>
                    <button
                      onClick={() => delRow(row.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete row"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
