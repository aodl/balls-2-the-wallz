# B2Z player-experience refinement — implemented, hosted qualification blocked

The ordinary frontend correction is implemented and frozen from clean source.
**Not deployed; not yet eligible for production approval.** All six hosted gates
are pending: the ordinary non-force Git push failed because this session has no
GitHub Git credentials. Local complete-source closeout is recorded below, separately
from focused/browser evidence. No CI result is assumed green.

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
Financial font/hit sizes were preserved, warnings not hidden. Awkward locations,
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
Runtime source **`32a5006f1af904f45ef901baec7905de588c4b6f`**;
JavaScript SHA-256 **`afa45cbc9595a664cc20e2d6d20928fa8c508481d74b0b724cb93748ebd51a95`**;
complete manifest SHA-256 **`fdfdecd89365d3f1c1967b9af432e1226b903aaf3a4546f1cbf346f769118ff6`**.
Directory `.work/player-refinement/final-candidate/frontend`, source_dirty=false:
**16 actual files = 15 public HTTP assets + consumed `.ic-assets.json5`**.
The local reticle SVG is included. Mainnet root/query verification and CSP remain;
no delegated payment/authentication feature is in the ordinary input graph.

This freeze supersedes runtime `8650735d255890db0c039dcc5b2205f1a7d38306`
(manifest `c175a116…`) solely to move the icon hint above the toolbar after actual
captures showed it covering the prompt. **JavaScript is byte-identical**; only
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

The final source check is being collected once own browser/video work has ended.
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
| `node --test tests/js/player-refinement.test.mjs tests/js/fluid-experience.test.mjs tests/js/player-motion.test.mjs` | 32 PASS at final runtime; pending-target fencing, zoom intent, focus composition, meaningful anchor invalidation, DPR limits, actual-rate paths, stationary expiry and proven fast-frame handling. |
| `tools/verify_refinement_browser.py --output … --video` | Actual components, native mouse/touch, three awkward locations per viewport, exact target or cancellation, compact panels/copy/Update/Keep, keyboard contraction, forced colours and controlled CSS animation. Final execution recorded separately. |
| `tools/verify_playability_actions.py --output … --no-video` | [PASS desktop/390/320](playability-browser.json), including exact wallet bytes, denied clipboard/manual fallback, hidden heading/Move, seam Build, changing eligibility, touch capture/pinch/cancel and same clock through waiting/resumption. Separate recorded review is retained. |
| `tools/verify_fluid_browser.py --output … --video` | PASS all three layouts; shared camera/selection/follow/modern handoff regression. |
| `tools/verify_elastic_browser.py --fixture-dir … --output … --video` | [PASS three layouts](elastic-browser.json), controlled unchanged-head/new-head/empty-coverage return, same clock/queue, immutable instructions. Controlled lifecycle, **not genuine background execution**. |
| `tools/verify_fluid_depth.py --fixture-dir … --output …` | [16 software-WebGL depth cases PASS](guide-depth.json), eight headings × two zooms plus no-guide/depth-disabled controls. |
| Maintained tactical seam pixel comparison | [96 comparisons PASS](grid.json), DPR1/1.25/1.5/2 at fractional scales2.73/9.37/48.25/96; actual ownership shader path retained. |
| `tools/check.py browser --output …` | Existing HTTP/CSP/browser-native Web Crypto path PASS; authentication/fail-closed tests retained. |
| `tools/verify_fluid_frozen.py --assets … --output …` | Exact final loopback assets against real European read-only certified game, anonymous boot, source/destination binding and canonical Fire copying; every POST restricted to query/read_state. Final execution recorded separately. |

Commands use Python3.11.14 in `.work/browser-venv`, Node24.15.0, pinned installed
lockfiles, `DFX_IDENTITY=codex_local`, and the existing user-scoped browser libraries.
Browser Chromium153.0.8010.12 / ANGLE Vulkan **SwiftShader**. No security/lifecycle
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

All six substantive hosted conclusions for this candidate remain **NOT_RUN / BLOCKED**:
Source conformance; Native conformance; Packaged DTR and clean consumers;
Runtime-lab Wasm; Browser HTTP/Web Crypto; S14/million-cell installed-IC qualification.
The production-inventory job is informational. Remote still points to `38e9cfb…`;
its prior green run qualifies the deployed old release, not these changes.

## Layout, financial handoff and accessibility evidence

Actual header slots remain fixed during 0/90/180ms CSS transition sampling and
native action switching; all five measured drifts are 0px. Desktop and 390px
Fire scroll surfaces measure 357px, 320px measures 245px (content about357px).
The original 320px replica measured186px/content483px. Three off-centre cannon
locations per viewport retain useful composition. Focus uses stricter screen
bounds and panel obstacles, not visibility alone; rapid1.4× zoom twice reaches94.08
from48. Programmatic motions use the same interruptible controller; fine input
stays immediate. Build's two proposed sites never move the real-cannon toolbar.

Actual viewport contractions to430px,300px and844×390 landscape retain input focus,
exact financial values and visible source cannon through the existing explicit
Locate/accommodation. Minimum measured contracted scroll is around166px; these
are viewport tests, not native software-keyboard/physical-phone claims. One
`.panel-scroll` owns scrolling. Readability and practical44px targets were kept;
ordinary important wallet text is14px, amount larger. [Conservative analytical
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
0.05 ticks/s. Final hint-only CSS/provenance changes do not alter these measured
renderer/camera/motion/atlas inputs. An earlier supposed seam benchmark was static;
its original results remain development evidence and are **not moving qualification**.

| Scene / viewport | Baseline p50 / p95 ms | Candidate p50 / p95 ms |
| --- | ---: | ---: |
| Six-entity seam /1440 | 83.3 /116.7 | 83.3 /100.0 |
| Six-entity seam /390 | 33.4 /50.1 | 50.0 /150.0 |
| Six-entity seam /320 | 33.4 /116.7 | 33.3 /33.5 |
| Moving ball + action /1440 | 99.9 /316.7 | 83.4 /116.7 |
| Moving ball + action /390 | 33.3 /50.0 | 50.0 /50.1 |
| Moving ball + action /320 | 33.2 /33.4 | 33.3 /50.1 |

These mixed software results **are not a smoothness pass or proof of no regression**.
The390px seam cost warrants hardware review; no isolated bounded-work defect was
demonstrated. Earlier working-panel390p95 of216.7ms remains recorded. A bounded
local blur7/3/0/7 diagnostic gave100.1/133.4/100/100ms, so it did not establish a
reproducible blur-specific cause and no visual identity was removed to chase a pass.
No claim of hardware-backed60/30fps, physical-phone, native keyboard or actual-wallet
coverage is made. No hardware/browser display is available in this environment.

Candidate synthetic pointer-dispatch→next-frame samples are3.3–13.4ms; these exclude
OS/native input and are not Playwright journey latency. Native input→settled camera
measurements are recorded per composition. Candidate draw calls12(seam)/16(action),
geometry22/23, one ownership texture4MB, heap~20.5–21.7MB versus~19.3–23.1MB baseline.
Measured layouts0–2.132ms over a five-second window. Atlas single-cell regression
still uploads≤3 rows/12KB, not one million cells per frame. Motion samples use3–15
path points/3–6 cells; hard bounds64points/ball,8192total,4096balls,128wakecells.
The one extra shared destination geometry is bounded. No fullscreen pass or lights.

Real-rate footage is sampled at0.01,0.05 and1ticks/s with actual verified displayed
positions and the same fixture. A discovered offscreen Lifeline crop is retained as
invalid visibility evidence and corrected by following the ball in both variants;
it is not counted as a zero-tail application failure or a visual pass. Normal
startup uses the explicit verified warm-return path, not fabricated motion. Sampled
logical advance is recorded alongside wall time: SwiftShader frame gaps/caps mean
these are not production delivery-cadence measurements. Controlled tests separately
exercise canonical31-cell/tick paths, seams/reflections, stop/reduced motion and
large unchanged-trajectory frames. Wake uses450ms hold+1.75s linear fade; tail retains
only actual recent travel up to bounded30s while moving, and expires≤700ms after
stopping. Camera changes cannot refresh either; ownership/minimap data are untouched.

## Preservation and release continuation

[Git object preservation](preservation.json) proves backend, native, protocol/kernel,
vendor and lock inputs unchanged. [Read-only production module/controller check](production-preservation.json)
confirms backend `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`
and frontend asset Wasm `04e565b3425fe7510ee16b02adcfe3f01abc9a2725c82a21cb08969241debd62`.
No production frontend publication, backend/state change, controller/setting action,
financial transaction, allowance or signing activation occurred. Paid autonomous
state legitimately advances independently. Feature worktree remains clean atbc06b15.

Complete source publication with the ordinary **non-force** command, after checking
that the remote is still an ancestor of this branch:

```sh
git -C /home/codexdev/src/b2z push origin release/btz-prelaunch-playability
```

No credentials were invented/exported. The connector's object APIs do not transfer
these existing local commits with their original author/date identities; recreating
an unrelated remote history is not an exact-source Git push. Obtain all six final
hosted conclusions after publication. Evidence-only changes need no runtime rebuild.

After six passing gates and **separate explicit release approval**, follow the
[observer-only operator procedure](../../../docs/operations/S14_OPERATOR.md): verify
all sixteen bytes against the final manifest, preserve existing staging, stage
`.work/player-refinement/final-candidate/frontend` as `.work/s14/assets`, and use:

```sh
DFX_IDENTITY=codex_local DFX_WARNING=-mainnet_plaintext_identity NPM_CONFIG_IF_PRESENT=true dfx deploy observer --network ic --no-wallet --no-asset-upgrade
```

This command was **not run**. No backend preparer/install/upgrade is part of it.
Rollback for a later approved release is the retained exact current ordinary
`.work/fluid-player-experience/frozen-arrival-jitter/frontend` sixteen-file set,
manifest68116cee…, with actual served fifteen-file copies in`.work/fluid-live/served`.
Verify saved bytes, restage that set and use the same observer-only command under
bounded rollback authority. The older tactical rollback remains preserved too.

The concrete release blocker is missing exact-source hosted qualification. Mixed
software performance and unavailable hardware/physical-device/real-wallet/genuine
rendered-hidden-tab coverage are separately disclosed limits, not manufactured
passes. No new demonstrated financial, authentication or target-identity defect is
being deferred as a future improvement.
