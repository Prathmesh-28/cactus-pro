import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getActiveFund, useFund } from "@/lib/fund-context";
import { bumpSectionTimestamps, type SectionKey } from "@/lib/data-hooks";

export type DynColType = "text" | "number" | "date";

export type DynColumn = {
  key: string;
  label: string;
  type: DynColType;
};

export type DynRow = Record<string, unknown> & { id: string };

export type DynamicShape = {
  table_key: string;
  columns: DynColumn[];
  rows: DynRow[];
  updated_at?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const dyn = (): any => supabase.from("dynamic_tables" as never);

/** Scope a logical key to the active fund so Fund 1 and Fund 2 are independent. */
function scoped(key: string, fund?: string): string {
  const f = fund ?? getActiveFund();
  return `${f}::${key}`;
}

function genId() {
  return (typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now()}`);
}

export function useDynamicTable(tableKey: string) {
  const { fund } = useFund();
  const fullKey = scoped(tableKey, fund);
  return useQuery<DynamicShape | null>({
    queryKey: ["dyn", fullKey],
    queryFn: async () => {
      const { data, error } = await dyn()
        .select("table_key, columns, rows, updated_at")
        .eq("table_key", fullKey)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        table_key: tableKey,
        columns: (data.columns ?? []) as DynColumn[],
        rows: (data.rows ?? []) as DynRow[],
        updated_at: data.updated_at as string | null,
      };
    },
  });
}

export function useDynamicTablesByPrefix(prefix: string) {
  const { fund } = useFund();
  const fullPrefix = scoped(prefix, fund);
  return useQuery<DynamicShape[]>({
    queryKey: ["dyn-prefix", fullPrefix],
    queryFn: async () => {
      const { data, error } = await dyn()
        .select("table_key, columns, rows, updated_at")
        .like("table_key", `${fullPrefix}%`);
      if (error) throw error;
      return (data ?? []).map((d: { table_key: string; columns: unknown; rows: unknown; updated_at: string | null }) => ({
        // Strip fund prefix so callers see the original logical key.
        table_key: d.table_key.startsWith(`${fund}::`) ? d.table_key.slice(`${fund}::`.length) : d.table_key,
        columns: (d.columns ?? []) as DynColumn[],
        rows: (d.rows ?? []) as DynRow[],
        updated_at: d.updated_at,
      }));
    },
  });
}

async function uid() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export function useReplaceDynamicTable(section?: SectionKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: { tableKey: string; columns: DynColumn[]; rows: DynRow[] }) => {
      const user_id = await uid();
      const full = scoped(v.tableKey);
      const { error } = await dyn().upsert(
        {
          table_key: full,
          columns: v.columns,
          rows: v.rows,
          updated_by: user_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "table_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dyn"] });
      qc.invalidateQueries({ queryKey: ["dyn-prefix"] });
      if (section) void bumpSectionTimestamps([section]);
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });
}

export function useDeleteDynamicTable(section?: SectionKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (tableKey: string) => {
      const { error } = await dyn().delete().eq("table_key", scoped(tableKey));
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dyn"] });
      qc.invalidateQueries({ queryKey: ["dyn-prefix"] });
      if (section) void bumpSectionTimestamps([section]);
    },
    onError: (e: Error) => toast.error(`Delete failed: ${e.message}`),
  });
}

/** Mutate a single cell / insert / delete row in place. */
export function useMutateDynamicTable(section?: SectionKey) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (v: {
      tableKey: string;
      columns: DynColumn[];
      rows: DynRow[];
    }) => {
      const user_id = await uid();
      const full = scoped(v.tableKey);
      const { error } = await dyn().upsert(
        {
          table_key: full,
          columns: v.columns,
          rows: v.rows,
          updated_by: user_id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "table_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dyn"] });
      qc.invalidateQueries({ queryKey: ["dyn-prefix"] });
      if (section) void bumpSectionTimestamps([section]);
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });
}

/** Build columns + rows from a 2-D array (first row = headers). */
export function buildShapeFromAOA(aoa: unknown[][]): { columns: DynColumn[]; rows: DynRow[] } {
  if (!aoa.length) return { columns: [], rows: [] };
  const headerRow = aoa[0].map((h, i) => {
    const label = String(h ?? "").trim() || `Column ${i + 1}`;
    return label;
  });
  // Deduplicate keys
  const seen = new Map<string, number>();
  const columns: DynColumn[] = headerRow.map((label) => {
    const base = label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "col";
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    const key = n === 1 ? base : `${base}_${n}`;
    return { key, label, type: "text" as DynColType };
  });

  const dataRows = aoa.slice(1);
  // Infer numeric columns: all non-empty cells parse as numbers
  columns.forEach((col, i) => {
    let hasAny = false;
    let allNumeric = true;
    for (const r of dataRows) {
      const v = r[i];
      if (v === "" || v === null || v === undefined) continue;
      hasAny = true;
      const n = Number(String(v).replace(/[₹$,%\s]/g, ""));
      if (!Number.isFinite(n)) {
        allNumeric = false;
        break;
      }
    }
    if (hasAny && allNumeric) col.type = "number";
  });

  const rows: DynRow[] = dataRows
    .map((r) => {
      const row: DynRow = { id: genId() };
      let anyVal = false;
      columns.forEach((col, i) => {
        const raw = r[i];
        if (raw === "" || raw === null || raw === undefined) {
          row[col.key] = null;
          return;
        }
        anyVal = true;
        if (col.type === "number") {
          const n = Number(String(raw).replace(/[₹$,%\s]/g, ""));
          row[col.key] = Number.isFinite(n) ? n : null;
        } else {
          row[col.key] = raw;
        }
      });
      return anyVal ? row : null;
    })
    .filter((r): r is DynRow => r !== null);

  return { columns, rows };
}

export function newDynRow(columns: DynColumn[]): DynRow {
  const row: DynRow = { id: genId() };
  columns.forEach((c) => {
    row[c.key] = c.type === "text" ? "" : null;
  });
  return row;
}

export function formatDynCell(v: unknown, type: DynColType): string {
  if (v === null || v === undefined || v === "") return "—";
  if (type === "number") {
    const n = Number(v);
    if (!Number.isFinite(n)) return String(v);
    // All numeric amounts are displayed in INR Crores (1 Cr = 10,000,000).
    return (n / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }
  return String(v);
}

export function coerceDynValue(value: string, type: DynColType): unknown {
  if (value === "") return null;
  if (type === "number") {
    const n = Number(value.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return value;
}
