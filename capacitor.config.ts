import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.cactuspartners.app',
  appName: 'Cactus Pro',
  webDir: 'dist',
  // The native window/webview background — shows in the status-bar strip (overlay off)
  // and during load, so it must be the brand green, never white.
  backgroundColor: '#1C4B42',
  // Use the https scheme so the native webview origin is https://localhost — this
  // matches the backend CORS allow-list and avoids mixed-content blocking of the
  // https Render API.
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: false,        // hidden from JS once React has mounted (main.tsx)
      backgroundColor: '#1C4B42',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      // Light icons, and the status bar OVERLAYS the webview so there is a single
      // continuous surface behind the notch (no native-strip-vs-webview seam / white
      // line). The page background flows up under the status bar; CSS safe-area insets
      // push the actual content down so nothing hides under the notch.
      style: 'LIGHT',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: 'native',             // resize the webview when the keyboard opens
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'always',
    backgroundColor: '#1C4B42',
  },
};

export default config;
