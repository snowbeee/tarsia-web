// Geometry for the "standard square jigsaw 24" .fjsw template.
//
// SHAPE — derived, and as solid as the evidence allows:
//
//   Every other template's name-number is its pair count (hexagonal 30 -> 30
//   pairs, triangular 18 -> 18, dominos 12 -> 12, parquet 15 -> 15, matching
//   rectangular cards 9x2 -> 9). So "square jigsaw 24" means 24 pairs, and 24
//   pairs need 24 shared edges. An m x n grid of squares has 2mn - m - n
//   internal edges; solving 2mn - m - n = 24 over the integers gives exactly
//   two grids, 1x25 and 4x4. A 1x25 strip is a chain, which is what the
//   `dominos` template already is, and "square jigsaw" describes a square
//   outline — so 4x4: 16 square pieces, 24 shared edges, 16 blank border
//   edges.
//
// NUMBERING — ours, and it matters less than it first appeared. Which pair
// sits on which shared edge is not recorded anywhere in the file, so the
// convention below was chosen here.
//
// An earlier version of this note claimed the choice decided whether the
// puzzle was solvable at all — that getting it wrong would put matching
// content on edges that aren't shared. That was wrong, and the code below
// already shows why: each pair is written as `q` on one cell's edge and `a`
// on the cell across that same edge, so the two sit on one physical edge by
// construction, whatever order the pairs are visited in. Checked: all 24.
//
// What the choice really affects is only whether a piece ends up where the
// desktop app would have put it. That still warrants the `verified: false`
// below, so that someone comparing this against a desktop-app printout is not
// surprised — but a teacher printing the worksheet and the answer key
// together gets a puzzle that works.
//
// The convention below mirrors how hexagon-30 numbers its edges — scan row by
// row, taking the edges within a row first, then the edges down to the next
// row. It is a guess at the desktop app's habit, and nothing more.
//
// To settle it, either a `.fjsw` of this template rendered by the desktop app
// (or a photo of one printed) to compare against, or a fully-populated sample
// whose content makes the adjacencies self-evident.
//
// ALSO UNEXPLAINED: the one sample available stores 25 <eqnpair> elements,
// not 24 — 8 filled and 17 completely empty. Every other template stores
// exactly its name-number. A 25th pair is ignored here. The sample was
// clearly abandoned mid-edit (its gui-settings put the cursor on row 9), so a
// stray trailing row is plausible, but one partly-filled sample can't confirm
// that.

const ROWS = 4
const COLS = 4

// Slots run clockwise from the top: [top, right, bottom, left].
const TOP = 0
const RIGHT = 1
const BOTTOM = 2
const LEFT = 3

const grid = []
for (let row = 1; row <= ROWS; row++) {
  for (let col = 1; col <= COLS; col++) {
    grid.push({ row, col, slots: [null, null, null, null] })
  }
}
const at = (row, col) => grid[(row - 1) * COLS + (col - 1)]

let pair = 1
for (let row = 1; row <= ROWS; row++) {
  // Edges within this row: each is shared by two horizontally adjacent cells.
  for (let col = 1; col < COLS; col++) {
    at(row, col).slots[RIGHT] = `${pair}q`
    at(row, col + 1).slots[LEFT] = `${pair}a`
    pair++
  }
  // Then the edges down to the next row.
  if (row < ROWS) {
    for (let col = 1; col <= COLS; col++) {
      at(row, col).slots[BOTTOM] = `${pair}q`
      at(row + 1, col).slots[TOP] = `${pair}a`
      pair++
    }
  }
}

const squareGrid24 = {
  layoutId: 'square-24',
  shape: 'square-grid',
  pairCount: pair - 1, // 24 by construction
  // Named rowCount/colCount, not rows/cols: `rows` on a rect-cards layout is
  // an array of rows, and a number under the same name invites code that
  // works for one shape and throws for the other.
  rowCount: ROWS,
  colCount: COLS,
  // Consumed by the app to warn that this render may not be trustworthy.
  verified: false,
  unverifiedReason:
    "The 4x4 shape is derived, and which pair sits on which edge is this app's own choice — no reference rendering of this template exists to check against. The puzzle does solve: every answer is on its own question's edge. It may simply be arranged differently from the way the desktop app would print it.",
  cells: grid,
}

export default squareGrid24
