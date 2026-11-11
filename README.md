# Tarsia Web

A web app for teachers to build cut-out matching puzzles, and to open, edit and
reprint existing Formulator Jigsaw (`.fjsw`) puzzle files.

📋 **[Full project plan — docs/PROJECT.md](docs/PROJECT.md)** — background,
data model, architecture, open questions, roadmap.

🔍 **[Getting it found and used — docs/SEO.md](docs/SEO.md)** — who else is in
this space, why the site targets `.fjsw` and "Tarsia without Windows" rather
than the contested head term, and the list of things that have to happen
outside the code.

🖼️ **[Reference renders — docs/renders/](docs/renders/)** — screenshots from
rendering real sample files against each solved layout, kept as evidence for
what's actually been verified vs. assumed.

## Status

What works right now:

- **Create a puzzle from scratch.** Pick a shape and size, type the questions
  and answers — or paste two columns straight out of a spreadsheet — and
  print it. The shapes are generated rather than hand-tabulated,
  so they come in sizes the desktop app never offered:

  | Shape | Sizes | Pieces | Pairs |
  |---|---|---|---|
  | Triangle | side 2–6 | 4–36 | 3–45 |
  | Hexagon | small / medium / large | 6–54 | 6–72 |
  | Squares | 2×2 – 5×5 | 4–25 | 4–40 |
  | Dominoes | 6–20 questions | 7–21 | 6–20 |
  | Matching cards | 6–20 pairs | 12–40 | 6–20 |

  Any of the tiled shapes can also have its **outside edges labelled**, the
  way `extended hexagonal jigsaw 30` does — a blank edge otherwise tells a
  student which pieces face outwards. Changing shape or size never discards
  what has been typed, so the options can be tried out freely.
- **Nothing is lost, and nothing is assumed.** The working copy is written to
  the browser as you type, but the app always opens on an empty puzzle: if
  there is a draft from last time it is *offered* above the shape picker, not
  restored over the top, and it survives being ignored for as long as nobody
  types. Starting to type, or pressing **New**, takes the offer away. **Save**
  writes the puzzle to a `.tarsia.json` file that **Open…** reads back.
- Upload a `.fjsw` file and see it rendered as SVG, for these template types:
  - `standard hexagonal jigsaw 30` (24 triangles tiled into a hexagon outline)
  - `extended hexagonal jigsaw 30` (the same hexagon, with the 12 outer border
    edges filled with decoy values instead of left blank)
  - `standard triangular jigsaw 18` (16 triangles tiled into a large triangle)
  - `dominos N` (any size — a linear chain of domino tiles)
  - `matching rectangular cards NxM` (any size — a plain two-column matching grid)
  - `standard square jigsaw 24` (4x4 grid of 16 square pieces) — **shape
    derived, arrangement unverified**; the app and the exported PDF both say so
  - `standard parquet jigsaw 15` (a 12-piece rosette of 8 triangles and 4
    squares) — **shape reconstructed, arrangement unverified**, same caveat
- Files using an unrecognised/unsupported template still parse successfully
  (you get a clear message instead of a crash) — their questions/answers are
  extracted correctly, there's just no layout/renderer for that shape yet.
- **Edit the content after importing**: the questions and answers appear in an
  editable list beside the puzzle, which redraws as you type, and the PDF
  exports whatever you've changed. Only the fields a template actually places
  are shown — an extended hexagon's 12 border decoys have no answer, and a
  domino chain's Start/Finish sentinel isn't shown at all. "Revert to file"
  goes back to what was imported. An imported puzzle's content can also be
  poured into a shape chosen here instead of the one its template names.
  There is no write-back to `.fjsw`: the parser flattens MathML to text on
  import, so the markup needed to write that format back out isn't retained —
  which is why **Save** uses its own format.
- **Download a print-ready PDF** of any supported puzzle: page 1 is the pieces
  cut apart, scrambled and rotated for students; page 2 is the solved puzzle
  as a teacher's answer key. Output is vector (not a screenshot), A4, and each
  page picks the orientation that makes the pieces largest. The scramble is
  seeded from the puzzle's own content, so the same file always produces the
  same sheet. Text is drawn in a font the app embeds rather than one of
  jsPDF's built-in Latin-1 faces, so a label prints as the teacher wrote it —
  and the font the labels are *measured* in on screen is the same one, which
  is what keeps a label that fits its tile in the preview fitting it on paper.

Verified against 18 real `.fjsw` files: all 18 parse without error and all 18
render. A file naming a template that has never been seen still parses, and
reports clearly rather than failing silently.

**Every template found in a real file now renders.** `standard parquet jigsaw
15` was the last holdout, and was blocked on a licence question that turned
out to be answerable: see [docs/PROJECT.md](docs/PROJECT.md) §7a.

## Why this should work at all: the `.fjsw` format

`.fjsw` files are plain XML (not binary), produced by Formulator Jigsaw
Edition 2005 (Hermitech Laboratory). Each file has a `<template id='...'/>`
naming a **fixed, known layout** (e.g. `"standard hexagonal jigsaw 30"`) and a
flat, ordered list of `<eqnpair>` elements — question + matching answer, each
written as MathML. Critically, **the file itself stores no piece positions or
edge geometry** — that's entirely implied by the template id, which the
original desktop app already "knows". So the whole problem splits into two
independent halves:

1. **Parsing** (`src/lib/fjswParser.js`) — turn a `.fjsw` file into
   `{ templateId, pairs }`. Same code regardless of template.
2. **Geometry** (`src/lib/layouts/`) — a small, hand-built library mapping
   each known `templateId` to a fixed layout describing which piece/edge
   shows which numbered slot. New templates just mean adding one more layout
   here — nothing else changes.

The hexagon-30 and triangle-18 geometries were ported from the MIT-licensed
[tarsia-generator](https://github.com/PeterGrahamJersey/tarsia-generator)
project (the code behind tarsiamaker.co.uk) and validated by actually
rendering real sample files against them. The dominoes and rect-cards
geometries were derived from analysing the content pattern of real sample
files (see comments in `src/lib/layouts/dominoChain.js` and `rectCards.js`
for the reasoning).

**Creating a puzzle is the easier half of the same problem**, and is handled
separately in `src/lib/layouts/tiling.js`. Importing has to reproduce a
numbering the desktop app chose and that can only be observed from outside —
which is why `square-24` has to carry a "this may not be right" caveat.
Creating is under no such constraint: the pieces and the answer key are drawn
from the same layout, so any numbering that puts each answer on its own
question's edge gives a puzzle that solves, exactly one way. So the shape is
described as a set of cells, the shared edges are derived from the geometry,
and the result is correct by construction at whatever size is asked for. The
derivation is checked against the ported layouts: the generated medium hexagon
comes out as the same 24 cells as `standard hexagonal jigsaw 30`.

## Project structure

```
docs/
  PROJECT.md            — full project plan (background, data model, roadmap)
  SEO.md                 — how the site is meant to be found, and by whom
  renders/                — reference PNGs from validating layouts against real files
index.html              — the app's page: a React root, plus written content below it
404.html                 — served for an unmatched path (noindex, not in the sitemap)
open-fjsw-file/         — a page of its own, no script: how to open a .fjsw file
tarsia-for-mac/          — a page of its own: Tarsia without Windows
what-is-a-tarsia-puzzle/  — a page of its own: what the format is, and how to teach with it
seo/
  site.js               — every page's title, description and URL, in one place
  faq.js                 — the questions each page answers (rendered AND marked up)
  plugin.js               — writes the <head>, nav, FAQ and footer at build time
  make-og.mjs              — redraws public/og.png, the social card (needs Chrome)
src/
  lib/
    fjswParser.js       — .fjsw XML + MathML → { templateId, pairs }
    resolveSlot.js       — looks up a layout slot code (e.g. "5q") against pairs
    layouts/
      index.js            — templateId -> layout lookup, slot-code helpers
      tiling.js            — derives shared edges from a cell set (created puzzles)
      hexagon30.js         — validated geometry (ported, MIT licensed)
      extendedHexagon30.js  — hexagon30 with its 12 border edges filled
      squareGrid24.js        — 4x4 square grid (unverified arrangement)
      parquet15.js           — 12-piece rosette, reconstructed (see PROJECT.md 7a)
      triangle18.js        — validated geometry (ported, MIT licensed)
      dominoChain.js        — generator: any N -> domino chain layout
      rectCards.js           — generator: any N -> rect-cards grid layout
    pieces.js            — solved layout -> separate scrambled pieces
    project.js            — save/restore a puzzle; source -> layout
    openFile.js            — an opened file -> a candidate puzzle, before it lands
    builder/
      templates.js          — the shapes and sizes a puzzle can be created in
      ShapePicker.jsx        — shape/size controls
    edit/
      PairEditor.jsx        — editable list of the questions and answers
      PastePanel.jsx         — paste a list in, with a preview before it lands
      pastePairs.js           — parses pasted text; lays it onto the rows a layout uses
    pdf/
      exportPuzzlePdf.jsx   — builds the worksheet + answer key PDF
    render/
      PuzzleView.jsx       — dispatches to the right renderer by shape
      PiecesView.jsx        — renders the cut-out sheet (scrambled pieces)
      SquareGridSvg.jsx      — renders square-grid layouts
      TriangleGridSvg.jsx   — renders triangle-tiling layouts
      PolygonTilingSvg.jsx   — renders tilings of arbitrary convex polygons
      fitText.js             — measures/wraps/sizes text to fit a given shape
      font.js                 — the one font both the screen and the PDF use
      puzzleFont.js            — fetches it, and hands it to the browser and jsPDF
      DominoChainSvg.jsx      — renders domino-chain layouts
      RectCardsSvg.jsx         — renders rect-cards layouts
  App.jsx                — toolbar and state, ties building/parsing/rendering together
  seo.css                 — styling for the written pages (no app styling in it)
  assets/
    fonts/                 — the embedded font, its licence, and how it was cut
samples/                 — real .fjsw files for manual testing (not built)
test/                    — regression checks: `npm test` (node's own runner, no framework)
DEPLOY.md                — build, Cloudflare deployment, and search-engine output
```

## Known rough edges (polish, not architecture)

- **`square-24` and `parquet-15` may be arranged differently from the desktop
  app.** Neither file records which pair sits on which edge, so this app
  chooses. Both still *solve*: each answer is placed on its own question's
  edge by construction, which is checked in the tests. What can't be confirmed
  without a desktop-app printout is whether a given pair lands where that app
  would have put it, so both layouts carry `verified: false` and both the app
  and the PDF say so.
  (An earlier version of this note claimed a wrong order could make `square-24`
  *unsolvable*. That was wrong — the layout writes each pair's `q` and `a`
  across one shared edge, whatever order the pairs are visited in.)
- **The PDF can only draw what the embedded font covers.** It is no longer
  Latin-1 — the puzzle is drawn in a cut-down DejaVu Sans that carries Greek,
  the mathematical operators, arrows, super/subscripts, combining marks and
  accented Latin, so `x ≥ 16`, `3α + 2`, `x → ×3 → 12` and `Čeština` print as
  written and nothing is substituted on the way out. What the subset leaves
  out — other scripts, the rarer symbol blocks — still cannot be drawn, so the
  export names those characters by codepoint in a note on the sheet rather
  than printing something else instead. See `src/assets/fonts/README.md` for
  the ranges and how to change them.
- **Decoy placement on `extended hexagonal jigsaw 30` is assumed, not
  verified**: the 12 border values are assigned to the 12 border edges in
  cell order, because the file records no ordering. This can't affect
  correctness — a border edge touches only one triangle, so it is never
  matched against anything — but the decoys may sit in different places
  around the rim than the desktop app would put them.
- **A created puzzle can't be saved as `.fjsw`.** Save uses this app's own
  JSON format. Writing `.fjsw` would mean generating MathML, and the template
  id would have to name one of the desktop app's fixed layouts — which most
  of the sizes offered here deliberately aren't.
- No accounts, and no library of saved puzzles: one working copy is kept in
  the browser, and anything else is a file on disk. See the project plan doc
  for the fuller roadmap.

## Running locally

```
npm install
npm run dev
```

`npm run lint` checks `src` (configured in `.oxlintrc.json`), and
`npm run build && npm run preview` serves the production build instead.
Sample `.fjsw` files for manual testing are in `samples/` — deliberately
outside `public/`, so they aren't part of the build.

`npm test` runs the regression checks in `test/`, on node's own runner — there
is no test framework here and there shouldn't be. They cover the parts where
being wrong is quiet rather than loud: what the MathML flattening does to an
exponent, what a malformed saved file is allowed to do to the puzzle you have
open, that every shape at every size offered really is a solvable puzzle rather
than merely a drawing of one, that the PDF prints the characters it was given,
and whether opening a file really leaves the working copy alone when it
rejects it (the deploy script's remote half is lifted out and run against a
stubbed `nginx`). The parser is given jsdom's `DOMParser`, since node has none;
`test/setup.js` does that and `test/resolve-like-vite.js` teaches node the
extensionless imports the app writes.

## Deploying

A pure static site with no backend. It is published at
**<https://tarsia.syrovy.tech>** on Cloudflare Pages:

```bash
npm run build && npx wrangler pages deploy dist
```

A plain build already knows that address, so no environment variables are
needed. `npm run zip` packs `dist/` for the Cloudflare dashboard's upload
instead. See **[DEPLOY.md](DEPLOY.md)** for publishing it elsewhere, for
self-hosting, and for what the build writes for search engines.

## Next steps

1. Confirm the `square-24` and `parquet-15` arrangements against a desktop-app
   printout. Both render and both solve; what a printout would settle is
   whether the pieces sit where that app puts them.
2. A library of saved puzzles, rather than one working copy plus files on disk.
3. PDF polish: piece size is capped by fitting everything on one sheet (24
   hexagon-30 triangles come out at ~35 mm a side). Spilling onto a second
   page when pieces would otherwise be small is the obvious next step.
