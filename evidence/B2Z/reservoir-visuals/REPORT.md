# Reservoir rendering review

The fixture uses the shared B2Z arena renderer and isometric camera with
synthetic occupancy on the million-cell world. The excavation removes the
whole tile at ground level. Inward-facing walls are present only along dry
edges. The top picks up the adjacent ground colour with a slight highlight
and inner shadow. Walls darken down to a stable half-depth waterline.

A single world-anchored marbling field spans water quads and toroidal copies.
Its original baked palette and folds were authored against the supplied
concepts. No pixels from the reference images or videos are used. The shader
adds slow interior-biased flow, a second pearl layer, micro-ripples and sparse
moving glints and bubbles. The lower animated tier samples the same artwork
with simpler advection. Distant and reduced-motion views show still liquid.
The same texture and geometry back the static material used if the liquid
shader fails.

## Actual Chromium captures

- Merged, irregular and single pools in the same scene, [North](gallery-76-0.jpg),
  [East](gallery-76-1.jpg), [South](gallery-76-2.jpg) and [West](gallery-76-3.jpg).
- [Crossing both world seams](seam-70-0.jpg), [single tile](single-96-0.jpg),
  [narrow channel](channel-60-0.jpg), [far view](gallery-8-0.jpg) and
  [320px reduced motion](mobile-320.png).
- [Liquid motion and camera orbit](arena-orbit.webm), recorded in the browser.

Compared with the preferred reference, the finish has broad bands of cyan,
violet, pink and gold. The highlights read as soft ribbons at ordinary
playing zoom. The more complex reflected filaments and sparkle density
in the illustration are deliberately subdued in the renderer.

## Cost and failure tests

The packed mask uses 1,000,000 bytes. Editing one cell in the rectangle
updated one four-byte texel, one topology chunk and one geometry region.
Static occupancy produced zero additional mask uploads or topology builds
while measuring. The gallery used 3,192 bytes of geometry attributes
and added two draw calls. The 1,916-cell stress scene used 5,496 geometry
bytes and eight extra draw calls with its larger visible batch set. The
terrain program without a mask is used when the layer is offscreen or absent.

| 90 samples per condition, 1440×900 | RAF p50 / p95, ms | CPU draw p50 / p95, ms |
| --- | ---: | ---: |
| Dry control, forced busy-board redraws | 83.3 / 116.6 | 1.4 / 5.5 |
| Gallery, forced busy-board redraws | 133.4 / 200.0 | 2.0 / 7.5 |
| Coverage stress, forced busy-board redraws | 166.6 / 216.7 | 2.0 / 7.8 |
| Idle gallery, bounded decorative refresh | 16.7 / 16.7 | 0.1 / 0.2 |

This was Chromium using SwiftShader on a shared host. It measured foreground
RAF and CPU submission, with no GPU timer. Forced redraws had substantial
cost even in the dry control. The adaptive test observed hybrid → advection →
static under injected slow frame intervals. A static offscreen view caused
no decorative redraw. Native graphics hardware remains unmeasured.

The browser recovered after an actual WebGL context loss, and an intentionally
broken liquid shader activated the static material without taking down the arena.
The full [browser record](browser.json) covers these checks, the three viewport
sizes and the exact topology/edit counters. Node tests cover occupancy,
merged rectangles, exposed edges and toroidal joins.

Run `python -B tools/verify_reservoir_browser.py --output .work/reservoir-review`
with the repository's Playwright environment. Add `--serve` to open the
interactive fixture. Pick a layout, drag or wheel the board, or turn it with
N/E/S/W. The fixture is a visual review surface for the later versioned
construction and paid-state integration.
