// What the PDF can actually draw.
//
// The app decides whether a character will print by consulting the ranges in
// render/font.js, which are a restatement of how the font was cut down — and
// a restatement can drift from the thing it restates. So these tests ask the
// shipped font file itself, by reading its character map, and fail if the two
// ever disagree in either direction.

import './setup.js'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { hasGlyph, missingGlyphs } from '../src/lib/render/font.js'
import { parseFjsw } from '../src/lib/fjswParser.js'

const repoFile = (path) => fileURLToPath(new URL('../' + path, import.meta.url))

// Every codepoint the font has a glyph for, read out of its cmap.
//
// Only the Windows/Unicode BMP subtable (platform 3, encoding 1, format 4) is
// read: the subset tops out at U+25FF, so there is nothing above the BMP to
// find and no format 12 table in the file to find it in.
function codepointsIn(ttfPath) {
  const font = new DataView(readFileSync(ttfPath).buffer)

  let cmap = null
  for (let i = 0; i < font.getUint16(4); i++) {
    const entry = 12 + i * 16
    const tag = String.fromCharCode(...[0, 1, 2, 3].map((k) => font.getUint8(entry + k)))
    if (tag === 'cmap') cmap = font.getUint32(entry + 8)
  }
  assert.ok(cmap, 'the font has no cmap table')

  let table = null
  for (let i = 0; i < font.getUint16(cmap + 2); i++) {
    const record = cmap + 4 + i * 8
    if (font.getUint16(record) === 3 && font.getUint16(record + 2) === 1) {
      table = cmap + font.getUint32(record + 4)
    }
  }
  assert.ok(table, 'the font has no Windows/Unicode cmap subtable')
  assert.equal(font.getUint16(table), 4, 'expected a format 4 cmap subtable')

  const segments = font.getUint16(table + 6) / 2
  const endCodes = table + 14
  const startCodes = endCodes + segments * 2 + 2
  const idDeltas = startCodes + segments * 2
  const idRangeOffsets = idDeltas + segments * 2

  const covered = new Set()
  for (let s = 0; s < segments; s++) {
    const end = font.getUint16(endCodes + s * 2)
    const start = font.getUint16(startCodes + s * 2)
    const delta = font.getInt16(idDeltas + s * 2)
    const rangeOffset = font.getUint16(idRangeOffsets + s * 2)
    if (start === 0xffff) continue // the required terminating segment
    for (let c = start; c <= end; c++) {
      // A glyph id of 0 is .notdef — a cmap can map a character to it, and
      // that is not coverage, it is the empty box we are trying to avoid.
      const glyph = rangeOffset === 0
        ? (c + delta) & 0xffff
        : font.getUint16(idRangeOffsets + s * 2 + rangeOffset + (c - start) * 2)
      if (glyph !== 0) covered.add(c)
    }
  }
  return covered
}

const inFont = codepointsIn(repoFile('src/assets/fonts/DejaVuSans-subset.ttf'))

test('the font draws everything the app claims it can', () => {
  const claimedButAbsent = []
  for (let c = 0x20; c <= 0x2600; c++) {
    if (hasGlyph(String.fromCodePoint(c)) && !inFont.has(c)) claimedButAbsent.push(c.toString(16))
  }
  assert.deepEqual(claimedButAbsent, [])
})

test('the app claims everything the font draws', () => {
  // The other direction: a glyph the font has but render/font.js does not
  // know about would be warned over and then printed perfectly well.
  const drawnButUnclaimed = [...inFont].filter((c) => !hasGlyph(String.fromCodePoint(c)))
  assert.deepEqual(drawnButUnclaimed, [])
})

test('nothing needs to be substituted for the characters that used to be', () => {
  // These three were rewritten as "<=", ">=" and "->" on their way into the
  // PDF, because jsPDF's Helvetica could not draw them. The font can, so a
  // teacher who writes one gets it printed.
  for (const ch of '≤≥→') {
    assert.ok(inFont.has(ch.codePointAt(0)), `the font cannot draw ${ch}`)
    assert.deepEqual(missingGlyphs([`x ${ch} 16`]), [])
  }
})

test('school maths beyond Latin-1 prints', () => {
  const content = 'x\u0304 α β γ θ π Δ Σ Ω ∞ ≠ ≈ ± × ÷ √ ∑ ∫ ∈ ∉ ⊂ ∅ ∴ ° ⌈ ⌊ ∠ ⊥ ≅ ∝ ∂ ∇ ⇒ ⇔ ← ↔ ′ ″ − ² ³ ₂ ½ ⅓ ℝ ℕ ℤ ℚ △ ○ é ü ñ č ø'
  assert.deepEqual(missingGlyphs([content]), [])
})

test('a character with no glyph is reported, not quietly changed', () => {
  // Nothing in the app rewrites text for the PDF any more, so the only honest
  // thing left to do with an uncoverable character is say which one it was.
  assert.deepEqual(missingGlyphs(['日本語 x≥16', 'plain']), ['日', '本', '語'])
})

test('every sample puzzle prints as written', () => {
  const samples = readdirSync(repoFile('samples')).filter((f) => f.endsWith('.fjsw'))
  assert.ok(samples.length > 0)
  for (const name of samples) {
    const { pairs } = parseFjsw(readFileSync(repoFile(`samples/${name}`), 'utf8'))
    const undrawable = missingGlyphs(pairs.flatMap((pair) => [pair.question, pair.answer]))
    assert.deepEqual(undrawable, [], `${name} contains characters the PDF cannot draw`)
  }
})
