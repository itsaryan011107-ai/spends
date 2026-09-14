# Spends Android App

Spends is packaged as a native Android app with Capacitor. The React/Vite app remains the source of truth; Capacitor copies the built web assets into the Android WebView.

The web and Android release workflows are separate. Vercel publishes only `dist`, and `.vercelignore` excludes the native Android project. The Vercel `ignoreCommand` also skips web deployments when a commit changes only Android files, native branding assets, or Capacitor documentation/configuration. A web deployment never creates or publishes an APK.

## Configuration

- App name: `Spends`
- Android application ID: `com.spends.app`
- Web asset directory: `dist`
- Native project directory: `android`

## Files changed or added

- `package.json`: Adds Capacitor dependencies and scripts for syncing, copying, and opening Android.
- `package-lock.json`: Records the Capacitor and asset-generator dependencies.
- `capacitor.config.json`: Defines the app name, application ID, and Vite output directory.
- `index.html`: Adds `viewport-fit=cover` so WebView safe-area insets are available.
- `src/styles.css`: Uses `100dvh` and safe-area environment variables on mobile so content clears the status area and bottom navigation.
- `resources/icon.png`: Source placeholder based on the existing Spends logo for app icon generation.
- `resources/splash.png`: Source placeholder based on the existing Spends wireframe logo for splash generation.
- `android/`: Generated Capacitor Android project, including Gradle files, Android manifest, native bridge setup, generated icons, and splash resources.
- `CAPACITOR.md`: This setup and command reference.
- `vercel.json`: Restricts Vercel to the Vite build output and skips web deployments for Android-only commits.
- `.vercelignore`: Prevents native Android project files and Capacitor-only files from being included in the Vercel upload.

No React business logic, routes, local-storage keys, state management, or component behavior was changed for Capacitor. These continue to run inside the Android WebView.

## Release separation

Web changes deploy through the connected GitHub `main` branch and Vercel. They do not update an installed Android APK.

Android changes are local/native release work. Run `npm run cap:sync` only when you intentionally want to copy the current web assets into the Android project, then build an APK with Gradle. An already-built APK never changes unless a new APK is explicitly generated and distributed.

## Commands

Install dependencies:

```powershell
npm install
```

Run the web app locally:

```powershell
npm run dev
```

Build web assets:

```powershell
npm run build
```

Build and sync web assets into Android:

```powershell
npm run cap:sync
```

Copy already-built assets without rebuilding:

```powershell
npm run cap:copy
```

Open the Android project in Android Studio:

```powershell
npm run cap:open
```

Generate a debug APK from the project root:

```powershell
cd android
.\gradlew.bat assembleDebug
```

The debug APK is written to:

```text
android\app\build\outputs\apk\debug\app-debug.apk
```

Generate a release APK after configuring signing:

```powershell
cd android
.\gradlew.bat assembleRelease
```

Before opening Android Studio or generating an APK, install Android Studio, the Android SDK, and a supported JDK, then ensure `java` is available on `PATH`. The Android project can be generated and synced without those tools, but Gradle cannot compile an APK until they are installed.
