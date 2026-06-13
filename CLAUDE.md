# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Budget Analyzer is a **local-first personal finance PWA**: bank/cash/investment
accounts, money-in/out transactions, net worth and monthly cash-flow overview.
It is a static single-page app deployed to GitHub Pages and installed on a phone
as a PWA. There is **no backend** — all data lives in the browser's IndexedDB on
the device, and the only persistence/portability mechanism is JSON
export/import (the "Backup" tab).

## Commands

```bash
npm run dev                  # Vite dev server (service worker disabled — see note)
npm run build                # tsc -b project references, then vite build -> dist/
npm run preview              # serve the production build locally
npm run typecheck            # type-check without emitting
```

There is no test runner or linter configured yet. Type-checking via `tsc`
(strict, with `noUnusedLocals`/`noUnusedParameters`) is the only automated gate;
run `npm run build` to validate a change end-to-end.

## Deployment

Push to `main` → `.github/workflows/deploy.yml` builds and publishes `dist/` to
GitHub Pages. Live at `https://mosk0vich314.github.io/budgetAnalyzer/`.

**The base path is hard-coded as `/budgetAnalyzer/`** in `vite.config.ts` (and
in absolute URLs in `index.html`). It must match the repo name; changing the
repo name means updating `base` there and the PWA `scope`/`start_url`. GitHub
Pages must be set to "GitHub Actions" as the source (Settings → Pages), not a
branch.

## Cache-busting / service worker (important)

This project intentionally uses `vite-plugin-pwa` with `registerType:
'autoUpdate'` so that **stale cached scripts can never shadow a new release** —
the historical pain point with hand-rolled service workers. Do not add a manual
service worker or manual file-versioning. Workbox content-hashes every asset and
generates `sw.js` at build time; the new SW takes over on next load
(`clientsClaim` + `cleanupOutdatedCaches`). The service worker is **disabled in
`npm run dev`** (`devOptions.enabled: false`); test PWA/offline behavior with
`npm run build && npm run preview`.

## Architecture

Data flows in one direction: **IndexedDB → store → React components → store
mutations → IndexedDB**, with the store re-reading the whole DB after every
write. The dataset is small (one person's finances), so this "reload everything"
approach is deliberate — it keeps state trivially consistent. Don't introduce
optimistic local mutation of the React arrays; go through the store.

- `src/types.ts` — domain model (`Account`, `Transaction`, `BackupFile`).
  **All money is stored as integer cents**, never floats.
- `src/money.ts` — the *only* boundary between cents and human strings.
  `parseAmountToCents` (tolerant of `.`/`,` decimal styles) and `formatCents`
  (Intl currency). Any new amount input/display must go through these.
- `src/db.ts` — IndexedDB access via `idb`. Single source of truth. Note
  `deleteAccount` cascades to its transactions; `replaceAll` backs import.
  Bumping the schema requires raising `DB_VERSION` and handling `upgrade`.
- `src/selectors.ts` — pure derived calculations (account balance = opening
  balance + signed transactions; net worth; per-month flow). Keep computation
  here, not in components.
- `src/store.tsx` — `StoreProvider` / `useStore`: holds accounts + transactions
  in React state, exposes async mutations that write then `reload()`.
- `src/backup.ts` — JSON export (download) and import (validates the
  `app: 'budget-analyzer'` marker, then `replaceAll`). This is the user's only
  backup; treat the file format as a stable contract and version it.
- `src/App.tsx` + `src/components/*` — bottom-tab UI (Overview / Accounts /
  Activity / Backup). Edit forms are bottom sheets. Mobile-first; CSS uses
  `env(safe-area-inset-*)` for installed-PWA display.

### Conventions

- New account `kind` or transaction fields: update `types.ts`, then the
  `byKind` map in `selectors.ts`, the forms, and bump the backup `version` if the
  shape changes.
- IDs are `crypto.randomUUID()` via `newId()` in `store.tsx`.
- The app icon is a single file, `public/app-icon.png`, used as-is (manifest
  declares it `purpose: 'any'` only — deliberately no maskable variant, so the
  OS doesn't crop/pad it). To change the icon, replace that one PNG: **square,
  512×512, and well under 2 MB**. vite-plugin-pwa fails the build if any
  precached asset exceeds 2 MiB (`workbox.maximumFileSizeToCacheInBytes`), so an
  oversized icon breaks the deploy. `public/favicon.svg` is the browser-tab icon.
- Changing the icon does NOT refresh it on an already-installed phone PWA — the
  home-screen icon is cached; the user must remove and re-add the app.
