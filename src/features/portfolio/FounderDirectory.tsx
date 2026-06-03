import { useState, useMemo, useEffect } from 'react';
import {
  Search, Plus, X, Edit2, Copy, Check, Phone, Mail,
  ExternalLink, MapPin, Cake, Tag, User, Building2,
  ChevronDown, Clock, Users, Video, CalendarPlus, CheckCircle2,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { FounderContact } from '../../data/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

type ContactAge = 'recent' | 'moderate' | 'stale' | 'never';

function contactAge(dateStr?: string): ContactAge {
  const days = daysSince(dateStr);
  if (days === null) return 'never';
  if (days < 7) return 'recent';
  if (days <= 30) return 'moderate';
  return 'stale';
}

const AGE_STYLES: Record<ContactAge, { bg: string; text: string; label: string }> = {
  recent:   { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Recent' },
  moderate: { bg: 'bg-amber-100',   text: 'text-amber-700',   label: 'This Month' },
  stale:    { bg: 'bg-red-100',     text: 'text-red-700',     label: 'Overdue' },
  never:    { bg: 'bg-gray-100',    text: 'text-gray-500',    label: 'Never' },
};

function LastContactedBadge({ dateStr }: { dateStr?: string }) {
  const age = contactAge(dateStr);
  const style = AGE_STYLES[age];
  const days = daysSince(dateStr);
  const label =
    age === 'never' ? 'Never contacted' :
    days === 0 ? 'Today' :
    days === 1 ? 'Yesterday' :
    `${days}d ago`;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      <Clock size={10} />
      {label}
    </span>
  );
}

function Avatar({ name, logoUrl }: { name: string; logoUrl?: string }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        className="w-10 h-10 rounded-full object-cover border border-gray-200"
        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
      />
    );
  }
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold">
      {initials}
    </div>
  );
}

// ─── Copy Button ─────────────────────────────────────────────────────────────

function CopyButton({ value, label }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      onClick={copy}
      className="ml-1 text-gray-400 hover:text-indigo-600 transition-colors"
      title={`Copy ${label ?? value}`}
    >
      {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
    </button>
  );
}

// ─── Blank Form ───────────────────────────────────────────────────────────────

function blankForm(companyId = ''): Omit<FounderContact, 'id'> {
  return {
    companyId,
    name: '',
    role: '',
    email: '',
    phone: '',
    linkedInUrl: '',
    twitterUrl: '',
    birthday: '',
    location: '',
    notes: '',
    lastContactedAt: '',
    tags: [],
  };
}

// ─── Contact Form ─────────────────────────────────────────────────────────────

interface ContactFormProps {
  initial: Omit<FounderContact, 'id'> & { id?: string };
  companyOptions: { id: string; name: string }[];
  onSave: (data: Omit<FounderContact, 'id'> & { id?: string }) => void;
  onCancel: () => void;
}

function ContactForm({ initial, companyOptions, onSave, onCancel }: ContactFormProps) {
  const [form, setForm] = useState(initial);
  const [tagInput, setTagInput] = useState('');

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) {
      set('tags', [...form.tags, t]);
    }
    setTagInput('');
  };

  const removeTag = (t: string) => set('tags', form.tags.filter(x => x !== t));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.companyId) return;
    onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Company */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Company *</label>
        <select
          value={form.companyId}
          onChange={e => set('companyId', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          required
        >
          <option value="">Select company…</option>
          {companyOptions.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Name + Role */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
          <input
            value={form.name}
            onChange={e => set('name', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Jane Smith"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Role / Title</label>
          <input
            value={form.role}
            onChange={e => set('role', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Co-Founder & CEO"
          />
        </div>
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => set('email', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="jane@company.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={e => set('phone', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="+91 98765 43210"
          />
        </div>
      </div>

      {/* LinkedIn + Twitter */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL</label>
          <input
            value={form.linkedInUrl}
            onChange={e => set('linkedInUrl', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="https://linkedin.com/in/…"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Twitter / X URL</label>
          <input
            value={form.twitterUrl}
            onChange={e => set('twitterUrl', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="https://x.com/…"
          />
        </div>
      </div>

      {/* Birthday + Location */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Birthday</label>
          <input
            type="date"
            value={form.birthday ?? ''}
            onChange={e => set('birthday', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
          <input
            value={form.location}
            onChange={e => set('location', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Mumbai, India"
          />
        </div>
      </div>

      {/* Last Contacted */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Last Contacted</label>
        <input
          type="date"
          value={form.lastContactedAt ?? ''}
          onChange={e => set('lastContactedAt', e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
        <textarea
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          placeholder="Relationship notes, preferences, context…"
        />
      </div>

      {/* Tags */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Tags</label>
        <div className="flex gap-2 mb-2 flex-wrap">
          {form.tags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
              {t}
              <button type="button" onClick={() => removeTag(t)}><X size={10} /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Add tag, press Enter"
          />
          <button type="button" onClick={addTag} className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-sm rounded-lg hover:bg-indigo-200">
            Add
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          {('id' in initial && initial.id) ? 'Save Changes' : 'Add Contact'}
        </button>
      </div>
    </form>
  );
}

// ─── Schedule Meet Modal ──────────────────────────────────────────────────────

function buildGCalUrl(opts: {
  title: string; date: string; time: string; duration: number;
  guestEmail: string; description: string;
}): string {
  const [year, month, day] = opts.date.split('-').map(Number);
  const [hour, min] = opts.time.split(':').map(Number);
  const start = new Date(year, month - 1, day, hour, min);
  const end   = new Date(start.getTime() + opts.duration * 60 * 1000);
  const fmt   = (d: Date) =>
    d.getFullYear().toString() +
    String(d.getMonth() + 1).padStart(2, '0') +
    String(d.getDate()).padStart(2, '0') + 'T' +
    String(d.getHours()).padStart(2, '0') +
    String(d.getMinutes()).padStart(2, '0') + '00';
  const params = new URLSearchParams({
    action:  'TEMPLATE',
    text:    opts.title,
    dates:   `${fmt(start)}/${fmt(end)}`,
    details: opts.description,
    add:     opts.guestEmail,
    sf:      'true',
    output:  'xml',
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

interface ScheduleMeetProps {
  contact: FounderContact;
  companyName: string;
  onScheduled: () => void; // marks lastContacted = today
  onClose: () => void;
}

function ScheduleMeetModal({ contact, companyName, onScheduled, onClose }: ScheduleMeetProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [date,        setDate]        = useState(today);
  const [time,        setTime]        = useState('10:00');
  const [duration,    setDuration]    = useState(30);
  const [title,       setTitle]       = useState(`Call with ${contact.name} — ${companyName}`);
  const [agenda,      setAgenda]      = useState('');
  const [done,        setDone]        = useState(false);

  const hasEmail = !!contact.email;

  const handleSchedule = () => {
    const description = [
      '📅 Scheduled via Cactus Partners portal.',
      agenda ? `\nAgenda:\n${agenda}` : '',
      '\n\n🎥 Add Google Meet: After saving this event, click "Add Google Meet" in Google Calendar.',
    ].join('');

    const url = buildGCalUrl({
      title,
      date,
      time,
      duration,
      guestEmail: contact.email,
      description,
    });

    window.open(url, '_blank', 'noopener,noreferrer');
    onScheduled(); // sync last contacted
    setDone(true);
  };

  const iCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/30';

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}
        style={{ borderTop: '4px solid #1C4B42' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Video size={17} className="text-[#1C4B42]" />
            <h2 className="font-semibold text-gray-900 text-base">Schedule Google Meet</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={17} />
          </button>
        </div>

        {done ? (
          /* Success state */
          <div className="px-6 py-10 text-center space-y-4">
            <CheckCircle2 size={48} className="mx-auto text-emerald-500" />
            <div>
              <p className="font-semibold text-gray-900">Google Calendar opened!</p>
              <p className="text-sm text-gray-500 mt-1">
                Add Google Meet from within the event, then save to send the invite to{' '}
                <strong>{contact.email || contact.name}</strong>.
              </p>
            </div>
            <p className="text-xs text-emerald-600 font-medium">
              ✓ Last contacted synced to today
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-5 py-2 rounded-lg text-sm font-medium text-white"
              style={{ backgroundColor: '#1C4B42' }}
            >
              Done
            </button>
          </div>
        ) : (
          /* Form */
          <div className="px-6 py-5 space-y-4">
            {!hasEmail && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800">
                <span className="shrink-0 mt-0.5">⚠️</span>
                No email saved for this contact — invite won't be pre-filled. Add their email first.
              </div>
            )}

            {/* With who */}
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-semibold shrink-0">
                {contact.name.split(' ').map(w => w[0]).slice(0, 2).join('')}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{contact.name}</p>
                <p className="text-xs text-gray-500">{contact.email || 'No email — add to contact first'}</p>
              </div>
            </div>

            {/* Meeting title */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Meeting Title</label>
              <input className={iCls} value={title} onChange={e => setTitle(e.target.value)} />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                <input type="date" className={iCls} value={date} min={today}
                  onChange={e => setDate(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time</label>
                <input type="time" className={iCls} value={time}
                  onChange={e => setTime(e.target.value)} />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
              <div className="flex gap-2">
                {[15, 30, 45, 60].map(d => (
                  <button key={d} type="button"
                    onClick={() => setDuration(d)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      duration === d
                        ? 'bg-[#1C4B42] text-white border-[#1C4B42]'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-[#1C4B42]'
                    }`}>
                    {d}m
                  </button>
                ))}
              </div>
            </div>

            {/* Agenda */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Agenda (optional)</label>
              <textarea className={`${iCls} resize-none`} rows={3} value={agenda}
                onChange={e => setAgenda(e.target.value)}
                placeholder="Topics to cover, documents to review…" />
            </div>

            {/* How it works */}
            <div className="bg-blue-50 rounded-xl p-3 text-xs text-blue-700 space-y-1">
              <p className="font-medium">How it works</p>
              <p>1. Google Calendar opens with the event pre-filled</p>
              <p>2. Click <strong>"Add Google Meet"</strong> inside the event</p>
              <p>3. Save — Google sends the invite + Meet link to {contact.email || 'the founder'}</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 py-2 rounded-lg text-sm border border-gray-200 text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSchedule}
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-2"
                style={{ backgroundColor: '#1C4B42' }}>
                <CalendarPlus size={15} />
                Open Google Calendar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Contact Card (Detail Modal) ──────────────────────────────────────────────

interface ContactCardProps {
  contact: FounderContact;
  companyName: string;
  logoUrl?: string;
  relatedMeetings: number;
  onEdit: () => void;
  onClose: () => void;
  onDelete: () => void;
  onMarkContacted: () => void;
}

function ContactCard({
  contact, companyName, logoUrl, relatedMeetings,
  onEdit, onClose, onDelete, onMarkContacted,
}: ContactCardProps) {
  const age = contactAge(contact.lastContactedAt);
  const ageStyle = AGE_STYLES[age];
  const [showSchedule, setShowSchedule] = useState(false);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-end" onClick={onClose}>
      <div
        className="bg-white w-full max-w-md h-full overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <h2 className="font-semibold text-gray-900">Contact Details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              title="Edit contact"
            >
              <Edit2 size={15} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Identity */}
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <Avatar name={contact.name} logoUrl={logoUrl} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">{contact.name}</h3>
              {contact.role && <p className="text-sm text-gray-500 mt-0.5">{contact.role}</p>}
              <div className="flex items-center gap-1.5 mt-1">
                <Building2 size={12} className="text-gray-400" />
                <span className="text-sm font-medium text-indigo-700">{companyName}</span>
              </div>
            </div>
          </div>

          {/* Last contacted */}
          <div className={`flex items-center justify-between rounded-xl p-3 ${ageStyle.bg}`}>
            <div>
              <p className={`text-xs font-medium ${ageStyle.text}`}>Last Contacted</p>
              <p className={`text-sm font-semibold ${ageStyle.text} mt-0.5`}>
                {contact.lastContactedAt
                  ? new Date(contact.lastContactedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  : 'No contact recorded'}
              </p>
            </div>
            <button
              onClick={onMarkContacted}
              className="text-xs px-3 py-1.5 bg-white rounded-lg shadow-sm font-medium text-gray-700 hover:bg-gray-50 border border-gray-200"
            >
              Mark Today
            </button>
          </div>

          {/* Schedule Google Meet */}
          <button
            onClick={() => setShowSchedule(true)}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg,#1C4B42,#254536)' }}
          >
            <Video size={15} />
            Schedule Google Meet
          </button>

          {showSchedule && (
            <ScheduleMeetModal
              contact={contact}
              companyName={companyName}
              onScheduled={() => { onMarkContacted(); setShowSchedule(false); }}
              onClose={() => setShowSchedule(false)}
            />
          )}

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact Info</h4>
            {contact.email && (
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-gray-400 shrink-0" />
                <a href={`mailto:${contact.email}`} className="text-sm text-indigo-600 hover:underline truncate">{contact.email}</a>
                <CopyButton value={contact.email} label="email" />
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-gray-400 shrink-0" />
                <a href={`tel:${contact.phone}`} className="text-sm text-gray-800 hover:text-indigo-600">{contact.phone}</a>
                <CopyButton value={contact.phone} label="phone" />
              </div>
            )}
            {contact.location && (
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700">{contact.location}</span>
              </div>
            )}
            {contact.birthday && (
              <div className="flex items-center gap-2">
                <Cake size={14} className="text-gray-400 shrink-0" />
                <span className="text-sm text-gray-700">
                  {new Date(contact.birthday).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' })}
                </span>
              </div>
            )}
          </div>

          {/* Social Links */}
          {(contact.linkedInUrl || contact.twitterUrl) && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Social</h4>
              {contact.linkedInUrl && (
                <a
                  href={contact.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink size={14} />
                  LinkedIn Profile
                </a>
              )}
              {contact.twitterUrl && (
                <a
                  href={contact.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-sky-500 hover:underline"
                >
                  <ExternalLink size={14} />
                  X / Twitter
                </a>
              )}
            </div>
          )}

          {/* Tags */}
          {contact.tags.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
                <Tag size={11} />
                Tags
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.map(t => (
                  <span key={t} className="bg-gray-100 text-gray-600 text-xs px-2.5 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}

          {/* Interaction hint */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Users size={11} />
              Interaction History
            </h4>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500">
              {relatedMeetings > 0
                ? <span className="text-gray-700">{relatedMeetings} meeting note{relatedMeetings !== 1 ? 's' : ''} found in Meeting Log</span>
                : 'No meeting notes linked to this company yet.'}
            </div>
          </div>

          {/* Notes */}
          {contact.notes && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notes</h4>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-xl p-3">{contact.notes}</p>
            </div>
          )}

          {/* Danger zone */}
          <div className="pt-2 border-t border-gray-100">
            <button
              onClick={onDelete}
              className="text-xs text-red-400 hover:text-red-600 transition-colors"
            >
              Delete contact
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FounderDirectory() {
  const { store, addFounderContact, updateFounderContact, deleteFounderContact } = useApp();
  const { companies, founderContacts = [], meetingNotes = [] } = store;

  // Auto-populate from keyPeople on first load
  useEffect(() => {
    const existingKeys = new Set(
      founderContacts.map(fc => `${fc.companyId}__${fc.name.toLowerCase().trim()}`)
    );
    companies.forEach(company => {
      (company.keyPeople ?? []).forEach(person => {
        const key = `${company.id}__${person.name.toLowerCase().trim()}`;
        if (!existingKeys.has(key) && person.name.trim()) {
          existingKeys.add(key); // prevent duplicates within same run
          addFounderContact({
            id: generateId(),
            companyId: company.id,
            name: person.name,
            role: person.title,
            email: '',
            phone: '',
            linkedInUrl: '',
            twitterUrl: '',
            birthday: '',
            location: company.hqCity ?? '',
            notes: person.background ?? '',
            lastContactedAt: undefined,
            tags: [],
          });
        }
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── State ──────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editContact, setEditContact] = useState<FounderContact | null>(null);
  const [viewContact, setViewContact] = useState<FounderContact | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // ── Derived ────────────────────────────────────────────────────────────────
  const companyMap = useMemo(() => {
    const m = new Map<string, { name: string; logoUrl: string }>();
    companies.forEach(c => m.set(c.id, { name: c.name, logoUrl: c.logoUrl }));
    return m;
  }, [companies]);

  const companyOptions = useMemo(
    () => companies.map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [companies]
  );

  const filtered = useMemo(() => {
    let list = founderContacts;
    if (filterCompany !== 'all') list = list.filter(c => c.companyId === filterCompany);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.role.toLowerCase().includes(q) ||
        (companyMap.get(c.companyId)?.name ?? '').toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    return [...list].sort((a, b) => a.name.localeCompare(b.name));
  }, [founderContacts, filterCompany, search, companyMap]);

  const meetingCountByCompany = useMemo(() => {
    const m = new Map<string, number>();
    (meetingNotes ?? []).forEach(mn => {
      if (mn.companyId) m.set(mn.companyId, (m.get(mn.companyId) ?? 0) + 1);
    });
    return m;
  }, [meetingNotes]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAdd = (data: Omit<FounderContact, 'id'> & { id?: string }) => {
    addFounderContact({ ...data, id: generateId() } as FounderContact);
    setShowAddForm(false);
  };

  const handleEdit = (data: Omit<FounderContact, 'id'> & { id?: string }) => {
    if (!data.id) return;
    updateFounderContact(data as FounderContact);
    setEditContact(null);
    if (viewContact?.id === data.id) setViewContact(data as FounderContact);
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this contact?')) return;
    deleteFounderContact(id);
    setViewContact(null);
  };

  const handleMarkContacted = (contact: FounderContact) => {
    const updated = { ...contact, lastContactedAt: new Date().toISOString().slice(0, 10) };
    updateFounderContact(updated);
    setViewContact(updated);
  };

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = founderContacts.length;
    const recentCount = founderContacts.filter((c: FounderContact) => contactAge(c.lastContactedAt) === 'recent').length;
    const staleCount  = founderContacts.filter((c: FounderContact) => contactAge(c.lastContactedAt) === 'stale').length;
    const neverCount  = founderContacts.filter((c: FounderContact) => contactAge(c.lastContactedAt) === 'never').length;
    return { total, recentCount, staleCount, neverCount };
  }, [founderContacts]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Founder Directory</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} contacts across {companies.length} portfolio companies</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          <Plus size={15} />
          Add Contact
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Contacts', value: stats.total, color: 'text-gray-900' },
          { label: 'Contacted <7d', value: stats.recentCount, color: 'text-emerald-600' },
          { label: 'Overdue (>30d)', value: stats.staleCount, color: 'text-red-600' },
          { label: 'Never Contacted', value: stats.neverCount, color: 'text-gray-500' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, company, role, tag…"
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>

          {/* Company filter */}
          <div className="relative">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <select
              value={filterCompany}
              onChange={e => setFilterCompany(e.target.value)}
              className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 appearance-none bg-white"
            >
              <option value="all">All Companies</option>
              {companyOptions.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'grid' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Contact Grid / List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <User size={36} className="text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No contacts found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your search or add a new contact</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
          >
            <Plus size={14} /> Add Contact
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(contact => {
            const co = companyMap.get(contact.companyId);
            const age = contactAge(contact.lastContactedAt);
            void age; // age used via LastContactedBadge
            return (
              <div
                key={contact.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group"
                onClick={() => setViewContact(contact)}
              >
                {/* Company logo + edit btn */}
                <div className="flex items-start justify-between mb-3">
                  {co?.logoUrl ? (
                    <img
                      src={co.logoUrl}
                      alt={co.name}
                      className="h-7 w-auto max-w-[80px] object-contain opacity-80 group-hover:opacity-100 transition-opacity"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <span className="text-xs font-medium text-gray-400">{co?.name ?? '—'}</span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setEditContact(contact); }}
                    className="p-1 text-gray-300 hover:text-indigo-600 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Edit"
                  >
                    <Edit2 size={13} />
                  </button>
                </div>

                {/* Avatar + Name */}
                <div className="flex items-center gap-3 mb-2">
                  <Avatar name={contact.name} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{contact.name}</p>
                    <p className="text-xs text-gray-500 truncate">{contact.role || 'No title'}</p>
                  </div>
                </div>

                {/* Last contacted badge */}
                <div className="mb-3">
                  <LastContactedBadge dateStr={contact.lastContactedAt} />
                </div>

                {/* Quick actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                  {contact.email && (
                    <a
                      href={`mailto:${contact.email}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors"
                      title={contact.email}
                    >
                      <Mail size={12} />
                      <span className="truncate max-w-[80px]">{contact.email.split('@')[0]}</span>
                    </a>
                  )}
                  {contact.phone && (
                    <a
                      href={`tel:${contact.phone}`}
                      onClick={e => e.stopPropagation()}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors ml-auto"
                      title={contact.phone}
                    >
                      <Phone size={12} />
                    </a>
                  )}
                  {contact.linkedInUrl && (
                    <a
                      href={contact.linkedInUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-gray-400 hover:text-blue-600 transition-colors"
                      title="LinkedIn"
                    >
                      <ExternalLink size={12} />
                    </a>
                  )}
                </div>

                {/* Tags */}
                {contact.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {contact.tags.slice(0, 3).map(t => (
                      <span key={t} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{t}</span>
                    ))}
                    {contact.tags.length > 3 && (
                      <span className="text-[10px] text-gray-400">+{contact.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* List view */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Company</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden lg:table-cell">Phone</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Last Contacted</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(contact => {
                const co = companyMap.get(contact.companyId);
                return (
                  <tr
                    key={contact.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setViewContact(contact)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={contact.name} />
                        <div>
                          <p className="font-medium text-gray-900">{contact.name}</p>
                          <p className="text-xs text-gray-500">{contact.role || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        {co?.logoUrl && (
                          <img src={co.logoUrl} alt="" className="h-5 w-auto max-w-[50px] object-contain"
                            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        )}
                        <span className="text-gray-700 text-sm">{co?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {contact.email ? (
                        <div className="flex items-center gap-1">
                          <a href={`mailto:${contact.email}`} onClick={e => e.stopPropagation()} className="text-indigo-600 hover:underline text-sm truncate max-w-[160px]">
                            {contact.email}
                          </a>
                          <CopyButton value={contact.email} label="email" />
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {contact.phone ? (
                        <div className="flex items-center gap-1">
                          <span className="text-gray-700">{contact.phone}</span>
                          <CopyButton value={contact.phone} label="phone" />
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <LastContactedBadge dateStr={contact.lastContactedAt} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        {contact.linkedInUrl && (
                          <a href={contact.linkedInUrl} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()} className="text-gray-400 hover:text-blue-600">
                            <ExternalLink size={14} />
                          </a>
                        )}
                        <button
                          onClick={e => { e.stopPropagation(); setEditContact(contact); }}
                          className="text-gray-400 hover:text-indigo-600"
                          title="Edit"
                        >
                          <Edit2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Contact Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-semibold text-gray-900">Add New Contact</h2>
              <button onClick={() => setShowAddForm(false)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <X size={15} />
              </button>
            </div>
            <div className="p-6">
              <ContactForm
                initial={blankForm()}
                companyOptions={companyOptions}
                onSave={handleAdd}
                onCancel={() => setShowAddForm(false)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Edit Contact Modal */}
      {editContact && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditContact(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="font-semibold text-gray-900">Edit Contact</h2>
              <button onClick={() => setEditContact(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <X size={15} />
              </button>
            </div>
            <div className="p-6">
              <ContactForm
                initial={editContact}
                companyOptions={companyOptions}
                onSave={handleEdit}
                onCancel={() => setEditContact(null)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Contact Detail Card (side panel) */}
      {viewContact && (
        <ContactCard
          contact={viewContact}
          companyName={companyMap.get(viewContact.companyId)?.name ?? '—'}
          logoUrl={companyMap.get(viewContact.companyId)?.logoUrl}
          relatedMeetings={meetingCountByCompany.get(viewContact.companyId) ?? 0}
          onEdit={() => { setEditContact(viewContact); setViewContact(null); }}
          onClose={() => setViewContact(null)}
          onDelete={() => handleDelete(viewContact.id)}
          onMarkContacted={() => handleMarkContacted(viewContact)}
        />
      )}
    </div>
  );
}
