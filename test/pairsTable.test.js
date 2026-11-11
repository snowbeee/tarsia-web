import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { jsPDF } from 'jspdf'

import { drawPairsTable } from '../src/lib/pdf/pairsTable'
import { getLayoutForTemplate, placedPairs, requiredPairCount } from '../src/lib/layouts'
import { registerPuzzleFont } from '../src/lib/render/font'

// The table is the one PDF page drawn with jsPDF's text API rather than
// converted from an SVG, which means it needs no DOM — so unlike the puzzle
// pages it can be built and checked here, for real, rather than in a browser.
const FONT = readFileSync(
  new URL('../src/assets/fonts/DejaVuSans-subset.ttf', import.meta.url),
).toString('base64')

function build(pairs, layout, title = 'Test puzzle') {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  registerPuzzleFont(pdf, FONT)
  const summary = drawPairsTable(pdf, { pairs, layout, title })
  return { pdf, summary }
}

const pairsFor = (layout, text = (n) => `Question ${n}`, answer = (n) => `Answer ${n}`) =>
  Array.from({ length: requiredPairCount(layout) }, (_, i) => ({
    n: i + 1,
    question: text(i + 1),
    answer: answer(i + 1),
  }))

test('a short puzzle gets one table page', () => {
  const layout = getLayoutForTemplate('dominos 6', 6)
  const { summary } = build(pairsFor(layout), layout)
  assert.equal(summary.pages, 1)
  assert.ok(summary.rows > 0)
})

test('a full hexagon still fits on one page', () => {
  const layout = getLayoutForTemplate('standard hexagonal jigsaw 30', 30)
  const { summary } = build(pairsFor(layout), layout)
  assert.equal(summary.rows, 30)
  assert.equal(summary.pages, 1)
})

// The thing a table gets wrong is running off the bottom of the page in
// silence, so the case that must work is the one that cannot fit.
const tooLong = (n) =>
  `Question ${n} — ` + 'long enough to wrap onto several lines of its column '.repeat(3)

test('questions too long to fit spill onto further pages', () => {
  const layout = getLayoutForTemplate('standard hexagonal jigsaw 30', 30)
  const { summary, pdf } = build(pairsFor(layout, tooLong), layout)
  assert.ok(summary.pages > 1, `expected more than one page, got ${summary.pages}`)
  // jsPDF starts every document on a blank page; the table adds its own.
  assert.equal(pdf.getNumberOfPages(), summary.pages + 1)
})

test('an empty puzzle draws no table at all, rather than an empty one', () => {
  const layout = getLayoutForTemplate('dominos 6', 6)
  const { summary } = build([], layout)
  assert.deepEqual(summary, { pages: 0, rows: 0 })
})

// The outer rim of an extended hexagon has a decoy and nothing to match it,
// so those rows have no answer to print — they must still be listed.
test('outer-edge decoys are listed, not skipped', () => {
  const layout = getLayoutForTemplate('extended hexagonal jigsaw 30', 36)
  const pairs = pairsFor(layout)
  const rows = placedPairs(pairs, layout)
  const { summary } = build(pairs, layout)
  assert.equal(summary.rows, rows.length)
  assert.ok(
    rows.some((row) => !row.usesAnswer),
    'this layout should have rows with no answer slot',
  )
})

test('the table survives characters the font has to reach for', () => {
  const layout = getLayoutForTemplate('dominos 6', 6)
  const pairs = pairsFor(layout, (n) => `Čeština ${n} — ≥ × ² ½`)
  const { summary } = build(pairs, layout)
  assert.equal(summary.pages, 1)
})

// Run with PREVIEW=1 to get a file you can actually look at.
test('preview', { skip: process.env.PREVIEW !== '1' }, () => {
  const layout = getLayoutForTemplate('standard hexagonal jigsaw 30', 30)
  const LONG_Q =
    'A question long enough to need wrapping across more than one line in the table column, which is exactly the case that breaks naive layouts'
  const LONG_A = 'The wrapped answer, also rather long so that both columns have to grow together'
  const pairs = pairsFor(
    layout,
    (n) => (n === 4 ? LONG_Q : `Question ${n} — čeština, ≥, ×, ²`),
    (n) => (n === 4 ? LONG_A : `Answer ${n}`),
  )
  const { pdf } = build(pairs, layout, 'Quadratic equations')
  pdf.deletePage(1)
  writeFileSync(new URL('../pairs-table-preview.pdf', import.meta.url), Buffer.from(pdf.output('arraybuffer')))
})
