# Android architecture

## Selected design

Finora keeps one React/TypeScript user interface and builds it in two modes:

- Web mode uses the existing Next.js server build, including its server-side capabilities.
- Android mode statically exports the client application to `out/` and packages that output with Capacitor 8 in a native Android shell.

The Android export is hosted locally in the WebView. It does not use `server.url`, and it does not depend on a remote Next.js host to start. The Android build is therefore a bundled client application, not a remote-WebView wrapper.

## Request and data flow

```text
Next.js web build                  Android build
Next.js server / route host         Static export in out/
          |                                  |
          +---- shared React UI, finance domain, IndexedDB ----+
                                             |
                                  Capacitor Android WebView
                                             |
                              MainActivity extends BridgeActivity
```

Finance calculations and validation live under `src/entities/finance`. The storage contract has an IndexedDB provider for persistent browser/WebView data and an in-memory cache/provider for app operation. Finance state is exposed through `src/features/finance-session`. The currently active product mode is local-only; there is no login, backend API, cloud sync, connected bank service, or automatic backup in the shipped UI.

The native bridge is wrapped under `src/lib/native/`. It currently uses Capacitor App and SystemBars APIs for app lifecycle, deep links, Android back handling, and system bar styling. There is no custom Kotlin plugin implementation. The notification interfaces under `src/features/integrations/android-notifications.ts` are types/in-memory handling only; notification capture is not implemented and no notification permission is requested.

## Why static export for Android

The mobile build uses `output: "export"` conditionally through `FINORA_BUILD_TARGET=capacitor`. The catch-all Next route enumerates the known UI paths in `src/app/[[...path]]/page.tsx`; the client-side TanStack Router then handles navigation. The existing production web build remains a Next.js server build. This keeps the server-oriented web deployment from being constrained by static export.

Static export cannot provide runtime Next.js server rendering, Route Handlers/API routes, Server Actions, middleware/proxy execution, or request-time server sessions. No such feature is part of the Android route host. Keep backend-only logic on a separately deployed HTTPS backend if one is added; do not add secrets to the exported JavaScript bundle. If a required application feature depends on Next.js runtime behavior, reassess this architecture before implementing it in the Android export.

## Main configuration

- `scripts/build-mobile.mjs`: sets `FINORA_BUILD_TARGET=capacitor`, generates routes, and runs the Webpack production build.
- `next.config.ts`: enables static export and trailing slashes only for the mobile build; keeps the regular web build server-oriented.
- `src/app/[[...path]]/page.tsx`: provides static parameters for supported client routes.
- `capacitor.config.ts`: app ID `com.finora.app`, name `Finora`, web directory `out`, background, system bar, and splash settings.
- `android/`: generated native Android app, package `com.finora.app`.

See [Capacitor setup](capacitor-setup.md), [Android development](android-development.md), and [security](authentication-security.md) for workflows and constraints.
