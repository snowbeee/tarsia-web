import { resolveSlot } from '../resolveSlot'
import { fitText } from './fitText'
import { FONT_FAMILY } from './font'

// Renders the rect-cards layout as a plain two-column grid of matching
// cards (no chain, no shared edges — the simplest layout).
//
// Laid out in large user units for the same reason as TriangleGridSvg: glyph
// advances get rounded up by hinting at the size these actually draw at, so
// measuring at a small size under-predicts how wide text really is. Working
// at this scale (and rendering with `geometricPrecision`) keeps measured and
// drawn widths in agreement. The SVG scales to its container regardless.
const CARD_W = 2200
const CARD_H = 400
const GAP = 60
const STROKE_WIDTH = 10

const LINE_HEIGHT = 1.15

// Unlike a triangle edge, a card gives every line the same width — but it
// does impose a ceiling on total height, which a triangle doesn't.
const FIT_OPTS = {
  fontFamily: FONT_FAMILY,
  usableWidth: () => CARD_W * 0.9,
  maxHeight: CARD_H * 0.8,
  baseFontSize: 90,
  comfortFontSize: 72,
  minFontSize: 45,
  lineHeight: LINE_HEIGHT,
  maxLines: 3,
}

function CardText({ text, cx, cy }) {
  if (!text) return null
  const { lines, fontSize } = fitText(text, FIT_OPTS)
  const step = fontSize * LINE_HEIGHT
  // Centre the block of lines on the card's middle.
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

export default function RectCardsSvg({ layout, pairs }) {
  const width = 2 * CARD_W + 3 * GAP
  const height = layout.rows.length * (CARD_H + GAP) + GAP

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: 'auto' }}>
      {layout.rows.map((row, i) => {
        const y = GAP + i * (CARD_H + GAP)
        const leftX = GAP
        const rightX = 2 * GAP + CARD_W
        return (
          <g key={i}>
            <rect x={leftX} y={y} width={CARD_W} height={CARD_H} style={{ fill: 'white', stroke: '#333', strokeWidth: STROKE_WIDTH }} />
            <CardText text={resolveSlot(row.left, pairs)} cx={leftX + CARD_W / 2} cy={y + CARD_H / 2} />
            <rect x={rightX} y={y} width={CARD_W} height={CARD_H} style={{ fill: 'white', stroke: '#333', strokeWidth: STROKE_WIDTH }} />
            <CardText text={resolveSlot(row.right, pairs)} cx={rightX + CARD_W / 2} cy={y + CARD_H / 2} />
          </g>
        )
      })}
    </svg>
  )
}
