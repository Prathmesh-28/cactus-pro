import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, FileSpreadsheet, Plus, Trash2, Upload } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { useAuth } from "../lib/store";
import { sectionsForTable, type TableName } from "../lib/store";
import {
  buildShapeFromAOA,
  coerceDynValue,
  formatDynCell,
  newDynRow,
  useDynamicTable,
  useMutateDynamicTable,
  useReplaceDynamicTable,
  type DynColType,
  type DynColumn,
  type DynRow,
} from "../lib/store";
import { toast } from "sonner";

// Legacy column shape kept for callers — only `label`/`type` are used as the
// seed schema before any Excel has been uploaded.
export type ColumnType = "text" | "number" | "currency" | "percent" | "date";
export type Column = {
  key: string;
  label: string;
  type: ColumnType;
  width?: string;
  compute?: (r: Record<string, unknown> & { id: string }) => number | string | null;
};

function legacyTypeToDyn(t: ColumnType): DynColType {
  if (t === "text") return "text";
  if (t === "date") return "date";
  return "number";
}

function seedShape(columns: Column[]): { columns: DynColumn[]; rows: DynRow[] } {
  return {
    columns: columns
      .filter((c) => !c.compute)
      .map((c) => ({ key: c.key, label: c.label, type: legacyTypeToDyn(c.type) })),
    rows: [],
  };
}

export function EditableTable({
  title,
  table,
  columns,
  centerHeaders = false,
  tableKey,
}: {
  title: string;
  table: TableName;
  columns: Column[];
  /** Legacy props kept for backwards compatibility (ignored in dynamic mode). */
  orderBy?: string;
  defaults?: Record<string, unknown>;
  computedColumns?: { key: string; label: string; type: ColumnType }[];
  centerHeaders?: boolean;
  /** Override dynamic storage key. Defaults to `et:${table}`. */
  tableKey?: string;
}) {
  const { canEdit } = useAuth();
  const key = tableKey ?? `et:${table}`;
  const section = sectionsForTable(table)[0];
  const { data: stored } = useDynamicTable(key);
  const isLoading = false;
  const replace = useReplaceDynamicTable(section);
  const mutate = useMutateDynamicTable(section);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<{ id: string; key: string } | null>(null);
  const [draft, setDraft] = useState<string>("");

  const shape = stored ?? seedShape(columns);
  const dynColumns = shape.columns;
  const dynRows = shape.rows;

  async function persist(next: { columns: DynColumn[]; rows: DynRow[] }) {
    await mutate.mutateAsync({ tableKey: key, columns: next.columns, rows: next.rows });
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
    const aoa = [
      dynColumns.map((c) => c.label),
      ...dynRows.map((r) => dynColumns.map((c) => r[c.key] ?? "")),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${table}.xlsx`);
  }

  function templateXlsx() {
    const aoa = [dynColumns.map((c) => c.label), dynColumns.map(() => "")];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${table}-template.xlsx`);
  }

  async function onImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      if (!ws) throw new Error("Empty workbook");
      const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
      const next = buildShapeFromAOA(aoa as unknown[][]);
      if (next.columns.length === 0) {
        toast.error("No columns found in file");
        return;
      }
      const ok = confirm(
        `Replace table with ${next.rows.length} row(s) × ${next.columns.length} column(s) from "${file.name}"?`,
      );
      if (!ok) return;
      await replace.mutateAsync({ tableKey: key, columns: next.columns, rows: next.rows });
      toast.success(`Loaded ${next.rows.length} row(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function addRow() {
    const blank = newDynRow(dynColumns);
    await persist({ columns: dynColumns, rows: [...dynRows, blank] });
  }

  async function delRow(id: string) {
    if (!confirm("Delete this row?")) return;
    await persist({ columns: dynColumns, rows: dynRows.filter((r) => r.id !== id) });
  }

  return (
    <div className="rounded-lg border border-border bg-card shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 border-b border-border">
        <h2 className="text-lg font-serif uppercase tracking-wide">{title}</h2>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={onImport} />
            <Button variant="outline" size="sm" onClick={exportXlsx} disabled={dynColumns.length === 0}>
              <Download className="size-3.5 mr-1" /> Export
            </Button>
            <Button variant="outline" size="sm" onClick={templateXlsx} disabled={dynColumns.length === 0}>
              <FileSpreadsheet className="size-3.5 mr-1" /> Template
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
                <TableHead
                  key={c.key}
                  className={centerHeaders ? "text-center" : undefined}
                >
                  {c.label}
                </TableHead>
              ))}
              {canEdit && <TableHead className="w-12" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={dynColumns.length + 1} className="text-center text-sm text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!isLoading && dynRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={Math.max(dynColumns.length, 1) + 1} className="text-center text-sm text-muted-foreground py-8">
                  No rows yet. {canEdit && "Upload an Excel file or click 'Add row'."}
                </TableCell>
              </TableRow>
            )}
            {dynRows.map((row) => {
              const firstTextCol = dynColumns.find((c) => c.type === "text") ?? dynColumns[0];
              const firstVal = firstTextCol ? row[firstTextCol.key] : null;
              const isTotal =
                typeof firstVal === "string" && /^\s*total\b/i.test(firstVal);
              return (
              <TableRow
                key={row.id}
                className={
                  isTotal
                    ? "border-y-2 border-y-black font-bold [&>td]:border-y-2 [&>td]:border-y-black [&>td:first-child]:border-l-2 [&>td:first-child]:border-l-black [&>td:last-child]:border-r-2 [&>td:last-child]:border-r-black"
                    : undefined
                }
              >
                {dynColumns.map((col) => {
                  const alignClass = centerHeaders ? "text-center" : "";
                  const isEditing = editing?.id === row.id && editing?.key === col.key;
                  return (
                    <TableCell
                      key={col.key}
                      className={`${canEdit ? "cursor-text" : ""} ${alignClass} ${isTotal ? "font-bold" : ""}`.trim()}
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
                          className={`h-8 text-sm ${centerHeaders ? "text-center" : ""}`.trim()}
                          type={col.type === "date" ? "date" : col.type === "number" ? "number" : "text"}
                          step="any"
                        />
                      ) : (
                        <span className={col.type === "number" ? "font-numeric" : ""}>
                          {formatDynCell(row[col.key], col.type)}
                        </span>
                      )}
                    </TableCell>
                  );
                })}
                {canEdit && (
                  <TableCell className={isTotal ? "border-y-2 border-y-black" : undefined}>
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
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
