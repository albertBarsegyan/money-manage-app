# Android troubleshooting

## Gradle reports an unsupported class file version

The audited machine had Java 25 as its system and Android Studio runtime. The project's Gradle 8.14.3 wrapper failed with Java 25 (`Unsupported class file major version 69`). Select JDK 21 for Gradle in Android Studio and set `JAVA_HOME`/`PATH` for terminal builds. See [environment setup](environment-setup.md).

## Web changes do not appear in Android

Run `npm run android:sync`. This rebuilds the static export to `out/` and copies the web assets and plugin configuration into Android. Then reinstall/rebuild the APK if needed.

## Static export fails on a route

The Android export enumerates route parameters in `src/app/[[...path]]/page.tsx`. Add supported client routes there and ensure the route host has no dependency on Next.js request-time server APIs. The normal web server build and mobile export use different Next.js configurations. Do not add `output: "export"` globally without reviewing web runtime behavior.

## Capacitor cannot find the web directory

Check `capacitor.config.ts` uses `webDir: "out"`, then run `npm run build:mobile` or `npm run android:sync`. Do not point Capacitor at `src/` or a Next `.next/` server build.

## Release build says signing is not configured

Export all four variables listed in [signing-guide.md](signing-guide.md), confirm the keystore file exists, and retry. Never paste passwords into command arguments or logs. The release build is intentionally blocked when signing configuration is incomplete.

## SDK platform or build tools missing

Use Android Studio SDK Manager to install Android SDK Platform 36, Build Tools 36.x, Platform Tools, and (for emulator use) an emulator system image. Check `ANDROID_HOME` and run `adb version`. The project uses the Gradle wrapper; a system Gradle install is unnecessary.

## No device appears in ADB

Run `adb devices -l`, accept the RSA authorization prompt on the device, check USB debugging/cable mode, and reconnect. For an emulator, start it through Android Studio Device Manager and wait for full boot.

## Emulator exits before boot

The audited workstation's API 36 and API 37 AVDs exited during startup with code 139, including tests with software rendering. This indicates a local emulator/runtime issue, not proof of an app crash. Try a compatible system image and supported graphics configuration, inspect Android Studio emulator logs, or test on a physical device. Do not report runtime verification until the app actually installs and launches.

## Inspect runtime logs

```bash
adb logcat
```

Filter for the app process/package or WebView/Capacitor messages using Android Studio Logcat. Avoid sharing logs that could contain user data or secrets.

## Play rejects the bundle or listing

Check package ID/version code, signing/upload key, current target API requirement, account verification, policy declarations, privacy policy URL, assets, testing eligibility, and the exact issue in Play Console. Policy requirements change; use the current official links in [Google Play publishing](google-play-publishing.md).
