// Geometry for "dominos N" .fjsw templates.
//
// Derived (not ported) from analysing real sample files: every dominoes
// file we've seen stores (N-1) real content pairs followed by exactly one
// literal sentinel pair ("Start", "Finish"). That matches a linear chain
// of N domino tiles:
//
//   tile 1:  [ START | 1q ]
//   tile 2:  [ 1a    | 2q ]
//   tile 3:  [ 2a    | 3q ]
//   ...
//   tile N:  [ (N-1)a | FINISH ]
//
// i.e. each tile's right half is "the next pair's question" and its left
// half is "the previous pair's answer" — the sentinel pair supplies the
// literal Start/Finish text for the two chain ends. This was verified
// against two independent sample files, both ending in the exact same
// ("Start","Finish") sentinel pair.
//
// Unlike the hexagon/triangle layouts, this isn't one fixed piece count —
// it scales with however many pairs the file actually has — so it's a
// generator function rather than static data.

export function buildDominoChainLayout(pairCount) {
  const tiles = []
  for (let k = 1; k <= pairCount; k++) {
    const left = k === 1 ? 'START' : `${k - 1}a`
    const right = k === pairCount ? 'FINISH' : `${k}q`
    tiles.push({ left, right })
  }
  return {
    layoutId: `dominoes-${pairCount}`,
    shape: 'domino-chain',
    pairCount,
    // The chain's two ends carry Start/Finish rather than content, so N tiles
    // hold N-1 questions. Kept distinct from pairCount, which is how many
    // eqnpairs the file stores (sentinel included).
    matchedPairCount: Math.max(0, pairCount - 1),
    tiles,
  }
}
