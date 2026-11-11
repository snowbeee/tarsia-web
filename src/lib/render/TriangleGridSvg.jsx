import { resolveSlot } from '../resolveSlot'
import { fitEdgeLabel } from './fitText'
import { FONT_FAMILY } from './font'

// Renders a triangle-tiling layout (hexagon-30, triangle-18, ...) as SVG.
// Placement/rotation approach adapted from the MIT-licensed
// tarsia-generator project (github.com/PeterGrahamJersey/tarsia-generator):
// triangles alternate "up"/"down" orientation based on (row+col) parity,
// positioned on a half-step column grid so adjacent triangles share edges.
//
// A layout cell's `slots` are ordered
//   [horizontal edge, left-slanted edge, right-slanted edge]
// in the cell's own unrotated frame. Getting that order wrong still draws a
// correctly-shaped puzzle, so it fails silently — but every question ends up
// on a different edge from its answer and the printed puzzle can't be solved.
// The invariant: for every pair N, "Nq" and "Na" must land on the same
// physical edge. Verified holding for all 30 pairs of hexagon-30 and all 18
// of triangle-18.
// Laid out in deliberately large user units, which together with the
// `geometricPrecision` text rendering on each label is what makes measuring a
// label's width actually predict how wide it draws.
//
// Two separate effects are at work. Labels are drawn small on screen (a
// 30-triangle puzzle in a few hundred pixels), and at that size glyph
// advances get rounded up by hinting — so the text draws wider per em than
// ideal font metrics say, by ~11% here. `geometricPrecision` opts out of that
// and gets ideal advances regardless of how far the SVG is scaled down, which
// also makes the result independent of the container width. Separately, the
// offscreen element that measures labels is NOT scaled, so it only reports
// ideal metrics when measuring at a size clear of the hinted range — hence
// laying the grid out at 700 units a side and measuring at font size 70
// rather than 70 and 7. Measured and drawn widths then agree to within 0.5%.
export const SIDE = 700
export const TRI_HEIGHT = (SIDE * Math.sqrt(3)) / 2
const HEIGHT = TRI_HEIGHT
export const STROKE_WIDTH = SIDE / 70
const VIEWBOX_PADDING = SIDE / 7

// Unrotated cell: A and B are the ends of the horizontal edge, C the apex.
export const TRI_A = [0, 0]
const A = TRI_A
export const TRI_B = [SIDE, 0]
const B = TRI_B
export const TRI_C = [SIDE / 2, HEIGHT]
const C = TRI_C
const CENTROID = [SIDE / 2, HEIGHT / 3]

export const BASE_FONT_SIZE = 62
export const LINE_HEIGHT = 1.05

// How far a label sits in from the edge it belongs to.
//
// This is derived rather than picked, because the two things it has to clear
// are the label's own height and the drawn edge itself. A label is centred on
// its anchor (dominantBaseline="middle"), so half its line box hangs towards
// the edge, and the stroke covers another half-width on the inside.
//
// It used to be a flat 0.22 of the distance to the centroid — 44.5 units —
// against a line box ~82 units tall. That left 3.5 units, less than the
// stroke's own 5, so glyphs sat right on the edge line: measured on an
// exported A4 PDF, 22 of 48 labels came within 0.08mm of the drawn line.
// 0.6 em is the average measured line-box half-height, but glyphs with tall
// extents — brackets, fractions like (3)/(2) — box noticeably taller, so the
// clearance below has to absorb that rather than sit on the average.
const LABEL_HALF_HEIGHT = BASE_FONT_SIZE * 0.6
const LABEL_CLEARANCE = SIDE * 0.022 // ~1mm once printed at A4
const ANCHOR_DEPTH = LABEL_HALF_HEIGHT + STROKE_WIDTH / 2 + LABEL_CLEARANCE

// The centroid is HEIGHT/3 from every edge, so one fraction of the way to it
// gives the same perpendicular depth whichever edge a label belongs to.
const EDGE_INSET = ANCHOR_DEPTH / (HEIGHT / 3)

export const TRI_FIT_OPTS = {
  side: SIDE,
  // Where this edge's own territory closes to a point — the centroid, at
  // HEIGHT/3, not the opposite vertex at HEIGHT. See fitEdgeLabel.
  apexDepth: HEIGHT / 3,
  anchorDepth: ANCHOR_DEPTH,
  fontFamily: FONT_FAMILY,
  baseFontSize: BASE_FONT_SIZE,
  comfortFontSize: BASE_FONT_SIZE * 0.8,
  minFontSize: BASE_FONT_SIZE * 0.5,
  lineHeight: LINE_HEIGHT,
  maxLines: 3,
  // The territory bound in fitEdgeLabel is evaluated at each line's CENTRE
  // depth, but the line box extends about 37 units deeper, where the
  // territory has already narrowed. This factor absorbs that rather than
  // being a general fudge — it was raised until collisions reappeared: 0.85
  // is clean across every sample here, 0.88 puts two labels back in contact
  // on the longest-content file.
  widthSafety: 0.85,
}

function anchorForEdge(p, q) {
  const mx = (p[0] + q[0]) / 2
  const my = (p[1] + q[1]) / 2
  return {
    x: mx + (CENTROID[0] - mx) * EDGE_INSET,
    y: my + (CENTROID[1] - my) * EDGE_INSET,
  }
}

// One entry per slot, in the same order as the layouts' `slots` arrays.
//
// `angle` turns the label to run along its own edge instead of horizontally —
// without it a label is only as wide as its text, but pointing the wrong way,
// so on the two slanted edges it runs straight across the neighbouring
// triangles. Angles stay within ±90° so nothing renders upside down.
//
// `inward` is the sign that makes the text frame's +y point into the triangle
// once rotated by `angle`, so wrapped lines stack inwards rather than out.
//
// It holds for "down" cells only and flips for "up" ones: the counter-rotation
// in EdgeLabel cancels the group's 180° flip for the text, so a line's offset
// direction is unchanged, but the triangle underneath it really is flipped.
// Hence the orientation factor where this is used.
export const TRI_SLOTS = [
  { ...anchorForEdge(A, B), angle: 0, inward: 1 },    // horizontal edge
  { ...anchorForEdge(A, C), angle: 60, inward: -1 },  // left-slanted edge
  { ...anchorForEdge(B, C), angle: -60, inward: -1 }, // right-slanted edge
]

export function EdgeLabel({ text, slot, cellRotate }) {
  const { x, y, angle, inward } = slot
  const { lines, fontSize } = fitEdgeLabel(text, TRI_FIT_OPTS)
  const step = fontSize * LINE_HEIGHT * inward * (cellRotate === 180 ? -1 : 1)

  return (
    <text
      x={x}
      y={y}
      fontSize={fontSize}
      fontFamily={FONT_FAMILY}
      textAnchor="middle"
      dominantBaseline="middle"
      // Run along the edge, then undo the cell's own flip so "up" cells read
      // the same way up as "down" ones.
      transform={`rotate(${angle - cellRotate} ${x},${y})`}
      style={{ fill: '#111', textRendering: 'geometricPrecision', letterSpacing: 'normal' }}
    >
      {lines.map((line, k) => (
        <tspan key={k} x={x} y={y + k * step}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

function TriangleCell({ row, col, slots, pairs }) {
  const orientation = (col + row) % 2 === 0 ? 'down' : 'up'
  const rotate = orientation === 'up' ? 180 : 0
  const tx = ((col - 1) * SIDE) / 2
  const ty = (row - 1) * HEIGHT

  return (
    <g transform={`translate(${tx},${ty}) rotate(${rotate} ${SIDE / 2},${HEIGHT / 2})`}>
      <polygon
        points={`${A[0]},${A[1]} ${B[0]},${B[1]} ${C[0]},${C[1]}`}
        style={{ fill: 'white', stroke: '#333', strokeWidth: STROKE_WIDTH }}
      />
      {slots.map((code, i) => {
        const text = resolveSlot(code, pairs)
        if (!text) return null
        return <EdgeLabel key={i} text={text} slot={TRI_SLOTS[i]} cellRotate={rotate} />
      })}
    </g>
  )
}

// The drawing's extent, from the cells themselves.
//
// Whichever way a cell points, it spans half-columns col-1..col+1 and rows
// row-1..row, so the bounds follow from the smallest and largest of each.
// Taking the minimum matters as well as the maximum: a generated triangle of
// odd side starts at column 2, because its bottom-left piece has to point the
// same way as the whole triangle and that fixes the parity. Assuming column 1
// left half a triangle of empty space down one side.
function extentOf(cells) {
  const cols = cells.map((c) => c.col)
  const rows = cells.map((c) => c.row)
  const minCol = Math.min(...cols)
  const minRow = Math.min(...rows)
  return {
    x: ((minCol - 1) * SIDE) / 2,
    y: (minRow - 1) * HEIGHT,
    width: ((Math.max(...cols) - minCol + 2) * SIDE) / 2,
    height: (Math.max(...rows) - minRow + 1) * HEIGHT,
  }
}

export default function TriangleGridSvg({ layout, pairs }) {
  const { x, y, width, height } = extentOf(layout.cells)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${x - VIEWBOX_PADDING} ${y - VIEWBOX_PADDING} ${width + 2 * VIEWBOX_PADDING} ${height + 2 * VIEWBOX_PADDING}`}
      style={{ width: '100%', height: 'auto' }}
    >
      {layout.cells.map((cell, i) => (
        <TriangleCell key={i} row={cell.row} col={cell.col} slots={cell.slots} pairs={pairs} />
      ))}
    </svg>
  )
}
