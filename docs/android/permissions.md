# Android permissions

## Current manifest

The app manifest is `android/app/src/main/AndroidManifest.xml`. It currently declares `android.permission.INTERNET`; it does not declare camera, contacts, location, notification-listener, SMS, call-log, or other sensitive runtime permissions. `INTERNET` is a normal permission and is not presented as a runtime prompt. Cleartext traffic is disabled with `android:usesCleartextTraffic="false"`.

Gradle/AndroidX may contribute generated permissions in the merged manifest. Inspect the merged manifest for every release and understand any permission added by a plugin before shipping.

## Adding a permission

1. Confirm a real user-facing feature requires it.
2. Prefer the narrowest Android API and official Capacitor plugin that implements the feature.
3. Add the permission only as documented by the selected API/plugin.
4. Request dangerous/runtime permissions when needed, at the point of use, with a clear user explanation.
5. Handle denial, revocation, and unsupported devices without crashing or blocking unrelated functionality.
6. Rebuild/sync, inspect the merged manifest, and test grant/deny paths on Android.
7. Update the privacy notice and Google Play declarations, including sensitive-permission declarations if applicable.

Do not add permissions speculatively or request broad storage access when the Android document picker or app-private storage is sufficient. Android notification-listener access is a special user-enabled system setting, not a normal runtime permission; Finora does not currently implement it.

## Network security

Production endpoints must use HTTPS. Keep cleartext traffic disabled globally. Do not add a broad cleartext exception to make a development backend work; use a secure development endpoint or a narrowly scoped development-only configuration that is excluded from release.

## Release review

Review both source and merged manifests, including plugin manifests. Confirm Play Console permission declarations match actual behavior. Any change to the permission set requires a fresh privacy, policy, and device-testing review.
