# Reference renders

Screenshots produced by actually parsing real `.fjsw` sample files and running
them through the layouts in `src/lib/layouts/` + the renderers in
`src/lib/render/`, then exporting to PNG for visual review. Kept here as
evidence of what's been verified against real data, not just assumed.

- **hexagon30.png** — `solving_Linear_Equations_2.fjsw` rendered against the
  `hexagon-30` layout. Confirms the "hexagonal jigsaw" template is really a
  24-triangle tiling forming a hexagon outline, and that content lands on the
  correct shared edges.
- **triangle18.png** — `simple_equations_1.fjsw` rendered against the
  `triangle-18` layout. Same confirmation for the large-triangle template.
- **dominoes.png** — `simple_linear_functions_1.fjsw` rendered against the
  domino-chain layout. Confirms the `Start`/`Finish` sentinel + chain
  hypothesis: tile 2's left half is literally tile 1's answer, chaining
  through to `Finish`.
- **rectcards.png** — `Solve_equations_flowcharts_part_1.fjsw` rendered as a
  plain two-column grid. Confirms this template has no tiling geometry at all.

Known issue visible in the hexagon/triangle renders: longer question/answer
text overflows its triangle's bounds instead of wrapping or shrinking to fit.
That's a typography fix still to do in `TriangleGridSvg.jsx` — the geometry
itself (which content lands on which shared edge) is correct in all four.
