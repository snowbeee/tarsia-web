import fontUrl from '../../assets/fonts/DejaVuSans-subset.ttf?url'
import { PDF_FONT_NAME } from './font'
import { resetTextMeasurement } from './fitText'

// Fetches the puzzle font and makes it available to both of the things that
// need it: the browser, which draws and measures the labels, and jsPDF, which
// wants the same bytes as base64 to embed in the PDF.
//
// It is fetched rather than bundled — 102 KB of base64 in the JavaScript
// would be 136 KB of it, parsed on every visit whether or not anyone wants a
// PDF — and fetched once, in the background, as soon as the app is up.
// Waiting until the Export button is pressed would be cheaper still, but then
// the labels on screen would be measured in the fallback font and re-fit the
// moment the font arrived, which looks like the puzzle rearranging itself.

let pending = null

/** @returns {Promise<string>} the font file, base64, for jsPDF's VFS */
export function loadPuzzleFont() {
  pending ??= fetchFont()
  return pending
}

async function fetchFont() {
  const response = await fetch(fontUrl)
  if (!response.ok) throw new Error(`could not load the puzzle font (HTTP ${response.status})`)
  const bytes = new Uint8Array(await response.arrayBuffer())

  // Base64 first: handing the buffer to FontFace can leave it detached, and
  // then there is nothing left to encode.
  const base64 = toBase64(bytes)

  const face = new FontFace(PDF_FONT_NAME, bytes)
  await face.load()
  document.fonts.add(face)
  // Any label measured before now was measured in whatever the browser was
  // substituting, and those widths are cached.
  resetTextMeasurement()

  return base64
}


// btoa takes a string, and String.fromCharCode(...bytes) overflows the call
// stack somewhere around 100 KB — which is exactly the size of this file.
function toBase64(bytes) {
  const CHUNK = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  return btoa(binary)
}
