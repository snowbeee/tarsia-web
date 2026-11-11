import { resolveSlot } from '../resolveSlot'
import { fitText } from './fitText'
import { bestGrid, PAGE_AREAS } from '../pieces'
import { FONT_FAMILY } from './font'

// Renders a domino-chain layout as a row of two-halved rectangular tiles.
//
// Laid out in large user units for the same reason as the other renderers:
// glyph advances are rounded up by hinting at the size these actually draw
// at, so measuring at a small font size under-predicts how wide text really
// is. Working at this scale (and rendering with `geometricPrecision`) keeps
// measured and drawn widths in agreement. The SVG scales to its container
// regardless, so this changes nothing visually.
const TILE_W = 1200
const TILE_H = 500
const GAP = 40
const STROKE_WIDTH = 10

const LINE_HEIGHT = 1.15

// Each label gets one half of a tile — a fixed width, unlike a triangle edge,
// but with a height ceiling the triangles don't have.
const FIT_OPTS = {
  fontFamily: FONT_FAMILY,
  usableWidth: () => (TILE_W / 2) * 0.88,
  maxHeight: TILE_H * 0.8,
  baseFontSize: 80,
  comfortFontSize: 64,
  minFontSize: 40,
  lineHeight: LINE_HEIGHT,
  maxLines: 3,
}

function HalfTileText({ text, cx, cy }) {
  if (!text) return null
  const { lines, fontSize } = fitText(text, FIT_OPTS)
  const step = fontSize * LINE_HEIGHT
  const firstY = cy - ((lines.length - 1) * step) / 2

  return (
    <text
      x={cx}
      y={firstY}
      fontSize={fontSize}
      fontFamily={FONT_FAMILY}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{ fill: '#111', textRendering: 'geometricPrecision', letterSpacing: 'normal' }}
    >
      {lines.map((line, k) => (
        <tspan key={k} x={cx} y={firstY + k * step}>
          {line}
        </tspan>
      ))}
    </text>
  )
}

export default function DominoChainSvg({ layout, pairs }) {
  // A zero-height viewBox is not a valid drawing, and a chain of no tiles is
  // nothing to draw anyway.
  if (!layout.tiles.length) return null

  // The chain wraps onto several rows to fit a page, and how many columns
  // that should be depends on how long the chain is. This used to be a flat
  // 4 regardless: fine for the 12-tile chains in the samples, wrong for any
  // other length, and even for 12 it left the tiles smaller than they needed
  // to be. Choosing the grid that maximises the printed tile size — the same
  // way the cut-out sheet does — gives 2 columns and ~90mm tiles for a
  // 12-chain, against 4 columns and ~66mm before.
  //
  // Reading order is unaffected: the chain still runs left to right along
  // each row and then down, so tile N is always followed by tile N+1.
  const { cols } = bestGrid(layout.tiles.length, TILE_W + GAP, TILE_H + GAP, PAGE_AREAS)
  const width = cols * (TILE_W + GAP)
  const rowsNeeded = Math.ceil(layout.tiles.length / cols)
  const height = rowsNeeded * (TILE_H + GAP)

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      {layout.tiles.map((tile, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = col * (TILE_W + GAP)
        const y = row * (TILE_H + GAP)
        return (
          <g key={i} transform={`translate(${x},${y})`}>
            <rect width={TILE_W} height={TILE_H} style={{ fill: 'white', stroke: '#333', strokeWidth: STROKE_WIDTH }} />
            <line x1={TILE_W / 2} y1={0} x2={TILE_W / 2} y2={TILE_H} style={{ stroke: '#333', strokeWidth: STROKE_WIDTH }} />
            <HalfTileText text={resolveSlot(tile.left, pairs)} cx={TILE_W / 4} cy={TILE_H / 2} />
            <HalfTileText text={resolveSlot(tile.right, pairs)} cx={(TILE_W * 3) / 4} cy={TILE_H / 2} />
          </g>
        )
      })}
    </svg>
  )
}
