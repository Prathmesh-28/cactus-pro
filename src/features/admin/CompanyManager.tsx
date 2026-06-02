import { useState, useRef } from 'react';
import {
  Pencil, Trash2, Plus, X, ChevronDown, ChevronUp, Check, Upload, ImageIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type {
  PortfolioCompany, CompanyStage, CompanyStatus,
  FundingRound, FinancialYear, CapTableEntry, Patent, CompanyKeyPerson,
} from '../../data/types';
import SectorPill from '../../components/ui/SectorPill';
import StatusBadge from '../../components/ui/StatusBadge';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function uploadLogoFile(companyId: string, file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append('file', file);
  try {
    const res = await fetch(`${BASE}/api/files/${companyId || 'logos'}`, { method: 'POST', body: fd });
    if (!res.ok) return null;
    const data = await res.json();
    return `${BASE}/api/files/download/${data.id}`;
  } catch { return null; }
}

// ─── Empty templates ──────────────────────────────────────────────────────────

const EMPTY_COMPANY: Omit<PortfolioCompany, 'id'> = {
  name: '', logoUrl: '', sectorId: '', stage: 'Seed', status: 'Active',
  shortDescription: '', longDescription: '', foundedYear: 0,
  hqCity: '', country: 'India', ceoName: '', totalFunding: '',
  cactusInvestment: '', currentValuation: '', ownershipPct: 0,
  moic: 0, irr: 0, revenue: '', ebitda: '', employees: 0,
  boardMemberIds: [], websiteUrl: '', isFeatured: false, notes: '',
  testimonialQuote: '', testimonialAuthorName: '', testimonialAuthorTitle: '',
  tracxnScore: 0, tracxnTag: '', email: '', legalEntityName: '', cin: '',
  ipoPlans: '', revenueGrowthCagr1yr: '', revenueGrowthCagr3yr: '',
  coverageAreas: [], competitors: [], keyPeople: [],
  fundingRounds: [], financialHistory: [], capTable: [], patents: [],
  teamMembers: [],
};

const EMPTY_ROUND: FundingRound = {
  date: '', roundName: '', amount: '', postMoneyValuation: '',
  leadInvestors: [], allInvestors: [],
};
const EMPTY_FY: FinancialYear = {
  year: '', revenue: '', netProfit: '', ebitda: '', ebitdaMargin: '',
  totalAssets: '', totalDebt: '', employees: 0,
};
const EMPTY_CAP: CapTableEntry = { investor: '', category: '', holdingPct: 0, investment: '', shares: '' };
const EMPTY_PATENT: Patent = { title: '', status: 'Filed', filingLocation: 'India', applicationDate: '', grantDate: '—' };
const EMPTY_PERSON: CompanyKeyPerson = { name: '', title: '', background: '' };

const STAGES: CompanyStage[] = ['Seed', 'Series A', 'Series B', 'Series C', 'Growth', 'Late', 'Exited'];
const STATUSES: CompanyStatus[] = ['Active', 'Watch', 'Exited'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ic = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 focus:ring-emerald-300 bg-white';
const ic_sm = 'border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-300 bg-white w-full';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Accordion({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{title}</span>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

// ─── Tag input ────────────────────────────────────────────────────────────────

function TagInput({ label, values, onChange }: { label: string; values: string[]; onChange: (v: string[]) => void }) {
  const [input, setInput] = useState('');
  const add = () => {
    const t = input.trim();
    if (t && !values.includes(t)) onChange([...values, t]);
    setInput('');
  };
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[28px]">
        {values.map(v => (
          <span key={v} className="flex items-center gap-1 bg-gray-100 text-gray-700 rounded-full px-2.5 py-0.5 text-xs">
            {v}
            <button type="button" onClick={() => onChange(values.filter(x => x !== v))} className="text-gray-400 hover:text-red-500"><X className="w-3 h-3" /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input className={ic + ' flex-1'} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} placeholder="Type and press Enter..." />
        <button type="button" onClick={add} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300">Add</button>
      </div>
    </Field>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

function CompanyForm({ company, onSave, onCancel }: {
  company: PortfolioCompany | null;
  onSave: (data: Omit<PortfolioCompany, 'id'>) => void;
  onCancel: () => void;
}) {
  const { store } = useApp();
  const [form, setForm] = useState<Omit<PortfolioCompany, 'id'>>(
    company ? { ...company } : { ...EMPTY_COMPANY, sectorId: store.sectors[0]?.id ?? '' }
  );
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const set = <K extends keyof typeof form>(k: K, v: typeof form[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const url = await uploadLogoFile(company?.id ?? 'new', file);
    if (url) set('logoUrl', url);
    setLogoUploading(false);
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  // ── Funding Rounds ──────────────────────────────────────────────────────────
  const [newRound, setNewRound] = useState<FundingRound>(EMPTY_ROUND);
  const [editRoundIdx, setEditRoundIdx] = useState<number | null>(null);

  // ── Financial History ───────────────────────────────────────────────────────
  const [newFY, setNewFY] = useState<FinancialYear>(EMPTY_FY);
  const [editFYIdx, setEditFYIdx] = useState<number | null>(null);

  // ── Cap Table ───────────────────────────────────────────────────────────────
  const [newCap, setNewCap] = useState<CapTableEntry>(EMPTY_CAP);
  const [editCapIdx, setEditCapIdx] = useState<number | null>(null);

  // ── Key People ──────────────────────────────────────────────────────────────
  const [newPerson, setNewPerson] = useState<CompanyKeyPerson>(EMPTY_PERSON);
  const [editPersonIdx, setEditPersonIdx] = useState<number | null>(null);

  // ── Patents ─────────────────────────────────────────────────────────────────
  const [newPatent, setNewPatent] = useState<Patent>(EMPTY_PATENT);
  const [editPatentIdx, setEditPatentIdx] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-gray-800">
          {company ? `Editing: ${company.name}` : 'New Company'}
        </h3>
        <button type="button" onClick={onCancel} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
      </div>

      {/* ── 1. Basic Info ───────────────────────────────────────────────────── */}
      <Accordion title="Basic Info" defaultOpen>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Company Name *"><input className={ic} value={form.name} onChange={e => set('name', e.target.value)} /></Field>

          {/* Logo editor */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Company Logo</label>
            <div className="flex items-center gap-3">
              {/* Preview */}
              <div className="w-14 h-14 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                {form.logoUrl
                  ? <img src={form.logoUrl} alt="logo" className="w-full h-full object-contain p-1" />
                  : <ImageIcon className="w-6 h-6 text-gray-300" />}
              </div>
              <div className="flex-1 space-y-1.5">
                {/* Upload button */}
                <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={handleLogoUpload} />
                <button type="button" onClick={() => logoInputRef.current?.click()} disabled={logoUploading}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50">
                  <Upload className="w-3.5 h-3.5" />
                  {logoUploading ? 'Uploading…' : 'Upload from computer'}
                </button>
                {/* URL input */}
                <input className={ic + ' text-xs'} value={form.logoUrl} onChange={e => set('logoUrl', e.target.value)}
                  placeholder="or paste image URL" />
                {form.logoUrl && (
                  <button type="button" onClick={() => set('logoUrl', '')}
                    className="text-[10px] text-red-400 hover:text-red-600">Remove logo</button>
                )}
              </div>
            </div>
          </div>
          <Field label="Sector">
            <select className={ic} value={form.sectorId} onChange={e => set('sectorId', e.target.value)}>
              {store.sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Stage">
            <select className={ic} value={form.stage} onChange={e => set('stage', e.target.value as CompanyStage)}>
              {STAGES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={ic} value={form.status} onChange={e => set('status', e.target.value as CompanyStatus)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Founded Year"><input className={ic} type="number" value={form.foundedYear || ''} onChange={e => set('foundedYear', parseInt(e.target.value) || 0)} /></Field>
          <Field label="HQ City"><input className={ic} value={form.hqCity} onChange={e => set('hqCity', e.target.value)} /></Field>
          <Field label="Country"><input className={ic} value={form.country} onChange={e => set('country', e.target.value)} /></Field>
          <Field label="CEO / Founder Name"><input className={ic} value={form.ceoName} onChange={e => set('ceoName', e.target.value)} /></Field>
          <Field label="Contact Email"><input className={ic} type="email" value={form.email} onChange={e => set('email', e.target.value)} /></Field>
          <Field label="Website URL"><input className={ic} value={form.websiteUrl} onChange={e => set('websiteUrl', e.target.value)} /></Field>
          <Field label="Legal Entity Name"><input className={ic} value={form.legalEntityName} onChange={e => set('legalEntityName', e.target.value)} /></Field>
          <Field label="CIN"><input className={ic} value={form.cin} onChange={e => set('cin', e.target.value)} placeholder="U72900MH2020PTC..." /></Field>
          <div className="sm:col-span-2 flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
              <input type="checkbox" checked={form.isFeatured} onChange={e => set('isFeatured', e.target.checked)} className="rounded" />
              Featured on homepage
            </label>
          </div>
        </div>
      </Accordion>

      {/* ── 2. Descriptions ─────────────────────────────────────────────────── */}
      <Accordion title="Descriptions & Tags">
        <Field label="Short Description (1 line)"><input className={ic} value={form.shortDescription} onChange={e => set('shortDescription', e.target.value)} /></Field>
        <Field label="Long Description"><textarea className={ic} rows={4} value={form.longDescription} onChange={e => set('longDescription', e.target.value)} /></Field>
        <Field label="IPO / Exit Plans"><textarea className={ic} rows={2} value={form.ipoPlans} onChange={e => set('ipoPlans', e.target.value)} /></Field>
        <TagInput label="Coverage Areas" values={form.coverageAreas} onChange={v => set('coverageAreas', v)} />
        <TagInput label="Competitors" values={form.competitors} onChange={v => set('competitors', v)} />
      </Accordion>

      {/* ── 3. Financials (headline) ─────────────────────────────────────────── */}
      <Accordion title="Headline Financials & Returns">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {([
            ['totalFunding',        'Total Funding Raised'],
            ['cactusInvestment',    'Cactus Investment'],
            ['currentValuation',    'Current Valuation'],
            ['revenue',             'Revenue (latest)'],
            ['ebitda',              'EBITDA (latest)'],
            ['revenueGrowthCagr1yr','Revenue CAGR 1yr'],
            ['revenueGrowthCagr3yr','Revenue CAGR 3yr'],
          ] as [keyof typeof form, string][]).map(([k, label]) => (
            <Field key={k} label={label}><input className={ic} value={form[k] as string} onChange={e => set(k, e.target.value)} placeholder="e.g. ₹50 Cr" /></Field>
          ))}
          {([
            ['ownershipPct', 'Ownership %'],
            ['moic',         'MOIC'],
            ['irr',          'IRR %'],
            ['employees',    'Employees'],
            ['tracxnScore',  'Tracxn Score'],
          ] as [keyof typeof form, string][]).map(([k, label]) => (
            <Field key={k} label={label}><input className={ic} type="number" step="0.1" value={(form[k] as number) || ''} onChange={e => set(k, parseFloat(e.target.value) || 0)} /></Field>
          ))}
          <Field label="Tracxn Tag"><input className={ic} value={form.tracxnTag} onChange={e => set('tracxnTag', e.target.value)} placeholder="e.g. Rising Star" /></Field>
        </div>
      </Accordion>

      {/* ── 4. Financial History ─────────────────────────────────────────────── */}
      <Accordion title={`Financial History (${form.financialHistory.length} years)`}>
        {/* Existing rows */}
        {form.financialHistory.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  {['Year','Revenue','Net Profit','EBITDA','Margin','Assets','Debt','Employees',''].map(h =>
                    <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {form.financialHistory.map((row, i) =>
                  editFYIdx === i ? (
                    <tr key={i} className="bg-emerald-50">
                      {(['year','revenue','netProfit','ebitda','ebitdaMargin','totalAssets','totalDebt'] as (keyof FinancialYear)[]).map(k => (
                        <td key={k} className="px-1 py-1"><input className={ic_sm} value={newFY[k] as string} onChange={e => setNewFY(f => ({ ...f, [k]: e.target.value }))} /></td>
                      ))}
                      <td className="px-1 py-1"><input className={ic_sm} type="number" value={newFY.employees || ''} onChange={e => setNewFY(f => ({ ...f, employees: parseInt(e.target.value) || 0 }))} /></td>
                      <td className="px-1 py-1 flex gap-1">
                        <button type="button" onClick={() => { const h=[...form.financialHistory]; h[i]=newFY; set('financialHistory',h); setEditFYIdx(null); }} className="p-1 rounded bg-emerald-500 text-white"><Check className="w-3 h-3"/></button>
                        <button type="button" onClick={() => setEditFYIdx(null)} className="p-1 rounded bg-gray-200 text-gray-600"><X className="w-3 h-3"/></button>
                      </td>
                    </tr>
                  ) : (
                    <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="px-2 py-1.5 font-medium">{row.year}</td>
                      <td className="px-2 py-1.5">{row.revenue}</td>
                      <td className="px-2 py-1.5">{row.netProfit}</td>
                      <td className="px-2 py-1.5">{row.ebitda}</td>
                      <td className="px-2 py-1.5">{row.ebitdaMargin}</td>
                      <td className="px-2 py-1.5">{row.totalAssets}</td>
                      <td className="px-2 py-1.5">{row.totalDebt}</td>
                      <td className="px-2 py-1.5">{row.employees || '—'}</td>
                      <td className="px-2 py-1.5 flex gap-1">
                        <button type="button" onClick={() => { setNewFY({...row}); setEditFYIdx(i); }} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3 h-3"/></button>
                        <button type="button" onClick={() => set('financialHistory', form.financialHistory.filter((_,j)=>j!==i))} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3"/></button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
        {/* Add new row */}
        <div className="border border-dashed border-gray-300 rounded-lg p-3">
          <p className="text-xs font-semibold text-gray-500 mb-2">Add Year</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([['year','Year (e.g. FY2024-25)'],['revenue','Revenue'],['netProfit','Net Profit'],['ebitda','EBITDA'],['ebitdaMargin','EBITDA Margin'],['totalAssets','Total Assets'],['totalDebt','Total Debt']] as [keyof FinancialYear, string][]).map(([k,p]) => (
              <Field key={k} label={p}><input className={ic} value={newFY[k] as string} onChange={e => setNewFY(f => ({ ...f, [k]: e.target.value }))} placeholder={p} /></Field>
            ))}
            <Field label="Employees"><input className={ic} type="number" value={newFY.employees || ''} onChange={e => setNewFY(f => ({ ...f, employees: parseInt(e.target.value) || 0 }))} /></Field>
          </div>
          <button type="button" onClick={() => { if(newFY.year) { set('financialHistory',[...form.financialHistory, newFY]); setNewFY(EMPTY_FY); }}}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white" style={{backgroundColor:store.firm.primaryColor}}>
            <Plus className="w-3.5 h-3.5"/> Add Year
          </button>
        </div>
      </Accordion>

      {/* ── 5. Funding Rounds ─────────────────────────────────────────────────── */}
      <Accordion title={`Funding Rounds (${form.fundingRounds.length})`}>
        {form.fundingRounds.map((r, i) =>
          editRoundIdx === i ? (
            <div key={i} className="border border-emerald-200 rounded-lg p-3 bg-emerald-50 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {([['date','Date'],['roundName','Round'],['amount','Amount'],['postMoneyValuation','Post-money Valuation']] as [keyof FundingRound, string][]).map(([k,p]) => (
                  <Field key={k} label={p}><input className={ic} value={newRound[k] as string} onChange={e => setNewRound(f=>({...f,[k]:e.target.value}))} /></Field>
                ))}
                <Field label="Lead Investors (comma-sep)"><input className={ic} value={newRound.leadInvestors.join(', ')} onChange={e => setNewRound(f=>({...f,leadInvestors:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} /></Field>
                <Field label="All Investors (comma-sep)"><input className={ic} value={newRound.allInvestors.join(', ')} onChange={e => setNewRound(f=>({...f,allInvestors:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} /></Field>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { const rs=[...form.fundingRounds]; rs[i]=newRound; set('fundingRounds',rs); setEditRoundIdx(null); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-emerald-500"><Check className="w-3.5 h-3.5"/>Save</button>
                <button type="button" onClick={() => setEditRoundIdx(null)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-600">Cancel</button>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-center gap-3 border border-gray-100 rounded-lg p-3 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{r.roundName} — {r.amount}</p>
                <p className="text-xs text-gray-500">{r.date} · Post-money: {r.postMoneyValuation}</p>
                <p className="text-xs text-gray-400 truncate">Lead: {r.leadInvestors.join(', ')}</p>
              </div>
              <button type="button" onClick={() => { setNewRound({...r}); setEditRoundIdx(i); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5"/></button>
              <button type="button" onClick={() => set('fundingRounds', form.fundingRounds.filter((_,j)=>j!==i))} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
            </div>
          )
        )}
        {/* Add new round */}
        <div className="border border-dashed border-gray-300 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500">Add Funding Round</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Field label="Date"><input className={ic} value={newRound.date} onChange={e => setNewRound(f=>({...f,date:e.target.value}))} placeholder="Jan 1, 2024" /></Field>
            <Field label="Round Name"><input className={ic} value={newRound.roundName} onChange={e => setNewRound(f=>({...f,roundName:e.target.value}))} placeholder="Series A" /></Field>
            <Field label="Amount"><input className={ic} value={newRound.amount} onChange={e => setNewRound(f=>({...f,amount:e.target.value}))} placeholder="₹50 Cr" /></Field>
            <Field label="Post-money Valuation"><input className={ic} value={newRound.postMoneyValuation} onChange={e => setNewRound(f=>({...f,postMoneyValuation:e.target.value}))} placeholder="₹300 Cr" /></Field>
            <Field label="Lead Investors (comma-sep)"><input className={ic} value={newRound.leadInvestors.join(', ')} onChange={e => setNewRound(f=>({...f,leadInvestors:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} /></Field>
            <Field label="All Investors (comma-sep)"><input className={ic} value={newRound.allInvestors.join(', ')} onChange={e => setNewRound(f=>({...f,allInvestors:e.target.value.split(',').map(s=>s.trim()).filter(Boolean)}))} /></Field>
          </div>
          <button type="button" onClick={() => { if(newRound.roundName){set('fundingRounds',[...form.fundingRounds,newRound]);setNewRound(EMPTY_ROUND);}}}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white" style={{backgroundColor:store.firm.primaryColor}}>
            <Plus className="w-3.5 h-3.5"/> Add Round
          </button>
        </div>
      </Accordion>

      {/* ── 6. Cap Table ─────────────────────────────────────────────────────── */}
      <Accordion title={`Cap Table (${form.capTable.length} entries)`}>
        {form.capTable.map((e, i) =>
          editCapIdx === i ? (
            <div key={i} className="border border-emerald-200 rounded-lg p-3 bg-emerald-50 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <Field label="Investor"><input className={ic} value={newCap.investor} onChange={ev => setNewCap(f=>({...f,investor:ev.target.value}))} /></Field>
                <Field label="Category"><input className={ic} value={newCap.category} onChange={ev => setNewCap(f=>({...f,category:ev.target.value}))} placeholder="VC / Founder / Angel" /></Field>
                <Field label="Holding %"><input className={ic} type="number" step="0.01" value={newCap.holdingPct||''} onChange={ev => setNewCap(f=>({...f,holdingPct:parseFloat(ev.target.value)||0}))} /></Field>
                <Field label="Investment"><input className={ic} value={newCap.investment} onChange={ev => setNewCap(f=>({...f,investment:ev.target.value}))} placeholder="₹10 Cr" /></Field>
                <Field label="Shares"><input className={ic} value={newCap.shares} onChange={ev => setNewCap(f=>({...f,shares:ev.target.value}))} /></Field>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { const c=[...form.capTable]; c[i]=newCap; set('capTable',c); setEditCapIdx(null); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-emerald-500"><Check className="w-3.5 h-3.5"/>Save</button>
                <button type="button" onClick={() => setEditCapIdx(null)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-600">Cancel</button>
              </div>
            </div>
          ) : (
            <div key={i} className={`flex items-center gap-3 border rounded-lg px-4 py-2.5 ${e.investor.toLowerCase().includes('cactus') ? 'border-emerald-200 bg-emerald-50' : 'border-gray-100 bg-white'}`}>
              <div className="flex-1 grid grid-cols-4 gap-2 text-xs">
                <span className="font-semibold text-gray-800">{e.investor}</span>
                <span className="text-gray-500">{e.category}</span>
                <span className="font-medium text-gray-700">{e.holdingPct}%</span>
                <span className="text-gray-500">{e.investment}</span>
              </div>
              <button type="button" onClick={() => { setNewCap({...e}); setEditCapIdx(i); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5"/></button>
              <button type="button" onClick={() => set('capTable', form.capTable.filter((_,j)=>j!==i))} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
            </div>
          )
        )}
        <div className="border border-dashed border-gray-300 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500">Add Entry</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Field label="Investor"><input className={ic} value={newCap.investor} onChange={e => setNewCap(f=>({...f,investor:e.target.value}))} /></Field>
            <Field label="Category"><input className={ic} value={newCap.category} onChange={e => setNewCap(f=>({...f,category:e.target.value}))} placeholder="VC / Founder / Angel" /></Field>
            <Field label="Holding %"><input className={ic} type="number" step="0.01" value={newCap.holdingPct||''} onChange={e => setNewCap(f=>({...f,holdingPct:parseFloat(e.target.value)||0}))} /></Field>
            <Field label="Investment"><input className={ic} value={newCap.investment} onChange={e => setNewCap(f=>({...f,investment:e.target.value}))} placeholder="₹10 Cr" /></Field>
            <Field label="Shares"><input className={ic} value={newCap.shares} onChange={e => setNewCap(f=>({...f,shares:e.target.value}))} /></Field>
          </div>
          <button type="button" onClick={() => { if(newCap.investor){set('capTable',[...form.capTable,newCap]);setNewCap(EMPTY_CAP);}}}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white" style={{backgroundColor:store.firm.primaryColor}}>
            <Plus className="w-3.5 h-3.5"/> Add Entry
          </button>
        </div>
      </Accordion>

      {/* ── 7. Key People (Leadership) ────────────────────────────────────────── */}
      <Accordion title={`Key People / Leadership (${form.keyPeople.length})`}>
        {form.keyPeople.map((p, i) =>
          editPersonIdx === i ? (
            <div key={i} className="border border-emerald-200 rounded-lg p-3 bg-emerald-50 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Field label="Name"><input className={ic} value={newPerson.name} onChange={e => setNewPerson(f=>({...f,name:e.target.value}))} /></Field>
                <Field label="Title"><input className={ic} value={newPerson.title} onChange={e => setNewPerson(f=>({...f,title:e.target.value}))} /></Field>
                <div className="sm:col-span-2">
                  <Field label="Background"><textarea className={ic} rows={3} value={newPerson.background} onChange={e => setNewPerson(f=>({...f,background:e.target.value}))} /></Field>
                </div>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { const pp=[...form.keyPeople]; pp[i]=newPerson; set('keyPeople',pp); setEditPersonIdx(null); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-emerald-500"><Check className="w-3.5 h-3.5"/>Save</button>
                <button type="button" onClick={() => setEditPersonIdx(null)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-600">Cancel</button>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-start gap-3 border border-gray-100 rounded-lg p-3 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800">{p.name}</p>
                <p className="text-xs text-emerald-700 font-medium">{p.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.background}</p>
              </div>
              <button type="button" onClick={() => { setNewPerson({...p}); setEditPersonIdx(i); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 flex-shrink-0"><Pencil className="w-3.5 h-3.5"/></button>
              <button type="button" onClick={() => set('keyPeople', form.keyPeople.filter((_,j)=>j!==i))} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 flex-shrink-0"><Trash2 className="w-3.5 h-3.5"/></button>
            </div>
          )
        )}
        <div className="border border-dashed border-gray-300 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500">Add Person</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Field label="Name"><input className={ic} value={newPerson.name} onChange={e => setNewPerson(f=>({...f,name:e.target.value}))} /></Field>
            <Field label="Title / Role"><input className={ic} value={newPerson.title} onChange={e => setNewPerson(f=>({...f,title:e.target.value}))} /></Field>
            <div className="sm:col-span-2">
              <Field label="Background"><textarea className={ic} rows={2} value={newPerson.background} onChange={e => setNewPerson(f=>({...f,background:e.target.value}))} /></Field>
            </div>
          </div>
          <button type="button" onClick={() => { if(newPerson.name){set('keyPeople',[...form.keyPeople,newPerson]);setNewPerson(EMPTY_PERSON);}}}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white" style={{backgroundColor:store.firm.primaryColor}}>
            <Plus className="w-3.5 h-3.5"/> Add Person
          </button>
        </div>
      </Accordion>

      {/* ── 8. Patents ────────────────────────────────────────────────────────── */}
      <Accordion title={`Patents (${form.patents.length})`}>
        {form.patents.map((p, i) =>
          editPatentIdx === i ? (
            <div key={i} className="border border-emerald-200 rounded-lg p-3 bg-emerald-50 space-y-2">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="sm:col-span-3">
                  <Field label="Patent Title"><input className={ic} value={newPatent.title} onChange={e => setNewPatent(f=>({...f,title:e.target.value}))} /></Field>
                </div>
                <Field label="Status">
                  <select className={ic} value={newPatent.status} onChange={e => setNewPatent(f=>({...f,status:e.target.value}))}>
                    {['Filed','Published','Granted','Pending'].map(s=><option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Filing Location"><input className={ic} value={newPatent.filingLocation} onChange={e => setNewPatent(f=>({...f,filingLocation:e.target.value}))} /></Field>
                <Field label="Application Date"><input className={ic} value={newPatent.applicationDate} onChange={e => setNewPatent(f=>({...f,applicationDate:e.target.value}))} /></Field>
                <Field label="Grant Date"><input className={ic} value={newPatent.grantDate} onChange={e => setNewPatent(f=>({...f,grantDate:e.target.value}))} placeholder="— if not yet granted" /></Field>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { const pp=[...form.patents]; pp[i]=newPatent; set('patents',pp); setEditPatentIdx(null); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg text-white bg-emerald-500"><Check className="w-3.5 h-3.5"/>Save</button>
                <button type="button" onClick={() => setEditPatentIdx(null)} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-200 text-gray-600">Cancel</button>
              </div>
            </div>
          ) : (
            <div key={i} className="flex items-center gap-3 border border-gray-100 rounded-lg px-4 py-2.5 bg-white">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate">{p.title}</p>
                <p className="text-xs text-gray-500">{p.status} · {p.filingLocation} · {p.applicationDate}</p>
              </div>
              <button type="button" onClick={() => { setNewPatent({...p}); setEditPatentIdx(i); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3.5 h-3.5"/></button>
              <button type="button" onClick={() => set('patents', form.patents.filter((_,j)=>j!==i))} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5"/></button>
            </div>
          )
        )}
        <div className="border border-dashed border-gray-300 rounded-lg p-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500">Add Patent</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-3">
              <Field label="Patent Title"><input className={ic} value={newPatent.title} onChange={e => setNewPatent(f=>({...f,title:e.target.value}))} /></Field>
            </div>
            <Field label="Status">
              <select className={ic} value={newPatent.status} onChange={e => setNewPatent(f=>({...f,status:e.target.value}))}>
                {['Filed','Published','Granted','Pending'].map(s=><option key={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Filing Location"><input className={ic} value={newPatent.filingLocation} onChange={e => setNewPatent(f=>({...f,filingLocation:e.target.value}))} /></Field>
            <Field label="Application Date"><input className={ic} value={newPatent.applicationDate} onChange={e => setNewPatent(f=>({...f,applicationDate:e.target.value}))} /></Field>
            <Field label="Grant Date (or —)"><input className={ic} value={newPatent.grantDate} onChange={e => setNewPatent(f=>({...f,grantDate:e.target.value}))} /></Field>
          </div>
          <button type="button" onClick={() => { if(newPatent.title){set('patents',[...form.patents,newPatent]);setNewPatent(EMPTY_PATENT);}}}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-white" style={{backgroundColor:store.firm.primaryColor}}>
            <Plus className="w-3.5 h-3.5"/> Add Patent
          </button>
        </div>
      </Accordion>

      {/* ── 9. Board Members ─────────────────────────────────────────────────── */}
      <Accordion title="Cactus Board Members">
        <div className="flex flex-wrap gap-2">
          {store.people.map(p => (
            <label key={p.id} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50">
              <input type="checkbox" checked={form.boardMemberIds.includes(p.id)}
                onChange={() => set('boardMemberIds', form.boardMemberIds.includes(p.id) ? form.boardMemberIds.filter(x=>x!==p.id) : [...form.boardMemberIds, p.id])}
                className="rounded" />
              <span>{p.name}</span>
              <span className="text-xs text-gray-400">{p.title}</span>
            </label>
          ))}
        </div>
      </Accordion>

      {/* ── 10. Testimonial ──────────────────────────────────────────────────── */}
      <Accordion title="Testimonial / Quote">
        <Field label="Quote"><textarea className={ic} rows={3} value={form.testimonialQuote} onChange={e => set('testimonialQuote', e.target.value)} placeholder="What the founder says about Cactus..." /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Author Name"><input className={ic} value={form.testimonialAuthorName} onChange={e => set('testimonialAuthorName', e.target.value)} /></Field>
          <Field label="Author Title"><input className={ic} value={form.testimonialAuthorTitle} onChange={e => set('testimonialAuthorTitle', e.target.value)} /></Field>
        </div>
      </Accordion>

      {/* ── Save / Cancel ─────────────────────────────────────────────────────── */}
      <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
        <button type="button" onClick={() => onSave(form)}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white shadow-sm transition-opacity hover:opacity-90"
          style={{backgroundColor:store.firm.primaryColor}}>
          {company ? 'Save Changes' : 'Create Company'}
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main manager component ───────────────────────────────────────────────────

export default function CompanyManager() {
  const { store, addCompany, updateCompany, deleteCompany } = useApp();
  const [editing, setEditing] = useState<PortfolioCompany | null>(null);
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filtered = store.companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.ceoName.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = (data: Omit<PortfolioCompany, 'id'>) => {
    if (creating) addCompany({ id: generateId(), ...data });
    else if (editing) updateCompany({ ...editing, ...data });
    setEditing(null);
    setCreating(false);
  };

  // Full-screen edit mode
  if (editing || creating) {
    return (
      <div className="space-y-4">
        <CompanyForm
          company={editing}
          onSave={handleSave}
          onCancel={() => { setEditing(null); setCreating(false); }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <input
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 w-full sm:w-72"
          placeholder="Search companies..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <button onClick={() => setCreating(true)}
          className="flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white whitespace-nowrap"
          style={{backgroundColor: store.firm.primaryColor}}>
          <Plus className="w-4 h-4"/> Add Company
        </button>
      </div>

      <div className="space-y-2">
        {filtered.map(c => (
          <div key={c.id} className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50">
            {/* Logo — larger, prominent */}
            <div className="w-14 h-14 rounded-xl border border-gray-100 bg-white flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden p-1">
              {c.logoUrl
                ? <img src={c.logoUrl} alt={c.name} className="w-full h-full object-contain" />
                : (
                  <div className="w-full h-full rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: 'linear-gradient(135deg,#3B6D11,#5A9E1B)' }}>
                    {c.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-gray-800">{c.name}</span>
                <SectorPill sectorId={c.sectorId} size="sm" />
                <StatusBadge status={c.status} />
                <span className="text-xs text-gray-400">{c.stage}</span>
              </div>
              <div className="flex gap-3 mt-0.5 text-xs text-gray-400 flex-wrap">
                <span>{c.ceoName}</span>
                {c.revenue && <span>Rev: {c.revenue}</span>}
                {c.currentValuation && <span>Val: {c.currentValuation}</span>}
                {c.ownershipPct > 0 && <span>{c.ownershipPct}% Cactus</span>}
                <span className="text-gray-300">
                  {c.fundingRounds.length} rounds · {c.financialHistory.length} FY · {c.capTable.length} cap · {c.keyPeople.length} leaders
                </span>
              </div>
            </div>
            <div className="flex gap-1 flex-shrink-0">
              <button onClick={() => setEditing(c)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">
                <Pencil className="w-3.5 h-3.5"/> Edit All
              </button>
              {deleteConfirm === c.id ? (
                <div className="flex items-center gap-1">
                  <button onClick={() => { deleteCompany(c.id); setDeleteConfirm(null); }} className="px-2 py-1.5 text-xs bg-red-500 text-white rounded-lg">Delete</button>
                  <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(c.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-3.5 h-3.5"/>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
