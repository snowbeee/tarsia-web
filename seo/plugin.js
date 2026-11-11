// Build-time SEO: one owner for every page's <head>, its shared chrome, and
// the robots.txt/sitemap.xml pair.
//
// The HTML files in this repo hold body content only. Everything a search
// engine or a social network reads is written here, from seo/site.js and
// seo/faq.js, so the four pages cannot drift apart from each other.

import { FAQ } from './faq.js'
import { CONTACT_EMAIL, ISSUES_URL } from '../src/lib/links.js'
import { OG_IMAGE, PAGES, REPO_URL, SITE_NAME, SITE_URL } from './site.js'

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// A build that doesn't know its own address cannot state a canonical URL, and
// an uncanonicalised copy of the site competes with the real one for the same
// queries — the school's dev install would be fighting the public site. So
// "no SITE_URL" means "this is a copy", and a copy is marked noindex. The
// meta tag is what does the work: a robots.txt under a subdirectory install
// is never read, because crawlers only look for it at the domain root.
const isCopy = !SITE_URL

const page = (file) => PAGES.find((p) => p.file === file)

// Absolute URL of a page, for canonical/og:url/sitemap. `base` is Vite's, so
// a subdirectory install canonicalises to the subdirectory it is served from.
const absolute = (base, url) => (SITE_URL ? new URL(base + url, SITE_URL).href : '')

const faqHtml = (items) =>
  items.length === 0
    ? ''
    : [
        '<section class="faq" aria-labelledby="faq-h">',
        '<h2 id="faq-h">Questions teachers ask</h2>',
        '<dl>',
        ...items.flatMap(([q, a]) => [`<dt>${esc(q)}</dt>`, `<dd>${esc(a)}</dd>`]),
        '</dl>',
        '</section>',
      ].join('\n')

const faqJsonLd = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(([q, a]) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
})

// Described as what it is: a free tool, in a browser, for teachers. The price
// is stated because "free" is the single most asked question about it, and a
// stated price of 0 is the only form of that a search engine can read.
const appJsonLd = (home) => ({
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: SITE_NAME,
  url: home,
  applicationCategory: 'EducationalApplication',
  operatingSystem: 'Any — runs in a web browser',
  browserRequirements: 'Requires JavaScript.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
  featureList: [
    'Build cut-out matching puzzles from question and answer pairs',
    'Hexagon, triangle, square, domino and matching card shapes',
    'Open .fjsw files from the Formulator Tarsia desktop app',
    'Print-ready PDF export with an answer sheet',
    'Runs entirely in the browser — files are never uploaded',
  ],
  isAccessibleForFree: true,
})

const nav = (base, current) =>
  [
    '<nav class="site-nav" aria-label="Site">',
    `<a class="brand" href="${esc(base)}">${esc(SITE_NAME)}</a>`,
    '<ul>',
    ...PAGES.filter((p) => p.url !== '' && p.listed !== false).map((p) => {
      const here = p.file === current ? ' aria-current="page"' : ''
      return `<li><a href="${esc(base + p.url)}"${here}>${esc(shortTitle(p))}</a></li>`
    }),
    '</ul>',
    '</nav>',
  ].join('\n')

// The <title> of a page is written for a search result, which is too long for
// a navigation bar; the part before the first dash or comma reads well there.
function shortTitle(p) {
  return p.nav || p.title.split(/ — |[,?]/)[0]
}

// Said once, in the footer of every page. An address only appears when one
// is configured — a mailto: that goes nowhere is worse than none, because by
// the time it fails the reader had already decided to tell you something.
const contactSentence = () => {
  const issue = `<a href="${esc(ISSUES_URL)}/new">open an issue</a>`
  return CONTACT_EMAIL
    ? `<a href="mailto:${esc(CONTACT_EMAIL)}">Email me</a> or ${issue} \u2014 both are read.`
    : `Please ${issue}.`
}

const footer = (base, current) =>
  [
    '<footer class="site-footer">',
    '<ul>',
    ...PAGES.filter((p) => p.file !== current && p.listed !== false).map(
      (p) => `<li><a href="${esc(base + p.url)}">${esc(shortTitle(p))}</a></li>`,
    ),
    `<li><a href="${esc(REPO_URL)}">Source code on GitHub</a></li>`,
    '</ul>',
    `<p class="small">${esc(SITE_NAME)} is free and open source. Puzzles are built and printed by your own browser; nothing you open or type is uploaded.</p>`,
    `<p class="small">Something not working, or a shape you need that isn't here? ${contactSentence()}</p>`,
    '</footer>',
  ].join('\n')

function head(p, base) {
  const canonical = absolute(base, p.url)
  const items = FAQ[p.file] || []
  const tags = [
    `<title>${esc(p.title)}</title>`,
    `<meta name="description" content="${esc(p.description)}" />`,
    '<meta name="author" content="Park Lane International School" />',
    '<meta name="theme-color" content="#1a1a1a" />',
  ]

  // A copy of the site, or a page that is not a destination at all (the 404),
  // states noindex and claims no canonical URL — a canonical is a claim to be
  // the one true address of something worth indexing, which neither is.
  if (isCopy || p.indexable === false) {
    tags.push('<meta name="robots" content="noindex, nofollow" />')
  } else {
    tags.push('<meta name="robots" content="index, follow, max-image-preview:large" />')
    tags.push(`<link rel="canonical" href="${esc(canonical)}" />`)
    tags.push(
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
      `<meta property="og:title" content="${esc(p.title)}" />`,
      `<meta property="og:description" content="${esc(p.description)}" />`,
      `<meta property="og:url" content="${esc(canonical)}" />`,
      `<meta property="og:image" content="${esc(absolute(base, OG_IMAGE))}" />`,
      `<meta property="og:image:width" content="1200" />`,
      `<meta property="og:image:height" content="630" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<meta name="twitter:title" content="${esc(p.title)}" />`,
      `<meta name="twitter:description" content="${esc(p.description)}" />`,
      `<meta name="twitter:image" content="${esc(absolute(base, OG_IMAGE))}" />`,
    )
    const ld = []
    if (p.url === '') ld.push(appJsonLd(canonical))
    if (items.length) ld.push(faqJsonLd(items))
    for (const o of ld) {
      tags.push(`<script type="application/ld+json">${JSON.stringify(o)}</script>`)
    }
  }
  return tags.join('\n    ')
}

export default function seo() {
  // Vite resolves `base` from BASE_PATH (see vite.config.js); taking it from
  // the resolved config rather than re-reading the environment means the
  // canonical URLs, the internal links and the sitemap cannot disagree about
  // where the site is being served from.
  let base = '/'

  return {
    name: 'tarsia-seo',

    configResolved(config) {
      base = config.base
    },
    // `order: 'post'` so Vite has already injected its own asset tags; this
    // only ever adds to the head and fills in the body's markers.
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const file = ctx.path.replace(/^\//, '')
        const p = page(file)
        if (!p) return html
        return (
          html
            // Links inside the page bodies are written as {{base}}… so that a
            // subdirectory install keeps working. A bare "/" would leave the
            // school's /tarsia/ copy linking to the domain root, which is a
            // different site. Vite rewrites asset URLs but not <a href>.
            .replaceAll('{{base}}', base)
            .replace('</head>', `  ${head(p, base)}\n  </head>`)
            .replace('<!--nav-->', nav(base, file))
            .replace('<!--faq-->', faqHtml(FAQ[p.file] || []))
            .replace('<!--footer-->', footer(base, file))
        )
      },
    },

    generateBundle() {
      // robots.txt is only ever read from the domain root, so for a
      // subdirectory install this file is decoration — the noindex meta tag
      // above is what actually keeps that copy out of the index.
      const robots = isCopy
        ? 'User-agent: *\nDisallow: /\n'
        : `User-agent: *\nAllow: /\n\nSitemap: ${new URL('sitemap.xml', SITE_URL).href}\n`
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: robots })

      if (isCopy) return
      const today = new Date().toISOString().slice(0, 10)
      const urls = PAGES.filter((p) => p.indexable !== false).map((p) =>
        [
          '  <url>',
          `    <loc>${esc(absolute(base, p.url))}</loc>`,
          `    <lastmod>${today}</lastmod>`,
          `    <priority>${p.url === '' ? '1.0' : '0.8'}</priority>`,
          '  </url>',
        ].join('\n'),
      )
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
      })
    },
  }
}
