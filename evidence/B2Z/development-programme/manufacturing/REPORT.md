# Manufacturing presentation candidate

The observer now uses local plans for explicit Cannon and Diverter construction.
Successful wallet preparation preserves the existing no-payment status. The
optional payment journal supplies a verified receipt only after checking the
exact transfer. The displayed structure removes the provisional scene from the
matching site without moving the presentation clock. The [manufacturing
contract](../../../../docs/specs/B2Z_MANUFACTURING.md) describes visual expiry,
payment scope and unknown automatic placement.

Four focused Node regressions passed. A sandboxed Chromium fixture ran actual
populated observer rendering at 1440×900, 390×844, 320×640 and 390×475. It
exercised rotation and reduced motion, recorded no shader or page errors and
kept the fixture's world bytes identical with manufacturing enabled or disabled.
Desktop Cannon and mobile Diverter captures were reviewed. The updated progress
bar remains visible above both models. The test uses controlled local plans.
Authenticated Ledger/Index outcome acceptance, native GPU qualification,
production packaging and the disposable same-ID upgrade/recovery rehearsal
remain open.

The scene added 12 draw calls at one site. Matched software-rendered p95 frame
periods varied from 16.8–200 ms across these short shared-host samples. At
390×844 the matched active and baseline periods were both 33.4 ms. This small
sample cannot establish production rendering cost. Measurements, full desktop
motion and viewport captures are in the [verified operator archive](fixture-archive.json).

Reproduce the focused render evidence with:

```sh
node --test tests/js/manufacturing.test.mjs
python3.11 -B tools/verify_manufacturing_browser.py --output .work/manufacturing-browser
```
