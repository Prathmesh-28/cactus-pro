/**
 * Shows a "Connecting to server…" banner when the Render backend is cold-starting.
 * Polls /health until it responds, then disappears.
 */
import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

type Status = 'checking' | 'online' | 'offline';

export default function ConnectionBanner() {
  const [status, setStatus] = useState<Status>('checking');
  const [retryCount, setRetryCount] = useState(0);

  const check = async () => {
    try {
      const res = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(8000) });
      setStatus(res.ok ? 'online' : 'offline');
    } catch {
      setStatus('offline');
    }
  };

  useEffect(() => {
    check();
  }, [retryCount]); // eslint-disable-line

  useEffect(() => {
    if (status !== 'offline') return;
    // Auto-retry every 10s when offline (Render cold start takes ~10-15s)
    const id = setTimeout(() => setRetryCount(c => c + 1), 10_000);
    return () => clearTimeout(id);
  }, [status]);

  if (status === 'online') return null;

  if (status === 'checking') return (
    <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center gap-2 py-2 text-xs font-medium text-white"
      style={{ background: 'linear-gradient(90deg,#1E293B,#2D4A6B)' }}>
      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
      Connecting to server… data will load shortly
    </div>
  );

  return (
    <div className="fixed top-16 left-0 right-0 z-40 flex items-center justify-center gap-3 py-2 text-xs font-medium text-white bg-red-600">
      <WifiOff className="w-3.5 h-3.5" />
      Server unreachable — data may be stale.
      <button onClick={() => { setStatus('checking'); setRetryCount(c => c + 1); }}
        className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors">
        <Wifi className="w-3 h-3" /> Retry
      </button>
    </div>
  );
}
