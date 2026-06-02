import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function SetPasswordPage() {
  const [sp] = useSearchParams();
  const navigate = useNavigate();
  const token = sp.get('token') ?? '';
  const type  = sp.get('type') ?? 'reset'; // 'invite' | 'reset'

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [show,     setShow]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  const ic = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 bg-white transition-colors';

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to set password');
      }
      const data = await res.json();
      // Store tokens and redirect
      localStorage.setItem('cactus_access',  data.accessToken);
      localStorage.setItem('cactus_refresh', data.refreshToken);
      setDone(true);
      setTimeout(() => navigate('/dashboard', { replace: true }), 1500);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to set password');
    } finally {
      setLoading(false);
    }
  };

  const strength = password.length === 0 ? 0
    : password.length < 8 ? 1
    : password.length < 12 && !/[^a-zA-Z0-9]/.test(password) ? 2
    : 3;
  const strengthLabel = ['', 'Too short', 'Fair', 'Strong'];
  const strengthColor = ['', '#EF4444', '#F59E0B', '#10B981'];

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0A2321 0%, #1C4B42 60%, #254536 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#86CA0F,#95c840)' }}>
              <span className="text-white text-xl">🌵</span>
            </div>
            <span className="text-white font-heading font-bold text-xl">Cactus Partners</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          {done ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <h2 className="font-heading font-bold text-gray-900 text-lg">Password set!</h2>
              <p className="text-sm text-gray-500">Redirecting to dashboard…</p>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-xl font-heading font-bold text-gray-900">
                  {type === 'invite' ? 'Accept invite & set password' : 'Set new password'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  {type === 'invite'
                    ? 'Choose a strong password to activate your account.'
                    : 'Enter a new password for your account.'}
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}

              <form onSubmit={handle} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">New password</label>
                  <div className="relative">
                    <input type={show ? 'text' : 'password'} className={ic + ' pr-10'} value={password}
                      onChange={e => setPassword(e.target.value)} required placeholder="Min 8 characters" />
                    <button type="button" onClick={() => setShow(s=>!s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${strength * 33.3}%`, backgroundColor: strengthColor[strength] }} />
                      </div>
                      <span className="text-xs font-medium" style={{ color: strengthColor[strength] }}>
                        {strengthLabel[strength]}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Confirm password</label>
                  <input type={show ? 'text' : 'password'} className={ic} value={confirm}
                    onChange={e => setConfirm(e.target.value)} required placeholder="Repeat password" />
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#1C4B42' }}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Setting password…' : type === 'invite' ? 'Activate account' : 'Set new password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
