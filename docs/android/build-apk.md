# Building Android APKs

## Debug APK

Install dependencies, configure the JDK and Android SDK as in [environment-setup.md](environment-setup.md), then run from the repository root:

```bash
npm run android:sync
npm run android:build:debug
```

Output:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Install on a connected device:

```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

The debug APK uses the Android debug signing key and is for development/testing only.

## Signed release APK

Configure the four `FINORA_RELEASE_*` environment variables following [signing-guide.md](signing-guide.md). Gradle intentionally fails closed if signing is incomplete. Then run:

```bash
npm run android:sync
npm run android:build:release
```

Output:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Verify the signature with Android SDK Build Tools:

```bash
apksigner verify --verbose android/app/build/outputs/apk/release/app-release.apk
```

For the Google Play production flow, upload an AAB and enroll in Play App Signing; the signed APK is useful for direct controlled testing or distribution outside Play where appropriate.

## Versioning and checks

The current Android version is configured in `android/app/build.gradle` (`versionName` and `versionCode`). Increment `versionCode` for every uploaded Play release. Inspect package and target metadata before sharing an artifact. Never commit a signed release artifact or signing credentials unless the repository's release process explicitly requires the artifact (the current project does not).
