# Edition card fonts

Committed so card generation needs no third-party fetch at render time — the
same reason the CSP allows no external origin in the browser.

The browser keeps using the site's system stacks; these files exist only
inside generated images, chosen as metric twins of those stacks so card and
page are one visual voice:

| File | Family | Stands in for | License |
| --- | --- | --- | --- |
| `Arimo-Bold-latin.woff`, `Arimo-Bold-latin-ext.woff` | Arimo Bold (Steve Matteson) | `--sans` — Arial/Helvetica Bold (Arimo is Arial-metric-compatible) | SIL Open Font License 1.1 |
| `DejaVuSansMono.ttf`, `DejaVuSansMono-Bold.ttf` | DejaVu Sans Mono | `--mono` — Menlo/Consolas (Menlo descends from the Vera/DejaVu design) | Bitstream Vera license (free redistribution) |

Arimo obtained from the Fontsource distribution (`@fontsource/arimo`,
licensed OFL-1.1); the two subsets register under one family and satori falls
through per glyph, so latin-ext covers display names with diacritics. DejaVu
obtained from the `dejavu-fonts-ttf` distribution. Nothing here is sold and
no reserved font name is used to name a derivative.
