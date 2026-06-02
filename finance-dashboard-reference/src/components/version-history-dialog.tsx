import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { restoreSnapshot } from "@/lib/snapshots";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

type Snapshot = {
  id: string;
  created_at: string;
  created_by: string | null;
  label: string | null;
  by: string;
};

export function VersionHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const { canEdit } = useAuth();
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["version-snapshots"],
    enabled: open,
    queryFn: async () => {
      const [{ data: profiles }, { data: snaps }] = await Promise.all([
        supabase.from("profiles").select("id, email, full_name"),
        supabase
          .from("version_snapshots")
          .select("id, created_at, created_by, label")
          .order("created_at", { ascending: false })
          .limit(50),
      ]);
      const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name || p.email || "—"]));
      return (snaps ?? []).map<Snapshot>((s) => ({
        ...s,
        by: s.created_by ? (nameById.get(s.created_by) ?? "—") : "—",
      }));
    },
  });

  async function handleRestore(s: Snapshot) {
    if (!canEdit) return;
    const when = new Date(s.created_at).toLocaleString();
    if (
      !confirm(
        `Restore the dashboard to its state from ${when}?\n\nThis will REPLACE all current data across every section. This cannot be undone (a new snapshot of the current state is NOT created automatically).`,
      )
    ) {
      return;
    }
    setRestoringId(s.id);
    try {
      await restoreSnapshot(s.id);
      toast.success(`Restored to version from ${when}`);
      // Refresh every cached table
      await qc.invalidateQueries();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Version history</DialogTitle>
          <DialogDescription>
            Click Restore to roll the entire dashboard back to that point in time.
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto border border-border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>What changed</TableHead>
                <TableHead>By</TableHead>
                <TableHead className="w-32 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && (data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                    No snapshots yet — make an edit to create one.
                  </TableCell>
                </TableRow>
              )}
              {(data ?? []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(s.created_at).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-sm">{s.label ?? "Snapshot"}</TableCell>
                  <TableCell className="text-sm">{s.by}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={restoringId !== null}
                      onClick={() => handleRestore(s)}
                    >
                      <RotateCcw className="size-3.5 mr-1" />
                      {restoringId === s.id ? "Restoring…" : "Restore"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}
