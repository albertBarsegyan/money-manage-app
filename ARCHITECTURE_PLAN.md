# Finora Architecture Assessment and Migration Plan

## 1. Current architecture overview

> Historical baseline (pre-migration). Current state is documented in §14.

Finora is a Next.js 16 App Router application using React 19 and strict TypeScript. The Next `app/` directory currently has one route (`/`), a root layout, global CSS, and a client-side provider. The only navigation is an internal `View` state in `app/page.tsx`; screens do not have distinct URLs or browser-history entries.

Financial state is exposed through `FinanceProvider` and a `FinanceSession` context. `StorageManager` selects an IndexedDB local provider by default. That provider hydrates a memory cache, persists snapshots through an IndexedDB transaction queue, and uses `BroadcastChannel` for updates across open tabs. Core calculations are pure TypeScript and use integer minor units. There are no active server APIs, authentication flows, or external financial connections. `src/server/integrations/` is isolated future scaffolding and is not called from the UI.

## 2. Existing project structure

```text
app/
  globals.css              # One global, hand-authored responsive stylesheet
  layout.tsx               # Next document and metadata
  page.tsx                 # 2,299-line client shell, all screens, dialogs and helpers
  providers.tsx            # Finance context composition
src/
  core/finance/             # Domain models, validation, money and budget calculations
  features/finance/         # Finance context and storage-facing actions
  features/integrations/    # In-memory Android notification candidate boundary
  server/integrations/      # Unused provider-neutral integration/security scaffolding
  storage/                  # Provider contract, IndexedDB/memory/planned providers
tests/finance.test.ts       # 12 Node tests for calculations, storage and source audit
```

The TypeScript alias `@/*` currently maps to the repository root. ESLint 9 flat config combines Next Core Web Vitals, Next TypeScript rules, and Prettier. `npm run format` invokes `eslint . --fix`; `npm run lint` checks all ESLint-supported files.

## 3. Current dependencies and entry points

| Area | Current implementation |
| --- | --- |
| Framework and runtime | `next@16.4.5`, `react@19.3.0`, `react-dom@19.3.0` |
| Language | `typescript@5.9.3`, strict mode |
| Routing | Next App Router filesystem routes for all finance sections (see §14) |
| Styling | One global CSS file, custom class selectors and a small root token set; Tailwind 4 is installed but not configured or used by the interface |
| Forms | Native controlled fields and `useState`; validation is partly HTML-required and partly inline submit guards; domain validation lives separately in `src/core/finance/validation.ts` |
| State and persistence | React context + `useSyncExternalStore`; IndexedDB is the active local provider; no remote API or auth |
| Tests and build | Node test runner driven by TypeScript compilation; Next production build |
| Not present historically | shadcn components, Motion, React Hook Form, Zod, Lucide, next-themes (routing is Next.js App Router only) |

## 4. Identified architectural problems

- `app/page.tsx` owns navigation, all screen composition, editing state, import actions, validation conversion, four forms, reusable field elements, icon path data, and display helpers. This makes the largest unit difficult to test or change safely.
- The view switch is not URL driven, so URLs cannot be bookmarked, deep-linked, restored by browser history, or typed by a router.
- Finance domain code is reasonably isolated, but the current `core/features/storage` layout does not express the required FSD layers or public slice APIs.
- Reusable UI is local to the monolith; buttons, fields, dialogs, icons, status labels, and layout styles have no shared component contract.
- Forms repeat controlled state and parsing logic. Invalid amount/name input may result in an early return without an accessible field-level explanation. Submission pending state and duplicate-submit handling are absent.
- Dialogs declare `role="dialog"` and `aria-modal`, but do not implement focus trapping/restoration or keyboard dismissal. Some icon-only and status controls need accessibility review.
- Styling is centralized but largely minified and class based. The small token set does not cover semantic surfaces, dark mode, focus/disabled states, or a coherent typography/spacing scale. Mobile collapses the sidebar to icons rather than offering a complete mobile navigation pattern.
- The page uses memoization for one filter, but the larger performance concern is component/file ownership rather than demonstrated render cost.
- `next.config.ts` enables Cache Components and partial prefetching. Any client-router and theme-provider bridge must be verified with this Next version; it must not compromise IndexedDB hydration or introduce flash/mismatch regressions.

## 5. Proposed architecture

Use Next.js App Router as the only routing solution. Next treats `src/pages/` as its legacy Pages Router, so FSD page slices live in `src/fsd/pages/` to avoid Next interpreting components as route entries. `src/app/` owns the document, metadata, global CSS, providers, and filesystem routes. Client navigation uses `next/link` and `next/navigation`. Capacitor Android consumes a static export of these same App Router pages.

Move Next's App Router into `src/app/`; this also serves as the FSD app layer for providers, global styles, and configuration. Keep domain calculations independent of UI, router and storage. Give each slice a public `index.ts`; enforce import direction with ESLint boundaries where the rule can be applied without misclassifying the Next adapter.

### Proposed directory structure

```text
src/
  app/                                 # Next.js App Router + FSD application layer
    layout.tsx
    page.tsx                           # Overview
    transactions/page.tsx
    income/page.tsx
    accounts/page.tsx
    salary-periods/page.tsx
    analytics/page.tsx
    integrations/page.tsx
    settings/page.tsx
    error.tsx
    loading.tsx
    not-found.tsx
    providers/                         # Finance, theme and native providers
    styles/                            # Tokens and Tailwind/shadcn global styles
    config/
  fsd/pages/                           # FSD page layer (src/pages is reserved by Next)
    overview/                          # Screen composition
    income/
    transactions/
    accounts/
    analytics/
    integrations/
    settings/
  widgets/
    app-shell/                         # Responsive sidebar, header, content outlet
    dashboard-summary/
    recent-activity/
  features/
    manage-income/                     # Create/edit/delete/confirm actions and forms
    manage-expenses/
    manage-accounts/
    manage-salary-periods/
    import-csv/
    clear-local-data/
    theme-switcher/
  entities/
    income/
    transaction/
    account/
    salary-period/
    finance/                           # Pure budget/money domain calculations
  shared/
    ui/                                 # shadcn primitives and app-wide wrappers
    lib/                                # formatting, classnames, motion presets
    hooks/
    config/
    types/
    constants/
```

The names above are targets, not a mandate to create empty folders. Each slice will exist only when it owns actual functionality. Existing finance records, integer-money calculations, IndexedDB storage, CSV review, empty states and disconnected integration claims remain intact.

## 6. Routing migration strategy

1. Use Next.js App Router filesystem routes under `src/app/` as the only router.
2. Keep route modules lightweight. Each `page.tsx` mounts the shared finance shell through a page-slice public API.
3. Use `next/link`, `usePathname`, `useRouter`, and `useSearchParams` for navigation and search state. Preserve `/` as Overview and readable paths for `/transactions`, `/income`, `/accounts`, `/salary-periods`, `/analytics`, `/integrations`, and `/settings`.
4. Provide App Router `loading.tsx`, `error.tsx`, and `not-found.tsx`.
5. For Capacitor, statically export the same App Router pages with `output: "export"` and trailing slashes.

TanStack Router is not part of the architecture.

## 7. Component migration strategy

- Move sidebar/header/responsive navigation to `widgets/app-shell`.
- Extract overview-only summary and activity into widgets.
- Make each screen a page slice that composes feature actions and entity presentations.
- Move income, transaction, account, and salary-period forms into their respective feature slices.
- Move category/source/currency choices and presentation helpers to owning entity or shared public APIs.
- Replace the custom SVG path switcher with Lucide icons and use shadcn primitives for common buttons, inputs, selects, cards, dialogs, alerts, badges, tables, and toast feedback.
- Preserve UI behavior while extraction occurs; do not rewrite financial calculations inside view components.

## 8. Theme and animation strategy

Use semantic CSS variables for background/foreground, card/popover, primary/secondary, muted, border/input, destructive, and chart colors. Configure Tailwind CSS v4 and shadcn's New York component conventions against those tokens. Add `next-themes` only after verifying its script, hydration behavior and persistent theme choice with Next 16 Cache Components. Theme preference is UI preference data; financial records remain exclusively in IndexedDB.

Add Motion for React for short page-content transitions, dialog/toast presence, and intentional mobile navigation interactions. Centralize variants/transitions in `shared/lib/motion`. Use `MotionConfig` reduced-motion behavior or `useReducedMotion`, and avoid animating chart/layout dimensions without a measured UX need.

## 9. Form architecture

- Add React Hook Form, Zod and `@hookform/resolvers`.
- Keep each Zod schema next to its feature form; infer form input/output types with `z.infer` or `z.input`/`z.output` where coercion transforms the amount string to integer minor units.
- Create shared shadcn form field wrappers that consistently render labels, descriptions, `aria-invalid`, and field errors.
- Preserve the money parser's precise integer-minor-unit behavior. Validate currency-specific precision and account/period relationships in schema/domain boundaries; do not use floating-point arithmetic.
- Use `isSubmitting` to prevent repeat saves, show explicit pending state, and reset/reinitialize forms when the edited record changes.

## 10. State and data flow

Keep `FinanceProvider` and the storage abstraction while moving them to the FSD app/entities boundary. IndexedDB remains the single persistence source, with its memory cache and subscription contract. Keep ephemeral dialog state local to the relevant widget/feature, and use router state only for navigable state. No Redux, remote API client, auth layer, or fake provider will be introduced.

## 11. Implementation stages

1. Complete this assessment and plan before app changes.
2. Install compatible router, UI, motion, theme, and form dependencies; add Tailwind v4/shadcn aliases and scripts.
3. Establish FSD entity/page/widget/feature/shared public APIs and move pure finance code into entities without changing behavior.
4. Add Next.js App Router filesystem routes, route errors/loading/not-found, and URL navigation.
5. Extract the app shell and each page from the monolith, preserving actions and empty states.
6. Add shadcn primitives and semantic tokens; migrate shared controls and dialogs.
7. Migrate all four data forms to React Hook Form/Zod and shared accessible fields.
8. Add light/dark/system theme controls and intentional dark tokens.
9. Add subtle Motion presets and responsive navigation; verify reduced motion and keyboard behavior.
10. Add architecture lint rules where practical, then run format, lint, typecheck, finance tests, production build, and route refresh checks.

## 12. Potential compatibility and data risks

- Android deep links and refresh behavior must be exercised against the exported App Router HTML files under `out/`.
- Next 16 Cache Components, static prerendering and client-only IndexedDB hydration can surface hydration or boundary errors; preserve the current empty server snapshot until hydration completes.
- Tailwind v4/shadcn setup differs from older Tailwind config conventions; use the official v4 PostCSS and CSS import setup, not the obsolete Turbopack loader.
- `next-themes` uses a small browser preference store and pre-hydration script; verify it does not interfere with the app's root markup and test both explicit and system themes.
- Existing users' IndexedDB schema and database name must not be reset or renamed during UI migration. Do not add a migration that drops the finance object store.
- The global stylesheet and old UI may be removed only after equivalent responsive/accessibility behavior has been migrated.
- New dependencies increase the client bundle. Prefer tree-shaken component imports and lazy route chunks; do not add charting or component packages without a demonstrated use.

## 13. Documentation references consulted

- [Next.js Server and Client Components](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js static exports](https://nextjs.org/docs/app/guides/static-exports)
- [shadcn/ui Next.js installation](https://ui.shadcn.com/docs/installation/next)
- [shadcn/ui Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [Motion for React installation](https://motion.dev/docs/react-installation)
- [React Hook Form schema validation](https://react-hook-form.com/get-started)

## 14. Implemented architecture and verification

The plan was completed before implementation began. The following parts are now present:

```text
src/
  app/                         # Next App Router pages, layout, providers, tokens and CSS
  fsd/pages/finance/           # Finance screens and route-level composition
  features/
    finance-session/           # Storage-backed finance context
    manage-accounts/           # Account form and schema
    manage-income/             # Income form and schema
    manage-salary-periods/      # Salary-period form and schema
    manage-transactions/       # Transaction form and schema
    theme-switcher/            # Light/dark/system control
    integrations/              # Existing notification candidate boundary
  entities/finance/            # Models, validation, calculations, UI and storage
  shared/
    lib/motion/                 # Shared route animation presets
    ui/                         # shadcn primitives and shared form/dialog wrappers
```

Implementation details:

- Next.js App Router is the only router. `/` remains Overview, with routes for income, transactions, accounts, salary periods, analytics, integrations, and settings. Transaction search uses Next.js search parameters.
- FSD layer dependencies are checked with `eslint-plugin-boundaries`. Cross-slice imports use public `index.ts` APIs. The finance storage implementation moved under the finance entity so the shared layer does not depend on domain models.
- Tailwind CSS v4 and shadcn New York/Radix conventions are configured. Shared primitives include alert dialog, badge, button, card, dialog, dropdown menu, input, select, textarea, tooltip, toast, and reusable record-form wrappers. Existing page styles were retained and supplemented with semantic light/dark tokens and dark-mode overrides.
- Motion route presets and `MotionConfig` respect reduced-motion preferences. Theme selection supports light, dark, and system through `next-themes`.
- Income, transactions, accounts, and salary-period forms use React Hook Form, feature-local Zod schemas, shared field/dialog wrappers, and field errors. Imported income transactions remain editable, and the budget engine treats confirmed transaction income as inflow rather than expense.
- The existing IndexedDB finance store, memory cache, manual data entry, empty states, CSV review, and local calculations remain active. No fake provider connection was added.

Verification on 2026-11-09 (App Router-only migration):

- TanStack Router packages, `src/routes/`, `routeTree.gen.ts`, `tsr.config.json`, and the Next catch-all host were removed.
- `npm run lint` — passed with no diagnostics.
- `npm run typecheck` — passed.
- `npm test` — passed, 33 tests.
- `npm run build` — passed with Webpack; App Router static pages for `/`, `/transactions`, `/income`, `/accounts`, `/salary-periods`, `/analytics`, `/integrations`, `/settings`.
- `npm run android:sync` and `npm run android:build:debug` — passed against the Capstatic export (`trailingSlash` HTML under `out/`).

Remaining scope and limitations:

- The FSD layers and dependency direction are established, but all seven screens and much of the application shell still live in `src/fsd/pages/finance/ui/finance-workspace.tsx`. The proposed per-page/widget extraction is not complete, and page-level code splitting has not been added.
- App Router pages and static export build, but no real browser/device viewport or deep-link interaction session was run here. Responsive styles and route definitions were verified by source/build checks only.
- Loading UI is limited to framework/router defaults; dedicated route-specific loading skeletons and lazy route chunks are future work.
- shadcn components are available in shared UI, but several legacy screen controls still use the preserved custom CSS/native markup. The full visual migration and accessible interaction audit are not complete.
- Existing automated tests cover the financial domain, local storage/privacy source checks, CSV, and notification candidate boundary. They do not provide browser-level tests for themes, mobile navigation, forms, animations, or route behavior.
