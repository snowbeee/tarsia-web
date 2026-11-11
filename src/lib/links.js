// Where this project can be reached. One copy, used by both the app and the
// build: seo/site.js imports REPO_URL from here for the page footers, and the
// app builds report links from the rest.
//
// Deliberately free of `process.env` and of anything Node-only, because this
// module is read both by the browser bundle and by vite.config.js.

export const REPO_URL = 'https://github.com/snowbeee/tarsia-web'
export const ISSUES_URL = `${REPO_URL}/issues`

// The "email me" half of every report link. Emptying it does not break
// anything — the links fall back to GitHub alone, which is the right failure,
// because a dead mailto: fails at the exact moment someone had decided to
// tell you something.
//
// This is a plain mailto: on a public page, so the address is harvestable.
// That is a deliberate trade: obfuscating it would mean assembling the link
// in JavaScript, and the pages that carry it are deliberately script-free so
// that they load fast and read correctly without one.
export const CONTACT_EMAIL = 'jakub.syrovy@gmail.com'
