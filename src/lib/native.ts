/**
 * Thin wrappers over Capacitor native plugins. Every function is safe to call on the
 * web — it no-ops or falls back to a browser equivalent. Plugin imports are dynamic so
 * the web bundle never eagerly pulls native code.
 */
import { Capacitor } from '@capacitor/core';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'ios' | 'android' | 'web'

// ── Haptics ─────────────────────────────────────────────────────────────────
export async function haptic(style: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') {
  if (!isNative) return;
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');
    if (style === 'success' || style === 'warning' || style === 'error') {
      const map = { success: NotificationType.Success, warning: NotificationType.Warning, error: NotificationType.Error };
      await Haptics.notification({ type: map[style] });
    } else {
      const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
      await Haptics.impact({ style: map[style] });
    }
  } catch { /* ignore */ }
}

// ── Share sheet ─────────────────────────────────────────────────────────────
// On native, opens the OS share sheet. On web, falls back to the Web Share API,
// then to copying the URL to the clipboard.
export async function shareContent(opts: { title?: string; text?: string; url?: string }) {
  if (isNative) {
    try {
      const { Share } = await import('@capacitor/share');
      await Share.share(opts);
      return true;
    } catch { return false; }
  }
  if (navigator.share) {
    try { await navigator.share(opts); return true; } catch { return false; }
  }
  if (opts.url) { try { await navigator.clipboard.writeText(opts.url); return true; } catch { /* ignore */ } }
  return false;
}

// ── Save a file (base64) to the device and share/open it ──────────────────────
// Used for exporting PDFs / CSVs. On web, triggers a normal browser download.
export async function saveAndShareFile(fileName: string, base64Data: string, mimeType: string) {
  if (isNative) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const res = await Filesystem.writeFile({ path: fileName, data: base64Data, directory: Directory.Cache });
    try { await Share.share({ title: fileName, url: res.uri }); } catch { /* user cancelled */ }
    return res.uri;
  }
  // Web fallback: data-URL download
  const a = document.createElement('a');
  a.href = `data:${mimeType};base64,${base64Data}`;
  a.download = fileName;
  a.click();
  return null;
}

// ── In-app browser (external links without leaving the app) ───────────────────
export async function openExternal(url: string) {
  if (isNative) {
    try {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return;
    } catch { /* fall through */ }
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

// ── Camera capture (photo) → base64 data URL ─────────────────────────────────
export async function capturePhoto(): Promise<string | null> {
  if (!isNative) return null; // web uses a file <input> elsewhere
  try {
    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: 80,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Prompt, // lets the user pick camera or library
    });
    return photo.dataUrl ?? null;
  } catch { return null; }
}
