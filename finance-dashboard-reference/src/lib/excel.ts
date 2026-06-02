import * as XLSX from "xlsx";

export type ExcelColumn = {
  key: string;
  label: string;
  type?: "text" | "number" | "currency" | "percent" | "date";
};

export function downloadXlsx(filename: string, rows: Record<string, unknown>[], columns?: ExcelColumn[]) {
  const data = columns
    ? rows.map((r) => Object.fromEntries(columns.map((c) => [c.label, r[c.key] ?? ""])))
    : rows;
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, filename);
}

export function downloadXlsxTemplate(filename: string, columns: ExcelColumn[], sample?: Record<string, unknown>) {
  const empty = Object.fromEntries(columns.map((c) => [c.label, sample?.[c.key] ?? ""]));
  const ws = XLSX.utils.json_to_sheet([empty]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Template");
  XLSX.writeFile(wb, filename);
}

/**
 * Parse an .xlsx/.xls file. Maps headers (first row) back to column keys.
 * Coerces numeric / currency / percent columns to numbers.
 */
export async function parseXlsx(file: File, columns: ExcelColumn[]): Promise<Record<string, unknown>[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) throw new Error("Empty workbook");
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const labelToKey = new Map(columns.map((c) => [c.label.toLowerCase().trim(), c]));

  return json
    .map((raw) => {
      const out: Record<string, unknown> = {};
      for (const [hdr, val] of Object.entries(raw)) {
        const col = labelToKey.get(String(hdr).toLowerCase().trim());
        if (!col) continue;
        if (val === "" || val === null || val === undefined) {
          out[col.key] = null;
          continue;
        }
        if (col.type === "number" || col.type === "currency" || col.type === "percent") {
          const n = Number(String(val).replace(/[$,%\s]/g, ""));
          out[col.key] = Number.isFinite(n) ? n : null;
        } else {
          out[col.key] = val;
        }
      }
      return out;
    })
    .filter((r) => Object.values(r).some((v) => v !== null && v !== ""));
}
