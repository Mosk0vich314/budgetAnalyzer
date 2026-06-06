import {
  defineConfig,
  minimal2023Preset,
} from '@vite-pwa/assets-generator/config'

// Generates all PWA icon sizes from a single source SVG.
// Run with: npm run generate-pwa-assets
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/logo.svg'],
})
