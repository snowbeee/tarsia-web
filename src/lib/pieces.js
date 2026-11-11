// Turning a solved layout into the separate pieces a teacher cuts out.
//
// The on-screen render shows the puzzle assembled — that's the answer key.
// A worksheet is the same content taken apart: each piece drawn on its own,
// in scrambled order, so students have to work out which edges match.

// A piece carries only its labels, never its position in the solved puzzle.
// That's the whole point: position is the answer.
export function buildPieces(layout) {
  switch (layout.shape) {
    case 'triangle':
      // `slots` order is [horizontal, left-slant, right-slant]. Their cyclic
      // order around the triangle is what identifies the piece, and rotating
      // a piece preserves it, so a piece needs nothing but its three slots.
      return layout.cells.map((cell, i) => ({ id: `t${i}`, slots: cell.slots }))
    case 'domino-chain':
      return layout.tiles.map((tile, i) => ({ id: `d${i}`, left: tile.left, right: tile.right }))
    case 'square-grid':
      return layout.cells.map((cell, i) => ({ id: `s${i}`, slots: cell.slots }))
    case 'polygon-tiling':
      // Unlike the grid shapes, a piece here has no repeated outline to look
      // up — squares and triangles at a mix of angles — so it carries its own.
      return layout.pieces.map((piece, i) => ({ id: `g${i}`, points: piece.points, slots: piece.slots }))
    case 'rect-cards':
      // Questions and answers become separate cards — that's the activity.
      return layout.rows.flatMap((row, i) => [
        { id: `c${i}q`, code: row.left },
        { id: `c${i}a`, code: row.right },
      ])
    default:
      return []
  }
}

// Deterministic PRNG, so a given puzzle always scrambles the same way.
// A re-render that reshuffled would change the sheet under the teacher
// between previewing it and printing it.
function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function seedFrom(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * Scramble pieces, and give each one a rotation.
 *
 * `rotationStep` must divide 360 into genuine rotations of that shape, never
 * reflections — a mirrored piece wouldn't fit back into the puzzle. 60° for
 * an equilateral triangle: even multiples leave the apex pointing the same
 * way and just cycle which edge carries which label, odd multiples flip it
 * point-up, and both scramble without changing the piece. 90° for a square.
 * 0 for shapes that shouldn't turn at all.
 */
export function scramblePieces(pieces, seedKey, rotationStep = 60) {
  const rand = mulberry32(seedFrom(seedKey))
  const steps = rotationStep > 0 ? Math.round(360 / rotationStep) : 1
  const out = pieces.map((p) => ({ ...p, rotation: Math.floor(rand() * steps) * rotationStep }))
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * A4 inside the exporter's margins and header, in both orientations. Kept in
 * step with exportPuzzlePdf's MARGIN_MM / HEADER_MM.
 */
export const PAGE_AREAS = [
  { w: 186, h: 273 }, // portrait
  { w: 273, h: 186 }, // landscape
]

/**
 * Choose the grid that makes the pieces physically largest once the sheet is
 * scaled onto a page.
 *
 * Optimising the grid's aspect ratio against one page shape would be the
 * obvious approach and is subtly wrong: the exporter picks whichever
 * orientation fits the sheet best, so the grid has to be chosen against the
 * same set of options, or the two decisions disagree and the sheet lands on a
 * page it wasn't shaped for. What actually matters to someone cutting the
 * pieces out is their printed size, so maximise that directly.
 *
 * @param {{w:number,h:number}[]} pageAreas usable area of each candidate page
 */
export function bestGrid(count, itemW, itemH, pageAreas) {
  let best = { cols: count, rows: 1, scale: 0 }
  for (let cols = 1; cols <= count; cols++) {
    const rows = Math.ceil(count / cols)
    for (const page of pageAreas) {
      const scale = Math.min(page.w / (cols * itemW), page.h / (rows * itemH))
      if (scale > best.scale) best = { cols, rows, scale }
    }
  }
  return { cols: best.cols, rows: best.rows }
}
