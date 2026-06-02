import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useTable } from "@/lib/data-hooks";

type FundExpenseRow = {
  id: string;
  category: string;
  fy23?: number | null;
  fy24?: number | null;
  fy25?: number | null;
  fy26?: number | null;
  fy27?: number | null;
  fy28?: number | null;
  fy29?: number | null;
  fy30?: number | null;
  fy31?: number | null;
};

const FY_KEYS = ["fy23", "fy24", "fy25", "fy26", "fy27", "fy28", "fy29", "fy30", "fy31"] as const;

const PALETTE = [
  "hsl(212, 75%, 50%)",
  "hsl(150, 60%, 45%)",
  "hsl(28, 85%, 55%)",
  "hsl(280, 60%, 55%)",
  "hsl(0, 70%, 55%)",
  "hsl(190, 70%, 45%)",
  "hsl(45, 90%, 50%)",
  "hsl(320, 60%, 55%)",
  "hsl(100, 55%, 45%)",
  "hsl(240, 60%, 60%)",
  "hsl(15, 75%, 50%)",
  "hsl(170, 60%, 40%)",
];

export function FundExpensesChart() {
  const { data: rows = [], isLoading } = useTable<FundExpenseRow>("fund_expenses");

  const { data, categories } = useMemo(() => {
    const cats = rows
      .map((r) => r.category || "Uncategorized")
      .filter((c, i, a) => a.indexOf(c) === i);
    const data = FY_KEYS.map((fy) => {
      const point: Record<string, number | string> = { fy: fy.toUpperCase() };
      for (const r of rows) {
        const key = r.category || "Uncategorized";
        const val = Number(r[fy] ?? 0);
        point[key] = (Number(point[key] ?? 0)) + val;
      }
      return point;
    });
    return { data, categories: cats };
  }, [rows]);

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-card)]">
      <h3 className="text-lg font-serif uppercase tracking-wide mb-4">Expenses – Fund Level</h3>
      {isLoading ? (
        <div className="h-80 grid place-items-center text-sm text-muted-foreground">Loading…</div>
      ) : categories.length === 0 ? (
        <div className="h-80 grid place-items-center text-sm text-muted-foreground">
          No fund expense data yet.
        </div>
      ) : (
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="fy" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => Number(v).toLocaleString()} />
              <Tooltip
                formatter={(v: number) => Number(v).toLocaleString()}
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {categories.map((cat, i) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  stackId="fund"
                  fill={PALETTE[i % PALETTE.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
