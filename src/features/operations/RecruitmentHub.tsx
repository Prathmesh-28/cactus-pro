import { useState, useMemo } from 'react';
import { 
  Briefcase, Users, Kanban, FileText, CheckSquare,
  Plus, X, ChevronDown, ChevronRight, Search,
  Mail, Phone, ExternalLink as Linkedin, MapPin, Calendar,
  Star, ExternalLink, Copy, Send, Trash2,
  AlertCircle, CheckCircle, XCircle, PauseCircle,
  BarChart2, UserCheck, Eye, Edit2, Save,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import { useBulkSelect } from '../../hooks/useBulkSelect';
import BulkActionBar from '../../components/ui/BulkActionBar';
import type {
  JobOpening, Candidate, Interview, OfferLetter, OnboardingTask,
  JobType, JobStatus, CandidateStage, InterviewMode, InterviewRec,
  OfferStatus, OnboardingCategory,
} from '../../data/types';

// ─── Color constants ──────────────────────────────────────────────────────────
const PRIMARY = '#1C4B42';
const ACCENT  = '#86CA0F';
const BG      = '#F6FAF7';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
}

function aiScoreColor(score: number): string {
  if (score >= 75) return '#16a34a';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function aiScoreBg(score: number): string {
  if (score >= 75) return '#dcfce7';
  if (score >= 50) return '#fef3c7';
  return '#fee2e2';
}

const JOB_TYPE_LABELS: Record<JobType, string> = {
  full_time: 'Full Time',
  part_time: 'Part Time',
  contract: 'Contract',
  internship: 'Intern',
};

const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  active: 'Active',
  paused: 'Paused',
  closed: 'Closed',
  draft: 'Draft',
};

const STAGE_LABELS: Record<CandidateStage, string> = {
  applied: 'Applied',
  ai_screened: 'AI Screened',
  shortlisted: 'Shortlisted',
  interview_1: 'Interview 1',
  interview_2: 'Interview 2',
  final_interview: 'Final',
  offer_sent: 'Offer Sent',
  offer_accepted: 'Offer Accepted',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

const KANBAN_STAGES: CandidateStage[] = [
  'applied', 'ai_screened', 'shortlisted',
  'interview_1', 'interview_2', 'final_interview',
  'offer_sent', 'hired',
];

const OFFER_STATUS_LABELS: Record<OfferStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  accepted: 'Accepted',
  rejected: 'Rejected',
  expired: 'Expired',
};

const ONBOARDING_CATEGORY_LABELS: Record<OnboardingCategory, string> = {
  documents: 'Documents',
  it_setup: 'IT Setup',
  orientation: 'Orientation',
  training: 'Training',
  compliance: 'Compliance',
  other: 'Other',
};

const REC_LABELS: Record<InterviewRec, string> = {
  strong_yes: 'Strong Yes',
  yes: 'Yes',
  maybe: 'Maybe',
  no: 'No',
  strong_no: 'Strong No',
};

// ─── Default onboarding tasks ────────────────────────────────────────────────
function buildDefaultOnboardingTasks(candidateId: string): Omit<OnboardingTask, 'id'>[] {
  const tasks: Array<{ task: string; category: OnboardingCategory }> = [
    { task: 'Collect signed offer letter', category: 'documents' },
    { task: 'Collect ID proof (Aadhaar/PAN)', category: 'documents' },
    { task: 'Collect educational certificates', category: 'documents' },
    { task: 'Bank account details for payroll', category: 'documents' },
    { task: 'Create company email account', category: 'it_setup' },
    { task: 'Set up laptop/workstation', category: 'it_setup' },
    { task: 'Add to Slack/communication tools', category: 'it_setup' },
    { task: 'Grant access to required systems', category: 'it_setup' },
    { task: 'Schedule Day 1 orientation', category: 'orientation' },
    { task: 'Introduce to team', category: 'orientation' },
    { task: 'Office/remote setup walkthrough', category: 'orientation' },
    { task: 'Share company handbook', category: 'orientation' },
    { task: 'Product/domain onboarding session', category: 'training' },
    { task: 'Process and tools training', category: 'training' },
    { task: 'Assign buddy/mentor', category: 'training' },
    { task: 'NDA signed', category: 'compliance' },
    { task: 'Employment agreement signed', category: 'compliance' },
    { task: 'Background verification initiated', category: 'compliance' },
    { task: 'Add to payroll', category: 'compliance' },
  ];
  return tasks.map(t => ({
    ...t,
    candidateId,
    assignedTo: '',
    dueDate: '',
    status: 'pending' as const,
    notes: '',
  }));
}

// ─── Small reusable components ───────────────────────────────────────────────
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{ color, background: bg, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 999 }}>
      {label}
    </span>
  );
}

function JobStatusBadge({ status }: { status: JobStatus }) {
  const map: Record<JobStatus, { color: string; bg: string }> = {
    active:  { color: '#16a34a', bg: '#dcfce7' },
    paused:  { color: '#d97706', bg: '#fef3c7' },
    closed:  { color: '#6b7280', bg: '#f3f4f6' },
    draft:   { color: '#64748b', bg: '#f1f5f9' },
  };
  const s = map[status];
  return <Badge label={JOB_STATUS_LABELS[status]} color={s.color} bg={s.bg} />;
}

function JobTypeBadge({ type }: { type: JobType }) {
  return <Badge label={JOB_TYPE_LABELS[type]} color={PRIMARY} bg={`${PRIMARY}15`} />;
}

function StageBadge({ stage }: { stage: CandidateStage }) {
  const map: Record<CandidateStage, { color: string; bg: string }> = {
    applied:        { color: '#2563eb', bg: '#dbeafe' },
    ai_screened:    { color: '#7c3aed', bg: '#ede9fe' },
    shortlisted:    { color: '#0891b2', bg: '#e0f2fe' },
    interview_1:    { color: '#d97706', bg: '#fef3c7' },
    interview_2:    { color: '#ea580c', bg: '#ffedd5' },
    final_interview:{ color: '#c026d3', bg: '#fae8ff' },
    offer_sent:     { color: '#0369a1', bg: '#e0f2fe' },
    offer_accepted: { color: '#16a34a', bg: '#dcfce7' },
    hired:          { color: '#15803d', bg: '#bbf7d0' },
    rejected:       { color: '#dc2626', bg: '#fee2e2' },
    withdrawn:      { color: '#6b7280', bg: '#f3f4f6' },
  };
  const s = map[stage];
  return <Badge label={STAGE_LABELS[stage]} color={s.color} bg={s.bg} />;
}

function OfferStatusBadge({ status }: { status: OfferStatus }) {
  const map: Record<OfferStatus, { color: string; bg: string }> = {
    draft:    { color: '#6b7280', bg: '#f3f4f6' },
    sent:     { color: '#2563eb', bg: '#dbeafe' },
    accepted: { color: '#16a34a', bg: '#dcfce7' },
    rejected: { color: '#dc2626', bg: '#fee2e2' },
    expired:  { color: '#d97706', bg: '#fef3c7' },
  };
  const s = map[status];
  return <Badge label={OFFER_STATUS_LABELS[status]} color={s.color} bg={s.bg} />;
}

function Modal({ title, onClose, children, wide }: {
  title: string; onClose: () => void; children: React.ReactNode; wide?: boolean;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 12, width: wide ? 760 : 560, maxWidth: '95vw',
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: PRIMARY }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="#6b7280" />
          </button>
        </div>
        <div style={{ padding: '20px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db',
  fontSize: 13, color: '#111827', background: '#fff', boxSizing: 'border-box',
};

const btnPrimary: React.CSSProperties = {
  background: PRIMARY, color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const btnAccent: React.CSSProperties = {
  background: ACCENT, color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const btnOutline: React.CSSProperties = {
  background: '#fff', color: PRIMARY, border: `1px solid ${PRIMARY}`, borderRadius: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const btnDanger: React.CSSProperties = {
  background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

const btnGray: React.CSSProperties = {
  background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', borderRadius: 6,
  padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

// ─── Multi-line list field (requirements, nice-to-have) ──────────────────────
function MultiListField({ label, items, onChange }: {
  label: string; items: string[]; onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState('');
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { onChange([...items, input.trim()]); setInput(''); e.preventDefault(); } }}
          placeholder="Type and press Enter"
        />
        <button style={btnPrimary} type="button" onClick={() => { if (input.trim()) { onChange([...items, input.trim()]); setInput(''); } }}>
          <Plus size={14} />
        </button>
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, background: BG, borderRadius: 4, padding: '4px 8px', fontSize: 13 }}>
          <span style={{ flex: 1 }}>{item}</span>
          <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <X size={12} color="#dc2626" />
          </button>
        </div>
      ))}
    </Field>
  );
}

// ─── Multi interviewer field ──────────────────────────────────────────────────
function MultiInterviewerField({ label, items, onChange }: {
  label: string; items: string[]; onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState('');
  return (
    <Field label={label}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
        <input
          style={{ ...inputStyle, flex: 1 }}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && input.trim()) { onChange([...items, input.trim()]); setInput(''); e.preventDefault(); } }}
          placeholder="Add name and press Enter"
        />
        <button style={btnPrimary} type="button" onClick={() => { if (input.trim()) { onChange([...items, input.trim()]); setInput(''); } }}>
          <Plus size={14} />
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {items.map((item, i) => (
          <span key={i} style={{ background: `${PRIMARY}15`, color: PRIMARY, fontSize: 12, padding: '2px 8px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
            {item}
            <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <X size={10} />
            </button>
          </span>
        ))}
      </div>
    </Field>
  );
}

// ─── Job Form Modal ───────────────────────────────────────────────────────────
interface JobFormState {
  title: string; department: string; location: string;
  type: JobType; status: JobStatus; description: string;
  requirements: string[]; niceToHave: string[];
  salaryMin: string; salaryMax: string; hiringManager: string;
  targetDate: string; companyId: string;
}

function JobFormModal({ initial, companies, onSave, onClose }: {
  initial?: JobOpening;
  companies: Array<{ id: string; name: string }>;
  onSave: (data: JobFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<JobFormState>({
    title: initial?.title ?? '',
    department: initial?.department ?? '',
    location: initial?.location ?? '',
    type: initial?.type ?? 'full_time',
    status: initial?.status ?? 'draft',
    description: initial?.description ?? '',
    requirements: initial?.requirements ?? [],
    niceToHave: initial?.niceToHave ?? [],
    salaryMin: initial?.salaryMin ?? '',
    salaryMax: initial?.salaryMax ?? '',
    hiringManager: initial?.hiringManager ?? '',
    targetDate: initial?.targetDate ?? '',
    companyId: initial?.companyId ?? '',
  });

  const set = (k: keyof JobFormState, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title={initial ? 'Edit Job Opening' : 'New Job Opening'} onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Field label="Job Title *">
          <input style={inputStyle} value={form.title} onChange={e => set('title', e.target.value)} placeholder="e.g. Investment Analyst" />
        </Field>
        <Field label="Department">
          <input style={inputStyle} value={form.department} onChange={e => set('department', e.target.value)} placeholder="e.g. Investments" />
        </Field>
        <Field label="Location">
          <input style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Mumbai, Remote" />
        </Field>
        <Field label="Type">
          <select style={inputStyle} value={form.type} onChange={e => set('type', e.target.value as JobType)}>
            <option value="full_time">Full Time</option>
            <option value="part_time">Part Time</option>
            <option value="contract">Contract</option>
            <option value="internship">Internship</option>
          </select>
        </Field>
        <Field label="Status">
          <select style={inputStyle} value={form.status} onChange={e => set('status', e.target.value as JobStatus)}>
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
        <Field label="Hiring Manager">
          <input style={inputStyle} value={form.hiringManager} onChange={e => set('hiringManager', e.target.value)} placeholder="e.g. Rahul Sharma" />
        </Field>
        <Field label="Salary Min (₹)">
          <input style={inputStyle} value={form.salaryMin} onChange={e => set('salaryMin', e.target.value)} placeholder="e.g. 12,00,000" />
        </Field>
        <Field label="Salary Max (₹)">
          <input style={inputStyle} value={form.salaryMax} onChange={e => set('salaryMax', e.target.value)} placeholder="e.g. 18,00,000" />
        </Field>
        <Field label="Target Date">
          <input style={inputStyle} type="date" value={form.targetDate} onChange={e => set('targetDate', e.target.value)} />
        </Field>
        <Field label="Linked Company (optional)">
          <select style={inputStyle} value={form.companyId} onChange={e => set('companyId', e.target.value)}>
            <option value="">— None —</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      <Field label="Job Description">
        <textarea style={{ ...inputStyle, minHeight: 80 }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe the role..." />
      </Field>
      <MultiListField label="Requirements" items={form.requirements} onChange={v => set('requirements', v)} />
      <MultiListField label="Nice to Have" items={form.niceToHave} onChange={v => set('niceToHave', v)} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button style={btnGray} onClick={onClose}>Cancel</button>
        <button style={btnPrimary} onClick={() => { if (form.title.trim()) onSave(form); }}>
          {initial ? 'Save Changes' : 'Create Job'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Candidate Form Modal ────────────────────────────────────────────────────
interface CandidateFormState {
  jobId: string; name: string; email: string; phone: string;
  linkedInUrl: string; resumeText: string; resumeUrl: string;
  currentCompany: string; currentRole: string; noticePeriod: string;
  expectedCTC: string; currentCTC: string; location: string;
  source: string; notes: string;
}

function CandidateFormModal({ jobs, onSave, onClose }: {
  jobs: JobOpening[];
  onSave: (data: CandidateFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CandidateFormState>({
    jobId: jobs[0]?.id ?? '',
    name: '', email: '', phone: '', linkedInUrl: '',
    resumeText: '', resumeUrl: '',
    currentCompany: '', currentRole: '', noticePeriod: '',
    expectedCTC: '', currentCTC: '', location: '',
    source: 'LinkedIn', notes: '',
  });
  const set = (k: keyof CandidateFormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <Modal title="Add Candidate" onClose={onClose} wide>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Job Opening *">
            <select style={inputStyle} value={form.jobId} onChange={e => set('jobId', e.target.value)}>
              {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Full Name *"><input style={inputStyle} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Candidate name" /></Field>
        <Field label="Email *"><input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="candidate@email.com" /></Field>
        <Field label="Phone"><input style={inputStyle} value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" /></Field>
        <Field label="LinkedIn URL"><input style={inputStyle} value={form.linkedInUrl} onChange={e => set('linkedInUrl', e.target.value)} placeholder="https://linkedin.com/in/..." /></Field>
        <Field label="Current Company"><input style={inputStyle} value={form.currentCompany} onChange={e => set('currentCompany', e.target.value)} /></Field>
        <Field label="Current Role"><input style={inputStyle} value={form.currentRole} onChange={e => set('currentRole', e.target.value)} /></Field>
        <Field label="Notice Period"><input style={inputStyle} value={form.noticePeriod} onChange={e => set('noticePeriod', e.target.value)} placeholder="e.g. 30 days" /></Field>
        <Field label="Current CTC (₹)"><input style={inputStyle} value={form.currentCTC} onChange={e => set('currentCTC', e.target.value)} /></Field>
        <Field label="Expected CTC (₹)"><input style={inputStyle} value={form.expectedCTC} onChange={e => set('expectedCTC', e.target.value)} /></Field>
        <Field label="Location"><input style={inputStyle} value={form.location} onChange={e => set('location', e.target.value)} /></Field>
        <Field label="Source">
          <select style={inputStyle} value={form.source} onChange={e => set('source', e.target.value)}>
            {['LinkedIn', 'Referral', 'Job Board', 'Website', 'Other'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Resume URL"><input style={inputStyle} value={form.resumeUrl} onChange={e => set('resumeUrl', e.target.value)} placeholder="https://..." /></Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Resume Text (paste here for AI screening)">
            <textarea style={{ ...inputStyle, minHeight: 100 }} value={form.resumeText} onChange={e => set('resumeText', e.target.value)} placeholder="Paste the full resume text for AI screening..." />
          </Field>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 60 }} value={form.notes} onChange={e => set('notes', e.target.value)} /></Field>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button style={btnGray} onClick={onClose}>Cancel</button>
        <button style={btnPrimary} onClick={() => { if (form.name.trim() && form.email.trim()) onSave(form); }}>
          Add Candidate
        </button>
      </div>
    </Modal>
  );
}

// ─── Interview Schedule Modal ─────────────────────────────────────────────────
interface InterviewFormState {
  round: string; interviewers: string[]; date: string; time: string;
  duration: number; mode: InterviewMode; meetLink: string;
}

function InterviewModal({ candidate, job, onSave, onClose }: {
  candidate: Candidate;
  job: JobOpening | undefined;
  onSave: (data: InterviewFormState) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<InterviewFormState>({
    round: 'Round 1 - HR Screen', interviewers: [], date: today(),
    time: '10:00', duration: 60, mode: 'video', meetLink: '',
  });
  const set = <K extends keyof InterviewFormState>(k: K, v: InterviewFormState[K]) => setForm(f => ({ ...f, [k]: v }));

  function openGoogleCalendar() {
    const startDt = `${form.date.replace(/-/g, '')}T${form.time.replace(':', '')}00`;
    const endDate = new Date(`${form.date}T${form.time}:00`);
    endDate.setMinutes(endDate.getMinutes() + form.duration);
    const endDt = endDate.toISOString().replace(/[-:]/g, '').slice(0, 15);
    const title = encodeURIComponent(`${form.round} — ${candidate.name} for ${job?.title ?? 'Role'}`);
    const guests = encodeURIComponent([candidate.email, ...form.interviewers].filter(Boolean).join(','));
    const details = encodeURIComponent(form.meetLink ? `Meeting link: ${form.meetLink}` : '');
    window.open(`https://calendar.google.com/calendar/r/eventedit?text=${title}&dates=${startDt}/${endDt}&add=${guests}&details=${details}`, '_blank');
  }

  return (
    <Modal title={`Schedule Interview — ${candidate.name}`} onClose={onClose}>
      <Field label="Round">
        <input style={inputStyle} value={form.round} onChange={e => set('round', e.target.value)} placeholder="e.g. Round 1 - Technical" />
      </Field>
      <MultiInterviewerField label="Interviewers" items={form.interviewers} onChange={v => set('interviewers', v)} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
        <Field label="Date"><input style={inputStyle} type="date" value={form.date} onChange={e => set('date', e.target.value)} /></Field>
        <Field label="Time"><input style={inputStyle} type="time" value={form.time} onChange={e => set('time', e.target.value)} /></Field>
        <Field label="Duration">
          <select style={inputStyle} value={form.duration} onChange={e => set('duration', Number(e.target.value))}>
            {[15, 30, 45, 60].map(d => <option key={d} value={d}>{d} min</option>)}
          </select>
        </Field>
        <Field label="Mode">
          <select style={inputStyle} value={form.mode} onChange={e => set('mode', e.target.value as InterviewMode)}>
            <option value="video">Video</option>
            <option value="phone">Phone</option>
            <option value="in_person">In-Person</option>
          </select>
        </Field>
      </div>
      <Field label="Meeting Link (optional)">
        <input style={inputStyle} value={form.meetLink} onChange={e => set('meetLink', e.target.value)} placeholder="https://meet.google.com/..." />
      </Field>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 8 }}>
        <button style={btnOutline} onClick={openGoogleCalendar}>
          <Calendar size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          Open Google Calendar
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnGray} onClick={onClose}>Cancel</button>
          <button style={btnPrimary} onClick={() => onSave(form)}>Schedule</button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Offer Form Modal ─────────────────────────────────────────────────────────
interface OfferFormState {
  candidateId: string; designation: string; department: string;
  startDate: string; expiryDate: string;
  fixedPay: string; variablePay: string; equity: string; notes: string;
}

function OfferFormModal({ candidates, jobs, initial, onSave, onClose }: {
  candidates: Candidate[];
  jobs: JobOpening[];
  initial?: OfferLetter;
  onSave: (data: OfferFormState, draft: boolean) => void;
  onClose: () => void;
}) {
  const finalCandidates = candidates.filter(c => c.stage === 'final_interview' || c.stage === 'offer_sent' || c.stage === 'offer_accepted');
  const [form, setForm] = useState<OfferFormState>({
    candidateId: initial?.candidateId ?? finalCandidates[0]?.id ?? '',
    designation: initial?.designation ?? '',
    department: initial?.department ?? '',
    startDate: initial?.startDate ?? '',
    expiryDate: initial?.expiryDate ?? '',
    fixedPay: initial?.fixedPay ?? '',
    variablePay: initial?.variablePay ?? '',
    equity: initial?.equity ?? '',
    notes: initial?.notes ?? '',
  });
  const set = (k: keyof OfferFormState, v: string) => setForm(f => ({ ...f, [k]: v }));

  const selectedCandidate = candidates.find(c => c.id === form.candidateId);
  const linkedJob = selectedCandidate ? jobs.find(j => j.id === selectedCandidate.jobId) : undefined;

  const totalCTC = () => {
    const fixed = parseFloat(form.fixedPay.replace(/,/g, '')) || 0;
    const variable = parseFloat(form.variablePay.replace(/,/g, '')) || 0;
    return (fixed + variable).toLocaleString('en-IN');
  };

  function generateOfferText(): string {
    const candidate = candidates.find(c => c.id === form.candidateId);
    const cname = candidate?.name ?? 'Candidate';
    return `OFFER LETTER

Date: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}

Dear ${cname},

We are delighted to extend this offer of employment to you at Cactus Partners.

POSITION DETAILS
Designation: ${form.designation}
Department: ${form.department}
Reporting To: ${linkedJob?.hiringManager ?? 'Management'}
Start Date: ${form.startDate ? new Date(form.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}

COMPENSATION BREAKDOWN
Fixed Pay (per annum): ₹${form.fixedPay || '—'}
Variable Pay (per annum): ₹${form.variablePay || '0'}
${form.equity ? `Equity / ESOPs: ${form.equity}` : ''}
Total CTC (per annum): ₹${totalCTC()}

OFFER VALIDITY
This offer is valid until: ${form.expiryDate ? new Date(form.expiryDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}

${form.notes ? `ADDITIONAL TERMS\n${form.notes}` : ''}

This offer is contingent upon satisfactory completion of a background verification check and submission of all required documents.

We look forward to welcoming you to the Cactus Partners family.

Warm regards,
Talent Acquisition Team
Cactus Partners
portfolio@cactuspartners.in`;
  }

  const [showPreview, setShowPreview] = useState(false);
  const [offerText, setOfferText] = useState('');

  function handleGenerateAndSend() {
    const text = generateOfferText();
    setOfferText(text);
    setShowPreview(true);
  }

  function sendViaEmail() {
    const candidate = candidates.find(c => c.id === form.candidateId);
    if (!candidate) return;
    const subject = encodeURIComponent(`Offer Letter - ${form.designation} at Cactus Partners`);
    const body = encodeURIComponent(offerText);
    window.location.href = `mailto:${candidate.email}?subject=${subject}&body=${body}`;
    onSave(form, false);
  }

  if (showPreview) {
    return (
      <Modal title="Offer Letter Preview" onClose={onClose} wide>
        <pre style={{ background: BG, padding: 16, borderRadius: 8, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif', color: '#111827' }}>
          {offerText}
        </pre>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
          <button style={btnGray} onClick={() => setShowPreview(false)}>Back</button>
          <button style={btnOutline} onClick={() => navigator.clipboard.writeText(offerText)}>
            <Copy size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Copy Offer Letter
          </button>
          <button style={btnAccent} onClick={sendViaEmail}>
            <Send size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Send via Email
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal title={initial ? 'Edit Offer Letter' : 'New Offer Letter'} onClose={onClose} wide>
      {finalCandidates.length === 0 ? (
        <p style={{ color: '#6b7280', fontSize: 13 }}>No candidates in Final Interview stage. Move candidates to Final Interview first.</p>
      ) : (
        <>
          <Field label="Candidate *">
            <select style={inputStyle} value={form.candidateId} onChange={e => set('candidateId', e.target.value)}>
              {finalCandidates.map(c => <option key={c.id} value={c.id}>{c.name} — {jobs.find(j => j.id === c.jobId)?.title ?? 'Unknown Role'}</option>)}
            </select>
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Field label="Designation *"><input style={inputStyle} value={form.designation} onChange={e => set('designation', e.target.value)} /></Field>
            <Field label="Department"><input style={inputStyle} value={form.department} onChange={e => set('department', e.target.value)} /></Field>
            <Field label="Start Date"><input style={inputStyle} type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} /></Field>
            <Field label="Offer Expiry Date"><input style={inputStyle} type="date" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} /></Field>
            <Field label="Fixed Pay (₹ p.a.)"><input style={inputStyle} value={form.fixedPay} onChange={e => set('fixedPay', e.target.value)} placeholder="12,00,000" /></Field>
            <Field label="Variable Pay (₹ p.a.)"><input style={inputStyle} value={form.variablePay} onChange={e => set('variablePay', e.target.value)} placeholder="2,00,000" /></Field>
            <Field label="Equity / ESOPs (optional)"><input style={inputStyle} value={form.equity} onChange={e => set('equity', e.target.value)} placeholder="0.25% vesting over 4 years" /></Field>
          </div>
          <Field label="Notes / Additional Terms">
            <textarea style={{ ...inputStyle, minHeight: 60 }} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button style={btnGray} onClick={onClose}>Cancel</button>
            <button style={btnOutline} onClick={() => onSave(form, true)}>Save Draft</button>
            <button style={btnAccent} onClick={handleGenerateAndSend}>Generate &amp; Send</button>
          </div>
        </>
      )}
    </Modal>
  );
}

// ─── Candidate Profile Panel ──────────────────────────────────────────────────
function CandidateProfile({ candidate, jobs, interviews, onClose, onUpdate, onDelete, onScheduleInterview, onMoveStage, onOpenOffer, onOpenOnboarding }: {
  candidate: Candidate;
  jobs: JobOpening[];
  interviews: Interview[];
  onClose: () => void;
  onUpdate: (c: Candidate) => void;
  onDelete: (id: string) => void;
  onScheduleInterview: () => void;
  onMoveStage: (stage: CandidateStage) => void;
  onOpenOffer: () => void;
  onOpenOnboarding: () => void;
}) {
  const job = jobs.find(j => j.id === candidate.jobId);
  const candidateInterviews = interviews.filter(iv => iv.candidateId === candidate.id);
  const [notes, setNotes] = useState(candidate.notes);
  const [resume, setResume] = useState(candidate.resumeText);
  const [isRunningAI, setIsRunningAI] = useState(false);
  const [aiScore, setAiScore] = useState(candidate.aiScore);
  const [aiSummary, setAiSummary] = useState(candidate.aiSummary);

  function runAIScreen() {
    if (!job || !resume.trim()) return;
    setIsRunningAI(true);
    setTimeout(() => {
      const requirements = job.requirements;
      if (requirements.length === 0) {
        setAiScore(0);
        setAiSummary('No requirements defined for this job.');
        onUpdate({ ...candidate, aiScore: 0, aiSummary: 'No requirements defined for this job.' });
        setIsRunningAI(false);
        return;
      }
      const resumeLower = resume.toLowerCase();
      const matched: string[] = [];
      const missing: string[] = [];
      requirements.forEach(req => {
        const keywords = req.toLowerCase().split(/\s+/);
        const hit = keywords.some(kw => kw.length > 2 && resumeLower.includes(kw));
        if (hit) matched.push(req);
        else missing.push(req);
      });
      const score = Math.round((matched.length / requirements.length) * 100);
      const summary = `Matched ${matched.length}/${requirements.length} requirements. Strong: ${matched.slice(0, 3).join(', ') || 'None'}. Missing: ${missing.slice(0, 3).join(', ') || 'None'}.`;
      setAiScore(score);
      setAiSummary(summary);
      onUpdate({ ...candidate, aiScore: score, aiSummary: summary, resumeText: resume });
      setIsRunningAI(false);
    }, 800);
  }

  function saveNotes() {
    onUpdate({ ...candidate, notes });
  }

  function saveResume() {
    onUpdate({ ...candidate, resumeText: resume });
  }

  const sendInterviewReminder = () => {
    const lastIv = candidateInterviews[candidateInterviews.length - 1];
    const dateStr = lastIv ? lastIv.scheduledAt : 'TBD';
    const subject = encodeURIComponent(`Interview Reminder - ${job?.title ?? 'Role'}`);
    const body = encodeURIComponent(`Dear ${candidate.name},\n\nThis is a reminder for your upcoming interview for the ${job?.title ?? ''} position at Cactus Partners.\n\nDate/Time: ${dateStr}\n${lastIv?.meetLink ? `Meeting Link: ${lastIv.meetLink}` : ''}\n\nLooking forward to speaking with you.\n\nWarm regards,\nCactus Partners`);
    window.location.href = `mailto:${candidate.email}?subject=${subject}&body=${body}`;
  };

  const canSeeOffer = candidate.stage === 'final_interview' || candidate.stage === 'offer_sent' || candidate.stage === 'offer_accepted';
  const canSeeOnboarding = candidate.stage === 'hired';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 900, display: 'flex',
    }}>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.3)' }} onClick={onClose} />
      <div style={{
        width: 540, background: '#fff', height: '100%', overflowY: 'auto',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', background: PRIMARY, color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{candidate.name}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 13, opacity: 0.85 }}>{candidate.currentRole} {candidate.currentCompany ? `at ${candidate.currentCompany}` : ''}</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.7 }}>{job?.title ?? 'Unknown Role'}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: '20px 24px', flex: 1 }}>
          {/* Stage + Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <select
              style={{ ...inputStyle, width: 'auto', fontSize: 12 }}
              value={candidate.stage}
              onChange={e => onMoveStage(e.target.value as CandidateStage)}
            >
              {(Object.keys(STAGE_LABELS) as CandidateStage[]).map(s => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
            {canSeeOffer && (
              <button style={{ ...btnOutline, fontSize: 11, padding: '4px 10px' }} onClick={onOpenOffer}>
                <FileText size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Offer Letter
              </button>
            )}
            {canSeeOnboarding && (
              <button style={{ ...btnAccent, fontSize: 11, padding: '4px 10px' }} onClick={onOpenOnboarding}>
                <CheckSquare size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Onboarding
              </button>
            )}
          </div>

          {/* Contact Info */}
          <div style={{ background: BG, borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
              {candidate.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Mail size={13} color={PRIMARY} />
                  <a href={`mailto:${candidate.email}`} style={{ color: PRIMARY, textDecoration: 'none' }}>{candidate.email}</a>
                </div>
              )}
              {candidate.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Phone size={13} color={PRIMARY} />
                  <span>{candidate.phone}</span>
                </div>
              )}
              {candidate.linkedInUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Linkedin size={13} color={PRIMARY} />
                  <a href={candidate.linkedInUrl} target="_blank" rel="noreferrer" style={{ color: PRIMARY, textDecoration: 'none' }}>LinkedIn</a>
                </div>
              )}
              {candidate.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={13} color={PRIMARY} />
                  <span>{candidate.location}</span>
                </div>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 10, fontSize: 12 }}>
              {candidate.noticePeriod && <div><span style={{ color: '#6b7280' }}>Notice: </span><strong>{candidate.noticePeriod}</strong></div>}
              {candidate.currentCTC && <div><span style={{ color: '#6b7280' }}>Current CTC: </span><strong>₹{candidate.currentCTC}</strong></div>}
              {candidate.expectedCTC && <div><span style={{ color: '#6b7280' }}>Expected: </span><strong>₹{candidate.expectedCTC}</strong></div>}
              {candidate.source && <div><span style={{ color: '#6b7280' }}>Source: </span><strong>{candidate.source}</strong></div>}
              <div><span style={{ color: '#6b7280' }}>Applied: </span><strong>{candidate.appliedAt}</strong></div>
            </div>
          </div>

          {/* AI Screening */}
          <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 14, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: PRIMARY }}>AI Screening</h4>
              <button style={btnPrimary} onClick={runAIScreen} disabled={isRunningAI || !resume.trim()}>
                {isRunningAI ? 'Running...' : 'Run AI Screen'}
              </button>
            </div>
            {aiScore > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: aiScoreBg(aiScore), border: `3px solid ${aiScoreColor(aiScore)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ fontSize: 18, fontWeight: 800, color: aiScoreColor(aiScore) }}>{aiScore}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{aiSummary}</p>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
                {resume.trim() ? 'Click "Run AI Screen" to score this candidate.' : 'Add resume text below to enable AI screening.'}
              </p>
            )}
          </div>

          {/* Resume */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Resume Text</label>
              {candidate.resumeUrl && (
                <a href={candidate.resumeUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: PRIMARY, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ExternalLink size={12} />View Resume
                </a>
              )}
            </div>
            <textarea
              style={{ ...inputStyle, minHeight: 100, fontSize: 12 }}
              value={resume}
              onChange={e => setResume(e.target.value)}
              placeholder="Paste resume text here for AI screening..."
            />
            <button style={{ ...btnOutline, fontSize: 11, padding: '4px 10px', marginTop: 4 }} onClick={saveResume}>
              <Save size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Save Resume
            </button>
          </div>

          {/* Interviews */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: PRIMARY }}>Interviews ({candidateInterviews.length})</h4>
              <button style={{ ...btnOutline, fontSize: 11, padding: '4px 10px' }} onClick={onScheduleInterview}>
                <Plus size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Schedule Interview
              </button>
            </div>
            {candidateInterviews.length === 0 ? (
              <p style={{ fontSize: 13, color: '#9ca3af', margin: 0 }}>No interviews scheduled yet.</p>
            ) : (
              candidateInterviews.map(iv => (
                <div key={iv.id} style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, marginBottom: 8, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <strong>{iv.round}</strong>
                      <span style={{ marginLeft: 8, fontSize: 11, background: '#f3f4f6', padding: '1px 6px', borderRadius: 999 }}>{iv.mode}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{iv.scheduledAt}</span>
                  </div>
                  {iv.interviewers.length > 0 && (
                    <p style={{ margin: '4px 0', color: '#6b7280', fontSize: 12 }}>Interviewers: {iv.interviewers.join(', ')}</p>
                  )}
                  {iv.status === 'completed' && (
                    <div style={{ marginTop: 6, borderTop: '1px solid #f3f4f6', paddingTop: 6 }}>
                      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} size={13} fill={s <= iv.rating ? '#f59e0b' : 'none'} color={s <= iv.rating ? '#f59e0b' : '#d1d5db'} />
                        ))}
                        {iv.recommendation && (
                          <span style={{ marginLeft: 6, fontSize: 11, ...( iv.recommendation.includes('yes') ? { color: '#16a34a' } : iv.recommendation === 'no' || iv.recommendation === 'strong_no' ? { color: '#dc2626' } : { color: '#d97706' } ) }}>
                            {REC_LABELS[iv.recommendation]}
                          </span>
                        )}
                      </div>
                      {iv.feedback && <p style={{ margin: 0, color: '#374151', fontSize: 12 }}>{iv.feedback}</p>}
                    </div>
                  )}
                  {iv.meetLink && (
                    <a href={iv.meetLink} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: PRIMARY, display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <ExternalLink size={10} />Join Meeting
                    </a>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Email Actions */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            <button style={{ ...btnOutline, fontSize: 11, padding: '4px 10px' }} onClick={sendInterviewReminder}>
              <Mail size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Send Interview Reminder
            </button>
            {candidate.stage === 'offer_sent' && (
              <button style={{ ...btnOutline, fontSize: 11, padding: '4px 10px' }} onClick={() => {
                const subject = encodeURIComponent(`Following up on your Offer — ${job?.title ?? 'Position'}`);
                const body = encodeURIComponent(`Dear ${candidate.name},\n\nWe wanted to follow up on the offer letter shared with you. Please let us know if you have any questions.\n\nLooking forward to your response.\n\nWarm regards,\nCactus Partners`);
                window.location.href = `mailto:${candidate.email}?subject=${subject}&body=${body}`;
              }}>
                <Mail size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Send Offer Reminder
              </button>
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Notes</label>
            <textarea
              style={{ ...inputStyle, minHeight: 70 }}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Internal notes about this candidate..."
            />
            <button style={{ ...btnOutline, fontSize: 11, padding: '4px 10px', marginTop: 4 }} onClick={saveNotes}>
              <Save size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Save Notes
            </button>
          </div>

          {/* Danger Zone */}
          <div style={{ borderTop: '1px solid #fee2e2', paddingTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              style={{ ...btnDanger, fontSize: 11, padding: '4px 10px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }}
              onClick={() => onMoveStage('rejected')}
            >
              Move to Rejected
            </button>
            <button
              style={{ ...btnGray, fontSize: 11, padding: '4px 10px' }}
              onClick={() => onMoveStage('withdrawn')}
            >
              Mark as Withdrawn
            </button>
            <button
              style={{ ...btnDanger, fontSize: 11, padding: '4px 10px', marginLeft: 'auto' }}
              onClick={() => { if (window.confirm('Delete this candidate permanently?')) onDelete(candidate.id); }}
            >
              <Trash2 size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export default function RecruitmentHub() {
  const {
    store,
    addJobOpening, updateJobOpening, deleteJobOpening,
    addCandidate, updateCandidate, deleteCandidate,
    addInterview,
    addOfferLetter, updateOfferLetter,
    addOnboardingTask, updateOnboardingTask,
  } = useApp();

  const jobs = store.jobOpenings ?? [];
  const candidates = store.candidates ?? [];
  const interviews = store.interviews ?? [];
  const offerLetters = store.offerLetters ?? [];
  const onboardingTasks = store.onboardingTasks ?? [];
  const companies = store.companies ?? [];

  // ─── Tab state ─────────────────────────────────────────────────────────────
  type Tab = 'jobs' | 'pipeline' | 'candidates' | 'offers' | 'onboarding';
  const [activeTab, setActiveTab] = useState<Tab>('jobs');

  // ─── Jobs tab state ────────────────────────────────────────────────────────
  const [jobStatusFilter, setJobStatusFilter] = useState<'all' | JobStatus>('all');
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState<JobOpening | null>(null);
  const [selectedJobDetail, setSelectedJobDetail] = useState<string | null>(null);

  // ─── Pipeline tab state ────────────────────────────────────────────────────
  const [pipelineJobFilter, setPipelineJobFilter] = useState<string>('all');

  // ─── Candidates tab state ──────────────────────────────────────────────────
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateJobFilter, setCandidateJobFilter] = useState<string>('all');
  const [candidateStageFilter, setCandidateStageFilter] = useState<string>('all');
  const [showCandidateForm, setShowCandidateForm] = useState(false);

  // ─── Shared: Candidate Profile panel ──────────────────────────────────────
  const [profileCandidateId, setProfileCandidateId] = useState<string | null>(null);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showOfferModalForCandidate, setShowOfferModalForCandidate] = useState(false);

  // ─── Offers tab state ─────────────────────────────────────────────────────
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState<OfferLetter | null>(null);

  // ─── Onboarding tab state ─────────────────────────────────────────────────
  const [expandedOnboarding, setExpandedOnboarding] = useState<string[]>([]);
  const [showCustomTaskModal, setShowCustomTaskModal] = useState<string | null>(null);
  const [customTask, setCustomTask] = useState({ task: '', category: 'other' as OnboardingCategory, assignedTo: '', dueDate: '', notes: '' });

  // ─── Pipeline / Candidates bulk stage dropdowns ────────────────────────────
  const [pipelineBulkStage, setPipelineBulkStage] = useState<CandidateStage>('shortlisted');
  const [candidateBulkStage, setCandidateBulkStage] = useState<CandidateStage>('shortlisted');

  // ─── Derived ───────────────────────────────────────────────────────────────
  const profileCandidate = profileCandidateId ? candidates.find(c => c.id === profileCandidateId) ?? null : null;

  const filteredJobs = useMemo(() =>
    jobs.filter(j => jobStatusFilter === 'all' || j.status === jobStatusFilter),
    [jobs, jobStatusFilter]
  );

  const filteredPipelineCandidates = useMemo(() =>
    candidates.filter(c => pipelineJobFilter === 'all' || c.jobId === pipelineJobFilter),
    [candidates, pipelineJobFilter]
  );

  const filteredCandidates = useMemo(() => {
    let list = candidates;
    if (candidateJobFilter !== 'all') list = list.filter(c => c.jobId === candidateJobFilter);
    if (candidateStageFilter !== 'all') list = list.filter(c => c.stage === candidateStageFilter);
    if (candidateSearch.trim()) {
      const q = candidateSearch.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }
    return list;
  }, [candidates, candidateJobFilter, candidateStageFilter, candidateSearch]);

  const hiredCandidates = useMemo(() => candidates.filter(c => c.stage === 'hired'), [candidates]);

  // ─── Bulk select hooks (after derived lists) ───────────────────────────────
  const bulkCandidates = useBulkSelect(filteredCandidates);
  const bulkPipeline   = useBulkSelect(filteredPipelineCandidates);

  // ─── Job actions ───────────────────────────────────────────────────────────
  function handleSaveJob(data: JobFormState) {
    if (editingJob) {
      updateJobOpening({ ...editingJob, ...data });
    } else {
      addJobOpening({
        id: generateId(), ...data, createdAt: today(),
        companyId: data.companyId || undefined,
      });
    }
    setShowJobForm(false);
    setEditingJob(null);
  }

  function handleDeleteJob(id: string) {
    if (window.confirm('Delete this job opening?')) deleteJobOpening(id);
  }

  // ─── Candidate actions ────────────────────────────────────────────────────
  function handleSaveCandidate(data: CandidateFormState) {
    addCandidate({
      id: generateId(),
      ...data,
      stage: 'applied',
      appliedAt: today(),
      aiScore: 0,
      aiSummary: '',
      tags: [],
    });
    setShowCandidateForm(false);
  }

  function handleMoveStage(candidateId: string, stage: CandidateStage) {
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return;
    updateCandidate({ ...candidate, stage });
    // Auto-create onboarding tasks when moved to hired
    if (stage === 'hired') {
      const existing = onboardingTasks.filter(t => t.candidateId === candidateId);
      if (existing.length === 0) {
        buildDefaultOnboardingTasks(candidateId).forEach(t => {
          addOnboardingTask({ id: generateId(), ...t });
        });
      }
    }
  }

  function handleDeleteCandidate(id: string) {
    deleteCandidate(id);
    setProfileCandidateId(null);
  }

  // ─── AI Screen All ────────────────────────────────────────────────────────
  function runAIScreenAll() {
    const toScreen = candidates.filter(c => c.resumeText.trim() && c.aiScore === 0);
    toScreen.forEach(candidate => {
      const job = jobs.find(j => j.id === candidate.jobId);
      if (!job || job.requirements.length === 0) return;
      const resumeLower = candidate.resumeText.toLowerCase();
      const matched: string[] = [];
      const missing: string[] = [];
      job.requirements.forEach(req => {
        const keywords = req.toLowerCase().split(/\s+/);
        const hit = keywords.some(kw => kw.length > 2 && resumeLower.includes(kw));
        if (hit) matched.push(req);
        else missing.push(req);
      });
      const score = Math.round((matched.length / job.requirements.length) * 100);
      const summary = `Matched ${matched.length}/${job.requirements.length} requirements. Strong: ${matched.slice(0, 3).join(', ') || 'None'}. Missing: ${missing.slice(0, 3).join(', ') || 'None'}.`;
      updateCandidate({ ...candidate, aiScore: score, aiSummary: summary });
    });
  }

  // ─── AI Screen a single candidate (used by bulk action) ──────────────────
  // ─── CSV helpers ──────────────────────────────────────────────────────────
  // ─── Interview actions ────────────────────────────────────────────────────
  function handleSaveInterview(data: InterviewFormState) {
    if (!profileCandidate) return;
    addInterview({
      id: generateId(),
      candidateId: profileCandidate.id,
      jobId: profileCandidate.jobId,
      round: data.round,
      interviewers: data.interviewers,
      scheduledAt: `${data.date} ${data.time}`,
      duration: data.duration,
      mode: data.mode,
      meetLink: data.meetLink || undefined,
      feedback: '',
      rating: 0,
      recommendation: 'maybe',
      status: 'scheduled',
    });
    updateCandidate({ ...profileCandidate, stage: 'interview_1' });
    setShowInterviewModal(false);
  }

  // ─── Offer actions ────────────────────────────────────────────────────────
  function handleSaveOffer(data: OfferFormState, draft: boolean) {
    const candidate = candidates.find(c => c.id === data.candidateId);
    void (candidate ? jobs.find(j => j.id === candidate.jobId) : undefined);
    if (editingOffer) {
      updateOfferLetter({
        ...editingOffer,
        ...data,
        ctc: `${data.fixedPay} + ${data.variablePay}`,
        status: draft ? 'draft' : 'sent',
        sentAt: draft ? editingOffer.sentAt : today(),
      });
    } else {
      const offerId = generateId();
      addOfferLetter({
        id: offerId,
        candidateId: data.candidateId,
        jobId: candidate?.jobId ?? '',
        designation: data.designation,
        department: data.department,
        startDate: data.startDate,
        expiryDate: data.expiryDate,
        ctc: `${data.fixedPay} + ${data.variablePay}`,
        fixedPay: data.fixedPay,
        variablePay: data.variablePay,
        equity: data.equity,
        notes: data.notes,
        status: draft ? 'draft' : 'sent',
        sentAt: draft ? undefined : today(),
        createdAt: today(),
        respondedAt: undefined,
      });
      if (!draft && candidate) {
        updateCandidate({ ...candidate, stage: 'offer_sent' });
      }
    }
    setShowOfferForm(false);
    setEditingOffer(null);
    setShowOfferModalForCandidate(false);
  }

  function handleOfferAccept(offer: OfferLetter) {
    const candidate = candidates.find(c => c.id === offer.candidateId);
    updateOfferLetter({ ...offer, status: 'accepted', respondedAt: today() });
    if (candidate) {
      updateCandidate({ ...candidate, stage: 'hired' });
      const existing = onboardingTasks.filter(t => t.candidateId === candidate.id);
      if (existing.length === 0) {
        buildDefaultOnboardingTasks(candidate.id).forEach(t => {
          addOnboardingTask({ id: generateId(), ...t });
        });
      }
    }
  }

  function handleOfferReject(offer: OfferLetter) {
    const candidate = candidates.find(c => c.id === offer.candidateId);
    updateOfferLetter({ ...offer, status: 'rejected', respondedAt: today() });
    if (candidate) updateCandidate({ ...candidate, stage: 'rejected' });
  }

  // ─── Onboarding actions ───────────────────────────────────────────────────
  function cycleTaskStatus(task: OnboardingTask) {
    const next: Record<string, OnboardingTask['status']> = { pending: 'in_progress', in_progress: 'done', done: 'pending' };
    updateOnboardingTask({ ...task, status: next[task.status] });
  }

  function handleAddCustomTask(candidateId: string) {
    addOnboardingTask({ id: generateId(), candidateId, status: 'pending', ...customTask });
    setShowCustomTaskModal(null);
    setCustomTask({ task: '', category: 'other', assignedTo: '', dueDate: '', notes: '' });
  }

  // ─── Tab nav ──────────────────────────────────────────────────────────────
  const tabs: Array<{ key: Tab; label: string; icon: React.ReactNode }> = [
    { key: 'jobs', label: 'Jobs', icon: <Briefcase size={15} /> },
    { key: 'pipeline', label: 'Pipeline', icon: <Kanban size={15} /> },
    { key: 'candidates', label: 'Candidates', icon: <Users size={15} /> },
    { key: 'offers', label: 'Offers', icon: <FileText size={15} /> },
    { key: 'onboarding', label: 'Onboarding', icon: <CheckSquare size={15} /> },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: BG, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ background: PRIMARY, padding: '20px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 22, fontWeight: 800 }}>Recruitment Hub</h1>
            <p style={{ margin: '2px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              {jobs.filter(j => j.status === 'active').length} active jobs · {candidates.length} candidates · {hiredCandidates.length} hired
            </p>
          </div>
        </div>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2 }}>
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', border: 'none', cursor: 'pointer',
                borderRadius: '6px 6px 0 0', fontSize: 13, fontWeight: 600,
                background: activeTab === t.key ? '#fff' : 'transparent',
                color: activeTab === t.key ? PRIMARY : 'rgba(255,255,255,0.8)',
                transition: 'all 0.15s',
              }}
            >
              {t.icon}{t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px 32px' }}>

        {/* ═══ TAB 1: JOBS ═══ */}
        {activeTab === 'jobs' && (
          <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['all', 'active', 'draft', 'paused', 'closed'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setJobStatusFilter(s)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: 'none',
                      background: jobStatusFilter === s ? PRIMARY : '#fff',
                      color: jobStatusFilter === s ? '#fff' : '#374151',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    }}
                  >
                    {s === 'all' ? 'All' : JOB_STATUS_LABELS[s as JobStatus]}
                  </button>
                ))}
              </div>
              <button style={btnPrimary} onClick={() => { setEditingJob(null); setShowJobForm(true); }}>
                <Plus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />New Job
              </button>
            </div>

            {/* Job Cards */}
            {filteredJobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                <Briefcase size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                <p style={{ margin: 0 }}>No job openings found.</p>
                <button style={{ ...btnPrimary, marginTop: 12 }} onClick={() => setShowJobForm(true)}>Create your first job</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {filteredJobs.map(job => {
                  const count = candidates.filter(c => c.jobId === job.id).length;
                  const isExpanded = selectedJobDetail === job.id;
                  return (
                    <div key={job.id} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                      <div
                        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'flex-start', gap: 16 }}
                        onClick={() => setSelectedJobDetail(isExpanded ? null : job.id)}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{job.title}</span>
                            <JobStatusBadge status={job.status} />
                            <JobTypeBadge type={job.type} />
                          </div>
                          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', flexWrap: 'wrap' }}>
                            {job.department && <span>{job.department}</span>}
                            {job.location && <span><MapPin size={11} style={{ verticalAlign: 'middle', marginRight: 2 }} />{job.location}</span>}
                            {job.hiringManager && <span>HM: {job.hiringManager}</span>}
                            {job.targetDate && <span>Target: {job.targetDate}</span>}
                            <span style={{ color: PRIMARY, fontWeight: 600 }}>{count} candidate{count !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button style={{ ...btnOutline, fontSize: 11, padding: '4px 10px' }} onClick={e => { e.stopPropagation(); setEditingJob(job); setShowJobForm(true); }}>
                            <Edit2 size={11} />
                          </button>
                          <button style={{ ...btnDanger, fontSize: 11, padding: '4px 8px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }} onClick={e => { e.stopPropagation(); handleDeleteJob(job.id); }}>
                            <Trash2 size={11} />
                          </button>
                          {isExpanded ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                        </div>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>
                          {job.description && <p style={{ margin: '12px 0 8px', fontSize: 13, color: '#374151' }}>{job.description}</p>}
                          {job.requirements.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#374151' }}>Requirements</p>
                              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#4b5563' }}>
                                {job.requirements.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          )}
                          {job.niceToHave.length > 0 && (
                            <div style={{ marginBottom: 10 }}>
                              <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: '#374151' }}>Nice to Have</p>
                              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#4b5563' }}>
                                {job.niceToHave.map((r, i) => <li key={i}>{r}</li>)}
                              </ul>
                            </div>
                          )}
                          {(job.salaryMin || job.salaryMax) && (
                            <p style={{ margin: '0 0 10px', fontSize: 12, color: '#4b5563' }}>
                              Salary: ₹{job.salaryMin} — ₹{job.salaryMax}
                            </p>
                          )}
                          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <button
                              style={btnAccent}
                              onClick={() => {
                                setPipelineJobFilter(job.id);
                                setActiveTab('pipeline');
                              }}
                            >
                              <Eye size={13} style={{ marginRight: 6, verticalAlign: 'middle' }} />
                              View Candidates ({count})
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 2: PIPELINE (Kanban) ═══ */}
        {activeTab === 'pipeline' && (
          <div>
            {/* Job filter */}
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Filter by Job:</label>
              <select
                style={{ ...inputStyle, width: 260 }}
                value={pipelineJobFilter}
                onChange={e => setPipelineJobFilter(e.target.value)}
              >
                <option value="all">All Jobs</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <span style={{ fontSize: 13, color: '#6b7280' }}>
                {filteredPipelineCandidates.filter(c => !['rejected', 'withdrawn'].includes(c.stage)).length} active candidates
              </span>
            </div>

            {/* Kanban board */}
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 16 }}>
              {KANBAN_STAGES.map(stage => {
                const stageCandidates = filteredPipelineCandidates.filter(c => c.stage === stage);
                return (
                  <div key={stage} style={{ minWidth: 200, maxWidth: 220, flexShrink: 0 }}>
                    {/* Column header */}
                    <div style={{
                      background: PRIMARY, color: '#fff', borderRadius: '8px 8px 0 0',
                      padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{STAGE_LABELS[stage]}</span>
                      <span style={{ background: ACCENT, borderRadius: 999, width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                        {stageCandidates.length}
                      </span>
                    </div>
                    {/* Cards */}
                    <div style={{ background: '#f9fafb', borderRadius: '0 0 8px 8px', padding: 6, minHeight: 100 }}>
                      {stageCandidates.map(candidate => {
                        const job = jobs.find(j => j.id === candidate.jobId);
                        const isChecked = bulkPipeline.isSelected(candidate.id);
                        return (
                          <div
                            key={candidate.id}
                            onClick={() => setProfileCandidateId(candidate.id)}
                            style={{
                              background: isChecked ? `${PRIMARY}0f` : '#fff',
                              borderRadius: 6, padding: '10px 12px', marginBottom: 6,
                              boxShadow: '0 1px 4px rgba(0,0,0,0.08)', cursor: 'pointer',
                              borderLeft: `3px solid ${aiScoreColor(candidate.aiScore)}`,
                              transition: 'box-shadow 0.15s', position: 'relative',
                            }}
                          >
                            {/* Checkbox top-left */}
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => bulkPipeline.toggle(candidate.id)}
                              onClick={e => e.stopPropagation()}
                              style={{
                                position: 'absolute', top: 6, right: 6,
                                width: 14, height: 14, cursor: 'pointer',
                                opacity: bulkPipeline.count > 0 ? 1 : 0,
                                transition: 'opacity 0.15s',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLInputElement).style.opacity = '1'; }}
                              onMouseLeave={e => { if (!isChecked && bulkPipeline.count === 0) (e.currentTarget as HTMLInputElement).style.opacity = '0'; }}
                            />
                            <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: '#111827', paddingRight: 18 }}>{candidate.name}</p>
                            <p style={{ margin: '0 0 6px', fontSize: 11, color: '#6b7280' }}>{job?.title ?? 'Unknown Role'}</p>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              {candidate.aiScore > 0 ? (
                                <span style={{ fontSize: 11, fontWeight: 700, color: aiScoreColor(candidate.aiScore), background: aiScoreBg(candidate.aiScore), padding: '1px 6px', borderRadius: 999 }}>
                                  AI: {candidate.aiScore}
                                </span>
                              ) : <span style={{ fontSize: 11, color: '#9ca3af' }}>Unscored</span>}
                              <span style={{ fontSize: 10, color: '#9ca3af' }}>{daysSince(candidate.appliedAt)}d ago</span>
                            </div>
                            {candidate.source && (
                              <span style={{ display: 'inline-block', marginTop: 4, fontSize: 10, background: `${PRIMARY}10`, color: PRIMARY, padding: '1px 6px', borderRadius: 999 }}>
                                {candidate.source}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {stageCandidates.length === 0 && (
                        <p style={{ textAlign: 'center', color: '#d1d5db', fontSize: 11, margin: '20px 0' }}>Empty</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pipeline BulkActionBar */}
            <BulkActionBar
              count={bulkPipeline.count}
              total={filteredPipelineCandidates.length}
              onClear={bulkPipeline.clear}
              onSelectAll={bulkPipeline.toggleAll}
              actions={[
                {
                  label: 'Move to Stage…',
                  variant: 'default',
                  icon: (
                    <select
                      value={pipelineBulkStage}
                      onChange={e => setPipelineBulkStage(e.target.value as CandidateStage)}
                      onClick={e => e.stopPropagation()}
                      style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', outline: 'none' }}
                    >
                      {(Object.keys(STAGE_LABELS) as CandidateStage[]).map(s => (
                        <option key={s} value={s} style={{ color: '#111' }}>{STAGE_LABELS[s]}</option>
                      ))}
                    </select>
                  ),
                  onClick: () => {
                    bulkPipeline.selectedItems.forEach(c => handleMoveStage(c.id, pipelineBulkStage));
                    bulkPipeline.clear();
                  },
                },
                {
                  label: 'Reject All',
                  variant: 'danger',
                  icon: <XCircle size={13} />,
                  onClick: () => {
                    if (window.confirm(`Reject ${bulkPipeline.count} candidate(s)?`)) {
                      bulkPipeline.selectedItems.forEach(c => handleMoveStage(c.id, 'rejected'));
                      bulkPipeline.clear();
                    }
                  },
                },
              ]}
            />

            {/* Rejected / Withdrawn collapsed section */}
            {(() => {
              const inactive = filteredPipelineCandidates.filter(c => c.stage === 'rejected' || c.stage === 'withdrawn');
              if (inactive.length === 0) return null;
              return (
                <div style={{ marginTop: 16 }}>
                  <details>
                    <summary style={{ cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>
                      Rejected / Withdrawn ({inactive.length})
                    </summary>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                      {inactive.map(c => (
                        <div key={c.id} onClick={() => setProfileCandidateId(c.id)} style={{ cursor: 'pointer', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, padding: '6px 12px', fontSize: 12 }}>
                          <span style={{ fontWeight: 600 }}>{c.name}</span>
                          <span style={{ marginLeft: 6 }}><StageBadge stage={c.stage} /></span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              );
            })()}
          </div>
        )}

        {/* ═══ TAB 3: CANDIDATES ═══ */}
        {activeTab === 'candidates' && (
          <div>
            {/* Toolbar */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  style={{ ...inputStyle, paddingLeft: 30, width: 220 }}
                  placeholder="Search name or email..."
                  value={candidateSearch}
                  onChange={e => setCandidateSearch(e.target.value)}
                />
              </div>
              <select style={{ ...inputStyle, width: 180 }} value={candidateJobFilter} onChange={e => setCandidateJobFilter(e.target.value)}>
                <option value="all">All Jobs</option>
                {jobs.map(j => <option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              <select style={{ ...inputStyle, width: 160 }} value={candidateStageFilter} onChange={e => setCandidateStageFilter(e.target.value)}>
                <option value="all">All Stages</option>
                {(Object.keys(STAGE_LABELS) as CandidateStage[]).map(s => (
                  <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                ))}
              </select>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                {bulkCandidates.count > 0 && (
                  <span style={{ fontSize: 12, color: PRIMARY, fontWeight: 600 }}>
                    {bulkCandidates.count} selected
                  </span>
                )}
                <button style={btnOutline} onClick={runAIScreenAll}>
                  <BarChart2 size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Run AI Screen All
                </button>
                <button style={btnPrimary} onClick={() => setShowCandidateForm(true)}>
                  <Plus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />Add Candidate
                </button>
              </div>
            </div>

            {/* Table */}
            <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: `${PRIMARY}08` }}>
                    <th style={{ padding: '10px 10px', width: 36 }}>
                      <input type="checkbox"
                        checked={bulkCandidates.isAllSelected}
                        onChange={bulkCandidates.toggleAll}
                        style={{ cursor: 'pointer', accentColor: PRIMARY }}
                      />
                    </th>
                    {['Name', 'Job Applied', 'Stage', 'AI Score', 'Source', 'Applied', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.length === 0 ? (
                    <tr><td colSpan={8} style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No candidates found.</td></tr>
                  ) : (
                    filteredCandidates.map(c => {
                      const job = jobs.find(j => j.id === c.jobId);
                      const isChecked = bulkCandidates.isSelected(c.id);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => bulkCandidates.count > 0 ? bulkCandidates.toggle(c.id) : setProfileCandidateId(c.id)}
                          style={{ borderTop: '1px solid #f3f4f6', cursor: 'pointer', transition: 'background 0.1s', background: isChecked ? `${PRIMARY}08` : '#fff' }}
                          onMouseEnter={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = BG; }}
                          onMouseLeave={e => { if (!isChecked) (e.currentTarget as HTMLElement).style.background = '#fff'; }}
                        >
                          <td style={{ padding: '12px 10px' }} onClick={e => { e.stopPropagation(); bulkCandidates.toggle(c.id); }}>
                            <input type="checkbox" checked={isChecked} onChange={() => bulkCandidates.toggle(c.id)}
                              style={{ cursor: 'pointer', accentColor: PRIMARY }} />
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.name}</td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>{job?.title ?? '—'}</td>
                          <td style={{ padding: '12px 14px' }}><StageBadge stage={c.stage} /></td>
                          <td style={{ padding: '12px 14px' }}>
                            {c.aiScore > 0 ? (
                              <span style={{ fontWeight: 700, color: aiScoreColor(c.aiScore) }}>{c.aiScore}</span>
                            ) : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>{c.source || '—'}</td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>{c.appliedAt}</td>
                          <td style={{ padding: '12px 14px' }}>
                            <button
                              style={{ ...btnOutline, fontSize: 11, padding: '3px 10px' }}
                              onClick={e => { e.stopPropagation(); setProfileCandidateId(c.id); }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Candidates BulkActionBar */}
            <BulkActionBar
              count={bulkCandidates.count}
              total={filteredCandidates.length}
              onClear={bulkCandidates.clear}
              onSelectAll={bulkCandidates.toggleAll}
              actions={[
                {
                  label: candidateBulkStage ? `Move → ${STAGE_LABELS[candidateBulkStage]}` : 'Move to Stage…',
                  onClick: () => {
                    bulkCandidates.selectedItems.forEach(c => handleMoveStage(c.id, candidateBulkStage));
                    bulkCandidates.clear();
                  },
                },
                {
                  label: 'Run AI Screen',
                  variant: 'primary' as const,
                  onClick: () => {
                    bulkCandidates.selectedItems.forEach(c => {
                      const job = jobs.find(j => j.id === c.jobId);
                      if (!job || !c.resumeText) return;
                      const resumeLower = c.resumeText.toLowerCase();
                      const matched = job.requirements.filter(r => r.toLowerCase().split(/\s+/).some(w => w.length > 2 && resumeLower.includes(w)));
                      const score = Math.round((matched.length / Math.max(job.requirements.length, 1)) * 100);
                      const missing = job.requirements.filter(r => !matched.includes(r));
                      updateCandidate({ ...c, aiScore: score, aiSummary: `Matched ${matched.length}/${job.requirements.length}. Strong: ${matched.slice(0,3).join(', ')||'None'}. Missing: ${missing.slice(0,3).join(', ')||'None'}.` });
                    });
                    bulkCandidates.clear();
                  },
                },
                {
                  label: 'Delete Selected',
                  variant: 'danger' as const,
                  onClick: () => {
                    if (!window.confirm(`Delete ${bulkCandidates.count} candidate(s)?`)) return;
                    bulkCandidates.selectedItems.forEach(c => deleteCandidate(c.id));
                    bulkCandidates.clear();
                  },
                },
              ]}
            />

            {/* Stage selector for bulk move */}
            {bulkCandidates.count > 0 && (
              <div style={{ position: 'fixed', bottom: 68, left: '50%', transform: 'translateX(-50%)', zIndex: 51, background: '#fff', border: `2px solid ${PRIMARY}`, borderRadius: 10, padding: '8px 16px', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
                <label style={{ fontSize: 11, color: PRIMARY, fontWeight: 600, marginRight: 8 }}>Move selected to:</label>
                <select value={candidateBulkStage} onChange={e => setCandidateBulkStage(e.target.value as CandidateStage)}
                  style={{ fontSize: 12, border: `1px solid ${PRIMARY}`, borderRadius: 6, padding: '4px 8px', color: PRIMARY }}>
                  {(Object.keys(STAGE_LABELS) as CandidateStage[]).map(s => (
                    <option key={s} value={s}>{STAGE_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 4: OFFERS ═══ */}
        {activeTab === 'offers' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button style={btnPrimary} onClick={() => { setEditingOffer(null); setShowOfferForm(true); }}>
                <Plus size={14} style={{ marginRight: 6, verticalAlign: 'middle' }} />New Offer
              </button>
            </div>

            {offerLetters.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                <FileText size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                <p style={{ margin: 0 }}>No offer letters yet.</p>
              </div>
            ) : (
              <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: `${PRIMARY}08` }}>
                      {['Candidate', 'Designation', 'CTC', 'Status', 'Sent', 'Expires', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {offerLetters.map(offer => {
                      const candidate = candidates.find(c => c.id === offer.candidateId);
                      const daysToExpiry = offer.expiryDate ? Math.ceil((new Date(offer.expiryDate).getTime() - Date.now()) / 86400000) : null;
                      return (
                        <tr key={offer.id} style={{ borderTop: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#111827' }}>{candidate?.name ?? '—'}</td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: '#374151' }}>{offer.designation}</td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: '#374151' }}>₹{offer.ctc}</td>
                          <td style={{ padding: '12px 14px' }}><OfferStatusBadge status={offer.status} /></td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: '#6b7280' }}>{offer.sentAt ?? '—'}</td>
                          <td style={{ padding: '12px 14px', fontSize: 12 }}>
                            {offer.expiryDate ? (
                              <span style={{ color: daysToExpiry !== null && daysToExpiry < 3 ? '#dc2626' : '#374151', fontWeight: daysToExpiry !== null && daysToExpiry < 3 ? 700 : 400 }}>
                                {offer.expiryDate} {daysToExpiry !== null && daysToExpiry < 3 && daysToExpiry >= 0 ? `(${daysToExpiry}d)` : ''}
                              </span>
                            ) : '—'}
                          </td>
                          <td style={{ padding: '12px 14px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {offer.status === 'sent' && (
                              <>
                                <button style={{ ...btnAccent, fontSize: 11, padding: '3px 10px' }} onClick={() => handleOfferAccept(offer)}>
                                  <CheckCircle size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Accept
                                </button>
                                <button style={{ ...btnDanger, fontSize: 11, padding: '3px 10px' }} onClick={() => handleOfferReject(offer)}>
                                  <XCircle size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Reject
                                </button>
                              </>
                            )}
                            {offer.status === 'draft' && (
                              <button style={{ ...btnOutline, fontSize: 11, padding: '3px 10px' }} onClick={() => { setEditingOffer(offer); setShowOfferForm(true); }}>
                                <Edit2 size={11} style={{ marginRight: 4, verticalAlign: 'middle' }} />Edit
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ═══ TAB 5: ONBOARDING ═══ */}
        {activeTab === 'onboarding' && (
          <div>
            {/* Stats bar */}
            {(() => {
              const allTasks = onboardingTasks.filter(t => hiredCandidates.some(c => c.id === t.candidateId));
              const pending = allTasks.filter(t => t.status !== 'done').length;
              const overdue = allTasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
              return (
                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                  {[
                    { label: 'Hired', value: hiredCandidates.length, icon: <UserCheck size={18} color={PRIMARY} /> },
                    { label: 'Tasks Pending', value: pending, icon: <AlertCircle size={18} color="#d97706" /> },
                    { label: 'Tasks Overdue', value: overdue, icon: <AlertCircle size={18} color="#dc2626" /> },
                    { label: 'Tasks Done', value: allTasks.filter(t => t.status === 'done').length, icon: <CheckCircle size={18} color="#16a34a" /> },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#fff', borderRadius: 8, padding: '12px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', display: 'flex', alignItems: 'center', gap: 10, minWidth: 120 }}>
                      {s.icon}
                      <div>
                        <p style={{ margin: 0, fontSize: 20, fontWeight: 800, color: PRIMARY }}>{s.value}</p>
                        <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {hiredCandidates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                <CheckSquare size={40} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.4 }} />
                <p style={{ margin: 0 }}>No hired candidates yet. Accept an offer to begin onboarding.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: 12 }}>
                {hiredCandidates.map(candidate => {
                  const tasks = onboardingTasks.filter(t => t.candidateId === candidate.id);
                  const done = tasks.filter(t => t.status === 'done').length;
                  const total = tasks.length;
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
                  const isExpanded = expandedOnboarding.includes(candidate.id);
                  const job = jobs.find(j => j.id === candidate.jobId);

                  const groupedTasks = (Object.keys(ONBOARDING_CATEGORY_LABELS) as OnboardingCategory[]).reduce((acc, cat) => {
                    const catTasks = tasks.filter(t => t.category === cat);
                    if (catTasks.length > 0) acc[cat] = catTasks;
                    return acc;
                  }, {} as Record<OnboardingCategory, OnboardingTask[]>);

                  return (
                    <div key={candidate.id} style={{ background: '#fff', borderRadius: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
                      {/* Accordion header */}
                      <div
                        style={{ padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16 }}
                        onClick={() => setExpandedOnboarding(prev =>
                          prev.includes(candidate.id) ? prev.filter(id => id !== candidate.id) : [...prev, candidate.id]
                        )}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{candidate.name}</span>
                            <span style={{ fontSize: 12, color: '#6b7280' }}>{job?.title ?? ''}</span>
                          </div>
                          {/* Progress bar */}
                          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 999, height: 6 }}>
                              <div style={{ width: `${pct}%`, background: pct === 100 ? '#16a34a' : ACCENT, borderRadius: 999, height: 6, transition: 'width 0.3s' }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{done}/{total} done ({pct}%)</span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronDown size={16} color="#6b7280" /> : <ChevronRight size={16} color="#6b7280" />}
                      </div>

                      {isExpanded && (
                        <div style={{ padding: '0 20px 20px', borderTop: '1px solid #f3f4f6' }}>
                          {(Object.entries(groupedTasks) as Array<[OnboardingCategory, OnboardingTask[]]>).map(([cat, catTasks]) => (
                            <div key={cat} style={{ marginTop: 16 }}>
                              <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: PRIMARY }}>
                                {ONBOARDING_CATEGORY_LABELS[cat]}
                              </h4>
                              {catTasks.map(task => {
                                const isOverdue = task.status !== 'done' && task.dueDate && new Date(task.dueDate) < new Date();
                                return (
                                  <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
                                    {/* Status toggle */}
                                    <button
                                      onClick={() => cycleTaskStatus(task)}
                                      style={{
                                        background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 1,
                                        color: task.status === 'done' ? '#16a34a' : task.status === 'in_progress' ? '#d97706' : '#d1d5db',
                                      }}
                                    >
                                      {task.status === 'done' ? <CheckCircle size={18} /> : task.status === 'in_progress' ? <PauseCircle size={18} /> : <CheckCircle size={18} />}
                                    </button>
                                    <div style={{ flex: 1 }}>
                                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: task.status === 'done' ? '#9ca3af' : '#111827', textDecoration: task.status === 'done' ? 'line-through' : 'none' }}>
                                        {task.task}
                                      </p>
                                      <div style={{ display: 'flex', gap: 12, marginTop: 2, fontSize: 11, color: '#9ca3af', flexWrap: 'wrap' }}>
                                        {task.assignedTo && <span>Assigned: {task.assignedTo}</span>}
                                        {task.dueDate && (
                                          <span style={{ color: isOverdue ? '#dc2626' : '#9ca3af', fontWeight: isOverdue ? 700 : 400 }}>
                                            Due: {task.dueDate} {isOverdue ? '(OVERDUE)' : ''}
                                          </span>
                                        )}
                                        <span style={{ background: `${PRIMARY}10`, color: PRIMARY, padding: '0 5px', borderRadius: 999 }}>
                                          {task.status.replace('_', ' ')}
                                        </span>
                                      </div>
                                    </div>
                                    {/* Assignee + Due date edits */}
                                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                                      <input
                                        style={{ ...inputStyle, width: 90, fontSize: 11, padding: '3px 6px' }}
                                        placeholder="Assignee"
                                        value={task.assignedTo}
                                        onChange={e => updateOnboardingTask({ ...task, assignedTo: e.target.value })}
                                      />
                                      <input
                                        style={{ ...inputStyle, width: 110, fontSize: 11, padding: '3px 6px' }}
                                        type="date"
                                        value={task.dueDate}
                                        onChange={e => updateOnboardingTask({ ...task, dueDate: e.target.value })}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ))}

                          {tasks.length === 0 && (
                            <p style={{ fontSize: 13, color: '#9ca3af', margin: '12px 0' }}>No onboarding tasks yet.</p>
                          )}

                          <button
                            style={{ ...btnOutline, fontSize: 12, padding: '6px 12px', marginTop: 16 }}
                            onClick={() => setShowCustomTaskModal(candidate.id)}
                          >
                            <Plus size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />Add Custom Task
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Modals ─────────────────────────────────────────────────────────── */}

      {/* Job Form Modal */}
      {showJobForm && (
        <JobFormModal
          initial={editingJob ?? undefined}
          companies={companies.map(c => ({ id: c.id, name: c.name }))}
          onSave={handleSaveJob}
          onClose={() => { setShowJobForm(false); setEditingJob(null); }}
        />
      )}

      {/* Candidate Form Modal */}
      {showCandidateForm && (
        <CandidateFormModal
          jobs={jobs.filter(j => j.status === 'active')}
          onSave={handleSaveCandidate}
          onClose={() => setShowCandidateForm(false)}
        />
      )}

      {/* Candidate Profile Panel */}
      {profileCandidate && (
        <CandidateProfile
          candidate={profileCandidate}
          jobs={jobs}
          interviews={interviews}
          onClose={() => { setProfileCandidateId(null); setShowInterviewModal(false); setShowOfferModalForCandidate(false); }}
          onUpdate={updateCandidate}
          onDelete={handleDeleteCandidate}
          onScheduleInterview={() => setShowInterviewModal(true)}
          onMoveStage={(stage) => handleMoveStage(profileCandidate.id, stage)}
          onOpenOffer={() => setShowOfferModalForCandidate(true)}
          onOpenOnboarding={() => {
            setProfileCandidateId(null);
            setActiveTab('onboarding');
            setExpandedOnboarding(prev => prev.includes(profileCandidate.id) ? prev : [...prev, profileCandidate.id]);
          }}
        />
      )}

      {/* Interview Modal */}
      {showInterviewModal && profileCandidate && (
        <div style={{ zIndex: 1100 }}>
          <InterviewModal
            candidate={profileCandidate}
            job={jobs.find(j => j.id === profileCandidate.jobId)}
            onSave={handleSaveInterview}
            onClose={() => setShowInterviewModal(false)}
          />
        </div>
      )}

      {/* Offer Letter Modal (from Offers tab) */}
      {showOfferForm && (
        <div style={{ zIndex: 1000 }}>
          <OfferFormModal
            candidates={candidates}
            jobs={jobs}
            initial={editingOffer ?? undefined}
            onSave={handleSaveOffer}
            onClose={() => { setShowOfferForm(false); setEditingOffer(null); }}
          />
        </div>
      )}

      {/* Offer Letter Modal (from Candidate Profile) */}
      {showOfferModalForCandidate && profileCandidate && (
        <div style={{ zIndex: 1100 }}>
          <OfferFormModal
            candidates={[profileCandidate]}
            jobs={jobs}
            onSave={handleSaveOffer}
            onClose={() => setShowOfferModalForCandidate(false)}
          />
        </div>
      )}

      {/* Custom Onboarding Task Modal */}
      {showCustomTaskModal && (
        <Modal title="Add Custom Onboarding Task" onClose={() => setShowCustomTaskModal(null)}>
          <Field label="Task *">
            <input style={inputStyle} value={customTask.task} onChange={e => setCustomTask(p => ({ ...p, task: e.target.value }))} placeholder="e.g. Set up workspace" />
          </Field>
          <Field label="Category">
            <select style={inputStyle} value={customTask.category} onChange={e => setCustomTask(p => ({ ...p, category: e.target.value as OnboardingCategory }))}>
              {(Object.keys(ONBOARDING_CATEGORY_LABELS) as OnboardingCategory[]).map(c => (
                <option key={c} value={c}>{ONBOARDING_CATEGORY_LABELS[c]}</option>
              ))}
            </select>
          </Field>
          <Field label="Assignee">
            <input style={inputStyle} value={customTask.assignedTo} onChange={e => setCustomTask(p => ({ ...p, assignedTo: e.target.value }))} />
          </Field>
          <Field label="Due Date">
            <input style={inputStyle} type="date" value={customTask.dueDate} onChange={e => setCustomTask(p => ({ ...p, dueDate: e.target.value }))} />
          </Field>
          <Field label="Notes">
            <textarea style={{ ...inputStyle, minHeight: 60 }} value={customTask.notes} onChange={e => setCustomTask(p => ({ ...p, notes: e.target.value }))} />
          </Field>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button style={btnGray} onClick={() => setShowCustomTaskModal(null)}>Cancel</button>
            <button style={btnPrimary} onClick={() => { if (customTask.task.trim()) handleAddCustomTask(showCustomTaskModal); }}>Add Task</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
