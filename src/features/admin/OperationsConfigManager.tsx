import { useState, useCallback } from 'react';
import { Plus, Trash2, Check, AlertTriangle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MeetingNoteType {
  key: string;
  label: string;
  icon: string;
}

interface PriorityLevel {
  key: string;       // read-only: urgent | high | medium | low
  label: string;
  color: string;
}

interface IntroStatus {
  key: string;       // read-only
  label: string;
  color: string;
}

interface OpsConfig {
  meetingNoteTypes: MeetingNoteType[];
  priorityLevels: PriorityLevel[];
  introStatuses: IntroStatus[];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_MEETING_NOTE_TYPES: MeetingNoteType[] = [
  { key: 'founder_call', label: 'Founder Call', icon: '📞' },
  { key: 'lp_meeting', label: 'LP Meeting', icon: '🤝' },
  { key: 'board_meeting', label: 'Board Meeting', icon: '📋' },
  { key: 'co_investor', label: 'Co-investor', icon: '🏦' },
  { key: 'intro', label: 'Intro', icon: '👋' },
  { key: 'internal', label: 'Internal', icon: '🏠' },
  { key: 'other', label: 'Other', icon: '💬' },
];

const DEFAULT_PRIORITY_LEVELS: PriorityLevel[] = [
  { key: 'urgent', label: 'Urgent', color: '#EF4444' },
  { key: 'high', label: 'High', color: '#F97316' },
  { key: 'medium', label: 'Medium', color: '#EAB308' },
  { key: 'low', label: 'Low', color: '#6B7280' },
];

const DEFAULT_INTRO_STATUSES: IntroStatus[] = [
  { key: 'requested', label: 'Requested', color: '#3B82F6' },
  { key: 'intro_sent', label: 'Intro Sent', color: '#8B5CF6' },
  { key: 'responded', label: 'Responded', color: '#F59E0B' },
  { key: 'meeting_scheduled', label: 'Meeting Scheduled', color: '#14B8A6' },
  { key: 'closed_won', label: 'Closed Won', color: '#10B981' },
  { key: 'closed_lost', label: 'Closed Lost', color: '#6B7280' },
];

const LS_KEY = 'cactus_ops_config';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ic = 'border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';

function labelToKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

function genId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function loadConfig(): OpsConfig {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as OpsConfig;
  } catch {
    // ignore parse errors — fall through to defaults
  }
  return {
    meetingNoteTypes: DEFAULT_MEETING_NOTE_TYPES,
    priorityLevels: DEFAULT_PRIORITY_LEVELS,
    introStatuses: DEFAULT_INTRO_STATUSES,
  };
}

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps {
  message: string;
  visible: boolean;
}

function Toast({ message, visible }: ToastProps) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-white text-sm font-medium animate-fade-in"
      style={{ backgroundColor: '#1C4B42' }}>
      <Check className="w-4 h-4" />
      {message}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onSave: () => void;
  saved: boolean;
}

function Section({ title, subtitle, children, onSave, saved }: SectionProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 bg-gray-50">
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-5 py-4 bg-white space-y-3">
        {children}
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onSave}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white transition-opacity"
            style={{ backgroundColor: '#1C4B42' }}
          >
            <Check className="w-4 h-4" />
            {saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type SectionKey = 'A' | 'B' | 'C' | 'global';

export default function OperationsConfigManager() {
  const [cfg, setCfg] = useState<OpsConfig>(loadConfig);
  const [savedSection, setSavedSection] = useState<SectionKey | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // New meeting type state
  const [newTypeIcon, setNewTypeIcon] = useState('💬');
  const [newTypeLabel, setNewTypeLabel] = useState('');

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }, []);

  const persist = useCallback((updated: OpsConfig, section: SectionKey, msg: string) => {
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
    setSavedSection(section);
    showToast(msg);
    setTimeout(() => setSavedSection(null), 2000);
  }, [showToast]);

  const saveSection = (section: SectionKey, msg: string) => persist(cfg, section, msg);

  const saveAll = () => {
    const updated = cfg;
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
    setSavedSection('global');
    showToast('All sections saved successfully.');
    setTimeout(() => setSavedSection(null), 2000);
  };

  // ── Meeting Note Type handlers ──────────────────────────────────────────────

  const addMeetingType = () => {
    const trimmedLabel = newTypeLabel.trim();
    if (!trimmedLabel) return;
    const key = labelToKey(trimmedLabel) || genId();
    const newType: MeetingNoteType = { key, label: trimmedLabel, icon: newTypeIcon || '💬' };
    setCfg(c => ({ ...c, meetingNoteTypes: [...c.meetingNoteTypes, newType] }));
    setNewTypeLabel('');
    setNewTypeIcon('💬');
  };

  const removeMeetingType = (key: string) =>
    setCfg(c => ({ ...c, meetingNoteTypes: c.meetingNoteTypes.filter(t => t.key !== key) }));

  const updateMeetingType = (key: string, patch: Partial<MeetingNoteType>) =>
    setCfg(c => ({
      ...c,
      meetingNoteTypes: c.meetingNoteTypes.map(t =>
        t.key === key ? { ...t, ...patch } : t
      ),
    }));

  // ── Priority Level handlers ─────────────────────────────────────────────────

  const updatePriority = (key: string, patch: Partial<PriorityLevel>) =>
    setCfg(c => ({
      ...c,
      priorityLevels: c.priorityLevels.map(p => (p.key === key ? { ...p, ...patch } : p)),
    }));

  // ── Intro Status handlers ───────────────────────────────────────────────────

  const updateIntroStatus = (key: string, patch: Partial<IntroStatus>) =>
    setCfg(c => ({
      ...c,
      introStatuses: c.introStatuses.map(s => (s.key === key ? { ...s, ...patch } : s)),
    }));

  const isSaved = (section: SectionKey) => savedSection === section;

  return (
    <>
      <Toast message={toastMsg} visible={toastVisible} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Configure meeting note types, task priorities, and intro request statuses used across the Operations module.
          </p>
          <button
            type="button"
            onClick={saveAll}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white shrink-0 transition-opacity"
            style={{ backgroundColor: '#86CA0F', color: '#1C4B42' }}
          >
            <Check className="w-4 h-4" />
            {isSaved('global') ? 'All Saved!' : 'Save All'}
          </button>
        </div>

        {/* ── Section A — Meeting Note Types ───────────────────────────────── */}
        <Section
          title="A — Meeting Note Types"
          subtitle="Types used in the Meeting Notes log"
          onSave={() => saveSection('A', 'Meeting note types saved.')}
          saved={isSaved('A')}
        >
          {/* Warning */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-100 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Existing meeting notes using a deleted type will keep their original type label.
            </p>
          </div>

          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[56px_1fr_1fr_36px] gap-2 px-1 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Icon</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Label</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Key (auto)</span>
            <span />
          </div>

          {/* Existing types */}
          {cfg.meetingNoteTypes.map(type => (
            <div key={type.key} className="grid grid-cols-1 md:grid-cols-[56px_1fr_1fr_36px] gap-2 items-center p-1.5 rounded-lg hover:bg-gray-50">
              <input
                className={ic + ' w-full text-center text-lg'}
                value={type.icon}
                maxLength={2}
                onChange={e => updateMeetingType(type.key, { icon: e.target.value })}
                aria-label="Emoji icon"
              />
              <input
                className={ic + ' w-full'}
                value={type.label}
                onChange={e => updateMeetingType(type.key, { label: e.target.value })}
                placeholder="Type label"
              />
              <input
                className={ic + ' w-full font-mono text-xs text-gray-400 bg-gray-50'}
                value={type.key}
                readOnly
                tabIndex={-1}
              />
              <button
                type="button"
                onClick={() => removeMeetingType(type.key)}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors justify-self-center"
                aria-label="Remove type"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {cfg.meetingNoteTypes.length === 0 && (
            <p className="text-xs text-gray-400 italic px-2 py-2">No types configured.</p>
          )}

          {/* Add new type */}
          <div className="grid grid-cols-1 md:grid-cols-[56px_1fr_auto] gap-2 items-center pt-3 mt-1 border-t border-dashed border-gray-200">
            <input
              className={ic + ' w-full text-center text-lg'}
              value={newTypeIcon}
              maxLength={2}
              onChange={e => setNewTypeIcon(e.target.value)}
              aria-label="New type icon"
            />
            <input
              className={ic + ' w-full'}
              value={newTypeLabel}
              onChange={e => setNewTypeLabel(e.target.value)}
              placeholder="New type label"
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMeetingType(); } }}
            />
            <button
              type="button"
              onClick={addMeetingType}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Add Type
            </button>
          </div>
        </Section>

        {/* ── Section B — Task Priority Labels ─────────────────────────────── */}
        <Section
          title="B — Task Priority Labels"
          subtitle="The 4 priority levels used across Operations tasks — rename and recolor only"
          onSave={() => saveSection('B', 'Priority labels saved.')}
          saved={isSaved('B')}
        >
          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[100px_1fr_1fr_120px] gap-3 px-1 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Key</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Display Label</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Color</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Preview</span>
          </div>

          {cfg.priorityLevels.map(p => (
            <div key={p.key} className="grid grid-cols-1 md:grid-cols-[100px_1fr_1fr_120px] gap-3 items-center p-1.5 rounded-lg hover:bg-gray-50">
              {/* Key (read-only) */}
              <span className="font-mono text-xs text-gray-400 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
                {p.key}
              </span>
              {/* Label */}
              <input
                className={ic + ' w-full'}
                value={p.label}
                onChange={e => updatePriority(p.key, { label: e.target.value })}
                placeholder="Display label"
              />
              {/* Color picker + hex */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={p.color}
                  onChange={e => updatePriority(p.key, { color: e.target.value })}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                  aria-label="Pick color"
                />
                <input
                  className={ic + ' flex-1 font-mono text-xs'}
                  value={p.color}
                  onChange={e => updatePriority(p.key, { color: e.target.value })}
                  placeholder="#000000"
                  maxLength={7}
                />
              </div>
              {/* Preview badge */}
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white justify-center"
                style={{ backgroundColor: p.color }}
              >
                {p.label}
              </span>
            </div>
          ))}
        </Section>

        {/* ── Section C — Intro Request Statuses ───────────────────────────── */}
        <Section
          title="C — Intro Request Statuses"
          subtitle="Status labels and colors for intro requests in the Operations module"
          onSave={() => saveSection('C', 'Intro statuses saved.')}
          saved={isSaved('C')}
        >
          {/* Column headers */}
          <div className="hidden md:grid grid-cols-[160px_1fr_1fr_120px] gap-3 px-1 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Key</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Display Label</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Color</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Preview</span>
          </div>

          {cfg.introStatuses.map(s => (
            <div key={s.key} className="grid grid-cols-1 md:grid-cols-[160px_1fr_1fr_120px] gap-3 items-center p-1.5 rounded-lg hover:bg-gray-50">
              {/* Key (read-only) */}
              <span className="font-mono text-xs text-gray-400 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg truncate">
                {s.key}
              </span>
              {/* Label */}
              <input
                className={ic + ' w-full'}
                value={s.label}
                onChange={e => updateIntroStatus(s.key, { label: e.target.value })}
                placeholder="Display label"
              />
              {/* Color picker + hex */}
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={s.color}
                  onChange={e => updateIntroStatus(s.key, { color: e.target.value })}
                  className="w-9 h-9 rounded-lg cursor-pointer border border-gray-200 p-0.5"
                  aria-label="Pick color"
                />
                <input
                  className={ic + ' flex-1 font-mono text-xs'}
                  value={s.color}
                  onChange={e => updateIntroStatus(s.key, { color: e.target.value })}
                  placeholder="#000000"
                  maxLength={7}
                />
              </div>
              {/* Preview badge */}
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold text-white justify-center"
                style={{ backgroundColor: s.color }}
              >
                {s.label}
              </span>
            </div>
          ))}
        </Section>
      </div>
    </>
  );
}
