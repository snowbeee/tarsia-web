# The font the PDF is drawn in

`DejaVuSans-subset.ttf` is a cut-down copy of DejaVu Sans 2.37
(<https://dejavu-fonts.github.io>), whose licence is in `LICENSE-DejaVu.txt`
and must travel with it — the Bitstream Vera licence it inherits requires the
notice to be included in every copy.

DejaVu Sans rather than a Noto face because school maths needs Greek, the
mathematical operators, arrows and accented Latin *in one file*: in the Noto
family those live in Noto Sans, Noto Sans Math and Noto Sans Symbols 2
respectively, and three fonts means three downloads and three sets of metrics
to keep the text fitter honest about.

## Regenerating it

The full face is 757 KB, most of it writing systems a maths worksheet will
never ask for. The subset keeps the ranges that are plausible in a puzzle and
is 102 KB (57 KB over the wire, gzipped):

```sh
pip install fonttools
pyftsubset DejaVuSans.ttf \
  --unicodes='U+0020-007E,U+00A0-00FF,U+0100-017F,U+0300-036F,U+0370-03FF,U+2000-206F,U+2070-209F,U+2100-214F,U+2150-218F,U+2190-21FF,U+2200-22FF,U+2308-230B,U+25A0-25FF' \
  --layout-features='' --drop-tables+=GSUB,GPOS,MATH,GDEF \
  --no-hinting --name-IDs='0,1,2,3,4,5,6,13,14' \
  --output-file=DejaVuSans-subset.ttf
```

Those ranges are restated in `src/lib/render/font.js`, which is what the app
consults to warn about a character it cannot draw; `test/font.test.js` reads
this file's own character map and fails if the two ever disagree.

`--layout-features=''` and dropping GSUB/GPOS are not just about size. The
browser applies kerning and ligatures from those tables when it measures a
label; jsPDF, which draws it, does not — so leaving them in would make the
measurement and the drawing disagree about how wide the text is, which is the
one thing the fitter cannot survive. Hinting goes for the same reason it is
already opted out of on screen (`textRendering: geometricPrecision`): it
rounds glyph advances to whole pixels at small sizes.

The list of characters the subset ended up with — which is not the same as the
list of ranges asked for, since blocks have holes in them — is restated in
`src/lib/render/font.js` and regenerated from the file like this:

```sh
python3 -c "
from fontTools.ttLib import TTFont
cps = sorted(c for c, g in TTFont('DejaVuSans-subset.ttf').getBestCmap().items() if g != '.notdef')
runs = []
for c in cps:
    if runs and c == runs[-1][1] + 1: runs[-1][1] = c
    else: runs.append([c, c])
print(','.join(f'{a:x}' if a == b else f'{a:x}-{b:x}' for a, b in runs))
"
```
