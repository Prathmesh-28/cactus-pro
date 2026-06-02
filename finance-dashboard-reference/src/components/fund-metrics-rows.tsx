import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useFund, getActiveFund } from "@/lib/fund-context";

import { bumpSectionTimestamps } from "@/lib/data-hooks";
import { useDynamicTable } from "@/lib/dynamic-tables";

type RowType = "fund_metrics" | "cash_flows";

type MetricDef = {
  key: string;
  label: string;
  /** Aliases (lowercased) matched against the first column of uploaded sheets. */
  aliases: string[];
  type?: "currency" | "percent" | "number";
};

const FUND_METRICS: MetricDef[] = [
  { key: "called_capital", label: "Called Capital", aliases: ["called capital"] },
  { key: "nav", label: "NAV", aliases: ["nav", "net asset value"] },
  { key: "tvpi", label: "TVPI", aliases: ["tvpi"], type: "number" },
  { key: "gross_irr", label: "Gross IRR", aliases: ["gross irr"], type: "percent" },
  { key: "net_irr", label: "Net IRR", aliases: ["net irr"], type: "percent" },
  { key: "dpi", label: "DPI", aliases: ["dpi"], type: "number" },
  { key: "moic", label: "MOIC", aliases: ["moic"], type: "number" },
];

type MetricRow = {
  id: string;
  fund: string;
  row_type: string;
  period: string;
  metric_key: string;
  value: number | null;
};

// Typed table reference (types.ts may not yet include the new table in some sessions).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fmvTable = () => (supabase as any).from("fund_metric_values");

function useMetricValues(rowType: RowType) {
  const { fund } = useFund();
  return useQuery({
    queryKey: ["fund_metric_values", rowType, fund],
    queryFn: async () => {
      const { data, error } = await fmvTable()
        .select("*")
        .eq("fund", fund)
        .eq("row_type", rowType);
      if (error) throw error;
      return (data ?? []) as MetricRow[];
    },
  });
}

export function FundMetricsRows() {
  return (
    <div className="space-y-8">
      <MetricsRow title="Fund Metrics" rowType="fund_metrics" metrics={FUND_METRICS} />
      <CashFlowsFormula />
    </div>
  );
}

function MetricsRow({
  title,
  rowType,
  metrics,
}: {
  title: string;
  rowType: RowType;
  metrics: MetricDef[];
}) {
  const { canEdit } = useAuth();
  const { data: rows = [] } = useMetricValues(rowType);
  const [period, setPeriod] = useState<string>("Current");
  const fileRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { fund } = useFund();

  const periods = useMemo(() => {
    const set = new Set<string>(["Current"]);
    for (const r of rows) set.add(r.period);
    return Array.from(set);
  }, [rows]);

  const valueFor = (metricKey: string): number | null => {
    const r = rows.find((x) => x.period === period && x.metric_key === metricKey);
    return r?.value ?? null;
  };

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const payload: Array<{
        fund: string;
        row_type: RowType;
        period: string;
        metric_key: string;
        value: number | null;
      }> = [];

      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;
        const json = XLSX.utils.sheet_to_json<unknown[]>(ws, {
          header: 1,
          defval: "",
          blankrows: false,
        });
        for (const raw of json) {
          if (!Array.isArray(raw) || raw.length < 2) continue;
          const labelCell = String(raw[0] ?? "").trim().toLowerCase();
          if (!labelCell) continue;
          const match = metrics.find((m) =>
            m.aliases.some((a) => a === labelCell) || m.label.toLowerCase() === labelCell,
          );
          if (!match) continue;
          const valRaw = raw[1];
          const n =
            valRaw === "" || valRaw === null || valRaw === undefined
              ? null
              : Number(String(valRaw).replace(/[$,%\s,]/g, ""));
          payload.push({
            fund,
            row_type: rowType,
            period: sheetName,
            metric_key: match.key,
            value: Number.isFinite(n as number) ? (n as number) : null,
          });
        }
      }

      if (payload.length === 0) {
        throw new Error("No matching metric rows found in the uploaded file.");
      }

      const { data: u } = await supabase.auth.getUser();
      const stamped = payload.map((p) => ({ ...p, updated_by: u.user?.id ?? null }));
      const { error } = await fmvTable().upsert(stamped, {
        onConflict: "fund,row_type,period,metric_key",
      });
      if (error) throw error;
      return payload;
    },
    onSuccess: (payload) => {
      const sheets = Array.from(new Set(payload.map((p) => p.period)));
      toast.success(`Imported ${payload.length} values across ${sheets.length} sheet(s)`);
      qc.invalidateQueries({ queryKey: ["fund_metric_values", rowType, fund] });
      void bumpSectionTimestamps(["fund_overview"]);
      if (sheets[0] && !periods.includes(sheets[0])) setPeriod(sheets[0]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-2">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
            {title}
          </div>
          <span className="text-[11px] text-muted-foreground font-medium">
            (Amounts in INR Cr)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {periods.map((p) => (
                <SelectItem key={p} value={p} className="text-xs">
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) upload.mutate(f);
                  e.target.value = "";
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                onClick={() => fileRef.current?.click()}
                disabled={upload.isPending}
              >
                <Upload className="size-3.5 mr-1" />
                {upload.isPending ? "Uploading…" : "Upload Excel"}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {metrics.map((m) => (
          <MetricCard
            key={m.key}
            metric={m}
            period={period}
            rowType={rowType}
            value={valueFor(m.key)}
          />
        ))}
      </div>
    </section>
  );
}

function MetricCard({
  metric,
  period,
  rowType,
  value,
}: {
  metric: MetricDef;
  period: string;
  rowType: RowType;
  value: number | null;
}) {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const display =
    value === null || value === undefined
      ? "—"
      : metric.type === "percent"
        ? `${Number(value).toLocaleString()}%`
        : metric.type === "number"
          ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })
          : (Number(value) / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const save = useMutation({
    mutationFn: async (next: number | null) => {
      const { data: u } = await supabase.auth.getUser();
      const fund = getActiveFund();
      const { error } = await fmvTable().upsert(
        {
          fund,
          row_type: rowType,
          period,
          metric_key: metric.key,
          value: next,
          updated_by: u.user?.id ?? null,
        },
        { onConflict: "fund,row_type,period,metric_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fund_metric_values", rowType, getActiveFund()] });
      void bumpSectionTimestamps(["fund_overview"]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function commit() {
    const n = draft === "" ? null : Number(draft.replace(/,/g, ""));
    const next = n === null || Number.isFinite(n) ? n : null;
    if (next !== value) {
      await save.mutateAsync(next);
    }
    setEditing(false);
  }

  return (
    <div className="relative group rounded-lg border border-transparent bg-[image:var(--gradient-primary)] text-primary-foreground p-5 shadow-[var(--shadow-card)]">
      <div className="text-[11px] uppercase tracking-widest text-primary-foreground/70">
        {metric.label}
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
          className="mt-2 h-9 font-numeric text-foreground"
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
      {canEdit && !editing && (
        <Pencil className="size-3 absolute top-3 right-3 opacity-0 group-hover:opacity-60 transition text-primary-foreground" />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cash Flows — formula layout                                         */
/* ------------------------------------------------------------------ */

/** Return numeric value of cell, ignoring commas / currency / % signs. */
function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/[₹$,%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

/** Match column keys / labels like FY23, fy 24, "FY 25", "FY2026", or bare years. */
function fyKeyToYear(keyOrLabel: string): number | null {
  const s = String(keyOrLabel).trim().toLowerCase();
  const m = s.match(/^fy\s*(\d{2}|\d{4})$/) ?? s.match(/^(\d{4})$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return n < 100 ? 2000 + n : n;
}

type DynCol = { key: string; label: string; type?: string };

/** True if a row's first text column starts with "total" — those are footers, not expenses. */
function isTotalRow(columns: DynCol[], r: Record<string, unknown>): boolean {
  const firstText = columns.find((c) => (c.type ?? "text") === "text") ?? columns[0];
  if (!firstText) return false;
  const v = r[firstText.key];
  return typeof v === "string" && /^\s*total\b/i.test(v);
}

/** Sum every numeric cell across all year columns of one dynamic table (excluding Total row). */
function totalFundLife(
  columns: DynCol[] | undefined,
  rows: Record<string, unknown>[] | undefined,
): number {
  if (!columns || !rows) return 0;
  const yearCols = columns.filter((c) => fyKeyToYear(c.key) !== null || fyKeyToYear(c.label) !== null);
  let total = 0;
  for (const r of rows) {
    if (isTotalRow(columns, r)) continue;
    for (const c of yearCols) total += num(r[c.key]);
  }
  return total;
}

/** Pro-rate next 6 calendar months across the matching CALENDAR-YEAR columns. */
function nextSixMonths(
  columns: DynCol[] | undefined,
  rows: Record<string, unknown>[] | undefined,
  today: Date,
): number {
  if (!columns || !rows) return 0;
  // Map calendar year → column key (FY26 / 2026 both mean year 2026).
  const yearMap = new Map<number, string>();
  for (const c of columns) {
    const y = fyKeyToYear(c.key) ?? fyKeyToYear(c.label);
    if (y !== null && !yearMap.has(y)) yearMap.set(y, c.key);
  }
  if (yearMap.size === 0) return 0;

  // Count months per calendar year across the next 6 months (starting the month AFTER today).
  const monthsPerYear = new Map<number, number>();
  const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  for (let i = 0; i < 6; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    monthsPerYear.set(d.getFullYear(), (monthsPerYear.get(d.getFullYear()) ?? 0) + 1);
  }

  let total = 0;
  for (const [yr, months] of monthsPerYear) {
    const colKey = yearMap.get(yr);
    if (!colKey) continue;
    let sum = 0;
    for (const r of rows) {
      if (isTotalRow(columns, r)) continue;
      sum += num(r[colKey]);
    }
    total += sum * (months / 12);
  }
  return total;
}

function useExpensesAggregate() {
  const { data: fundExp } = useDynamicTable("et:fund_expenses");
  const { data: imExp } = useDynamicTable("et:im_expenses");
  return useMemo(() => {
    const today = new Date();
    const fundLife =
      totalFundLife(fundExp?.columns, fundExp?.rows) +
      totalFundLife(imExp?.columns, imExp?.rows);
    const sixMonths =
      nextSixMonths(fundExp?.columns, fundExp?.rows, today) +
      nextSixMonths(imExp?.columns, imExp?.rows, today);
    return { fundLife, sixMonths };
  }, [fundExp, imExp]);
}

function CashFlowsFormula() {
  const { data: rows = [] } = useMetricValues("cash_flows");
  const period = "Current";

  const valueFor = (k: string): number | null =>
    rows.find((x) => x.period === period && x.metric_key === k)?.value ?? null;

  const calledCapital = valueFor("called_capital");
  const bankBalance = valueFor("bank_balance");
  const uncalledCapital = valueFor("uncalled_capital");

  const { fundLife, sixMonths } = useExpensesAggregate();

  const currentInvestible =
    (calledCapital ?? 0) + (bankBalance ?? 0) - sixMonths;
  const investibleFundLevel =
    (calledCapital ?? 0) + (bankBalance ?? 0) + (uncalledCapital ?? 0) - fundLife;

  return (
    <section className="space-y-3">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
        Cash Flows
      </div>

      {/* Row 1 */}
      <FormulaRow>
        <FormulaCard label="Called Capital" period={period} metricKey="called_capital" value={calledCapital} />
        <Op>+</Op>
        <FormulaCard label="Bank Balance" period={period} metricKey="bank_balance" value={bankBalance} />
        <Op>−</Op>
        <FormulaCard label="Expenses for Next 6 Months" value={sixMonths} readOnly />
        <Op>=</Op>
        <FormulaCard label="Current Investible Funds" value={currentInvestible} readOnly />
      </FormulaRow>

      {/* Row 2 — compact, single line */}
      <FormulaRow compact>
        <FormulaCard label="Called Capital" period={period} metricKey="called_capital" value={calledCapital} compact />
        <Op compact>+</Op>
        <FormulaCard label="Bank Balance" period={period} metricKey="bank_balance" value={bankBalance} compact />
        <Op compact>+</Op>
        <FormulaCard label="Uncalled Capital" period={period} metricKey="uncalled_capital" value={uncalledCapital} compact />
        <Op compact>−</Op>
        <FormulaCard label="Expenses for Fund Life" value={fundLife} readOnly compact />
        <Op compact>=</Op>
        <FormulaCard label="Investible Funds at Fund Level" value={investibleFundLevel} readOnly compact />
      </FormulaRow>
    </section>
  );
}

function FormulaRow({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div className={cn("flex items-stretch gap-2", compact ? "flex-nowrap overflow-x-auto" : "flex-wrap gap-3")}>
      {children}
    </div>
  );
}

function Op({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <div
      className="flex items-center justify-center font-bold select-none"
      style={{
        color: "#3B6D11",
        fontSize: compact ? "20px" : "28px",
        minWidth: compact ? "14px" : "20px",
      }}
      aria-hidden="true"
    >
      {children}
    </div>
  );
}

function FormulaCard({
  label,
  value,
  period,
  metricKey,
  readOnly = false,
  compact = false,
}: {
  label: string;
  value: number | null;
  period?: string;
  metricKey?: string;
  readOnly?: boolean;
  /** Highlight prop kept for backwards compatibility but no longer affects styling. */
  highlight?: boolean;
  compact?: boolean;
}) {
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const editable = !readOnly && canEdit && !!metricKey && !!period;

  const display =
    value === null || value === undefined
      ? "—"
      : (Number(value) / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  const save = useMutation({
    mutationFn: async (next: number | null) => {
      if (!metricKey || !period) return;
      const { data: u } = await supabase.auth.getUser();
      const fund = getActiveFund();
      const { error } = await fmvTable().upsert(
        {
          fund,
          row_type: "cash_flows",
          period,
          metric_key: metricKey,
          value: next,
          updated_by: u.user?.id ?? null,
        },
        { onConflict: "fund,row_type,period,metric_key" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fund_metric_values", "cash_flows", getActiveFund()] });
      void bumpSectionTimestamps(["fund_overview"]);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function commit() {
    const n = draft === "" ? null : Number(draft.replace(/,/g, ""));
    const next = n === null || Number.isFinite(n) ? n : null;
    if (next !== value) await save.mutateAsync(next);
    setEditing(false);
  }

  return (
    <div
      className={cn(
        "relative group rounded-lg border border-transparent bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-card)] flex-1",
        compact ? "p-3 min-w-[110px]" : "p-5 min-w-[180px]",
      )}
    >
      <div
        className={cn(
          "uppercase tracking-widest font-semibold text-primary-foreground/70",
          compact ? "text-[9px] leading-tight" : "text-[11px]",
        )}
      >
        {label}
      </div>
      {editing && editable ? (
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
          className="mt-2 h-8 font-numeric text-foreground"
        />
      ) : (
        <div
          className={cn(
            "font-serif font-bold leading-none tabular-nums",
            compact ? "mt-1.5 text-base md:text-lg" : "mt-2 text-2xl md:text-[26px]",
            editable && "cursor-text",
          )}
          onClick={() => {
            if (!editable) return;
            setDraft(value === null || value === undefined ? "" : String(value));
            setEditing(true);
          }}
        >
          {display}
        </div>
      )}
      {editable && !editing && (
        <Pencil className="size-3 absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition text-primary-foreground" />
      )}
    </div>
  );
}
