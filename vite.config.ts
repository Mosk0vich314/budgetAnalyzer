import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages project site is served from /<repo>/.
const base = '/budgetAnalyzer/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      // Auto-update keeps the installed PWA in sync: Workbox content-hashes
      // every asset and swaps the service worker on each deploy, so the old
      // cached scripts can never shadow a new release.
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'app-icon.png'],
      manifest: {
        name: 'Budget Analyzer',
        short_name: 'Budget',
        description: 'Personal finance tracker — accounts, investments, cash flow.',
        theme_color: '#fbf0df',
        background_color: '#fbf0df',
        display: 'standalone',
        // Scope/start_url must include the base path on a project Pages site.
        scope: base,
        start_url: base,
        // Single custom icon, used exactly as provided. purpose 'any' only —
        // NO 'maskable' entry, so the OS does not crop it to a circle/squircle
        // or require safe-zone padding. The image in public/app-icon.png is
        // treated as the finished icon. Replace that file to change the icon.
        icons: [
          { src: 'app-icon.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'app-icon.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        ],
      },
      workbox: {
        // Precache the whole app shell so it works fully offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
      devOptions: {
        // Let the service worker run during `npm run dev` for testing.
        enabled: false,
      },
    }),
  ],
})
