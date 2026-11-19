# Browser acceptance

The dedicated test is `tools/verify_context_structure_browser.py`. It opens authenticated disposable observers at 1440×900, 390×844 and 320×640, checks context toolbars, real board targeting, Fire/Aim selection, Deflector direction and clipboard handoff. Captures and final assertions require a successful browser run. The hardware and real mobile device acceptance are separate.

The authenticated Trickle rehearsal passed at 1440×900, 390×844 and 320×640. All three browser contexts agreed on the verified Deflector IDs, cells and orientations. Tests checked automatic Fire, camera preservation on selection, explicit Focus, the exact selected construction site, four orientation memos, actual clipboard output `DROT 2 N`, the 0.0001 ICP display and explicit Update to the Deflector Move packet. Browsers used read-only source calls. [Machine results](disposable/browser/results.json)

| Viewport | Cannon Fire | Owned tile | Deflector construction | Reorient | Move |
| --- | --- | --- | --- | --- | --- |
| 1440×900 | [Capture](disposable/browser/1440-cannon-automatic-fire.png) | [Capture](disposable/browser/1440-owned-tile-toolbar.png) | [Capture](disposable/browser/1440-deflector-construction-payment.png) | [Capture](disposable/browser/1440-deflector-reorient-payment.png) | [Capture](disposable/browser/1440-deflector-move-payment.png) |
| 390×844 | [Capture](disposable/browser/390-cannon-automatic-fire.png) | [Capture](disposable/browser/390-owned-tile-toolbar.png) | [Capture](disposable/browser/390-deflector-construction-payment.png) | [Capture](disposable/browser/390-deflector-reorient-payment.png) | [Capture](disposable/browser/390-deflector-move-payment.png) |
| 320×640 | [Capture](disposable/browser/320-cannon-automatic-fire.png) | [Capture](disposable/browser/320-owned-tile-toolbar.png) | [Capture](disposable/browser/320-deflector-construction-payment.png) | [Capture](disposable/browser/320-deflector-reorient-payment.png) | [Capture](disposable/browser/320-deflector-move-payment.png) |

An earlier saturated local Normal run caught Copy correctly disabled with “Verification delayed”. The passing disposable run uses the intended Trickle pacing with authentic status replies. No freshness threshold or certificate rule was changed. This evidence is Chromium desktop and viewport emulation. It does not establish physical-device performance.

The existing independent quantity-browser matrix also passed on the current source, including the retained 320×640 cell-zero 347.15° pose and contracted viewports. [Quantity regression](disposable/browser/retained-quantity-results.json)
