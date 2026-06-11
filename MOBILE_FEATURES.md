# Cactus Pro — Native App Features

What the iOS/Android apps now do beyond the web app, what's wired and working, and the
few things that need **your** external setup (Apple/Firebase) before they fully function.

All native code is no-op-safe on web — the same bundle runs everywhere.

## ✅ Working now (zero external setup)

| Feature | Where | Notes |
|---|---|---|
| **Biometric app lock** (Face ID / Touch ID / fingerprint) | Profile → Lock tab toggle | Locks on launch + after 20s in background. Off by default; user opts in. |
| **6-digit PIN fallback** | Profile → Lock tab | Used if biometrics fail/declined. |
| **Secure token storage** | AuthContext | The 30-day refresh token now lives in the iOS Keychain / Android Keystore (`@capacitor/preferences` secure backing), not localStorage. Access token stays in localStorage (short-lived). |
| **Profile editing + change password** | Header menu → Manage profile | Edit name; change password (verifies current). Backend: `PUT /auth/me`, `POST /auth/change-password`. |
| **Native share sheet** | `shareContent()` in `lib/native.ts` | Share text/URLs to Mail/WhatsApp/AirDrop. Web falls back to Web Share / clipboard. |
| **Save & share files** | `saveAndShareFile()` | Export PDF/CSV to device + share. Web = normal download. |
| **Camera / photo capture** | `capturePhoto()` | Snap a doc/card → base64. (Wire into an attach button where needed.) |
| **In-app browser** | `openExternal()` | External links open without leaving the app. |
| **Haptics** | `haptic()` (wired to finance tabs) | Subtle taps; call `haptic('success'|'light'|…)` anywhere. |
| **Deep links / universal links** | `nativeBridge` → `cactus:navigate` event | `cactuspartners://company/lohum` or an app link routes to the screen. (URL scheme still needs registering in Xcode/Android manifest for custom schemes — see below.) |
| **Android hardware back** | `nativeBridge` | Navigates history; exits at root. |
| **Status bar + splash + safe areas** | config + `index.css` | Green status bar, butterfly splash, notch-safe layout. |

## ⚙️ Wired in code, needs YOUR external setup to actually fire

### Push notifications
The **client registration + backend token store are done** (`@capacitor/push-notifications`,
`/api/push/register`, `push_tokens` table). But pushes can't be *sent* until you:

1. **iOS:** create an **APNs Auth Key** in your Apple Developer account (needs the paid
   $99/yr program) and add it to your push provider.
2. **Android:** create a **Firebase project**, add the `google-services.json` to
   `android/app/`, and put the FCM server key in the backend.
3. **Backend sender:** add code that, on events (IC memo created, capital call due,
   health flag red), looks up `push_tokens` and sends via APNs/FCM. (Not built — needs
   the credentials above first.)

Until then the app registers tokens silently and no pushes are sent. No errors.

### Custom URL scheme (for `cactuspartners://` deep links)
Universal/https links work once configured, but the custom scheme needs one-time native
registration: iOS `Info.plist` `CFBundleURLTypes`, Android intent-filter. Tell me and I'll
add them.

## ❌ Deliberately skipped (low value / high effort for this app)
Widgets, Siri shortcuts, geofencing — weak Capacitor support and little value for a
10–20 user internal VC tool. App-switcher screenshot-blur was skipped (the npm plugin
under the expected name isn't published; can revisit with a native snippet if you want it).

## To get any of this onto your phone
`npm run build && npx cap sync ios`, then press **▶ Run** in Xcode (the signing step is
yours; the CLI can't sign for a physical device).
