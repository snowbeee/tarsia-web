import { collectSlotCodes } from '../layouts'

// Getting a list of pairs in from somewhere else.
//
// Nobody invents thirty questions inside this app. They exist already, in a
// spreadsheet, a worksheet or last year's file, and typing them in one box at
// a time is the slowest part of making a puzzle — sixty fields for a
// thirty-pair hexagon.
//
// The parser is deliberately liberal: a spreadsheet gives tabs, a CSV gives
// commas, and a bare list gives neither. Guessing is only safe because
// nothing is applied until the reader has seen the result, so every guess is
// reported back and shown as a preview before it can touch the puzzle.

/**
 * Read pasted text as question/answer pairs.
 *
 * @returns {{pairs: {question: string, answer: string}[], separator: 'tab'|'comma'|'none', notes: string[]}}
 */
export function parsePastedPairs(text) {
  const lines = String(text)
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length === 0) return { pairs: [], separator: 'none', notes: [] }

  // A tab anywhere means this came out of a spreadsheet, which is the case
  // worth getting right. Commas are only considered when there are no tabs
  // AND every line has one, because a question may well contain a comma and
  // splitting a list of prose on the first one would be mangling, not parsing.
  const separator = lines.some((line) => line.includes('\t'))
    ? 'tab'
    : lines.every((line) => line.includes(','))
      ? 'comma'
      : 'none'

  const notes = []
  let wideLines = 0

  const pairs = lines.map((line) => {
    if (separator === 'tab') {
      const fields = line.split('\t').map((f) => f.trim())
      if (fields.filter(Boolean).length > 2) wideLines++
      return { question: fields[0] ?? '', answer: fields[1] ?? '' }
    }
    if (separator === 'comma') {
      const at = line.indexOf(',')
      return { question: line.slice(0, at).trim(), answer: line.slice(at + 1).trim() }
    }
    return { question: line, answer: '' }
  })

  if (separator === 'comma') {
    notes.push('No tabs found, so each line was split at its first comma.')
  }
  if (separator === 'none') {
    notes.push('No tabs or commas found, so each line was read as a question with no answer.')
  }
  if (wideLines > 0) {
    notes.push(
      `${wideLines} ${wideLines === 1 ? 'line has' : 'lines have'} more than two columns; only the first two were used.`,
    )
  }

  return { pairs: pairs.filter((p) => p.question || p.answer), separator, notes }
}

/**
 * Lay parsed pairs onto a puzzle's rows, in the order the editor shows them.
 *
 * Which rows those are is not simply "all of them": an extended hexagon's
 * outer-rim entries carry a decoy and no answer, and a domino chain's
 * sentinel is never shown at all. Filling by raw index would put a teacher's
 * answers into slots nothing draws. So this walks the same rows the editor
 * walks, and reports any answers it had to drop on the way.
 *
 * @returns {{pairs: object[], used: number, spare: number, droppedAnswers: number}}
 */
export function fillPairsFrom(pairs, layout, parsed) {
  const codes = collectSlotCodes(layout)
  const slots = pairs
    .map((pair, index) => ({ index, usesQuestion: codes.has(`${pair.n}q`), usesAnswer: codes.has(`${pair.n}a`) }))
    .filter((slot) => slot.usesQuestion || slot.usesAnswer)

  const next = pairs.map((pair) => ({ ...pair }))
  let droppedAnswers = 0

  slots.forEach((slot, i) => {
    const incoming = parsed[i]
    if (!incoming) return
    const target = next[slot.index]
    if (slot.usesQuestion) target.question = incoming.question
    if (slot.usesAnswer) target.answer = incoming.answer
    else if (incoming.answer) droppedAnswers++
  })

  return {
    pairs: next,
    used: Math.min(slots.length, parsed.length),
    spare: Math.max(0, parsed.length - slots.length),
    droppedAnswers,
  }
}
