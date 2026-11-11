# B2Z player-experience refinement — implemented, hosted qualification blocked

The owner published `37d0eb690fa280887d403a1b284ea69bae2bef84`.
**Not deployed or source-qualified:** its hosted Browser gate failed a layout
measurement race. Source, Native, Packaged DTR/clean consumers and Wasm passed;
installed-IC qualification is still running at this report's snapshot.
The verification-only correction passes the complete recorded playability and
fluid journeys at desktop/390/320, plus 199 Python tests. A new exact-source run
is required after publishing that correction; the original failed gate is retained.
The clean frozen runtime, all 16 files and manifest 42f120d4… remain unchanged.

## Starting identities and boundaries

Started clean on `release/btz-prelaunch-playability` at
`5279625a2ff913f3a8067896c0c00344ac394c10`, an evidence-only descendant of remote
`38e9cfbca9099fab246daf566c4a1f35cc011c95`. Both remote heads were refreshed
before editing and again before attempting the ordinary push. Optional financial
remote remains `38987fe84813ddb6b8cceef293dd42a98fd64985`; its independent local
worktree/evidence commit `bc06b15` is preserved. No feature code was merged.

[All fifteen actual production files](starting-production.json) still matched the
ordinary deployed runtime `662f9052bbb4235b2739df12646de66eca10dfbd`, JS
`79acf867c1f4de2408c5aab50d457177d9d953048ea86c807db4692cac571e5a`, full manifest
`68116ceeb93935b9be851bbe894fdd208cde71c4f4cc2a508d4fb9b524f0cb03`.
The current website remains https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/.
Backend `s5ir5-gqaaa-aaaas-amyna-cai`, frontend `s2jxj-liaaa-aaaas-amynq-cai`:
no deployment, install/upgrade/reset/start/stop, controller/setting/financial action
was executed in this corrective pass. Ledger-only play and disabled ICRC-2 remain.

## Finding dispositions

The maintained [UX contracts and UXR regression map](../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md)
retain UX-01..13. Each finding below has a source correction; final acceptance
results and genuine environment limits are recorded separately.

| Finding | Disposition | Correction and evidence |
| --- | --- | --- |
| UXR-01 | Fixed | Frozen canonical target/context/identity/revision/gesture; revalidate the original cell, never old pixels. Actual native pan/zoom/Focus/mode/occupied/removal/double-click journeys. |
| UXR-02 | Fixed | Immediate cannon selection plus useful conditional click-to-focus; three awkward locations per viewport. |
| UXR-03 | Fixed | Shared working composition, stricter screen tolerances, actual panel/map/chrome exclusion and settled Focus state. |
| UXR-04 | Fixed | Stable narrow placement; one usable scroll; keyboard contraction prioritizes the action and preserves visible source cannon. |
| UXR-05 | Fixed | Fixed 44px icon slots; body width/height independent of header; zero measured toolbar drift. |
| UXR-06 | Fixed | Rapid zoom multiplies pending destination, not intermediate pose; exact 48→94.08 two-step regression. |
| UXR-07 | Fixed | Actual projected speed selects bounded recent-travel retention; bright inner wake; partial segment trimming preserves fast-frame tails. Real .01/.05 samples and canonical Normal-rate controlled regression. |
| UXR-08 | Fixed | 450ms hold then 1.75s linear fade, 20% darkening, 128-cell bound; no atlas mutation. |
| UXR-09 | Fixed | Arena-first aim/placement; small heading, quantity stepper and optional cell/site precision controls. |
| UXR-10 | Fixed | Aligned compact rows, dominant amount, named 44px copy icons and complete exact clipboard bytes/payer. |
| UXR-11 | Fixed | Removed generic wallet-copy paragraph and duplicate placement/quantity paragraphs; included ball/partial quantity beside their values. Exact relevant risk and separate fee retained. |
| UXR-12 | Fixed | Controlled smoked translucency/local blur, readable value backing, solid reduced/unsupported/forced-colour fallbacks. |
| UXR-13 | Fixed | Explicit measured-height, opacity and padding transition; actual 0/mid/end height sample and stationary header. |
| UXR-14 | Fixed | Short accumulated classic wheel transitions, coalesced magnitude preserved; fine/ctrl trackpad deltas direct. |
| UXR-15 | Fixed | Ball highlight and follow entry immediate; old pending-ball delay/state removed. |
| UXR-16 | Fixed | No-op max zoom tested before clearing follow; native double-click preserves existing follow at the limit. |
| UXR-17 | Fixed | Real selected cannon owns toolbar/Focus; two Build sites change only ghost/guide/quote. |
| UXR-18 | Fixed | Rebase on meaningful circular displacement, focal loss, relocation/identity; stable small captures and deterministic fallback. |
| UXR-19 | Fixed | CSS-coordinate diamond with DPR backing up to 3, 512 dimension/262144-pixel cap; atlas/inverse unchanged. |
| UXR-20 | Fixed | Light 76px ring, 22px visible handle, retained 44px hit target and depth-tested wide guide. |
| UXR-21 | Fixed | Viewport-aware 64–88 working scale and useful composition; no global model/hitbox enlargement. |
| UXR-22 | Fixed | Quieter analytically filtered grid; genuine ownership edges and exact atlas retained. |
| UXR-23 | Fixed | Solid source footprint, thin hover, octagonal destination, invalid cross and wire ghost are shape-distinct. |
| UXR-24 | Fixed | Routine Waiting uses compact primary status; central treatment only genuine catch-up, smaller and nonblocking. |
| UXR-25 | Fixed | Distinct Revive glyph; accessible names/pressed states, native titles and one ephemeral keyboard/long-press hint; relevant disabled reason. |

## Confirmed reproductions and corrections

The source-bound baseline retained under `.work/player-refinement/baseline` is
runtime-identical to the deployed ordinary source. Its actual native pointer
probe reproduced **click 452577 → delayed selection 453576 → MOVE 1 453576**
after camera motion. Corrected tests retain **452577** through pan/zoom or cancel
safely on changed context. A later publication occupies the original site and
blocks copying instead of choosing another tile. Cannon removal, mode switch,
Focus and native double-click also fence the pending gesture.

Native event traces exposed an additional slow-rendering edge: Chromium could
emit a double-click after delayed processed timestamps passed the local pair
window. Native double-click recognition now cancels pending placement; no commit
runs while another pointer is held. This fixes the operation rather than raising
an unrelated runtime budget or delaying every ordinary click.

Baseline Fire toolbar drift measured `[0,27.5,55,82.5,110]`px at desktop; corrected
controls remain stationary through expansion. At 320×640 this replica measured
186px viewport / 483px content (the review's 71px result was another placement,
not relabelled reproduced here); the correction measures 245px / about 356px.
Fee/risk text is 14px and targets 44px; warnings are not hidden. Awkward locations,
actual 300px/430px viewport contraction and landscape receive separate checks.

The old short tail and squared wake fade were real: first corrective captures
still looked too faint. Projected-speed retention was increased based on actual
samples. Normal canonical speed additionally exposed deletion of a whole segment
just beyond the pixel budget; trimming its travelled oldest portion fixes this
without inventing future path. [Original failed/incomplete records](development-records.json)
remain available. Earlier release reports/goldens were not rewritten.

## Implementation and preserved contracts

Focused maintained changes: `interaction.mjs` immutable intents; `shell.mjs`
gesture/anchor/layout ownership; `camera-controller.mjs` composition/accumulation;
`player-anchor.mjs` meaningful revision invalidation; `minimap.mjs` bounded DPR;
`motion-effects.mjs` real-travel history and independent hold/fade; `render.mjs`
quiet grid/distinct previews; `arcade.mjs`, HTML/CSS compact instrument surface.
The existing observer/session/clock, DTR, canonical quote/memo/physics/economics,
Ledger adapter, backend/Candid and dependency locks were not changed.

First successful copy still freezes amount/recipient/payer/memo/target; edits need
Update/Keep, denied clipboard offers exact manual copy, and saved instructions are
not payment evidence. Modern principal/text only; no legacy/hex/reporting/signing
control. Selected Move/additional Build warning is exactly:

> If another player claims your chosen tile before your action is processed, the action fails and your ICP remains spent.

`Wallet fee extra.` remains separate. Fire/Revive/Join keep ordinary retention
risk. Same-cell Move guard and valid eligible cell zero remain frontend-only;
no new on-chain rejection or refund guarantee is claimed.

## Final clean artifact and superseded development freezes

[Complete actual-file manifest](frontend-files.json), [build provenance](build-manifest.json).
Runtime source **`feb2ed663d832895080dcc9e796dc3438ae9b8bd`**;
JavaScript SHA-256 **`afa45cbc9595a664cc20e2d6d20928fa8c508481d74b0b724cb93748ebd51a95`**;
complete manifest SHA-256 **`42f120d45517748f672a35ae8df2ab2f3cc1c5325b7be772f32f8b227cb78e38`**.
Directory `.work/player-refinement/reviewed/frontend`, source_dirty=false:
**16 actual files = 15 public HTTP assets + consumed `.ic-assets.json5`**.
The local reticle SVG is included. Mainnet root/query verification and CSP remain;
no delegated payment/authentication feature is in the ordinary input graph.

This freeze supersedes runtime `8650735d255890db0c039dcc5b2205f1a7d38306`
(manifest `c175a116…`) to move the icon hint above the toolbar after actual
captures showed it covering the prompt, then preserve the 14px fee/risk text
instead of relying on smaller financial type. The intermediate 32a5006 hint-only
freeze (manifest fdfdecd8…) is also retained, superseded. **JavaScript is byte-identical**; only
CSS and build provenance differ. The prior shader/depth/motion/performance input
paths are identical and their evidence is reused with that limited difference.
Fresh final layout, media, frozen bytes and certified-observation checks are separate.
Earlier clean runtime `23e4ebe…` and `195db31…` comparison freezes are retained
unchanged, with [comparison manifest](frontend-files-23e4ebe.json) and provenance.
They are historical development artifacts, not the final release set.

Normal-rate qualification found a second real effect issue: a verified straight
3.1-cell frame could trigger the conservative teleport reset. The final source
retains only a bounded travelled suffix when **all verified vx/vy/x0/y0 values are
unchanged**. Changed trajectories still reset rather than drawing a chord through
a reflection. Tests failed before this correction and pass afterwards. Physics,
events, authenticated endpoints and paid state are unchanged.

## Tests, input identity and qualification boundary

The [complete final source check](source.json) **passes** on clean committed
`feb2ed6`: 1,830/1,830 JavaScript tests, 199 Python tests and every other source
check. The Node suite completes in 136.603s without own browser/video work.
The queued check that recorded the prior revision was stopped and retained as
[INCOMPLETE](source-interrupted.json), then run once against this final source.
The original [complete concurrent failure](source-concurrent-failure.json) remains:
1828/1830 JavaScript tests passed; two unchanged forecast-cost tests returned
`hard_timeout` at 2837.676ms and 2431.645ms. Their 2000ms application budget plus
300ms worker deadline fired; the **600s outer harness allowance did not** (504.348s).
[Baseline/candidate investigation](forecast-investigation.json) records separate
worktrees, identical forecast sources and two isolated passes in each. These do
not prove the broad failure's cause. Own browser recording and unrelated host work
were active; no unrelated process was stopped, and no budget/assertion was changed.
Earlier complete passes (1826 and 1829 JS + 199 Python) remain development records,
not substitutes for the final source check or hosted CI.

| Executed regression | Scope and result |
| --- | --- |
| `node --test tests/js/player-refinement.test.mjs tests/js/fluid-experience.test.mjs tests/js/player-motion.test.mjs` | 32 focused PASS; included in the final 1,830-test complete pass; pending-target fencing, zoom intent, focus composition, meaningful anchor invalidation, DPR limits, actual-rate paths, stationary expiry and proven fast-frame handling. |
| `tools/verify_refinement_browser.py --output … --video` | Actual components, native mouse/touch, three awkward locations per viewport, exact target or cancellation, compact panels/copy/Update/Keep, keyboard contraction, forced colours and controlled CSS animation. [Final populated PASS](browser-acceptance.json) at all three viewports. |
| `tools/verify_playability_actions.py --output … --no-video` | [PASS desktop/390/320](playability-browser.json), including exact wallet bytes, denied clipboard/manual fallback, hidden heading/Move, seam Build, changing eligibility, touch capture/pinch/cancel and same clock through waiting/resumption. Separate recorded review is retained. |
| `tools/verify_fluid_browser.py --output … --video` | PASS all three layouts; shared camera/selection/follow/modern handoff regression. |
| `tools/verify_elastic_browser.py --fixture-dir … --output … --video` | [PASS three layouts](elastic-browser.json), controlled unchanged-head/new-head/empty-coverage return, same clock/queue, immutable instructions. Controlled lifecycle, **not genuine background execution**. |
| `tools/verify_fluid_depth.py --fixture-dir … --output …` | [16 software-WebGL depth cases PASS](guide-depth.json), eight headings × two zooms plus no-guide/depth-disabled controls. |
| Maintained tactical seam pixel comparison | [96 comparisons PASS](grid.json), DPR1/1.25/1.5/2 at fractional scales 2.73/9.37/48.25/96; actual ownership shader path retained. |
| `tools/check.py browser --output …` | Existing HTTP/CSP/browser-native Web Crypto path PASS; authentication/fail-closed tests retained. |
| `tools/verify_fluid_frozen.py --assets … --output …` | Exact final loopback assets against real European read-only certified game, anonymous boot, source/destination binding and canonical Fire copying; every POST restricted to query/read_state. [Final frozen PASS](frozen-browser.json) at all three viewports. |

[Exact executed commands, paths and results](qualification-commands.json) supplement
the overview above; `source.json` contains every complete-gate subcommand.
Commands use Python 3.11.14 in `.work/browser-venv`, Node 24.15.0, pinned installed
lockfiles, `DFX_IDENTITY=codex_local`, and the existing user-scoped browser libraries.
Browser Chromium 153.0.8010.12 / ANGLE Vulkan **SwiftShader**. No security/lifecycle
restriction was disabled. The workflow adds the populated refinement journey and
its artifacts to the existing Browser gate; no prior gate or assertion was removed.

The touch failure in the preceding recheck was diagnosed with actual event targets:
after keyboard restoration its second finger landed on `action-inputs` or Close.
A card is correctly excluded from arena gestures. The corrected test explicitly
Focuses after editing, verifies aim-handle/board targets, then keeps the original
camera-change, unchanged-memo/selection and cancellation assertions. This is a
harness-coordinate correction, not permission for UI events to pan the arena.
Async bootstrap guards now wait for `globalThis.fixture`; an undefined-fixture
ReferenceError is not relabelled an application playback failure.

[Hosted run 43108214708](hosted-43108214708.json) checks published source
`37d0eb690fa280887d403a1b284ea69bae2bef84`, with unchanged runtime inputs from
`feb2ed663d832895080dcc9e796dc3438ae9b8bd`.

| Substantive hosted gate | Observed conclusion |
| --- | --- |
| Source conformance | PASS |
| Native conformance | PASS |
| Packaged DTR and clean consumers | PASS |
| Runtime-lab Wasm | PASS |
| Browser HTTP and Web Crypto | FAIL: wallet layout measurement during expansion; subsequent journey steps skipped by the runner. |
| S14/million-cell installed-IC qualification | RUNNING; no pass/fail conclusion claimed. |

Inventory is informational. No failed/skipped gate is called a pass. The original
run was not cancelled or rerun by this closeout. The corrected verification source
requires its own six-gate qualification after publication; no historical/input-
identity reuse waives that release condition.

## Layout, financial handoff and accessibility evidence

[Actual populated before/after screenshots and recordings](media/README.md) are
provided with SHA-256 identities in the [media index](media/index.json). All are application captures,
not generated concepts. The current ordinary 15-file production set was checked
again at the end and [still matches](ending-production.json), including the security
policy. The candidate exists only in the frozen local directory.

Actual header slots remain fixed during 0/90/180ms CSS transition sampling and
native action switching; all five measured drifts are 0px. Desktop and 390px
Fire scroll surfaces measure 362px; 320px measures 245px (content 361px).
The original 320px replica measured186px/content483px. Three off-centre cannon
locations per viewport retain useful composition. Focus uses stricter screen
bounds and panel obstacles, not visibility alone; rapid1.4× zoom twice reaches94.08
from48. Programmatic motions use the same interruptible controller; fine input
stays immediate. Build's two proposed sites never move the real-cannon toolbar.

Actual viewport contractions to430px,300px and844×390 landscape retain input focus,
exact financial values and visible source cannon through the existing explicit
Locate/accommodation. Minimum measured contracted scroll is 166px; these
are viewport tests, not native software-keyboard/physical-phone claims. One
`.panel-scroll` owns scrolling. Readability and practical44px targets were kept;
ordinary important wallet text is 14px, amount larger. [Conservative analytical
contrast](contrast.json) over a white backdrop gives7.15:1 primary and4.56:1 secondary
text, with solid forced-colour/reduced-transparency fallbacks. This is not a
physical-display calibration or a complete assistive-technology audit.

The ordinary heading/site precision controls remain accessible, not dominant.
Native clipboard tests check full principal and exact memo/amount/payer; manual
copy, saved packets, warnings, Update/Keep and invalid/cell-zero safeguards remain.
No legacy address, hexadecimal memo, transaction-index/reporting or signing controls.
Touch/keyboard hints are brief, above the icon strip, and cannot cover the prompt.

## Real-speed effects and bounded performance

[Matched moving-scene measurements](performance.json) use five-second windows
without video encoding, identical populated seam and working-scale fixtures at
0.05 ticks/s. Final comparison is refreshed below against the final warning-font/hint CSS.
The previous mixed measured renderer/camera/motion/atlas results remain retained. An earlier supposed seam benchmark was static;
its original results remain development evidence and are **not moving qualification**.

| Scene / viewport | Baseline p50 / p95 ms | Candidate p50 / p95 ms |
| --- | ---: | ---: |
| Six-entity seam / 1440 | 83.2 / 100.0 | 83.3 / 116.7 |
| Six-entity seam / 390 | 33.3 / 50.1 | 33.3 / 50.1 |
| Six-entity seam / 320 | 33.3 / 33.4 | 33.3 / 33.4 |
| Moving ball + action / 1440 | 83.3 / 100.0 | 83.4 / 116.6 |
| Moving ball + action / 390 | 33.4 / 133.3 | 50.0 / 50.1 |
| Moving ball + action / 320 | 16.7 / 33.4 | 33.3 / 50.0 |

These mixed software results **are not a smoothness pass or proof of no regression**.
The final desktop and 320px action p95 are higher than the matched baseline;
no isolated bounded-work defect was demonstrated. The preceding 390px moving
seam p95 of 150ms versus 50.1ms and working-panel 390px p95 of 216.7ms remain
recorded in the [prior moving comparison](performance-before-final-css.json) and
development records. This variation warrants hardware review; no record was
discarded to present only a favourable run. A bounded
local blur 7/3/0/7 diagnostic gave 100.1/133.4/100/100ms, so it did not establish a
reproducible blur-specific cause and no visual identity was removed to chase a pass.
No claim of hardware-backed 60/30fps, physical-phone, native keyboard or actual-wallet
coverage is made. No hardware/browser display is available in this environment.

Candidate synthetic pointer-dispatch→next-frame samples are 2.6–14.7ms; these exclude
OS/native input and are not Playwright journey latency. Native input→settled camera
measurements are 0.339–0.718s per composition, including browser dispatch and
software rendering; they are not merely the eased controller duration. Candidate draw calls 12(seam)/16(action),
geometry 22/23, one ownership texture 4MB, heap ~19.3–21.7MB versus ~20.5–23.1MB baseline.
Measured layouts 0–0.213ms over a five-second window. Atlas single-cell regression
still uploads ≤3 rows/12KB, not one million cells per frame. Motion history is directly counted in the performance JSON; hard bounds 64 points/ball, 8,192 total, 4,096 balls and 128 wake cells.
The one extra shared destination geometry is bounded. No fullscreen pass or lights.

[Real-rate footage and measured playheads](motion-visibility.json) are sampled at 0.01, 0.05 and 1 ticks/s with actual verified displayed
positions and the same fixture. A discovered offscreen Lifeline crop is retained as
invalid visibility evidence and corrected by following the ball in both variants;
it is not counted as a zero-tail application failure or a visual pass. Normal
startup uses the explicit verified warm-return path, not fabricated motion. Sampled
logical advance is recorded alongside wall time: SwiftShader frame gaps/caps mean
these are not production delivery-cadence measurements. Controlled tests separately
exercise canonical 31-cell/tick paths, seams/reflections, stop/reduced motion and
large unchanged-trajectory frames. Wake uses 450ms hold + 1.75s linear fade; tail retains
only actual recent travel up to a bounded 30s while moving, and expires ≤700ms after
stopping. Camera changes cannot refresh either; ownership/minimap data are untouched.

[Offline pixel analysis of actual captures](captured-wake-pixels.json) uses the
same neutral-luminous mask in both variants, excludes an 8px core and warm follow
ring, and does not count the saturated aqua ownership colour. At Trickle the
previous visible wake outside that core is 0 pixels versus 150 in the correction,
with 95th-radius 22.8px (maximum 24.5px). Lifeline is visible in both (19.0px versus
15.4px95th-radius); the change does not claim every snapshot is longer. The Normal
sample changes 0→130 wake pixels, with 33.8px95th-radius including soft edge. These
are fixture-specific visibility measurements, not general human-perception or
hardware passes. The stricter white>235 metric alone misses translucent tails,
so its zeroes remain in the original data rather than being labelled failures.
Actual footage and image review confirm a restrained travelled streak and a
darkened current/passed tile; no future line or stationary idle motion is added.

## Preservation and release continuation

[Git object preservation](preservation.json) proves backend, native, protocol/kernel,
vendor and lock inputs unchanged. [Read-only production module/controller check](production-preservation.json)
confirms backend `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`
and frontend asset Wasm `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
No production frontend publication, backend/state change, controller/setting action,
financial transaction, allowance or signing activation occurred. Paid autonomous
state legitimately advances independently. Feature worktree remains clean at bc06b15.

The owner completed ordinary source publication: remote and local release heads
both match37d0eb6. The previous credential failures remain historical development
evidence, no longer a publication blocker. The frozen runtime and every deployment
byte remain unchanged. The Browser failure now requires a verification correction and fresh exact-source
qualification; outstanding installed-IC results are retained too.

After six passing gates and **separate explicit release approval**, follow the
[observer-only operator procedure](../../../docs/operations/S14_OPERATOR.md): verify
all sixteen bytes against the final manifest, preserve existing staging, stage
`.work/player-refinement/reviewed/frontend` as `.work/s14/assets`, and use:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

This command was **not run**. No backend preparer/install/upgrade is part of it.
Rollback for a later approved release is the retained exact current ordinary
`.work/fluid-player-experience/frozen-arrival-jitter/frontend` sixteen-file set,
manifest 68116cee…, with actual served fifteen-file copies in`.work/fluid-live/served`.
Verify saved bytes, restage that set and use the same observer-only command under
bounded rollback authority. The older tactical rollback remains preserved too.

The concrete release blocker is fresh exact-source hosted qualification after
the verifier correction. The prior Browser failure has a reproduced local fix,
not a retroactive hosted pass. Mixed
software performance and unavailable hardware/physical-device/real-wallet/genuine
rendered-hidden-tab coverage are separately disclosed limits, not manufactured
passes. No demonstrated financial, authentication or target-identity defect is
being deferred as a future improvement.

## Hosted Browser failure and verified-layout correction

Run 43108214708's Browser job 130817009365 failed at
`verify_playability_actions.py:47`, checking wallet-field bounds at 390px.
[The original CI screenshot](media/ci-43108214708-wallet-failure.png) and raw
job/archive remain preserved. Browser artifact 13894563435 has SHA-256
`95ced04a1d8e4556cbadc63989f466eb717bfd264dbe44a239bfb4385a081450`.

[Controlled reproduction on those exact downloaded components](wallet-expansion-reproduction.json)
scrolls each financial value at expansion 0ms, then advances the existing CSS
transition to 60ms before applying the original containment predicate. Amount and
Recipient fail at 390px; at 320px Memo fails too. Scrolling after 180ms passes at
all three viewports. The old fixed 60ms sleep therefore tested a changing scrollport,
not the required settled handoff. No financial field or genuine layout failure
was removed from the assertions.

The verifier now flushes layout and waits for the actual body/scroller transitions
and camera controller to settle, then retains exact top/bottom/left/right containment
checks with diagnostic rectangles. A controlled paused-expansion regression verifies
the helper cannot return before the transition finishes, with exact 4.1 ICP /
`FIRE 2 315 2` unchanged through action collapse/reopen.
[The complete recorded journey passes](playability-layout-corrected.json) at
1440×900, 390×844 and 320×640. Each controlled case has four paused transitions
and confirms completion before field measurement.
[The fluid journeys also pass](fluid-layout-corrected.json) at all three sizes
after the shared warning-readability helper adopts the same readiness check.
All 199 Python tests pass in 22.812s, and 355 maintained-document links resolve. Runtime application, source configuration,
security policy and all 16 frozen files are unchanged; no rebuild is necessary.

### Corrected-source continuation

The correction changes only `tools/fluid_playability_browser.py`,
`tools/verify_playability_actions.py`, the maintained verification contract and
evidence. Application, backend, protocol and frozen artifact inputs are identical
to the published candidate. No rebuild or production action is appropriate.

The terminal still cannot authenticate a Git push. A narrowly scoped write through
the connected GitHub app was also rejected with 403 `Resource not accessible by
integration`; no repository mutation occurred. Ordinary publication continuation:

```sh
git -C /home/codexdev/src/b2z push origin release/btz-prelaunch-playability
```

This publishes the reviewed verifier correction, requiring a new exact-source run.
It is not an evidence-only CI replacement or an unexplained retry of the failed
Browser job. The original installed-IC job remains active; preserve its eventual
result independently and do not infer it from the four completed passing gates.
