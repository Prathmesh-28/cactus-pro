import { useMemo, useRef, useState } from "react";
import { cn } from "../../../lib/utils";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Pencil, Upload } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import {
  useAuth,
  useFundMetricValues,
  upsertFundMetricValue,
  useDynamicTable,
} from "../lib/store";
import { useFund } from "../lib/fund-context";

type RowType = "fund_metrics" | "cash_flows";

type MetricDef = {
  key: string;
  label: string;
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

function useMetricValues(rowType: RowType) {
  return useFundMetricValues(rowType);
}

export function FundMetricsRows() {
  return (
    <div className="space-y-8">
      <MetricsRow title="Fund Metrics" rowType="fund_metrics" metrics={FUND_METRICS} />
      <CashFlowsFormula />
    </div>
  );
}

function MetricsRow({ title, rowType, metrics }: { title: string; rowType: RowType; metrics: MetricDef[] }) {
  const { canEdit } = useAuth();
  const { data: rows = [] } = useMetricValues(rowType);
  const [period, setPeriod] = useState<string>("Current");
  const fileRef = useRef<HTMLInputElement>(null);
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

  const [uploading, setUploading] = useState(false);

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    file.arrayBuffer().then((buf) => {
      const wb = XLSX.read(buf, { type: "array" });
      let count = 0;
      const allPeriods: string[] = [];
      for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName];
        if (!ws) continue;
        const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", blankrows: false });
        for (const raw of json) {
          if (!Array.isArray(raw) || raw.length < 2) continue;
          const labelCell = String(raw[0] ?? "").trim().toLowerCase();
          if (!labelCell) continue;
          const match = metrics.find((m) =>
            m.aliases.some((a) => a === labelCell) || m.label.toLowerCase() === labelCell,
          );
          if (!match) continue;
          const valRaw = raw[1];
          const n = valRaw === "" || valRaw === null || valRaw === undefined
            ? null
            : Number(String(valRaw).replace(/[$,%\s,]/g, ""));
          upsertFundMetricValue(fund, rowType, sheetName, match.key, Number.isFinite(n as number) ? (n as number) : null);
          count++;
          if (!allPeriods.includes(sheetName)) allPeriods.push(sheetName);
        }
      }
      if (count === 0) toast.error("No matching metric rows found in the uploaded file.");
      else {
        toast.success(`Imported ${count} values across ${allPeriods.length} sheet(s)`);
        if (allPeriods[0] && !periods.includes(allPeriods[0])) setPeriod(allPeriods[0]);
      }
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }).catch((err) => { toast.error(err.message); setUploading(false); });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-baseline gap-2">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">{title}</div>
          <span className="text-[11px] text-muted-foreground font-medium">(Amounts in INR Cr)</span>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="h-8 w-[160px] text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {periods.map((p) => <SelectItem key={p} value={p} className="text-xs">{p}</SelectItem>)}
            </SelectContent>
          </Select>
          {canEdit && (
            <>
              <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUpload} />
              <Button variant="outline" size="sm" className="h-8" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <Upload className="size-3.5 mr-1" />
                {uploading ? "Uploading…" : "Upload Excel"}
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">
        {metrics.map((m) => (
          <MetricCard key={m.key} metric={m} period={period} rowType={rowType} value={valueFor(m.key)} />
        ))}
      </div>
    </section>
  );
}

function MetricCard({ metric, period, rowType, value }: { metric: MetricDef; period: string; rowType: RowType; value: number | null }) {
  const { canEdit } = useAuth();
  const { fund } = useFund();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const display =
    value === null || value === undefined ? "—"
      : metric.type === "percent" ? `${Number(value).toLocaleString()}%`
      : metric.type === "number" ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 4 })
      : (Number(value) / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  async function commit() {
    const n = draft === "" ? null : Number(draft.replace(/,/g, ""));
    const next = n === null || Number.isFinite(n) ? n : null;
    if (next !== value) upsertFundMetricValue(fund, rowType, period, metric.key, next);
    setEditing(false);
  }

  return (
    <div className="relative group rounded-lg border border-transparent bg-[image:var(--gradient-primary)] text-primary-foreground p-5 shadow-[var(--shadow-card)]">
      <div className="text-[11px] uppercase tracking-widest text-primary-foreground/70">{metric.label}</div>
      {editing && canEdit ? (
        <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
          onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          type="number" step="any" className="mt-2 h-9 font-numeric text-foreground" />
      ) : (
        <div className={cn("mt-2 font-serif font-bold text-2xl md:text-[26px] leading-none tabular-nums", canEdit && "cursor-text")}
          onClick={() => { if (!canEdit) return; setDraft(value === null || value === undefined ? "" : String(value)); setEditing(true); }}>
          {display}
        </div>
      )}
      {canEdit && !editing && <Pencil className="size-3 absolute top-3 right-3 opacity-0 group-hover:opacity-60 transition text-primary-foreground" />}
    </div>
  );
}

/* ── Cash Flows formula ─────────────────────────────────────────────────── */

function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(String(v).replace(/[₹$,%\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function fyKeyToYear(keyOrLabel: string): number | null {
  const s = String(keyOrLabel).trim().toLowerCase();
  const m = s.match(/^fy\s*(\d{2}|\d{4})$/) ?? s.match(/^(\d{4})$/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return n < 100 ? 2000 + n : n;
}

type DynCol = { key: string; label: string; type?: string };

function isTotalRow(columns: DynCol[], r: Record<string, unknown>): boolean {
  const firstText = columns.find((c) => (c.type ?? "text") === "text") ?? columns[0];
  if (!firstText) return false;
  const v = r[firstText.key];
  return typeof v === "string" && /^\s*total\b/i.test(v);
}

function totalFundLife(columns: DynCol[] | undefined, rows: Record<string, unknown>[] | undefined): number {
  if (!columns || !rows) return 0;
  const yearCols = columns.filter((c) => fyKeyToYear(c.key) !== null || fyKeyToYear(c.label) !== null);
  let total = 0;
  for (const r of rows) {
    if (isTotalRow(columns, r)) continue;
    for (const c of yearCols) total += num(r[c.key]);
  }
  return total;
}

function nextSixMonths(columns: DynCol[] | undefined, rows: Record<string, unknown>[] | undefined, today: Date): number {
  if (!columns || !rows) return 0;
  const yearMap = new Map<number, string>();
  for (const c of columns) {
    const y = fyKeyToYear(c.key) ?? fyKeyToYear(c.label);
    if (y !== null && !yearMap.has(y)) yearMap.set(y, c.key);
  }
  if (yearMap.size === 0) return 0;
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
    for (const r of rows) { if (isTotalRow(columns, r)) continue; sum += num(r[colKey]); }
    total += sum * (months / 12);
  }
  return total;
}

function useExpensesAggregate() {
  const { data: fundExp } = useDynamicTable("et:fund_expenses");
  const { data: imExp } = useDynamicTable("et:im_expenses");
  return useMemo(() => {
    const today = new Date();
    const fundLife = totalFundLife(fundExp?.columns, fundExp?.rows) + totalFundLife(imExp?.columns, imExp?.rows);
    const sixMonths = nextSixMonths(fundExp?.columns, fundExp?.rows, today) + nextSixMonths(imExp?.columns, imExp?.rows, today);
    return { fundLife, sixMonths };
  }, [fundExp, imExp]);
}

function CashFlowsFormula() {
  const { data: rows = [] } = useMetricValues("cash_flows");
  const period = "Current";
  const valueFor = (k: string): number | null => rows.find((x) => x.period === period && x.metric_key === k)?.value ?? null;
  const calledCapital = valueFor("called_capital");
  const bankBalance = valueFor("bank_balance");
  const uncalledCapital = valueFor("uncalled_capital");
  const { fundLife, sixMonths } = useExpensesAggregate();
  const currentInvestible = (calledCapital ?? 0) + (bankBalance ?? 0) - sixMonths;
  const investibleFundLevel = (calledCapital ?? 0) + (bankBalance ?? 0) + (uncalledCapital ?? 0) - fundLife;

  return (
    <section className="space-y-3">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">Cash Flows</div>
      <FormulaRow>
        <FormulaCard label="Called Capital" period={period} metricKey="called_capital" value={calledCapital} />
        <Op>+</Op>
        <FormulaCard label="Bank Balance" period={period} metricKey="bank_balance" value={bankBalance} />
        <Op>−</Op>
        <FormulaCard label="Expenses for Next 6 Months" value={sixMonths} readOnly />
        <Op>=</Op>
        <FormulaCard label="Current Investible Funds" value={currentInvestible} readOnly />
      </FormulaRow>
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
    <div className="flex items-center justify-center font-bold select-none"
      style={{ color: "#2D6A4F", fontSize: compact ? "20px" : "28px", minWidth: compact ? "14px" : "20px" }}
      aria-hidden="true">
      {children}
    </div>
  );
}

function FormulaCard({ label, value, period, metricKey, readOnly = false, compact = false }:
  { label: string; value: number | null; period?: string; metricKey?: string; readOnly?: boolean; highlight?: boolean; compact?: boolean }) {
  const { canEdit } = useAuth();
  const { fund } = useFund();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const editable = !readOnly && canEdit && !!metricKey && !!period;

  const display = value === null || value === undefined ? "—"
    : (Number(value) / 1e7).toLocaleString("en-IN", { maximumFractionDigits: 2 });

  async function commit() {
    if (!metricKey || !period) return;
    const n = draft === "" ? null : Number(draft.replace(/,/g, ""));
    const next = n === null || Number.isFinite(n) ? n : null;
    if (next !== value) upsertFundMetricValue(fund, "cash_flows", period, metricKey, next);
    setEditing(false);
  }

  return (
    <div className={cn(
      "relative group rounded-lg border border-transparent bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-card)] flex-1",
      compact ? "p-3 min-w-[110px]" : "p-5 min-w-[180px]",
    )}>
      <div className={cn("uppercase tracking-widest font-semibold text-primary-foreground/70", compact ? "text-[9px] leading-tight" : "text-[11px]")}>
        {label}
      </div>
      {editing && editable ? (
        <Input autoFocus value={draft} onChange={(e) => setDraft(e.target.value)}
          onBlur={commit} onKeyDown={(e) => { if (e.key === "Enter") commit(); if (e.key === "Escape") setEditing(false); }}
          type="number" step="any" className="mt-2 h-8 font-numeric text-foreground" />
      ) : (
        <div className={cn("font-serif font-bold leading-none tabular-nums",
          compact ? "mt-1.5 text-base md:text-lg" : "mt-2 text-2xl md:text-[26px]",
          editable && "cursor-text")}
          onClick={() => { if (!editable) return; setDraft(value === null || value === undefined ? "" : String(value)); setEditing(true); }}>
          {display}
        </div>
      )}
      {editable && !editing && <Pencil className="size-3 absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition text-primary-foreground" />}
    </div>
  );
}
