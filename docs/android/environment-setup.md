# Android development environment

This guide records the Android toolchain checked for Finora on Fedora Workstation 45. The repository currently uses Capacitor 8.6.x, Android Gradle Plugin 8.13.0, Gradle 8.14.3, Kotlin 2.3.0, and Android API 36. These versions are the verified project baseline; recheck upstream support before deliberately changing them.

## Requirements and detected environment

| Component | Required / planned | Detected |
| --- | --- | --- |
| Node.js | 22 or newer for Capacitor 8 | 26.13.0 |
| npm | Use the repository's npm lockfile | 11.20.0 |
| Android Studio | Otter 2025.2.1 or newer for Capacitor 8 | 2026.2.2.9 Flatpak |
| Gradle runtime JDK | JDK 17 or newer; use JDK 21 with Gradle 8.14.x | System OpenJDK 25 and Studio JBR 25; install/use JDK 21 for the generated Gradle 8.14.x wrapper |
| Android SDK Platform | API 36 for Capacitor 8 | API 36 and API 37.0 installed |
| Android SDK Build Tools | 36.x | 35.0.0 and 36.0.0 installed |
| Android SDK Platform Tools | Needed for ADB | Installed; ADB 37.0.1 |
| Android Emulator | Needed for local emulator testing | Installed; an API 37.0 AVD exists, but no device was attached during the check |
| Android SDK Command-line Tools | Needed for `sdkmanager` workflows | Not detected |

Capacitor 8 requires Android API 24 or newer and targets API 36. This project uses Android Gradle Plugin 8.13.0 and Gradle 8.14.3 from the generated Capacitor project. Capacitor's update notes cite Kotlin 2.2.20, but Kotlin's compatibility table fully supports that version only through AGP 8.11.1. Kotlin 2.3.0 is selected because its supported ranges include this project's AGP 8.13.0 and Gradle 8.14.3. The generated project wrapper supplies Gradle; a separate system Gradle installation is not needed.

The system Java and Android Studio JBR are both Java 25. Running Gradle 8.14.3 with either one fails with `Unsupported class file major version 69`. A temporary Temurin JDK 21.0.13 under `/tmp/finora-jdk21` was used to verify the debug build; no system JDK was installed. Use JDK 21 for this project unless the generated toolchain is deliberately updated and compatibility is verified.

## Install JDK 21 on Fedora

This command installs the Fedora OpenJDK 21 development package system-wide. It has not been run as part of the environment audit:

```bash
sudo dnf install java-21-openjdk-devel
```

For a current shell, after installation:

```bash
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk
export PATH="$JAVA_HOME/bin:$PATH"
java -version
```

In Android Studio, set **Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK** to the JDK 21 installation. Do not use the Studio JBR 25 for the Capacitor 8 / Gradle 8.14.x baseline.

## SDK packages

The SDK root detected on this machine is `/home/av/Android/Sdk`. Android Studio is installed as a Flatpak. Use **Tools → SDK Manager** to install or confirm these packages:

- Android SDK Platform 36 (Android 16)
- Android SDK Build-Tools 36.x
- Android SDK Platform-Tools
- Android SDK Command-line Tools (latest)
- Android Emulator
- A Google APIs x86_64 system image for API 36 if API 36 emulator testing is needed

The API 36 platform and Build Tools 36.0.0, Platform-Tools, and Emulator are already present. The API 37.0 platform and AVD are also present, but API 37 is not the Capacitor 8 target baseline. The Command-line Tools package was not found. Android Studio's SDK Manager can manage the SDK without `sdkmanager`; installing the Command-line Tools is needed for command-line SDK management.

Configure the SDK root and command-line paths in a terminal when needed:

```bash
export ANDROID_HOME=/home/av/Android/Sdk
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
adb version
sdkmanager --list_installed
```

If the `cmdline-tools/latest` directory does not exist, install **Android SDK Command-line Tools (latest)** in SDK Manager first. For an emulator, start the API 36 AVD from Android Studio's Device Manager, then check it with:

```bash
adb devices -l
```

## Verification after project setup

The mobile web bundle is produced with `npm run build:mobile`. It writes the static export to `out/`; the normal `npm run build` and `npm start` scripts remain the Next.js server build for web use. `npm run android:sync` rebuilds that export and synchronizes it into the Android project.

Use the generated Gradle wrapper rather than installing a global Gradle. The Android build scripts require JDK 21 in `JAVA_HOME` and its `bin` directory on `PATH`:

```bash
node --version
npm --version
java -version
adb devices -l
cd android
./gradlew --version
```

From the repository root, run `npm run android:sync` to build the static web bundle and copy it into Android, or `npm run android:build:debug` to build a debug APK after Capacitor sync.

The Android Studio and Android SDK versions in this document should be rechecked before release builds. Play target API policy is checked separately during the Google Play preparation phase.
