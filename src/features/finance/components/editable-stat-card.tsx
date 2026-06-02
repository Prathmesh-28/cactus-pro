import { useState } from "react";
import { cn } from "../../../lib/utils";
import { fmtCurrency } from "../lib/format";
import { Input } from "./ui/input";
import { useAuth } from "../lib/store";
import { useUpsertRow, bumpSectionTimestamps, type TableName, type SectionKey } from "../lib/store";
import { Pencil } from "lucide-react";

export function EditableStatCard({
  label,
  value,
  rowId,
  field,
  table,
  type = "currency",
  accent,
  sub,
  extraSections,
}: {
  label: string;
  value: number | null | undefined;
  rowId: string | undefined;
  field: string;
  table: TableName;
  type?: "currency" | "number" | "percent";
  accent?: boolean;
  sub?: string;
  extraSections?: SectionKey[];
}) {
  const { canEdit } = useAuth();
  const upsert = useUpsertRow(table);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const display =
    value === null || value === undefined
      ? "—"
      : type === "currency"
        ? fmtCurrency(Number(value), "INR", true)
        : type === "percent"
          ? `${Number(value).toLocaleString()}%`
          : Number(value).toLocaleString();

  async function commit() {
    if (!rowId) {
      setEditing(false);
      return;
    }
    const n = draft === "" ? null : Number(draft.replace(/,/g, ""));
    const next = n === null || Number.isFinite(n) ? n : null;
    if (next !== value) {
      await upsert.mutateAsync({ id: rowId, [field]: next });
      if (extraSections && extraSections.length > 0) {
        await bumpSectionTimestamps(extraSections);
      }
    }
    setEditing(false);
  }

  return (
    <div
      className={cn(
        "relative group rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-card)]",
        accent && "bg-[image:var(--gradient-primary)] text-primary-foreground border-transparent",
      )}
    >
      <div
        className={cn(
          "text-[11px] uppercase tracking-widest",
          accent ? "text-primary-foreground/70" : "text-muted-foreground",
        )}
      >
        {label}
      </div>
      {editing && canEdit ? (
        <Input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          type="number"
          step="any"
          className="mt-2 h-9 font-numeric"
        />
      ) : (
        <div
          className={cn(
            "mt-2 font-serif font-bold text-2xl md:text-[26px] leading-none tabular-nums",
            canEdit && "cursor-text",
          )}
          onClick={() => {
            if (!canEdit) return;
            setDraft(value === null || value === undefined ? "" : String(value));
            setEditing(true);
          }}
        >
          {display}
        </div>
      )}
      {sub && (
        <div className={cn("mt-3 text-xs", accent ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {sub}
        </div>
      )}
      {canEdit && !editing && (
        <Pencil
          className={cn(
            "size-3 absolute top-3 right-3 opacity-0 group-hover:opacity-60 transition",
            accent ? "text-primary-foreground" : "text-muted-foreground",
          )}
        />
      )}
    </div>
  );
}
