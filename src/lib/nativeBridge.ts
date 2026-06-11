/**
 * Native (Capacitor) bridge initialisation.
 *
 * Runs only inside the iOS/Android shell — on the web it is a no-op. Sets up the
 * status bar, hides the launch splash once the UI is ready, marks <html> with
 * `.capacitor` (so CSS can target the native shell), and wires the Android hardware
 * back button to history navigation (instead of instantly closing the app).
 *
 * All plugin imports are dynamic so the web bundle never pulls native code paths.
 */
import { Capacitor } from '@capacitor/core';

export async function initNative(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  document.documentElement.classList.add('capacitor', `platform-${Capacitor.getPlatform()}`);

  // Status bar — light icons on the dark green bar (config also sets this, but do it
  // at runtime too so a theme/route change can't leave it wrong).
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    // Non-overlay + explicit green: iOS/Android paint the status-bar strip itself in
    // the brand green with light icons. This guarantees NO white strip above the
    // header (the webview never has to fill the notch area). Header sits right below.
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: Style.Light });
    await StatusBar.setBackgroundColor({ color: '#1C4B42' }).catch(() => {}); // Android-only API; no-op on iOS
  } catch { /* plugin unavailable — ignore */ }

  // Hide the splash now that React has mounted and styles are applied.
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch { /* ignore */ }

  // Android hardware back: navigate history; if at the root, send the app to
  // background rather than killing it.
  try {
    const { App } = await import('@capacitor/app');
    App.addListener('backButton', ({ canGoBack }) => {
      if (canGoBack && window.history.length > 1) {
        window.history.back();
      } else {
        App.exitApp();
      }
    });
  } catch { /* ignore */ }
}
