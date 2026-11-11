import { test } from 'node:test'
import assert from 'node:assert/strict'

import { fillPairsFrom, parsePastedPairs } from '../src/lib/edit/pastePairs'
import { getLayoutForTemplate } from '../src/lib/layouts'
import { blankPairsFor } from '../src/lib/project'

// --------------------------------------------------------------- parsing

test('two columns from a spreadsheet come through as pairs', () => {
  const { pairs, separator } = parsePastedPairs('2+2\t4\n3x=9\tx=3\n')
  assert.equal(separator, 'tab')
  assert.deepEqual(pairs, [
    { question: '2+2', answer: '4' },
    { question: '3x=9', answer: 'x=3' },
  ])
})

test('blank lines and stray whitespace are ignored, not turned into pairs', () => {
  const { pairs } = parsePastedPairs('\n  2+2 \t 4 \n\n\n5+5\t10\n   \n')
  assert.deepEqual(pairs, [
    { question: '2+2', answer: '4' },
    { question: '5+5', answer: '10' },
  ])
})

test('windows line endings do not leave a carriage return in the answer', () => {
  const { pairs } = parsePastedPairs('a\tb\r\nc\td')
  assert.deepEqual(pairs, [
    { question: 'a', answer: 'b' },
    { question: 'c', answer: 'd' },
  ])
})

// A question may well contain a comma, so commas are a fallback and never
// overrule a tab — otherwise "In 1066, what happened?" loses most of itself.
test('a comma inside a tabbed line is left alone', () => {
  const { pairs } = parsePastedPairs('In 1066, what happened?\tThe Normans landed')
  assert.deepEqual(pairs, [{ question: 'In 1066, what happened?', answer: 'The Normans landed' }])
})

test('commas are used only when every line has one and none has a tab', () => {
  const both = parsePastedPairs('a,1\nb,2')
  assert.equal(both.separator, 'comma')
  assert.deepEqual(both.pairs, [
    { question: 'a', answer: '1' },
    { question: 'b', answer: '2' },
  ])

  // One line without a comma means this is prose, not a CSV.
  const mixed = parsePastedPairs('a,1\njust a question')
  assert.equal(mixed.separator, 'none')
  assert.equal(mixed.pairs[0].question, 'a,1')
})

test('a comma line splits once, so the answer keeps its own commas', () => {
  const { pairs } = parsePastedPairs('Name three,red, green, blue')
  assert.deepEqual(pairs, [{ question: 'Name three', answer: 'red, green, blue' }])
})

test('a bare list becomes questions with no answers, and says so', () => {
  const { pairs, separator, notes } = parsePastedPairs('first\nsecond')
  assert.equal(separator, 'none')
  assert.deepEqual(pairs, [
    { question: 'first', answer: '' },
    { question: 'second', answer: '' },
  ])
  assert.match(notes.join(' '), /no answer/i)
})

test('extra columns are dropped, and the drop is reported', () => {
  const { pairs, notes } = parsePastedPairs('a\tb\tc\td\nx\ty')
  assert.deepEqual(pairs[0], { question: 'a', answer: 'b' })
  assert.match(notes.join(' '), /more than two columns/)
})

test('nothing pasted yields nothing, not a row of blanks', () => {
  assert.deepEqual(parsePastedPairs('').pairs, [])
  assert.deepEqual(parsePastedPairs('   \n\n ').pairs, [])
})

// --------------------------------------------------------------- filling

const layoutFor = (id, count) => getLayoutForTemplate(id, count)

test('pairs land on the rows the editor actually shows', () => {
  const layout = layoutFor('standard triangular jigsaw 18', 18)
  const blank = blankPairsFor(layout)
  const { pairs, used, spare } = fillPairsFrom(blank, layout, [
    { question: 'q1', answer: 'a1' },
    { question: 'q2', answer: 'a2' },
  ])
  assert.equal(pairs[0].question, 'q1')
  assert.equal(pairs[0].answer, 'a1')
  assert.equal(pairs[1].question, 'q2')
  assert.equal(used, 2)
  assert.equal(spare, 0)
  // Everything past the pasted rows is left blank rather than shuffled up.
  assert.equal(pairs[2].question, '')
})

test('more pasted than the shape holds is kept track of, not silently lost', () => {
  const layout = layoutFor('dominos 6', 6)
  const blank = blankPairsFor(layout)
  const many = Array.from({ length: 50 }, (_, i) => ({ question: `q${i}`, answer: `a${i}` }))
  const { used, spare } = fillPairsFrom(blank, layout, many)
  assert.ok(spare > 0)
  assert.equal(used + spare, 50)
})

// The extended hexagon's outer rim is twelve decoys with nothing to match,
// so an answer pasted against one of those rows has nowhere to go. Filling by
// raw index would quietly write it into a slot the puzzle never draws.
test('an answer with no slot to sit in is dropped, and counted', () => {
  const layout = layoutFor('extended hexagonal jigsaw 30', 36)
  const blank = blankPairsFor(layout)
  const parsed = Array.from({ length: 36 }, (_, i) => ({ question: `q${i}`, answer: `a${i}` }))
  const { pairs, droppedAnswers } = fillPairsFrom(blank, layout, parsed)
  assert.ok(droppedAnswers > 0, 'the rim rows should have reported dropped answers')
  // The questions still all landed, in order.
  assert.equal(pairs[0].question, 'q0')
})

test('filling never mutates the pairs it was given', () => {
  const layout = layoutFor('standard triangular jigsaw 18', 18)
  const blank = blankPairsFor(layout)
  fillPairsFrom(blank, layout, [{ question: 'written', answer: 'here' }])
  assert.equal(blank[0].question, '', 'the original array was modified in place')
})
