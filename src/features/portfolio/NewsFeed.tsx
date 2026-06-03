import { useState, useMemo } from 'react';
import {
  Search, Plus, X, ExternalLink, Tag, Building2,
  ChevronDown, Newspaper, TrendingUp, TrendingDown,
  Minus, Filter, RefreshCw, AlertCircle, User, Calendar,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { NewsItem } from '../../data/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function startOfWeek(): string {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().slice(0, 10);
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── GNews API fetch ─────────────────────────────────────────────────────────

const GNEWS_KEY = import.meta.env.VITE_GNEWS_API_KEY as string | undefined;

const POSITIVE_WORDS = [
  'raises','raised','funding','funded','launches','launched','wins','won','expands',
  'expansion','partnership','award','profit','profitable','revenue','growth','milestone',
  'secures','secured','closes','closed round','series','seed','ipo','acquisition',
  'acquires','signs','contract','approved','certified','record',
];
const NEGATIVE_WORDS = [
  'layoff','laid off','fraud','scam','bankrupt','shutdown','shuts down','controversy',
  'decline','loss','losses','penalty','lawsuit','sued','investigation','fired','exits',
  'writedown','write-off','failed','default','debt',
];

function detectSentiment(text: string): NewsItem['sentiment'] {
  const t = text.toLowerCase();
  const pos = POSITIVE_WORDS.some(w => t.includes(w));
  const neg = NEGATIVE_WORDS.some(w => t.includes(w));
  if (pos && !neg) return 'positive';
  if (neg && !pos) return 'negative';
  if (neg && pos)  return 'neutral';
  return 'neutral';
}

interface GNewsArticle {
  title: string;
  description: string;
  url: string;
  source: { name: string };
  publishedAt: string;
}

async function fetchNewsForCompany(
  companyName: string,
  companyId: string,
  existingUrls: Set<string>,
  apiKey: string,
): Promise<Omit<NewsItem, 'id'>[]> {
  const q = encodeURIComponent(`"${companyName}"`);
  const url = `https://gnews.io/api/v4/search?q=${q}&lang=en&max=5&apikey=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`GNews error ${res.status}`);
  const data = await res.json() as { articles: GNewsArticle[] };
  const now = new Date().toISOString();

  return (data.articles ?? [])
    .filter((a: GNewsArticle) => a.url && !existingUrls.has(a.url))
    .map((a: GNewsArticle) => ({
      companyId,
      title:         a.title,
      summary:       a.description ?? '',
      url:           a.url,
      source:        a.source?.name ?? 'GNews',
      publishedAt:   a.publishedAt?.slice(0, 10) ?? now.slice(0, 10),
      sentiment:     detectSentiment(`${a.title} ${a.description ?? ''}`),
      tags:          [companyName],
      isManuallyAdded: false,
      addedBy:       'Auto-fetch',
      savedAt:       now,
    }));
}

// ─── Sentiment badge ──────────────────────────────────────────────────────────

type Sentiment = NewsItem['sentiment'];

const SENTIMENT_META: Record<Sentiment, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  positive: {
    label: 'Positive',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    icon: <TrendingUp size={11} />,
  },
  neutral: {
    label: 'Neutral',
    bg: 'bg-gray-100',
    text: 'text-gray-600',
    icon: <Minus size={11} />,
  },
  negative: {
    label: 'Negative',
    bg: 'bg-red-100',
    text: 'text-red-600',
    icon: <TrendingDown size={11} />,
  },
  unknown: {
    label: 'Unknown',
    bg: 'bg-slate-100',
    text: 'text-slate-500',
    icon: <Minus size={11} />,
  },
};

function SentimentBadge({ sentiment }: { sentiment: Sentiment }) {
  const m = SENTIMENT_META[sentiment];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${m.bg} ${m.text}`}>
      {m.icon}
      {m.label}
    </span>
  );
}

// ─── Company logo/name tag ─────────────────────────────────────────────────────

function CompanyTag({ name, logoUrl }: { name: string; logoUrl?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#1C4B42]/10 text-[#1C4B42] text-xs font-medium border border-[#1C4B42]/20">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="h-3.5 w-auto max-w-[32px] object-contain"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
      ) : (
        <Building2 size={10} />
      )}
      {name}
    </span>
  );
}

// ─── Tag chip ─────────────────────────────────────────────────────────────────

function TagChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#86CA0F]/15 text-[#3a6800] text-[10px] font-medium border border-[#86CA0F]/30">
      <Tag size={9} />
      {label}
    </span>
  );
}

// ─── Stats strip ─────────────────────────────────────────────────────────────

interface StatsStripProps {
  items: NewsItem[];
}

function StatsStrip({ items }: StatsStripProps) {
  const weekAgo = startOfWeek();
  const thisWeek = items.filter(n => n.savedAt >= weekAgo).length;
  const positiveCount = items.filter(n => n.sentiment === 'positive').length;
  const negativeCount = items.filter(n => n.sentiment === 'negative').length;

  const stats = [
    { label: 'Total Articles', value: items.length, color: 'text-gray-900' },
    { label: 'This Week', value: thisWeek, color: 'text-[#1C4B42]' },
    { label: 'Positive', value: positiveCount, color: 'text-emerald-600' },
    { label: 'Negative', value: negativeCount, color: 'text-red-600' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {stats.map(s => (
        <div
          key={s.label}
          className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
        >
          <p className="text-xs text-gray-500">{s.label}</p>
          <p className={`text-2xl font-bold mt-0.5 ${s.color}`}>{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── News Card ────────────────────────────────────────────────────────────────

interface NewsCardProps {
  item: NewsItem;
  companyName?: string;
  companyLogo?: string;
  onDelete: (id: string) => void;
}

function NewsCard({ item, companyName, companyLogo, onDelete }: NewsCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#86CA0F]/40 transition-all">
      {/* Compact header row — always visible */}
      <div
        className="flex items-start gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Source badge */}
        <span className="shrink-0 mt-0.5 px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-semibold uppercase tracking-wide">
          {item.source || 'Source'}
        </span>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
            {item.title}
          </p>
        </div>

        {/* Right-side meta */}
        <div className="shrink-0 flex flex-col items-end gap-1.5">
          <SentimentBadge sentiment={item.sentiment} />
          <span className="text-[10px] text-gray-400 whitespace-nowrap">{fmtDate(item.publishedAt)}</span>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-50 pt-3">
          {/* Company tag */}
          {companyName && (
            <CompanyTag name={companyName} logoUrl={companyLogo} />
          )}

          {/* Summary */}
          {item.summary && (
            <p className="text-sm text-gray-600 leading-relaxed line-clamp-4">
              {item.summary}
            </p>
          )}

          {/* Tags */}
          {item.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {item.tags.map(t => (
                <TagChip key={t} label={t} />
              ))}
            </div>
          )}

          {/* Footer row */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-3">
              {item.addedBy && (
                <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                  <User size={10} />
                  Added by {item.addedBy}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                <Calendar size={10} />
                Saved {fmtDate(item.savedAt)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-[#1C4B42] bg-[#1C4B42]/10 hover:bg-[#1C4B42]/20 transition-colors"
                >
                  <ExternalLink size={11} />
                  Open Article
                </a>
              )}
              <button
                onClick={e => { e.stopPropagation(); onDelete(item.id); }}
                className="p-1 text-gray-300 hover:text-red-400 rounded transition-colors"
                title="Delete"
              >
                <X size={13} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add News Modal ───────────────────────────────────────────────────────────

interface AddNewsModalProps {
  companyOptions: { id: string; name: string }[];
  onSave: (item: NewsItem) => void;
  onClose: () => void;
}

function AddNewsModal({ companyOptions, onSave, onClose }: AddNewsModalProps) {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [url, setUrl] = useState('');
  const [source, setSource] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [publishedAt, setPublishedAt] = useState(today());
  const [sentiment, setSentiment] = useState<Sentiment>('unknown');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (t: string) => setTags(prev => prev.filter(x => x !== t));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const item: NewsItem = {
      id: generateId(),
      companyId: companyId || undefined,
      title: title.trim(),
      summary: summary.trim(),
      url: url.trim(),
      source: source.trim(),
      publishedAt,
      sentiment,
      tags,
      isManuallyAdded: true,
      addedBy: 'You',
      savedAt: new Date().toISOString(),
    };
    onSave(item);
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
          <h2 className="font-semibold text-gray-900">Add News Article</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Article headline…"
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
            />
          </div>

          {/* Summary */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Summary</label>
            <textarea
              value={summary}
              onChange={e => setSummary(e.target.value)}
              rows={3}
              placeholder="Brief summary of the article…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40 resize-none"
            />
          </div>

          {/* URL + Source */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Source</label>
              <input
                value={source}
                onChange={e => setSource(e.target.value)}
                placeholder="TechCrunch, ET, etc."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
              />
            </div>
          </div>

          {/* Company + Published Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Company (optional)
              </label>
              <div className="relative">
                <select
                  value={companyId}
                  onChange={e => setCompanyId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40 appearance-none bg-white"
                >
                  <option value="">— None —</option>
                  {companyOptions.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Published Date</label>
              <input
                type="date"
                value={publishedAt}
                onChange={e => setPublishedAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
              />
            </div>
          </div>

          {/* Sentiment */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Sentiment</label>
            <div className="relative">
              <select
                value={sentiment}
                onChange={e => setSentiment(e.target.value as Sentiment)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40 appearance-none bg-white"
              >
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
                <option value="unknown">Unknown</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map(t => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 bg-[#86CA0F]/15 text-[#3a6800] text-xs px-2 py-0.5 rounded-full border border-[#86CA0F]/30"
                >
                  {t}
                  <button type="button" onClick={() => removeTag(t)}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag();
                  }
                }}
                placeholder="Type tag, press Enter"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-3 py-1.5 bg-[#1C4B42]/10 text-[#1C4B42] text-sm rounded-lg hover:bg-[#1C4B42]/20 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors"
              style={{ backgroundColor: '#1C4B42' }}
            >
              Add Article
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NewsFeed() {
  const { store, addNewsItem, deleteNewsItem } = useApp();
  const newsItems: NewsItem[] = store.newsItems ?? [];
  const companies = store.companies ?? [];

  // ── Maps ───────────────────────────────────────────────────────────────────
  const companyMap = useMemo(() => {
    const m = new Map<string, { name: string; logoUrl: string }>();
    companies.forEach(c => m.set(c.id, { name: c.name, logoUrl: c.logoUrl }));
    return m;
  }, [companies]);

  const companyOptions = useMemo(
    () => [...companies].map(c => ({ id: c.id, name: c.name })).sort((a, b) => a.name.localeCompare(b.name)),
    [companies],
  );

  // ── Filter state ───────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterCompany, setFilterCompany] = useState('all');
  const [filterSentiment, setFilterSentiment] = useState<'all' | Sentiment>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // ── Filtered + sorted list ─────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...newsItems];

    if (filterCompany !== 'all') {
      list = list.filter(n => n.companyId === filterCompany);
    }

    if (filterSentiment !== 'all') {
      list = list.filter(n => n.sentiment === filterSentiment);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        n =>
          n.title.toLowerCase().includes(q) ||
          n.summary.toLowerCase().includes(q) ||
          n.source.toLowerCase().includes(q) ||
          n.tags.some(t => t.toLowerCase().includes(q)),
      );
    }

    // Sort by savedAt desc
    return list.sort((a, b) => (a.savedAt > b.savedAt ? -1 : 1));
  }, [newsItems, filterCompany, filterSentiment, search]);

  // ── Auto-fetch state ───────────────────────────────────────────────────────
  const [fetching,    setFetching]    = useState(false);
  const [fetchStatus, setFetchStatus] = useState<string>('');
  const [fetchError,  setFetchError]  = useState<string>('');
  const [lastRefresh, setLastRefresh] = useState<string>('');

  const handleRefresh = async () => {
    if (!GNEWS_KEY) {
      setFetchError('GNews API key not set. Add VITE_GNEWS_API_KEY to your Vercel environment variables.');
      return;
    }
    setFetching(true);
    setFetchError('');
    setFetchStatus('');

    const existingUrls = new Set(newsItems.map(n => n.url).filter(Boolean));
    let added = 0;
    const errors: string[] = [];

    for (const company of companies) {
      try {
        setFetchStatus(`Fetching news for ${company.name}…`);
        const articles = await fetchNewsForCompany(company.name, company.id, existingUrls, GNEWS_KEY);
        for (const article of articles) {
          addNewsItem({ ...article, id: generateId() } as NewsItem);
          existingUrls.add(article.url);
          added++;
        }
        // GNews free tier rate limit — small delay between companies
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        errors.push(company.name);
      }
    }

    setFetching(false);
    setFetchStatus('');
    setLastRefresh(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }));
    if (errors.length) {
      setFetchError(`Could not fetch for: ${errors.join(', ')}. Check API key or rate limit.`);
    } else if (added === 0) {
      setFetchStatus('Already up to date — no new articles found.');
    } else {
      setFetchStatus(`✓ Added ${added} new article${added !== 1 ? 's' : ''}.`);
    }
  };

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAdd = (item: NewsItem) => {
    addNewsItem(item);
    setShowAddModal(false);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Remove this article?')) return;
    deleteNewsItem(id);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-[#F6FAF7]">
      {/* Page Header */}
      <div className="border-b border-gray-200 bg-white/70 px-6 md:px-10 py-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide text-gray-900">
              News & Monitoring
            </h1>
            <p className="text-xs text-gray-400 mt-1 italic">
              Track portfolio news, press coverage and market signals
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <button
              onClick={handleRefresh}
              disabled={fetching}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold border border-[#1C4B42] text-[#1C4B42] bg-white hover:bg-[#F0F7E6] transition-colors disabled:opacity-60"
            >
              <RefreshCw size={15} className={fetching ? 'animate-spin' : ''} />
              {fetching ? 'Fetching…' : 'Refresh News'}
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#1C4B42' }}
            >
              <Plus size={15} />
              Add News
            </button>
          </div>
        </div>

        {/* Fetch status / error banners */}
        {fetching && fetchStatus && (
          <div className="mt-3 flex items-center gap-2 text-xs text-[#1C4B42] bg-[#F0F7E6] border border-[#86CA0F]/40 rounded-lg px-3 py-2">
            <RefreshCw size={12} className="animate-spin shrink-0" />
            {fetchStatus}
          </div>
        )}
        {!fetching && fetchStatus && (
          <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <span>✓</span>
            {fetchStatus}
            {lastRefresh && <span className="text-emerald-500 ml-auto">Last refreshed {lastRefresh}</span>}
          </div>
        )}
        {fetchError && (
          <div className="mt-3 flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertCircle size={13} className="shrink-0 mt-0.5" />
            <span>{fetchError}</span>
          </div>
        )}
      </div>

      <div className="px-6 md:px-10 py-8 space-y-6">
        {/* Stats strip */}
        <StatsStrip items={newsItems} />

        {/* Filter Bar */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search title, summary, source, tags…"
                className="w-full pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Company filter */}
            <div className="relative">
              <Building2 size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={filterCompany}
                onChange={e => setFilterCompany(e.target.value)}
                className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40 appearance-none bg-white"
              >
                <option value="all">All Companies</option>
                {companyOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            {/* Sentiment filter */}
            <div className="relative">
              <Filter size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <select
                value={filterSentiment}
                onChange={e => setFilterSentiment(e.target.value as 'all' | Sentiment)}
                className="pl-8 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C4B42]/40 appearance-none bg-white"
              >
                <option value="all">All Sentiments</option>
                <option value="positive">Positive</option>
                <option value="neutral">Neutral</option>
                <option value="negative">Negative</option>
                <option value="unknown">Unknown</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Active filter count */}
          {(search || filterCompany !== 'all' || filterSentiment !== 'all') && (
            <div className="mt-2 flex items-center gap-2">
              <span className="text-xs text-gray-500">
                Showing {filtered.length} of {newsItems.length} articles
              </span>
              <button
                onClick={() => { setSearch(''); setFilterCompany('all'); setFilterSentiment('all'); }}
                className="text-xs text-[#1C4B42] hover:underline"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>

        {/* News List */}
        {filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-14 text-center">
            <Newspaper size={40} className="text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">
              {newsItems.length === 0 ? 'No news articles yet' : 'No articles match your filters'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {newsItems.length === 0
                ? 'Add articles manually to start monitoring portfolio companies'
                : 'Try clearing filters or search terms'}
            </p>
            {newsItems.length === 0 && (
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                style={{ backgroundColor: '#1C4B42' }}
              >
                <Plus size={14} />
                Add First Article
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(item => {
              const co = item.companyId ? companyMap.get(item.companyId) : undefined;
              return (
                <NewsCard
                  key={item.id}
                  item={item}
                  companyName={co?.name}
                  companyLogo={co?.logoUrl}
                  onDelete={handleDelete}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Add News Modal */}
      {showAddModal && (
        <AddNewsModal
          companyOptions={companyOptions}
          onSave={handleAdd}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}
