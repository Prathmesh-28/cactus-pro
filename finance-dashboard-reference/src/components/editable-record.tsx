import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUpsertRow, type TableName } from "@/lib/data-hooks";
import { useFund } from "@/lib/fund-context";
import { Input } from "@/components/ui/input";
import { fmtCurrency, fmtPct } from "@/lib/format";
import type { ColumnType } from "./editable-table";

export type Field = { key: string; label: string; type: ColumnType };

function fmt(v: unknown, type: ColumnType): string {
  if (v === null || v === undefined || v === "") return "—";
  if (type === "currency") return fmtCurrency(Number(v));
  if (type === "percent") return fmtPct(Number(v));
  if (type === "number") return Number(v).toLocaleString();
  return String(v);
}

function coerce(v: string, type: ColumnType): unknown {
  if (v === "") return null;
  if (type === "number" || type === "currency" || type === "percent") {
    const n = Number(v.replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  return v;
}

export function EditableRecord({
  table,
  fields,
  title,
}: {
  table: TableName;
  fields: Field[];
  title?: string;
}) {
  const { canEdit } = useAuth();
  const { fund } = useFund();
  const upsert = useUpsertRow(table);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const { data: row } = useQuery({
    queryKey: ["table", table, fund, "single"],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").eq("fund", fund).limit(1).maybeSingle();
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
  });

  if (!row) return null;

  async function commit(field: Field) {
    const newVal = coerce(draft, field.type);
    if (newVal !== row?.[field.key]) {
      await upsert.mutateAsync({ id: row?.id as string, [field.key]: newVal });
    }
    setEditing(null);
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-[var(--shadow-card)]">
      {title && <h2 className="text-lg font-serif mb-4">{title}</h2>}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4 text-sm">
        {fields.map((f) => (
          <div key={f.key}>
            <dt className="text-[11px] uppercase tracking-widest text-muted-foreground">{f.label}</dt>
            <dd
              className={`mt-1 font-numeric ${canEdit ? "cursor-text" : ""}`}
              onClick={() => {
                if (!canEdit) return;
                setEditing(f.key);
                const v = row[f.key];
                setDraft(v === null || v === undefined ? "" : String(v));
              }}
            >
              {editing === f.key ? (
                <Input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onBlur={() => commit(f)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commit(f);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  type={f.type === "text" ? "text" : "number"}
                  step="any"
                  className="h-8 text-sm"
                />
              ) : (
                fmt(row[f.key], f.type)
              )}
            </dd>
          </div>
        ))}
      </dl>
      {canEdit && (
        <p className="mt-4 text-[11px] text-muted-foreground">Click any value to edit.</p>
      )}
    </div>
  );
}
