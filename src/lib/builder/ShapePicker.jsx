import { BUILDER_SHAPES, buildLayoutFromSpec, defaultSizeFor, summarise } from './templates'

// Choosing the shape and size of a puzzle being created.
//
// Every control takes effect immediately rather than behind an "apply", so
// the preview beside it answers "what does a 5 x 5 actually look like" as
// fast as it can be clicked. Nothing here discards content: changing shape
// keeps the questions already typed (see ensurePairs), which is what makes
// trying the options out safe.
export default function ShapePicker({ spec, onChange }) {
  const shape = BUILDER_SHAPES.find((s) => s.key === spec.shape)
  if (!shape) return null

  const { pieces, matched, decoys } = summarise(buildLayoutFromSpec(spec))

  return (
    <div className="picker">
      <div className="shape-row" role="group" aria-label="Puzzle shape">
        {BUILDER_SHAPES.map((option) => (
          <button
            key={option.key}
            type="button"
            className={option.key === spec.shape ? 'shape on' : 'shape'}
            aria-pressed={option.key === spec.shape}
            onClick={() => onChange({ ...spec, shape: option.key, size: defaultSizeFor(option.key) })}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="picker-controls">
        <label>
          Size{' '}
          <select value={spec.size} onChange={(e) => onChange({ ...spec, size: e.target.value })}>
            {shape.sizes.map((size) => (
              <option key={size.value} value={size.value}>
                {size.label}
              </option>
            ))}
          </select>
        </label>

        {shape.hasBorder && (
          <label className="check" title="Puts a value on the outer edges too, so a blank edge no longer tells a student which pieces face outwards.">
            <input
              type="checkbox"
              checked={Boolean(spec.fillBorder)}
              onChange={(e) => onChange({ ...spec, fillBorder: e.target.checked })}
            />{' '}
            Label the outside edges as well
          </label>
        )}
      </div>

      <p className="picker-summary">
        {shape.blurb}{' '}
        <strong>
          {pieces} pieces to cut out, {matched} pairs to write
          {decoys > 0 ? `, plus ${decoys} outside-edge labels` : ''}.
        </strong>
      </p>
    </div>
  )
}
