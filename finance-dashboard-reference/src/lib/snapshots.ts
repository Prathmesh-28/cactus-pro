import { supabase } from "@/integrations/supabase/client";
import type { TableName } from "@/lib/data-hooks";

const SNAPSHOT_TABLES: TableName[] = [
  "fund_overview",
  "fund_performance_metrics",
  "fund_expenses",
  "im_expenses",
  "bank_accounts",
  "pipeline_investments",
  "work_updates",
];

let lastSnapshotAt = 0;
const THROTTLE_MS = 30_000;

export async function snapshotAll(label: string) {
  const now = Date.now();
  if (now - lastSnapshotAt < THROTTLE_MS) return;
  lastSnapshotAt = now;

  try {
    const payload: Record<string, unknown[]> = {};
    for (const t of SNAPSHOT_TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.from(t as never) as any).select("*");
      if (error) continue;
      payload[t] = data ?? [];
    }
    const { data: u } = await supabase.auth.getUser();
    await supabase.from("version_snapshots").insert({
      label,
      payload: payload as never,
      created_by: u.user?.id ?? null,
    });
  } catch {
    // best-effort, do not block UI on snapshot failure
  }
}

export async function restoreSnapshot(snapshotId: string): Promise<void> {
  const { data, error } = await supabase
    .from("version_snapshots")
    .select("payload")
    .eq("id", snapshotId)
    .single();
  if (error || !data) throw error ?? new Error("Snapshot not found");

  const payload = data.payload as Record<string, Record<string, unknown>[]>;

  // Restore order: clear children before parents (work_updates has self-FK).
  for (const t of SNAPSHOT_TABLES) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: delErr } = await (supabase.from(t as never) as any)
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");
    if (delErr) throw delErr;
  }
  for (const t of SNAPSHOT_TABLES) {
    const rows = payload[t] ?? [];
    if (rows.length === 0) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insErr } = await (supabase.from(t as never) as any).insert(rows as never);
    if (insErr) throw insErr;
  }
}
