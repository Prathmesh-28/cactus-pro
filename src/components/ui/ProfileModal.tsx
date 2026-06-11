/**
 * Profile modal — lets any signed-in user edit their own name and change their
 * password. Works everywhere (web + iOS + Android), since it talks to the shared
 * backend via AuthContext.updateProfile / changePassword.
 */
import { useState } from 'react';
import { X, User, KeyRound, Check, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PRIMARY = '#1C4B42';

export default function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, updateProfile, changePassword } = useAuth();
  const [tab, setTab] = useState<'profile' | 'password'>('profile');

  // Profile form
  const [name, setName] = useState(user?.name ?? '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Password form
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const saveProfile = async () => {
    if (!name.trim()) { setProfileMsg({ ok: false, text: 'Name cannot be empty.' }); return; }
    setSavingProfile(true); setProfileMsg(null);
    try {
      await updateProfile({ name: name.trim() });
      setProfileMsg({ ok: true, text: 'Profile updated.' });
    } catch (e) {
      setProfileMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not update profile.' });
    } finally { setSavingProfile(false); }
  };

  const savePassword = async () => {
    setPwMsg(null);
    if (next.length < 8) { setPwMsg({ ok: false, text: 'New password must be at least 8 characters.' }); return; }
    if (next !== confirm) { setPwMsg({ ok: false, text: 'New passwords do not match.' }); return; }
    setSavingPw(true);
    try {
      await changePassword(current, next);
      setPwMsg({ ok: true, text: 'Password changed. Other devices will need to sign in again.' });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (e) {
      setPwMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not change password.' });
    } finally { setSavingPw(false); }
  };

  const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white';
  const label = 'text-xs font-medium text-gray-500 mb-1 block';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4"
      style={{ paddingTop: 'env(safe-area-inset-top,0px)', paddingBottom: 'env(safe-area-inset-bottom,0px)' }}
      onClick={onClose}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ background: PRIMARY }}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shrink-0"
              style={{ backgroundColor: '#86CA0F', color: PRIMARY }}>
              {(user?.name?.[0] ?? user?.email?.[0] ?? '?').toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white font-semibold text-sm truncate">{user?.name || 'Your profile'}</p>
              <p className="text-white/60 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 text-white/70 hover:text-white shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button onClick={() => setTab('profile')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium ${tab === 'profile' ? 'text-gray-900 border-b-2' : 'text-gray-400'}`}
            style={tab === 'profile' ? { borderColor: PRIMARY } : {}}>
            <User className="w-4 h-4" /> Details
          </button>
          <button onClick={() => setTab('password')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium ${tab === 'password' ? 'text-gray-900 border-b-2' : 'text-gray-400'}`}
            style={tab === 'password' ? { borderColor: PRIMARY } : {}}>
            <KeyRound className="w-4 h-4" /> Password
          </button>
        </div>

        <div className="p-5 overflow-y-auto">
          {tab === 'profile' ? (
            <div className="space-y-4">
              <div>
                <label className={label}>Full name</label>
                <input className={input} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <label className={label}>Email</label>
                <input className={`${input} bg-gray-50 text-gray-400`} value={user?.email ?? ''} disabled />
                <p className="text-[11px] text-gray-400 mt-1">Email is managed by an admin and can't be changed here.</p>
              </div>
              <div>
                <label className={label}>Role</label>
                <input className={`${input} bg-gray-50 text-gray-400`} value={user?.role ?? ''} disabled />
              </div>
              {profileMsg && (
                <p className={`text-xs ${profileMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{profileMsg.text}</p>
              )}
              <button onClick={saveProfile} disabled={savingProfile}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ background: PRIMARY }}>
                {savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Save changes
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className={label}>Current password</label>
                <div className="relative">
                  <input className={input} type={showPw ? 'text' : 'password'} value={current}
                    onChange={e => setCurrent(e.target.value)} placeholder="••••••••" />
                </div>
              </div>
              <div>
                <label className={label}>New password</label>
                <div className="relative">
                  <input className={input} type={showPw ? 'text' : 'password'} value={next}
                    onChange={e => setNext(e.target.value)} placeholder="At least 8 characters" />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={label}>Confirm new password</label>
                <input className={input} type={showPw ? 'text' : 'password'} value={confirm}
                  onChange={e => setConfirm(e.target.value)} placeholder="Re-type new password" />
              </div>
              {pwMsg && (
                <p className={`text-xs ${pwMsg.ok ? 'text-emerald-600' : 'text-red-500'}`}>{pwMsg.text}</p>
              )}
              <button onClick={savePassword} disabled={savingPw || !current || !next}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-white text-sm font-medium disabled:opacity-50"
                style={{ background: PRIMARY }}>
                {savingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />} Change password
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
