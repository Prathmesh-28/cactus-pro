import { useState, useMemo } from 'react';
import {
  Plus, X, ChevronDown, ChevronUp, Check, Calendar,
  AlertTriangle, Clock, Tag, User, Building2, Flag,
  Edit2, Trash2, CheckSquare, Square, Filter, Search,
  CheckCheck, UserCheck,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { Task, TaskStatus, TaskPriority } from '../../data/types';
import { cn } from '../../lib/utils';
import { useBulkSelect } from '../../hooks/useBulkSelect';
import BulkActionBar from '../../components/ui/BulkActionBar';

// ─── Constants ────────────────────────────────────────────────────────────────

const CACTUS = {
  primary:  '#1B4332',
  accent:   '#40916C',
  light:    '#D8F3DC',
  mid:      '#74C69D',
  text:     '#1B4332',
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string; border: string }> = {
  urgent: { label: 'Urgent', bg: '#FEF2F2', text: '#DC2626', border: '#FCA5A5' },
  high:   { label: 'High',   bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
  medium: { label: 'Medium', bg: '#FEFCE8', text: '#CA8A04', border: '#FDE68A' },
  low:    { label: 'Low',    bg: '#F9FAFB', text: '#6B7280', border: '#E5E7EB' },
};

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo:        'To Do',
  in_progress: 'In Progress',
  done:        'Done',
};

const COLUMNS: TaskStatus[] = ['todo', 'in_progress', 'done'];

const COLUMN_COLORS: Record<TaskStatus, { header: string; bg: string; border: string }> = {
  todo:        { header: '#1B4332', bg: '#F0FFF4', border: '#BBF7D0' },
  in_progress: { header: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE' },
  done:        { header: '#374151', bg: '#F9FAFB', border: '#E5E7EB' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function fmtDate(d: string): string {
  if (!d) return '—';
  return new Date(d + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function isOverdue(dueDate: string, status: TaskStatus): boolean {
  if (!dueDate || status === 'done') return false;
  return dueDate < today();
}

function isDueToday(dueDate: string, status: TaskStatus): boolean {
  if (!dueDate || status === 'done') return false;
  return dueDate === today();
}

function initials(name: string): string {
  return name
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function avatarColor(name: string): string {
  const colors = [
    '#1B4332', '#1E40AF', '#7C3AED', '#DC2626',
    '#EA580C', '#CA8A04', '#0891B2', '#059669',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Empty form state ─────────────────────────────────────────────────────────

interface TaskFormState {
  title: string;
  description: string;
  companyId: string;
  assignee: string;
  dueDate: string;
  priority: TaskPriority;
  tags: string;
  status: TaskStatus;
}

const EMPTY_FORM: TaskFormState = {
  title: '',
  description: '',
  companyId: '',
  assignee: '',
  dueDate: '',
  priority: 'medium',
  tags: '',
  status: 'todo',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const cfg = PRIORITY_CONFIG[priority];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <Flag size={10} />
      {cfg.label}
    </span>
  );
}

function AssigneeAvatar({ name, size = 24 }: { name: string; size?: number }) {
  if (!name) return null;
  const bg = avatarColor(name);
  return (
    <span
      className="inline-flex items-center justify-center rounded-full text-white font-bold flex-shrink-0"
      style={{ width: size, height: size, background: bg, fontSize: size * 0.38 }}
      title={name}
    >
      {initials(name)}
    </span>
  );
}

// ─── Task Card ────────────────────────────────────────────────────────────────

interface TaskCardProps {
  task: Task;
  companyName: string;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onClick: (task: Task) => void;
  // Bulk selection
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  anySelected: boolean;
}

function TaskCard({
  task, companyName, onComplete, onEdit, onDelete, onClick,
  isSelected, onToggleSelect, anySelected,
}: TaskCardProps) {
  const overdue = isOverdue(task.dueDate, task.status);
  const dueToday = isDueToday(task.dueDate, task.status);
  const isDone = task.status === 'done';

  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-white shadow-sm cursor-pointer',
        'hover:shadow-md transition-all duration-150',
        overdue ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-200',
        isDone ? 'opacity-70' : '',
        isSelected ? 'ring-2 ring-[#1C4B42] border-[#1C4B42]' : '',
      )}
      onClick={() => onClick(task)}
    >
      {/* Overdue stripe */}
      {overdue && (
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl bg-red-500" />
      )}

      <div className="p-3 pt-3.5">
        {/* Top row: bulk checkbox + complete toggle + title */}
        <div className="flex items-start gap-2">
          {/* Bulk select checkbox — always visible when any selected, hover-visible otherwise */}
          <button
            className={cn(
              'mt-0.5 flex-shrink-0 transition-all duration-150',
              anySelected
                ? 'opacity-100'
                : 'opacity-0 group-hover:opacity-100',
              isSelected ? 'text-[#1C4B42]' : 'text-gray-300 hover:text-[#1C4B42]',
            )}
            onClick={e => { e.stopPropagation(); onToggleSelect(task.id); }}
            title={isSelected ? 'Deselect' : 'Select'}
          >
            {isSelected
              ? <CheckSquare size={15} />
              : <Square size={15} />}
          </button>

          {/* Complete toggle */}
          <button
            className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-green-600 transition-colors"
            onClick={e => { e.stopPropagation(); onComplete(task); }}
            title={isDone ? 'Mark incomplete' : 'Mark complete'}
          >
            {isDone
              ? <CheckSquare size={16} className="text-green-600" />
              : <Square size={16} />}
          </button>

          <p className={cn(
            'text-sm font-semibold leading-snug flex-1',
            isDone ? 'line-through text-gray-400' : 'text-gray-800',
          )}>
            {task.title}
          </p>
          {/* Action buttons (appear on hover) */}
          <div className="hidden group-hover:flex items-center gap-1 ml-1">
            <button
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              onClick={e => { e.stopPropagation(); onEdit(task); }}
              title="Edit"
            >
              <Edit2 size={12} />
            </button>
            <button
              className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
              onClick={e => { e.stopPropagation(); onDelete(task.id); }}
              title="Delete"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>

        {/* Priority badge + company tag */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-12">
          <PriorityBadge priority={task.priority} />
          {companyName && (
            <span
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border"
              style={{ background: CACTUS.light, color: CACTUS.text, borderColor: CACTUS.mid }}
            >
              <Building2 size={9} />
              {companyName}
            </span>
          )}
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5 ml-12">
            {task.tags.slice(0, 3).map(tag => (
              <span key={tag} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                <Tag size={8} />
                {tag}
              </span>
            ))}
            {task.tags.length > 3 && (
              <span className="text-xs text-gray-400">+{task.tags.length - 3}</span>
            )}
          </div>
        )}

        {/* Bottom row: assignee + due date */}
        <div className="flex items-center justify-between mt-2.5 ml-12">
          <div className="flex items-center gap-1.5">
            <AssigneeAvatar name={task.assignee} size={20} />
            <span className="text-xs text-gray-500 truncate max-w-[100px]">{task.assignee || '—'}</span>
          </div>
          {task.dueDate && (
            <div className={cn(
              'flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded',
              overdue  ? 'bg-red-50 text-red-600'   :
              dueToday ? 'bg-amber-50 text-amber-700' :
                         'bg-gray-50 text-gray-500',
            )}>
              {overdue  ? <AlertTriangle size={10} /> :
               dueToday ? <Clock size={10} /> :
                          <Calendar size={10} />}
              {fmtDate(task.dueDate)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Task Detail Modal ────────────────────────────────────────────────────────

interface TaskDetailProps {
  task: Task;
  companyName: string;
  companies: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSave: (updated: Task) => void;
  onDelete: (id: string) => void;
}

function TaskDetailModal({ task, companyName, companies, onClose, onSave, onDelete }: TaskDetailProps) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<TaskFormState>({
    title:       task.title,
    description: task.description,
    companyId:   task.companyId ?? '',
    assignee:    task.assignee,
    dueDate:     task.dueDate,
    priority:    task.priority,
    tags:        task.tags.join(', '),
    status:      task.status,
  });

  function handleSave() {
    const updated: Task = {
      ...task,
      title:       form.title.trim(),
      description: form.description.trim(),
      companyId:   form.companyId || undefined,
      assignee:    form.assignee.trim(),
      dueDate:     form.dueDate,
      priority:    form.priority,
      tags:        form.tags.split(',').map(t => t.trim()).filter(Boolean),
      status:      form.status,
      completedAt: form.status === 'done' && !task.completedAt ? new Date().toISOString() : task.completedAt,
    };
    onSave(updated);
    setEditing(false);
  }

  const overdue = isOverdue(task.dueDate, task.status);
  const dueToday = isDueToday(task.dueDate, task.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-bold text-gray-800 text-base">Task Detail</h2>
          <div className="flex items-center gap-2">
            {!editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 text-gray-600"
              >
                <Edit2 size={13} /> Edit
              </button>
            )}
            <button
              onClick={() => { if (window.confirm('Delete this task?')) { onDelete(task.id); onClose(); } }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium border border-red-200 text-red-500 hover:bg-red-50"
            >
              <Trash2 size={13} /> Delete
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {editing ? (
            /* ── Edit form ── */
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Title *</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                  style={{ '--tw-ring-color': CACTUS.accent } as React.CSSProperties}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
                <textarea
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
                  >
                    {COLUMNS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Priority</label>
                  <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    value={form.priority}
                    onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
                  >
                    {(['urgent','high','medium','low'] as TaskPriority[]).map(p => (
                      <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Assignee</label>
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    value={form.assignee}
                    onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Due Date</label>
                  <input
                    type="date"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                    value={form.dueDate}
                    onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Company</label>
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  value={form.companyId}
                  onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}
                >
                  <option value="">— No company —</option>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tags (comma-separated)</label>
                <input
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                  value={form.tags}
                  onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
                  placeholder="e.g. legal, finance, urgent"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleSave}
                  disabled={!form.title.trim()}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-opacity disabled:opacity-40"
                  style={{ background: CACTUS.primary }}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* ── View mode ── */
            <div className="space-y-4">
              {/* Title + status */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 leading-snug">{task.title}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-semibold border"
                    style={{
                      background: COLUMN_COLORS[task.status].bg,
                      color: COLUMN_COLORS[task.status].header,
                      borderColor: COLUMN_COLORS[task.status].border,
                    }}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                  <PriorityBadge priority={task.priority} />
                  {overdue && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                      <AlertTriangle size={10} /> Overdue
                    </span>
                  )}
                  {dueToday && !overdue && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      <Clock size={10} /> Due Today
                    </span>
                  )}
                </div>
              </div>

              {/* Description */}
              {task.description && (
                <div className="p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{task.description}</p>
                </div>
              )}

              {/* Meta grid */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-start gap-2">
                  <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Assignee</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <AssigneeAvatar name={task.assignee} size={18} />
                      <span className="text-gray-700">{task.assignee || '—'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Due Date</p>
                    <p className={cn('mt-0.5', overdue ? 'text-red-600 font-semibold' : 'text-gray-700')}>
                      {task.dueDate ? fmtDate(task.dueDate) : '—'}
                    </p>
                  </div>
                </div>
                {companyName && (
                  <div className="flex items-start gap-2">
                    <Building2 size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Company</p>
                      <p className="text-gray-700 mt-0.5">{companyName}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <User size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Created By</p>
                    <p className="text-gray-700 mt-0.5">{task.createdBy || '—'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 col-span-2">
                  <Calendar size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 font-medium">Created At</p>
                    <p className="text-gray-700 mt-0.5">{fmtDate(task.createdAt.slice(0, 10))}</p>
                  </div>
                </div>
                {task.completedAt && (
                  <div className="flex items-start gap-2 col-span-2">
                    <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400 font-medium">Completed At</p>
                      <p className="text-green-700 mt-0.5">{fmtDate(task.completedAt.slice(0, 10))}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tags */}
              {task.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {task.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600 border border-gray-200">
                      <Tag size={9} /> {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Add / Edit Task Modal (for creating new tasks) ──────────────────────────

interface AddTaskModalProps {
  companies: Array<{ id: string; name: string }>;
  onClose: () => void;
  onAdd: (task: Task) => void;
  currentUser: string;
  defaultStatus?: TaskStatus;
}

function AddTaskModal({ companies, onClose, onAdd, currentUser, defaultStatus = 'todo' }: AddTaskModalProps) {
  const [form, setForm] = useState<TaskFormState>({ ...EMPTY_FORM, status: defaultStatus });
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormState, string>>>({});

  function validate(): boolean {
    const e: typeof errors = {};
    if (!form.title.trim()) e.title = 'Title is required';
    if (!form.assignee.trim()) e.assignee = 'Assignee is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    const task: Task = {
      id:          generateId(),
      title:       form.title.trim(),
      description: form.description.trim(),
      companyId:   form.companyId || undefined,
      assignee:    form.assignee.trim(),
      dueDate:     form.dueDate,
      priority:    form.priority,
      tags:        form.tags.split(',').map(t => t.trim()).filter(Boolean),
      status:      form.status,
      createdBy:   currentUser,
      createdAt:   new Date().toISOString(),
      completedAt: form.status === 'done' ? new Date().toISOString() : undefined,
    };
    onAdd(task);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="font-bold text-gray-800">Add New Task</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Title *</label>
            <input
              className={cn(
                'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2',
                errors.title ? 'border-red-300 focus:ring-red-200' : 'border-gray-200',
              )}
              placeholder="Task title..."
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              autoFocus
            />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-green-200"
              placeholder="Optional details..."
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Status</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as TaskStatus }))}
              >
                {COLUMNS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Priority</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value as TaskPriority }))}
              >
                {(['urgent','high','medium','low'] as TaskPriority[]).map(p => (
                  <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
                ))}
              </select>
            </div>

            {/* Assignee */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Assignee *</label>
              <input
                className={cn(
                  'w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2',
                  errors.assignee ? 'border-red-300 focus:ring-red-200' : 'border-gray-200',
                )}
                placeholder="Name..."
                value={form.assignee}
                onChange={e => setForm(f => ({ ...f, assignee: e.target.value }))}
              />
              {errors.assignee && <p className="text-xs text-red-500 mt-1">{errors.assignee}</p>}
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Due Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
                value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Company */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Company (optional)</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              value={form.companyId}
              onChange={e => setForm(f => ({ ...f, companyId: e.target.value }))}
            >
              <option value="">— No company —</option>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Tags (comma-separated)</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none"
              placeholder="e.g. legal, finance, follow-up"
              value={form.tags}
              onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
            />
          </div>

          {/* Submit */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSubmit}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity"
              style={{ background: CACTUS.primary }}
            >
              Add Task
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Assign Dropdown (inline) ─────────────────────────────────────────────────

interface AssignDropdownProps {
  people: Array<{ name: string }>;
  onAssign: (name: string) => void;
  onClose: () => void;
}

function AssignDropdown({ people, onAssign, onClose }: AssignDropdownProps) {
  return (
    <div
      className="fixed inset-0 z-[60]"
      onClick={onClose}
    >
      <div
        className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden min-w-[200px] max-h-60 overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-3 py-2 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Assign to</p>
        </div>
        {people.length === 0 ? (
          <div className="px-4 py-3 text-sm text-gray-400">No team members found</div>
        ) : (
          people.map(p => (
            <button
              key={p.name}
              onClick={() => { onAssign(p.name); onClose(); }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 text-left transition-colors"
            >
              <AssigneeAvatar name={p.name} size={22} />
              {p.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  companyMap: Record<string, string>;
  onComplete: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onCardClick: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
  // Bulk select
  isSelected: (id: string) => boolean;
  onToggleSelect: (id: string) => void;
  anySelected: boolean;
}

function KanbanColumn({
  status, tasks, companyMap,
  onComplete, onEdit, onDelete, onCardClick, onAddTask,
  isSelected, onToggleSelect, anySelected,
}: KanbanColumnProps) {
  const [collapsed, setCollapsed] = useState(status === 'done');
  const colors = COLUMN_COLORS[status];
  const isDoneCol = status === 'done';

  return (
    <div
      className="flex flex-col rounded-2xl border min-w-0"
      style={{ background: colors.bg, borderColor: colors.border }}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between px-4 py-3 rounded-t-2xl sticky top-0 z-10"
        style={{ background: colors.bg, borderBottom: `1px solid ${colors.border}` }}
      >
        <div className="flex items-center gap-2">
          <h3 className="font-bold text-sm" style={{ color: colors.header }}>
            {STATUS_LABELS[status]}
          </h3>
          <span
            className="inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold text-white"
            style={{ background: colors.header }}
          >
            {tasks.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {!isDoneCol && (
            <button
              onClick={() => onAddTask(status)}
              className="p-1 rounded-lg text-gray-400 hover:bg-white hover:text-gray-600 transition-colors"
              title="Add task"
            >
              <Plus size={15} />
            </button>
          )}
          {isDoneCol && (
            <button
              onClick={() => setCollapsed(c => !c)}
              className="p-1 rounded-lg text-gray-400 hover:bg-white hover:text-gray-500 transition-colors"
              title={collapsed ? 'Expand' : 'Collapse'}
            >
              {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
            </button>
          )}
        </div>
      </div>

      {/* Task list */}
      {!collapsed && (
        <div className="flex flex-col gap-2.5 p-3 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-400">
              <div className="text-2xl mb-1">
                {status === 'todo' ? '📋' : status === 'in_progress' ? '🔄' : ''}
              </div>
              No tasks yet
            </div>
          ) : (
            tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                companyName={task.companyId ? companyMap[task.companyId] ?? '' : ''}
                onComplete={onComplete}
                onEdit={onEdit}
                onDelete={onDelete}
                onClick={onCardClick}
                isSelected={isSelected(task.id)}
                onToggleSelect={onToggleSelect}
                anySelected={anySelected}
              />
            ))
          )}
        </div>
      )}

      {collapsed && tasks.length > 0 && (
        <div className="px-4 py-2 text-xs text-gray-400 italic">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''} collapsed — click arrow to expand
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TaskManager() {
  const { store, addTask, updateTask, deleteTask } = useApp();

  const tasks: Task[]  = store.tasks ?? [];
  const companies      = store.companies ?? [];
  const people         = store.people ?? [];
  const currentUser    = people[0]?.name ?? 'Team';

  // Build a company id → name map
  const companyMap = useMemo<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    companies.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [companies]);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterAssignee,  setFilterAssignee]  = useState('');
  const [filterCompanyId, setFilterCompanyId] = useState('');
  const [filterPriority,  setFilterPriority]  = useState<TaskPriority | ''>('');
  const [searchQuery,     setSearchQuery]     = useState('');

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showAddModal,    setShowAddModal]    = useState(false);
  const [addDefaultStatus, setAddDefaultStatus] = useState<TaskStatus>('todo');
  const [selectedTask,    setSelectedTask]    = useState<Task | null>(null);
  const [_editingTask,    setEditingTask]     = useState<Task | null>(null);
  const [showAssignDropdown, setShowAssignDropdown] = useState(false);

  // ── Filtered tasks ────────────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterAssignee  && !t.assignee.toLowerCase().includes(filterAssignee.toLowerCase())) return false;
      if (filterCompanyId && t.companyId !== filterCompanyId) return false;
      if (filterPriority  && t.priority  !== filterPriority)  return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matches =
          t.title.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          t.assignee.toLowerCase().includes(q) ||
          t.tags.some(tag => tag.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });
  }, [tasks, filterAssignee, filterCompanyId, filterPriority, searchQuery]);

  // ── Bulk selection (scoped to filteredTasks) ──────────────────────────────
  const bulk = useBulkSelect(filteredTasks);

  // ── Grouped by status ─────────────────────────────────────────────────────
  const grouped = useMemo<Record<TaskStatus, Task[]>>(() => {
    const g: Record<TaskStatus, Task[]> = { todo: [], in_progress: [], done: [] };
    filteredTasks.forEach(t => g[t.status]?.push(t));
    // Sort each column: urgent > high > medium > low, then by dueDate asc
    const priorityOrder: Record<TaskPriority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    COLUMNS.forEach(col => {
      g[col].sort((a, b) => {
        const pd = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (pd !== 0) return pd;
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
    });
    return g;
  }, [filteredTasks]);

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalCount    = filteredTasks.length;
  const overdueCount  = filteredTasks.filter(t => isOverdue(t.dueDate, t.status)).length;
  const todayCount    = filteredTasks.filter(t => isDueToday(t.dueDate, t.status)).length;

  // ── Unique assignees for filter dropdown ──────────────────────────────────
  const allAssignees = useMemo(() => {
    return [...new Set(tasks.map(t => t.assignee).filter(Boolean))].sort();
  }, [tasks]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleComplete(task: Task) {
    const isDone = task.status === 'done';
    updateTask({
      ...task,
      status:      isDone ? 'todo'      : 'done',
      completedAt: isDone ? undefined    : new Date().toISOString(),
    });
  }

  function handleAddTask(task: Task) {
    addTask(task);
  }

  function handleUpdateTask(updated: Task) {
    updateTask(updated);
    setSelectedTask(null);
    setEditingTask(null);
  }

  function handleDelete(id: string) {
    deleteTask(id);
    setSelectedTask(null);
  }

  function openAddModal(status: TaskStatus = 'todo') {
    setAddDefaultStatus(status);
    setShowAddModal(true);
  }

  // ── Bulk action handlers ──────────────────────────────────────────────────
  function handleBulkMarkComplete() {
    bulk.selectedItems.forEach(task => {
      if (task.status !== 'done') {
        updateTask({ ...task, status: 'done', completedAt: new Date().toISOString() });
      }
    });
    bulk.clear();
  }

  function handleBulkDelete() {
    const n = bulk.count;
    if (!window.confirm(`Delete ${n} task${n !== 1 ? 's' : ''}?`)) return;
    bulk.selectedItems.forEach(task => deleteTask(task.id));
    bulk.clear();
  }

  function handleBulkAssign(name: string) {
    bulk.selectedItems.forEach(task => {
      updateTask({ ...task, assignee: name });
    });
    bulk.clear();
  }

  const hasFilters = filterAssignee || filterCompanyId || filterPriority || searchQuery;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full min-h-0 bg-gray-50">

      {/* ── Page header ── */}
      <div
        className="px-6 py-5 border-b border-gray-100 bg-white flex-shrink-0"
        style={{ borderTop: `3px solid ${CACTUS.primary}` }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-extrabold" style={{ color: CACTUS.primary }}>
              Team Task Manager
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Kanban board for tracking team action items
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Select All checkbox in header */}
            {filteredTasks.length > 0 && (
              <button
                onClick={bulk.toggleAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
                title={bulk.isAllSelected ? 'Deselect all' : 'Select all'}
              >
                {bulk.isAllSelected
                  ? <CheckSquare size={15} className="text-[#1C4B42]" />
                  : bulk.isIndeterminate
                    ? <CheckSquare size={15} className="text-gray-400" />
                    : <Square size={15} />}
                {bulk.isAllSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
            <button
              onClick={() => openAddModal('todo')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
              style={{ background: CACTUS.primary }}
            >
              <Plus size={16} /> Add Task
            </button>
          </div>
        </div>
      </div>

      {/* ── Summary strip ── */}
      <div className="px-6 pt-4 pb-0 flex-shrink-0">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Tasks',  value: totalCount,   color: CACTUS.primary, bg: CACTUS.light },
            { label: 'Overdue',      value: overdueCount, color: '#DC2626',       bg: '#FEF2F2'    },
            { label: 'Due Today',    value: todayCount,   color: '#D97706',       bg: '#FFFBEB'    },
          ].map(item => (
            <div
              key={item.label}
              className="rounded-xl border px-4 py-3 text-center"
              style={{ background: item.bg, borderColor: item.color + '40' }}
            >
              <p className="text-2xl font-extrabold" style={{ color: item.color }}>{item.value}</p>
              <p className="text-xs font-medium text-gray-500 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="px-6 pt-3 pb-0 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
          <Filter size={14} className="text-gray-400 flex-shrink-0" />

          {/* Search */}
          <div className="relative flex-1 min-w-[160px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="w-full pl-7 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1"
              style={{ '--tw-ring-color': CACTUS.accent } as React.CSSProperties}
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Assignee filter */}
          <select
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 focus:outline-none min-w-[130px]"
            value={filterAssignee}
            onChange={e => setFilterAssignee(e.target.value)}
          >
            <option value="">All Assignees</option>
            {allAssignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

          {/* Company filter */}
          <select
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 focus:outline-none min-w-[130px]"
            value={filterCompanyId}
            onChange={e => setFilterCompanyId(e.target.value)}
          >
            <option value="">All Companies</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Priority filter */}
          <select
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-600 focus:outline-none min-w-[120px]"
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as TaskPriority | '')}
          >
            <option value="">All Priorities</option>
            {(['urgent','high','medium','low'] as TaskPriority[]).map(p => (
              <option key={p} value={p}>{PRIORITY_CONFIG[p].label}</option>
            ))}
          </select>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={() => {
                setFilterAssignee('');
                setFilterCompanyId('');
                setFilterPriority('');
                setSearchQuery('');
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-red-500 border border-red-200 hover:bg-red-50 transition-colors"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Kanban board ── */}
      <div className="flex-1 overflow-auto px-6 pt-4 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full" style={{ minWidth: 720 }}>
          {COLUMNS.map(status => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={grouped[status]}
              companyMap={companyMap}
              onComplete={handleComplete}
              onEdit={task => {
                setEditingTask(task);
                setSelectedTask(task);
              }}
              onDelete={handleDelete}
              onCardClick={task => {
                // Don't open detail modal if in bulk selection mode
                if (bulk.count > 0) {
                  bulk.toggle(task.id);
                } else {
                  setSelectedTask(task);
                  setEditingTask(null);
                }
              }}
              onAddTask={openAddModal}
              isSelected={bulk.isSelected}
              onToggleSelect={bulk.toggle}
              anySelected={bulk.count > 0}
            />
          ))}
        </div>
      </div>

      {/* ── Add Task Modal ── */}
      {showAddModal && (
        <AddTaskModal
          companies={companies}
          currentUser={currentUser}
          defaultStatus={addDefaultStatus}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddTask}
        />
      )}

      {/* ── Task Detail / Edit Modal ── */}
      {selectedTask && bulk.count === 0 && (
        <TaskDetailModal
          task={selectedTask}
          companyName={selectedTask.companyId ? companyMap[selectedTask.companyId] ?? '' : ''}
          companies={companies}
          onClose={() => { setSelectedTask(null); setEditingTask(null); }}
          onSave={handleUpdateTask}
          onDelete={handleDelete}
        />
      )}

      {/* ── Assign dropdown ── */}
      {showAssignDropdown && (
        <AssignDropdown
          people={people}
          onAssign={handleBulkAssign}
          onClose={() => setShowAssignDropdown(false)}
        />
      )}

      {/* ── Bulk Action Bar ── */}
      <BulkActionBar
        count={bulk.count}
        total={filteredTasks.length}
        onClear={bulk.clear}
        onSelectAll={bulk.toggleAll}
        actions={[
          {
            label: 'Mark Complete',
            icon: <CheckCheck size={14} />,
            onClick: handleBulkMarkComplete,
            variant: 'primary',
          },
          {
            label: 'Assign to…',
            icon: <UserCheck size={14} />,
            onClick: () => setShowAssignDropdown(true),
            variant: 'default',
          },
          {
            label: 'Delete Selected',
            icon: <Trash2 size={14} />,
            onClick: handleBulkDelete,
            variant: 'danger',
          },
        ]}
      />
    </div>
  );
}
