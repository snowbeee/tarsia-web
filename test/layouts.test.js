import './setup.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseFjsw } from '../src/lib/fjswParser.js'
import { getLayoutForTemplate, requiredPairCount } from '../src/lib/layouts/index.js'
import { BUILDER_SHAPES, buildLayoutFromSpec } from '../src/lib/builder/templates.js'

// What these tests are for: a puzzle is only a puzzle if every question sits
// on the same edge as its own answer, with the two on different pieces. The
// README says so about the layouts that carry `verified: false`, and the
// layouts' own comments say it about all of them — so it is checked here, for
// every layout the app can produce, rather than reasoned about.
//
// The check does not trust the layouts to say where their edges are. Each
// shape's drawn geometry is rebuilt below from what the renderer does with a
// cell (the same transforms as TriangleGridSvg, SquareGridSvg and
// PolygonTilingSvg), so two slots count as "one edge" only when the pieces
// they sit on really do put the same line segment there. That matters for the
// fixed tables (hexagon30, triangle18, squareGrid24): they were written
// against a slot order, and a table whose order was off would still draw a
// correct-looking shape — it is the shared segment that gives it away.

// ------------------------------------------------------------ geometry
//
// Every function returns, for one piece, the key of the segment each slot
// sits on, in slot order. A key is the two endpoints, sorted, so two pieces
// that meet along a segment name it identically whichever way round they
// walk it.

const segment = (p, q) => {
  const a = `${p[0]},${p[1]}`
  const b = `${q[0]},${q[1]}`
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

// Triangles live on a lattice of half-columns by rows, where the unrotated
// cell is A=(0,0) B=(2,0) C=(1,1) and slots run [A-B, A-C, B-C]. The renderer
// places a cell at (col-1, row-1) and, when (col+row) is odd, turns it 180
// degrees about the cell's middle — (x, y) -> (2-x, 1-y) in these units.
// Integers throughout, so there is nothing to round.
function triangleSegments({ row, col }) {
  const turned = (col + row) % 2 !== 0
  const place = ([x, y]) => {
    const [tx, ty] = turned ? [2 - x, 1 - y] : [x, y]
    return [tx + col - 1, ty + row - 1]
  }
  const A = place([0, 0])
  const B = place([2, 0])
  const C = place([1, 1])
  return [segment(A, B), segment(A, C), segment(B, C)]
}

// [top, right, bottom, left], the order SQUARE_SLOTS draws them in.
function squareSegments({ row, col }) {
  const tl = [col - 1, row - 1]
  const tr = [col, row - 1]
  const br = [col, row]
  const bl = [col - 1, row]
  return [segment(tl, tr), segment(tr, br), segment(bl, br), segment(tl, bl)]
}

// Slot i is the edge from point i to point i+1. Coordinates are drawing units
// (hundreds of them), so rounding to a tenth separates "the same corner" from
// "another corner" by a wide margin while forgiving float noise.
const roundedPoint = (p) => [p[0].toFixed(1), p[1].toFixed(1)]
function polygonSegments({ points }) {
  return points.map((p, i) => segment(roundedPoint(p), roundedPoint(points[(i + 1) % points.length])))
}

function segmentsOfPieces(layout) {
  switch (layout.shape) {
    case 'triangle':
      return layout.cells.map((cell) => triangleSegments(cell))
    case 'square-grid':
      return layout.cells.map((cell) => squareSegments(cell))
    case 'polygon-tiling':
      return layout.pieces.map((piece) => polygonSegments(piece))
    default:
      throw new Error(`no geometry model for layout shape "${layout.shape}"`)
  }
}

const slotsOfPieces = (layout) => (layout.cells ?? layout.pieces).map((piece) => piece.slots)

// --------------------------------------------------------- tiling checks

const CODE = /^(\d+)([qa])$/

/**
 * Everything wrong with a tiling layout, as sentences; empty when it is a
 * puzzle. Returned rather than asserted so a failure lists every problem
 * together, under the name of the shape that has them.
 *
 * @param expect pieces, matched pairs, boundary edges and decoys, each worked
 *   out from the shape's geometry or the template's name, not read back off
 *   the layout being judged.
 */
function tilingProblems(layout, expect) {
  const problems = []
  const slots = slotsOfPieces(layout)
  const segments = segmentsOfPieces(layout)

  if (slots.length !== expect.pieces) {
    problems.push(`has ${slots.length} pieces, expected ${expect.pieces}`)
  }

  // Where every code sits, and which pieces own each segment.
  const where = new Map()
  const owners = new Map()
  slots.forEach((pieceSlots, piece) => {
    if (pieceSlots.length !== segments[piece].length) {
      problems.push(`piece ${piece} has ${pieceSlots.length} slots for ${segments[piece].length} edges`)
      return
    }
    pieceSlots.forEach((code, slot) => {
      const key = segments[piece][slot]
      if (!owners.has(key)) owners.set(key, [])
      owners.get(key).push({ piece, slot })
      if (code === null) return
      if (!CODE.test(code)) {
        problems.push(`piece ${piece} slot ${slot} holds "${code}", which is not a pair code`)
      } else if (where.has(code)) {
        problems.push(`${code} appears twice (pieces ${where.get(code).piece} and ${piece})`)
      } else {
        where.set(code, { piece, slot, key })
      }
    })
  })

  for (const [key, list] of owners) {
    if (list.length > 2) problems.push(`${list.length} pieces claim the edge ${key}`)
  }
  const boundary = [...owners.values()].filter((list) => list.length === 1)
  if (boundary.length !== expect.boundary) {
    problems.push(`has ${boundary.length} outer edges, expected ${expect.boundary}`)
  }

  // Numbering: 1..highest with no gaps, matched pairs first, then decoys.
  const highest = requiredPairCount(layout)
  const expectedHighest = expect.matched + expect.decoys
  if (highest !== expectedHighest) {
    problems.push(`its highest pair number is ${highest}, expected ${expectedHighest}`)
  }
  for (let n = 1; n <= Math.max(highest, expectedHighest); n++) {
    const q = where.get(`${n}q`)
    const a = where.get(`${n}a`)
    const matched = n <= expect.matched
    if (!q) problems.push(`pair ${n} has no question slot`)
    if (matched && !a) problems.push(`pair ${n} has no answer slot`)
    if (!matched && a) problems.push(`pair ${n} is a decoy but also has an answer slot`)
    if (!q || !matched || !a) continue
    // The property itself: two different pieces, one shared edge.
    if (q.piece === a.piece) {
      problems.push(`pair ${n}: question and answer are both on piece ${q.piece}`)
    } else if (q.key !== a.key) {
      problems.push(`pair ${n}: question (piece ${q.piece}) and answer (piece ${a.piece}) are on different edges`)
    } else if (owners.get(q.key).length !== 2) {
      problems.push(`pair ${n}: the edge it shares is not shared by exactly two pieces`)
    }
  }

  // The other direction: nothing sits on a shared edge except a matched pair
  // that belongs there. This is what catches a hole (a shared edge with
  // nothing on one side) and two unrelated pairs facing each other.
  for (const [key, list] of owners) {
    if (list.length !== 2) continue
    const [one, two] = list.map(({ piece, slot }) => slots[piece][slot])
    const a = CODE.exec(one ?? '')
    const b = CODE.exec(two ?? '')
    const paired = a && b && a[1] === b[1] && a[2] !== b[2]
    if (!paired) {
      problems.push(`shared edge ${key} carries ${one ?? 'nothing'} on one side and ${two ?? 'nothing'} on the other`)
    }
  }

  // Decoys: only on an edge with a single owner, or the puzzle can never be
  // completed — the piece would have to lie next to a neighbour that isn't
  // there to match it.
  let filledBoundary = 0
  for (const list of boundary) {
    const { piece, slot } = list[0]
    const code = slots[piece][slot]
    if (code === null) continue
    filledBoundary++
    const m = CODE.exec(code)
    if (m && Number(m[1]) <= expect.matched) {
      problems.push(`outer edge of piece ${piece} holds ${code}, which has a partner elsewhere`)
    }
  }
  for (let n = expect.matched + 1; n <= highest; n++) {
    const d = where.get(`${n}q`)
    if (d && owners.get(d.key).length !== 1) {
      problems.push(`decoy ${n}q (piece ${d.piece}) is on an edge shared with another piece`)
    }
  }
  if (filledBoundary !== expect.decoys) {
    problems.push(`${filledBoundary} outer edges are filled, expected ${expect.decoys}`)
  }

  // The layout's own bookkeeping has to agree with what it draws, since the
  // pair editor and the PDF both trust it.
  if (layout.pairCount !== expect.matched + expect.decoys) {
    problems.push(`pairCount says ${layout.pairCount}, but it places ${expect.matched + expect.decoys}`)
  }
  if (layout.matchedPairCount !== undefined && layout.matchedPairCount !== expect.matched) {
    problems.push(`matchedPairCount says ${layout.matchedPairCount}, expected ${expect.matched}`)
  }

  return problems
}

/**
 * A domino chain of `questions` questions is questions+1 tiles. Tile k's
 * right half is pair k's question; tile k+1's left half is pair k's answer;
 * the two outer halves are Start and Finish, which belong to no pair.
 */
function chainProblems(layout, questions) {
  const problems = []
  const tiles = layout.tiles
  if (tiles.length !== questions + 1) {
    problems.push(`has ${tiles.length} tiles, expected ${questions + 1}`)
  }
  tiles.forEach((tile, i) => {
    const k = i + 1
    const left = k === 1 ? 'START' : `${k - 1}a`
    const right = k === tiles.length ? 'FINISH' : `${k}q`
    if (tile.left !== left) problems.push(`tile ${k} left half is "${tile.left}", expected "${left}"`)
    if (tile.right !== right) problems.push(`tile ${k} right half is "${tile.right}", expected "${right}"`)
  })
  if (requiredPairCount(layout) !== questions) {
    problems.push(`places ${requiredPairCount(layout)} pairs, expected ${questions}`)
  }
  if (layout.matchedPairCount !== questions) {
    problems.push(`matchedPairCount says ${layout.matchedPairCount}, expected ${questions}`)
  }
  return problems
}

/** Matching cards have no shared edge: row k is simply pair k's two cards. */
function cardProblems(layout, pairs) {
  const problems = []
  if (layout.rows.length !== pairs) problems.push(`has ${layout.rows.length} rows, expected ${pairs}`)
  layout.rows.forEach((row, i) => {
    const k = i + 1
    if (row.left !== `${k}q`) problems.push(`row ${k} left card is "${row.left}", expected "${k}q"`)
    if (row.right !== `${k}a`) problems.push(`row ${k} right card is "${row.right}", expected "${k}a"`)
  })
  if (requiredPairCount(layout) !== pairs) {
    problems.push(`places ${requiredPairCount(layout)} pairs, expected ${pairs}`)
  }
  if (layout.matchedPairCount !== pairs) {
    problems.push(`matchedPairCount says ${layout.matchedPairCount}, expected ${pairs}`)
  }
  return problems
}

const check = (label, problems) =>
  assert.deepEqual(problems, [], `${label} is not a valid puzzle:\n  ${problems.join('\n  ')}`)

// ------------------------------------------------- importable templates
//
// Each sample is read through the real parser and handed to
// getLayoutForTemplate with the pair count the file actually holds, which is
// what opening the file does. Counts in `expect` come from the template's
// name and shape, not from the layout.

const sample = (name) =>
  parseFjsw(readFileSync(new URL(`../samples/${name}`, import.meta.url), 'utf8'))

const IMPORTED = [
  { file: 'hex30.fjsw', kind: 'tiling', expect: { pieces: 24, matched: 30, boundary: 12, decoys: 0 } },
  { file: 'longest.fjsw', kind: 'tiling', expect: { pieces: 24, matched: 30, boundary: 12, decoys: 0 } },
  { file: 'longish.fjsw', kind: 'tiling', expect: { pieces: 24, matched: 30, boundary: 12, decoys: 0 } },
  // 30 matched pairs plus the 12 single values the file stores after them.
  { file: 'exthex.fjsw', kind: 'tiling', expect: { pieces: 24, matched: 30, boundary: 12, decoys: 12 } },
  { file: 'exthex2.fjsw', kind: 'tiling', expect: { pieces: 24, matched: 30, boundary: 12, decoys: 12 } },
  { file: 'tri18.fjsw', kind: 'tiling', expect: { pieces: 16, matched: 18, boundary: 12, decoys: 0 } },
  // This file stores 25 eqnpairs for a 24-pair template; the extra is ignored.
  { file: 'square24.fjsw', kind: 'tiling', expect: { pieces: 16, matched: 24, boundary: 16, decoys: 0 } },
  { file: 'parquet15.fjsw', kind: 'tiling', expect: { pieces: 12, matched: 15, boundary: 10, decoys: 0 } },
  // 12 eqnpairs: 11 real ones and the Start/Finish sentinel.
  { file: 'dominoes.fjsw', kind: 'chain', questions: 11 },
  { file: 'rectcards.fjsw', kind: 'cards', pairs: 9 },
]

for (const entry of IMPORTED) {
  const { templateId, pairs } = sample(entry.file)
  const label = `${entry.file} (${templateId}, ${pairs.length} pairs)`
  const layout = getLayoutForTemplate(templateId, pairs.length)

  test(`${label} is a layout the app draws`, () => {
    assert.ok(layout, `getLayoutForTemplate returned nothing for ${templateId}`)
  })

  test(`${label}: every pair is placed as its layout promises`, () => {
    if (entry.kind === 'tiling') check(label, tilingProblems(layout, entry.expect))
    if (entry.kind === 'chain') check(label, chainProblems(layout, entry.questions))
    if (entry.kind === 'cards') check(label, cardProblems(layout, entry.pairs))
  })
}

// ------------------------------------------------------ builder shapes
//
// Every shape at every size, with and without the border flag where the shape
// has one. Expected counts are the closed forms the templates' own comments
// give — an n-triangle has n² pieces and 3n(n-1)/2 pairs, and so on — plus
// the length of the outline, which is what the border flag fills.

const BUILDER_EXPECTATIONS = {
  triangle: (n) => ({ pieces: n * n, matched: (3 * n * (n - 1)) / 2, boundary: 3 * n }),
  hexagon: (k) => ({ pieces: 6 * k * k, matched: 9 * k * k - 3 * k, boundary: 6 * k }),
  square: (size) => {
    const [r, c] = size.split('x').map(Number)
    return { pieces: r * c, matched: 2 * r * c - r - c, boundary: 2 * (r + c) }
  },
  parquet: () => ({ pieces: 12, matched: 15, boundary: 10 }),
}

let combinations = 0
for (const shape of BUILDER_SHAPES) {
  for (const { value: size } of shape.sizes) {
    for (const fillBorder of shape.hasBorder ? [false, true] : [false]) {
      combinations++
      const label = `builder ${shape.key} ${size}${fillBorder ? ' with border' : ''}`
      const layout = buildLayoutFromSpec({ shape: shape.key, size, fillBorder })

      test(`${label}: every pair is placed as its shape promises`, () => {
        if (shape.key === 'dominoes') return check(label, chainProblems(layout, Number(size)))
        if (shape.key === 'cards') return check(label, cardProblems(layout, Number(size)))
        // Squares are sized '3x4', the rest by a number (parquet ignores it).
        const counts = BUILDER_EXPECTATIONS[shape.key](shape.key === 'square' ? size : Number(size))
        const expect = { ...counts, decoys: fillBorder ? counts.boundary : 0 }
        check(label, tilingProblems(layout, expect))
      })
    }
  }
}

test('the builder is checked at every combination it offers', () => {
  // Counted from BUILDER_SHAPES rather than written down, so a shape or size
  // added later is picked up above — and this fails if that loop ever stops
  // visiting what the picker shows.
  const offered = BUILDER_SHAPES.reduce(
    (sum, shape) => sum + shape.sizes.length * (shape.hasBorder ? 2 : 1),
    0,
  )
  assert.equal(combinations, offered)
})

test('a border flag on a shape without borders changes nothing', () => {
  // buildLayoutFromSpec guards on hasBorder; a saved spec could carry the flag
  // for a shape that cannot use it.
  for (const shape of BUILDER_SHAPES.filter((s) => !s.hasBorder)) {
    const plain = buildLayoutFromSpec({ shape: shape.key, size: shape.sizes[0].value, fillBorder: false })
    const flagged = buildLayoutFromSpec({ shape: shape.key, size: shape.sizes[0].value, fillBorder: true })
    assert.deepEqual(flagged, plain, `${shape.key} reacted to a border flag it has no use for`)
  }
})

// ------------------------------------------------- the checks themselves
//
// A check that never fails proves nothing, so each way a layout can be wrong
// is made once, on a copy of a real layout, and the check has to notice.

const hexagon = () => structuredClone(getLayoutForTemplate('standard hexagonal jigsaw 30', 30))
const HEX = { pieces: 24, matched: 30, boundary: 12, decoys: 0 }

test('the check accepts the standard hexagon it is about to be asked to reject variants of', () => {
  check('hexagon-30', tilingProblems(hexagon(), HEX))
})

test('the check notices an answer moved to a different edge', () => {
  // Swap 1a with the answer 2a: both are still real slots, just on the wrong
  // edges — the "looks right, doesn't solve" failure the renderer warns of.
  const layout = hexagon()
  const find = (code) => layout.cells.flatMap((cell) => cell.slots.map((s, i) => [cell, i, s])).find(([, , s]) => s === code)
  const [c1, i1] = find('1a')
  const [c2, i2] = find('2a')
  c1.slots[i1] = '2a'
  c2.slots[i2] = '1a'
  const problems = tilingProblems(layout, HEX)
  assert.ok(problems.some((p) => /pair 1: .*different edges/.test(p)), problems.join('; '))
})

test('the check notices a pair whose two halves are on one piece', () => {
  const layout = hexagon()
  // Cell 0 is [5q, 1q, null]; put 1a on its blank slot as well.
  layout.cells[0].slots[2] = '1a'
  const problems = tilingProblems(layout, HEX)
  assert.ok(problems.some((p) => /pair 1: question and answer are both on piece 0/.test(p)), problems.join('; '))
})

test('the check notices a decoy placed on a shared edge', () => {
  const layout = structuredClone(getLayoutForTemplate('extended hexagonal jigsaw 30', 42))
  const expect = { ...HEX, decoys: 12 }
  check('extended hexagon', tilingProblems(layout, expect))
  // 31q sits on a rim edge; put it where 1q is instead.
  const holder = layout.cells.find((cell) => cell.slots.includes('1q'))
  holder.slots[holder.slots.indexOf('1q')] = '31q'
  const problems = tilingProblems(layout, expect)
  assert.ok(problems.some((p) => /decoy 31q .* shared with another piece/.test(p)), problems.join('; '))
})

test('the check notices a gap in the numbering', () => {
  const layout = hexagon()
  // Renumber 30 as 31: pair 30 is now missing and pair 31 is beyond the count.
  for (const cell of layout.cells) cell.slots = cell.slots.map((s) => (s === '30q' ? '31q' : s === '30a' ? '31a' : s))
  const problems = tilingProblems(layout, HEX)
  assert.ok(problems.some((p) => /pair 30 has no question slot/.test(p)), problems.join('; '))
  assert.ok(problems.some((p) => /highest pair number is 31/.test(p)), problems.join('; '))
})

test('the check notices a hole on a shared edge', () => {
  const layout = hexagon()
  const holder = layout.cells.find((cell) => cell.slots.includes('7a'))
  holder.slots[holder.slots.indexOf('7a')] = null
  const problems = tilingProblems(layout, HEX)
  assert.ok(problems.some((p) => /pair 7 has no answer slot/.test(p)), problems.join('; '))
  assert.ok(problems.some((p) => /shared edge .* 7q on one side and nothing/.test(p)), problems.join('; '))
})

test('the check notices a broken domino chain', () => {
  const layout = structuredClone(buildLayoutFromSpec({ shape: 'dominoes', size: '6', fillBorder: false }))
  layout.tiles[3].left = '2a'
  assert.ok(chainProblems(layout, 6).some((p) => /tile 4 left half/.test(p)))
})
