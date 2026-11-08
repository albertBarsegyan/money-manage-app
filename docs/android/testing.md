# Android testing and quality checks

## Automated project checks

Run from the repository root:

```bash
npm test
npm run typecheck
npm run lint
npm run build
npm run android:sync
```

`npm run build` checks the normal Next.js web production build. `npm run android:sync` builds the static Android export and synchronizes the native project. Then run Gradle checks from `android/`:

```bash
./gradlew assembleDebug testDebugUnitTest lintDebug
```

The project uses JDK 21 with the current Gradle wrapper on the audited Fedora machine; set `JAVA_HOME` and `PATH` to the selected compatible JDK if needed.

## Device test workflow

1. Start an Android emulator or connect a physical Android device with developer options and USB debugging enabled.
2. Confirm it is visible using `adb devices -l`.
3. Install the debug APK with `adb install -r android/app/build/outputs/apk/debug/app-debug.apk`.
4. Launch Finora and inspect logs using `adb logcat`.
5. Test startup, every route, form validation, IndexedDB persistence after process restart, clear-data behavior, CSV file selection if exercised, keyboard resizing, system bars, Android back behavior, external links, and supported deep links.
6. Test first launch with and without network access. Since the app bundles its UI, startup should not require a remote Next.js server; network-dependent functions are not present in the current build.
7. Repeat on representative screen sizes and Android versions, including Android 7.0/API 24 minimum if practical and current target API devices.

Do not mark permission, push notification, or background processing tests complete: those capabilities are not implemented in the current app.

## Current verification limitations

On the audited workstation, emulator AVDs failed during startup with process exit code 139, including an API 36 image. No physical Android device was attached during that test. Gradle builds and unit tests were available, but runtime installation and device behavior remain unverified until a working emulator or physical device is available.

Record actual commands, device/API version, and results for every release. Distinguish successful build checks from runtime device tests; one does not imply the other.
