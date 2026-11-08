# Authentication, storage, and security

## Current application behavior

Finora currently has no app sign-in, server session, refresh token, OAuth flow, cloud API, or account deletion flow. Financial records are stored in IndexedDB in the WebView's local app data. The Settings page offers a control to clear local Finora records. Uninstalling/clearing Android app data may also remove WebView data; users should export or otherwise preserve records before destructive device actions if/when an export feature is available.

The browser and Android builds share product logic, but the Android build packages a static export locally. There are no private backend credentials in the client. Do not add secrets to `NEXT_PUBLIC_*` values or the static bundle.

## If authentication is added later

- Keep authentication and authorization contracts on the existing HTTPS backend; the Android client is not a trusted environment.
- Prefer a browser/system authentication session and validated app/universal links for OAuth redirects. Do not collect provider passwords inside the WebView.
- Use short-lived access tokens and a reviewed refresh-token design. Do not persist sensitive tokens in localStorage or IndexedDB. Use Android Keystore-backed storage through a maintained Capacitor plugin or carefully reviewed native plugin when persistent secrets are required.
- Validate redirect URI, scheme, host, path, state, and any authorization response. Do not trust arbitrary deep-link parameters.
- Enforce authorization server-side, protect state-changing requests against CSRF where cookies are used, and configure CORS for known origins.
- Handle expiry, refresh failures, logout, revoked sessions, and account deletion consistently across web and Android.
- Add an in-app privacy policy and account/data deletion paths if account creation is introduced, then update Play Data safety and app access answers.
- Never log tokens, credentials, finance records, or raw notification contents.

## Existing deep-link handling

The manifest registers the custom scheme `com.finora.app`, and `src/lib/native/deep-links.ts` accepts only known internal route paths while rejecting credentials, ports, query strings, and fragments. This is for app route opening, not an OAuth implementation. Custom schemes can be claimed by another app; use verified Android App Links for security-sensitive identity flows.

## Release security checks

- HTTPS for every production endpoint; cleartext traffic remains disabled.
- No credentials, keystores, or passwords in source control or build logs.
- Review plugin permissions and transitive SDK collection before each release.
- Keep release signing material outside the repository; see [signing-guide.md](signing-guide.md).
- Ensure the privacy policy, app disclosures, and Play Data safety form match real app/SDK behavior.
