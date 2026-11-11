// Parser for Formulator Jigsaw Edition (.fjsw) files.
//
// .fjsw is plain XML. It stores an ordered list of <eqnpair> elements
// (each a question + matching answer, written as MathML) plus a
// <template id='...'/> that names a FIXED layout. The file itself never
// stores piece positions or edge geometry — that's implied entirely by
// the template id, which is why this parser's output is just
// { templateId, pairs } and geometry lives separately in ./layouts.

// Formulator emits HTML-style named entities (&minus;, &nbsp;, &alpha;, ...)
// which are not defined in XML. Leaving one in place doesn't just corrupt a
// character: the XML parser rejects the whole document, so a single Greek
// letter anywhere in a file made that entire puzzle impossible to open.
//
// This used to be a hand-written table of the entities that happened to
// appear in the samples to hand, which is precisely why it broke on the first
// one that didn't. Instead, decode with the HTML parser already available
// here — it carries the full HTML5 named-entity table and needs no upkeep.
const XML_BUILTIN_ENTITIES = new Set(['amp', 'lt', 'gt', 'quot', 'apos'])

const XML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' }
const escapeForXml = (text) => text.replace(/[&<>"']/g, (c) => XML_ESCAPES[c])

// Decoding is per distinct name, not per occurrence — a file can carry
// hundreds of &minus; and each parse is comparatively expensive.
const entityCache = new Map()

/** @returns {string|null} the character(s), or null if it isn't a named entity */
function decodeNamedEntity(name) {
  if (entityCache.has(name)) return entityCache.get(name)
  let decoded = null
  try {
    // `name` is [A-Za-z][A-Za-z0-9]* by construction, so there is no markup
    // here to inject.
    const doc = new DOMParser().parseFromString(`<!doctype html><body>&${name};`, 'text/html')
    const text = doc.body.textContent
    // An unrecognised entity comes back through the HTML parser untouched.
    //
    // A partial match also has to be rejected: HTML still honours a set of
    // legacy references written without their semicolon, so "&notanentity;"
    // matches "&not" and leaves "anentity;" as text, yielding "¬anentity;".
    // Since the input here always ends in a semicolon and no entity expands
    // to one, a trailing semicolon in the output means exactly that — only
    // part of the token was consumed, so it is not the entity it looks like.
    if (text && text !== `&${name};` && !text.endsWith(';')) decoded = text
  } catch {
    decoded = null
  }
  entityCache.set(name, decoded)
  return decoded
}

function resolveNonStandardEntities(xmlText) {
  return xmlText.replace(/&([a-zA-Z][a-zA-Z0-9]*);/g, (match, name) => {
    // The five XML built-ins have to survive to the XML parser: resolving
    // &lt; here would put a literal '<' into the document we are about to
    // parse. Numeric references (&#8722;) are valid XML already and the
    // pattern above deliberately doesn't match them.
    if (XML_BUILTIN_ENTITIES.has(name)) return match

    const decoded = decodeNamedEntity(name)
    if (decoded !== null) {
      // Re-escape, because some entities resolve to XML-significant
      // characters — HTML defines &AMP; and &LT; as well as the lowercase
      // forms, and emitting a bare '&' or '<' here would break the parse we
      // are trying to protect.
      return escapeForXml(decoded)
    }

    // Not a named entity at all (a typo, or something Formulator invented).
    // Escaping the ampersand keeps the document parseable and shows the
    // author what was written, rather than failing the whole import over one
    // unrecognised token.
    return `&amp;${name};`
  })
}

// Formulator's export occasionally emits a duplicated attribute on the
// same tag (seen in practice: <mtable columnalign="left" columnalign="left">).
// That's invalid XML and browsers/jsdom will refuse to parse it at all, so
// repair it by dropping repeats of an attribute name within one tag,
// keeping the first occurrence.
function repairDuplicateAttributes(xmlText) {
  return xmlText.replace(/<([a-zA-Z][\w:-]*)((?:\s+[\w:-]+\s*=\s*"[^"]*")+)\s*(\/?)>/g, (fullMatch, tagName, attrsBlob, selfClose) => {
    const attrPattern = /([\w:-]+)\s*=\s*"([^"]*)"/g
    const seen = new Set()
    let dedupedAttrs = ''
    let m
    while ((m = attrPattern.exec(attrsBlob)) !== null) {
      const [, attrName, attrValue] = m
      if (seen.has(attrName)) continue
      seen.add(attrName)
      dedupedAttrs += ` ${attrName}="${attrValue}"`
    }
    return `<${tagName}${dedupedAttrs}${selfClose ? ' /' : ''}>`
  })
}

// What is raised (or lowered) has its own scope in MathML, and flattening loses
// it: x with the exponent minus-one-half came out as "x^-(1)/(2)", which reads
// as x to the minus one, halved. That text is what a student is handed, and
// what goes into every saved file and PDF, so the scope has to survive the
// flattening even where that costs a bracket.
//
// Only the script is bracketed, never the base. The base needs none: linear
// text concatenates it exactly as the file draws it, left to right, and a base
// that really is a group carries its own brackets in the MathML already.
// Bracketing it would also actively misreport what Formulator writes, which
// puts the whole preceding run inside the base — "3a" with a raised 2, drawn
// as 3a², is msup(mrow(3, a), 2), and "(3a)^2" is nine times what that means.
//
// A script is left bare only when it cannot be misread: one letter (n), or one
// number (2, 25, 1.5), so x^2 stays x^2. Anything longer is a product or a sum
// even when it looks like a single word.
const BRACKET_PAIRS = { '(': ')', '[': ']', '{': '}' }

function isWhollyBracketed(text) {
  const open = text[0]
  const close = BRACKET_PAIRS[open]
  if (!close) return false
  let depth = 0
  for (let i = 0; i < text.length; i++) {
    if (text[i] === open) depth++
    else if (text[i] === close && --depth === 0) return i === text.length - 1
  }
  return false
}

function group(text) {
  if (text === '' || /^([A-Za-z]|\d+(\.\d+)?)$/.test(text) || isWhollyBracketed(text)) return text
  return `(${text})`
}

// Walk a MathML node and flatten it into a plain-text approximation.
// Good enough for typical school-maths content (equations, inequalities,
// fractions, powers, brackets, simultaneous-equation pairs, plain text).
// Not a full MathML renderer — for pixel-accurate typesetting we'd
// eventually want to keep the MathML around and render it with MathJax/
// KaTeX-mathml instead of flattening, but plain text is enough to get a
// puzzle on screen and to drive the builder / edit flows.
function mathMlToText(node) {
  if (!node) return ''
  const tag = node.tagName ? node.tagName.toLowerCase() : ''

  switch (tag) {
    case 'mi':
    case 'mn':
    case 'mtext':
      return (node.textContent || '').replace(/\u00a0/g, ' ')
    case 'mo':
      return (node.textContent || '').replace(/\u2212/g, '-')
    case 'msup': {
      const [base, exp] = Array.from(node.children)
      return mathMlToText(base) + '^' + group(mathMlToText(exp))
    }
    case 'msub': {
      const [base, sub] = Array.from(node.children)
      return mathMlToText(base) + '_' + group(mathMlToText(sub))
    }
    case 'mfrac': {
      const [num, den] = Array.from(node.children)
      return '(' + mathMlToText(num) + ')/(' + mathMlToText(den) + ')'
    }
    case 'msqrt':
      return 'sqrt(' + Array.from(node.children).map(mathMlToText).join('') + ')'
    case 'mfenced': {
      const open = node.getAttribute('open') || '('
      const close = node.getAttribute('close') || ')'
      return open + Array.from(node.children).map(mathMlToText).join('') + close
    }
    case 'mtable':
      // Each row of an mtable is its own line in the original — a pair of
      // simultaneous equations, or a table of values. Flattened onto one line
      // with nothing between them the rows run together: "x+y=7" followed by
      // "2x+y=8" reads as "x+y=72x+y=8", and a student sees 72. The comma
      // separates them and gives the label somewhere to wrap.
      return Array.from(node.children).map(mathMlToText).join(', ')
    case 'mtr':
      // And the cells within a row, for the same reason one level down. A
      // table of values for y = 2x + 2 was coming out as "y246810", which
      // could be read as 24, 68, 10 as easily as 2, 4, 6, 8, 10.
      return Array.from(node.children).map(mathMlToText).join(' ')
    case 'mmultiscripts': {
      // Simplified: just render the base, ignore pre/post scripts.
      const first = node.children[0]
      return first ? mathMlToText(first) : ''
    }
    case 'none':
      return ''
    default:
      // mrow, math, mtable, mtr, mtd, and anything else: concatenate children.
      return Array.from(node.children).map(mathMlToText).join('')
  }
}

/**
 * Parse a .fjsw file's text content.
 * @param {string} fileText - raw contents of the .fjsw file
 * @returns {{ templateId: string, pairs: {n:number, question:string, answer:string}[] }}
 */
export function parseFjsw(fileText) {
  const cleaned = repairDuplicateAttributes(resolveNonStandardEntities(fileText))

  const domParser = new DOMParser()
  const doc = domParser.parseFromString(cleaned, 'application/xml')

  const parserError = doc.querySelector('parsererror')
  if (parserError) {
    throw new Error('Could not parse .fjsw file as XML: ' + parserError.textContent.trim())
  }

  const templateEl = doc.querySelector('template')
  const templateId = templateEl ? templateEl.getAttribute('id') : null

  const eqnpairEls = Array.from(doc.querySelectorAll('eqnpair'))
  const pairs = eqnpairEls.map((el, index) => {
    const mathEls = el.querySelectorAll('math')
    const question = mathEls[0] ? mathMlToText(mathEls[0]).trim() : ''
    const answer = mathEls[1] ? mathMlToText(mathEls[1]).trim() : ''
    return { n: index + 1, question, answer }
  })

  return { templateId, pairs }
}
