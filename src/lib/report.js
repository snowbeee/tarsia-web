// Turning "this file won't open" into something the author can act on.
//
// When a .fjsw uses a template this build has no geometry for, the app
// already knows exactly which one — the template id is right there in the
// file. That string is the whole diagnosis, and asking a teacher to retype it
// into an email is how you end up with "it didn't work" instead.
//
// So the report links come prefilled. Nothing is sent: these open the
// reader's own mail client or a GitHub form, and they decide what to send.
// That matters on a site whose every page says files are never uploaded.

import { CONTACT_EMAIL, ISSUES_URL } from './links'

const enc = encodeURIComponent

/**
 * Prefilled "this file won't open" links for one unsupported template.
 *
 * @param {{templateId: string, pairCount: number}} about
 * @returns {{email: string|null, issue: string}} `email` is null when no
 *   contact address is configured; see links.js.
 */
export function reportUnsupportedTemplate({ templateId, pairCount }) {
  const subject = `Tarsia Web: can't draw the template "${templateId}"`
  const facts = `Template: ${templateId}\nPairs in the file: ${pairCount}`

  const emailBody = [
    `I opened a .fjsw file in Tarsia Web and it says this shape can't be drawn.`,
    '',
    facts,
    '',
    `If you can, please attach the .fjsw file to this email — working out the`,
    `geometry needs a real example of the shape. Nothing was attached`,
    `automatically; the file never left my computer.`,
  ].join('\n')

  const issueBody = [
    `A .fjsw file uses a template this build has no layout for.`,
    '',
    facts,
    '',
    `Attaching the .fjsw file to this issue (or a photo of the printed puzzle)`,
    `is what makes the shape possible to add.`,
  ].join('\n')

  return {
    email: CONTACT_EMAIL
      ? `mailto:${CONTACT_EMAIL}?subject=${enc(subject)}&body=${enc(emailBody)}`
      : null,
    issue: `${ISSUES_URL}/new?title=${enc(subject)}&body=${enc(issueBody)}`,
  }
}

/** Where to send a suggestion that isn't about a particular file. */
export function suggestionLinks() {
  const subject = 'Tarsia Web: a suggestion'
  return {
    email: CONTACT_EMAIL ? `mailto:${CONTACT_EMAIL}?subject=${enc(subject)}` : null,
    issue: `${ISSUES_URL}/new?title=${enc(subject)}`,
  }
}
