# Stable payment-panel closeout

**Qualification in progress; not deployed.** Starting source
`2fa267328173e9c979096f6a56bd2a5a802003b0`, implementation `777fb42`, branch
`release/btz-prelaunch-playability`. Hosted run
[43317023567](https://github.com/aodl/balls-2-the-wallz/actions/runs/43317023567)
passed Source, Native, Package consumers and Wasm, failed Browser, and its
installed-IC job was still running when this correction began. It subsequently
finished FAIL: the deployed-browser aim check observed 31.22° instead of 37.5°,
and the fixed-H exhaustion check sampled a stale HUD time. That source is
not fully qualified. The informational production inventory is not a release gate.

## Reproduction and cause

The hosted Build baseline was `(611,364,360,129)` and became
`(611,364,360,392)` on `status-failure`. A deterministic reproduction against the
unmodified 2fa2673 fixture produced `(661,334,360,129)` →
`(661,334,360,392)`; the explicit Locate pose explains the different anchor.
[Previous-source diagnostics](previous-source-regression.json),
[before](media/baseline-before.png), [after](media/baseline-after.png), and
[recording](media/previous-source-regression.webm) preserve the failure.
The regression intentionally exits nonzero against that source.

This was an application cache defect, exposed by fixture timing. It was not merely
a prematurely sampled CSS transition. A valid Move and valid Build have the same
natural payment-content height. Opening Build temporarily hides its prepared card;
a synchronous overlay reads 55px content and caches a 75px body target (129px total).
Selecting a valid Build site restores 318px content within the same task. The next
ResizeObserver delivery sees the same final size as its previous observation and
reports no change. Shell retains the intermediate target indefinitely, even after
all animations finish. A later top-status label resize invalidates the cache and
accidentally repairs the panel to a 338px body / 392px total. The quote, memo,
recipient, payer and warning did not change. See the
[original instrumented trace](trace-baseline.json) and
[corrected trace](trace-after.json).

The old settling helper checked only camera/CSS animations. It therefore accepted
a stable but wrong 129px panel. An independent fixture issue also overwrote injected
status with healthy on every playback frame. Both test issues are corrected;
neither justifies accepting stale sizing or stale copying.

## Small correction

Only `apps/b2z-observer/shell.mjs` changes frontend runtime behaviour. It observes
the natural panel-content box and meaningful content mutations (including hidden
content restored in one task), invalidates cached dimensions, and commits through
one coalesced animation frame. Disabled/ARIA readiness writes are excluded.
Redundant hidden-attribute assignments and mutations in hidden views are ignored.
Disposal cancels pending work and disconnects both observers. A read-only layout
snapshot exposes dirty/committed revisions to diagnostics, without triggering layout.

No CSS dimensions, positioning policy, financial preparation, renderer, playback,
network verification, backend, dependency or build configuration changed. Existing
viewport-based scrolling remains. There is no arbitrary fixed payment-panel height.

The common settling helper now requires a correct natural-content/body target,
completed accommodation/expansion, no dirty/pending layout work and four stable
ordinary frames. It never calls private positioning routines. The fixture retains
injected endpoint status until it changes, matching the normal application's
independent status lifecycle. Both normal application and fixture instantiate the
same arcade/shell components and advance/update them through ordinary frames.

Changed regression files: `tools/fluid_playability_browser.py`,
`tools/fixtures/playability-action-browser.mjs`, `tools/verify_human_corrections.py`,
`tools/panel_geometry_browser.py`, `tools/verify_panel_geometry.py`, and the existing
six-gate workflow's Browser step/artifact list. UX-03/06/12 and the frontend
operator procedure document the corrected sizing/settling contract.

## Installed-browser qualifier timing

The completed starting run independently failed two installed-browser checks.
The stationary aim journey computed a target before entry camera accommodation
settled; pointer-down correctly cancels that movement, making the earlier target
stale. It now uses the existing camera-settling predicate plus the strengthened
panel predicate before constructing the target. The exact 0.03° assertion remains.
The fixed-H test waited on a live clock object but immediately read `visibleTime`
from a HUD snapshot published every 100ms. It now additionally waits for HUD time
and the actual last-rendered playhead to equal the verified endpoint, then retains
the exact unchanged-time/head assertion. Neither correction changes playback,
trust admission, aiming math or the no-H+1 requirement. The corrected exact aiming and fixed-H endpoint assertions pass locally. The
first broader local run then failed sustained-motion assertions because it sampled
the immediate one-interval startup before the ordinary verified jitter reservoir
was filled. Its failure remains under `installed-general/`. The benchmark now
waits, bounded to 90 seconds, for natural coverage to reach the existing buffer
target with full presentation rate before starting the same 45-second trace.
Zero-stall, rate and no-resync assertions are unchanged; acquisition is separately
recorded rather than removed from startup evidence. Full installed reruns are
pending; final hosted installed-IC must pass independently.

## Transition results

[Matrix](matrix.json) and [reviewed per-state summary](geometry-summary.json):
24 action/context combinations, 192 state applications and 2,714 sampled frames/
immediate/settled points. Maximum workspace/header/body drift: **0px**; maximum
scroll-position drift: **0px**. Natural expansion commits before accepting the
baseline; status changes do not repair an earlier truncated panel.

| Viewport | Fire total height | Move / Build total height | Status drift |
| --- | ---: | ---: | ---: |
| 1440×900 | 416 | 392 | 0px |
| 390×844 | 416 | 392 | 0px |
| 320×640 | 295 | 295 | 0px |
| 390×430 keyboard contraction | 268 | 268 | 0px |
| 320×300 keyboard contraction / narrow landscape | 150 | 150 | 0px |

The three primary viewports also pass reduced motion. All six financial fields
remain reachable through the single scrollport, including the exact retained-payment
warning. The 320×300 capture is deliberately scrolled to that warning; it is a
bounded scrollport, not the former accidental truncated-content measurement.

Every action runs healthy → operational unavailable → restored → delivery failure
→ prolonged stale outage → recovered, plus long Waiting and short Live labels.
Each sampled state preserves selected cannon, chosen target, action, memo, amount,
recipient, payer, fee, risk warning, scroll, camera and pinned world/clock/queue.
Copy controls disable immediately during unsafe states and re-enable on recovery.
No Reconnecting paragraph enters the body. Same-world fixtures freeze a real
nonempty deterministic playback queue; they do not claim IC certificate evidence.
[Desktop diagnostics](1440-900-motion-Build-diagnostics.json) and
[contracted diagnostics](320-300-motion-Build-diagnostics.json) include content,
scroll, CSS targets, pending work, animation and camera state.

Populated screenshots: [desktop](media/1440-900-motion-Build.png),
[390px](media/390-844-motion-Build.png), [320px](media/320-640-motion-Build.png),
[contracted](media/320-300-motion-Build.png). Transition recordings:
[desktop](media/1440-900-motion.webm), [mobile](media/390-844-motion.webm),
[contracted](media/320-300-motion.webm),
[reduced motion](media/320-640-reduced.webm). These are emulated headless Chromium
viewports/touch and software rendering, not physical-device performance evidence.

Full raw output remains under `.work/panel-closeout/`: `baseline-ci-browser.log`,
`baseline-recorded/`, `trace-baseline/`, `trace-after/`, `matrix-first/`,
`human-after/`, `refinement/`, and `source/`, `source-py311/`, `installed-general/` and `certified/`. The first
source attempt used host Python 3.10 and failed its Python-3.11-only tools; it is
retained separately from the corrected complete Python 3.11 run. Earlier failing evidence remains
associated with its original source; it is not relabelled PASS.

## Local complete checks

Python 3.11 complete source verification passes **1,846 JS / 199 Python** tests
and all source/fixture/link checks. The focused panel matrix, three-viewport
human-input, refinement, visual closeout and fluid suites pass. Reviewed scope
summaries are adjacent to this report; complete raw logs remain under `.work/`.

## Preserved authority and release boundary

The earlier [human-playtest report](../REPORT.md) retains actual pinned-verifier
fixed-H/no-H+1 startup, fallback, historical/latest financial separation, all
5/30/90/180-second recoveries, hard verification barriers, read-only European
observations, hidden return, canonical wallet bytes, populated previews, direct
input, borderless minimap, tails and visual/performance evidence. Those runtime
inputs remain unchanged except shell layout measurement; complete final hosted
qualification must independently pass the installed-IC and browser assertions.

Frozen source/assets and six final hosted conclusions are pending. Local success
alone does not qualify a release. Preserve the currently deployed b0f6c7a assets
(JS `42f30ead0cb709c8a961aa6be1289f37d9a9b103d709eb89edf1aa9ffa888dd5`, complete
inventory `216fac297573ff42e67ca0641c4a169acfa8bb4ea6b82c5e370e88abb2985fa2`)
for frontend-only rollback using the existing operator procedure. No deployment
is authorized by this report. Production backend, paid world, financial authority,
Ledger accounts, settings, controllers and cycles remain untouched; ICRC-2 stays
disabled. No payment, allowance or production write was performed.
