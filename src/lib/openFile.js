import { parseFjsw } from './fjswParser'
import {
  getLayoutForTemplate,
  KNOWN_BUT_UNSUPPORTED_TEMPLATES,
  UNSUPPORTED_TEMPLATE_NOTES,
  requiredPairCount,
} from './layouts'
import { ensurePairs, hasPairContent, looksLikeProject, parseProject } from './project'

/**
 * Turn the contents of an opened file into a puzzle, without touching anything.
 *
 * Deliberately separate from the component: nothing here can replace the
 * working copy, so a file that turns out to be unreadable — bad JSON, a
 * template with no geometry, a shape at a size this build doesn't offer —
 * cannot take the current puzzle down with it. The caller decides whether the
 * candidate is allowed to land, and can ask first.
 *
 * @returns {{ project: object, error?: undefined } | { project?: undefined, error: string }}
 *   A readable `error` for a file that parsed but can't be drawn; throws for
 *   one that couldn't be read at all.
 */
export function projectFromFileText(fileName, text) {
  if (looksLikeProject(fileName, text)) {
    return { project: parseProject(text) }
  }

  const parsed = parseFjsw(text)
  const matched = getLayoutForTemplate(parsed.templateId, parsed.pairs.length)
  if (!matched) {
    const known = KNOWN_BUT_UNSUPPORTED_TEMPLATES.includes(parsed.templateId)
    return {
      error: known
        ? `"${parsed.templateId}" is a template we recognise, but it can't be drawn. The questions and answers read fine (${parsed.pairs.length} pairs). ${UNSUPPORTED_TEMPLATE_NOTES[parsed.templateId] ?? ''}`.trim()
        : `Unrecognised template: "${parsed.templateId}". The questions/answers parsed fine (${parsed.pairs.length} pairs), but this is a template we haven't seen before.`,
    }
  }

  return {
    project: {
      title: fileName.replace(/\.fjsw$/i, ''),
      source: {
        kind: 'import',
        templateId: parsed.templateId,
        pairCount: parsed.pairs.length,
        fileName,
      },
      pairs: ensurePairs(parsed.pairs, requiredPairCount(matched)),
      baseline: parsed.pairs,
    },
  }
}

/**
 * Which puzzle should be in the app after opening `candidate`.
 *
 * Opening is destructive twice over: it replaces what is on screen, and the
 * autosave then replaces the browser draft, which until the teacher has saved
 * a file is the only other copy of the morning's typing. New already asks
 * before doing that; this is Open asking the same question. Returning
 * `current` unchanged on a cancel is what keeps the draft intact — nothing is
 * set, so nothing is autosaved.
 *
 * @param {() => boolean} confirmReplace asked only when work would be lost.
 */
export function replaceWorkingCopy(current, candidate, confirmReplace) {
  if (hasPairContent(current.pairs) && !confirmReplace()) return current
  return candidate
}
