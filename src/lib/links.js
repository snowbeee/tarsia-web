// Where this project can be reached. One copy, used by both the app and the
// build: seo/site.js imports REPO_URL from here for the page footers, and the
// app builds report links from the rest.
//
// Deliberately free of `process.env` and of anything Node-only, because this
// module is read both by the browser bundle and by vite.config.js.

export const REPO_URL = 'https://github.com/snowbeee/tarsia-web'
export const ISSUES_URL = `${REPO_URL}/issues`

// Set this to turn on the "email me" half of every report link. While it is
// empty the links still work — they just point at GitHub only, which is the
// right failure: a dead mailto: is worse than no mailto:, because the reader
// has already decided to tell you something by the time it fails.
export const CONTACT_EMAIL = ''
