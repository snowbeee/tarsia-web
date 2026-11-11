import hexagon30 from './hexagon30'
import extendedHexagon30 from './extendedHexagon30'
import parquet15 from './parquet15'
import squareGrid24 from './squareGrid24'
import triangle18 from './triangle18'
import { buildDominoChainLayout } from './dominoChain'
import { buildRectCardsLayout } from './rectCards'

// Every template seen in a real file is now drawn. Two carry `verified:
// false` — 'standard square jigsaw 24' and 'standard parquet jigsaw 15' —
// which means their pieces may not sit where the desktop app would put them.
// It does not mean they might not solve: in both, each answer is placed on
// its own question's edge by construction (see the note in each file).
// A template we've never seen still parses fine, since the .fjsw parser
// needs no layout information — see getLayoutForTemplate below.
export function getLayoutForTemplate(templateId, pairCount) {
  switch (templateId) {
    case 'standard hexagonal jigsaw 30':
      return hexagon30
    case 'extended hexagonal jigsaw 30':
      return extendedHexagon30
    case 'standard triangular jigsaw 18':
      return triangle18
    case 'standard square jigsaw 24':
      return squareGrid24
    case 'standard parquet jigsaw 15':
      return parquet15
    default:
      if (templateId && templateId.startsWith('dominos')) {
        return buildDominoChainLayout(pairCount)
      }
      if (templateId && templateId.startsWith('matching rectangular cards')) {
        return buildRectCardsLayout(pairCount)
      }
      return null // caller should treat this as "not yet supported"
  }
}

export const SUPPORTED_TEMPLATES = [
  'standard hexagonal jigsaw 30',
  'extended hexagonal jigsaw 30',
  'standard triangular jigsaw 18',
  'standard square jigsaw 24 (shape derived, arrangement unverified)',
  'standard parquet jigsaw 15 (shape reconstructed, arrangement unverified)',
  'dominos N (any size)',
  'matching rectangular cards NxM (any size)',
]

export const KNOWN_BUT_UNSUPPORTED_TEMPLATES = []

// Why a known template still isn't rendered. Empty at the moment — every
// template found in a real file is drawn. Kept because the next unfamiliar
// one should get an explanation rather than a shrug.
export const UNSUPPORTED_TEMPLATE_NOTES = {}

/**
 * Every slot code a layout actually references.
 *
 * The editor uses this to show only the fields that affect the puzzle. Which
 * fields those are is not simply "question and answer per pair": an extended
 * hexagon's last 12 entries are single border decoys with no answer, and a
 * domino chain's final pair is a Start/Finish sentinel the layout doesn't
 * reference at all. Offering an editable box that changes nothing is worse
 * than offering none.
 *
 * The Array.isArray guards matter — `rows` is an array of rows on a
 * rect-cards layout and a row count on a square grid.
 */
export function collectSlotCodes(layout) {
  const codes = new Set()
  const add = (code) => {
    if (code) codes.add(code)
  }
  if (Array.isArray(layout?.cells)) layout.cells.forEach((cell) => cell.slots.forEach(add))
  if (Array.isArray(layout?.tiles)) layout.tiles.forEach((tile) => { add(tile.left); add(tile.right) })
  if (Array.isArray(layout?.rows)) layout.rows.forEach((row) => { add(row.left); add(row.right) })
  if (Array.isArray(layout?.pieces)) layout.pieces.forEach((piece) => piece.slots.forEach(add))
  return codes
}

/**
 * How many numbered pairs a layout actually needs — the highest pair number
 * it places anywhere.
 *
 * Deliberately read off the slots rather than taken from `pairCount`, because
 * the two are not the same thing and the difference is shape-specific: a
 * domino chain of N tiles places only N-1 questions, and a border-filled
 * tiling places more entries than it has matched pairs. Asking the layout
 * what it draws avoids having to special-case that anywhere else.
 */
export function requiredPairCount(layout) {
  let highest = 0
  for (const code of collectSlotCodes(layout)) {
    const match = /^(\d+)[qa]$/.exec(code)
    if (match) highest = Math.max(highest, Number(match[1]))
  }
  return highest
}
