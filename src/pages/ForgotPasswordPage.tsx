import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function ForgotPasswordPage() {
  const { store } = useApp();
  const firmLogo = store.firm?.logoUrl;
  const [email,    setEmail]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [error,    setError]    = useState('');

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await fetch(`${BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true); // always show success
    } catch { setSent(true); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0A2321 0%, #1C4B42 60%, #254536 100%)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#86CA0F,#95c840)' }}>
              {firmLogo
                ? <img src={firmLogo} alt="logo" className="w-full h-full object-cover" />
                : <span className="text-white text-xl">🌵</span>}
            </div>
            <span className="text-white font-heading font-bold text-xl">{store.firm?.name || 'Cactus Partners'}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          {sent ? (
            <div className="text-center space-y-3 py-4">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <h2 className="font-heading font-bold text-gray-900 text-lg">Check your email</h2>
              <p className="text-sm text-gray-500">
                If <strong>{email}</strong> has an account, you'll receive a password reset link shortly.
              </p>
              <Link to="/login" className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
                style={{ color: '#1C4B42' }}>
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </div>
          ) : (
            <>
              <div>
                <h1 className="text-xl font-heading font-bold text-gray-900">Forgot password</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />{error}
                </div>
              )}
              <form onSubmit={handle} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Email address</label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus
                    placeholder="you@cactuspartners.in"
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 bg-white" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#1C4B42' }}>
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
              <Link to="/login" className="flex items-center gap-1.5 text-sm font-medium justify-center hover:underline"
                style={{ color: '#1C4B42' }}>
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
