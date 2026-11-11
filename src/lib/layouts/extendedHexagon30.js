import hexagon30 from './hexagon30'

// Geometry for the "extended hexagonal jigsaw 30" .fjsw template.
//
// This is the SAME 24-triangle hexagon as the standard version — same cells,
// same edges, same 30 question/answer pairs on the same 60 interior edges.
// The only difference is that the 12 outer border edges, left blank by the
// standard template, carry content too.
//
// Worked out from the files themselves rather than guessed. Every "extended"
// sample stores 42 <eqnpair> elements, and they are not 42 pairs: the first
// 30 hold two <math> blocks each (question + answer) and the last 12 hold a
// single <math> each. 30 pairs + 12 single values — and hexagon-30 has
// exactly 12 blank border slots. Verified against all four extended samples
// available.
//
// (An earlier version of this note also cited `option-id='input.paired.30'`
// in <gui-settings> as confirmation. That was wrong — surveyed across all 17
// samples the number is the input table's CURSOR POSITION, not a pair count:
// one 30-pair file records 1, another records 28, a 15-pair file records 12.
// It equals the count only when the author left the cursor on the last row.
// The conclusion above never rested on it.)
//
// So the 12 trailing singles are decoys on the puzzle's outer rim. In the
// standard version a blank edge tells a student "this one faces outwards";
// filling those edges takes that hint away.
//
// A single value is stored as an eqnpair with only a question, so the parser
// already yields { question: <value>, answer: '' } and a "31q".."42q" slot
// code resolves to it with no special casing.
//
// ASSUMPTION — which decoy lands on which border edge. The files give no
// ordering information, so these are assigned in cell order, reading the
// layout top-to-bottom and left-to-right. This cannot affect whether the
// puzzle works: a border edge belongs to exactly one triangle, so it is never
// matched against anything, and any assignment yields the same solvable
// puzzle with the same difficulty. Only the decoys' positions around the rim
// might differ from what the desktop app would print.
const FIRST_EXTRA_PAIR = 31

let extra = FIRST_EXTRA_PAIR
// The spread is load-bearing: these cells belong to hexagon30, and assigning
// into them in place (what no-map-spread suggests) would rewrite the standard
// layout's slots too. It runs once at module load for 24 cells, so the
// efficiency the rule protects is not in question here.
// oxlint-disable-next-line no-map-spread
const cells = hexagon30.cells.map((cell) => ({
  ...cell,
  slots: cell.slots.map((slot) => (slot === null ? `${extra++}q` : slot)),
}))

const extendedHexagon30 = {
  layoutId: 'extended-hexagon-30',
  shape: 'triangle',
  // 30 matched pairs plus 12 single decoys = the 42 eqnpairs these files hold.
  pairCount: 42,
  cells,
}

export default extendedHexagon30
