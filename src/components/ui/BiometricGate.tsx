/**
 * Biometric/PIN lock screen. Wraps the authenticated app: when the user has enabled
 * the lock, this overlays a full-screen unlock prompt on launch and whenever the app
 * returns from background. No-op on web and when the lock is disabled.
 */
import { useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Lock, Fingerprint, Delete } from 'lucide-react';
import { isLockEnabled, verifyBiometric, hasPin, verifyPin } from '../../lib/biometric';
import CactusMark from './CactusMark';

const PRIMARY = '#1C4B42';
const isNative = Capacitor.isNativePlatform();

export default function BiometricGate({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [pinEntry, setPinEntry] = useState('');
  const [pinMode, setPinMode] = useState(false);
  const [error, setError] = useState('');
  const lastActive = useRef<number>(Date.now());

  const tryUnlock = async () => {
    setError('');
    const ok = await verifyBiometric('Unlock Cactus Pro');
    if (ok) { setLocked(false); setPinMode(false); setPinEntry(''); }
    else if (await hasPin()) { setPinMode(true); }
    else { setError('Authentication failed. Try again.'); }
  };

  // On mount: if lock enabled, lock and prompt.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isNative || !(await isLockEnabled())) { setChecking(false); return; }
      if (cancelled) return;
      setLocked(true);
      setChecking(false);
      tryUnlock();
    })();
    return () => { cancelled = true; };
  }, []);

  // Re-lock when the app returns from background after >20s away.
  useEffect(() => {
    if (!isNative) return;
    let listener: { remove: () => void } | undefined;
    (async () => {
      const { App } = await import('@capacitor/app');
      const sub = await App.addListener('appStateChange', async ({ isActive }) => {
        if (!isActive) {
          lastActive.current = Date.now();
        } else if (await isLockEnabled() && Date.now() - lastActive.current > 20_000) {
          setLocked(true);
          tryUnlock();
        }
      });
      listener = sub;
    })();
    return () => { listener?.remove(); };
  }, []);

  const submitPin = async (pin: string) => {
    if (await verifyPin(pin)) { setLocked(false); setPinMode(false); setPinEntry(''); setError(''); }
    else { setError('Wrong PIN'); setPinEntry(''); }
  };

  const pressDigit = (d: string) => {
    const next = (pinEntry + d).slice(0, 6);
    setPinEntry(next);
    if (next.length === 6) submitPin(next);
  };

  if (checking) return null;
  if (!locked) return <>{children}</>;

  return (
    <>
      <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-8"
        style={{ background: `linear-gradient(135deg, ${PRIMARY}, #0A2321)`, paddingTop: 'env(safe-area-inset-top,0px)', paddingBottom: 'env(safe-area-inset-bottom,0px)' }}>
        <CactusMark className="w-16 h-16 mb-6" color="#86CA0F" />
        <Lock className="w-5 h-5 text-white/60 mb-2" />
        <p className="text-white font-heading text-lg mb-1">Cactus Pro is locked</p>
        <p className="text-white/50 text-xs mb-8 text-center">Confidential portfolio data — verify to continue.</p>

        {pinMode ? (
          <div className="flex flex-col items-center gap-5">
            <div className="flex gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: i < pinEntry.length ? '#86CA0F' : 'rgba(255,255,255,0.25)' }} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {['1','2','3','4','5','6','7','8','9'].map(d => (
                <button key={d} onClick={() => pressDigit(d)}
                  className="w-16 h-16 rounded-full text-white text-xl font-medium active:scale-95 transition"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>{d}</button>
              ))}
              <div />
              <button onClick={() => pressDigit('0')}
                className="w-16 h-16 rounded-full text-white text-xl font-medium active:scale-95 transition"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>0</button>
              <button onClick={() => setPinEntry(pinEntry.slice(0, -1))}
                className="w-16 h-16 rounded-full flex items-center justify-center text-white/70 active:scale-95">
                <Delete className="w-5 h-5" />
              </button>
            </div>
            <button onClick={tryUnlock} className="text-xs text-white/50 underline mt-2">Use Face ID / fingerprint</button>
          </div>
        ) : (
          <button onClick={tryUnlock}
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-white font-medium"
            style={{ backgroundColor: '#86CA0F', color: PRIMARY }}>
            <Fingerprint className="w-5 h-5" /> Unlock
          </button>
        )}
        {error && <p className="text-red-300 text-xs mt-4">{error}</p>}
      </div>
    </>
  );
}
