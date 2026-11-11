// Resolves a layout's slot code (e.g. "5q", "5a", "START", "FINISH", or
// null) against a puzzle's parsed pairs list, returning the text to show.
export function resolveSlot(code, pairs) {
  if (!code) return ''
  if (code === 'START') return 'Start'
  if (code === 'FINISH') return 'Finish'

  const match = /^(\d+)(q|a)$/.exec(code)
  if (!match) return ''
  const [, nStr, qa] = match
  const n = parseInt(nStr, 10)
  const pair = pairs.find((p) => p.n === n)
  if (!pair) return ''
  return qa === 'q' ? pair.question : pair.answer
}
