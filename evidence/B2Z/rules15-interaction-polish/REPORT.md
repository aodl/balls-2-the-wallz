# Rules15 interaction polish

The qualification corrections and current frozen artifact are documented in
[Fast-track correction](FAST_TRACK.md). The original candidate and this
report’s original measurements remain available at the earlier source revision.

The frontend candidate is implemented and visually reviewed locally on
`feature/b2z-rules15-interaction-polish`. The production release still uses the
existing Rules15 frontend and backend. Hosted qualification for this candidate
requires owner publication of the feature branch.

| Item | Frozen identity |
|---|---|
| Clean runtime and asset source | `b3e73a1af8530df97b51a12238dadaca20f70826` |
| Raw embedded frontend Wasm SHA-256 | `c9e14e05f0dc436f6d7543bc5bb6de16b660650ef9fec10ab1ef66b85ac27685` |
| Raw Wasm size | 77,104,039 bytes |
| Public inventory | 86 assets with six gzip variants |
| Changed public assets | `app.mjs` and `style.css` |
| Deployed Rules15 backend SHA-256 | `8d7f1a670acb9f89646afbf715d05045079de0f6925367058476c88ac1da9d89` |

The clean observer build reproduced from the committed inventory and its
build record. The backend release gates still use the historical backend
inputs. The frontend job compares the hosted copy with the exact frozen
inventory and Wasm hash before independent reproducibility verification.

[Build provenance](artifacts/provenance.json) · [Module](artifacts/embedded-module.json) · [Public inventory](artifacts/embedded-inventory.json) · [Independent Wasm builds](artifacts/embedded-reproducibility.json) · [Installed HTTP proofs](artifacts/installed-http.json) · [Disposable browser result](artifacts/disposable-acceptance.json)

## Implementation and visual review

- A shared Three.js line buffer traces the picked tile with a 2.8 CSS-pixel
  stroke over a dark underlay. When the projected tile is less than eight
  pixels high, the marker keeps the exact centre with a compact fixed size.
  A crossed coral outline distinguishes invalid sites.
- Cannon and Diverter Move share a destination-relative card that keeps one
  scrollport within reach when docked. The source structure still owns Focus
  and command identity. The layout clears the destination and trims the
  incoming guide at the card edge.
- Under verified Rules15, clicking an empty owned tile opens Build Cannon
  with that exact cell. Ineligible sites remain selected with an explanation
  and Copy unavailable. The existing toolbar still switches to Build Diverter.
- The compass uses permanent black North, white East and West, and grey
  South faces. Each 34px face retains a 44px touch target. Compass buttons
  travel around the map during the world-space orbit while their glyphs stay
  upright.
- The displayed turret eases over 280ms along the shortest turn when an aim
  draft is restored or dismissed. The fixed base, draft angle, aiming guide
  and memo remain independent of the interpolation. Direct aim and reduced
  motion stay immediate. An interpolating visible turret changes its own
  instance matrix while cached terrain and other structures retain their
  existing upload paths.

[Matched captures, distant movement and animation frames](VISUAL_REVIEW.md)

## Qualification status

| Check | Result |
|---|---|
| Source conformance | PASS, including 2,049 JavaScript tests, canonical heading sweep, Rules15 clearance, figure/path math, Shout, payment authority and playback |
| Chromium and Three.js fixture | PASS at 1440×900, 390×844 and 320×640, including Cannon and Diverter Move, native Copy, Keep/Update, automatic Build, compass and turret |
| Legacy cell-zero quantity pose | PASS at 320×640 and 347.15° |
| East-up narrow interaction | PASS through viewport contraction and the restored 320px touch aim-to-pinch case |
| Authenticated read-only browser | PASS for controlled request interruption and real Chromium hidden-tab recovery on the built candidate |
| Independent embedded Wasm builds | PASS, byte-identical output. Five independent single-byte asset mutations each changed the module hash. |
| Disposable immutable installation and delivery | PASS. Same-ID upgrade from the exact deployed predecessor, 86 certified assets, six gzip variants, GET/HEAD, 28 alternate routes, 60 FLAC checksums and decodes, and JS-disabled 404. |
| Hosted verification | Awaiting owner publication. The previous Rules15 run covers the installed baseline. |
| European installation | Existing frontend retained. Any candidate install requires separate owner authorisation. |

[Local source conformance](source-conformance.json) · [Interaction assertions](browser/interaction-results.json) · [Reconnect](browser/reconnect-result.json) · [Visibility](browser/visibility-result.json)

The 20:43 UTC certified sample retained Schema7, Adapter9, cursor 40180669,
open admissions and one-tick Trickle. Official account history and the
100,000,000 e8s paid total matched the production activation evidence. The
estimated margin for a fifth snapshot, one frontend upgrade, a compatible
reinstall, chunk storage and contingency is **434.762B cycles**. Physical
touch devices and P09 remain separate qualification items.

[Read-only production facts](production-read-only.json) · [Recovery budget and limited release procedure](RELEASE_PLAN.md)
