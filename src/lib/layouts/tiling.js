// Layout generation for puzzles created in the app, rather than imported.
//
// The imported layouts (hexagon30.js, triangle18.js, squareGrid24.js) are
// fixed tables, because they have to reproduce an edge numbering the desktop
// app chose and that we can only observe from the outside — which is why
// square-24 has to carry a `verified: false` caveat.
//
// A puzzle created here is under no such constraint. The pieces to cut out
// and the answer key are both drawn from this layout, so ANY numbering that
// puts each answer on its own question's edge yields a puzzle that is
// solvable, and exactly one way. That is what makes these generated: the
// shape is described as a set of cells, the shared edges are then derived
// from the geometry instead of being written out by hand, and the result is
// correct by construction at whatever size is asked for.
//
// Nothing here is used for importing a .fjsw. The two must not be merged:
// making the imported layouts share this numbering would silently change
// what an imported file renders as, on no evidence.

// A cell's edges are given as pairs of lattice points, so that two cells
// meeting along an edge produce the same key for it — the whole trick.
const vertexKey = (v) => `${v[0]},${v[1]}`
const edgeKey = (p, q) => {
  const a = vertexKey(p)
  const b = vertexKey(q)
  // Ordered, so the two cells that meet along an edge name it the same way
  // round.
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/**
 * Work out which of a tiling's edges are shared, and put a numbered
 * question/answer on each.
 *
 * @param {object[]} cells        shape-specific cell descriptions
 * @param {(cell) => number[][][]} edgesOf  a cell's edges as [[p,q], ...],
 *        in the order the renderer expects that shape's `slots` to be in
 * @param {{fillBorder?: boolean}} options
 *        fillBorder puts a standalone value on each unshared (outer) edge
 *        too. Those are decoys: a blank edge otherwise tells a student "this
 *        one faces outwards", and filling them takes the hint away. It is
 *        how the `extended hexagonal jigsaw 30` template differs from the
 *        standard one.
 * @returns {{slots: (string|null)[][], pairCount: number, borderCount: number}}
 */
export function assignSharedEdges(cells, edgesOf, { fillBorder = false } = {}) {
  const cellEdges = cells.map(edgesOf)

  const owners = new Map()
  cellEdges.forEach((edges, ci) => {
    edges.forEach(([p, q], si) => {
      const key = edgeKey(p, q)
      const list = owners.get(key)
      if (list) list.push([ci, si])
      else owners.set(key, [[ci, si]])
    })
  })

  // Three cells on one edge means the cell set is malformed — overlapping
  // pieces, or a lattice mapped wrongly. Left alone it would quietly produce
  // a puzzle with a duplicated question, so fail loudly instead.
  for (const [key, list] of owners) {
    if (list.length > 2) throw new Error(`tiling: ${list.length} cells share the edge ${key}`)
  }

  const slots = cellEdges.map((edges) => edges.map(() => null))
  let n = 0

  // Numbered in reading order — first cell first, and within a cell in slot
  // order — so that pair 1 is at the top of the puzzle and someone filling
  // the list in works roughly downwards. Any order would be solvable; this
  // one is merely the least surprising.
  cellEdges.forEach((edges, ci) => {
    edges.forEach(([p, q], si) => {
      if (slots[ci][si] !== null) return
      const shared = owners.get(edgeKey(p, q))
      if (shared.length !== 2) return
      const [ci2, si2] = shared.find(([c, s]) => c !== ci || s !== si)
      n += 1
      slots[ci][si] = `${n}q`
      slots[ci2][si2] = `${n}a`
    })
  })

  const pairCount = n
  if (fillBorder) {
    cellEdges.forEach((edges, ci) => {
      edges.forEach((_, si) => {
        if (slots[ci][si] === null) slots[ci][si] = `${(n += 1)}q`
      })
    })
  }

  return { slots, pairCount, borderCount: n - pairCount }
}

// ------------------------------------------------------------- triangles
//
// Lattice coordinates match what TriangleGridSvg draws: a vertex (u, v) sits
// at x = u * SIDE/2, y = v * TRI_HEIGHT. A cell's orientation comes from
// (row + col) parity, exactly as the renderer decides it, so these vertices
// are the drawn ones and not a parallel model that could drift.
function triangleEdges({ row, col }) {
  const up = (row + col) % 2 === 1
  const a = up ? [col + 1, row] : [col - 1, row - 1]
  const b = up ? [col - 1, row] : [col + 1, row - 1]
  const c = up ? [col, row - 1] : [col, row]
  // [horizontal, left-slanted, right-slanted] — the order the layouts and
  // TRI_SLOTS both use.
  return [[a, b], [a, c], [b, c]]
}

// Rows and columns are shifted so the tiling starts at row 1 and hugs the
// left edge. The shift has to keep (row + col) parity, or every piece flips
// over and the tiling comes apart.
function normaliseTriangleCells(cells) {
  const minRow = Math.min(...cells.map((c) => c.row))
  const minCol = Math.min(...cells.map((c) => c.col))
  const dRow = 1 - minRow
  let dCol = 1 - minCol
  if ((dRow + dCol) % 2 !== 0) dCol += 1
  return cells.map(({ row, col }) => ({ row: row + dRow, col: col + dCol }))
}

/**
 * The cells of a triangle of side `n` — n rows, n² pieces, 3n(n-1)/2 pairs.
 * n = 4 is the shape the `standard triangular jigsaw 18` template uses.
 */
export function triangleCells(n) {
  // The corner pieces have to point the same way as the whole triangle, and
  // the bottom-left one is at (n, apex - n + 1); that is "up" when apex is
  // even. For odd n this puts the leftmost column at 2, which is why the
  // renderer derives its viewBox from the cells rather than assuming 1.
  const apex = n % 2 === 0 ? n : n + 1
  const cells = []
  for (let row = 1; row <= n; row++) {
    for (let col = apex - row + 1; col <= apex + row - 1; col++) cells.push({ row, col })
  }
  return cells
}

/**
 * The cells of a hexagon of size `k` — 6k² pieces, 9k² - 3k pairs.
 *
 * A hexagon is a triangle of side 3k with a triangle of side k cut off each
 * corner. k = 2 gives 24 pieces in rows of 5, 7, 7, 5 and 30 pairs, which is
 * precisely the shape (and the cells) of `standard hexagonal jigsaw 30` —
 * the derivation is checked against that layout in the tests.
 */
export function hexagonCells(k) {
  const side = 3 * k
  const apex = side % 2 === 0 ? side : side + 1
  const cells = []
  for (let row = k + 1; row <= side; row++) {
    // Into the bottom k rows, the two lower corners bite in from each end:
    // the j-th row of a corner triangle of side k is 2j-1 cells wide.
    const j = row - (side - k)
    const trim = j > 0 ? 2 * j - 1 : 0
    for (let col = apex - row + 1 + trim; col <= apex + row - 1 - trim; col++) cells.push({ row, col })
  }
  return cells
}

export function buildTriangleTilingLayout(rawCells, { layoutId, fillBorder = false } = {}) {
  const cells = normaliseTriangleCells(rawCells)
  const { slots, pairCount, borderCount } = assignSharedEdges(cells, triangleEdges, { fillBorder })
  return {
    layoutId,
    shape: 'triangle',
    pairCount: pairCount + borderCount,
    matchedPairCount: pairCount,
    cells: cells.map((cell, i) => ({ row: cell.row, col: cell.col, slots: slots[i] })),
  }
}

// ---------------------------------------------------------------- squares

function squareEdges({ row, col }) {
  const tl = [col - 1, row - 1]
  const tr = [col, row - 1]
  const br = [col, row]
  const bl = [col - 1, row]
  // [top, right, bottom, left] — SquareGridSvg's slot order.
  return [[tl, tr], [tr, br], [bl, br], [tl, bl]]
}

/** A rows x cols grid of squares: rows*cols pieces, 2*rows*cols - rows - cols pairs. */
export function buildSquareTilingLayout(rowCount, colCount, { layoutId, fillBorder = false } = {}) {
  const cells = []
  for (let row = 1; row <= rowCount; row++) {
    for (let col = 1; col <= colCount; col++) cells.push({ row, col })
  }
  const { slots, pairCount, borderCount } = assignSharedEdges(cells, squareEdges, { fillBorder })
  return {
    layoutId,
    shape: 'square-grid',
    pairCount: pairCount + borderCount,
    matchedPairCount: pairCount,
    rowCount,
    colCount,
    cells: cells.map((cell, i) => ({ row: cell.row, col: cell.col, slots: slots[i] })),
  }
}
