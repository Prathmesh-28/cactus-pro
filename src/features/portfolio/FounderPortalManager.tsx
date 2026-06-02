import { useState, useMemo } from 'react';
import {
  Plus, X, UserCheck, UserX, AlertTriangle, Info,
  Mail, Building2, Users, Shield,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { generateId } from '../../lib/utils';
import type { FounderPortalAccess } from '../../data/types';

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface InviteModalProps {
  companies: Array<{ id: string; name: string }>;
  onSave: (access: FounderPortalAccess) => void;
  onClose: () => void;
}

function InviteModal({ companies, onSave, onClose }: InviteModalProps) {
  const [companyId, setCompanyId]       = useState('');
  const [founderName, setFounderName]   = useState('');
  const [founderEmail, setFounderEmail] = useState('');

  const handleSave = () => {
    if (!companyId || !founderName || !founderEmail) return;
    onSave({
      id: generateId(),
      companyId,
      founderName,
      founderEmail,
      isActive: true,
      invitedAt: new Date().toISOString(),
      invitedBy: 'Admin',
    });
    onClose();
  };

  const iCls = "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-500";
  const bSt  = { borderColor: '#D4EDAA' };
  const lCls = "block text-xs font-medium text-gray-600 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" style={{ borderTop: '4px solid #1C4B42' }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Invite Founder</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={lCls}>Company *</label>
            <select value={companyId} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setCompanyId(e.target.value)} className={iCls} style={bSt}>
              <option value="">— Select company —</option>
              {companies.map((c: { id: string; name: string }) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lCls}>Founder Name *</label>
            <input type="text" value={founderName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFounderName(e.target.value)} className={iCls} style={bSt} placeholder="Full name" />
          </div>
          <div>
            <label className={lCls}>Founder Email *</label>
            <input type="email" value={founderEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFounderEmail(e.target.value)} className={iCls} style={bSt} placeholder="founder@company.com" />
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={handleSave} disabled={!companyId || !founderName || !founderEmail} className="px-5 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-40" style={{ backgroundColor: '#1C4B42' }}>
            Send Invite
          </button>
        </div>
      </div>
    </div>
  );
}

export default function FounderPortalManager() {
  const { store, addFounderPortalAccess, updateFounderPortalAccess, deleteFounderPortalAccess } = useApp();

  const access: FounderPortalAccess[] = store.founderPortalAccess ?? [];
  const companies = store.companies ?? [];

  const [showInviteModal, setShowInviteModal] = useState(false);

  const companyNames = useMemo(() => {
    const map: Record<string, string> = {};
    companies.forEach((c: { id: string; name: string }) => { map[c.id] = c.name; });
    return map;
  }, [companies]);

  const activeCount   = access.filter((a: FounderPortalAccess) => a.isActive).length;
  const inactiveCount = access.filter((a: FounderPortalAccess) => !a.isActive).length;
  const uniqueCompanies = new Set(access.map((a: FounderPortalAccess) => a.companyId)).size;

  const toggleActive = (item: FounderPortalAccess) => {
    updateFounderPortalAccess({ ...item, isActive: !item.isActive });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Remove this founder portal access?')) deleteFounderPortalAccess(id);
  };

  return (
    <div className="flex flex-col min-h-full" style={{ backgroundColor: '#F6FAF7' }}>
      {/* Header */}
      <div className="border-b px-6 md:px-10 py-6 bg-white/70" style={{ borderColor: '#D4EDAA' }}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-serif uppercase tracking-wide" style={{ color: '#1C4B42' }}>
              Founder Portal Manager
            </h1>
            <p className="text-xs text-gray-400 mt-1 italic">Internal admin view — manage founder portal access permissions</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white shadow-sm"
            style={{ backgroundColor: '#1C4B42' }}
          >
            <Plus className="w-4 h-4" /> Invite Founder
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 md:px-10 py-8 space-y-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 rounded-xl p-4 border" style={{ backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }}>
          <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-sm text-blue-800">
            <strong>Founder Portal requires a separate login app.</strong> This screen manages access permissions only — toggling "Active" controls whether a founder can log in to the portal.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Active', value: activeCount,     icon: <UserCheck className="w-5 h-5" />, color: '#1C4B42', bg: '#F0F7E6' },
            { label: 'Inactive', value: inactiveCount,  icon: <UserX className="w-5 h-5" />,    color: '#6B7280', bg: '#F9FAFB' },
            { label: 'Companies with Access', value: uniqueCompanies, icon: <Building2 className="w-5 h-5" />, color: '#7C3AED', bg: '#F5F3FF' },
          ].map(c => (
            <div key={c.label} className="rounded-xl border p-5 flex items-center gap-4" style={{ backgroundColor: c.bg, borderColor: c.color + '25' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ color: c.color, backgroundColor: c.color + '18' }}>
                {c.icon}
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{c.label}</p>
                <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: '#D4EDAA' }}>
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: '#1C4B42' }} />
            <h2 className="text-sm font-semibold text-gray-700">Access List ({access.length})</h2>
          </div>

          {access.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Users className="w-10 h-10 text-gray-300" />
              <p className="text-gray-500 font-medium">No founders invited yet</p>
              <p className="text-xs text-gray-400">Click "Invite Founder" to grant portal access</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: '#F0F7E6' }}>
                  <tr>
                    {['Company', 'Founder Name', 'Email', 'Status', 'Invited', 'Last Login', 'Actions'].map((h: string) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {access.map((item: FounderPortalAccess) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-green-50/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: '#1C4B42' }}>
                            {(companyNames[item.companyId] ?? item.companyId).charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium text-gray-900 whitespace-nowrap">{companyNames[item.companyId] ?? item.companyId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 font-medium">{item.founderName}</td>
                      <td className="px-4 py-3">
                        <a href={`mailto:${item.founderEmail}`} className="flex items-center gap-1 text-sm text-blue-600 hover:underline">
                          <Mail className="w-3.5 h-3.5 shrink-0" />{item.founderEmail}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        {item.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                            <UserCheck className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600">
                            <UserX className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(item.invitedAt)}</td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                        {item.lastLoginAt ? fmtDate(item.lastLoginAt) : <span className="italic">Never</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggleActive(item)}
                            className={`text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
                              item.isActive
                                ? 'border-gray-200 text-gray-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                : 'hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                            }`}
                            style={!item.isActive ? { borderColor: '#86CA0F', color: '#1C4B42' } : {}}
                          >
                            {item.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-gray-300 hover:text-red-400 transition-colors"
                            title="Remove access"
                          >
                            <AlertTriangle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showInviteModal && (
        <InviteModal
          companies={companies}
          onSave={(a: FounderPortalAccess) => { addFounderPortalAccess(a); setShowInviteModal(false); }}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}
