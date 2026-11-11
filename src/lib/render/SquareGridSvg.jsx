import { resolveSlot } from '../resolveSlot'
import { fitText } from './fitText'
import { FONT_FAMILY } from './font'

// Renders a square-grid layout (square-24) as SVG: a grid of square pieces,
// each carrying a label on up to four edges.
//
// Large user units for the same reason as the other renderers — see the note
// in TriangleGridSvg about glyph hinting and measured vs drawn width.
export const SQ = 700
const STROKE_WIDTH = SQ / 70
const VIEWBOX_PADDING = SQ / 7

const LINE_HEIGHT = 1.15
const BASE_FONT = 70

// How far a label's first line sits in from its own edge.
const ANCHOR_DEPTH = SQ * 0.12

// Room available to the k-th line of an edge label.
//
// A square's four labels compete for the corners, so the usable width is not
// the full side: think of the cell divided by its diagonals into four
// triangles, one per edge. At depth d from an edge, that edge's own wedge is
// only (SQ - 2d) wide, and a wrapped label's later lines sit deeper in and
// get less — the same narrowing the triangle renderer deals with, for the
// same reason.
const usableWidth = (k) => {
  const depth = ANCHOR_DEPTH + k * BASE_FONT * LINE_HEIGHT
  return Math.max(SQ * 0.15, (SQ - 2 * depth) * 0.9)
}

const FIT_OPTS = {
  fontFamily: FONT_FAMILY,
  usableWidth,
  maxHeight: SQ * 0.4, // never let a label reach past the cell's middle
  baseFontSize: BASE_FONT,
  comfortFontSize: BASE_FONT * 0.8,
  minFontSize: BASE_FONT * 0.5,
  lineHeight: LINE_HEIGHT,
  maxLines: 3,
}

// One entry per slot, in the layout's [top, right, bottom, left] order.
//
// `angle` turns each label to run along its own edge; -90 on both vertical
// edges keeps them parallel and reading the same way up rather than mirrored.
// `inward` is the sign that makes the text frame's +y point into the cell,
// so wrapped lines stack towards the middle instead of off the piece.
export const SQUARE_SLOTS = [
  { x: SQ / 2, y: ANCHOR_DEPTH, angle: 0, inward: 1 },
  { x: SQ - ANCHOR_DEPTH, y: SQ / 2, angle: -90, inward: -1 },
  { x: SQ / 2, y: SQ - ANCHOR_DEPTH, angle: 0, inward: -1 },
  { x: ANCHOR_DEPTH, y: SQ / 2, angle: -90, inward: 1 },
]

// Labels always run along their own edge, and therefore turn with the piece
// when one is rotated on a cut-out sheet. An earlier version took a
// `cellRotate` and subtracted it here, "keeping labels upright" — which in
// fact pinned each label to a fixed angle on the page while the edge it
// belongs to turned underneath it, so labels ended up lying across their edge
// and spilling off the piece.
export function SquareCellLabels({ slots, pairs }) {
  return slots.map((code, i) => {
    const text = resolveSlot(code, pairs)
    if (!text) return null
    const { x, y, angle, inward } = SQUARE_SLOTS[i]
    const { lines, fontSize } = fitText(text, FIT_OPTS)
    const step = fontSize * LINE_HEIGHT * inward
    return (
      <text
        key={i}
        x={x}
        y={y}
        fontSize={fontSize}
        fontFamily={FONT_FAMILY}
        textAnchor="middle"
        dominantBaseline="middle"
        transform={`rotate(${angle} ${x},${y})`}
        style={{ fill: '#111', textRendering: 'geometricPrecision', letterSpacing: 'normal' }}
      >
        {lines.map((line, k) => (
          <tspan key={k} x={x} y={y + k * step}>
            {line}
          </tspan>
        ))}
      </text>
    )
  })
}

export const SQUARE_STYLE = { fill: 'white', stroke: '#333', strokeWidth: STROKE_WIDTH }

export default function SquareGridSvg({ layout, pairs }) {
  const width = layout.colCount * SQ
  const height = layout.rowCount * SQ

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${-VIEWBOX_PADDING} ${-VIEWBOX_PADDING} ${width + 2 * VIEWBOX_PADDING} ${height + 2 * VIEWBOX_PADDING}`}
      style={{ width: '100%', height: 'auto' }}
    >
      {layout.cells.map((cell, i) => (
        <g key={i} transform={`translate(${(cell.col - 1) * SQ},${(cell.row - 1) * SQ})`}>
          <rect width={SQ} height={SQ} style={SQUARE_STYLE} />
          <SquareCellLabels slots={cell.slots} pairs={pairs} />
        </g>
      ))}
    </svg>
  )
}
