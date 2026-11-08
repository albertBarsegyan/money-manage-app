# Building an Android App Bundle

Google Play's preferred upload artifact is the Android App Bundle (AAB). Finora's release task is configured to require the local upload-key environment variables; it does not silently produce an unsigned release bundle.

## Build

Configure signing using [signing-guide.md](signing-guide.md), then run from the repository root:

```bash
npm run android:sync
npm run android:build:bundle
```

Output:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

The release build currently uses application ID `com.finora.app`, version name `1.0`, version code `1`, and target API 36. Update version code before each subsequent Play upload.

## Verify

Verify the bundle signature:

```bash
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
```

Review the output carefully; a valid bundle signature alone does not verify policy declarations, installation, or runtime behavior. Play App Signing should be enabled in Play Console. The private upload key signs the uploaded bundle; Google manages the app-signing key used for generated distribution APKs.

## Upload workflow

Upload the AAB to an internal testing track first, confirm Play Console accepts it, inspect the generated pre-launch report, and test the Play-delivered build. Do not upload automatically from this repository. See [Google Play publishing](google-play-publishing.md) for release preparation.
