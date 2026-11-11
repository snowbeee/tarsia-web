# Tarsia Web — Project Plan

## 1. Summary

A web application that lets teachers:

1. **Upload** existing Tarsia puzzle files (`.fjsw`, produced by the Formulator Tarsia desktop app) and **view/solve** them in the browser.
2. **Create/recreate** Tarsia-style puzzles (triangles, dominoes, rectangles/match-up grids) from scratch, using their own question/answer content, and export them for classroom use (print-ready PDF, and/or a shareable web link students can solve interactively).

This removes the dependency on the old Windows-only Formulator Tarsia software and makes puzzles usable directly in-browser.

## 2. Background: what a `.fjsw` file actually is (CONFIRMED from real samples)

This was investigated directly against 11 real files and is no longer a guess.

- The files are produced by **"Formulator Jigsaw Edition 2005"** (Hermitech Laboratory) — a sibling product to Formulator Tarsia, hence `.fjsw` ("Formulator JigSaW").
- **The format is plain text XML** (not binary, not a zip container). Each file has an XML comment header identifying the software, then a root `<eqnpairs>` element containing:
  - `<author>`, `<institution>`, `<comments>` — metadata, usually empty in our samples
  - `<template id='...' .../>` — names a **fixed, named layout**, e.g. `standard hexagonal jigsaw 30`, `extended hexagonal jigsaw 30`, `standard triangular jigsaw 18`, `standard square jigsaw 24`, `dominos 12`, `matching rectangular cards 9x2`
  - `<gui-settings>` — remembers which UI tab/option was last active in the desktop app; not needed for our purposes, and **not usable as evidence about a layout**. Its `option-id='input.paired.N'` looks like a pair count but is the input table's cursor position: surveyed across all 17 samples, a 30-pair file can record 1, 28 or 30, and a 15-pair file records 12. It matches the pair count only when the author left the cursor on the last row.
  - A flat, **ordered list of `<eqnpair>` elements** — usually one per question/answer pair, containing two `<math>` blocks (MathML): the question, then its matching answer. **An `<eqnpair>` can also hold just one `<math>` block**, which is how the `extended hexagonal jigsaw 30` template stores the standalone decoy values for its border edges — so "eqnpair count" is not the same as "pair count", and a renderer must not assume it is.
- **Key discovery: the file does NOT store piece positions or edge geometry at all.** The puzzle's shape/tiling is entirely implied by the `template id` — the desktop app (and any compatible viewer) is expected to already know the fixed arrangement that goes with e.g. `"standard hexagonal jigsaw 30"`. This is actually good news: it means there's a small, finite set of named layouts to support rather than arbitrary geometry per file.
- **The "hexagonal" and "triangular" templates are both actually tilings of *triangles*** — "hexagonal" describes the overall hexagon-shaped outline of the puzzle (made of 24 small triangles), not that individual pieces are 6-sided. This was confirmed by finding and testing an open-source project that reproduces this exact geometry (see below) and rendering one of your real files with it — it correctly forms a hexagon.
- Templates found across your **16 sample files so far** (a 7th distinct template, `standard parquet jigsaw 15`, turned up in a second batch):

  | Template id | # eqnpairs stored | Geometry status |
  |---|---|---|
  | `standard hexagonal jigsaw 30` | 30 | **Confirmed & validated** — 24-triangle hexagon outline, tested end-to-end against a real file |
  | `standard triangular jigsaw 18` | 18 | **Confirmed & validated** — 16-triangle large-triangle outline |
  | `dominos 12` | 12 (11 real + 1 `Start`/`Finish` sentinel) | **Confirmed from content pattern**, verified against two independent samples — a linear chain of 12 domino tiles: `[Start\|Q1] [A1\|Q2] [A2\|Q3] ... [A11\|Finish]`. No triangle/hexagon geometry involved, just a row of rectangles. |
  | `matching rectangular cards 9x2` | 9 (18 cards) | **Confirmed from content** — a plain 2-column, 9-row grid of matching cards (no chain, no tiling puzzle at all — simplest of all the templates) |
  | `extended hexagonal jigsaw 30` | 42 (**30 pairs + 12 singles**) | **Confirmed & validated** — the same 24-triangle hexagon as the standard version. The 42 `<eqnpair>` elements are not 42 pairs: the first 30 hold two `<math>` blocks each, the last 12 hold only one. 30 pairs + 12 single values, and hexagon-30 has exactly 12 blank border edges. The 12 singles are decoys filling the outer rim, which in the standard version is blank (a blank edge otherwise tells a student "this faces outwards"). Verified against all 4 extended samples; the 30 real pairs still land on matching shared edges. |
  | `standard square jigsaw 24` | 25 stored, **can be partially filled** (one sample uses 8) | **Shape derived, edge order unverified.** 24 pairs need 24 shared edges; an m×n grid of squares has 2mn−m−n internal edges, and 2mn−m−n=24 has exactly two integer solutions, 1×25 and 4×4. 1×25 is a chain (which is what `dominos` already is) and "square jigsaw" means a square outline, so 4×4: 16 pieces, 24 shared edges, 16 blank border edges. What is **not** derivable is which pair sits on which edge — nothing in the file records it and there's no reference implementation. Unlike the extended-hexagon decoys this matters, because a wrong order makes the puzzle unsolvable while still looking right, so the layout is flagged `verified: false` and the app and PDF both warn. Also unexplained: the sample stores 25 `<eqnpair>` elements where every other template stores exactly its name-number; the 25th is ignored. |
  | `standard parquet jigsaw 15` | 15 | **Reconstructed and rendering.** A 12-piece "oval" rosette of **8 triangles + 4 squares**, the squares tilted ±30° (hence "parquet"): two central triangles pointing up/down, four tilted squares around them, six triangles forming the outer rim. 15 matched pairs on the shared edges and 10 blank border edges. Built from the prose description plus the angle arithmetic, which force the figure; the edge numbering is generated here rather than copied. See §7a. |

- **A working, MIT-licensed open-source reference implementation exists**: [tarsiamaker.co.uk](https://www.tarsiamaker.co.uk/) (source: [github.com/PeterGrahamJersey/tarsia-generator](https://github.com/PeterGrahamJersey/tarsia-generator), React + SVG). It doesn't read `.fjsw` directly (it has its own simpler save format), but it ships the **exact hardcoded grid layouts** (row/col position + which edge gets which question/answer number) for the big triangle (18-pair) and big hexagon (30-pair) shapes as plain JS data files. I pulled these down and tested one directly: parsing `solving_Linear_Equations_2.fjsw` and dropping its 30 equations onto the repo's hexagon grid data produced a correct, properly-formed hexagon puzzle on the first try — geometry confirmed working end-to-end against real content, not just theory.
- **Not covered by the reference repo**, and so worked out here from the files themselves: `extended hexagonal jigsaw 30` (solved — it reuses the repo's hexagon data and fills the 12 border edges; see the table above), `dominos 12` and `matching rectangular cards 9x2` (both solved from their content pattern), and `standard square jigsaw 24` / `standard parquet jigsaw 15` (still open — these need a few more real samples to diff against known pair counts, the approach that worked for the others).
- **A lesson worth keeping**: the extended-hexagon geometry looked like the hardest remaining problem and turned out to need no new geometry at all. The answer was in the file's own structure — counting `<math>` blocks per `<eqnpair>` rather than counting `<eqnpair>` elements. Worth re-reading the "useless" parts of a sample before assuming a template needs reverse-engineering.
- MathML → plain text conversion also works well: equations and inequalities (`x+4=11` / `x=7`, `2x+11 < 31` / `x < 10`, simultaneous-equation pairs, algebraic index expressions) all come through cleanly by walking the MathML tree (`mi`, `mn`, `mo`, `mfrac`, `msup`, `mfenced`, etc.). One gotcha found and fixed while testing: files use non-standard HTML entities (`&minus;`, `&nbsp;`, and potentially any HTML5 name) alongside standard XML ones (`&lt;`, `&amp;`); a naive "resolve every named entity" pass breaks the XML by turning `&lt;` into a literal `<`. The fix resolves everything **except** `amp`/`lt`/`gt`/`quot`/`apos` before XML parsing, using the HTML parser's own entity table rather than a hand-written list — a hand-written list was the first implementation and it failed on the first entity nobody had anticipated, taking the whole file with it. Two details matter: decoded text is re-escaped for XML (HTML defines `&AMP;` and `&LT;` too, which would otherwise inject a bare `&` or `<`), and partial matches are rejected (HTML honours some legacy references without their semicolon, so `&notanentity;` would otherwise silently become `¬anentity;`). Anything genuinely unrecognised is preserved literally instead of failing the import.
- Practical plan going forward:
  - Treat the **named template → fixed grid layout** as a lookup table, seeded with the two layouts already validated (triangular-18, hexagonal-30) and extended as more sample files/templates are gathered.
  - Build the **`.fjsw` parser** (XML + MathML‑to‑text) as its own small, already-proven module.
  - Keep the **puzzle data model as our own clean JSON schema** (below), so `.fjsw` import is just one adapter into it, and the manual builder / renderer / exporter never need to know about `.fjsw` at all.

## 3. Target users & core use cases

- **Teacher uploads an old `.fjsw` file** → sees the puzzle rendered on screen → can solve it interactively, print it, or export pieces as images/PDF.
- **Teacher builds a new puzzle** → enters pairs of questions/answers → picks a layout (triangle puzzle of size N, domino chain, rectangle match-up) → app auto-arranges them so matches are edge-adjacent → preview, edit, export.
- **Students** (optional, phase 2) get a link to an interactive digital version: drag pieces to match edges, with instant right/wrong feedback — an alternative to printing and cutting out paper triangles.

## 4. Feature list

### MVP (Phase 1)
- [x] Upload a `.fjsw` file
- [x] Parse it into the internal puzzle JSON schema
- [x] Render the puzzle on screen (SVG), solved; the unsolved/scrambled arrangement is rendered for the PDF's cut-out page
- [x] Edit an imported puzzle's questions/answers, with live preview, and export the edited version to PDF (in-memory only — no write-back to `.fjsw`, which would need MathML generation)
- [x] Manual "puzzle builder": start from nothing — choose puzzle type (triangle, hexagon, squares, dominoes, cards) & size, type the Q/A pairs, and get a valid edge-matching layout generated (`src/lib/layouts/tiling.js`). Shared edges are derived from the cell set rather than tabulated, so sizes beyond the desktop app's fixed templates work, and matching content always lands on a shared edge by construction. Switching shape or size keeps what's been typed.
- [x] Export as print-ready PDF (pieces laid out to cut out, plus a solved answer key). PNG/SVG export: not done.
- [~] Save/restore: the working copy is autosaved to localStorage and restored on the next visit, and a puzzle can be saved to / opened from a `.tarsia.json` file (`src/lib/project.js`). A *library* of several puzzles — list, rename, delete — is still to do.

### Phase 2
- [ ] Interactive "solve in browser" mode for students (drag/rotate pieces, snap-to-match, completion check)
- [ ] Shareable link / classroom code so students can open a specific puzzle without login
- [ ] Further shape variety beyond triangle/hexagon: dominoes, rectangles
- [ ] Answer-key / difficulty randomization (shuffle piece placement each time)

### Phase 3 (stretch)
- [ ] Export back to `.fjsw` for teachers still using the desktop app
- [ ] Bulk import from spreadsheet (CSV/XLSX of Q/A pairs) → auto-build puzzle, skipping `.fjsw` entirely
- [ ] Auto-generate Q/A content suggestions from a topic (optional AI assist)
- [ ] Collaboration: multiple teachers sharing a puzzle bank

## 5. Data model (proposed)

Two layers: a small **library of named layouts** (the geometry — triangle positions and which local edge holds which numbered slot, like the `hexGrid`/`triangleGrid` data confirmed above), and a **puzzle instance** that's just an ordered list of Q/A pairs plus a reference to which layout to use. This mirrors exactly what `.fjsw` itself does — content and geometry are separate.

```json
// A layout, e.g. "hexagon-30" — one of these per template, built once and reused forever
{
  "layoutId": "hexagon-30",
  "shape": "triangle",
  "pairCount": 30,
  "cells": [
    { "row": 1, "col": 2, "slots": ["5q", "1q", null] },
    { "row": 1, "col": 3, "slots": [null, "1a", "2q"] }
    // ...24 cells total for hexagon-30
  ]
}

// A puzzle instance — what gets stored per teacher/per puzzle
{
  "id": "uuid",
  "title": "Simplifying Fractions",
  "layoutId": "hexagon-30",
  "pairs": [
    { "n": 1, "question": "x+4=11", "answer": "x=7" },
    { "n": 2, "question": "x-7=1", "answer": "x=8" }
  ],
  "meta": { "createdBy": "teacher_id", "createdAt": "ISO date", "source": "fjsw-import | builder" }
}
```

Rendering = look up the layout by `layoutId`, then for each cell substitute its slot codes (`"5q"`, `"1a"`, etc.) with the matching pair's question/answer text. The `.fjsw` importer's whole job is: read the `template id`, map it to a `layoutId`, and turn the ordered `<eqnpair>` list into `pairs`.

## 6. Suggested architecture

- **Frontend:** React (puzzle canvas rendered as SVG for crisp print/export; drag-and-drop for the builder and for student solve-mode) — can likely fork/reuse pieces of [tarsia-generator](https://github.com/PeterGrahamJersey/tarsia-generator) (MIT licensed) for the triangle-tiling render logic and the `hexGrid`/`triangleGrid` layout data, rather than building the geometry from scratch
- **Backend:** lightweight API (e.g. Node/Express or similar) for auth, puzzle storage, file upload handling
- **Parsing:** dedicated `fjsw-parser` module — XML parsing + a small MathML-to-text walker, both already proven against real files; outputs `{ layoutId, pairs }` per the data model above
- **Layout library:** small, hand-built set of named layouts (geometry only, no content) — seed with hexagon-30 and triangle-18 (already validated), add square-24/dominoes-12/rect-cards-9x2/extended-hexagon-30 as they're worked out
- **Export:** SVG → PDF conversion (e.g. via a headless renderer) for print output
- **Storage:** teacher accounts + puzzle library in a database (Postgres/SQLite to start); uploaded `.fjsw` files kept for re-processing if a layout gets refined later

## 7. Open questions / risks (updated — all 7 templates now render)

1. **Arrangement fidelity, not geometry.** No template is unmapped any more. What is still open for `standard square jigsaw 24` and `standard parquet jigsaw 15` is narrower than it used to be: both render and both *solve* — each answer sits on its own question's edge by construction — but neither file records which pair goes on which edge, so this app chooses, and a piece may not sit where the desktop app would put it. One printout from the desktop app settles both. The same "assumed, but can't affect solvability" applies to `extended hexagonal jigsaw 30`, where which decoy lands on which border edge is assigned in cell order; a border edge is matched against nothing, so any assignment gives the same puzzle.
2. Whether to render true jigsaw tab/blot piece outlines (interlocking puzzle-piece edges) vs. plain straight polygon edges — cosmetic, doesn't block function, can start with straight edges (as the reference repo does) and upgrade visuals later.
3. ~~Auto-layout algorithm for a **manually-built** puzzle with an arbitrary N~~ **Solved** by `src/lib/layouts/tiling.js`: a shape is described as a set of cells, the shared edges are derived from the geometry, and the pairs are numbered onto them. Correct by construction at any size, because the pieces and the answer key come from the same layout. This is also what unblocked parquet — see §7a.
4. Auth/accounts scope — is this single-teacher/local-only to start, or multi-user with login from day one?
5. Printing fidelity — partly settled. The sheet is vector rather than a screenshot, and the characters survive the trip now that the PDF carries its own font, with the screen measuring labels in that same font so a label that fits in the preview fits on paper. What is still open is page breaks: a large puzzle is shrunk to fit one sheet rather than spilling onto a second, and 24 hexagon-30 triangles at ~35 mm a side is about the floor of what cuts out usefully.

## 7a. Parquet: reconstructed, and why the licence question dissolved

`standard parquet jigsaw 15` now renders. This section used to record why it
did not; the history is worth keeping, because the way it unblocked is more
useful than the outcome.

**What it is.** A 12-piece "oval" rosette: 8 triangles and 4 squares, the
squares tilted ±30° — which is what gives it the parquet-flooring look. Two
triangles at the centre point up and down, four tilted squares sit around
them, and six more triangles form the outer rim. 15 question/answer pairs sit
on the shared edges; 10 border edges are blank.

**Why it was blocked.** Three independent lines of evidence agreed on the
shape: arithmetic done here before any source was found (8x3 + 4x4 = 40 slots
= 2x15 + 10 border edges); a published prose description of the template set
(narrowingthegaps.org — "a 12 piece 'oval' parquet puzzle made up of 4 squares
and 8 triangles"); and `jigsaw-generator`'s `parquet-layout.yaml`, which also
carries the full per-piece slot assignment and coordinates. That third source
is **GPL-3.0**, and copying its layout table would put copyleft obligations on
this whole app. So the template was left alone — a licensing decision, taken
deliberately.

**What changed.** The builder work brought in `src/lib/layouts/tiling.js`,
which derives a tiling's shared edges from the coordinates and numbers them
itself. That reframed the problem: the GPL file's contribution was the slot
assignment, and the slot assignment turns out not to be needed at all.

Two facts do the work:

1. **The numbering is free.** Both the cut-out pieces and the answer key are
   drawn from the same layout, so any assignment that puts an answer on its
   own question's edge yields a solvable puzzle. The desktop app's particular
   choice is one valid arrangement among many, not a fact to be recovered.
2. **The coordinates are forced.** Given the prose description, the figure
   builds itself. Two triangles sharing an edge make a 60/120 rhombus; a
   square stands on each of its four edges; and what is left at each rhombus
   vertex is then determined, because the angles have to reach 360°. At a
   60° vertex, 60 + 90 + 90 leaves 120° — two triangles. At a 120° vertex,
   120 + 90 + 90 leaves 60° — one. The rhombus has two of each, giving
   2x2 + 2x1 = 6 rim triangles: exactly the six the description calls for,
   with nothing left over and nothing to choose.

So `src/lib/layouts/parquet15.js` constructs the rosette from the rhombus
outward and hands it to `assignSharedEdges`. Nothing is taken from the GPL
file, and the earlier worry about a clean-room reimplementation being
unavailable does not arise: there is no table to reimplement.

**It checks out, rather than merely looking right.** The derived tiling comes
out as 12 pieces (8 triangles + 4 squares), every edge the same length, 15
shared edges and 10 border edges — the same arithmetic that was worked out
independently, before any source existed. Three routes agreeing (prose,
arithmetic, geometry) is what makes this the shape rather than a plausible
shape.

**What remains unverified** is only whether a given pair lands on the same
edge the desktop app would put it on. The layout carries `verified: false`
and the app and PDF both say so. A printout from the desktop app would settle
it — the same printout that would settle `square-24`.

## 8. Rough roadmap

| Phase | Focus | Outcome |
|---|---|---|
| 0 | ~~Investigate real `.fjsw` samples~~ **Done** | Format confirmed: plain XML, template-id + ordered Q/A pairs; hexagon-30 and triangle-18 geometry validated end-to-end; dominoes-12 and rect-cards-9x2 solved from content pattern |
| 0.5 | ~~Map remaining templates (extended-hex-30, square-24, parquet-15)~~ **Done** | All 7 known template types render; `square-24` and `parquet-15` carry `verified: false` for arrangement, not for shape |
| 1 | ~~Core schema + `.fjsw` importer + SVG renderer~~ **Done** | A teacher can open an old file, see it drawn, and edit what it says |
| 2 | ~~Manual puzzle builder (fixed sizes first)~~ **Done** | Six shapes at 27 sizes, each with or without filled border edges, generated rather than tabulated — so wider than the fixed sizes this row imagined |
| 3 | PDF export polish | **Part done.** Vector output, A4, orientation per page, and an embedded font so the print says what the teacher typed. Outstanding: spilling a large puzzle onto a second sheet rather than shrinking the pieces |
| 4 | Student interactive mode | Digital solving, no cutting required |
| 5 | Sharing, accounts, library | Multi-puzzle, multi-teacher use |

## 9. Where correctness is held

The claims above are not left to inspection. `npm test` runs node's own test
runner over `test/`, with no framework installed: the parser against every
sample file, saved-document validation against malformed input, every shape at
every offered size checked to be a solvable puzzle rather than merely a
drawing of one, the PDF's font coverage, and the nginx installer's rollback
path run against a stubbed `nginx`. A claim in this document that no longer
matches the code should be treated as a bug in the document.

---
*This is a living planning document. Phase 0 findings are backed by actually parsing and rendering real files — see `docs/renders/` for the reference images and `src/lib/` for the working parser/layouts/renderer this analysis produced.*
