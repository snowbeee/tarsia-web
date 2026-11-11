import './setup.js'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseFjsw } from '../src/lib/fjswParser.js'

const sample = (name) => readFileSync(new URL(`../samples/${name}`, import.meta.url), 'utf8')

// Smallest .fjsw that still exercises the template + pair plumbing.
const wrap = (mathml) => `<?xml version="1.0"?>
<jigsaw>
  <template id='standard triangular jigsaw 18'/>
  <eqnpair>
    <math xmlns="http://www.w3.org/1998/Math/MathML">${mathml}</math>
    <math xmlns="http://www.w3.org/1998/Math/MathML"><mi>y</mi></math>
  </eqnpair>
</jigsaw>`

const question = (mathml) => parseFjsw(wrap(mathml)).pairs[0].question

test('a fractional exponent keeps the whole fraction in the exponent', () => {
  // Was "x^-(1)/(2)" — x to the minus one, halved.
  const answers = parseFjsw(sample('square24.fjsw')).pairs.map((p) => p.answer)
  assert.equal(answers[2], 'x^(-(1)/(2))')
})

test('a negative exponent is grouped rather than left to run on', () => {
  // "x^-1-4x^-2" could be read as x to the (-1 - 4x^-2).
  const answers = parseFjsw(sample('square24.fjsw')).pairs.map((p) => p.answer)
  assert.equal(answers[5], 'x^(-1)-4x^(-2)')
})

test('a compound exponent is grouped', () => {
  const mathml = '<msup><mi>x</mi><mrow><mn>2</mn><mi>x</mi><mo>+</mo><mn>1</mn></mrow></msup>'
  assert.equal(question(mathml), 'x^(2x+1)')
})

test('a base is written exactly as the file draws it, brackets and all', () => {
  // Formulator puts the whole preceding run in the base: 3a with a raised 2,
  // drawn as 3a squared, is msup(mrow(3, a), 2). Bracketing that base would
  // say (3a) squared, which is nine times the number the teacher wrote.
  const mathml = '<msup><mrow><mn>3</mn><mi>a</mi></mrow><mn>2</mn></msup>'
  assert.equal(question(mathml), '3a^2')
  assert.equal(parseFjsw(sample('dominoes.fjsw')).pairs[9].answer, '3a^2+6a')
  // And a base that really is a group brings its own brackets with it.
  assert.equal(
    question('<msup><mfenced><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></mfenced><mn>2</mn></msup>'),
    '(x+1)^2',
  )
})

test('a compound subscript is grouped', () => {
  const mathml = '<msub><mi>a</mi><mrow><mi>n</mi><mo>+</mo><mn>1</mn></mrow></msub>'
  assert.equal(question(mathml), 'a_(n+1)')
})

test('simple powers stay readable', () => {
  assert.equal(question('<msup><mi>x</mi><mn>2</mn></msup>'), 'x^2')
  assert.equal(question('<msup><mi>x</mi><mn>25</mn></msup>'), 'x^25')
  assert.equal(question('<msub><mi>x</mi><mn>1</mn></msub>'), 'x_1')
})

test('an exponent that already carries its own brackets is not bracketed twice', () => {
  const mathml =
    '<msup><mi>e</mi><mfenced><mrow><mi>x</mi><mo>+</mo><mn>1</mn></mrow></mfenced></msup>'
  assert.equal(question(mathml), 'e^(x+1)')
  // And the common real shape: a bracketed base, squared.
  assert.equal(parseFjsw(sample('exthex2.fjsw')).pairs[0].answer, '(x+1)^2')
})

test('wording around an expression survives untouched', () => {
  // "Expand (x+5)" with a raised 2 after it — the instruction is inside the
  // base mrow, and belongs outside any bracket.
  const written = parseFjsw(sample('longest.fjsw')).pairs[5].question
  assert.equal(written.replace(/\s+/g, ' '), 'Expand (x+5)^2')
})

test('every sample still parses, with a template and some content', () => {
  const files = [
    'square24.fjsw', 'exthex.fjsw', 'exthex2.fjsw', 'hex30.fjsw', 'tri18.fjsw',
    'dominoes.fjsw', 'rectcards.fjsw', 'parquet15.fjsw', 'longish.fjsw', 'longest.fjsw',
  ]
  for (const file of files) {
    const { templateId, pairs } = parseFjsw(sample(file))
    assert.ok(templateId, `${file} has a template id`)
    assert.ok(pairs.length > 0, `${file} has pairs`)
    // Not every pair: square24 is a half-written file, with 8 of its 25 filled.
    assert.ok(pairs.some((p) => p.question !== '' || p.answer !== ''), `${file} has text`)
  }
})
