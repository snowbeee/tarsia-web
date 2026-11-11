import { useState } from 'react'
import { placedPairs } from '../layouts'
import PastePanel from './PastePanel.jsx'

// Editing a puzzle's content — the same list whether the puzzle was imported
// from a .fjsw file or created here.
//
// Only the fields the layout actually uses are shown. That is not the same as
// "a question and an answer for every pair": an extended hexagon's last 12
// entries are single decoys sitting on the outer rim with nothing to match,
// and a domino chain's final pair is a Start/Finish sentinel the layout never
// references. An editable box that changes nothing is worse than no box.
//
// For an imported puzzle, what's edited is the parser's plain-text rendering
// of the original MathML — `(x)/(4)`, `x^2` — because that is what gets
// drawn. The MathML itself isn't retained, which is why an import is a
// one-way edit and there is no "save back as .fjsw".
// A row counts as done once every field this layout actually places on it has
// something in it — which for an outer-edge decoy means the question alone.
const filledIn = (row) =>
  (!row.usesQuestion || row.pair.question.trim()) && (!row.usesAnswer || row.pair.answer.trim())

export default function PairEditor({ pairs, layout, onChange, onPaste, reset, describeHidden }) {
  const [pasting, setPasting] = useState(false)
  const rows = placedPairs(pairs, layout)

  const hidden = pairs.length - rows.length

  const done = rows.filter(filledIn).length
  // A pair with a question and no answer draws one half of a matching edge,
  // which prints as a puzzle that can't be solved. Worth saying before the
  // PDF rather than after it.
  const halfDone = rows.filter(
    (row) => row.usesQuestion && row.usesAnswer && !filledIn(row) && (row.pair.question.trim() || row.pair.answer.trim()),
  ).length

  return (
    <div className="editor">
      <div className="editor-head">
        <h2>Questions and answers</h2>
        <div className="editor-tools">
          {!pasting && (
            <button type="button" className="reset" onClick={() => setPasting(true)}>
              Paste a list…
            </button>
          )}
          {reset && (
            <button type="button" className="reset" onClick={reset.onClick} disabled={reset.disabled}>
              {reset.label}
            </button>
          )}
        </div>
      </div>

      {pasting && (
        <PastePanel
          slotCount={rows.length}
          onCancel={() => setPasting(false)}
          onUse={(parsed) => {
            if (onPaste(parsed)) setPasting(false)
          }}
        />
      )}

      {!pasting && (
        <>
      <p className="editor-note">
        <strong>
          {done} of {rows.length} filled in
        </strong>
        {halfDone > 0 && (
          <>
            {' — '}
            <span className="half">
              {halfDone} {halfDone === 1 ? 'has' : 'have'} only one side written
            </span>
          </>
        )}
        . Changes appear in the puzzle as you type and are included in the PDF.
        {hidden > 0 && ` ${describeHidden(hidden)}`}
      </p>

      <ol className="pair-list">
        {rows.map(({ pair, usesQuestion, usesAnswer }) => (
          <li key={pair.n}>
            <span className="pair-n">{pair.n}</span>
            <div className="pair-fields">
              {usesQuestion && (
                <label>
                  <span>{usesAnswer ? 'Question' : 'Outside edge — nothing matches it'}</span>
                  <input
                    type="text"
                    value={pair.question}
                    onChange={(e) => onChange(pair.n, 'question', e.target.value)}
                  />
                </label>
              )}
              {usesAnswer && (
                <label>
                  <span>Answer</span>
                  <input
                    type="text"
                    value={pair.answer}
                    onChange={(e) => onChange(pair.n, 'answer', e.target.value)}
                  />
                </label>
              )}
            </div>
          </li>
        ))}
      </ol>
        </>
      )}
    </div>
  )
}
