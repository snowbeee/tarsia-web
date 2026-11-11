import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { PAGES } from './seo/site.js'
import seo from './seo/plugin.js'

// Every page of the site, as Rollup inputs. The app lives on index.html; the
// rest are plain HTML with no script of their own, so they load as fast as
// the server can send them — which is most of why they can rank at all.
const input = Object.fromEntries(
  PAGES.map((p) => [p.url === '' ? 'index' : p.url.replace(/\/$/, ''), new URL(p.file, import.meta.url).pathname]),
)

// https://vite.dev/config/
export default defineConfig({
  // Where the app will be served from. Defaults to the domain root; set
  // BASE_PATH when deploying into a subdirectory, e.g.
  //   BASE_PATH=/tarsia/ npm run build
  // for https://example.com/tarsia/. It must have a trailing slash — Vite
  // uses it as the prefix for every asset URL it writes into index.html.
  base: process.env.BASE_PATH || '/',
  plugins: [react(), seo()],
  build: {
    rollupOptions: { input },
  },
})
