// Fitting a piece of puzzle text into the space actually available for it.
//
// Per label: try 1, then 2, then 3 lines and take the fewest that still fit
// at a comfortable size. Breaks happen on whitespace only, so an equation is
// never split mid-expression — "3(2y + 11) = 4(4y + 2)" can wrap, but
// "100x=10000" can only shrink.
//
// Widths are measured rather than estimated from character counts, which are
// a poor proxy when content ranges from "8" to "Simplify (24x^2)/(6x)".
//
// `fitText` is shape-agnostic: the caller supplies `usableWidth(lineIndex)`,
// because how much room a line gets depends on the shape it sits in. A card
// gives every line the same width; a triangle edge does not (see
// `fitEdgeLabel` below).

const SVG_NS = 'http://www.w3.org/2000/svg'
const FALLBACK_WIDTH_PER_CHAR = 0.55 // only used when there's no DOM to measure in

let probe

function getProbe() {
  if (probe !== undefined) return probe
  if (typeof document === 'undefined') {
    probe = null
    return probe
  }
  const svg = document.createElementNS(SVG_NS, 'svg')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('width', '0')
  svg.setAttribute('height', '0')
  svg.style.position = 'absolute'
  svg.style.overflow = 'hidden'
  svg.style.visibility = 'hidden'
  const text = document.createElementNS(SVG_NS, 'text')
  // Must match how the labels are actually drawn, or the measurement is of a
  // different thing than the thing being measured. `geometricPrecision` asks
  // for ideal (unhinted, fractional) glyph advances; `normal` letter-spacing
  // pins a value the page's own CSS would otherwise supply to one of these
  // two elements and not the other.
  text.style.textRendering = 'geometricPrecision'
  text.style.letterSpacing = 'normal'
  svg.appendChild(text)
  document.body.appendChild(svg)
  probe = text
  return probe
}

let widthCache = new Map()

// Throw away what has been measured so far.
//
// The puzzle font arrives after the first render (see puzzleFont.js), and
// everything measured up to that point was measured in whatever the browser
// was substituting for it — narrower or wider, but not the font the labels
// will be drawn in.
export function resetTextMeasurement() {
  widthCache = new Map()
}

// Width of `str` per 1 unit of font size, measured at `refFontSize`.
//
// The reference size matters: glyph advances are NOT linear in font size.
// This probe is unscaled, so hinting rounds its advances up at small sizes —
// the same string measures ~20% wider per em at size 7 than at size 100.
// Callers should therefore measure at a size well clear of that range; see
// the note on SIDE in TriangleGridSvg.
export function unitWidth(str, fontFamily, refFontSize) {
  const cacheKey = `${fontFamily}\u0000${refFontSize}\u0000${str}`
  const cached = widthCache.get(cacheKey)
  if (cached !== undefined) return cached
  const el = getProbe()
  let w = 0
  if (el) {
    // Re-stated per measurement, not once when the probe was made: the family
    // is part of what is being asked, so it can't be whatever the first
    // caller happened to want.
    el.setAttribute('font-family', fontFamily)
    el.setAttribute('font-size', String(refFontSize))
    el.textContent = str
    w = el.getComputedTextLength() / refFontSize
  }
  if (!w) w = str.length * FALLBACK_WIDTH_PER_CHAR
  widthCache.set(cacheKey, w)
  return w
}

// Break `str` into exactly `n` whitespace-delimited lines of roughly equal
// width. Returns null when there aren't enough break points to make n lines.
function wrapInto(str, n, measure) {
  const words = str.trim().split(/\s+/)
  if (words.length < n) return null
  if (n === 1) return [words.join(' ')]

  const target = measure(words.join(' ')) / n
  const lines = []
  let current = []
  for (let i = 0; i < words.length; i++) {
    current.push(words[i])
    const linesStillToOpen = n - lines.length - 1
    if (linesStillToOpen === 0) continue // last line takes whatever is left
    const wordsLeft = words.length - i - 1
    // Break now if we've had our share, or if holding on any longer would
    // leave too few words to fill the remaining lines.
    if (wordsLeft === linesStillToOpen || measure(current.join(' ')) >= target) {
      lines.push(current.join(' '))
      current = []
    }
  }
  if (current.length) lines.push(current.join(' '))
  return lines.length === n ? lines : null
}

/**
 * Choose the line breaks and font size for one piece of text.
 *
 * @param {string} text
 * @param {object} opts
 * @param {(lineIndex: number) => number} opts.usableWidth room for the k-th line
 * @param {number} [opts.maxHeight] total room for all lines stacked, if bounded
 * @returns {{ lines: string[], fontSize: number }}
 */
export function fitText(text, opts) {
  const {
    fontFamily, usableWidth, maxHeight = Infinity,
    baseFontSize, minFontSize, comfortFontSize, lineHeight, maxLines,
  } = opts

  const measure = (str) => unitWidth(str, fontFamily, baseFontSize)

  const sizeFor = (lines) => {
    // Start from whatever the available height allows for this many lines,
    // then let each line's own width pull it down further.
    let fontSize = Math.min(baseFontSize, maxHeight / (lines.length * lineHeight))
    lines.forEach((line, k) => {
      const u = measure(line)
      if (u > 0) fontSize = Math.min(fontSize, usableWidth(k) / u)
    })
    return fontSize
  }

  let best = null
  for (let n = 1; n <= maxLines; n++) {
    const lines = wrapInto(text, n, measure)
    if (!lines) continue
    const fontSize = sizeFor(lines)
    // Fewest lines that reads comfortably wins.
    if (fontSize >= comfortFontSize) return { lines, fontSize }
    if (!best || fontSize > best.fontSize) best = { lines, fontSize }
  }

  // Nothing fit comfortably — take whichever arrangement got closest, and
  // floor the size so it stays readable even if it overhangs slightly.
  return { lines: best.lines, fontSize: Math.max(best.fontSize, minFontSize) }
}

/**
 * `fitText` for a label on a triangle's edge.
 *
 * The usable width is NOT the full side length, and — less obviously — it is
 * not governed by the triangle's own height either.
 *
 * A label has to share the triangle with the labels on the other two edges.
 * Draw the three lines from the centroid to the vertices and the triangle
 * splits into three sub-triangles, one per edge, and those are exactly the
 * three labels' territories: a label that stays inside its own cannot reach
 * another, because the regions are disjoint. Each sub-triangle has its edge
 * as base and the CENTROID as apex, so it closes to nothing at `apexDepth`
 * (HEIGHT/3) rather than at the full height — it narrows three times faster
 * than the triangle does.
 *
 * Measuring against the triangle's own height instead was wrong by that
 * factor of three, and it showed: on content with long labels, the label on
 * an edge and the label on the adjacent edge overlapped near the vertex they
 * share (3 collisions on the worst real sample, up to 25 units deep).
 *
 * Height is unbounded — what stops a label growing is its territory closing
 * in, not a ceiling.
 */
export function fitEdgeLabel(text, opts) {
  const { side, apexDepth, anchorDepth, baseFontSize, lineHeight, widthSafety } = opts
  return fitText(text, {
    ...opts,
    // Evaluated at the base font size rather than the size still being
    // solved for: deliberately conservative, since smaller text sits
    // shallower, where there is more room.
    usableWidth: (k) => {
      const d = anchorDepth + k * baseFontSize * lineHeight
      return Math.max(side * 0.15, side * (1 - d / apexDepth) * widthSafety)
    },
  })
}
