// Everything the build needs to write the <head> of each page, in one place.
//
// The pages themselves are plain HTML files holding only their body content;
// titles, descriptions, canonical URLs, social cards and structured data all
// come from here, so there is one copy of each rather than one per file that
// drifts. seo/plugin.js turns this into the actual tags.

export const SITE_NAME = 'Tarsia Web'

// Where the public site lives — the only deployment there is. It is served
// from the root of its own subdomain on Cloudflare Pages.
const CANONICAL = 'https://tarsia.syrovy.tech'

// Which address this build believes itself to be at, and so whether search
// engines should index it. A build that states no address cannot state a
// canonical URL either, and an uncanonicalised copy competes with the real
// site for the same queries — so it says noindex instead. See seo/plugin.js.
//
//   SITE_URL set   — that address. For publishing the site somewhere else.
//   NOINDEX=1      — a copy that must stay out of search: a preview deploy,
//                    or a build served anywhere other than CANONICAL.
//   neither        — the public site.
//
// BASE_PATH is deliberately not part of this. It sets the subdirectory the
// site is served from and nothing more; it used to imply "this is a copy"
// back when the school ran its own install at /tarsia/, and that install is
// gone. One knob, one job.
export const SITE_URL = process.env.NOINDEX === '1' ? '' : (process.env.SITE_URL ?? CANONICAL)

// Linked from every page's footer, so it has to be a repository a visitor can
// actually open. Claiming the files never leave your computer is worth more
// when anyone can go and check.
export const REPO_URL = 'https://github.com/snowbeee/tarsia-web'

// 1200x630 is the size every social network crops from; see seo/og.svg.
export const OG_IMAGE = 'og.png'

// One entry per HTML file in the build. `file` is the path Vite builds from,
// `url` the address it ends up at and `nav` the short name used in links —
// the title is written to be read in a search result, which is too long for
// a navigation bar. `listed: false` keeps a page out of the nav and footer,
// and `indexable: false` out of the sitemap and out of search. `url` is a
// directory — a directory, so the published URL has
// no `.html` in it and the server's own index handling serves it.
export const PAGES = [
  {
    file: 'index.html',
    url: '',
    nav: 'Tarsia Web',
    title: 'Tarsia Puzzle Maker — free, in your browser, no account',
    description:
      'Type your question and answer pairs, pick a shape, print a cut-out puzzle. Free, nothing to install, nothing uploaded. Opens Formulator Tarsia .fjsw files.',
  },
  {
    file: 'open-fjsw-file/index.html',
    url: 'open-fjsw-file/',
    nav: 'Open an .fjsw file',
    title: 'How to open an .fjsw file without Formulator Tarsia',
    description:
      'Open a Formulator Tarsia .fjsw file in your browser, on any computer. Nothing to install, nothing uploaded. Edit the questions and print it as a PDF.',
  },
  {
    file: 'tarsia-for-mac/index.html',
    url: 'tarsia-for-mac/',
    nav: 'On a Mac or Chromebook',
    title: 'Tarsia on a Mac, Chromebook or iPad — no Windows needed',
    description:
      'Formulator Tarsia is Windows-only. Build the same cut-out puzzles and open the .fjsw files you already have, from a Mac, Chromebook or iPad — in the browser.',
  },
  {
    // Cloudflare Pages serves this for an unmatched path, with a real 404
    // status. Without it, every wrong URL returns 200 with the app on it —
    // which a search engine reads as an unbounded supply of duplicate pages.
    file: '404.html',
    url: '404.html',
    listed: false,
    indexable: false,
    nav: 'Page not found',
    title: 'Page not found — Tarsia Web',
    description: 'That page does not exist.',
  },
  {
    file: 'what-is-a-tarsia-puzzle/index.html',
    url: 'what-is-a-tarsia-puzzle/',
    nav: 'What is a Tarsia?',
    title: 'What is a Tarsia puzzle, and how do you use one in class?',
    description:
      'A Tarsia is a cut-out jigsaw where each edge matches a question to its answer. What the shapes are, how to print and run one in class, and how to make your own.',
  },
]
