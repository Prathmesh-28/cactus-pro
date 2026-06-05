import { useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parse,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import * as XLSX from "xlsx";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { cn } from "../../../lib/utils";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { useAuth } from "../lib/store";
import {
  useDynamicTable,
  useMutateDynamicTable,
  type DynColumn,
  type DynRow,
} from "../lib/store";
import { toast } from "sonner";

const KEY = "compliance:events";
const COLUMNS: DynColumn[] = [
  { key: "due_date", label: "Due Date", type: "date" },
  { key: "title", label: "Title", type: "text" },
  { key: "assigned_to", label: "Assigned To", type: "text" },
  { key: "notes", label: "Notes", type: "text" },
];

type EventRow = DynRow & {
  due_date?: string;
  title?: string;
  assigned_to?: string;
  notes?: string;
};

function genId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

function parseDateFlexible(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) return format(raw, "yyyy-MM-dd");
  if (typeof raw === "number") {
    // Excel serial date
    const epoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(epoch.getTime() + raw * 86400000);
    if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
  }
  const s = String(raw).trim();
  const patterns = ["yyyy-MM-dd", "dd-MM-yyyy", "dd/MM/yyyy", "yyyy/MM/dd", "d-M-yyyy", "d/M/yyyy", "MM-dd-yyyy", "MM/dd/yyyy"];
  for (const p of patterns) {
    const d = parse(s, p, new Date());
    if (!isNaN(d.getTime())) return format(d, "yyyy-MM-dd");
  }
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return format(iso, "yyyy-MM-dd");
  return null;
}

type DraftEvent = {
  id?: string;
  title: string;
  assigned_to: string;
  notes: string;
  due_date: string; // yyyy-MM-dd
};

const EMPTY_DRAFT: DraftEvent = { title: "", assigned_to: "", notes: "", due_date: "" };

export function ComplianceCalendar() {
  const { canEdit } = useAuth();
  const { data: stored } = useDynamicTable(KEY);
  const mutate = useMutateDynamicTable("work_updates");
  const fileRef = useRef<HTMLInputElement>(null);

  const events: EventRow[] = (stored?.rows ?? []) as EventRow[];

  const [cursor, setCursor] = useState<Date>(startOfMonth(new Date()));
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<DraftEvent>(EMPTY_DRAFT);
  const [viewEvent, setViewEvent] = useState<EventRow | null>(null);
  // view dialog has no separate edit mode

  async function persist(rows: EventRow[]) {
    await mutate.mutateAsync({ tableKey: KEY, columns: COLUMNS, rows });
  }

  const gridDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, EventRow[]>();
    for (const e of events) {
      if (!e.due_date) continue;
      const k = String(e.due_date);
      const list = map.get(k) ?? [];
      list.push(e);
      map.set(k, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => String(a.title ?? "").localeCompare(String(b.title ?? "")));
    }
    return map;
  }, [events]);

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return [...events]
      .filter((e) => {
        if (!e.due_date) return false;
        const d = parseISO(String(e.due_date));
        return !isNaN(d.getTime()) && d >= today;
      })
      .sort((a, b) => String(a.due_date).localeCompare(String(b.due_date)));
  }, [events]);

  function openCreate(date: Date) {
    if (!canEdit) return;
    setDraft({ ...EMPTY_DRAFT, due_date: format(date, "yyyy-MM-dd") });
    setCreateOpen(true);
    
  }

  function openEvent(e: EventRow) {
    setViewEvent(e);
    
  }

  async function saveDraft() {
    if (!draft.title.trim() || !draft.assigned_to.trim() || !draft.due_date) {
      toast.error("Title, Assigned To, and Due Date are required");
      return;
    }
    if (draft.id) {
      await persist(
        events.map((e) =>
          e.id === draft.id
            ? {
                ...e,
                title: draft.title.trim(),
                assigned_to: draft.assigned_to.trim(),
                notes: draft.notes.trim(),
                due_date: draft.due_date,
              }
            : e,
        ),
      );
      setViewEvent(null);
    } else {
      await persist([
        ...events,
        {
          id: genId(),
          title: draft.title.trim(),
          assigned_to: draft.assigned_to.trim(),
          notes: draft.notes.trim(),
          due_date: draft.due_date,
        },
      ]);
    }
    setCreateOpen(false);
    setDraft(EMPTY_DRAFT);
  }

  async function deleteEvent(id: string) {
    if (!confirm("Delete this event?")) return;
    await persist(events.filter((e) => e.id !== id));
    setViewEvent(null);
  }

  function beginEdit(e: EventRow) {
    setDraft({
      id: e.id,
      title: String(e.title ?? ""),
      assigned_to: String(e.assigned_to ?? ""),
      notes: String(e.notes ?? ""),
      due_date: String(e.due_date ?? ""),
    });
    setViewEvent(null);
    setCreateOpen(true);
  }

  async function onImportExcel(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    if (!file) return;
    try {
      const isCSV = file.name.toLowerCase().endsWith('.csv');
      const wb = isCSV
        ? XLSX.read(await file.text(), { type: 'string', cellDates: true })
        : XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
      const imported: EventRow[] = [];
      for (const r of rows) {
        const lower: Record<string, unknown> = {};
        for (const k of Object.keys(r)) lower[k.toLowerCase().trim()] = r[k];
        // Accept any reasonable column name variation
        const title = String(
          lower["title"] ?? lower["event"] ?? lower["compliance"] ?? lower["name"] ?? ""
        ).trim();
        const assigned = String(
          lower["assigned to"] ?? lower["assigned_to"] ?? lower["assignedto"] ??
          lower["owner"] ?? lower["person"] ?? ""
        ).trim();
        const dueRaw =
          lower["due date"] ?? lower["due_date"] ?? lower["duedate"] ??
          lower["date"] ?? lower["deadline"] ?? lower["due"] ?? "";
        const notes = String(lower["notes"] ?? lower["note"] ?? lower["description"] ?? "").trim();
        const due = parseDateFlexible(dueRaw);
        if (!title || !due) continue;
        imported.push({ id: genId(), title, assigned_to: assigned, notes, due_date: due });
      }
      if (imported.length === 0) {
        toast.error(`No valid rows found. Need at least "Title" and "Due Date" columns. Got: ${
          rows.length > 0 ? Object.keys(rows[0]).join(', ') : 'empty file'
        }`);
        return;
      }
      if (!confirm(`Import ${imported.length} event(s)? This will be added to existing events.`)) return;
      await persist([...events, ...imported]);
      toast.success(`Imported ${imported.length} event(s)`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => addMonths(c, -1))} aria-label="Previous month">
            <ChevronLeft className="size-4" />
          </Button>
          <h2 className="font-serif text-2xl md:text-3xl uppercase tracking-wide min-w-[220px] text-center">
            {format(cursor, "MMMM yyyy")}
          </h2>
          <Button variant="outline" size="icon" onClick={() => setCursor((c) => addMonths(c, 1))} aria-label="Next month">
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
            Today
          </Button>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={onImportExcel} />
            <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              <Upload className="size-3.5 mr-1" /> Upload Excel
            </Button>
            <Button size="sm" onClick={() => openCreate(new Date())}>
              <Plus className="size-3.5 mr-1" /> New Event
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Calendar grid */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] overflow-hidden">
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-center">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 auto-rows-fr">
            {gridDays.map((day) => {
              const key = format(day, "yyyy-MM-dd");
              const dayEvents = eventsByDate.get(key) ?? [];
              const inMonth = isSameMonth(day, cursor);
              const today = isToday(day);
              const visible = dayEvents.slice(0, 3);
              const more = dayEvents.length - visible.length;
              return (
                <div
                  key={key}
                  onClick={() => openCreate(day)}
                  className={cn(
                    "min-h-[110px] border-b border-r border-border p-1.5 flex flex-col gap-1 transition-colors",
                    inMonth ? "bg-card" : "bg-muted/20 text-muted-foreground",
                    canEdit ? "cursor-pointer hover:bg-primary/5" : "",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "inline-flex items-center justify-center text-xs font-semibold w-6 h-6 rounded-full",
                        !today && (inMonth ? "text-foreground" : "text-muted-foreground"),
                      )}
                      style={today ? { backgroundColor: '#1E293B', color: '#ffffff' } : undefined}
                    >
                      {format(day, "d")}
                    </span>
                    {dayEvents.length > 0 && !today && (
                      <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5 overflow-hidden">
                    {visible.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          openEvent(e);
                        }}
                        className="text-[10.5px] leading-tight px-1.5 py-0.5 rounded bg-primary text-primary-foreground truncate text-left hover:opacity-90"
                        title={String(e.title ?? "")}
                      >
                        {String(e.title ?? "")}
                      </button>
                    ))}
                    {more > 0 && (
                      <span className="text-[10px] text-muted-foreground px-1">+{more} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming sidebar */}
        <div className="rounded-xl border border-border bg-card shadow-[var(--shadow-card)] p-5 h-fit lg:sticky lg:top-6">
          <h3 className="font-serif text-lg uppercase tracking-wide mb-3">Upcoming Compliances</h3>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming compliances.</p>
          ) : (
            <ul className="divide-y divide-border max-h-[560px] overflow-y-auto -mx-2">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => openEvent(e)}
                    className="w-full text-left px-2 py-3 hover:bg-muted/40 transition-colors"
                  >
                    <div className="text-sm font-medium truncate">{String(e.title ?? "")}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate">{String(e.assigned_to ?? "—")}</span>
                      <span className="tabular-nums shrink-0">
                        {e.due_date ? format(parseISO(String(e.due_date)), "d MMM yyyy") : ""}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setDraft(EMPTY_DRAFT); }}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: "#ffffff", color: "#1a1a1a" }}>
          <DialogHeader>
            <DialogTitle>{draft.id ? "Edit Compliance" : "New Compliance"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="ev-title">Title<span className="text-destructive"> *</span></Label>
              <Input id="ev-title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-assigned">Assigned To<span className="text-destructive"> *</span></Label>
              <Input id="ev-assigned" value={draft.assigned_to} onChange={(e) => setDraft((d) => ({ ...d, assigned_to: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-date">Due Date<span className="text-destructive"> *</span></Label>
              <Input id="ev-date" type="date" value={draft.due_date} onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ev-notes">Notes</Label>
              <Textarea id="ev-notes" rows={3} value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={saveDraft} disabled={mutate.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View event dialog */}
      <Dialog open={!!viewEvent} onOpenChange={(o) => { if (!o) { setViewEvent(null);  } }}>
        <DialogContent className="sm:max-w-md" style={{ backgroundColor: "#ffffff", color: "#1a1a1a" }}>
          {viewEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8">{String(viewEvent.title ?? "")}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Assigned To</div>
                  <div className="font-medium">{String(viewEvent.assigned_to ?? "—")}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Due Date</div>
                  <div className="font-medium tabular-nums">
                    {viewEvent.due_date ? format(parseISO(String(viewEvent.due_date)), "EEEE, d MMMM yyyy") : "—"}
                  </div>
                </div>
                {viewEvent.notes && (
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">Notes</div>
                    <div className="whitespace-pre-wrap">{String(viewEvent.notes)}</div>
                  </div>
                )}
              </div>
              {canEdit && (
                <div className="flex justify-between pt-2">
                  <Button variant="ghost" size="sm" onClick={() => deleteEvent(viewEvent.id)} className="text-destructive hover:text-destructive">
                    <Trash2 className="size-3.5 mr-1" /> Delete
                  </Button>
                  <Button size="sm" onClick={() => beginEdit(viewEvent)}>
                    <Pencil className="size-3.5 mr-1" /> Edit
                  </Button>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
