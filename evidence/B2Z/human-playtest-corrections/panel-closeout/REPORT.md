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
The aiming test reads `__b2zExperience.composer`, a HUD snapshot emitted every
100ms, immediately after a three-step pointer move. Its reported 31.22° is exactly
the intermediate point toward 37.5°; a later local failure reported the analogous
262.6° intermediate point toward 270°. The initial camera-only explanation was
incomplete. The qualifier now traces camera, synchronous memo and HUD composer,
waits for the diagnostic snapshot to publish the exact final angle, then applies
the unchanged 0.03° assertion. Incorrect aiming still fails the bounded wait.
Stationary gesture entry also uses the existing camera/panel settling predicates;
manual camera interruption remains separately covered by native input tests.
The fixed-H test waited on a live clock object but immediately read `visibleTime`
from a HUD snapshot published every 100ms. It now additionally waits for HUD time
and the actual last-rendered playhead to equal the verified endpoint, then retains
the exact unchanged-time/head assertion. Neither correction changes playback,
trust admission, aiming math or the no-H+1 requirement. The corrected exact aiming and fixed-H endpoint assertions pass locally. The
first broader local run then failed sustained-motion assertions because it sampled
the immediate one-interval startup before the ordinary verified jitter reservoir
was filled. Its failure remains under `installed-general/`. The benchmark now
waits, bounded to 90 seconds, for natural coverage to reach the existing
presentation reserve (`clock target - publication interval`) before starting the
same 45-second trace. The clock target also includes the interval spent between
arrivals; requiring the entire target or an instantaneous rate alongside it was
an excessive new qualifier condition. Acquisition telemetry is retained on both
success and timeout.
Zero-stall, rate and no-resync assertions are unchanged; acquisition is separately
recorded rather than removed from startup evidence. The final named installed-browser rerun passes (416.464 seconds); the separate
certified lifecycle case passes (471.132 seconds). The complete hosted installed-IC
gate must still pass independently.

The installed Move journey also retained a second click from the former numeric
helper: `choose_cell()` now already emits native arena input. The redundant click
could become a double-click camera gesture. It is replaced by the existing
read-only canonical-cell commit wait; exact cell/memo/amount assertions remain.
The shared action-opening helper now observes camera/panel settlement before
constructing coordinate-based gestures. Dedicated interruption/double-click tests
continue exercising those interactions without this stationary-entry assumption.

The old unavailable-configuration negative case required permanent ERROR for an
HTTP 503. It now requires Reconnecting, disabled copies and automatic same-page
recovery after transport is restored. Tampered configuration and wrong certificate
root still require ERROR, the exact current verification-failure label, disabled
copies and no admitted connection. This aligns the qualifier with the required
transport/integrity distinction, without changing runtime verification.

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

Home navigation in the old shared helper used a fixed 250ms delay before
constructing a pointer target. The helper now waits for a stable camera, verifies
inverse canonical picking and checks the real DOM hit target. If the payment pane
covers that exact requested tile, it uses the existing Alt-arrow/Enter keyboard
selection without replacing the target or mutating hidden state. Normal-pointer
and keyboard paths remain native input. Failed diagnostics now read the actual
application composer rather than referencing a missing fixture global.

## Normal frontend lifecycle comparison

A [normal production-bundle session](normal-status-read-only.json) served the
frozen bytes from loopback with production security policy and actual mainnet
certificate/artifact verification. Only read-only operational requests were given
controlled HTTP 503 responses; game observation continued normally. There was no
private layout call, forced sizing, clock mutation or mocked game state.

At H=7054, all 153 samples preserve rectangle **(661,334,360,435)**, exact memo
`FIRE 1 248.89 1`, 0.1 ICP amount, recipient, public sending account, fee/warning,
camera and the same live session/clock objects. Expired operational confirmation
disables copying; restored real confirmation re-enables it. Clock remains bounded
by verified coverage. Maximum geometry drift: **0px**. Five operational requests
failed during the fault; all 78 browser POSTs were `/query` or `/read_state`.

The synchronous pointer-event trace also reproduces the original aim sampling
issue in the normal app: the memo progressed to `FIRE 1 248.89 1` (screen 37.5°)
while the diagnostic HUD still reported **31.22°**, with unchanged camera. Waiting
for that diagnostic snapshot fixes the test without delaying the actual local aim.
[Healthy](media/normal-healthy.png), [disabled](media/normal-operational-unavailable.png),
[recovered](media/normal-recovered.png), [recording](media/normal-status-read-only.webm).
This is a frozen candidate on loopback against the actual backend, not a claim
that these frontend bytes were deployed. No payment/gameplay command was sent.

## Local complete checks

Python 3.11 complete source verification passes **1,846 JS / 199 Python** tests
and all source/fixture/link checks. The focused panel matrix, three-viewport
human-input, refinement, visual closeout and fluid suites pass. Reviewed scope
summaries are adjacent to this report; complete raw logs remain under `.work/`.
The [installed browser summary](installed-browser-summary.json) records all 20
passing named journey checks. Sustained motion: zero stalled samples, production
0.9761, consumption 0.9805 and backend progress 0.9187 ticks/second, all within the
original bounds. Verified-reserve acquisition took 79,048.3ms in this controlled
post-receipt restart; this is separate from immediate historical startup visibility.
No-resync and rate assertions are unchanged. These are software-browser/disposable
producer observations, not production capacity or physical-device performance.

Intermediate dirty-worktree qualifier attempts are retained as FAIL under
`installed-general*`, `installed-exact-source`, `installed-current-qualification`
and `installed-release-qualification`. They exposed stale HUD samples, target
occlusion, obsolete transport failure expectations and overly strict new setup
predicates. They are not final-source CI conclusions and are not relabelled PASS.
A complete final-source rerun passes under `source-release/` (1,846 JS / 199 Python);
final qualifier input hashes are in [qualifier-inputs.json](qualifier-inputs.json).

## Preserved authority and release boundary

The earlier [human-playtest report](../REPORT.md) retains actual pinned-verifier
fixed-H/no-H+1 startup, fallback, historical/latest financial separation, all
5/30/90/180-second recoveries, hard verification barriers, read-only European
observations, hidden return, canonical wallet bytes, populated previews, direct
input, borderless minimap, tails and visual/performance evidence. Those runtime
inputs remain unchanged except shell layout measurement; complete final hosted
qualification must independently pass the installed-IC and browser assertions.

Runtime source is `ca8b1f821932cd3b2bd164c84b07935453d8fb6a`, frozen with
`source_dirty=false` under `.work/panel-closeout/frozen/frontend`. Exact identities:

- JavaScript SHA256: `9d45b94008d6f417c4d685c76d52b8a869af34c4b950aea395596ef13104014c` (2,010,198 bytes; +1,245 versus 777fb42).
- Build manifest SHA256: `0200b6b608e54fff7845fee671b0d1e786af1a5083af341a276e987e5cdd1be7`.
- Complete 16-file [inventory](frontend-files.json) SHA256: `f85e3ddf9b1ed38dd7b441162f7579707b5e7ef1c10c0612d0990795cb46e99c`.

Only `app.mjs` and `build-manifest.json` differ from the previous 777fb42 freeze.
[Build inputs](build-inputs.json) pin all bundle sources, builders, lock and copied
assets for subsequent qualifier/evidence-only identity checks; do not rebuild or
substitute the frozen candidate.

The new [certified run](certified-summary.json) passes fixed-H startup, genuine
elapsed 5/30/90/180-second outages, slow optional status, bounded historical timeout,
cold-outage recovery and wrong-root signature rejection in 471.132 seconds, using
the unchanged exact reviewed normal module. This is the named focused frontend
case, not an inferred full Candid/upgrade/ledger or production qualification.

An additional [frozen read-only smoke](frozen-read-only.json) uses actual mainnet
certificate verification and only `/query` and `/read_state` requests. H=7026:
authority 6,948.9ms, first verified frame 8,682.6ms, first observed motion 12,219.6ms;
optional predecessor acquisition 2 requests / 16,114 bytes / 788.6ms. Operating
state known at 8,682.6ms. These are one software-browser network sample, not a
performance comparison or production frontend behaviour claim. The installed
frontend was independently re-fetched and remains JS `42f30ead…`.

Six final hosted conclusions are pending. Local success alone does not qualify
a release. Normal HTTPS publication failed because no Git username/credentials
were available; ordinary SSH publication failed with public-key authentication.
The owner has been asked to push this branch with the normal non-force procedure.
No remote history was rewritten and no remote commit was manufactured to replace
the frozen source identity. Source publication is authorized; credentials are the
external dependency. The latest starting remote remains 2fa2673 until that push. Preserve the currently deployed b0f6c7a assets
(JS `42f30ead0cb709c8a961aa6be1289f37d9a9b103d709eb89edf1aa9ffa888dd5`, complete
inventory `216fac297573ff42e67ca0641c4a169acfa8bb4ea6b82c5e370e88abb2985fa2`)
for frontend-only rollback using the existing operator procedure. No deployment
is authorized by this report. Production backend, paid world, financial authority,
Ledger accounts, settings, controllers and cycles remain untouched; ICRC-2 stays
disabled. No payment, allowance or production write was performed.
