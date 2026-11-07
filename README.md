# Finora

Finora is a local-first personal finance calculator. The active storage mode is **Local-only**: financial records are stored locally in IndexedDB in the current browser profile. There is no sign-in, cloud sync, or financial API connection in this build.

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed by Next.js. Income, expenses, accounts, salary periods, CSV review candidates, and calculations work without connecting a financial service. Entered amounts use integer minor units, and calculations keep currencies separate rather than applying an undisclosed exchange rate.

For step-by-step instructions, see the [Finora user guide](USER_GUIDE.md).

Use **Settings → Data & Privacy → Clear Local Data** to permanently clear Finora records from this browser. Reloading the app restores saved records from IndexedDB.

## Architecture

- `src/entities/finance` contains typed financial records, validation, exact decimal parsing, CSV preview, storage-independent calculations, and the finance storage adapters.
- `src/entities/finance/storage/contracts` defines the provider contract. The IndexedDB provider persists the active Local-only mode; the memory provider is its in-memory validation and snapshot cache.
- `src/entities/finance/storage/providers/planned-storage.provider.ts` marks Private Cloud and Custom Database as unavailable. They cannot be selected or used to migrate data.
- `src/entities/finance/storage/storage-manager.ts` owns provider selection and rejects unavailable modes.
- `src/features/finance-session` exposes finance data through an application context; UI components do not choose storage providers. IndexedDB hydrates once, maintains a memory cache for synchronous calculations, and serializes atomic snapshots through a write queue.
- `src/routes` contains generated TanStack Router file routes. `src/app` hosts Next.js and mounts the client router through an optional catch-all route.
- `src/features/manage-*` owns the four finance forms and Zod schemas. `src/shared/ui` contains shadcn primitives and accessible form/dialog wrappers.
- `src/server/integrations` contains isolated future integration/security primitives. No route, provider connection, credentials, webhook, or sync job is active in the application.

There is no automatic backup. Versioned export/import and migration preview are future work. Android notification access is not requested or implemented in this web build.

## Checks

```bash
npm test
npm run typecheck
```

The optimized Next.js build can also be run with `npm run build`. In restricted environments, Turbopack may require worker process permissions to build CSS.
