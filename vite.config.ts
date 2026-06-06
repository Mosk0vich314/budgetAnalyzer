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
      includeAssets: ['favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Budget Analyzer',
        short_name: 'Budget',
        description: 'Personal finance tracker — accounts, investments, cash flow.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        // Scope/start_url must include the base path on a project Pages site.
        scope: base,
        start_url: base,
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
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
