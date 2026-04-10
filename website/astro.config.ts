import { defineConfig } from 'astro/config'
import sitemap from '@astrojs/sitemap'

export default defineConfig({
  site: 'https://getyako.com',
  outDir: 'dist',
  integrations: [sitemap()],
})
