# Android release signing

The release build reads these environment variables and never writes their values into Gradle files:

- `FINORA_RELEASE_STORE_FILE`
- `FINORA_RELEASE_STORE_PASSWORD`
- `FINORA_RELEASE_KEY_ALIAS`
- `FINORA_RELEASE_KEY_PASSWORD`

If any value is missing, Gradle stops before packaging a release APK or AAB. The debug APK uses Android's debug key and is not suitable for Google Play.

## Create a new upload key

For a new Google Play app, create an upload key and enroll the app in Play App Signing. Google Play uses the upload key to verify uploads and manages the app-signing key used for distributed APKs. Keep the upload keystore private and backed up securely. [Android app signing](https://developer.android.com/studio/publish/app-signing)

Create the keystore outside the repository. `keytool` prompts for its password interactively; do not pass passwords as command-line arguments. The default PKCS12 format uses the same password for the keystore and private key:

```sh
mkdir -p "$HOME/.android/finora"
keytool -genkeypair -v \
  -keystore "$HOME/.android/finora/upload-key.p12" \
  -alias finora-upload \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

The signing certificate must remain valid beyond October 22, 2033. This command's 10,000-day validity exceeds that requirement when generated in 2026. [Prepare your app for release](https://developer.android.com/studio/publish/preparing/)

Set the environment variables in your local shell or secret manager. Do not enable shell tracing (`set -x`) while loading passwords. Bash users can enter passwords without echoing them:

```sh
export FINORA_RELEASE_STORE_FILE="$HOME/.android/finora/upload-key.p12"
export FINORA_RELEASE_KEY_ALIAS=finora-upload
read -r -s -p 'Keystore password: ' FINORA_RELEASE_STORE_PASSWORD
printf '\n'
export FINORA_RELEASE_STORE_PASSWORD
export FINORA_RELEASE_KEY_PASSWORD="$FINORA_RELEASE_STORE_PASSWORD"
```

In zsh, use its prompt form for the two `read` commands:

```zsh
read -r -s 'FINORA_RELEASE_STORE_PASSWORD?Keystore password: '
export FINORA_RELEASE_STORE_PASSWORD
export FINORA_RELEASE_KEY_PASSWORD="$FINORA_RELEASE_STORE_PASSWORD"
```

For the key generated in this environment, load the protected local environment file in a shell before building:

```sh
source "$HOME/.config/finora/release-signing.env"
```

Keep the keystore and its password in separate secure backups. Never commit or email the keystore. The repository ignores common keystore file types under `android/`.

## Build artifacts

From the repository root, after setting up the signing variables:

```sh
npm run android:sync
npm run android:build:debug
npm run android:build:release
npm run android:build:bundle
```

Expected outputs:

- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Signed release APK: `android/app/build/outputs/apk/release/app-release.apk`
- Signed AAB: `android/app/build/outputs/bundle/release/app-release.aab`

Verify release signatures with Android SDK Build Tools:

```sh
apksigner verify --verbose android/app/build/outputs/apk/release/app-release.apk
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
```

Inspect package ID, version, and target SDK in an APK with `aapt dump badging`. Increase `versionCode` for each Play update.
