/**
 * Secure key/value storage for sensitive values (the long-lived refresh token).
 *
 * On native (iOS/Android) it uses Capacitor Preferences, which is backed by the
 * platform secure store (Keychain on iOS, EncryptedSharedPreferences/Keystore on
 * Android) — NOT readable by injected JS, unlike localStorage. On the web it falls
 * back to localStorage (no Keychain available in a browser).
 *
 * Async by necessity (native APIs are async). The short-lived access token stays in
 * localStorage for synchronous reads; only the refresh token is moved here.
 */
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

export async function secureSet(key: string, value: string): Promise<void> {
  if (isNative) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.set({ key, value });
  } else {
    try { localStorage.setItem(key, value); } catch { /* quota */ }
  }
}

export async function secureGet(key: string): Promise<string | null> {
  if (isNative) {
    const { Preferences } = await import('@capacitor/preferences');
    const { value } = await Preferences.get({ key });
    return value ?? null;
  }
  try { return localStorage.getItem(key); } catch { return null; }
}

export async function secureRemove(key: string): Promise<void> {
  if (isNative) {
    const { Preferences } = await import('@capacitor/preferences');
    await Preferences.remove({ key });
  } else {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }
}
