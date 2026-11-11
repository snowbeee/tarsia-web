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
// Written as a plain mailto:, which on a public page would be harvestable —
// obfuscating it in the source would mean assembling the link in JavaScript,
// and these pages carry no script of their own on purpose.
//
// In production it is obfuscated anyway: Cloudflare's Email Obfuscation
// rewrites the href to /cdn-cgi/l/email-protection#… at the edge and injects
// a decoder, so the address is not in the HTML a scraper reads. Checked on
// the live site — the link resolves back to a real mailto: once that script
// runs. The cost is that this one link, alone on these pages, now needs
// JavaScript to work; turning the feature off in the Cloudflare dashboard
// puts the plain address back.
export const CONTACT_EMAIL = 'jakub.syrovy@gmail.com'
