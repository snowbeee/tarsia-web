# Deploying Tarsia Web

## What you're deploying

A **pure static site** — HTML, CSS and one JS bundle. There is no backend, no
database, no API keys and no server-side runtime. Parsing and rendering both
happen in the browser, which also means a `.fjsw` file a teacher opens never
leaves their machine.

Practically, any web server that can serve files will do, and there is
nothing to configure beyond where the files live.

## The one deployment

The site is **<https://tarsia.syrovy.tech>**, a Cloudflare Pages project
serving the root of that subdomain. There is no `www` variant and nothing to
redirect.

```bash
npm ci && npm run build && npx wrangler pages deploy dist
```

No environment variables: a plain build already knows where it is published.

To upload by hand instead — the Cloudflare dashboard takes a zip:

```bash
npm run build && npm run zip
```

That writes `tarsia-web-dist.zip`, holding the **contents** of `dist/` rather
than the directory itself, which is what the dashboard's upload expects.

## Build options

None of these are needed for the deployment above. They exist so the project
can be published somewhere else, or previewed without the preview competing
with the real site in search results.

| Variable | Effect |
|---|---|
| `SITE_URL` | Publish at a different address. Canonical URLs and the sitemap follow it. |
| `NOINDEX=1` | Mark every page `noindex` and write no sitemap. For a preview deploy. |
| `BASE_PATH` | Serve from a subdirectory, e.g. `BASE_PATH=/tarsia/`. Must have a trailing slash. |

`BASE_PATH` is baked into the asset URLs at build time, so a built `dist/`
cannot be relocated by moving the directory — rebuild instead. Getting it
wrong shows up as 404s on `/assets/*` and a blank page.

A build that is marked `noindex` states no canonical URL, because a canonical
is a claim to be the one true address of something worth indexing. Two live
copies of the same pages compete with each other in search, and the copy
sometimes wins, which is the whole reason the flag exists.

## What the build writes for search engines

Beyond the app itself:

- **Four indexable HTML pages**, not one. The app is on `index.html`;
  `open-fjsw-file/`, `tarsia-for-mac/` and `what-is-a-tarsia-puzzle/` are
  plain HTML with no script of their own. They exist because the app is a
  React root, and a React root is an empty `<div>` to anything that does not
  run JavaScript. Their text, and the text below the app on the homepage, is
  the part of this site a crawler can actually read.
- **`404.html`** — marked `noindex` and kept out of the sitemap, the nav and
  the footer. Cloudflare Pages serves it for any unmatched path, **with a 404
  status**. Without it, Pages answers every wrong URL with `index.html` and a
  200, so a crawler sees an unbounded supply of duplicate homepages. Don't
  remove it.
- **`robots.txt`** — allowing everything and pointing at the sitemap, or
  disallowing everything on a `NOINDEX=1` build.
- **`sitemap.xml`** — indexable builds only, since it lists absolute URLs.
- **`og.png`** — the card shown when somebody links the site in a chat or a
  post. It is committed, and regenerated only when it changes, by
  `node seo/make-og.mjs` (which needs Chrome installed).

Titles, descriptions, canonical URLs, social cards and structured data all
come from `seo/site.js` and `seo/faq.js`, and are written into each page by
`seo/plugin.js` at build time. They are not in the HTML files — add them
there and they will be duplicated.

### One Cloudflare quirk worth knowing

Cloudflare serves its **own** `robots.txt`. With Managed robots.txt enabled
(AI Crawl Control), the response is Cloudflare's, carrying content signals
and a list of blocked training crawlers. Our `Allow: /` does not conflict
with it, but the `Sitemap:` line may not survive. After a deploy:

```bash
curl -s https://tarsia.syrovy.tech/robots.txt | grep -i sitemap
```

If it is missing, submit the sitemap through Google Search Console instead —
which is worth doing regardless — or add the line in the Cloudflare dashboard.

## Serving it from your own web server

Cloudflare Pages needs none of this; it is here for anyone self-hosting a
copy. There is one HTML page per URL and no client-side router, so no rewrite
rules are needed. Uploaded puzzles go through a file input rather than an HTTP
request, so no upload limits or extra MIME types apply either. Dropping the
files in the right directory is enough.

The configuration below is only about caching, and it is worth doing:
`dist/assets/*` filenames contain a content hash, so they can be cached
indefinitely, while `index.html` must not be cached or browsers will keep
loading the previous release's assets.

### nginx

```nginx
root /var/www/tarsia;
index index.html;

location / {
    try_files $uri $uri/ =404;
    add_header Cache-Control "no-cache";
}

location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
}

error_page 404 /404.html;

gzip on;
gzip_types text/css application/javascript image/svg+xml;
```

`no-cache` still permits caching; it forces the revalidation, which the ETag
turns into a cheap 304. The `/assets/` block overrides it for the hashed
files, which genuinely are immutable. `index.html`, `favicon.svg` and
`icons.svg` are deliberately not covered by it — their names are stable, so
they must revalidate, or a browser keeps requesting the previous build's
asset filenames after a redeploy and the app fails to load.

### Apache

`.htaccess` in the deploy directory:

```apache
<IfModule mod_headers.c>
  <FilesMatch "\.(js|css|svg|woff2?)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  <FilesMatch "^index\.html$">
    Header set Cache-Control "no-cache"
  </FilesMatch>
</IfModule>

ErrorDocument 404 /404.html

<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css application/javascript image/svg+xml
</IfModule>
```

## Checking a deployment

1. The page loads with no console errors (a wrong `BASE_PATH` shows up here
   first, as 404s on `/assets/…`).
2. Opening a `.fjsw` file renders a puzzle. Sample files are in `samples/` in
   this repo — they are deliberately **not** in `public/`, so they are not
   part of the build and are never published.
3. The browser tab shows the favicon — it is the asset most likely to reveal
   a path mistake, because it is referenced from the HTML rather than the JS.
4. A wrong URL returns a real 404, not the app:
   `curl -o /dev/null -w '%{http_code}\n' https://tarsia.syrovy.tech/nope/`

## Notes

- HTTPS isn't required for anything to function, but browsers increasingly
  restrict features on plain HTTP, so prefer it.
- The bundle is ~230 kB (~72 kB gzipped), almost all of it React. Enabling
  compression on the server is worth more than any change to the app.
