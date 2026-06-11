/**
 * Biometric (Face ID / Touch ID / Android fingerprint) availability + verification,
 * plus an app-PIN fallback. No-ops gracefully on web.
 *
 * The user opts in (stored in Preferences). When enabled, the app requires a biometric
 * (or PIN) check on launch and after returning from background — protecting the
 * confidential financials on a phone that might be left unlocked.
 */
import { Capacitor } from '@capacitor/core';
import { secureGet, secureSet, secureRemove } from './secureStore';

const isNative = Capacitor.isNativePlatform();
const ENABLED_KEY = 'cactus_biometric_enabled';
const PIN_KEY     = 'cactus_app_pin'; // stored in secure store on native

export async function biometricAvailable(): Promise<boolean> {
  if (!isNative) return false;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    const res = await NativeBiometric.isAvailable();
    return !!res.isAvailable;
  } catch { return false; }
}

export async function isLockEnabled(): Promise<boolean> {
  return (await secureGet(ENABLED_KEY)) === '1';
}

export async function setLockEnabled(on: boolean): Promise<void> {
  await secureSet(ENABLED_KEY, on ? '1' : '0');
}

/** Prompt the OS biometric. Returns true if verified. */
export async function verifyBiometric(reason = 'Unlock Cactus Pro'): Promise<boolean> {
  if (!isNative) return true;
  try {
    const { NativeBiometric } = await import('capacitor-native-biometric');
    await NativeBiometric.verifyIdentity({
      reason,
      title: 'Cactus Pro',
      subtitle: 'Confirm your identity',
      description: reason,
    });
    return true; // verifyIdentity resolves on success, rejects on failure/cancel
  } catch { return false; }
}

// ── PIN fallback ──────────────────────────────────────────────────────────────
export async function hasPin(): Promise<boolean> {
  return !!(await secureGet(PIN_KEY));
}
export async function setPin(pin: string): Promise<void> {
  await secureSet(PIN_KEY, pin);
}
export async function clearPin(): Promise<void> {
  await secureRemove(PIN_KEY);
}
export async function verifyPin(pin: string): Promise<boolean> {
  const stored = await secureGet(PIN_KEY);
  return !!stored && stored === pin;
}
