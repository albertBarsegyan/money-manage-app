# Google Play preparation checklist

Status reviewed: 2026-11-09. This checklist describes the repository as inspected on that date. Play Console declarations must be checked against the exact release build and the developer's real account details before submission.

## App facts found in this repository

- App name: **Finora**.
- Android application ID: **`com.finora.app`**. Treat this as permanent once the app is created in Play Console.
- Version currently configured: **1.0 (version code 1)**.
- Android `minSdk`: **24**; compile and target SDK: **36**.
- Release builds use a local upload key and environment-based signing configuration. The key and passwords are outside the repository. Configure Play App Signing in Play Console and keep a protected backup of the upload key.
- Finance records are stored in IndexedDB on the device. Settings says the app does not upload or synchronize the records. The integrations screen describes CSV import as user-selected/local and says bank feeds and Android notification capture are not connected.
- No app account/sign-in flow, advertising integration, analytics SDK, Firebase configuration, or cloud sync was found in the reviewed app dependencies and UI.
- The manifest requests `INTERNET`; it declares no camera, contacts, location, notification-listener, SMS, call-log, or other sensitive runtime permission. The generated dynamic receiver permission is an Android implementation detail.
- Existing app icons and splash assets are present in the Android project. Google Play listing assets and marketing copy are not present in `docs/android/` or `public/` as store-ready materials.

These are repository observations, not a completed Play Console declaration. Recheck the complete release dependency graph and all app flows before submitting, especially if integrations or SDKs change.

## Account and package readiness

- [ ] Choose the account type based on who publishes and operates Finora. Google requires an organization account for services it classifies as financial products and services. Finora currently appears to be a personal finance record-keeping tool rather than a banking, lending, investment, or crypto service, but confirm the correct classification with Google Play if in doubt before creating the account; account type is consequential.
- [ ] Complete the required identity and contact verification for the selected account type. Personal accounts require personal identity/contact details; organization accounts require organization information and a D-U-N-S number, with limited government/region-specific alternatives.
- [ ] Confirm developer name, public developer email, and any public phone/address information. Keep those contact channels operational.
- [ ] Register/confirm the package name **`com.finora.app`** in the developer verification flow. Google says Play package registration becomes required by September 30, 2026; check the Play Console developer account page for the status of this package.
- [ ] Confirm the Play Console account is owned by the intended person or organization before creating the app entry.

Google references: [account information and D-U-N-S requirements](https://support.google.com/googleplay/android-developer/answer/13628312), [developer identity verification](https://support.google.com/googleplay/android-developer/answer/10841920), [account type selection and financial-services rule](https://support.google.com/googleplay/android-developer/answer/13634885), [package registration](https://support.google.com/googleplay/android-developer/answer/16984799).

## App content and privacy declarations

- [ ] Publish a public privacy policy and add its URL in Play Console. Google requires a privacy policy link in Play Console and a link or policy text within the app. The repository has a local-data explanation in Settings, but no public privacy policy or in-app policy link was found. The policy must name Finora or the listed developer, provide a privacy contact, describe data access/collection/use/sharing, explain security practices, and state retention/deletion practices. Do not publish a policy until the responsible legal entity and contact details are supplied and its statements are accurate.
- [ ] Complete Data safety based on the exact submitted build, including all third-party SDK behavior. Current source indicates finance records remain local and are not sent to a backend; verify this against the release bundle and any future dependencies. Do not treat local-only app data as automatically exempt from every Play disclosure question.
- [ ] Declare whether the app contains ads. The current repository has no ad SDK or ad placements, so **No appears consistent with the inspected build**. Recheck before answering.
- [ ] Complete the content rating questionnaire in Play Console. The result is assigned from the answers; do not pre-assign a rating in this checklist.
- [ ] Declare the target audience truthfully. The product is a general personal finance tracker; the intended age groups need an owner decision. Do not select children unless the app is designed for children and all Families requirements are met.
- [ ] Provide app access instructions. The current app has no login or restricted account area, so state that all features are available without credentials and give any navigation steps reviewers need.
- [ ] Review all policy declarations presented under Play Console **App content**, including financial features and any permission declarations. Based on the current manifest, no sensitive permission declaration appears necessary; reassess if permissions or capabilities are added.
- [ ] Ensure the privacy policy, in-app disclosures, and Data safety answers agree with the actual shipped functionality.

Google references: [privacy and Data safety policy](https://support.google.com/googleplay/android-developer/answer/10144311), [Data safety form guidance](https://support.google.com/googleplay/android-developer/answer/10787469), [app review preparation and declarations](https://support.google.com/googleplay/android-developer/answer/9859455), [target audience declarations](https://support.google.com/googleplay/android-developer/answer/9867159), [content ratings](https://support.google.com/googleplay/android-developer/answer/9859655).

## Store listing materials

- [ ] Decide the final public title and prepare a short description and full description that accurately describe the current local-only finance tracking features. Do not claim bank connection, automatic notification capture, cloud sync, or other unfinished features.
- [ ] Prepare the Google Play high-resolution icon, feature graphic, and phone screenshots for the actual Android release. Existing launcher/PWA icons are source assets, not confirmation that all Play listing asset specifications are satisfied.
- [ ] Add a public support contact and support website or help page. No public support contact or privacy-policy URL was found in the repository.
- [ ] Provide any additional graphics/screenshots required for selected device types or store surfaces. Use real app captures and avoid implying unsupported functionality.

## Build and testing tracks

- [x] Keep the permanent ID `com.finora.app`; do not change it after creating the Play listing.
- [x] Current target API is 36. Google Play's current table requires API 36 or higher for new apps and app updates from August 31, 2026. Recheck the policy immediately before each release.
- [x] Release APK and AAB signing have been prepared locally. In Play Console, enable Play App Signing and use the upload key for uploads. Keep the upload key and its recovery copy private; never commit either or its passwords.
- [ ] Upload the AAB to internal testing first and verify installation/update behavior, the listing, and the final declarations.
- [ ] Run closed testing and gather feedback before production.
- [ ] If this is a personal developer account created after November 13, 2023, Google currently requires a closed test with at least 12 testers continuously opted in for 14 days before applying for production access. Check the account's current Play Console requirement; this condition does not apply to all developer accounts.
- [ ] Consider open testing if useful and available for the account; it is not a substitute for a required closed test.
- [ ] Complete Play Console pre-launch checks, resolve release-blocking issues, and verify the final AAB's package, version, target SDK, and signer before submitting for review.
- [ ] Submit for review only after all declarations and listing details are final and accurate.

Google references: [target API deadlines](https://support.google.com/googleplay/android-developer/answer/11926878), [new personal account testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465), [Android app signing](https://developer.android.com/studio/publish/app-signing).

## Release gate

Do not submit until all of these are true:

1. The account type and identity are verified and the package ID is registered.
2. Public privacy policy and support contact are available, with an in-app policy link or text.
3. Data safety, ads, audience, content rating, app access, and any financial/permission declarations match the release build.
4. Listing text and graphics are complete and describe only working features.
5. Testing requirements for the actual developer account are satisfied.
6. The final signed AAB has been inspected and tested through Play testing tracks.

This document is preparation only. Nothing has been uploaded to Play Console and no app has been submitted for review.
