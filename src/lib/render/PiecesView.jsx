import { resolveSlot } from '../resolveSlot'
import { fitText } from './fitText'
import {
  SIDE,
  TRI_HEIGHT,
  TRI_A,
  TRI_B,
  TRI_C,
  TRI_SLOTS,
  STROKE_WIDTH,
  EdgeLabel,
} from './TriangleGridSvg'
import { buildPieces, scramblePieces, bestGrid, PAGE_AREAS } from '../pieces'
import { SQ, SquareCellLabels, SQUARE_STYLE } from './SquareGridSvg'
import { PolygonPiece, centreOf } from './PolygonTilingSvg'
import { FONT_FAMILY } from './font'

// Renders a puzzle as separate, scrambled pieces for cutting out.
//
// Geometry constants mirror the assembled renderers so a piece looks the same
// cut out as it does in the answer key — including the large user units the
// text fitting depends on (see the note in TriangleGridSvg).

const TEXT_STYLE = { fill: '#111', textRendering: 'geometricPrecision', letterSpacing: 'normal' }
const SHAPE_STYLE = { fill: 'white', stroke: '#333' }

// ---------------------------------------------------------------- triangles
//
// Geometry, fitting options and the label renderer all come from
// TriangleGridSvg rather than being restated here. They were duplicated once,
// which is exactly how the assembled puzzle and the cut-out sheet end up
// disagreeing: a fix to one silently leaves the other wrong.

// An equilateral triangle's circumdiameter — the space a piece needs once it
// may be rotated to any angle, so every cell in the grid can hold any piece.
//
// This only holds if the piece is rotated about its CIRCUMCENTRE, which for an
// equilateral triangle is the centroid (SIDE/2, TRI_HEIGHT/3) — not the centre
// of its bounding box. Rotating about the bounding-box centre swings the piece
// outside its cell and pieces then overlap on the sheet, which makes them
// impossible to cut out.
const TRI_CELL = (2 * SIDE) / Math.sqrt(3)
const TRI_PIVOT = [SIDE / 2, TRI_HEIGHT / 3]

function TrianglePiece({ piece, pairs }) {
  return (
    <g transform={`rotate(${piece.rotation} ${TRI_PIVOT[0]},${TRI_PIVOT[1]})`}>
      <polygon
        points={`${TRI_A[0]},${TRI_A[1]} ${TRI_B[0]},${TRI_B[1]} ${TRI_C[0]},${TRI_C[1]}`}
        style={{ ...SHAPE_STYLE, strokeWidth: STROKE_WIDTH }}
      />
      {piece.slots.map((code, i) => {
        const text = resolveSlot(code, pairs)
        if (!text) return null
        // cellRotate 0: labels deliberately turn with the piece rather than
        // being held upright. A cut-out piece has no inherent "up", and this
        // is what the desktop app prints.
        return <EdgeLabel key={i} text={text} slot={TRI_SLOTS[i]} cellRotate={0} />
      })}
    </g>
  )
}

// ------------------------------------------------------------ boxed pieces

function BoxedText({ text, cx, cy, boxW, boxH, baseFontSize }) {
  if (!text) return null
  const lineHeight = 1.15
  const { lines, fontSize } = fitText(text, {
    fontFamily: FONT_FAMILY,
    usableWidth: () => boxW * 0.88,
    maxHeight: boxH * 0.8,
    baseFontSize,
    comfortFontSize: baseFontSize * 0.8,
    minFontSize: baseFontSize * 0.5,
    lineHeight,
    maxLines: 3,
  })
  const step = fontSize * lineHeight
  const firstY = cy - ((lines.length - 1) * step) / 2
  return (
    <text x={cx} y={firstY} fontSize={fontSize} fontFamily={FONT_FAMILY} textAnchor="middle" dominantBaseline="middle" style={TEXT_STYLE}>
      {lines.map((line, k) => (
        <tspan key={k} x={cx} y={firstY + k * step}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

const DOM_W = 1200
const DOM_H = 500
const CARD_W = 2200
const CARD_H = 400

// ------------------------------------------------------------------ sheet

export default function PiecesView({ layout, pairs }) {
  // Each shape may only be turned by rotations that map it onto itself —
  // except a parquet, whose pieces are squares and triangles together, so no
  // one step does that for all of them. 30 degrees is still a rotation and
  // not a reflection, which is the part that matters: a mirrored piece would
  // not fit back into the puzzle, a turned one always does.
  const rotationStep = { triangle: 60, 'square-grid': 90, 'polygon-tiling': 30 }[layout.shape] ?? 0
  const pieces = scramblePieces(
    buildPieces(layout),
    layout.layoutId + '|' + pairs.map((p) => p.question).join('|'),
    rotationStep,
  )
  if (!pieces.length) return null

  // A parquet's pieces differ in size and sit at a mix of angles, so the cell
  // is sized by the widest piece's circumradius rather than by a shape
  // constant — big enough that any piece, at any rotation, stays inside it.
  const polyRadius =
    layout.shape === 'polygon-tiling'
      ? Math.max(
          ...pieces.map((piece) => {
            const c = centreOf(piece.points)
            return Math.max(...piece.points.map((v) => Math.hypot(v[0] - c[0], v[1] - c[1])))
          }),
        )
      : 0

  const spec = {
    triangle: { w: TRI_CELL, h: TRI_CELL, gap: TRI_CELL * 0.08 },
    'polygon-tiling': { w: 2 * polyRadius, h: 2 * polyRadius, gap: polyRadius * 0.16 },
    'square-grid': { w: SQ, h: SQ, gap: SQ * 0.08 },
    'domino-chain': { w: DOM_W, h: DOM_H, gap: DOM_W * 0.05 },
    'rect-cards': { w: CARD_W, h: CARD_H, gap: CARD_W * 0.04 },
  }[layout.shape]
  if (!spec) return null

  const { cols, rows } = bestGrid(pieces.length, spec.w + spec.gap, spec.h + spec.gap, PAGE_AREAS)
  const width = cols * (spec.w + spec.gap) + spec.gap
  const height = rows * (spec.h + spec.gap) + spec.gap

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      {pieces.map((piece, i) => {
        const x = spec.gap + (i % cols) * (spec.w + spec.gap)
        const y = spec.gap + Math.floor(i / cols) * (spec.h + spec.gap)
        if (layout.shape === 'triangle') {
          // Put the piece's circumcentre at the cell's centre, so the piece
          // stays inside its own cell at every rotation.
          const ox = spec.w / 2 - TRI_PIVOT[0]
          const oy = spec.h / 2 - TRI_PIVOT[1]
          return (
            <g key={piece.id} transform={`translate(${x + ox},${y + oy})`}>
              <TrianglePiece piece={piece} pairs={pairs} />
            </g>
          )
        }
        if (layout.shape === 'polygon-tiling') {
          // Put the piece's own centre at the cell's centre, then turn it
          // about that same point so it cannot swing out of the cell.
          const c = centreOf(piece.points)
          return (
            <g
              key={piece.id}
              transform={`translate(${x + spec.w / 2 - c[0]},${y + spec.h / 2 - c[1]}) rotate(${piece.rotation} ${c[0]},${c[1]})`}
            >
              <PolygonPiece piece={piece} pairs={pairs} />
            </g>
          )
        }
        if (layout.shape === 'square-grid') {
          // Multiples of 90° keep the square axis-aligned, so its bounding
          // box never changes and the cell can be the piece's own size.
          return (
            <g key={piece.id} transform={`translate(${x},${y})`}>
              <g transform={`rotate(${piece.rotation} ${SQ / 2},${SQ / 2})`}>
                <rect width={SQ} height={SQ} style={SQUARE_STYLE} />
                <SquareCellLabels slots={piece.slots} pairs={pairs} />
              </g>
            </g>
          )
        }
        if (layout.shape === 'domino-chain') {
          return (
            <g key={piece.id} transform={`translate(${x},${y})`}>
              <rect width={DOM_W} height={DOM_H} style={{ ...SHAPE_STYLE, strokeWidth: 10 }} />
              <line x1={DOM_W / 2} y1={0} x2={DOM_W / 2} y2={DOM_H} style={{ stroke: '#333', strokeWidth: 10 }} />
              <BoxedText text={resolveSlot(piece.left, pairs)} cx={DOM_W / 4} cy={DOM_H / 2} boxW={DOM_W / 2} boxH={DOM_H} baseFontSize={80} />
              <BoxedText text={resolveSlot(piece.right, pairs)} cx={(DOM_W * 3) / 4} cy={DOM_H / 2} boxW={DOM_W / 2} boxH={DOM_H} baseFontSize={80} />
            </g>
          )
        }
        return (
          <g key={piece.id} transform={`translate(${x},${y})`}>
            <rect width={CARD_W} height={CARD_H} style={{ ...SHAPE_STYLE, strokeWidth: 10 }} />
            <BoxedText text={resolveSlot(piece.code, pairs)} cx={CARD_W / 2} cy={CARD_H / 2} boxW={CARD_W} boxH={CARD_H} baseFontSize={90} />
          </g>
        )
      })}
    </svg>
  )
}
