import { resolveSlot } from '../resolveSlot'
import { fitEdgeLabel } from './fitText'
import { PARQUET_SIDE } from '../layouts/parquet15'
import { FONT_FAMILY } from './font'

// Renders a tiling whose pieces are arbitrary convex polygons, given as
// explicit coordinates — the parquet rosette, where squares and triangles sit
// at a mix of angles and no row/column grid describes them.
//
// The triangle and square renderers each bake in one shape's geometry, which
// is what lets them be fast and exact. This one derives everything per edge
// instead: where the label sits, which way it runs, and how much room it has.
// Large drawing units for the same reason as the others — see the note on
// SIDE in TriangleGridSvg about glyph hinting and measured vs drawn width.

const STROKE_WIDTH = PARQUET_SIDE / 70
const VIEWBOX_PADDING = PARQUET_SIDE / 7
const BASE_FONT_SIZE = 62
const LINE_HEIGHT = 1.05

// Matches the triangle renderer's derivation: half a line box, half the
// stroke, and ~1mm of printed clearance.
const ANCHOR_DEPTH = BASE_FONT_SIZE * 0.6 + STROKE_WIDTH / 2 + PARQUET_SIDE * 0.022

export const POLYGON_STYLE = { fill: 'white', stroke: '#333', strokeWidth: STROKE_WIDTH }
const TEXT_STYLE = { fill: '#111', textRendering: 'geometricPrecision', letterSpacing: 'normal' }

const FIT_OPTS = {
  fontFamily: FONT_FAMILY,
  anchorDepth: ANCHOR_DEPTH,
  baseFontSize: BASE_FONT_SIZE,
  comfortFontSize: BASE_FONT_SIZE * 0.8,
  minFontSize: BASE_FONT_SIZE * 0.5,
  lineHeight: LINE_HEIGHT,
  maxLines: 3,
  widthSafety: 0.85,
}

/**
 * The piece's middle.
 *
 * Averaging the vertices is the centroid only for shapes whose vertices are
 * evenly spread — which every piece in a parquet is, being a square or an
 * equilateral triangle. It is also the circumcentre for both, which is what
 * lets a piece be rotated on the cut-out sheet without leaving its cell.
 */
export function centreOf(points) {
  const n = points.length
  return [
    points.reduce((sum, p) => sum + p[0], 0) / n,
    points.reduce((sum, p) => sum + p[1], 0) / n,
  ]
}

export function PolygonLabels({ points, slots, pairs }) {
  const centre = centreOf(points)

  return slots.map((code, i) => {
    const text = resolveSlot(code, pairs)
    if (!text) return null

    const p = points[i]
    const q = points[(i + 1) % points.length]
    const mid = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2]
    const edgeLength = Math.hypot(q[0] - p[0], q[1] - p[1])

    // The inward perpendicular, and how far the piece's middle is from this
    // edge along it. That distance is the edge's `apexDepth`: the point where
    // its share of the piece closes up, exactly as for a triangle's centroid
    // or a square's centre. Deriving it per edge is what makes one renderer
    // correct for both shapes.
    const dx = (q[0] - p[0]) / edgeLength
    const dy = (q[1] - p[1]) / edgeLength
    let normal = [-dy, dx]
    const toCentre = [centre[0] - mid[0], centre[1] - mid[1]]
    if (normal[0] * toCentre[0] + normal[1] * toCentre[1] < 0) normal = [dy, -dx]
    const apexDepth = normal[0] * toCentre[0] + normal[1] * toCentre[1]

    const x = mid[0] + normal[0] * ANCHOR_DEPTH
    const y = mid[1] + normal[1] * ANCHOR_DEPTH

    // Run along the edge, but never upside down.
    let angle = (Math.atan2(dy, dx) * 180) / Math.PI
    if (angle > 90) angle -= 180
    if (angle <= -90) angle += 180

    const { lines, fontSize } = fitEdgeLabel(text, { ...FIT_OPTS, side: edgeLength, apexDepth })

    // Wrapped lines have to stack into the piece, not off it. An SVG rotation
    // by `angle` sends the text frame's +y to (-sin, cos), so the sign that
    // points that along the inward normal is the one to step by.
    const radians = (angle * Math.PI) / 180
    const framePlusY = [-Math.sin(radians), Math.cos(radians)]
    const inward = framePlusY[0] * normal[0] + framePlusY[1] * normal[1] >= 0 ? 1 : -1
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
        style={TEXT_STYLE}
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

export function PolygonPiece({ piece, pairs }) {
  return (
    <>
      <polygon points={piece.points.map((p) => p.join(',')).join(' ')} style={POLYGON_STYLE} />
      <PolygonLabels points={piece.points} slots={piece.slots} pairs={pairs} />
    </>
  )
}

export function polygonExtent(pieces) {
  const xs = pieces.flatMap((piece) => piece.points.map((p) => p[0]))
  const ys = pieces.flatMap((piece) => piece.points.map((p) => p[1]))
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

export default function PolygonTilingSvg({ layout, pairs }) {
  const { x, y, width, height } = polygonExtent(layout.pieces)

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${x - VIEWBOX_PADDING} ${y - VIEWBOX_PADDING} ${width + 2 * VIEWBOX_PADDING} ${height + 2 * VIEWBOX_PADDING}`}
      style={{ width: '100%', height: 'auto' }}
    >
      {layout.pieces.map((piece, i) => (
        <PolygonPiece key={i} piece={piece} pairs={pairs} />
      ))}
    </svg>
  )
}
