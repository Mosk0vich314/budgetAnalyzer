# Budget Analyzer

A local-first personal finance PWA — track bank, cash and investment accounts,
money in and out, net worth and monthly cash flow. Installs on your phone from
GitHub Pages; all data stays on your device.

**Live:** https://mosk0vich314.github.io/budgetAnalyzer/

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
```

## Build & preview (with service worker)

```bash
npm run build
npm run preview
```

## Deploy

Push to `main`. GitHub Actions builds and publishes to GitHub Pages
automatically. Ensure **Settings → Pages → Source** is set to **GitHub
Actions**.

## Data & backups

Data is stored in your browser (IndexedDB) on each device — it does **not** sync.
Use the **Backup** tab to export a JSON file regularly; import it to restore or
move to another device.

## Stack

Vite · React · TypeScript · `vite-plugin-pwa` (Workbox) · `idb`. See
[CLAUDE.md](./CLAUDE.md) for architecture notes.
