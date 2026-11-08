# Google Play publishing

This is a release workflow guide, not authorization to upload or publish. Review [google-play-checklist.md](google-play-checklist.md) before acting.

## Before creating the app listing

- Confirm the correct personal or organization developer account type and complete Google identity/contact verification.
- Confirm the permanent package ID `com.finora.app` and complete any package registration requirement shown in Play Console.
- Decide the publisher/developer name and public support contact.
- Prepare a public privacy policy and an in-app policy link or text. Current repository settings text is not a substitute for a complete published policy.
- Prepare accurate title, short/full descriptions, high-resolution icon, feature graphic, screenshots, and support URL. Describe only capabilities that ship; bank feeds, cloud sync, and Android notification capture are not active in the current build.

## App content declarations

Complete all declarations Play Console presents for the submitted app:

- Ads: current source has no advertising integration; recheck the exact release dependencies.
- App access: current build has no login or restricted account; provide reviewer instructions accordingly.
- Target audience and content: choose intended age groups accurately.
- Content rating: answer the questionnaire based on actual functionality.
- Data safety: disclose collection/sharing for the app and every included SDK. Current finance records are local-only according to the source; validate release behavior and dependency disclosures.
- Privacy policy: ensure the Play Console URL and in-app policy link/text work publicly and match Data safety.
- Permissions and financial features: complete any declaration required by Play Console based on actual app functionality and merged manifest.

Consult the live [Play app review guidance](https://support.google.com/googleplay/android-developer/answer/9859455), [Data safety guidance](https://support.google.com/googleplay/android-developer/answer/10787469), and [target API policy](https://support.google.com/googleplay/android-developer/answer/11926878) immediately before submission. Requirements can change.

## Build and testing sequence

1. Run project checks and build the signed bundle using [build-aab.md](build-aab.md).
2. Increment and verify `versionCode`, package ID, target SDK, and signature.
3. Upload manually to the internal test track and verify installation and update behavior from the Play-delivered artifact.
4. Run closed testing and resolve issues. New personal developer accounts created after November 13, 2023 currently need at least 12 testers continuously opted in for 14 days before applying for production access; check the current account-specific Play Console status.
5. Complete the store listing and policy forms, inspect pre-launch report/device coverage, and fix release blockers.
6. Submit for review only after the responsible publisher verifies every declaration and has authority to publish.

Google Play may revise target API deadlines, developer identity requirements, testing requirements, and policy forms. Check the live documentation and Play Console for the account's actual requirements rather than relying on a copied checklist.
