import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const { store } = useApp();
  const firmLogo = store.firm?.logoUrl;
  const navigate = useNavigate();
  const [sp] = useSearchParams();
  const redirect = sp.get('redirect') || '/dashboard';
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow]         = useState(false);
  const [error, setError]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate(redirect, { replace: true });
  }, [user, loading]);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      navigate(redirect, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const ic = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-500 bg-white transition-colors';

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #0A2321 0%, #1C4B42 60%, #254536 100%)' }}>

      {/* Card */}
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mb-3">
            {firmLogo
              ? <img src={firmLogo} alt="Cactus Partners" className="h-10 w-auto object-contain mx-auto" />
              : <img src="/cactus-logo-white.svg" alt="Cactus Partners" className="h-10 w-auto object-contain mx-auto" />}
          </div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Portfolio Management Portal
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-5">
          <div>
            <h1 className="text-xl font-heading font-bold text-gray-900">Sign in</h1>
            <p className="text-sm text-gray-500 mt-1">Use your Cactus Partners email to continue</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handle} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Email address</label>
              <input type="email" className={ic} value={email}
                onChange={e => setEmail(e.target.value)} required autoFocus
                placeholder="you@cactuspartners.in" />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Password</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} className={ic + ' pr-10'} value={password}
                  onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs font-medium hover:underline"
                style={{ color: '#1C4B42' }}>
                Forgot password?
              </Link>
            </div>

            <button type="submit" disabled={submitting}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              style={{ backgroundColor: '#1C4B42' }}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-xs text-center text-gray-400">
            No account? Contact your administrator to get an invite.
          </p>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.3)' }}>
          © {new Date().getFullYear()} Cactus Partners · Internal use only
        </p>
      </div>
    </div>
  );
}
