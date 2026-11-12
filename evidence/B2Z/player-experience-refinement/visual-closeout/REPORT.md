# Final player-experience visual closeout

**Deployed and served-byte verified as a controlled frontend release:**
https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/.

All six substantive exact-source gates passed. The owner then approved this exact
frontend publication. The frozen 16-file set was published on 12 November using
only the existing asset route, without rebuilding or upgrading either canister's
Wasm. All fifteen public files and security headers match; the consumed upload
policy matches too. Desktop/390/320 production navigation and local previews pass.

**Active paid playtesting is currently blocked by the backend's pre-existing
Reserve Protection**, with admission closed. Copy controls stay disabled and the
interface reports “Game paused · low energy”. No top-up, recovery, policy change
or financial transaction was authorized or performed. The frontend is live; this
is not a claim that the paid world is advancing.

Qualified source: `d0d613ecfd4bb6935b2f32e93ea5b690a8b37411`.
Clean frozen runtime: `b0f6c7a0cb9f3b9f9159d28d8708588fc8bc5af0`.
Served JavaScript: `42f30ead0cb709c8a961aa6be1289f37d9a9b103d709eb89edf1aa9ffa888dd5`.
Complete 16-file manifest: `216fac297573ff42e67ca0641c4a169acfa8bb4ea6b82c5e370e88abb2985fa2`.

Starting branch: `release/btz-prelaunch-playability`, source and confirmed remote
`82425fbf02af7602330d0ed6d31dabe7d946ed77`. Previous reviewed `37d0eb6` remains
historical evidence; its verifier-only correction is preserved.

## Final hosted qualification — 12 November 2026

[Run 43172629735](https://github.com/aodl/balls-2-the-wallz/actions/runs/43172629735)
completed **SUCCESS** on the exact published `d0d613e` source, from 07:04:56 to
07:56:22 UTC. [Final job/artifact identities](qualification-43172629735.json):

| Required substantive gate | Conclusion |
| --- | --- |
| Source conformance | PASS |
| Native conformance | PASS |
| Packaged DTR and clean consumers | PASS |
| Runtime-lab Wasm | PASS |
| Browser HTTP and Web Crypto | PASS |
| S14 and million-cell installed-IC qualification | PASS |

The separate production-inventory job is informational and is **not** counted.
The Browser job ran the corrected native aiming guards and all downstream
projection, fluid, elastic, UXR-01..25 and final visual checks; [hosted excerpts](browser-qualified-excerpt.log)
record their execution. No skipped Browser step is represented as a pass.

The [installed qualification](installed-qualified.json) reports **58/58 checks PASS**,
including 50 exact installed cases across the existing suites. The three former
seam-wait failures now pass: torus scene 172.994s; million Normal/cold reconnect
238.082s; sustained Normal/cold Lifeline 1337.441s. The installed artifact ZIP is
preserved locally and verified against its published digest `b987017d…` (full hash
in the job/artifact record). No assertions, workloads or safety budgets changed.

[Runtime-input tree/blob identities](qualified-runtime-inputs.json) prove the
qualified source has identical application/configuration, dependency, backend,
native and builder inputs to the clean freeze. Its intervening verifier/guide and
evidence changes do not require a runtime rebuild. Existing populated captures
and software measurements therefore retain their explicit input provenance.

The earlier [43170089810 final record](qualification-43170089810-final.json) retains
four passes, Browser failure and S14 **CANCELLED**, following the owner's newer
push. That cancelled job supplies no qualification. Run 43172629735 independently
passed all six; no rerun of a failed job was used to disguise an unexplained failure.
The former pending snapshots and original failures below are historical, superseded
by this completed qualification.

## Earlier qualification — historical records retained

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
At the pre-release baseline, production served the preceding ordinary fluid release: runtime `662f9052…`,
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
That comparison includes the preceding 25-point refinement and this final closeout.
The actual later publication and served-byte verification are recorded below.

The frozen bundle was served locally with its real security policy while querying
the actual European backend read-only. At all three widths it authenticated state
without Identify, validated the backend and default recipient, served every public
file byte-for-byte, and exercised unsigned copy instructions after a **local
account declaration**, not authenticated ownership. The observed packet was
`0.1 ICP`, text `FIRE 1 255 1`, exact UTF-8 bytes
`70 73 82 69 32 49 32 50 53 53 32 49`. There was no Ledger transaction or gameplay
update. This was a pre-publication frozen-bundle check; production still served
the old bytes at that point. The actual subsequent deployment is recorded below.

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

## 12 November: earlier publication and verifier-only correction (historical)

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
or financial action occurred. At that snapshot the S14 job was running and no assistant push occurred. The
owner later published the correction, which cancelled that old job under existing
workflow concurrency. Its final cancellation and the succeeding complete six-gate
qualification are recorded above. The original four passes were never substituted
for qualification of the correction.

## Approved frontend publication — 12 November 2026

[Deployment summary](production/deployment.json), [exact served files and headers](production/served-files.json),
[signed asset inventory](production/inventory-after.json),
[preservation checks](production/preservation.json) and
[production browser results](production/browser-results.json) record the actual release.

The approved frozen set was staged at **08:22:40 UTC** and every served file was
verified by **08:23:31 UTC**. Existing staging was retained at
`.work/player-refinement/visual-closeout/deployment/prior-staged-assets`.
Fresh prior production files, verified against ordinary fluid manifest `68116cee…`,
are retained with its consumed policy as a complete 16-file rollback set in
`.work/player-refinement/visual-closeout/deployment/rollback/frontend`;
[rollback manifest](production/rollback-manifest.json). No ZIP or replacement build
was created. The candidate was rechecked before staging and again after publication.

Executed, with installed DFX 0.31.0 and existing `codex_local` operator:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

[Publication log](production/frontend-publication.log) names **observer only**.
The generic log says “Upgraded code”, but the installed frontend Wasm hash is
unchanged and `--no-asset-upgrade` explicitly skips it. No backend build, install,
upgrade, reinstall, start/stop, transition or configuration update occurred.
The existing frontend remains `s2jxj-liaaa-aaaas-amynq-cai`; backend binding remains
`s5ir5-gqaaa-aaaas-amyna-cai`. No new route, canister, signer or ICRC-2 enablement
was added. No payment or allowance was submitted, and no ICP/cycles were transferred.

### Actual served identities

All public HTTP files below match the complete approved manifest and the signed
asset-canister `list` inventory, including byte lengths. Required CSP and security
headers match on every file. `.ic-assets.json5` is consumed upload configuration,
not a publicly served sixteenth asset; its staged SHA-256 is also preserved below.

| File | SHA-256 | Result |
| --- | --- | --- |
| `.ic-assets.json5` | `096943a71e2351b550877318df3aa3a483ba9beeb57fe965a3249e4aa965ba9c` | PASS (consumed policy) |
| `/agent-api.md` | `ffbeb51fa266bdf5dc6309a14f6c3666125bd39aea969fd08af4ce1f83924b9a` | PASS |
| `/app.mjs` | `42f30ead0cb709c8a961aa6be1289f37d9a9b103d709eb89edf1aa9ffa888dd5` | PASS |
| `/backend.did` | `8ad63054b7c84a5a3c99e56eb54721995fcaedce99c324d87437620516c330be` | PASS |
| `/build-manifest.json` | `de724fcac68fa0fbb5183999cc3a8438b72c82328286b2f4094e4f48e55d7b7a` | PASS |
| `/configuration-entry.bin` | `8eca3f8f40c5b08df6e00a23cb900587eee7c28ff3ab3f6850c1bdb19fd5bd80` | PASS |
| `/configuration-legacy.bin` | `3d15acf9031e65816c33e3987fe5bb28fee8f9a5acf742d83a7d97db5e3cd622` | PASS |
| `/configuration-million.bin` | `cfd4fa714ee1c835b56e7f5939d9f1f56312bbbfc0c09775681e581dc3250c03` | PASS |
| `/configuration-playability.bin` | `e7a8db840b355bec688d553aef1a9891bc5c1a030bc24f89d8d546f1dd916e68` | PASS |
| `/configuration-torus.bin` | `6f06db2b7485f8c0bc116682e7a7f43317a3214f0d4d62bbc4d9b028ad11c9d4` | PASS |
| `/configuration.bin` | `05f9b342c37d7dd5e53d6f12dce90d2ba53988ec3c1ccfeaedd8906f51042a42` | PASS |
| `/cursors/reticle.svg` | `9c30f3fbd6be4a26691854d086584da0f4231b9a0a51e737d0a7c1f8edb8e892` | PASS |
| `/deployment.json` | `b68c8dfab2c537720b224ab5d4f403a6c8b026adb672ba82b1822de1206c7066` | PASS |
| `/icon.svg` | `2741efd82b7b00d4b2f1482e04140d7245e6afb08f1cf9905a93bb045e706888` | PASS |
| `/index.html` | `3b1fd4c34571c874a04c4125884ae90d802ad7c21b1b771932faa9ae5dc299f9` | PASS |
| `/style.css` | `c965f44bb0d3de4ad2fda61fa63734d8e06dc3766775bc8dc0d001a87cd8274d` | PASS |

### Production preflight and backend preservation

Certified mainnet metadata before/after/final agrees:

- Backend module: `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
- Frontend asset-canister Wasm: `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
- Subnet: `bkfrj-6k62g-dycql-7h53p-atvkj-zg4to-gaogh-netha-ptybj-ntsgw-rqe`, **13 nodes**.
- Controller sets and inspected allocation/freezing/memory/log settings are unchanged.
- Backend public status remains public; no setting change was made.
- Certified rules 7 / world schema 6, configuration identity, epoch and source binding
  are unchanged. The authenticated head remains 6508, root
  `12955c9d0763f333c06f206a32dd29c29eb366982715363f2f30a4a7e6cf9788`.
- Source remains official ICP Ledger `ryjl3-tyaaa-aaaaa-aaaba-cai` and Index
  `qhbym-qaaaa-aaaaa-aaafq-cai`, default subaccount 0 and receiver
  `c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`.
- Paid received total **100,000,000 e8s**, one cannon/one ball, source cursor
  **40180669**, run generation 1 and treasury conversion totals/last successful
  conversion remain preserved. Pending source records are zero; source binding is
  checked with no source error. No payment, history or world constructor was reset.

Final controller read (near 2026-11-12T08:35:24.150Z): **1,213,988,231,999 total cycles** and
**1,157,655,470,909 liquid cycles**. Liquid already excludes platform reserves;
we do not subtract again. Frontend balance: **1,461,716,247,048 cycles**.
Selected pace is **ReserveProtection**, nominal/supported **0**, admission **closed**.
Protection was present **before** publication (preflight total 1,216,016,687,031 /
liquid 1,159,683,925,941); it was not caused or bypassed by this frontend release.
Balances may legitimately decline through normal autonomous operations and asset
publication. No manual funding/repricing/threshold change occurred, and this single
snapshot is not a gross gameplay burn or runway estimate.

The existing treasury warning remains:
`icrc1_balance_of: CallRejected ... Call deadline has expired.`
Treasury is not operator-paused/halted and is in Idle phase, with last observed
receiving balance zero. No recovery action was attempted. Restoring active paid
play needs a separate owner financial/operational decision; it is outside this
frontend authorization. Do not send test ICP merely to verify the UI.

### Bounded actual production browser checks

Real served production data at **1440×900, 390×844 and 320×640** passes:

- Anonymous certified observation before Identify; the session uses the actual
  certificate verifier and correct backend/receiver binding.
- Public-account **local declaration** and restoration, cannon hover/selection,
  useful Focus, persistent selected footprint, single-row 44px toolbar slots and
  temporary My-cannon suppression. This is not authenticated ownership proof.
- Fire aiming/barrel preview, Move and additional Build local preparation, real
  eligible sites and exact canonical amount/principal/memo/payer comparisons.
  Same-cell Move cannot yield a new usable packet. At each width the observed
  examples are `FIRE 1 255 1` (0.1 ICP), `MOVE 1 997997`, and `NEW 225 1 1`.
- Exact Move/Build selected-tile warning and separate “Wallet fee extra.” remain
  readable/reachable through the single scrollport. Fire retains its ordinary
  no-automatic-refund warning. No legacy-address, hex-memo, signing or manual
  transaction-index controls exist. The canonical text is complete, not a
  truncated clipboard value.
- Local previews remain available under protection, but all new instruction copy
  controls stay disabled. **Enabled copy/freeze/Update/Keep previous and clipboard
  fallback cannot be exercised live in this protected state**; their unchanged
  source-qualified disposable evidence is retained, not bypassed or mislabelled
  as a live-wallet result.
- Zero toolbar drift across action switches, clean translucent Build ghost and
  source/destination distinction; no secondary My-cannon button over the preview.
- Native pan, accumulated zoom steps, widest non-repeating limit, diamond-centre
  navigation and actual displayed-ball following with preserved zoom. Account,
  Help (via Account), open/close and navigation preserve one session/clock/queue.
- Displayed verified time holds at **6505**, available coverage is exhausted
  (buffer 0), and a stationary followed ball/camera do not invent travel. The
  protected status takes priority over a misleading waiting/catch-up spinner.
  Advancing ball tails/wakes at .01/.05/1 tick/s remain supported by the unchanged
  runtime's qualified disposable recordings; no production motion was fabricated.
- A deliberately failed **optional** cycles query in the 320 context reports
  Unavailable while authenticated observation continues. That screenshot is a
  browser-local failure probe, not a claim of a production status outage.
- Separate browser-local configuration-byte tampering produces “Unable to verify
  game”, disables payment controls and hides the spinner. It never modified served
  bytes or fell back to unauthenticated observation.

Screens/captures: [desktop Fire](production/media/1440-fire.png),
[390 Build](production/media/390-build.png), [320 Build/risk scroll view](production/media/320-build.png),
[320 ball follow](production/media/320-follow.png);
[desktop recording](production/media/1440-journey.webm),
[390 recording](production/media/390-journey.webm),
[320 recording](production/media/320-journey.webm).
[Capture hashes](production/media-files.json) preserve actual application media.
Views scrolled to the risk warning intentionally show the bottom of the natural
scrollport; the same check reaches amount/recipient/memo/payer/fee as well.

Raw work is `.work/player-refinement/visual-closeout/deployment`. Earlier smoke
attempts are retained honestly: one assumed action **icons** must all be disabled
instead of checking disabled **copy controls**; another attempted Help without
opening Account; a third hit a relative/absolute recording-path bookkeeping error
after the desktop assertions. Those were harness errors. The corrected complete
production run passes all three widths; no deployed source was edited and no
product defect was hidden. No rollback was needed.

This is headless Chromium/SwiftShader with emulated viewport/touch, not physical
phone/native keyboard, hardware performance, real-wallet or genuine rendered
hidden-tab qualification. The requested human playtest should retain those limits
and the current backend protection. No unsupported visibility rerun or browser
anti-throttling flag was used to manufacture coverage.

### Current release and bounded rollback

The exact qualified frontend is now live. A separately approved future rollback
can stage the freshly preserved ordinary fluid set (manifest `68116cee…`) from
`.work/player-refinement/visual-closeout/deployment/rollback/frontend` and use the
same **observer-only, no-asset-upgrade** route, then reverify every served asset and
both modules. No backend rollback/reset is part of that route. Older tactical and
player-centred rollback evidence remains untouched.

The active paid-playtest blocker is the **pre-existing Reserve Protection and
closed admission**, with the existing treasury deadline warning. It requires a
separate financial/operational decision; no new source defect or asset mismatch
was demonstrated. The paid world, controllers, source settings and financial
authority remain unchanged by this work. Delegated payments remain isolated/disabled.
No new build or six-gate rerun is required merely to publish this evidence-only record.


Publication of this evidence record remains owner-operated under AGENTS.md. If
repository publication is wanted, the ordinary non-force continuation from this
branch is `git push origin HEAD:release/btz-prelaunch-playability`. This is not a
request for another runtime build or qualification campaign; the deployed assets
remain the exact already qualified freeze.
