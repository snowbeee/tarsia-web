// The one font the puzzle's text is drawn in, on screen and on paper.
//
// It has to be one font and not two. The labels are laid out by measuring
// them in the browser (see fitText) and then drawn into the PDF by svg2pdf,
// which resolves `font-family` against jsPDF's own font list and measures the
// text itself — in the DOM, under the name it resolved — to place anything
// that isn't left-anchored. Screen and PDF therefore have to agree on a name
// the browser knows and jsPDF has been given, or the fitter is sizing text in
// one font and the export is drawing it in another.
//
// That is exactly what used to happen: `system-ui, sans-serif` resolves to
// Helvetica in svg2pdf's alias table, so every label was measured in the
// system font and printed in a different one — and Helvetica is Latin-1, so
// "x≥16" printed as "x'e 1 6".
//
// No space in the name, so it needs no quoting in a CSS family list, in the
// `font-family` attribute, or in svg2pdf's parse of either. The fallbacks are
// what the browser shows in the moment before the font has arrived; the
// export waits for the real thing rather than falling back (see puzzleFont.js).
export const PDF_FONT_NAME = 'DejaVuSans'

// The name the bytes are filed under inside the PDF. Only ever used by the
// two lines below.
const FONT_FILE = 'DejaVuSans-subset.ttf'

/**
 * Registers the font with a jsPDF document, under the same name svg2pdf will
 * resolve `font-family` to. Selecting it is left to the caller — svg2pdf
 * changes the current font as it draws, so anything written with jsPDF's own
 * text API has to ask for it again.
 *
 * Lives here rather than beside the fetching in puzzleFont.js: it does not
 * fetch anything, it is handed bytes someone else already has, and that file
 * imports the .ttf through Vite — which put this out of reach of any test
 * that isn't running in a browser.
 */
export function registerPuzzleFont(pdf, base64) {
  pdf.addFileToVFS(FONT_FILE, base64)
  pdf.addFont(FONT_FILE, PDF_FONT_NAME, 'normal')
}
export const FONT_FAMILY = `${PDF_FONT_NAME}, system-ui, sans-serif`

// Which characters the PDF can actually draw, as runs of codepoints.
//
// The font is DejaVu Sans cut down to the blocks a maths worksheet plausibly
// needs — Latin with its accents, the combining marks that make x̄ and its
// relatives, Greek, punctuation, super/subscripts, the letterlike symbols and
// number forms, arrows, the mathematical operators, the ceiling/floor
// brackets and the geometric shapes. See src/assets/fonts/README.md for the
// exact cut and how to redo it.
//
// This is not that list of blocks, though, because a block is not solid:
// U+0378 is unassigned, DejaVu has no ⅊, and a character the font turns out
// not to have would be claimed as drawable and then print as nothing. So it
// is generated from the font file's own character map (again, see that
// README), and test/font.test.js re-reads the file and fails if the two have
// drifted apart.
const COVERAGE = '20-7e,a0-17f,300-34f,351-353,357-358,35a,35c-362,370-377,37a-37f,384-38a,38c,38e-3a1,3a3-3ff,2000-2064,206a-2071,2074-208e,2090-209c,2100-2109,210b-2149,214b,214e,2150-2185,2189,2190-22ff,2308-230b,25a0-25ff'

const RANGES = COVERAGE.split(',').map((run) => {
  const [first, last] = run.split('-')
  return [parseInt(first, 16), parseInt(last ?? first, 16)]
})

/** Can the font draw this character? */
export function hasGlyph(ch) {
  const c = ch.codePointAt(0)
  return RANGES.some(([first, last]) => c >= first && c <= last)
}

/**
 * The distinct characters in `texts` that the font has no glyph for, in the
 * order they first appear.
 *
 * Nothing is substituted for them — a worksheet that quietly says something
 * other than what the teacher typed is worse than one with a hole in it — so
 * the export says which characters it couldn't draw instead.
 *
 * @param {Iterable<string>} texts
 * @returns {string[]}
 */
export function missingGlyphs(texts) {
  const missing = new Set()
  for (const text of texts) {
    for (const ch of text) {
      if (ch.trim() && !hasGlyph(ch)) missing.add(ch)
    }
  }
  return [...missing]
}
