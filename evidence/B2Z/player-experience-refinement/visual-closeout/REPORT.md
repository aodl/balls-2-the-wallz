# Final player-experience visual closeout

The four visual refinements and retained browser regressions pass locally.
**Hold deployment: hosted Browser failed; its verifier-only correction passes locally.**
Published `73e4686` is running CI 43170089810. Four substantive jobs passed, Browser
failed, and S14 is still running at the recorded snapshot below. The correction
requires a later exact-source run. No production operation is authorized here.

Starting branch: `release/btz-prelaunch-playability`, source and confirmed remote
`82425fbf02af7602330d0ed6d31dabe7d946ed77`. Previous reviewed `37d0eb6` remains
historical evidence; its verifier-only correction is preserved.

## Qualification boundary

[Run 43111462126](https://github.com/aodl/balls-2-the-wallz/actions/runs/43111462126)
passed Source conformance, Native conformance, Packaged DTR and clean consumers,
Runtime-lab Wasm, and Browser HTTP and Web Crypto. S14 and million-cell installed-IC
failed three seam-click waits. The production-inventory job is informational.
See [unchanged hosted conclusions](previous-ci.json).

The earlier Browser failure was a payment-field containment read during a finite
panel expansion. `82425fb` waits for actual settling and retains the exact assertions;
that hosted Browser gate passed. This closeout does not rewrite that record.

The installed failures were `torus_browser_scene_camera_and_continuous_supported_playback`,
`million_browser_normal_lifeline_and_cold_reconnect`, and
`million_browser_sustained_normal_and_cold_lifeline`, each waiting five seconds for
Move cell 0. Both one changed torus scene and its unchanged baseline passed locally
using the exact hosted normal Wasm `74ee4d172801e6d89987950376c4cda2015233ed605c967491e773c5b5a3f510`.
This is **not** a conclusive reproduction of the historical failure or a full
installed gate. [Local installed evidence](installed-local.json) preserves that limit.
The harness now flushes rendered layout after its direct camera mutation and
asserts that native input hits the board and canonical cell 0. It also ensures
an action is open without toggling it closed. The committed-target and exact
`MOVE 0` assertions remain unchanged; bounded pointer traces accompany failures.

## Implemented refinements

| Finding | Disposition | Change / acceptance |
| --- | --- | --- |
| Mobile preview under My cannon | Fixed | Suppress only redundant contextual navigation without changing chrome geometry; restore on Close/offscreen navigation. One interruptible source-and-preview accommodation per action/site/viewport. |
| Wireframe Build ghost | Fixed | Filled translucent shaded body and lighter barrel, depth-tested; soft contact, octagonal destination contour and no overlapping inner marker/opaque fill. |
| Lingering icon hints | Fixed | Native mouse title, genuine keyboard-focus hint, touch long-press without activation; activation/departure/dismissal clears custom hints. |
| Arena hierarchy | Fixed | Uniform restrained terrain lightness, quieter filtered internal lines and shallow deterministic edge relief; exact atlas and separate ownership boundaries retained. Barrel edge contrast slightly increased. |
| Panel/aim consistency | Restrained adjustment | Inset glass edge; existing fonts, warning contrast, 2/4px depth-tested guide and 44px aim target retained. Fixed toolbar slots and single scrollport remain. |

Affected contracts: UX-02/03/11 (context, accessible controls and card) map to
`player-refinement.test.mjs`, `verify_refinement_browser.py` and
`verify_visual_closeout.py`; UX-12 (truthful/seamless physical arena) maps to grid,
renderer-data, depth and real-speed motion checks. UX-04/05/06 remain protected by
actual-clock/source tests, clock/queue browser checks and the installed controlled
return. UX-07/08/09/10 retain exact payment, copy/freeze, no-report and fee/risk
assertions. UX-01/13 preserve anonymous certified observation and the paid world.
The [normative UX specification](../../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md)
retains all thirteen IDs and the [preceding 25-point report](../REPORT.md).

Changes are confined to renderer/materials, shell/composition and their tests and
maintenance documents. Canonical rules, prices, quotes, memo bytes, account binding,
receipts, elastic playback and Ledger ingestion are unchanged. The exact selected-
tile warning and separate wallet-fee information remain. No signing controls,
legacy-address controls, hex-memo controls or transaction-reporting flow were added.

## Evidence and release continuation

Executed tests, captures, measurements and the clean frozen manifest follow below.
Historical failed/incomplete evidence stays intact.
Production still serves the preceding ordinary fluid release: runtime `662f9052…`,
JavaScript `79acf867c1f4de2408c5aab50d457177d9d953048ea86c807db4692cac571e5a`,
manifest `68116cee…`. [Read-only starting audit](production-start-files.json) matched
all fifteen public files/security headers and the preserved consumed upload policy.
Prior served/frozen assets remain available for a separately authorized rollback.

No backend install/upgrade/reset/start/stop, setting/controller change, financial
operation, production publication or ICRC-2 activation occurred. Autonomous paid
gameplay was not paused. Local IC transfers were valueless disposable fixtures.


## Clean runtime and artifacts

Runtime source: **`b0f6c7a0cb9f3b9f9159d28d8708588fc8bc5af0`**. The established builder
ran once with a clean working tree (`source_dirty: false`), mainnet policy and the
existing European backend binding. [Build provenance](build-manifest.json) and
[complete actual-file manifest](frontend-files.json) preserve all **16 actual files**:
15 public assets plus consumed `.ic-assets.json5`, including the unchanged cursor.

- JavaScript: `42f30ead0cb709c8a961aa6be1289f37d9a9b103d709eb89edf1aa9ffa888dd5`
- Complete manifest: `216fac297573ff42e67ca0641c4a169acfa8bb4ea6b82c5e370e88abb2985fa2`
- Directory: `.work/player-refinement/visual-closeout/frozen/frontend`

Only `app.mjs`, `style.css` and `build-manifest.json` differ from the preceding
refinement freeze (`feb2ed6`, manifest `42f120d4…`). All configuration binaries,
Candid, destination/deployment binding, security/upload policy, icon and cursor are
byte-identical. [Preserved tree/blob identities](preserved-inputs.json) verify unchanged backend,
kernels, native code, deployment mapping and locks. No dependency/pin/lock, backend, kernel, canonical quote, payment
codec or delegated-payment input changed. The later evidence commit does not rebuild
or replace these runtime artifacts.
[Comparison with current production](production-candidate-diff.json) changes `app.mjs`, `build-manifest.json`, `index.html`, `style.css`.
That includes the preceding 25-point refinement which has not yet been deployed;
the final closeout is not a claim that production already has those controls.

The frozen bundle was served locally with its real security policy while querying
the actual European backend read-only. At all three widths it authenticated state
without Identify, validated the backend and default recipient, served every public
file byte-for-byte, and exercised unsigned copy instructions after a **local
account declaration**, not authenticated ownership. The observed packet was
`0.1 ICP`, text `FIRE 1 255 1`, exact UTF-8 bytes
`70 73 82 69 32 49 32 50 53 53 32 49`. There was no Ledger transaction or gameplay
update. This checks the new frozen bundle; **production still serves the old bytes**.

## Actual browser and visual evidence

[Input/artifact identities](evidence-inputs.json) record fixture/runtime/media hashes.
Before uses `82425fb` (verifier-only over `feb2ed6`); after uses the committed runtime
inputs, bundled through the maintained local canonical fixture. Production SDK boot
is separately checked above. [Matched poses](matched-before.json) agree exactly
with [candidate poses and acceptance](visual-results.json) for toolbar, Fire,
Build, intermediate and widest views at all three sizes.

| Scene | Before | After |
| --- | --- | --- |
| Desktop toolbar | [1440](media/before-1440-toolbar.png) | [1440](media/after-1440-toolbar.png) |
| Desktop Fire/payment | [1440](media/before-1440-fire.png) | [1440](media/after-1440-fire.png) |
| Desktop Build | [1440](media/before-1440-build.png) | [1440](media/after-1440-build.png) |
| Narrow Build | [390](media/before-390-build.png) | [390](media/after-390-build.png) |
| Small Build | [320](media/before-320-build.png) | [320](media/after-320-build.png) |
| Small Fire | [320](media/before-320-fire.png) | [320](media/after-320-fire.png) |
| Intermediate | [before](media/before-1440-intermediate.png) | [after](media/after-1440-intermediate.png) |
| Widest | [before](media/before-1440-wide.png) | [after](media/after-1440-wide.png) |

Actual-app recordings: [desktop](media/1440-journey.webm),
[390×844](media/390-journey.webm), [320×640](media/320-journey.webm). They cover
expansion, Build-site/heading changes, keyboard hints, focus/composition and
contracted viewports. Standard page video does not capture an OS cursor.
[Neutral](media/1440-ghost-neutral-palette-fixture.png) and
[contrasting](media/1440-ghost-contrasting-palette-fixture.png) ghost captures are
explicit **display-palette fixtures**, not claims of legal new ownership.
[Reduced transparency](media/320-reduced-transparency.png),
[forced colours](media/320-forced-colors.png) and
[300px contraction](media/320-keyboard-300.png) retain accessible content.

| Normal viewport | Toolbar drift | Fire scrollport/content | Keyboard contraction |
| --- | ---: | ---: | --- |
| 1440×900 | 0px | 362/362px | not applicable |
| 390×844 | 0px | 362/362px | 214px at H430; 96px at H300 |
| 320×640 | 0px | 245/361px | 214px at H430; 96px at H300 |

These are measured component layouts, not a promise for every native keyboard.
At H300 the preview remains visible and all six financial values/warnings are
reachable through the same scrollport; the aim gesture is hidden while precision
entry has focus. Dismissing the keyboard restores ordinary composition. Caret/focus
survives. Four eligible Build sites and four principal headings stay clear; angle
edits do not recenter. The 25-point suite retains multiple source locations, exact
canonical targets under camera changes, copied-packet safety, same-cell rejection,
DPR minimap picking and clock/queue identity. See [full refinement results](refinement-results.json).

The direct-camera layout regression deliberately puts canonical cell 0 under the
old `fire-action` button before a rendered layout, then observes `board` after
settling. This proves the harness race is possible, **not** that it conclusively
explains all three historical hosted failures. The actual installed seam helper is
also exercised against the maintained browser component with its cell-0 assertion.

During development the right-hand Build site exposed card overlap; constant
source-relative clearance fixed it without expansion drift. Keyboard contraction
then exposed a shrinking chrome band; a stable keyboard strip fixed that case.
The failed raw captures/logs remain under `.work/player-refinement/visual-closeout/`.
The preceding Browser CI failure and original refinement report are retained unchanged.

## Renderer, motion and bounded cost

[Grid pixel comparisons](grid-comparisons.json): **96 PASS**, scales 2.73/9.37/48.25/96,
all seams/corners, DPR 1/1.25/1.5/2. Maximum mean absolute RGBA difference 0.01294;
no sample fraction exceeded 8 channel levels. Existing fragmented-territory and
renderer preview-data assertions also pass; palette lookup/ownership truth is unchanged.

[Guide-depth comparisons](guide-depth.json): **16 PASS**, eight directions × two
zooms. Fixed guide: zero solid-interior overdraw pixels. Disabled-depth negative
control: up to 128. The guide remains visible beyond the body. No depth assertion
was relaxed for the material change.

Actual wall-time [before motion](media/before-motion.webm) and
[after motion](media/after-motion.webm) cover 0.01, 0.05 and 1 tick/s, working and
widest views. [Trickle before](media/before-0.01-working.png),
[Trickle after](media/after-0.01-working.png),
[Lifeline](media/after-0.05-working.png), [Normal](media/after-1-working.png).
[Raw motion samples](motion.json) retain measured time/displacement; its legacy
`deployed` label means the preceding **refinement fixture**, not current production.
The Trickle candidate sample has 17 retained tail segments and 11 bright pixels
outside the core. A white-pixel threshold alone is not a visibility verdict: the
Lifeline sampled streak remains visible in the actual image/video although no
pixel outside the core met that strict white threshold. Histories/lifetimes were
not changed here, and no future/stationary movement was introduced.

[Matched performance](performance.json) uses Chromium 153.0.8010.12, ANGLE Vulkan
SwiftShader Device/Subzero, headless Linux, emulated viewports, one-million-drawing-
pixel renderer cap. Five-second windows **without video encoding**, fixed 0.05
supported pace and the same maintained fixtures. Shared host, no exclusive CPU/GPU;
results vary and are not a hardware smoothness pass.

| Viewport | Scene | Before p50/p95 ms | After p50/p95 ms | Draw calls before→after |
| --- | --- | ---: | ---: | ---: |
| 1440×900 | six-entity-seam | 100.0/183.3 | 100.1/133.4 | 12→12 |
| 1440×900 | verified-motion-and-panel | 116.6/133.4 | 116.7/150.0 | 16→16 |
| 1440×900 | build-preview | 116.6/166.6 | 116.7/150.0 | 24→22 |
| 390×844 | six-entity-seam | 50.0/66.7 | 50.0/66.7 | 12→12 |
| 390×844 | verified-motion-and-panel | 50.0/66.7 | 50.1/83.3 | 16→16 |
| 390×844 | build-preview | 66.6/66.8 | 66.6/66.7 | 24→22 |
| 320×640 | six-entity-seam | 33.3/50.0 | 33.3/50.0 | 12→12 |
| 320×640 | verified-motion-and-panel | 33.4/50.1 | 33.4/50.1 | 16→16 |
| 320×640 | build-preview | 49.9/66.6 | 49.9/83.2 | 24→22 |

Seam geometry/textures remain 22/1, Fire 23/1; Build goes from 24 to 23 geometries
and 24 to 22 draws by removing competing overlays. Ownership atlas remains 4,000,000
bytes. Coarse reported JS heap is about 19.3–23.1MB; GPU texture memory is separate.
The sampled candidate Build has 6 active wake cells and 8 path points (limits 128
and 8,192 globally). No per-frame atlas reconstruction or added full-screen pass.
Five-second layout totals range 0–4.22ms; seam synthetic pointer-to-next-frame
samples range 4.2–8.4ms after versus 6.4–9.6ms before. These are synthetic dispatch
latencies, not native input or physical-phone measurements. Frame medians are
similar and tails vary both ways; no causal overall speedup is claimed, and these
short software samples do not demonstrate a material repeatable regression.
Earlier slow software measurements remain in the preceding report.

## Executed checks and remaining qualification

Primary commands (raw output root `.work/player-refinement/visual-closeout`):

```sh
node --test tests/js/player-refinement.test.mjs tests/js/camera.test.mjs tests/js/tactical-polish.test.mjs
python -B tools/verify_playability_actions.py --output .work/player-refinement/visual-closeout/playability-final
python -B tools/verify_refinement_browser.py --output .work/player-refinement/visual-closeout/refinement-final --video
python -B tools/verify_visual_closeout.py --fixture-dir .work/player-refinement/visual-closeout/refinement-final --output .work/player-refinement/visual-closeout/visual-final --video
python -B tools/verify_visual_closeout.py --fixture-dir .work/player-refinement/visual-closeout/before --output .work/player-refinement/visual-closeout/matched-before --baseline --pose-from .work/player-refinement/visual-closeout/visual-final/results.json
python -B tools/verify_tactical_grid.py --fixture-dir .work/player-refinement/visual-closeout/refinement-final --output .work/player-refinement/visual-closeout/grid-final
python -B tools/verify_fluid_depth.py --fixture-dir .work/player-refinement/visual-closeout/refinement-final --output .work/player-refinement/visual-closeout/depth-final
python -B tools/verify_fluid_browser.py --output .work/player-refinement/visual-closeout/fluid-final --video
python -B tools/verify_tactical_browser.py --fixture-dir .work/player-refinement/visual-closeout/refinement-final --output .work/player-refinement/visual-closeout/tactical-final
python -B tools/verify_refinement_motion.py --baseline .work/player-refinement/visual-closeout/before --candidate .work/player-refinement/visual-closeout/refinement-final --output .work/player-refinement/visual-closeout/motion-final
python -B tools/verify_fluid_performance.py --baseline .work/player-refinement/visual-closeout/before --candidate .work/player-refinement/visual-closeout/refinement-final --output .work/player-refinement/visual-closeout/performance-final --include-build
node tools/build_observer_playability.mjs --canister s5ir5-gqaaa-aaaas-amyna-cai --output .work/player-refinement/visual-closeout/frozen/frontend
python -B tools/verify_fluid_frozen.py --assets .work/player-refinement/visual-closeout/frozen/frontend --output .work/player-refinement/visual-closeout/frozen-browser
python -B tools/check.py browser --output .work/player-refinement/visual-closeout/http-final
python -B tools/check.py source --output .work/player-refinement/visual-closeout/source-final
```

Browser Python is `.work/browser-venv/bin/python` (3.11.14), Node 24.15.0;
`DFX_IDENTITY=codex_local`, with user-scoped Chromium libraries at
`/home/codexdev/.cache/browser-libs/root/usr/lib/x86_64-linux-gnu` via
`LD_LIBRARY_PATH`. [Executed browser commands](executed-browser.json) preserve exits
and durations. Focused JS: 32 PASS; all listed actual-component journeys and frozen
bundle/HTTP checks pass. [Source conformance](source-conformance.json): **26/26 PASS**, including **1,833 JS
and 199 Python tests**, zero JS skips; [HTTP/Web Crypto](http-conformance.json):
**PASS**. [Frozen browser](frozen-browser.json) and [final command durations](executed-final-gates.json)
retain the actual clean-runtime-source identity. Source gate ran once, with unchanged
per-check budgets; there was no broad-suite timeout or assertion failure in this closeout.

Genuine rendered hidden-tab execution, hardware-backed motion, physical phone/native
keyboard, non-Chromium browsers and real-wallet entry were **not established**.
No new unsupported headless hidden-state rerun is represented as native lifecycle
coverage. The actual installed 35s return uses controlled visibility and preserves
one clock/queue/session; existing elastic/pinned-clock tests remain mandatory.
There is no guarantee of motion after verified coverage is exhausted.

At the 11 November freeze, all six hosted jobs were pending. The owner then
published `73e468639801c23b15c139c1c72a2133cce86918`; the 12 November follow-up below
supersedes that pending snapshot. Inventory is informational. No gates, safety
budgets, certificate checks, financial assertions or runtime fixtures were
skipped/reclassified to obtain a green result.

## 12 November: published qualification and verifier-only follow-up

[Run 43170089810](https://github.com/aodl/balls-2-the-wallz/actions/runs/43170089810)
qualifies the published evidence head `73e4686`, with unchanged runtime `b0f6c7a`.
[Observed job metadata](qualification-43170089810.json) is an explicitly **non-final**
snapshot while S14 continues:

| Substantive job | Published `73e4686` result |
| --- | --- |
| Source conformance | PASS |
| Native conformance | PASS |
| Packaged DTR and clean consumers | PASS |
| Runtime-lab Wasm | PASS |
| Browser HTTP and Web Crypto | FAIL |
| S14 and million-cell installed-IC qualification | RUNNING — not a pass |

The Browser HTTP/Web Crypto substep passed, but the whole Browser job failed in
`verify_player_controls`, line 55, at 390×844. Its later tactical/fluid/refinement/
closeout steps were skipped by normal failure propagation and are **not** hosted
passes. [Original failure log](aim-entry-correction/original-browser-failure.log)
and [screenshot](aim-entry-correction/original-390-failure.png) remain intact.
The artifact ZIP was downloaded and verified against SHA-256
`ab8a925a26b101de2aadb9610985a4d7885758b5a8090143bc35abb38d3e7691`.

The assertion compared a camera sample taken during mobile Fire-entry composition
with the camera after an aim drag. Native pointer-down correctly samples/cancels
that transition from its current pose. The transition can advance between the old
sample and pointer-down without any camera movement caused by aiming.

This was reproduced against the **exact downloaded CI bundle**, whose SHA-256
`1e68fd0a0c5d5ba85cda958690b4d48951c3ca067b016a08ffe33af3b2a7a0ad`
identically matches the previously recorded local fixture. A controlled 1200ms
extension of the actual Fire-entry transition preserves the original failure;
waiting for entry settlement passes. [Controlled results](aim-entry-correction/reproduction.json):
the early sample was `[583.3824247420498,458.3824247420496,64]`, pointer-down
`[583.4626972125511,458.4626972125511,64]`, and the after-drag camera exactly equals
pointer-down with the controller inactive. Both paths prepare `FIRE 1 225 1`.
These controlled values demonstrate the mechanism, not unrecorded camera values
from the original hosted failure.

Correction `f926baa99809e4357a4c488672823faef273c03f` changes only the verifier
and its maintenance guidance. Before the original **unchanged strict camera-equality
assertion**, it uses existing `settled_panel()` to await the actual finite camera
and body transitions. A controlled pending transition proves that wait. A separate
native-pointer regression deliberately interrupts a 1200ms composition: the real
handle's pointer-down records cancellation, camera stays exactly at the captured
pose during the drag and 300ms after release, and the canonical memo remains exact.
No tolerance, assertion, security policy, rendering behaviour or runtime budget
was weakened. Controlled timing is confined to test fixtures.

[Corrected recorded playability](aim-entry-correction/corrected-playability.json)
passes desktop/390/320, including wallet/copy/security and original heading/camera
assertions. [Executed log](aim-entry-correction/corrected-playability.log) records
the held entry releasing and settling in 323.4ms, and captured-input cancellation.
All [199 Python tool tests](aim-entry-correction/python-tests.log) pass; documentation
links and Python syntax also pass. Browser command:

```sh
DFX_IDENTITY=codex_local LD_LIBRARY_PATH=/home/codexdev/.cache/browser-libs/root/usr/lib/x86_64-linux-gnu .work/browser-venv/bin/python -B tools/verify_playability_actions.py --output .work/player-refinement/visual-closeout/ci-final/corrected-playability
```

There is **no new runtime build**: all 16 frozen files and both frozen hashes remain
identical. Existing populated captures, renderer/physical/motion evidence and
backend/financial evidence retain their exact runtime inputs. No new production
or financial action occurred. The running S14 job is left undisturbed. Wait for
it to conclude before publishing the correction, because the existing workflow
uses `cancel-in-progress: true`. The correction still requires all six substantive
exact-source conclusions; four passes on its predecessor do not supply them.

## Release and rollback continuation — not executed

Remote Git remains owner-operated under [AGENTS.md](../../../../AGENTS.md).
After the current S14 run finishes, publish the final correction/evidence head
with ordinary non-force push to
`release/btz-prelaunch-playability`, then inspect all six exact-source conclusions.
No runtime rebuild is needed for evidence-only commits. Recommendation: **hold
frontend deployment until all six pass and the owner approves these exact hashes**.

After separate asset-only approval, follow the [installed-game operator procedure](../../../../docs/operations/S14_OPERATOR.md):
recheck production identities/health, preserve current served files/staging, verify
all 16 candidate bytes, stage only this frozen set, then use the existing observer-
only route with `--no-asset-upgrade`. Never name/install/upgrade the backend.
The established command, only after that approval/preflight, is:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

Verify all fifteen public served bytes/security headers and bounded production
journeys. For an approved rollback, stage the retained ordinary fluid set from
`.work/fluid-player-experience/frozen-arrival-jitter/frontend` (manifest `68116cee…`)
and use the same asset-only route. Its current served copies are also retained in
`.work/player-refinement/visual-closeout/production-read-only/served`; previous
refinement/tactical freezes remain. No automatic backend rollback/reset is permitted.
The final exact-source CI and owner asset-only approval are the concrete remaining
release requirements; device/hidden-tab/wallet limits above are coverage limits.
