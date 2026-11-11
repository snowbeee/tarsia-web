import { useMemo, useState } from 'react'
import { parsePastedPairs } from './pastePairs'

// Bringing in a list that already exists somewhere else.
//
// The parser has to guess — tabs, commas or neither — so nothing it guesses
// is applied until it has been shown. The preview is not a courtesy; it is
// what makes a liberal parser safe.

const PLACEHOLDER = '2 + 2\t4\n3x = 9\tx = 3\n½ + ¼\t¾'

export default function PastePanel({ slotCount, onUse, onCancel }) {
  const [text, setText] = useState('')
  const { pairs, notes } = useMemo(() => parsePastedPairs(text), [text])

  const spare = Math.max(0, pairs.length - slotCount)
  const preview = pairs.slice(0, 3)

  return (
    <div className="paste-panel">
      <p className="editor-note">
        Copy two columns from a spreadsheet and paste them here — questions in the first, answers
        in the second. A comma-separated list works too.
      </p>

      <textarea
        className="paste-box"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={PLACEHOLDER}
        aria-label="Paste your questions and answers"
        rows={8}
        autoFocus
      />

      {text.trim() !== '' && (
        <div className="paste-preview">
          <p>
            <strong>
              {pairs.length} {pairs.length === 1 ? 'pair' : 'pairs'}
            </strong>
            {pairs.length > 0 && ` — this shape has room for ${slotCount}.`}
            {spare > 0 &&
              ` The last ${spare} will be kept but not drawn until you pick a bigger shape.`}
          </p>

          {preview.length > 0 && (
            <ul className="paste-sample">
              {preview.map((pair, i) => (
                <li key={i}>
                  <span>{pair.question || <em>(blank)</em>}</span>
                  <span aria-hidden="true"> → </span>
                  <span>{pair.answer || <em>(no answer)</em>}</span>
                </li>
              ))}
              {pairs.length > preview.length && <li className="more">…and {pairs.length - preview.length} more</li>}
            </ul>
          )}

          {notes.map((note) => (
            <p className="paste-note" key={note}>
              {note}
            </p>
          ))}
        </div>
      )}

      <div className="paste-actions">
        <button
          type="button"
          className="download"
          onClick={() => onUse(pairs)}
          disabled={pairs.length === 0}
        >
          {pairs.length === 0 ? 'Nothing to use yet' : `Use these ${pairs.length}`}
        </button>
        <button type="button" className="reset" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
