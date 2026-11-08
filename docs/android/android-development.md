# Android development workflow

## Prerequisites

Install the tools and SDK packages in [environment-setup.md](environment-setup.md). This repository was verified with JDK 21, Android SDK Platform/Build Tools 36, Android Gradle Plugin 8.13.0, Gradle 8.14.3, Kotlin 2.3.0, and Capacitor 8.6.x. The Android Gradle wrapper is authoritative; do not install a global Gradle to build this project.

## Typical development loop

From the project root:

```bash
npm install
npm run android:sync
npm run android:build:debug
```

Open Android Studio when inspecting native files or using its device manager:

```bash
npm run android:open
```

To install a built debug APK on a connected device with USB debugging enabled:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Check device connectivity first:

```bash
adb devices -l
```

The Gradle project lives in `android/`; Kotlin application code begins at `android/app/src/main/java/com/finora/app/`. `MainActivity.kt` subclasses Capacitor's `BridgeActivity`. Do not edit generated `capacitor.settings.gradle`, `capacitor.build.gradle`, or plugin registration outputs by hand; change source configuration or plugin installation, then run `npm run android:sync`.

## Web changes and native changes

- For React/TypeScript, styling, or route changes, run `npm run android:sync` so the new static export reaches the Android app.
- For manifest, Gradle, resources, or Kotlin changes, rebuild with `npm run android:build:debug`.
- For plugin dependency changes, sync and rebuild. Verify the merged manifest and generated permissions before release.

The regular `npm run dev` and `npm run build` workflows continue to serve/build the web application. The Android runtime is a bundled static export, so Next.js server-only functionality is unavailable there.

## Useful commands

```bash
./android/gradlew -p android tasks
./android/gradlew -p android assembleDebug
adb logcat
```

Use a JDK compatible with the checked Gradle wrapper. On the audited Fedora setup, JDK 21 is required; the system/Studio Java 25 caused a Gradle class-file compatibility failure.

See [build-apk.md](build-apk.md), [build-aab.md](build-aab.md), and [testing.md](testing.md) for artifact and validation details.
