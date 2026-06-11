import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'in.cactuspartners.app',
  appName: 'Cactus Pro',
  webDir: 'dist',
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
      // Light icons on the dark-green status bar. overlaysWebView=false makes the
      // native layer RESERVE the status-bar height so the webview starts below the
      // notch (content can't hide under it). The CSS safe-area insets then handle
      // the bottom home indicator and landscape side notches.
      style: 'LIGHT',
      backgroundColor: '#1C4B42',
      overlaysWebView: false,
    },
    Keyboard: {
      resize: 'native',             // resize the webview when the keyboard opens
      resizeOnFullScreen: true,
    },
  },
  ios: {
    contentInset: 'always',
  },
};

export default config;
