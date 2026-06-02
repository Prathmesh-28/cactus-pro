import { useState, useMemo } from 'react';
import {
  Plus, X, Star, Search, ExternalLink, Download,
  FileText, BookOpen, BarChart2, Map, Layers, File,
  Table2, ArrowLeft, Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { ResearchDocument } from '../../data/types';

type DocType = ResearchDocument['type'];

const DOC_TYPE_META: Record<DocType, { label: string; icon: React.ReactNode; color: string }> = {
  market_map: { label: 'Market Map', icon: <Map className="w-4 h-4" />,       color: 'text-purple-600' },
  thesis:     { label: 'Thesis',     icon: <BookOpen className="w-4 h-4" />,  color: 'text-blue-600'   },
  report:     { label: 'Report',     icon: <BarChart2 className="w-4 h-4" />, color: 'text-orange-600' },
  article:    { label: 'Article',    icon: <FileText className="w-4 h-4" />,  color: 'text-green-600'  },
  deck:       { label: 'Deck',       icon: <Layers className="w-4 h-4" />,    color: 'text-pink-600'   },
  model:      { label: 'Model',      icon: <Table2 className="w-4 h-4" />,    color: 'text-teal-600'   },
  other:      { label: 'Other',      icon: <File className="w-4 h-4" />,      color: 'text-gray-500'   },
};

const DOC_TYPES: DocType[] = ['market_map','thesis','report','article','deck','model','other'];

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface AddDocModalProps {
  onSave: (doc: ResearchDocument) => void;
  onClose: () => void;
}

function AddDocModal({ onSave, onClose }: AddDocModalProps) {
  const [title, setTitle]     = useState('');
  const [sector, setSector]   = useState('');
  const [type, setType]       = useState<DocType>('report');
  const [source, setSource]   = useState('');
  const [url, setUrl]         = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [summary, setSummary] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags]       = useState<string[]>([]);
  const [isFeatured, setIsFeatured] = useState(false);

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) { setTags(prev => [...prev, t]); setTagInput(''); }
  };
  const removeTag = (tag: string) => setTags(prev => prev.filter((t: string) => t !== tag));

  const handleSave = () => {
    if (!title || !source || !summary) return;
    onSave({
      id: generateId(), title, sectorId: sector || undefined, type, source,
      url: url || undefined, fileUrl: fileUrl || undefined, summary, tags,
      addedBy: 'Admin', addedAt: new Date().toISOString(), isFeatured,
    });
    onClose();
  };

  const iCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500";
  const bSt  = { borderColor: '#D4EDAA' };
  const lCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] flex flex-col" style={{ borderTop: '4px solid #1C4B42' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Add Research Document</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div><label className={lCls}>Title *</label><input type="text" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} className={iCls} style={bSt} placeholder="Document title" /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lCls}>Type</label>
              <select value={type} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setType(e.target.value as DocType)} className={iCls} style={bSt}>
                {DOC_TYPES.map((t: DocType) => <option key={t} value={t}>{DOC_TYPE_META[t].label}</option>)}
              </select>
            </div>
            <div><label className={lCls}>Sector</label><input type="text" value={sector} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSector(e.target.value)} className={iCls} style={bSt} placeholder="e.g. CleanTech" /></div>
          </div>
          <div><label className={lCls}>Source *</label><input type="text" value={source} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSource(e.target.value)} className={iCls} style={bSt} placeholder="e.g. Bain &amp; Company" /></div>
          <div><label className={lCls}>URL</label><input type="url" value={url} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)} className={iCls} style={bSt} placeholder="https://..." /></div>
          <div><label className={lCls}>File URL (optional)</label><input type="url" value={fileUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFileUrl(e.target.value)} className={iCls} style={bSt} placeholder="https://drive.google.com/..." /></div>
          <div><label className={lCls}>Summary *</label>
            <textarea rows={4} value={summary} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setSummary(e.target.value)} className={`${iCls} resize-none`} style={bSt} placeholder="Brief summary..." />
          </div>
          <div>
            <label className={lCls}>Tags</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag: string) => (
                <span key={tag} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border" style={{ backgroundColor: '#F0F7E6', borderColor: '#86CA0F', color: '#1C4B42' }}>
                  {tag}<button onClick={() => removeTag(tag)} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={tagInput} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTagInput(e.target.value)} onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && addTag()} className={`${iCls} flex-1`} style={bSt} placeholder="Add tag..." />
              <button onClick={addTag} className="px-3 py-2 text-xs rounded-lg border font-medium" style={{ borderColor: '#86CA0F', color: '#1C4B42' }}>Add</button>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={isFeatured} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setIsFeatured(e.target.checked)} className="w-4 h-4 accent-yellow-500" />
            <span className="text-sm text-gray-700">Feature this document</span>
            <Star className="w-4 h-4 text-yellow-400" />
          </label>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={handleSave} disabled={!title || !source || !summary} className="px-5 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-40" style={{ backgroundColor: '#1C4B42' }}>Add Document</button>
        </div>
      </div>
    </div>
  );
}

interface DocCardProps {
  doc: ResearchDocument;
  onSelect: () => void;
  onToggleFeatured: () => void;
}

function DocCard({ doc, onSelect, onToggleFeatured }: DocCardProps) {
  const meta = DOC_TYPE_META[doc.type];
  return (
    <div onClick={onSelect} className="bg-white rounded-2xl border p-5 cursor-pointer hover:shadow-lg transition-shadow flex flex-col gap-3 relative" style={{ borderColor: doc.isFeatured ? '#86CA0F' : '#E5E7EB' }}>
      <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onToggleFeatured(); }} className="absolute top-4 right-4 transition-colors" title={doc.isFeatured ? 'Unfeature' : 'Feature'}>
        <Star className={`w-4 h-4 ${doc.isFeatured ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`} />
      </button>
      <div className="flex items-center gap-2">
        <span className={meta.color}>{meta.icon}</span>
        <span className="text-xs font-semibold text-gray-500">{meta.label}</span>
        {doc.sectorId && <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: '#F0F7E6', color: '#1C4B42' }}>{doc.sectorId}</span>}
      </div>
      <h3 className="text-sm font-bold text-gray-900 leading-snug pr-6 line-clamp-2">{doc.title}</h3>
      <p className="text-xs text-gray-400">{doc.source}</p>
      <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed">{doc.summary}</p>
      {doc.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {doc.tags.slice(0, 4).map((tag: string) => <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500">{tag}</span>)}
          {doc.tags.length > 4 && <span className="text-xs text-gray-400">+{doc.tags.length - 4}</span>}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-auto">{fmtDate(doc.addedAt)}</p>
    </div>
  );
}

interface DetailViewProps {
  doc: ResearchDocument;
  onBack: () => void;
  onDelete: () => void;
  onToggleFeatured: () => void;
}

function DetailView({ doc, onBack, onDelete, onToggleFeatured }: DetailViewProps) {
  const meta = DOC_TYPE_META[doc.type];
  return (
    <div className="max-w-3xl mx-auto">
      <button onClick={onBack} className="flex items-center gap-2 text-sm font-medium mb-6" style={{ color: '#1C4B42' }}>
        <ArrowLeft className="w-4 h-4" /> Back to library
      </button>
      <div className="bg-white rounded-2xl border shadow-sm p-8" style={{ borderColor: '#D4EDAA' }}>
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className={meta.color}>{meta.icon}</span>
              <span className="text-sm font-semibold text-gray-500">{meta.label}</span>
              {doc.sectorId && <span className="px-2.5 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: '#F0F7E6', color: '#1C4B42' }}>{doc.sectorId}</span>}
              {doc.isFeatured && <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700"><Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> Featured</span>}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{doc.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Source: {doc.source} · Added by {doc.addedBy} · {fmtDate(doc.addedAt)}</p>
          </div>
          <button onClick={onToggleFeatured} className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center border" style={{ borderColor: '#D4EDAA' }}>
            <Star className={`w-5 h-5 ${doc.isFeatured ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
          </button>
        </div>
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">Summary</p>
          <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{doc.summary}</p>
        </div>
        {doc.tags.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">Tags</p>
            <div className="flex flex-wrap gap-2">
              {doc.tags.map((tag: string) => <span key={tag} className="px-3 py-1 rounded-full text-xs border" style={{ backgroundColor: '#F0F7E6', borderColor: '#86CA0F', color: '#1C4B42' }}>{tag}</span>)}
            </div>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {doc.url && <a href={doc.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border" style={{ borderColor: '#1C4B42', color: '#1C4B42' }}><ExternalLink className="w-4 h-4" /> Open</a>}
          {doc.fileUrl && <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: '#1C4B42' }}><Download className="w-4 h-4" /> Download</a>}
          <button onClick={() => { if (window.confirm('Delete this document?')) onDelete(); }} className="ml-auto text-sm text-red-500 hover:text-red-700 px-4 py-2">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function ResearchLibrary() {
  const { store, addResearchDoc, updateResearchDoc, deleteResearchDoc } = useApp();
  const docs: ResearchDocument[] = store.researchDocs ?? [];

  const [search, setSearch]       = useState('');
  const [typeFilter, setTypeFilter] = useState<DocType | 'all'>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [sort, setSort]           = useState<'newest' | 'featured' | 'az'>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    docs.forEach((d: ResearchDocument) => d.tags.forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [docs]);

  const featuredDocs = useMemo(() => docs.filter((d: ResearchDocument) => d.isFeatured), [docs]);

  const filteredDocs = useMemo(() => {
    let result = [...docs];
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((d: ResearchDocument) =>
        d.title.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q) ||
        d.source.toLowerCase().includes(q) || d.tags.some((t: string) => t.toLowerCase().includes(q))
      );
    }
    if (typeFilter !== 'all') result = result.filter((d: ResearchDocument) => d.type === typeFilter);
    if (tagFilter) result = result.filter((d: ResearchDocument) => d.tags.includes(tagFilter));
    if (sort === 'newest') result.sort((a: ResearchDocument, b: ResearchDocument) => b.addedAt.localeCompare(a.addedAt));
    else if (sort === 'featured') result.sort((a: ResearchDocument, b: ResearchDocument) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    else result.sort((a: ResearchDocument, b: ResearchDocument) => a.title.localeCompare(b.title));
    return result;
  }, [docs, search, typeFilter, tagFilter, sort]);

  const selectedDoc = selectedId ? docs.find((d: ResearchDocument) => d.id === selectedId) ?? null : null;
  const handleToggleFeatured = (doc: ResearchDocument) => updateResearchDoc({ ...doc, isFeatured: !doc.isFeatured });
  const handleDelete = (id: string) => { deleteResearchDoc(id); setSelectedId(null); };

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: '#F6FAF7' }}>
      <div className="border-b px-6 md:px-10 py-6 bg-white/70" style={{ borderColor: '#D4EDAA' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide" style={{ color: '#1C4B42' }}>Sector Research Library</h1>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm" style={{ backgroundColor: '#1C4B42' }}>
            <Plus className="w-4 h-4" /> Add Document
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 md:px-10 py-8 space-y-8">
        {selectedDoc ? (
          <DetailView doc={selectedDoc} onBack={() => setSelectedId(null)} onDelete={() => handleDelete(selectedDoc.id)} onToggleFeatured={() => handleToggleFeatured(selectedDoc)} />
        ) : (
          <>
            {featuredDocs.length > 0 && (
              <section>
                <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2"><Star className="w-4 h-4 text-yellow-400 fill-yellow-400" /> Featured Documents</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {featuredDocs.map((doc: ResearchDocument) => <DocCard key={doc.id} doc={doc} onSelect={() => setSelectedId(doc.id)} onToggleFeatured={() => handleToggleFeatured(doc)} />)}
                </div>
              </section>
            )}
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex items-center gap-2 bg-white border rounded-xl px-4 py-2 flex-1 min-w-52" style={{ borderColor: '#D4EDAA' }}>
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input type="text" value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} placeholder="Search documents..." className="flex-1 text-sm focus:outline-none bg-transparent" />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select value={typeFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTypeFilter(e.target.value as DocType | 'all')} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" style={{ borderColor: '#D4EDAA' }}>
                  <option value="all">All Types</option>
                  {DOC_TYPES.map((t: DocType) => <option key={t} value={t}>{DOC_TYPE_META[t].label}</option>)}
                </select>
              </div>
              <select value={tagFilter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTagFilter(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" style={{ borderColor: '#D4EDAA' }}>
                <option value="">All Tags</option>
                {allTags.map((tag: string) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <select value={sort} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSort(e.target.value as 'newest' | 'featured' | 'az')} className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500" style={{ borderColor: '#D4EDAA' }}>
                <option value="newest">Newest First</option>
                <option value="featured">Featured First</option>
                <option value="az">A–Z</option>
              </select>
            </div>
            <section>
              <h2 className="text-sm font-bold text-gray-700 mb-4">All Documents <span className="font-normal text-gray-400">({filteredDocs.length})</span></h2>
              {filteredDocs.length === 0
                ? <div className="flex flex-col items-center justify-center py-20 gap-3"><BookOpen className="w-10 h-10 text-gray-300" /><p className="text-gray-500 font-medium">{docs.length === 0 ? 'No documents yet' : 'No documents match your filters'}</p>{docs.length === 0 && <p className="text-xs text-gray-400">Click "Add Document" to get started</p>}</div>
                : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">{filteredDocs.map((doc: ResearchDocument) => <DocCard key={doc.id} doc={doc} onSelect={() => setSelectedId(doc.id)} onToggleFeatured={() => handleToggleFeatured(doc)} />)}</div>
              }
            </section>
          </>
        )}
      </div>

      {showAddModal && <AddDocModal onSave={(doc: ResearchDocument) => { addResearchDoc(doc); setShowAddModal(false); }} onClose={() => setShowAddModal(false)} />}
    </div>
  );
}
