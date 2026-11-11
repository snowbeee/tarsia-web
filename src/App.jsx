import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { requiredPairCount } from './lib/layouts'
import { DEFAULT_SPEC } from './lib/builder/templates'
import ShapePicker from './lib/builder/ShapePicker'
import PuzzleView from './lib/render/PuzzleView'
import PairEditor from './lib/edit/PairEditor.jsx'
import { buildPuzzlePdf, downloadBlob } from './lib/pdf/exportPuzzlePdf.jsx'
import { projectFromFileText, replaceWorkingCopy } from './lib/openFile'
import { loadPuzzleFont } from './lib/render/puzzleFont'
import {
  blankPairsFor,
  clearDraft,
  DEFAULT_TITLE,
  ensurePairs,
  hasPairContent,
  hasStarted,
  loadDraft,
  resolveLayout,
  saveDraft,
  serialiseProject,
} from './lib/project'
import './App.css'

function newPuzzle() {
  const source = { kind: 'new', spec: DEFAULT_SPEC }
  return {
    title: DEFAULT_TITLE,
    source,
    pairs: blankPairsFor(resolveLayout(source)),
    baseline: null,
  }
}

const describeHidden = {
  // Why entries exist that the puzzle doesn't draw differs by where the
  // puzzle came from, and so does what the reader should do about it.
  import: (n) =>
    `(${n} further ${n === 1 ? 'entry is' : 'entries are'} stored in the file but not placed anywhere by this template, so ${n === 1 ? 'it is' : 'they are'} not shown.)`,
  new: (n) =>
    `(${n} more ${n === 1 ? 'pair is' : 'pairs are'} written but unused at this size — kept in case you go back to a bigger shape.)`,
}

function App() {
  // Opening always starts blank. The previous working copy is still read — it
  // is offered back rather than restored over the top, because the app is as
  // likely to be opened to make a new puzzle as to finish an old one, and
  // being met by somebody else's equations is its own kind of wrong. Read
  // here, at the first possible moment, so it is in hand before the autosave
  // below can write over it.
  const [recovered, setRecovered] = useState(loadDraft)
  const [project, setProject] = useState(newPuzzle)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  // Only ever flipped to force one re-render; see the effect below.
  const [, setFontLoaded] = useState(false)
  const fileInput = useRef(null)

  const { title, source, pairs, baseline } = project
  const layout = useMemo(() => resolveLayout(source), [source])

  // Reading a file is asynchronous, and the typing goes on while it is read.
  // Whether opening would destroy work has to be decided against the puzzle as
  // it is when the file is ready to land, not as it was when it was picked.
  // Kept current in a layout effect, which runs as part of the commit — a
  // passive effect could still be queued when an awaited read comes back.
  const latest = useRef(project)
  useLayoutEffect(() => {
    latest.current = project
  }, [project])

  // Nothing has been typed yet and there is a draft on offer: writing the
  // blank puzzle now would overwrite the very thing the offer is for. Every
  // other state saves as it always did.
  const started = hasStarted(project)
  useEffect(() => {
    if (recovered && !started) return
    saveDraft(project)
  }, [project, recovered, started])

  // Fetched here rather than when the PDF is built, so the puzzle on screen
  // is laid out in the same font that will be printed. Labels rendered before
  // it arrives were measured in the fallback, so the re-render is the point:
  // it re-fits them. Failing is survivable on screen — the fallback is a
  // sans-serif too — so the error surfaces at export, where it is not.
  useEffect(() => {
    loadPuzzleFont().then(
      () => setFontLoaded(true),
      () => {},
    )
  }, [])

  const patch = (fields) => setProject((current) => ({ ...current, ...fields }))

  const updatePair = (n, field, value) =>
    setProject((current) => ({
      ...current,
      pairs: current.pairs.map((pair) => (pair.n === n ? { ...pair, [field]: value } : pair)),
    }))

  // Changing shape keeps everything already typed and only ever adds rows —
  // see ensurePairs. Trying a size out must not be a destructive act.
  const chooseSpec = (spec) =>
    setProject((current) => {
      const next = { kind: 'new', spec }
      return {
        ...current,
        source: next,
        pairs: ensurePairs(current.pairs, requiredPairCount(resolveLayout(next))),
      }
    })

  const hasContent = hasPairContent(pairs)

  // Compared against the imported content rather than tracked with a flag, so
  // editing a value and typing it back returns the button to disabled.
  const edited =
    baseline != null &&
    baseline.some(
      (was, i) => pairs[i]?.question !== was.question || pairs[i]?.answer !== was.answer,
    )

  const startNew = () => {
    if (hasContent && !window.confirm('Start a new puzzle? What you have typed will be cleared.')) return
    clearDraft()
    setProject(newPuzzle())
    setRecovered(null)
    setError(null)
  }

  // Taking the draft back makes it the working copy again, and the offer has
  // served its purpose. Clearing it also lets the autosave above resume.
  const restoreDraft = () => {
    setProject(recovered)
    setRecovered(null)
    setError(null)
  }

  const clearAll = () => {
    if (!window.confirm('Clear every question and answer?')) return
    patch({ pairs: blankPairsFor(layout), baseline: null })
  }

  const revert = () => patch({ pairs: ensurePairs(baseline, requiredPairCount(layout)) })

  const saveFile = () => {
    const blob = new Blob([serialiseProject(project)], { type: 'application/json' })
    downloadBlob(blob, `${title || 'puzzle'}.tarsia.json`)
  }

  const handleDownloadPdf = async () => {
    setBusy(true)
    setError(null)
    try {
      const blob = await buildPuzzlePdf({ layout, pairs, title: title || 'Puzzle' })
      downloadBlob(blob, `${title || 'puzzle'}.pdf`)
    } catch (e) {
      setError(`Could not build the PDF: ${e.message}`)
    } finally {
      setBusy(false)
    }
  }

  // Opening replaces everything, and until it has been saved the working copy
  // exists nowhere else — the autosaved draft is overwritten by whatever lands
  // here. So the file is read and fully validated first, and only then is the
  // teacher asked, exactly as New asks. A file that can't be read, or a cancel,
  // leaves both the puzzle and its draft alone.
  const handleFile = async (file) => {
    setError(null)
    try {
      const text = await file.text()
      const { project: candidate, error: why } = projectFromFileText(file.name, text)
      if (why) {
        setError(why)
        return
      }
      setProject(
        replaceWorkingCopy(latest.current, candidate, () =>
          window.confirm(`Open ${file.name}? What you have typed will be replaced.`),
        ),
      )
    } catch (e) {
      setError(e.message)
    }
  }

  const onInputChange = (e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Cleared so that picking the same file again re-opens it, which is what
    // someone who has edited the file on disk expects.
    e.target.value = ''
  }

  return (
    <div className="app">
      <h1>Tarsia Web</h1>
      <p className="subtitle">
        Build a cut-out matching puzzle, or open one made in the Formulator Tarsia desktop app.
      </p>

      <div className="toolbar">
        <input
          className="title-input"
          value={title}
          aria-label="Puzzle name"
          onChange={(e) => patch({ title: e.target.value })}
        />
        <button type="button" onClick={startNew}>
          New
        </button>
        <button type="button" onClick={() => fileInput.current?.click()}>
          Open…
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".fjsw,.json"
          className="hidden-input"
          onChange={onInputChange}
        />
        <button type="button" onClick={saveFile}>
          Save
        </button>
        <button type="button" className="download" onClick={handleDownloadPdf} disabled={busy}>
          {busy ? 'Building PDF…' : 'Download PDF'}
        </button>
      </div>

      {recovered && !started && (
        <p className="recovered">
          You left a puzzle unfinished last time
          {recovered.title && recovered.title !== DEFAULT_TITLE ? ` — “${recovered.title}”` : ''}.{' '}
          <button type="button" className="linkish" onClick={restoreDraft}>
            Pick it up where you left off
          </button>
          . Otherwise just start typing; it is kept until you do.
        </p>
      )}

      {source.kind === 'new' ? (
        <ShapePicker spec={source.spec} onChange={chooseSpec} />
      ) : (
        <p className="meta">
          From <strong>{source.fileName}</strong> — template <code>{source.templateId}</code>.{' '}
          <button type="button" className="linkish" onClick={() => chooseSpec(DEFAULT_SPEC)}>
            Put this content in a shape of my own
          </button>
        </p>
      )}

      {error && <p className="error">{error}</p>}

      {layout.verified === false && (
        <p className="warning">
          <strong>Unverified layout.</strong> {layout.unverifiedReason}
        </p>
      )}

      <div className="workspace">
        <div className="puzzle">
          <PuzzleView layout={layout} pairs={pairs} />
        </div>
        <PairEditor
          pairs={pairs}
          layout={layout}
          onChange={updatePair}
          describeHidden={describeHidden[source.kind]}
          reset={
            baseline
              ? { label: 'Revert to file', onClick: revert, disabled: !edited }
              : { label: 'Clear all', onClick: clearAll, disabled: !hasContent }
          }
        />
      </div>
    </div>
  )
}

export default App
