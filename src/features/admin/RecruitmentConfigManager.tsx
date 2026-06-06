import { useState, useCallback, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { Plus, Trash2, Check, Copy, ChevronDown, ChevronUp } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type OnboardingCategory =
  | 'documents'
  | 'it_setup'
  | 'orientation'
  | 'training'
  | 'compliance'
  | 'other';

interface OnboardingTask {
  id: string;
  name: string;
  category: OnboardingCategory;
  dueDays: number;
}

interface RecruitmentConfig {
  departments: string[];
  candidateSources: string[];
  onboardingTasks: OnboardingTask[];
  offerLetterTemplate: string;
  interviewRounds: string[];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_DEPARTMENTS: string[] = [
  'Engineering', 'Product', 'Marketing', 'Sales',
  'Finance', 'Operations', 'Legal', 'HR', 'Other',
];

const DEFAULT_SOURCES: string[] = [
  'LinkedIn', 'Referral', 'Job Board', 'Company Website',
  'Angel List', 'Campus Recruitment', 'Headhunter', 'Other',
];

const DEFAULT_TASKS: OnboardingTask[] = [
  // Documents
  { id: 'doc_1', name: 'Collect signed offer letter', category: 'documents', dueDays: 1 },
  { id: 'doc_2', name: 'Collect ID proof - Aadhaar/PAN', category: 'documents', dueDays: 3 },
  { id: 'doc_3', name: 'Collect educational certificates', category: 'documents', dueDays: 5 },
  { id: 'doc_4', name: 'Bank account details for payroll', category: 'documents', dueDays: 3 },
  // IT Setup
  { id: 'it_1', name: 'Create company email account', category: 'it_setup', dueDays: 1 },
  { id: 'it_2', name: 'Set up laptop/workstation', category: 'it_setup', dueDays: 1 },
  { id: 'it_3', name: 'Add to Slack/communication tools', category: 'it_setup', dueDays: 2 },
  { id: 'it_4', name: 'Grant access to required systems', category: 'it_setup', dueDays: 3 },
  // Orientation
  { id: 'ori_1', name: 'Schedule Day 1 orientation', category: 'orientation', dueDays: 1 },
  { id: 'ori_2', name: 'Introduce to team', category: 'orientation', dueDays: 1 },
  { id: 'ori_3', name: 'Office/remote setup walkthrough', category: 'orientation', dueDays: 2 },
  { id: 'ori_4', name: 'Share company handbook', category: 'orientation', dueDays: 1 },
  // Training
  { id: 'tr_1', name: 'Product/domain onboarding session', category: 'training', dueDays: 3 },
  { id: 'tr_2', name: 'Process and tools training', category: 'training', dueDays: 5 },
  { id: 'tr_3', name: 'Assign buddy/mentor', category: 'training', dueDays: 1 },
  // Compliance
  { id: 'cmp_1', name: 'NDA signed', category: 'compliance', dueDays: 1 },
  { id: 'cmp_2', name: 'Employment agreement signed', category: 'compliance', dueDays: 1 },
  { id: 'cmp_3', name: 'Background verification initiated', category: 'compliance', dueDays: 2 },
  { id: 'cmp_4', name: 'Add to payroll', category: 'compliance', dueDays: 7 },
];

const DEFAULT_OFFER_TEMPLATE = `Dear {{candidateName}},

We are pleased to extend this offer of employment for the position of {{designation}} in the {{department}} department at {{firmName}}.

Your employment will commence on {{startDate}}.

COMPENSATION:
• Total CTC: {{ctc}} per annum
• Fixed Pay: {{fixedPay}} per annum
• Variable Pay: {{variablePay}} per annum
• Equity: {{equity}}

This offer is valid until {{expiryDate}}. Please sign and return a copy of this letter to confirm your acceptance.

We look forward to welcoming you to our team.

Warm regards,
HR Team
{{firmName}}`;

const OFFER_PLACEHOLDERS: string[] = [
  '{{candidateName}}', '{{designation}}', '{{department}}', '{{startDate}}',
  '{{ctc}}', '{{fixedPay}}', '{{variablePay}}', '{{equity}}',
  '{{expiryDate}}', '{{firmName}}',
];

const CATEGORY_LABELS: Record<OnboardingCategory, string> = {
  documents: 'Documents',
  it_setup: 'IT Setup',
  orientation: 'Orientation',
  training: 'Training',
  compliance: 'Compliance',
  other: 'Other',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ic = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function defaultConfig(): RecruitmentConfig {
  return {
    departments: DEFAULT_DEPARTMENTS,
    candidateSources: DEFAULT_SOURCES,
    onboardingTasks: DEFAULT_TASKS,
    offerLetterTemplate: DEFAULT_OFFER_TEMPLATE,
    interviewRounds: ['Screening Call', 'Technical Round', 'Case Study', 'Culture Fit', 'Final Round'],
  };
}

// ─── Accordion ────────────────────────────────────────────────────────────────

interface AccordionProps {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function Accordion({ title, subtitle, open, onToggle, children }: AccordionProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 transition-colors text-left"
      >
        <div>
          <p className="text-sm font-semibold text-gray-800">{title}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
        {open
          ? <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />}
      </button>
      {open && <div className="border-t border-gray-100 px-5 py-4 bg-white">{children}</div>}
    </div>
  );
}

// ─── String List Editor ───────────────────────────────────────────────────────

interface StringListEditorProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
}

function StringListEditor({ items, onChange, placeholder, addLabel }: StringListEditorProps) {
  const [newItem, setNewItem] = useState('');

  const add = () => {
    const trimmed = newItem.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onChange([...items, trimmed]);
    setNewItem('');
  };

  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-1.5 bg-gray-100 rounded-full px-3 py-1 text-xs font-medium text-gray-700"
          >
            {item}
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-gray-400 hover:text-red-500 transition-colors leading-none"
              aria-label={`Remove ${item}`}
            >
              ✕
            </button>
          </span>
        ))}
        {items.length === 0 && (
          <span className="text-xs text-gray-400 italic">No items yet — add one below.</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className={ic + ' flex-1'}
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder={placeholder}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
        />
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

type Section = 'A' | 'B' | 'C' | 'D';

export default function RecruitmentConfigManager() {
  const { store, setRecruitmentConfig } = useApp();
  const [cfg, setCfg] = useState<RecruitmentConfig>(() =>
    (store.recruitmentConfig as RecruitmentConfig | null) ?? defaultConfig()
  );

  // Sync if another user saved config
  useEffect(() => {
    if (store.recruitmentConfig) setCfg(store.recruitmentConfig as unknown as RecruitmentConfig);
  }, [store.recruitmentConfig]);
  const [openSection, setOpenSection] = useState<Section>('A');
  const [savedSection, setSavedSection] = useState<Section | null>(null);
  const [copiedPh, setCopiedPh] = useState<string | null>(null);

  // New task row state
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<OnboardingCategory>('documents');
  const [newTaskDueDays, setNewTaskDueDays] = useState(1);

  const persist = useCallback((updated: RecruitmentConfig, section: Section) => {
    setRecruitmentConfig(updated as unknown as import('../../data/types').RecruitmentAppConfig);
    setSavedSection(section);
    setTimeout(() => setSavedSection(null), 2000);
  }, [setRecruitmentConfig]);

  const saveSection = (section: Section) => persist(cfg, section);

  // Department handlers
  const updateDepts = (departments: string[]) =>
    setCfg(c => ({ ...c, departments }));

  // Source handlers
  const updateSources = (candidateSources: string[]) =>
    setCfg(c => ({ ...c, candidateSources }));

  // Task handlers
  const addTask = () => {
    const trimmed = newTaskName.trim();
    if (!trimmed) return;
    const task: OnboardingTask = {
      id: genId(),
      name: trimmed,
      category: newTaskCategory,
      dueDays: newTaskDueDays,
    };
    setCfg(c => ({ ...c, onboardingTasks: [...c.onboardingTasks, task] }));
    setNewTaskName('');
    setNewTaskDueDays(1);
  };

  const removeTask = (id: string) =>
    setCfg(c => ({ ...c, onboardingTasks: c.onboardingTasks.filter(t => t.id !== id) }));

  const updateTask = (id: string, patch: Partial<Omit<OnboardingTask, 'id'>>) =>
    setCfg(c => ({
      ...c,
      onboardingTasks: c.onboardingTasks.map(t => (t.id === id ? { ...t, ...patch } : t)),
    }));

  // Placeholder copy
  const copyPh = (ph: string) => {
    navigator.clipboard.writeText(ph).catch(() => null);
    setCopiedPh(ph);
    setTimeout(() => setCopiedPh(null), 1500);
  };

  const SaveBtn = ({ section }: { section: Section }) => (
    <button
      type="button"
      onClick={() => saveSection(section)}
      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white transition-opacity"
      style={{ backgroundColor: '#1C4B42' }}
    >
      <Check className="w-4 h-4" />
      {savedSection === section ? 'Saved!' : 'Save'}
    </button>
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Configure departments, candidate sources, onboarding task templates, and the offer letter template
        used across the Recruitment module. Changes are stored locally.
      </p>

      {/* ── Section A — Job Departments ─────────────────────────────────── */}
      <Accordion
        title="A — Job Departments"
        subtitle="Appear in the Job Opening form's department dropdown"
        open={openSection === 'A'}
        onToggle={() => setOpenSection('A')}
      >
        <StringListEditor
          items={cfg.departments}
          onChange={updateDepts}
          placeholder="e.g. Design"
          addLabel="Add Department"
        />
        <div className="flex justify-end mt-4">
          <SaveBtn section="A" />
        </div>
      </Accordion>

      {/* ── Section B — Candidate Sources ───────────────────────────────── */}
      <Accordion
        title="B — Candidate Sources"
        subtitle="Appear in the Add Candidate form's source dropdown"
        open={openSection === 'B'}
        onToggle={() => setOpenSection('B')}
      >
        <StringListEditor
          items={cfg.candidateSources}
          onChange={updateSources}
          placeholder="e.g. Twitter / X"
          addLabel="Add Source"
        />
        <div className="flex justify-end mt-4">
          <SaveBtn section="B" />
        </div>
      </Accordion>

      {/* ── Section C — Onboarding Task Templates ───────────────────────── */}
      <Accordion
        title="C — Onboarding Task Templates"
        subtitle="Auto-created for every new hire on the day they are marked Hired"
        open={openSection === 'C'}
        onToggle={() => setOpenSection('C')}
      >
        <div className="space-y-1.5">
          {/* Column headers (desktop) */}
          <div className="hidden md:grid grid-cols-[1fr_160px_100px_36px] gap-2 px-2 mb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Task Name</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Category</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Due Days</span>
            <span />
          </div>

          {/* Existing tasks */}
          {cfg.onboardingTasks.map(task => (
            <div
              key={task.id}
              className="grid grid-cols-1 md:grid-cols-[1fr_160px_100px_36px] gap-2 items-center p-2 rounded-lg hover:bg-gray-50"
            >
              <input
                className={ic + ' w-full'}
                value={task.name}
                onChange={e => updateTask(task.id, { name: e.target.value })}
                placeholder="Task name"
              />
              <select
                className={ic + ' w-full'}
                value={task.category}
                onChange={e => updateTask(task.id, { category: e.target.value as OnboardingCategory })}
              >
                {(Object.keys(CATEGORY_LABELS) as OnboardingCategory[]).map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                ))}
              </select>
              <div className="relative">
                <input
                  type="number"
                  min={1}
                  className={ic + ' w-full pr-10'}
                  value={task.dueDays}
                  onChange={e => updateTask(task.id, { dueDays: Math.max(1, parseInt(e.target.value) || 1) })}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">d</span>
              </div>
              <button
                type="button"
                onClick={() => removeTask(task.id)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors justify-self-center"
                aria-label="Remove task"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {cfg.onboardingTasks.length === 0 && (
            <p className="text-xs text-gray-400 italic px-2 py-3">No tasks configured yet.</p>
          )}

          {/* Add new task */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_160px_100px_auto] gap-2 items-center pt-3 mt-2 border-t border-dashed border-gray-200">
            <input
              className={ic + ' w-full'}
              value={newTaskName}
              onChange={e => setNewTaskName(e.target.value)}
              placeholder="New task name"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTask(); } }}
            />
            <select
              className={ic + ' w-full'}
              value={newTaskCategory}
              onChange={e => setNewTaskCategory(e.target.value as OnboardingCategory)}
            >
              {(Object.keys(CATEGORY_LABELS) as OnboardingCategory[]).map(cat => (
                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
              ))}
            </select>
            <div className="relative">
              <input
                type="number"
                min={1}
                className={ic + ' w-full pr-10'}
                value={newTaskDueDays}
                onChange={e => setNewTaskDueDays(Math.max(1, parseInt(e.target.value) || 1))}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">d</span>
            </div>
            <button
              type="button"
              onClick={addTask}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Add Task
            </button>
          </div>
        </div>

        <div className="flex justify-end mt-4">
          <SaveBtn section="C" />
        </div>
      </Accordion>

      {/* ── Section D — Offer Letter Template ───────────────────────────── */}
      <Accordion
        title="D — Offer Letter Template"
        subtitle="Used when generating offer letters for candidates"
        open={openSection === 'D'}
        onToggle={() => setOpenSection('D')}
      >
        <div className="space-y-4">
          {/* Placeholder chips */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">
              Available placeholders — click to copy
            </p>
            <div className="flex flex-wrap gap-1.5">
              {OFFER_PLACEHOLDERS.map(ph => (
                <button
                  key={ph}
                  type="button"
                  onClick={() => copyPh(ph)}
                  title="Click to copy"
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded-md border transition-all"
                  style={
                    copiedPh === ph
                      ? { backgroundColor: '#ECFDF5', borderColor: '#86CA0F', color: '#1C4B42' }
                      : { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB', color: '#374151' }
                  }
                >
                  {copiedPh === ph
                    ? <Check className="w-3 h-3 shrink-0" />
                    : <Copy className="w-3 h-3 shrink-0 text-gray-400" />}
                  {ph}
                </button>
              ))}
            </div>
          </div>

          {/* Template textarea */}
          <textarea
            className={ic + ' w-full min-h-[380px] font-mono text-xs leading-relaxed resize-y'}
            value={cfg.offerLetterTemplate}
            onChange={e => setCfg(c => ({ ...c, offerLetterTemplate: e.target.value }))}
            spellCheck={false}
          />
        </div>

        <div className="flex justify-end mt-4">
          <SaveBtn section="D" />
        </div>
      </Accordion>

      {/* Interview Rounds */}
      <div className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-gray-700">🎯 Interview Round Stages</p>
          <button onClick={() => setCfg(c => ({ ...c, interviewRounds: [...(c.interviewRounds ?? []), 'New Round'] }))}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <p className="text-xs text-gray-400">Define the stages candidates go through in your interview process.</p>
        <div className="space-y-2">
          {(cfg.interviewRounds ?? ['Screening Call', 'Technical Round', 'Case Study', 'Culture Fit', 'Final Round']).map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <input className={ic + ' flex-1'} value={r}
                onChange={e => {
                  const arr = [...((cfg.interviewRounds as string[]) ?? [])];
                  arr[i] = e.target.value;
                  setCfg(c => ({ ...c, interviewRounds: arr }));
                }} />
              <button onClick={() => setCfg(c => ({ ...c, interviewRounds: (c.interviewRounds ?? []).filter((_, j) => j !== i) }))}
                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <SaveBtn section="D" />
        </div>
      </div>
    </div>
  );
}