import './setup.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  clearDraft,
  DEFAULT_TITLE,
  ensurePairs,
  hasPairContent,
  hasStarted,
  loadDraft,
  parseProject,
  saveDraft,
  serialiseProject,
} from '../src/lib/project.js'
import { BUILDER_SHAPES, buildLayoutFromSpec } from '../src/lib/builder/templates.js'
import { requiredPairCount } from '../src/lib/layouts/index.js'

const doc = (overrides) =>
  JSON.stringify({
    format: 'tarsia-web-puzzle',
    version: 1,
    title: 'Test puzzle',
    source: { kind: 'new', spec: { shape: 'triangle', size: '4', fillBorder: false } },
    pairs: [],
    ...overrides,
  })

const rejects = (text, match) => assert.throws(() => parseProject(text), match)

// --------------------------------------------------------------- baseline

test('a baseline entry that is null is normalised, not handed on', () => {
  const project = parseProject(doc({ baseline: [null] }))
  assert.deepEqual(project.baseline, [{ n: 1, question: '', answer: '' }])
  // The crash was here: App compares each baseline entry during render.
  assert.doesNotThrow(() => project.baseline.map((was) => was.question))
})

test('baseline entries with missing, numeric or renumbered fields come back usable', () => {
  const project = parseProject(
    doc({
      baseline: [
        { question: 'only a question' },
        { n: 99, question: 7, answer: 8 },
        'not an object',
      ],
    }),
  )
  assert.deepEqual(project.baseline, [
    { n: 1, question: 'only a question', answer: '' },
    { n: 2, question: '7', answer: '8' },
    { n: 3, question: '', answer: '' },
  ])
})

test('reverting to a repaired baseline yields pairs the renderer can read', () => {
  const project = parseProject(doc({ baseline: [null, { question: 'q' }] }))
  const layout = buildLayoutFromSpec(project.source.spec)
  const reverted = ensurePairs(project.baseline, requiredPairCount(layout))
  assert.equal(reverted.length, requiredPairCount(layout))
  for (const pair of reverted) {
    assert.equal(typeof pair.question, 'string')
    assert.equal(typeof pair.answer, 'string')
    assert.equal(typeof pair.n, 'number')
  }
})

test('a baseline that is not an array is dropped', () => {
  assert.equal(parseProject(doc({ baseline: 'nonsense' })).baseline, null)
  assert.equal(parseProject(doc({})).baseline, null)
})

// ------------------------------------------------------------------ spec

test('a size the shape does not offer is rejected', () => {
  for (const size of ['oops', '0', '-1', '999999', '', null]) {
    rejects(doc({ source: { kind: 'new', spec: { shape: 'triangle', size } } }), /size/i)
  }
})

test('an unknown shape is rejected', () => {
  rejects(doc({ source: { kind: 'new', spec: { shape: 'dodecahedron', size: '4' } } }), /shape/i)
})

test('a missing spec is rejected rather than built', () => {
  rejects(doc({ source: { kind: 'new' } }), /shape/i)
})

test('a non-boolean border flag is rejected', () => {
  rejects(
    doc({ source: { kind: 'new', spec: { shape: 'triangle', size: '4', fillBorder: 'yes' } } }),
    /border/i,
  )
})

test('a size written as a number still opens', () => {
  const project = parseProject(doc({ source: { kind: 'new', spec: { shape: 'triangle', size: 4 } } }))
  assert.equal(project.pairs.length, 18)
})

test('every offered shape and size round-trips through save and open', () => {
  for (const shape of BUILDER_SHAPES) {
    for (const size of shape.sizes) {
      for (const fillBorder of shape.hasBorder ? [false, true] : [false]) {
        const spec = { shape: shape.key, size: size.value, fillBorder }
        const layout = buildLayoutFromSpec(spec)
        const pairs = ensurePairs([{ n: 1, question: 'q1', answer: 'a1' }], requiredPairCount(layout))
        const text = serialiseProject({
          title: 'Round trip',
          source: { kind: 'new', spec },
          pairs,
          baseline: null,
        })
        const reopened = parseProject(text)
        assert.deepEqual(reopened.source.spec, spec)
        assert.deepEqual(reopened.pairs, pairs)
      }
    }
  }
})

// ---------------------------------------------------------------- import

test('an imported source with an impossible pair count is rejected', () => {
  for (const pairCount of [0, -5, 1e9, 2.5, NaN, '30', null, undefined]) {
    rejects(
      doc({ source: { kind: 'import', templateId: 'dominos 12', pairCount, fileName: 'x.fjsw' } }),
      /pairs|template/i,
    )
  }
})

test('an imported source with no template id is rejected', () => {
  rejects(doc({ source: { kind: 'import', pairCount: 12, fileName: 'x.fjsw' } }), /template/i)
})

test('a valid imported document still opens, and reopens after saving', () => {
  const text = doc({
    source: { kind: 'import', templateId: 'dominos 12', pairCount: 12, fileName: 'd.fjsw' },
    pairs: [{ question: 'q', answer: 'a' }],
    baseline: [{ n: 1, question: 'q', answer: 'a' }],
  })
  const project = parseProject(text)
  assert.equal(project.source.templateId, 'dominos 12')
  assert.deepEqual(parseProject(serialiseProject(project)), project)
})

test('a template this build cannot draw is rejected', () => {
  rejects(
    doc({ source: { kind: 'import', templateId: 'made up jigsaw', pairCount: 12 } }),
    /can't be drawn/,
  )
})

// --------------------------------------------------------------- content

test('hasPairContent ignores whitespace', () => {
  assert.equal(hasPairContent([{ n: 1, question: '  ', answer: '\n' }]), false)
  assert.equal(hasPairContent([{ n: 1, question: '', answer: 'x' }]), true)
  assert.equal(hasPairContent([]), false)
})

// ------------------------------------------------- opening blank every time

test('a blank puzzle counts as not started, so the stored draft is left alone', () => {
  assert.equal(hasStarted({ title: DEFAULT_TITLE, pairs: [{ n: 1, question: '', answer: '' }] }), false)
  assert.equal(hasStarted({ title: `  ${DEFAULT_TITLE}  `, pairs: [] }), false)
})

test('typing a question, or naming the puzzle, counts as started', () => {
  assert.equal(hasStarted({ title: DEFAULT_TITLE, pairs: [{ n: 1, question: 'x+1', answer: '' }] }), true)
  assert.equal(hasStarted({ title: 'Year 9 indices', pairs: [{ n: 1, question: '', answer: '' }] }), true)
})

test('a draft survives being opened and not touched', () => {
  clearDraft()
  const theirs = {
    title: 'Year 9 indices',
    source: { kind: 'new', spec: { shape: 'triangle', size: '4', fillBorder: false } },
    pairs: [{ n: 1, question: 'x^(-1)', answer: '1/x' }],
    baseline: null,
  }
  saveDraft(theirs)

  // What the app does on load: read the draft, then show a blank puzzle. The
  // blank one must not be written over the stored draft.
  const offered = loadDraft()
  const blank = { title: DEFAULT_TITLE, pairs: [{ n: 1, question: '', answer: '' }] }
  if (!(offered && !hasStarted(blank))) saveDraft(blank)

  assert.equal(loadDraft().title, 'Year 9 indices')
  assert.equal(loadDraft().pairs[0].question, 'x^(-1)')
  clearDraft()
})
