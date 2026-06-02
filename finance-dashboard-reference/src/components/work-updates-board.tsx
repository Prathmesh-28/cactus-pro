import { useState, useEffect, useRef, useMemo } from "react";
import { Plus, Trash2, ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import {
  useTable,
  useInsertRow,
  useUpsertRow,
  useDeleteRow,
} from "@/lib/data-hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { snapshotAll } from "@/lib/snapshots";
import { useFund } from "@/lib/fund-context";
import { cn } from "@/lib/utils";

type Status = "planned" | "closed" | "pending";
type Task = {
  id: string;
  title: string;
  description: string | null;
  owner: string | null;
  due_date: string | null;
  status: Status;
  original_id: string | null;
  sort_order: number;
};

const COLUMNS: { status: Status; label: string; tone: string }[] = [
  { status: "planned", label: "Planned", tone: "bg-muted/40" },
  { status: "closed", label: "Closed", tone: "bg-emerald-500/5" },
  { status: "pending", label: "Pending", tone: "bg-amber-500/5" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function WorkUpdatesBoard() {
  const { canEdit } = useAuth();
  const { fund } = useFund();
  const qc = useQueryClient();
  const { data: tasks = [], isLoading } = useTable<Task>("work_updates", "sort_order");
  const insert = useInsertRow("work_updates");
  const upsert = useUpsertRow("work_updates");
  const del = useDeleteRow("work_updates");

  const [draftCol, setDraftCol] = useState<Status | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<Partial<Task>>({});
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  // Auto-move overdue Planned tasks to Pending (once per task, tracked via original_id flag)
  const autoMoveRanRef = useRef<string | null>(null);
  useEffect(() => {
    if (isLoading || !canEdit) return;
    const today = todayISO();
    const runKey = `${fund}:${today}`;
    if (autoMoveRanRef.current === runKey) return;
    autoMoveRanRef.current = runKey;

    const overdue = tasks.filter(
      (t) =>
        t.status === "planned" &&
        t.due_date &&
        t.due_date < today &&
        // One-time flag: original_id is set once auto-moved, prevents re-processing
        t.original_id === null,
    );
    if (overdue.length === 0) return;

    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const pendingCount = tasks.filter((t) => t.status === "pending").length;
      const updates = overdue.map((t, i) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        owner: t.owner,
        due_date: t.due_date,
        status: "pending" as Status,
        original_id: t.id, // one-time flag: this task was auto-moved
        sort_order: pendingCount + i,
        fund,
        updated_by: u.user?.id ?? null,
      }));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase.from("work_updates" as never) as any).upsert(updates);
      if (error) {
        console.error("auto-move overdue failed", error);
        return;
      }
      qc.invalidateQueries({ queryKey: ["table", "work_updates"] });
      void snapshotAll(`Auto-moved ${overdue.length} overdue task(s) to Pending`);
    })();
  }, [isLoading, tasks, fund, canEdit, qc]);

  // Apply date-range filter
  const filteredTasks = useMemo(() => {
    if (!fromDate && !toDate) return tasks;
    return tasks.filter((t) => {
      if (!t.due_date) return false;
      if (fromDate && t.due_date < fromDate) return false;
      if (toDate && t.due_date > toDate) return false;
      return true;
    });
  }, [tasks, fromDate, toDate]);

  function tasksFor(status: Status) {
    return filteredTasks.filter((t) => t.status === status);
  }

  function allTasksFor(status: Status) {
    return tasks.filter((t) => t.status === status);
  }

  async function addTask(status: Status) {
    if (!draftTitle.trim()) {
      setDraftCol(null);
      return;
    }
    await insert.mutateAsync({
      title: draftTitle.trim(),
      status,
      sort_order: allTasksFor(status).length,
    });
    setDraftTitle("");
    setDraftCol(null);
  }

  async function changeStatus(task: Task, newStatus: Status) {
    if (newStatus === task.status) return;
    // Move in place — tasks exist in only one column at a time.
    await upsert.mutateAsync({
      id: task.id,
      status: newStatus,
      sort_order: allTasksFor(newStatus).length,
    });
  }

  async function saveEdits(task: Task) {
    const patch: Record<string, unknown> = { id: task.id };
    if (editFields.title !== undefined) patch.title = editFields.title;
    if (editFields.description !== undefined) patch.description = editFields.description;
    if (editFields.owner !== undefined) patch.owner = editFields.owner;
    if (editFields.due_date !== undefined) patch.due_date = editFields.due_date || null;
    await upsert.mutateAsync(patch);
    setEditingId(null);
    setEditFields({});
  }

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading…</div>;
  }

  const hasFilter = !!(fromDate || toDate);

  return (
    <div className="space-y-4">
      {/* Date range filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            From
          </label>
          <Input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="h-8 text-xs w-[150px]"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            To
          </label>
          <Input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="h-8 text-xs w-[150px]"
          />
        </div>
        {hasFilter && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setFromDate("");
              setToDate("");
            }}
            className="h-8"
          >
            <X className="size-3.5 mr-1" /> Clear Filter
          </Button>
        )}
        {hasFilter && (
          <div className="text-[11px] text-muted-foreground ml-auto">
            Showing tasks with due dates in range
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const items = tasksFor(col.status);
          return (
            <div
              key={col.status}
              className={cn(
                "rounded-lg border border-border shadow-[var(--shadow-card)] flex flex-col",
                col.tone,
              )}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-serif uppercase tracking-wide">{col.label}</h3>
                  <span className="text-[11px] text-muted-foreground">{items.length}</span>
                </div>
                {canEdit && draftCol !== col.status && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => {
                      setDraftCol(col.status);
                      setDraftTitle("");
                    }}
                  >
                    <Plus className="size-3.5 mr-1" /> Add
                  </Button>
                )}
              </div>

              <div className="p-3 space-y-2 flex-1 min-h-[120px]">
                {canEdit && draftCol === col.status && (
                  <div className="rounded-md border border-border bg-card p-2 space-y-2">
                    <Input
                      autoFocus
                      placeholder="Task title"
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void addTask(col.status);
                        if (e.key === "Escape") setDraftCol(null);
                      }}
                      className="h-8 text-sm"
                    />
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setDraftCol(null)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => void addTask(col.status)}>
                        Add
                      </Button>
                    </div>
                  </div>
                )}

                {items.length === 0 && draftCol !== col.status && (
                  <div className="text-xs text-muted-foreground text-center py-6">
                    {hasFilter ? "No tasks in range" : "No tasks"}
                  </div>
                )}

                {items.map((task) => {
                  const isEditing = editingId === task.id;
                  return (
                    <div
                      key={task.id}
                      className="rounded-md border border-border bg-card p-3 group"
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            autoFocus
                            value={editFields.title ?? task.title}
                            onChange={(e) => setEditFields({ ...editFields, title: e.target.value })}
                            className="h-8 text-sm font-medium"
                          />
                          <Textarea
                            placeholder="Description"
                            value={editFields.description ?? task.description ?? ""}
                            onChange={(e) =>
                              setEditFields({ ...editFields, description: e.target.value })
                            }
                            className="text-xs min-h-[60px]"
                          />
                          <div className="flex gap-2">
                            <Input
                              placeholder="Owner"
                              value={editFields.owner ?? task.owner ?? ""}
                              onChange={(e) => setEditFields({ ...editFields, owner: e.target.value })}
                              className="h-8 text-xs"
                            />
                            <Input
                              type="date"
                              value={editFields.due_date ?? task.due_date ?? ""}
                              onChange={(e) =>
                                setEditFields({ ...editFields, due_date: e.target.value })
                              }
                              className="h-8 text-xs"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingId(null);
                                setEditFields({});
                              }}
                            >
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => saveEdits(task)}>
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <button
                              className={cn(
                                "text-sm font-medium text-left flex-1",
                                canEdit && "hover:text-accent cursor-text",
                              )}
                              onClick={() => {
                                if (!canEdit) return;
                                setEditingId(task.id);
                                setEditFields({});
                              }}
                            >
                              {task.title || "Untitled"}
                            </button>
                            {canEdit && (
                              <button
                                onClick={() => {
                                  if (confirm(`Delete "${task.title}"?`)) del.mutate(task.id);
                                }}
                                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition"
                                aria-label="Delete task"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                          {task.description && (
                            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
                              {task.description}
                            </p>
                          )}
                          {(task.owner || task.due_date) && (
                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                              {task.owner && <span>👤 {task.owner}</span>}
                              {task.due_date && <span>📅 {task.due_date}</span>}
                            </div>
                          )}
                          {canEdit && (
                            <div className="mt-3 flex items-center gap-2">
                              <ArrowRight className="size-3 text-muted-foreground" />
                              <Select
                                value={task.status}
                                onValueChange={(v) => changeStatus(task, v as Status)}
                              >
                                <SelectTrigger className="h-7 text-xs flex-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="planned">Planned</SelectItem>
                                  <SelectItem value="closed">Closed</SelectItem>
                                  <SelectItem value="pending">Pending</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
