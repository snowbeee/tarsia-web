// The app's own imports are written the way a bundler reads them — './layouts'
// rather than './layouts/index.js'. Node resolves ES modules strictly and
// would refuse every one of them, so the extension is put back here, letting
// the tests import the real source files rather than a copy of them.
import { registerHooks } from 'node:module'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const CANDIDATES = ['.js', '.jsx', '/index.js', '/index.jsx']

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('.') && !/\.[a-z]+$/i.test(specifier) && context.parentURL) {
      const base = new URL(specifier, context.parentURL)
      for (const ext of CANDIDATES) {
        if (existsSync(fileURLToPath(new URL(base.href + ext)))) {
          return nextResolve(specifier + ext, context)
        }
      }
    }
    return nextResolve(specifier, context)
  },
})
