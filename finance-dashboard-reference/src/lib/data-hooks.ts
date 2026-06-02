import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { snapshotAll } from "@/lib/snapshots";
import { getActiveFund, useFund } from "@/lib/fund-context";

export type TableName =
  | "fund_overview"
  | "fund_performance_metrics"
  | "fund_expenses"
  | "im_expenses"
  | "fund_expenses_actual"
  | "im_expenses_actual"
  | "req_rows"
  | "req_investors"
  | "req_cells"
  | "bank_accounts"
  | "pipeline_investments"
  | "work_updates";

const TABLE_LABELS: Record<TableName, string> = {
  fund_overview: "Fund Overview",
  fund_performance_metrics: "Performance Metrics",
  fund_expenses: "Fund Expenses",
  im_expenses: "IM Expenses",
  fund_expenses_actual: "Fund Expenses (Actual)",
  im_expenses_actual: "IM Expenses (Actual)",
  req_rows: "Investor Requirements",
  req_investors: "Investors",
  req_cells: "Requirement Cells",
  bank_accounts: "Bank Accounts",
  pipeline_investments: "Pipeline Investments",
  work_updates: "Work Updates",
};

export type SectionKey =
  | "fund_overview"
  | "expenses"
  | "investors"
  | "available_balances"
  | "work_updates";

// Each table belongs to exactly ONE section so edits never bump another section's timestamp.
const TABLE_SECTIONS: Record<TableName, SectionKey[]> = {
  fund_overview: ["fund_overview"],
  fund_performance_metrics: ["fund_overview"],
  fund_expenses: ["expenses"],
  im_expenses: ["expenses"],
  fund_expenses_actual: ["expenses"],
  im_expenses_actual: ["expenses"],
  req_rows: ["investors"],
  req_investors: ["investors"],
  req_cells: ["investors"],
  bank_accounts: ["available_balances"],
  pipeline_investments: ["available_balances"],
  work_updates: ["work_updates"],
};

export function sectionsForTable(table: TableName): SectionKey[] {
  return TABLE_SECTIONS[table] ?? [];
}

async function bumpSections(table: TableName) {
  const sections = TABLE_SECTIONS[table] ?? [];
  await bumpSectionTimestamps(sections);
}

export async function bumpSectionTimestamps(sections: SectionKey[]) {
  if (sections.length === 0) return;
  const { data: u } = await supabase.auth.getUser();
  const now = new Date().toISOString();
  const fund = getActiveFund();
  await supabase
    .from("section_timestamps")
    .upsert(
      sections.map((s) => ({ section: s, fund, updated_at: now, updated_by: u.user?.id ?? null })),
      { onConflict: "section,fund" },
    );
}

export function useSectionTimestamp(section: SectionKey) {
  const qc = useQueryClient();
  const { fund } = useFund();
  const query = useQuery({
    queryKey: ["section_timestamps", section, fund],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("section_timestamps")
        .select("updated_at")
        .eq("section", section)
        .eq("fund", fund)
        .maybeSingle();
      if (error) throw error;
      return (data?.updated_at as string | undefined) ?? null;
    },
  });

  useEffect(() => {
    const ch = supabase
      .channel(`section_timestamps_${section}_${fund}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "section_timestamps", filter: `section=eq.${section}` },
        () => qc.invalidateQueries({ queryKey: ["section_timestamps", section, fund] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [section, fund, qc]);

  return query.data ?? null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (name: TableName): any => supabase.from(name as never);

export function useTable<T = Record<string, unknown>>(table: TableName, orderBy?: string) {
  const { fund } = useFund();
  return useQuery({
    queryKey: ["table", table, fund],
    queryFn: async () => {
      let q = tbl(table).select("*").eq("fund", fund);
      if (orderBy) q = q.order(orderBy, { ascending: true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

async function uid() {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

function takeSnapshot(table: TableName, action: string) {
  void snapshotAll(`${action} ${TABLE_LABELS[table]} · ${new Date().toLocaleString()}`);
}

function invalidateTable(qc: ReturnType<typeof useQueryClient>, table: TableName) {
  qc.invalidateQueries({ queryKey: ["table", table] });
}

export function useUpsertRow(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      // Existing rows already carry their fund; new rows get the active fund.
      const payload: Record<string, unknown> = { ...row, updated_by: await uid() };
      if (!("fund" in payload) && !("id" in payload)) payload.fund = getActiveFund();
      const { error } = await tbl(table).upsert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTable(qc, table);
      takeSnapshot(table, "Edited"); void bumpSections(table);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useInsertRow(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await tbl(table).insert({
        ...row,
        fund: getActiveFund(),
        updated_by: await uid(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTable(qc, table);
      takeSnapshot(table, "Added to"); void bumpSections(table);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteRow(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Safety: scope delete to current fund so a stale id from the other
      // fund can never wipe foreign data.
      const { error } = await tbl(table).delete().eq("id", id).eq("fund", getActiveFund());
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateTable(qc, table);
      takeSnapshot(table, "Removed from"); void bumpSections(table);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useBulkUpsert(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Record<string, unknown>[]) => {
      const u = await uid();
      const f = getActiveFund();
      const { error } = await tbl(table).upsert(
        rows.map((r) => ({ fund: f, ...r, updated_by: u, ...(("fund" in r) ? {} : { fund: f }) })),
      );
      if (error) throw error;
    },
    onSuccess: (_d, rows) => {
      toast.success(`${rows.length} row(s) saved`);
      invalidateTable(qc, table);
      takeSnapshot(table, "Bulk saved"); void bumpSections(table);
    },
    onError: (e: Error) => toast.error(`Save failed: ${e.message}`),
  });
}

export function useReplaceTable(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: Record<string, unknown>[]) => {
      const f = getActiveFund();
      // Only wipe the current fund's rows — the other fund must be untouched.
      const { error: delErr } = await tbl(table).delete().eq("fund", f);
      if (delErr) throw delErr;
      if (rows.length === 0) return;
      const u = await uid();
      const { error } = await tbl(table).insert(
        rows.map((r) => ({ ...r, fund: f, updated_by: u })),
      );
      if (error) throw error;
    },
    onSuccess: (_d, rows) => {
      toast.success(`Replaced with ${rows.length} row(s) from file`);
      invalidateTable(qc, table);
      takeSnapshot(table, "Replaced"); void bumpSections(table);
    },
    onError: (e: Error) => toast.error(`Upload failed: ${e.message}`),
  });
}
