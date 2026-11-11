// Draws the 1200x630 card social networks show when somebody links the site,
// and renders it to PNG. SVG would be simpler, but Facebook and LinkedIn will
// not render one, and those are where a teacher shares a resource.
//
//   node seo/make-og.mjs      # rewrites public/og.png (needs Chrome)
//
// Rendered by headless Chrome rather than ImageMagick, whose own SVG renderer
// cannot resolve a font family and drops every line of text on the floor.
//
// Run it by hand when the wording or the look changes; the PNG is committed,
// so a normal build neither needs Chrome nor regenerates it.

import { execFileSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const W = 1200
const H = 630
const INK = '#14121a'
const MUTED = '#6b6375'
const LINE = '#14121a'
const FILL = '#f4f3ec'
const ACCENT = '#a033f5'

// A triangular jigsaw of side 4 — 16 pieces — drawn the way the app draws it.
// Rows run top to bottom; each row r holds r upward triangles interleaved
// with r-1 downward ones.
function triangleTiling({ side, unit, x, y }) {
  const h = (unit * Math.sqrt(3)) / 2
  const pts = []
  for (let r = 1; r <= side; r++) {
    const rowLeft = x - (r * unit) / 2
    const top = y + (r - 1) * h
    for (let i = 0; i < r; i++) {
      const left = rowLeft + i * unit
      // Upward: apex on the row above, base on this row.
      pts.push([
        [left + unit / 2, top],
        [left + unit, top + h],
        [left, top + h],
      ])
      if (i < r - 1) {
        // Downward: base on the row above, apex on this row.
        pts.push([
          [left + unit / 2, top],
          [left + (3 * unit) / 2, top],
          [left + unit, top + h],
        ])
      }
    }
  }
  return pts
}

const tiles = triangleTiling({ side: 4, unit: 112, x: 935, y: 150 })

// A few pieces picked out in the accent colour, so the card reads as "pieces
// that fit together" at thumbnail size rather than as a plain triangle.
const highlighted = new Set([2, 7, 11, 14])

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#ffffff"/>
  <rect x="0" y="0" width="${W}" height="10" fill="${ACCENT}"/>
  <g stroke="${LINE}" stroke-width="2.5" stroke-linejoin="round">
${tiles
  .map(
    (t, i) =>
      `    <polygon points="${t.map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`).join(' ')}" fill="${
        highlighted.has(i) ? 'rgba(170,59,255,0.18)' : FILL
      }"/>`,
  )
  .join('\n')}
  </g>
  <g font-family="Helvetica Neue, Helvetica, Arial, sans-serif">
    <text x="80" y="214" font-size="76" font-weight="600" fill="${INK}" letter-spacing="-2">Tarsia Web</text>
    <text x="80" y="296" font-size="38" fill="${INK}">Make a cut-out matching</text>
    <text x="80" y="346" font-size="38" fill="${INK}">puzzle, and print it.</text>
    <text x="80" y="438" font-size="27" fill="${MUTED}">Free. No account. Nothing to install.</text>
    <text x="80" y="480" font-size="27" fill="${MUTED}">Opens Formulator Tarsia .fjsw files.</text>
    <text x="80" y="556" font-size="24" fill="${ACCENT}" font-weight="600">Runs in your browser — files never leave your computer</text>
  </g>
</svg>
`

const CHROMES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
]
const chrome = CHROMES.find((c) => existsSync(c))
if (!chrome) {
  console.error('No Chrome or Chromium found. public/og.png is committed, so this is')
  console.error('only needed when the card itself changes. Looked in:')
  for (const c of CHROMES) console.error('  ' + c)
  process.exit(1)
}

const dir = mkdtempSync(join(tmpdir(), 'tarsia-og-'))
// Wrapped in a page with no margin, so the screenshot is the artwork and
// nothing else — Chrome would otherwise give the SVG the body's default 8px.
writeFileSync(
  join(dir, 'og.html'),
  `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;padding:0}</style>${svg}`,
)
execFileSync(chrome, [
  '--headless',
  '--disable-gpu',
  '--hide-scrollbars',
  `--screenshot=${join(dir, 'og.png')}`,
  `--window-size=${W},${H}`,
  join(dir, 'og.html'),
])
copyFileSync(join(dir, 'og.png'), 'public/og.png')
console.log('public/og.png written')
