// Geometry for the "standard hexagonal jigsaw 30" .fjsw template:
// 24 equilateral triangles tiled into an overall hexagon outline,
// 30 question/answer pairs (60 labelled edges, 12 blank border edges).
//
// Ported from the MIT-licensed tarsia-generator project's hexGrid.js
// (https://github.com/PeterGrahamJersey/tarsia-generator), which we
// validated by rendering one of the user's real .fjsw files against it —
// it produced a correctly-formed hexagon on the first try.
//
// Each cell is one triangle. `row`/`col` place it on a half-step grid
// (see render/TriangleGridSvg.jsx for how that becomes pixel coordinates
// and up/down orientation). `slots` is ordered
//   [horizontal edge, left-slanted edge, right-slanted edge]
// in the cell's own unrotated frame (before the 180° flip applied to "up"
// cells). A slot is either null (blank border edge) or a code like
// "5q"/"5a" meaning "question/answer of pair 5" — resolved against a
// puzzle's `pairs` list at render time.
//
// That slot order is load-bearing: it's what puts each question on the same
// shared edge as its answer. Under this order all 30 pairs match up exactly;
// under any other permutation most questions end up on a different edge from
// their answer, which still draws a correct-looking hexagon but yields an
// unsolvable puzzle.

const hexagon30 = {
  layoutId: 'hexagon-30',
  shape: 'triangle',
  pairCount: 30,
  cells: [
    { row: 1, col: 2, slots: ['5q', '1q', null] },
    { row: 1, col: 3, slots: [null, '1a', '2q'] },
    { row: 1, col: 4, slots: ['6q', '3q', '2a'] },
    { row: 1, col: 5, slots: [null, '3a', '4q'] },
    { row: 1, col: 6, slots: ['7q', null, '4a'] },
    { row: 2, col: 1, slots: ['14q', '8q', null] },
    { row: 2, col: 2, slots: ['5a', '8a', '9q'] },
    { row: 2, col: 3, slots: ['15q', '10q', '9a'] },
    { row: 2, col: 4, slots: ['6a', '10a', '11q'] },
    { row: 2, col: 5, slots: ['16q', '12q', '11a'] },
    { row: 2, col: 6, slots: ['7a', '12a', '13q'] },
    { row: 2, col: 7, slots: ['17q', null, '13a'] },
    { row: 3, col: 1, slots: ['14a', null, '18q'] },
    { row: 3, col: 2, slots: ['24q', '19q', '18a'] },
    { row: 3, col: 3, slots: ['15a', '19a', '20q'] },
    { row: 3, col: 4, slots: ['25q', '21q', '20a'] },
    { row: 3, col: 5, slots: ['16a', '21a', '22q'] },
    { row: 3, col: 6, slots: ['26q', '23q', '22a'] },
    { row: 3, col: 7, slots: ['17a', '23a', null] },
    { row: 4, col: 2, slots: ['24a', null, '27q'] },
    { row: 4, col: 3, slots: [null, '28q', '27a'] },
    { row: 4, col: 4, slots: ['25a', '28a', '29q'] },
    { row: 4, col: 5, slots: [null, '30q', '29a'] },
    { row: 4, col: 6, slots: ['26a', '30a', null] },
  ],
}

export default hexagon30
