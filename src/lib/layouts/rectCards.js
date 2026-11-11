// Geometry for "matching rectangular cards NxM" .fjsw templates.
//
// The simplest template found: no tiling puzzle at all, just two columns
// of independent matching cards (question card, answer card) — confirmed
// by inspecting real content (word problems / equations / flowchart forms
// all appearing as plain left/right matching pairs with no chain and no
// shared edges). Scales with pairCount, so this is a generator rather
// than static data.

export function buildRectCardsLayout(pairCount) {
  const rows = []
  for (let k = 1; k <= pairCount; k++) {
    rows.push({ left: `${k}q`, right: `${k}a` })
  }
  return {
    layoutId: `rect-cards-${pairCount}`,
    shape: 'rect-cards',
    pairCount,
    matchedPairCount: pairCount,
    rows,
  }
}
