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
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    const res = await BiometricAuth.checkBiometry();
    return !!res.isAvailable;
  } catch { return false; }
}

export async function isLockEnabled(): Promise<boolean> {
  return (await secureGet(ENABLED_KEY)) === '1';
}

export async function setLockEnabled(on: boolean): Promise<void> {
  await secureSet(ENABLED_KEY, on ? '1' : '0');
}

/** Prompt the OS biometric. Returns true if verified.
 *  useFallback:true lets iOS/Android offer the device passcode if Face ID/fingerprint
 *  isn't available or fails — so the lock still works on devices without enrolled
 *  biometrics. */
export async function verifyBiometric(reason = 'Unlock Cactus Pro'): Promise<boolean> {
  if (!isNative) return true;
  try {
    const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
    await BiometricAuth.authenticate({
      reason,
      cancelTitle: 'Cancel',
      // Allow the device passcode as a fallback so the lock still works if Face ID /
      // fingerprint fails or isn't enrolled.
      allowDeviceCredential: true,
      iosFallbackTitle: 'Use passcode',
      androidTitle: 'Cactus Pro',
      androidSubtitle: 'Confirm your identity',
    });
    return true; // authenticate() resolves on success, throws BiometryError otherwise
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
