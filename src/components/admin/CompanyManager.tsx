import { useState } from 'react';
import { Pencil, Trash2, Plus, X, Building2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { PortfolioCompany, CompanyStage, CompanyStatus } from '../../data/types';
import SectorPill from '../ui/SectorPill';
import StatusBadge from '../ui/StatusBadge';

const EMPTY: Omit<PortfolioCompany, 'id'> = {
  name: '',
  logoUrl: '',
  sectorId: '',
  stage: 'Seed',
  status: 'Active',
  shortDescription: '',
  longDescription: '',
  foundedYear: 0,
  hqCity: '',
  country: 'India',
  ceoName: '',
  totalFunding: '',
  cactusInvestment: '',
  currentValuation: '',
  ownershipPct: 0,
  moic: 0,
  irr: 0,
  revenue: '',
  ebitda: '',
  employees: 0,
  boardMemberIds: [],
  websiteUrl: '',
  isFeatured: false,
  notes: '',
  testimonialQuote: '',
  testimonialAuthorName: '',
  testimonialAuthorTitle: '',
  tracxnScore: 0,
  tracxnTag: '',
  email: '',
  legalEntityName: '',
  cin: '',
  ipoPlans: '',
  revenueGrowthCagr1yr: '',
  revenueGrowthCagr3yr: '',
  coverageAreas: [],
  competitors: [],
  keyPeople: [],
  fundingRounds: [],
  financialHistory: [],
  capTable: [],
  patents: [],
};

const STAGES: CompanyStage[] = ['Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Late', 'Exited'];
const STATUSES: CompanyStatus[] = ['Active', 'Watch', 'Exited'];

export default function CompanyManager() {
  const { store, addCompany, updateCompany, deleteCompany } = useApp();
  const [editing, setEditing] = useState<PortfolioCompany | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<PortfolioCompany, 'id'>>(EMPTY);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const inputCls =
    'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cactus-accent/30 bg-white';

  const startCreate = () => {
    setForm({ ...EMPTY, sectorId: store.sectors[0]?.id ?? '' });
    setCreating(true);
    setEditing(null);
  };

  const startEdit = (c: PortfolioCompany) => {
    setEditing(c);
    setForm({ ...c });
    setCreating(false);
  };

  const cancel = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = () => {
    if (!form.name.trim()) return;
    if (creating) addCompany({ id: generateId(), ...form });
    else if (editing) updateCompany({ ...editing, ...form });
    cancel();
  };

  const filtered = store.companies.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.ceoName.toLowerCase().includes(search.toLowerCase())
  );

  const toggleBoardMember = (id: string) => {
    setForm((f) => ({
      ...f,
      boardMemberIds: f.boardMemberIds.includes(id)
        ? f.boardMemberIds.filter((x) => x !== id)
        : [...f.boardMemberIds, id],
    }));
  };

  const CompanyForm = () => (
    <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-5">
      <h3 className="text-sm font-semibold text-gray-700">
        {creating ? 'New Company' : `Editing: ${editing?.name}`}
      </h3>

      {/* Basic Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Company Name *</label>
          <input className={inputCls} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Logo URL</label>
          <input className={inputCls} value={form.logoUrl} onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))} placeholder="https://..." />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sector</label>
          <select className={inputCls} value={form.sectorId} onChange={(e) => setForm((f) => ({ ...f, sectorId: e.target.value }))}>
            {store.sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Stage</label>
          <select className={inputCls} value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as CompanyStage }))}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
          <select className={inputCls} value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as CompanyStatus }))}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Website URL</label>
          <input className={inputCls} value={form.websiteUrl} onChange={(e) => setForm((f) => ({ ...f, websiteUrl: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">HQ City</label>
          <input className={inputCls} value={form.hqCity} onChange={(e) => setForm((f) => ({ ...f, hqCity: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
          <input className={inputCls} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">CEO Name</label>
          <input className={inputCls} value={form.ceoName} onChange={(e) => setForm((f) => ({ ...f, ceoName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Founded Year</label>
          <input className={inputCls} type="number" value={form.foundedYear || ''} onChange={(e) => setForm((f) => ({ ...f, foundedYear: parseInt(e.target.value) || 0 }))} />
        </div>
      </div>

      {/* Descriptions */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Short Description</label>
          <input className={inputCls} value={form.shortDescription} onChange={(e) => setForm((f) => ({ ...f, shortDescription: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Long Description</label>
          <textarea className={inputCls} rows={3} value={form.longDescription} onChange={(e) => setForm((f) => ({ ...f, longDescription: e.target.value }))} />
        </div>
      </div>

      {/* Financials */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Financials</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {([ ['totalFunding', 'Total Funding'], ['cactusInvestment', 'Cactus Investment'], ['currentValuation', 'Current Valuation'], ['revenue', 'Revenue'], ['ebitda', 'EBITDA'] ] as [keyof typeof form, string][]).map(([field, label]) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input className={inputCls} value={form[field] as string} onChange={(e) => setForm((f) => ({ ...f, [field]: e.target.value }))} placeholder="e.g. $5M" />
            </div>
          ))}
          {([ ['ownershipPct', 'Ownership %'], ['moic', 'MOIC'], ['irr', 'IRR %'], ['employees', 'Employees'] ] as [keyof typeof form, string][]).map(([field, label]) => (
            <div key={field}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input className={inputCls} type="number" step="0.1" value={form[field] as number || ''} onChange={(e) => setForm((f) => ({ ...f, [field]: parseFloat(e.target.value) || 0 }))} />
            </div>
          ))}
        </div>
      </div>

      {/* Board members */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Cactus Board Members</h4>
        <div className="flex flex-wrap gap-2">
          {store.people.map((p) => (
            <label key={p.id} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
              <input type="checkbox" checked={form.boardMemberIds.includes(p.id)} onChange={() => toggleBoardMember(p.id)} className="rounded" />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      {/* Testimonial */}
      <div>
        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Testimonial</h4>
        <div className="space-y-2">
          <textarea className={inputCls} rows={2} placeholder="Quote..." value={form.testimonialQuote} onChange={(e) => setForm((f) => ({ ...f, testimonialQuote: e.target.value }))} />
          <div className="grid grid-cols-2 gap-2">
            <input className={inputCls} placeholder="Author name" value={form.testimonialAuthorName} onChange={(e) => setForm((f) => ({ ...f, testimonialAuthorName: e.target.value }))} />
            <input className={inputCls} placeholder="Author title" value={form.testimonialAuthorTitle} onChange={(e) => setForm((f) => ({ ...f, testimonialAuthorTitle: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Flags */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((f) => ({ ...f, isFeatured: e.target.checked }))} className="rounded" />
          Featured on homepage
        </label>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-xs font-medium text-gray-600 mb-1">Internal Notes</label>
        <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={save} className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium rounded-lg text-white" style={{ backgroundColor: store.firm.primaryColor }}>
          Save
        </button>
        <button onClick={cancel} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <input
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cactus-accent/30 w-full sm:w-72"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button onClick={startCreate} className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white whitespace-nowrap" style={{ backgroundColor: store.firm.primaryColor }}>
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {creating && <CompanyForm />}

      <div className="space-y-2">
        {filtered.map((c) => (
          <div key={c.id}>
            {editing?.id === c.id ? (
              <CompanyForm />
            ) : (
              <div className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
                <div className="w-10 h-10 rounded-lg border border-gray-100 bg-gray-50 flex items-center justify-center flex-shrink-0">
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.name} className="w-8 h-8 object-contain" />
                  ) : (
                    <Building2 className="w-5 h-5 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                    <SectorPill sectorId={c.sectorId} size="sm" />
                    <StatusBadge status={c.status} />
                    <span className="text-xs text-gray-400">{c.stage}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{c.shortDescription}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => startEdit(c)} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5" /></button>
                  {deleteConfirm === c.id ? (
                    <div className="flex items-center gap-1">
                      <button onClick={() => { deleteCompany(c.id); setDeleteConfirm(null); }} className="px-2 py-1 text-xs bg-red-500 text-white rounded">Delete</button>
                      <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
