// Geometry for the "standard triangular jigsaw 18" .fjsw template:
// 16 equilateral triangles tiled into one large triangle outline,
// 18 question/answer pairs.
//
// Ported from the MIT-licensed tarsia-generator project's
// triangleGrid.js (https://github.com/PeterGrahamJersey/tarsia-generator).
//
// `slots` ordering is the same as hexagon30.js:
//   [horizontal edge, left-slanted edge, right-slanted edge]
// in the cell's own unrotated frame. See the note there — get it wrong and
// the puzzle looks right but doesn't solve. All 18 pairs match under this
// order.

const triangle18 = {
  layoutId: 'triangle-18',
  shape: 'triangle',
  pairCount: 18,
  cells: [
    { row: 1, col: 4, slots: ['1q', null, null] },
    { row: 2, col: 3, slots: ['4q', '2q', null] },
    { row: 2, col: 4, slots: ['1a', '2a', '3q'] },
    { row: 2, col: 5, slots: ['5q', null, '3a'] },
    { row: 3, col: 2, slots: ['10q', '6q', null] },
    { row: 3, col: 3, slots: ['4a', '6a', '7q'] },
    { row: 3, col: 4, slots: ['11q', '8q', '7a'] },
    { row: 3, col: 5, slots: ['5a', '8a', '9q'] },
    { row: 3, col: 6, slots: ['12q', null, '9a'] },
    { row: 4, col: 1, slots: [null, '13q', null] },
    { row: 4, col: 2, slots: ['10a', '13a', '14q'] },
    { row: 4, col: 3, slots: [null, '15q', '14a'] },
    { row: 4, col: 4, slots: ['11a', '15a', '16q'] },
    { row: 4, col: 5, slots: [null, '17q', '16a'] },
    { row: 4, col: 6, slots: ['12a', '17a', '18q'] },
    { row: 4, col: 7, slots: [null, null, '18a'] },
  ],
}

export default triangle18
