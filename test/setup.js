// The parser uses DOMParser, which the app gets from the browser. Node has no
// such thing, so the tests borrow jsdom's — the same engine the review used to
// run the parser against the samples. Import this before anything that parses.
import { JSDOM } from 'jsdom'

globalThis.DOMParser = new JSDOM('').window.DOMParser

// localStorage, for the autosave helpers. A plain in-memory stand-in: the
// draft functions only ever get/set/remove one key.
const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}
