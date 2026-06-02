import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AccessRestricted from '../../components/layout/AccessRestricted';
import SectorPill from '../../components/ui/SectorPill';
import { Plus, Pencil, Trash2, X, Check, Calendar, DollarSign } from 'lucide-react';
import { generateId } from '../../lib/utils';
import type { Deal, DealStage } from '../../data/types';

const STAGES: DealStage[] = [
  'Sourcing',
  'Due Diligence',
  'IC Review',
  'Term Sheet',
  'Closed',
  'Passed',
];

const STAGE_COLORS: Record<DealStage, string> = {
  Sourcing: 'bg-gray-100 text-gray-600 border-gray-200',
  'Due Diligence': 'bg-blue-50 text-blue-700 border-blue-200',
  'IC Review': 'bg-violet-50 text-violet-700 border-violet-200',
  'Term Sheet': 'bg-amber-50 text-amber-700 border-amber-200',
  Closed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Passed: 'bg-red-50 text-red-600 border-red-200',
};

const EMPTY: Omit<Deal, 'id'> = {
  companyName: '',
  sectorId: '',
  ticketSize: '',
  leadPartnerId: '',
  dateAdded: new Date().toISOString().slice(0, 10),
  stage: 'Sourcing',
  notes: '',
};

export default function InvestmentPage() {
  const { store, canAccess, addDeal, updateDeal, deleteDeal } = useApp();
  const [editing, setEditing] = useState<Deal | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<Omit<Deal, 'id'>>(EMPTY);

  if (!canAccess('investment')) return <AccessRestricted tab="investment" />;

  const { firm, deals, sectors, people } = store;

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cactus-accent/30 bg-white';

  const startCreate = () => {
    setForm({ ...EMPTY, sectorId: sectors[0]?.id ?? '', leadPartnerId: people[0]?.id ?? '' });
    setCreating(true);
    setEditing(null);
  };

  const startEdit = (d: Deal) => {
    setEditing(d);
    setForm({ companyName: d.companyName, sectorId: d.sectorId, ticketSize: d.ticketSize, leadPartnerId: d.leadPartnerId, dateAdded: d.dateAdded, stage: d.stage, notes: d.notes });
    setCreating(false);
  };

  const cancel = () => { setEditing(null); setCreating(false); };

  const save = () => {
    if (!form.companyName.trim()) return;
    if (creating) addDeal({ id: generateId(), ...form });
    else if (editing) updateDeal({ ...editing, ...form });
    cancel();
  };

  const DealForm = () => (
    <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-3 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Company Name *</label>
          <input className={inputCls} value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Sector</label>
          <select className={inputCls} value={form.sectorId} onChange={(e) => setForm((f) => ({ ...f, sectorId: e.target.value }))}>
            {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Ticket Size</label>
          <input className={inputCls} value={form.ticketSize} onChange={(e) => setForm((f) => ({ ...f, ticketSize: e.target.value }))} placeholder="$2M" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Lead Partner</label>
          <select className={inputCls} value={form.leadPartnerId} onChange={(e) => setForm((f) => ({ ...f, leadPartnerId: e.target.value }))}>
            {people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Date Added</label>
          <input className={inputCls} type="date" value={form.dateAdded} onChange={(e) => setForm((f) => ({ ...f, dateAdded: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Stage</label>
          <select className={inputCls} value={form.stage} onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value as DealStage }))}>
            {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="sm:col-span-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
          <input className={inputCls} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={save} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white" style={{ backgroundColor: firm.primaryColor }}>
          <Check className="w-4 h-4" /> Save
        </button>
        <button onClick={cancel} className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-600">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </div>
  );

  return (
    <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-gray-900 mb-1">Investment Pipeline</h1>
          <p className="text-sm text-gray-500">{deals.length} deals tracked</p>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg text-white"
          style={{ backgroundColor: firm.primaryColor }}
        >
          <Plus className="w-4 h-4" />
          Add Deal
        </button>
      </div>

      {creating && <DealForm />}

      {/* Kanban board */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {STAGES.map((stage) => {
          const stageDeals = deals.filter((d) => d.stage === stage);
          return (
            <div key={stage} className="flex flex-col">
              <div className={`px-3 py-2 rounded-lg border text-xs font-semibold mb-3 ${STAGE_COLORS[stage]}`}>
                {stage}
                <span className="ml-2 font-normal opacity-70">({stageDeals.length})</span>
              </div>
              <div className="space-y-2 flex-1">
                {stageDeals.map((deal) => {
                  const partner = people.find((p) => p.id === deal.leadPartnerId);
                  return (
                    <div key={deal.id}>
                      {editing?.id === deal.id ? (
                        <DealForm />
                      ) : (
                        <div className="bg-white border border-gray-200 rounded-xl p-3 hover:shadow-md transition-shadow group">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm font-semibold text-gray-800 leading-tight">{deal.companyName}</p>
                            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                              <button onClick={() => startEdit(deal)} className="p-1 rounded hover:bg-gray-100 text-gray-400"><Pencil className="w-3 h-3" /></button>
                              <button onClick={() => deleteDeal(deal.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          </div>
                          <SectorPill sectorId={deal.sectorId} size="sm" />
                          <div className="mt-2 space-y-1">
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <DollarSign className="w-3 h-3" />
                              {deal.ticketSize}
                            </div>
                            {partner && (
                              <p className="text-xs text-gray-400">{partner.name}</p>
                            )}
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Calendar className="w-3 h-3" />
                              {deal.dateAdded}
                            </div>
                          </div>
                          {deal.notes && (
                            <p className="text-xs text-gray-400 mt-2 line-clamp-2 italic">{deal.notes}</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                {stageDeals.length === 0 && (
                  <div className="border-2 border-dashed border-gray-100 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-300">No deals</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
