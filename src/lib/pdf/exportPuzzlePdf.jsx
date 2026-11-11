import { createRoot } from 'react-dom/client'
import PuzzleView from '../render/PuzzleView'
import PiecesView from '../render/PiecesView'
import { missingGlyphs, PDF_FONT_NAME } from '../render/font'
import { loadPuzzleFont, registerPuzzleFont } from '../render/puzzleFont'

// Builds the print-ready PDF: the pieces to cut out, then the solved puzzle
// as a teacher's answer key.
//
// Pages are produced from the same React renderers the screen uses, converted
// as vector (svg2pdf), not rasterised — a cut-out worksheet is printed and
// photocopied, so the linework needs to stay sharp.
//
// Everything on the page — the labels and the header lines alike — is drawn
// in the font the app embeds rather than in jsPDF's built-in Helvetica. That
// font is Latin-1, and the puzzles are not: a label written properly as
// "x\u226516" came out of the PDF as "x'e 1 6". See render/font.js.

const MARGIN_MM = 12
const HEADER_MM = 12
// Each note after the first pushes the drawing down by its own line, rather
// than being written over the top of it.
const NOTE_LINE_MM = 3.5
const A4 = { portrait: [210, 297], landscape: [297, 210] }

// svg2pdf reads laid-out geometry (getBBox, getScreenCTM), so the SVG has to
// be in the document and actually laid out. Offscreen is fine; display:none
// is not — it would convert to an empty page.
async function withOffscreenSvg(element, fn) {
  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = 'position:absolute;left:-10000px;top:0;width:1100px;'
  document.body.appendChild(host)
  const root = createRoot(host)
  try {
    root.render(element)
    // Two frames: one for React to commit, one for layout to settle.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    if (document.fonts?.ready) await document.fonts.ready
    const svg = host.querySelector('svg')
    if (!svg) throw new Error('nothing rendered for this page')
    return await fn(svg)
  } finally {
    root.unmount()
    host.remove()
  }
}

// Whichever orientation lets the drawing be larger wins — pieces get cut out
// by hand, so size is not cosmetic.
function planPage(svgEl, headerMm) {
  const vb = svgEl.viewBox.baseVal
  return Object.entries(A4)
    .map(([orientation, [pw, ph]]) => {
      const availW = pw - 2 * MARGIN_MM
      const availH = ph - 2 * MARGIN_MM - headerMm
      const scale = Math.min(availW / vb.width, availH / vb.height)
      return { orientation, pw, ph, scale, w: vb.width * scale, h: vb.height * scale }
    })
    .reduce((a, b) => (b.scale > a.scale ? b : a))
}

async function drawPage(pdf, svgEl, plan, title, notes, headerMm) {
  pdf.setFont(PDF_FONT_NAME)
  pdf.setFontSize(11)
  pdf.setTextColor(60)
  pdf.text(title, MARGIN_MM, MARGIN_MM + 4)
  if (notes.length) {
    // A printed sheet leaves the app behind, so a caveat shown only on screen
    // would be lost exactly when it matters — in front of a class.
    pdf.setFontSize(8)
    pdf.setTextColor(150, 90, 0)
    notes.forEach((note, i) => pdf.text(note, MARGIN_MM, MARGIN_MM + 9 + i * NOTE_LINE_MM))
    pdf.setTextColor(60)
  }
  await pdf.svg(svgEl, {
    x: (plan.pw - plan.w) / 2,
    y: MARGIN_MM + headerMm,
    width: plan.w,
    height: plan.h,
  })
}

const codepointOf = (ch) => 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')

/**
 * @param {{ layout: object, pairs: object[], title: string }} puzzle
 * @returns {Promise<Blob>}
 */
export async function buildPuzzlePdf({ layout, pairs, title }) {
  const { jsPDF } = await import('jspdf')
  await import('svg2pdf.js') // patches jsPDF with .svg()
  // Before anything is rendered, not just before anything is drawn: the
  // offscreen pages below are measured in whatever font the browser has for
  // them at the time, and the whole point is that it is this one.
  const fontData = await loadPuzzleFont()

  const pages = [
    { element: <PiecesView layout={layout} pairs={pairs} />, label: `${title} — cut out the pieces and match the edges` },
    { element: <PuzzleView layout={layout} pairs={pairs} />, label: `${title} — answer key (solved)` },
  ]

  const undrawable = missingGlyphs([title, ...pairs.flatMap((pair) => [pair.question, pair.answer])])

  const notes = [
    layout.verified === false &&
      "Arrangement unverified — the pieces may not sit where the desktop app would put them. The puzzle itself solves: every answer is on its own question's edge.",
    undrawable.length > 0 &&
      // Named by codepoint and not shown: a character this PDF has no glyph
      // for cannot be printed in a warning about itself either.
      `${undrawable.length === 1 ? 'One character is' : `${undrawable.length} characters are`} outside the font this PDF embeds and print blank: ${undrawable.map(codepointOf).join(', ')}.`,
  ].filter(Boolean)

  const headerMm = HEADER_MM + Math.max(0, notes.length - 1) * NOTE_LINE_MM

  let pdf = null
  for (const page of pages) {
    // Promise.all, which no-await-in-loop suggests, would be wrong here: the
    // pages share one jsPDF document and each appends to it, so they must be
    // produced in order, and the first also decides the document's
    // orientation. Running them together would interleave those mutations.
    // oxlint-disable-next-line no-await-in-loop
    await withOffscreenSvg(page.element, async (svg) => {
      const plan = planPage(svg, headerMm)
      if (!pdf) {
        pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: plan.orientation })
        registerPuzzleFont(pdf, fontData)
      } else pdf.addPage('a4', plan.orientation)
      await drawPage(pdf, svg, plan, page.label, notes, headerMm)
    })
  }

  pdf.setProperties({ title, creator: 'Tarsia Web' })
  return pdf.output('blob')
}

export function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoking immediately can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
