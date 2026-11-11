import { getLayoutForTemplate, requiredPairCount } from './layouts'
import { buildLayoutFromSpec } from './builder/templates'

// A puzzle document: where its shape comes from, and the content in it.
//
// `source` is one of
//   { kind: 'new',    spec: { shape, size, fillBorder } }
//   { kind: 'import', templateId, pairCount, fileName }
// and is all that is needed to rebuild the layout — which is why it, rather
// than the layout itself, is what gets saved. A layout is a few hundred
// generated slot codes; the source is three fields, and it keeps a saved file
// readable and forward-compatible with layouts we haven't written yet.
//
// This mirrors what .fjsw does (content and geometry stored separately, the
// template naming the shape), for the same reason: the content is the part
// worth keeping.

const FORMAT = 'tarsia-web-puzzle'
const VERSION = 1
const STORAGE_KEY = 'tarsia-web:draft'

/** What an untitled puzzle is called, in one place so "has this been touched?" can ask. */
export const DEFAULT_TITLE = 'Untitled puzzle'

export function resolveLayout(source) {
  if (source.kind === 'new') return buildLayoutFromSpec(source.spec)
  return getLayoutForTemplate(source.templateId, source.pairCount)
}

export function blankPair(n) {
  return { n, question: '', answer: '' }
}

/**
 * Pad a pair list out to `count`, never truncating it.
 *
 * Not truncating is deliberate. Someone who types 30 pairs, tries the puzzle
 * as a smaller shape and goes back should find their work still there;
 * dropping the tail would make trying a size out a destructive act. The extra
 * entries cost nothing — a layout resolves its slots by pair number, so ones
 * it doesn't place are simply never drawn.
 */
export function ensurePairs(pairs, count) {
  if (pairs.length >= count) return pairs
  const grown = pairs.slice()
  for (let n = pairs.length + 1; n <= count; n++) grown.push(blankPair(n))
  return grown
}

/** Is there anything typed in here that replacing it would throw away? */
export function hasPairContent(pairs) {
  return pairs.some((pair) => pair.question.trim() || pair.answer.trim())
}

/**
 * Has this puzzle been worked on at all, or is it still the blank one the app
 * opens with?
 *
 * Deliberately narrower than hasPairContent: naming a puzzle counts as having
 * started it, even before a single question is typed. Choosing a shape does
 * not — trying sizes out is how the picker is meant to be used, and treating
 * that as work would mean a draft is overwritten by somebody only looking.
 */
export function hasStarted({ title, pairs }) {
  return hasPairContent(pairs) || title.trim() !== DEFAULT_TITLE
}

export function blankPairsFor(layout) {
  return ensurePairs([], requiredPairCount(layout))
}

export function serialiseProject({ title, source, pairs, baseline }) {
  return JSON.stringify(
    {
      format: FORMAT,
      version: VERSION,
      title,
      source,
      pairs,
      // Only present for an imported puzzle: what "revert to file" goes back
      // to, kept so that reopening a saved file doesn't quietly lose the
      // ability to undo edits.
      baseline: baseline ?? undefined,
    },
    null,
    2,
  )
}

// A number an imported template is willing to generate geometry for. Real
// files hold tens of pairs; the bound only exists so that a pairCount of a
// million can't be handed to a generator that loops that many times.
const MAX_PAIR_COUNT = 500

/**
 * One entry of a pair list, in the shape the rest of the app relies on.
 *
 * Applied to the baseline as well as to the live pairs, because the baseline
 * is read the same way they are. A baseline holding null used to survive
 * validation untouched, and the first thing to touch it — the "has this been
 * edited?" comparison, which runs during render, outside any file handler's
 * try/catch — threw on `was.question` and took the whole app down with it.
 */
function normalisePair(pair, i) {
  return {
    n: i + 1,
    question: String(pair?.question ?? ''),
    answer: String(pair?.answer ?? ''),
  }
}

function validateSource(source) {
  const kind = source?.kind
  if (kind !== 'new' && kind !== 'import') throw new Error('The file does not say what shape it is.')
  if (kind === 'import') {
    if (typeof source.templateId !== 'string' || !source.templateId.trim()) {
      throw new Error('The file does not say which template it came from.')
    }
    const count = source.pairCount
    if (!Number.isInteger(count) || count < 1 || count > MAX_PAIR_COUNT) {
      throw new Error(`The file asks for an impossible number of pairs (${count}).`)
    }
  }
}

function validate(data) {
  if (!data || data.format !== FORMAT) throw new Error('This is not a Tarsia Web puzzle file.')
  if (data.version > VERSION) {
    throw new Error(`This file was saved by a newer version of Tarsia Web (v${data.version}).`)
  }
  if (!Array.isArray(data.pairs)) throw new Error('The file has no question/answer list.')
  validateSource(data.source)

  const pairs = data.pairs.map(normalisePair)

  // Resolving here rather than at render, so a file naming a shape this build
  // doesn't have — or a size it doesn't offer — fails on open with something a
  // person can read, instead of throwing from inside a renderer.
  const layout = resolveLayout(data.source)
  if (!layout) throw new Error(`This file uses a template that can't be drawn: "${data.source.templateId}".`)

  return {
    title: typeof data.title === 'string' && data.title.trim() ? data.title : DEFAULT_TITLE,
    source: data.source,
    pairs: ensurePairs(pairs, requiredPairCount(layout)),
    baseline: Array.isArray(data.baseline) ? data.baseline.map(normalisePair) : null,
  }
}

export function parseProject(text) {
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  return validate(data)
}

export function looksLikeProject(fileName, text) {
  return fileName.toLowerCase().endsWith('.json') || text.trimStart().startsWith('{')
}

// ------------------------------------------------------------- autosave
//
// Creating a puzzle is half an hour of typing, and until it has been exported
// there is nothing else holding it. Losing that to a closed tab would be the
// worst thing this app could do, so the working copy is written to the
// browser as it changes.
//
// It is not restored automatically. The app opens blank and offers the draft
// back, because a teacher opening it to start a new puzzle should not be met
// by the last one's equations — see hasStarted, which is how the offer avoids
// being eaten by the autosave it is competing with.
//
// Every access is guarded: storage throws outright in a Safari private
// window, and setItem throws on quota. Failing to save a draft must never
// take the puzzle down with it.

export function saveDraft(project) {
  try {
    localStorage.setItem(STORAGE_KEY, serialiseProject(project))
    return true
  } catch {
    return false
  }
}

export function loadDraft() {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    if (!text) return null
    return parseProject(text)
  } catch {
    // A draft from an older build, or corrupt storage. Starting fresh is the
    // right answer; there is nobody to show an error to at this point.
    return null
  }
}

export function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* nothing to do */ }
}
