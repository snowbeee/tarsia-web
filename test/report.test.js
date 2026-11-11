import { test } from 'node:test'
import assert from 'node:assert/strict'

import { reportUnsupportedTemplate, suggestionLinks } from '../src/lib/report'
import { CONTACT_EMAIL, ISSUES_URL } from '../src/lib/links'

const about = { templateId: 'martian jigsaw 7', pairCount: 12 }

// The point of prefilling is that the reader never has to copy the template
// name out of an error message, so it has to actually survive the encoding.
test('the template name reaches the issue the reader will file', () => {
  const { issue } = reportUnsupportedTemplate(about)
  const url = new URL(issue)
  assert.ok(url.href.startsWith(`${ISSUES_URL}/new`))
  assert.match(url.searchParams.get('title'), /martian jigsaw 7/)
  assert.match(url.searchParams.get('body'), /martian jigsaw 7/)
  assert.match(url.searchParams.get('body'), /Pairs in the file: 12/)
})

test('a template name with characters that break URLs still survives', () => {
  const { issue } = reportUnsupportedTemplate({
    templateId: 'odd & "awkward" jigsaw #3 / 50%',
    pairCount: 4,
  })
  assert.equal(
    new URL(issue).searchParams.get('title'),
    'Tarsia Web: can\'t draw the template "odd & "awkward" jigsaw #3 / 50%"',
  )
})

// links.js ships with no address on purpose. A mailto: that goes nowhere is
// worse than none, so the email half has to be absent rather than broken.
test('no configured address means no email link, not a broken one', () => {
  const { email, issue } = reportUnsupportedTemplate(about)
  assert.ok(issue)
  if (CONTACT_EMAIL === '') {
    assert.equal(email, null)
    assert.equal(suggestionLinks().email, null)
  } else {
    assert.ok(email.startsWith(`mailto:${CONTACT_EMAIL}?`))
    assert.match(new URL(email).searchParams.get('body'), /martian jigsaw 7/)
  }
})

test('a suggestion needs no file, so it carries no template', () => {
  const { issue } = suggestionLinks()
  assert.match(new URL(issue).searchParams.get('title'), /suggestion/)
})
