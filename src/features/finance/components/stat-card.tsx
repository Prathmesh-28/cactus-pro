import { cn } from "../../../lib/utils";
import { fmtCurrency, fmtPct } from "../lib/format";

export function StatCard({
  label,
  value,
  sub,
  trend,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  trend?: number; // decimal e.g. 0.043
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-5 shadow-[var(--shadow-card)]",
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
      <div className="mt-2 font-serif font-bold text-2xl md:text-[26px] leading-none tabular-nums">{value}</div>
      {(sub || trend !== undefined) && (
        <div className="mt-3 flex items-baseline justify-between gap-2 text-xs">
          {sub && (
            <span className={cn(accent ? "text-primary-foreground/70" : "text-muted-foreground")}>
              {sub}
            </span>
          )}
          {trend !== undefined && (
            <span
              className={cn(
                "font-numeric font-medium",
                trend >= 0
                  ? accent
                    ? "text-[oklch(0.85_0.14_150)]"
                    : "text-success"
                  : "text-destructive",
              )}
            >
              {trend >= 0 ? "▲" : "▼"} {fmtPct(Math.abs(trend))}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export function MoneyStat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return <StatCard label={label} value={fmtCurrency(value, "INR", true)} sub={sub} />;
}
