import './setup.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { projectFromFileText, replaceWorkingCopy } from '../src/lib/openFile.js'
import { clearDraft, loadDraft, saveDraft, serialiseProject } from '../src/lib/project.js'

const sample = (name) => readFileSync(new URL(`../samples/${name}`, import.meta.url), 'utf8')

const typed = () => ({
  title: 'Half-finished',
  source: { kind: 'new', spec: { shape: 'triangle', size: '4', fillBorder: false } },
  pairs: [{ n: 1, question: 'A morning of typing', answer: '42' }],
  baseline: null,
})

const blank = () => ({ ...typed(), pairs: [{ n: 1, question: '', answer: '' }] })

const never = () => assert.fail('should not have asked')

// ------------------------------------------- reading cannot replace anything

test('a valid .fjsw yields a candidate puzzle', () => {
  const { project, error } = projectFromFileText('tri18.fjsw', sample('tri18.fjsw'))
  assert.equal(error, undefined)
  assert.equal(project.source.kind, 'import')
  assert.equal(project.title, 'tri18')
  assert.ok(project.pairs.length >= 18)
})

test('a valid saved puzzle yields a candidate puzzle', () => {
  const text = serialiseProject(typed())
  const { project } = projectFromFileText('mine.tarsia.json', text)
  assert.equal(project.title, 'Half-finished')
})

test('a template with no geometry is reported, not applied', () => {
  const text = sample('tri18.fjsw').replace('standard triangular jigsaw 18', 'martian jigsaw 7')
  const { project, error } = projectFromFileText('weird.fjsw', text)
  assert.equal(project, undefined)
  assert.match(error, /Unrecognised template/)
})

test('an unreadable file throws before any puzzle is produced', () => {
  assert.throws(() => projectFromFileText('broken.tarsia.json', '{ not json'), /valid JSON/)
  assert.throws(() => projectFromFileText('empty.fjsw', 'nonsense, not xml'), /parse/i)
  assert.throws(
    () => projectFromFileText('bad.tarsia.json', serialiseProject({
      ...typed(),
      source: { kind: 'new', spec: { shape: 'triangle', size: 'oops' } },
    })),
    /size/i,
  )
})

// ----------------------------------------------------- the gate before Open

test('opening over typed work asks first, and a cancel changes nothing', () => {
  const current = typed()
  const candidate = projectFromFileText('tri18.fjsw', sample('tri18.fjsw')).project
  const kept = replaceWorkingCopy(current, candidate, () => false)
  assert.equal(kept, current, 'the working copy is returned unchanged')
})

test('confirming replaces the working copy', () => {
  const candidate = projectFromFileText('tri18.fjsw', sample('tri18.fjsw')).project
  assert.equal(replaceWorkingCopy(typed(), candidate, () => true), candidate)
})

test('an empty puzzle is replaced without asking', () => {
  const candidate = projectFromFileText('tri18.fjsw', sample('tri18.fjsw')).project
  assert.equal(replaceWorkingCopy(blank(), candidate, never), candidate)
})

test('a cancel leaves the autosaved draft as it was', () => {
  clearDraft()
  const current = typed()
  saveDraft(current)
  const candidate = projectFromFileText('tri18.fjsw', sample('tri18.fjsw')).project

  // Opening is cancelled: the app sets the same project back, so the autosave
  // effect writes the same draft — never the imported one.
  const after = replaceWorkingCopy(current, candidate, () => false)
  saveDraft(after)

  const draft = loadDraft()
  assert.equal(draft.title, 'Half-finished')
  assert.equal(draft.pairs[0].question, 'A morning of typing')
  clearDraft()
})
