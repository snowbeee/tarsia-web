import {
  buildTriangleTilingLayout,
  buildSquareTilingLayout,
  triangleCells,
  hexagonCells,
} from '../layouts/tiling'
import { buildParquetLayout } from '../layouts/parquet15'
import { buildDominoChainLayout } from '../layouts/dominoChain'
import { buildRectCardsLayout } from '../layouts/rectCards'
import { requiredPairCount } from '../layouts'

// The shapes a puzzle can be created in.
//
// Deliberately wider than the set of .fjsw templates we can import. Importing
// has to reproduce whatever the desktop app decided; creating does not, so a
// shape is offered here as soon as it can be generated and drawn, at any size
// that fits on a page. The sizes that happen to coincide with a real template
// are called out, because a teacher who knows the desktop app will be looking
// for them.
//
// `size` values are strings so a spec survives a round trip through JSON and
// a <select> unchanged.

const SHAPES = [
  {
    key: 'triangle',
    label: 'Triangle',
    blurb: 'Small triangles tiled into one big triangle. The classic Tarsia.',
    hasBorder: true,
    sizes: ['2', '3', '4', '5', '6'],
    sizeLabel: (size) => `Side ${size}${size === '4' ? ' — the standard 18-pair puzzle' : ''}`,
    build: (size, fillBorder) =>
      buildTriangleTilingLayout(triangleCells(Number(size)), {
        layoutId: `built-triangle-${size}${fillBorder ? '-border' : ''}`,
        fillBorder,
      }),
  },
  {
    key: 'hexagon',
    label: 'Hexagon',
    blurb: 'The same small triangles, tiled into a hexagon instead.',
    hasBorder: true,
    sizes: ['1', '2', '3'],
    sizeLabel: (size) =>
      ({ 1: 'Small', 2: 'Medium — the standard 30-pair puzzle', 3: 'Large' })[size],
    build: (size, fillBorder) =>
      buildTriangleTilingLayout(hexagonCells(Number(size)), {
        layoutId: `built-hexagon-${size}${fillBorder ? '-border' : ''}`,
        fillBorder,
      }),
  },
  {
    key: 'square',
    label: 'Squares',
    blurb: 'A grid of squares, each edge matching its neighbour.',
    hasBorder: true,
    sizes: ['2x2', '3x3', '3x4', '4x4', '4x5', '5x5'],
    sizeLabel: (size) => `${size.replace('x', ' × ')}${size === '4x4' ? ' — the standard 24-pair puzzle' : ''}`,
    build: (size, fillBorder) => {
      const [rows, cols] = size.split('x').map(Number)
      return buildSquareTilingLayout(rows, cols, {
        layoutId: `built-square-${size}${fillBorder ? '-border' : ''}`,
        fillBorder,
      })
    },
  },
  {
    key: 'parquet',
    label: 'Parquet',
    blurb: 'Squares and triangles together in a rosette — the hardest of these to put back.',
    hasBorder: true,
    sizes: ['15'],
    sizeLabel: () => 'The standard 15-pair puzzle',
    build: (size, fillBorder) =>
      buildParquetLayout({ layoutId: `built-parquet${fillBorder ? '-border' : ''}`, fillBorder }),
  },
  {
    key: 'dominoes',
    label: 'Dominoes',
    blurb: 'A chain of tiles from Start to Finish — each answer next to the following question.',
    hasBorder: false,
    sizes: ['6', '8', '10', '12', '15', '20'],
    sizeLabel: (size) => `${size} questions`,
    // A chain of Q questions needs Q+1 tiles: the two ends carry the Start
    // and Finish labels rather than content.
    build: (size) => buildDominoChainLayout(Number(size) + 1),
  },
  {
    key: 'cards',
    label: 'Matching cards',
    blurb: 'No tiling at all — separate question and answer cards to pair up.',
    hasBorder: false,
    sizes: ['6', '8', '10', '12', '16', '20'],
    sizeLabel: (size) => `${size} pairs`,
    build: (size) => buildRectCardsLayout(Number(size)),
  },
]

export const BUILDER_SHAPES = SHAPES.map(({ key, label, blurb, hasBorder, sizes, sizeLabel }) => ({
  key,
  label,
  blurb,
  hasBorder,
  sizes: sizes.map((size) => ({ value: size, label: sizeLabel(size) })),
}))

export const DEFAULT_SPEC = { shape: 'hexagon', size: '2', fillBorder: false }

export function defaultSizeFor(shapeKey) {
  return { triangle: '4', hexagon: '2', square: '4x4', parquet: '15', dominoes: '10', cards: '10' }[shapeKey]
}

// Built layouts are cached because the picker asks for every size's piece and
// pair counts on each render, and because rebuilding would hand the renderers
// a new object identity on every keystroke in the editor.
const cache = new Map()

/**
 * Check a spec names a shape at a size this build offers, and return both.
 *
 * The size matters as much as the shape. A saved file asking for a triangle of
 * size "oops" used to build happily: Number('oops') is NaN, the tiling comes
 * out with no cells at all, and the renderer then derives an infinite viewBox
 * from an empty list — an unreadable failure, well after the file replaced
 * whatever the teacher had open. A size that is merely enormous is no better,
 * since the geometry is generated synchronously. So the size is checked
 * against the list actually offered, which is finite and small.
 *
 * Numbers are accepted where a string is expected ({ size: 4 }), because a
 * hand-edited file writing 4 rather than "4" means the same thing.
 */
function validateSpec(spec) {
  const shape = SHAPES.find((s) => s.key === spec?.shape)
  if (!shape) throw new Error(`Unknown puzzle shape: ${spec?.shape}`)

  const size = typeof spec.size === 'number' ? String(spec.size) : spec.size
  if (!shape.sizes.includes(size)) {
    throw new Error(`"${shape.label}" puzzles don't come in size "${spec.size}".`)
  }

  if (spec.fillBorder != null && typeof spec.fillBorder !== 'boolean') {
    throw new Error('The border setting must be true or false.')
  }

  return { shape, size }
}

export function buildLayoutFromSpec(spec) {
  const { shape, size } = validateSpec(spec)
  const fillBorder = Boolean(spec.fillBorder) && shape.hasBorder
  const key = `${shape.key}|${size}|${fillBorder ? 'b' : ''}`
  const hit = cache.get(key)
  if (hit) return hit
  const layout = shape.build(size, fillBorder)
  cache.set(key, layout)
  return layout
}

/** Piece and pair counts, for describing a shape before it is chosen. */
export function summarise(layout) {
  // One branch per way a layout names its pieces: grid cells, explicit
  // polygons, domino tiles, or card rows — which are two cards each.
  const pieces =
    layout.cells?.length ??
    layout.pieces?.length ??
    layout.tiles?.length ??
    (layout.rows?.length ?? 0) * 2
  const matched = layout.matchedPairCount ?? layout.pairCount
  // Decoys are counted as "entries to fill in, beyond the matched pairs", not
  // as pairCount - matched. On a domino chain those differ: its pairCount
  // includes the Start/Finish sentinel, which is nothing for anyone to type.
  return { pieces, matched, decoys: requiredPairCount(layout) - matched }
}
