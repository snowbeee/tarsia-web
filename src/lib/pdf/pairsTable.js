import { placedPairs } from '../layouts'
import { PDF_FONT_NAME } from '../render/font'

// The third page: every pair as a list, the way the desktop app printed one.
//
// It is the page a teacher reads rather than cuts up — checking a set before
// the lesson, or finding which question a stuck group is on without
// reassembling the puzzle. Drawn with jsPDF's text rather than converted from
// an SVG like the other two pages, which keeps it selectable and searchable
// in the finished file; a table is text, and a picture of a table is worse at
// being one.

const MARGIN_MM = 12
const ROW_GAP_MM = 2.2
const LINE_MM = 4.4
const HEAD_MM = 6
const NUM_W = 10
const GUTTER = 4
const PAGE = { w: 210, h: 297 }

// An outer-rim decoy has no answer to print. A blank cell reads as "not
// filled in yet", which is a different thing, so it is marked.
const NO_ANSWER = '—  (outside edge)'

/** Lay the rows out into pages without drawing, so the drawing can't overflow. */
function paginate(pdf, rows, { questionW, answerW }, firstTop) {
  const bottom = PAGE.h - MARGIN_MM
  const pages = [[]]
  let y = firstTop

  for (const { pair, usesAnswer } of rows) {
    const question = pdf.splitTextToSize(pair.question || ' ', questionW)
    const answer = pdf.splitTextToSize(usesAnswer ? pair.answer || ' ' : NO_ANSWER, answerW)
    const height = Math.max(question.length, answer.length) * LINE_MM + ROW_GAP_MM

    // A row is kept whole: splitting a question across a page break is how
    // you end up reading half of it.
    if (y + height > bottom && pages[pages.length - 1].length > 0) {
      pages.push([])
      y = MARGIN_MM + HEAD_MM
    }
    pages[pages.length - 1].push({ n: pair.n, question, answer, height })
    y += height
  }
  return pages
}

function drawHeadings(pdf, x2, y) {
  pdf.setFontSize(8)
  pdf.setTextColor(130)
  pdf.text('#', MARGIN_MM, y)
  pdf.text('QUESTION', MARGIN_MM + NUM_W, y)
  pdf.text('ANSWER', x2, y)
  pdf.setDrawColor(200)
  pdf.line(MARGIN_MM, y + 1.5, PAGE.w - MARGIN_MM, y + 1.5)
}

/**
 * Append the pair table to `pdf`, adding as many portrait pages as it needs.
 *
 * The caller has already drawn the puzzle pages; this adds its own.
 *
 * @returns {{pages: number, rows: number}} what it drew, so a test can check
 *   the pagination without having to read the finished PDF back.
 */
export function drawPairsTable(pdf, { pairs, layout, title }) {
  const rows = placedPairs(pairs, layout)
  if (rows.length === 0) return { pages: 0, rows: 0 }

  // Not an even split: a question is usually a sentence and an answer is
  // often a number, so equal columns wrap the questions while leaving the
  // answers half empty.
  const usable = PAGE.w - 2 * MARGIN_MM - NUM_W - GUTTER
  const questionW = usable * 0.55
  const answerW = usable - questionW
  const answerX = MARGIN_MM + NUM_W + questionW + GUTTER

  pdf.setFont(PDF_FONT_NAME)
  const firstTop = MARGIN_MM + 4 + HEAD_MM + 4
  const pages = paginate(pdf, rows, { questionW, answerW }, firstTop)

  pages.forEach((page, pageIndex) => {
    pdf.addPage('a4', 'portrait')

    pdf.setFont(PDF_FONT_NAME)
    pdf.setFontSize(11)
    pdf.setTextColor(60)
    const heading =
      pages.length > 1
        ? `${title} — question and answer list (${pageIndex + 1} of ${pages.length})`
        : `${title} — question and answer list`
    pdf.text(heading, MARGIN_MM, MARGIN_MM + 4)

    let y = MARGIN_MM + 4 + HEAD_MM
    drawHeadings(pdf, answerX, y)
    y += 4

    for (const row of page) {
      pdf.setFontSize(8)
      pdf.setTextColor(150)
      pdf.text(String(row.n), MARGIN_MM, y + 3)

      pdf.setFontSize(10)
      pdf.setTextColor(30)
      pdf.text(row.question, MARGIN_MM + NUM_W, y + 3)
      pdf.setTextColor(row.answer[0] === NO_ANSWER ? 150 : 30)
      pdf.text(row.answer, answerX, y + 3)

      y += row.height
      pdf.setDrawColor(235)
      pdf.line(MARGIN_MM, y - ROW_GAP_MM / 2, PAGE.w - MARGIN_MM, y - ROW_GAP_MM / 2)
    }
  })

  return { pages: pages.length, rows: rows.length }
}
