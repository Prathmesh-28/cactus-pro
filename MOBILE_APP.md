# Cactus Pro — Android App (free APK distribution)

The web app is wrapped with [Capacitor](https://capacitorjs.com). The Android
project lives in `android/`. This produces an installable `.apk` you can share
directly — **no Play Store and no $25 fee required**.

## One-time setup (already done)
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` installed
- `capacitor.config.ts` — appId `in.cactuspartners.app`, webDir `dist`
- Backend CORS allows the app origins (`https://localhost`, `capacitor://localhost`)
- `android/` native project generated

## Build the APK (do this on a Mac/PC with Android Studio installed)

### 1. Point the app at the LIVE backend (important!)
Create a file named `.env.production` in the project root:
```
VITE_API_URL=https://YOUR-RENDER-URL.onrender.com
```
Without this the app calls `localhost:4000` and login will not work.

### 2. Build the web bundle and copy it into the app
```bash
npm run build
npx cap sync
```
> Run these two commands **every time** you change the app and want a new APK.

### 3. Open Android Studio
```bash
npx cap open android
```
Wait for the bottom "Gradle sync" to finish.

### 4a. Quick shareable APK (debug — easiest)
Android Studio menu: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
When done, click **locate** in the popup. The file is:
```
android/app/build/outputs/apk/debug/app-debug.apk
```
Send that file to anyone. On their Android phone: open it → allow "install from
unknown sources" → Install.

### 4b. Signed release APK (for wider/longer-term sharing)
1. **Build → Generate Signed App Bundle / APK → APK → Create new key store…**
   Save the `.jks` keystore file + passwords somewhere safe **forever** (you need
   the same key to ship updates).
2. Choose **release** → Finish. Output:
   ```
   android/app/build/outputs/apk/release/app-release.apk
   ```

## App icon & splash (optional)
```bash
npm install -D @capacitor/assets
# put resources/icon.png (1024x1024) and resources/splash.png (2732x2732)
npx capacitor-assets generate --android
npx cap sync
```

## Update loop (after the first build)
```bash
npm run build && npx cap sync
```
…then rebuild the APK in Android Studio (step 4).

---

# iOS (iPhone)

The iOS project lives in `ios/`. Icons, splash and the production backend URL
are already baked in.

> ⚠️ **Apple has no free, shareable install file** (no equivalent of the APK).
> To put it on an iPhone you must build & sign through **Xcode**:
> - **Your own iPhone:** free with any Apple ID, but the app expires after **7 days**
>   (just re-run from Xcode to renew).
> - **Other people's iPhones / TestFlight:** requires the **Apple Developer
>   Program ($99/year)**. There is no way around this.

## Steps (needs a Mac with Xcode — already installed here)
```bash
npm run build && npx cap sync
npx cap open ios          # opens the project in Xcode
```
In Xcode:
1. Left sidebar → select **App** → **Signing & Capabilities** tab.
2. Tick **Automatically manage signing** → **Team:** add your Apple ID (free) and
   pick it. (Bundle id is `in.cactuspartners.app`.)
3. Plug your iPhone in via USB → unlock it → tap **Trust this computer**.
4. Top bar: pick your iPhone as the run target → press **▶ Run**.
5. First run only: on the iPhone, **Settings → General → VPN & Device Management
   → trust the developer**, then open the app.

That's it — the app installs and runs on your phone. With a free Apple ID it
works for 7 days; re-run from Xcode to renew, or pay the $99/yr to keep it
permanent and share via TestFlight.
