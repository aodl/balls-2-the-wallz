# B2Z minimal isometric frontend — live

The completed frontend is live at https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/.
All six substantive jobs **PASS** for qualification source
`e85f45171e244a92093a779c1b567baf2d2e6650` in
[run 42504995515](https://github.com/aodl/balls-2-the-wallz/actions/runs/42504995515).
The owner published the source; no remote Git write was made by the agent.

The preserved runtime was built clean from published source
`391df3a0a4165d4aaa05e3bc35612689b52b061c`. The qualification commit changes only
harness synchronization and its documentation; [runtime-input equivalence](runtime-input-equivalence.json)
records unchanged build inputs. No artifact was rebuilt for evidence/provenance.
The asset-only publication on 8 November 2026 succeeded: every public file and
security header matches, and real desktop/390px/320px browser journeys pass.
**The paid backend, its module, controllers, source binding and financial authority
are preserved.** Rendering smoothness/device/wallet limitations remain below.

## Experience and maintained contracts

The arena is now a fixed orthographic isometric projection with solid tiles,
volumetric cannons, spheres and contact shadows. Pan/zoom, picking, aiming and
wrapped copies share the same ground-plane mapping. Rendering uses pinned,
locally bundled Three.js 0.187.0; no framework, physics or external service was
introduced. Ownership and numeric game state remain canonical.

The ordinary screen has B2Z/on ICP, one status, Account, contextual Join/My cannons
and three camera controls. One nonmodal desktop panel/mobile sheet contains
inspection, actions, wallet instructions, account/history, status details or help.
Fire/Revive, Move and Build appear contextually; Join includes one ball and uses
the rules' automatic first site. Opponents have compact inspection. Help is
secondary to Account and requires no declaration. Escape closes a local preview.

Removed: permanent action rail, stacked dialogs/backdrops, onboarding/network
selector, ordinary pause/restart/record/download controls, transaction-index
entry, "I've sent this", payment reports and report-driven pending/checking states.
Old reported local records migrate to unknown history, never payment evidence.
Saved instructions and verified account outcomes remain separate; no receipt
heuristics or automatic packet association were added.

The sole normative [human-experience specification and UX-01–13 regression map](../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md)
defines the screen/control matrix, status precedence, clock lifecycle, copying,
projection/effects, accessibility and measured limits. AGENTS, README, STATUS,
frontend maintenance, observer/application specifications and release checklist
link to it. [Current operations](../../../docs/operations/S14_OPERATOR.md) default
to frontend updates of the installed paid game. The prior fresh-install runbook
is preserved separately with an explicit historical warning.

## Playback diagnosis and timing

Confirmed in the baseline, with focused failing regressions before correction:

- Starting an action reached `b2z-plan`, accepted-head scene replacement,
  `resetLiveClock`, queue clearing and clock recreation. It now reads latest
  verified planning state without changing presentation. Ordinary dialog
  open/close handlers alone did not establish the reported pause cause.
- Actual pinned DTR PlayoutClock would not start a one-tick Trickle interval with
  the old 1.08-tick target. Complete low-rate intervals now start with one tick;
  Normal retains its buffer policy and bounded queues/bytes.
- Slow producer wording could conceal buffering, and stored velocity produced
  tails while displayed positions were still. One status resolver now separates
  producer, delivery and presentation. Movement illumination uses displayed
  displacement only; stationary/camera/resync cases create no new travel effect.
- Reduced motion initialized live playback paused. Live starts unpaused,
  ignores obsolete live-pause preferences, and suppresses only nonessential
  effects. Local replay diagnostics remain separate from the ordinary interface.
- Observation/status initiation depended on render frames. Independent bounded,
  single-flight workers now own observation/health, fencing and teardown.
  Substantial suspended gaps use authenticated recent-snapshot recovery, retain
  camera/valid selection and clear cosmetic history, without weakening trust.

The final certified disposable run used the **exact preserved production normal
Wasm `612ad0d0…`**, official valueless Ledger/Index and actual built HTTP app.
Its 92 captured gameplay publications replayed exactly, with source positions
1/2/3 applied once. The first payment used a configured test hint; a later
payment used independent fallback. The browser never sent a gameplay update.

| First-ball stage | What the bounded reproduction establishes |
| --- | --- |
| Payment/discovery/admission | Independent valueless Ledger payment, authoritative Index processing and authenticated receipt; no UI report. Backend trace records the source/assigned positions. Individual real-time discovery and admission durations are not separately instrumented here. |
| Cannon/ball publication | Authenticated canonical artifacts contain the new entity and receipt. The harness deliberately holds each paid setup publication until its receipt is observed. Those holds are test coordination, not production latency. |
| Browser verification/display | First authenticated receipt to displayed cannon/ball: **563.4 ms**, one navigation/no refresh. This measures entity appearance, not the original owner's first displacement latency. |
| Subsequent displacement | 34.732 s settled sample: **0.981916 displayed ticks/s**, **0.978924 produced ticks/s**, nominal 1, zero sampled stalls, buffer 11.72–18.63 ticks. Fetch maximum 5,292.8 ms, verification 230.7 ms, artifact retrieval 483 ms. |
| Funding/pace | Measured disposable playback used Normal. The separately observed existing production treasury completion is not evidence that funding caused the owner's earlier wait. |

The owner's exact earlier payment-to-first-displacement timeline remains unknown.
No new real payment or transaction-index request was used to invent one. At
Trickle, one tick still represents about 100 seconds of scheduling: removing an
avoidable second interval does not remove that cadence, source/delivery delay or
certificate verification. Expected waiting is now explicit.

The [native/manual-copy regression](native-copy-regression.json) also exposed an
interim `b8bce7b` defect before deployment: browser Copy bypassed the explicit
manual-save handler. Final `391df3a` freezes native financial/manual Copy events
conservatively without claiming an OS write, and preserves the selected DOM.
Edits require replacement/keep; the failing run and corrected three-viewport run
remain separately identified. This is why the final source/artifact changed.

## Executed qualification

- [Runtime-source conformance](source-conformance.json), source `391df3a`: **PASS**, 26 checks,
  **1,721 JS tests and 196 Python tests**, no skipped/cancelled JS tests.
- [HTTP/browser](http-browser.json): **PASS**, 12 checks, actual HTTP/CSP/browser
  Web Crypto, bounded coverage, generation fencing, panel clock/queue continuity,
  reduced motion, corruption rejection and actual WebGL context loss/restoration.
- [Populated journeys](populated-journeys.json): **PASS** at 1440×900, 390×844,
  320×640. Exact amount/principal/legacy/memo clipboard values; fee/retention text;
  denial/manual copy; edit/replacement/keep; frozen missing-target warning;
  account/history scoping; Fire/Revive/Join/Build/Move/opponent inspection;
  unchanged progressing clock/queue; storage denial; caret preservation;
  CDP touch drag/pinch; reduced motion and keyboard-viewport resize.
- [Certified installed app](certified-browser.json), [execution identity](certified-execution.json)
  and [independent replay](certified-replay.json): **PASS**, 19 browser checks and
  the existing installed financial/reconnect/upgrade/negative-certificate test.
  This run used frontend `ed6b161` plus later test-fixture-only work; the final
  runtime change after it is storage-success wording/persistence reporting and native/manual Copy coherence,
  covered by the final UI/HTTP/source reruns. It is local development evidence,
  **not exact-source hosted CI for `391df3a`**. The genuine scene uses the
  supported legacy test world; current v6/v7 composer/projection/partial/rejected
  outcomes use canonical populated fixtures and unchanged rules tests.
- Controlled actual Chromium debugger suspension (~36.8 s), with explicit
  freeze/resume events: authenticated recovery from head 38 to logical tick 144,
  resync count 1, queue empty at the recent verified point, camera preserved.
  Native hidden-tab lifecycle was not established by headless Chromium's focus
  emulation. This is not physical-device or production timing evidence.
- Three successive canonical slow intervals and toroidal rendered travel use
  the actual pinned clock/presenter with **20× accelerated disposable time**.
  Waiting creates no motion effect; later intervals resume the same clock.
  Prior bounded normal-Wasm Trickle real-cadence evidence is reused for the
  unchanged backend, not claimed as a new browser/mainnet measurement.

Projection tests compare the analytic mapping with actual Three orthographic
projection at all three viewports, headings and wrapped edges/corners. Effects,
status precedence, permanent auth blockers, default/nondefault account semantics,
official ICRC vectors, local-history migration and storage denial have focused
regressions. Protected finance, certificate, replay, rate/queue assertions and
the existing 900-second hosted gate were not weakened. Earlier layout assertions
were replaced explicitly under UX-03/12. Development failures are retained under
`.work/minimal-isometric`/`.work/minimal-ui*`; they are not relabelled as passes.

## Rendered evidence and performance

[Desktop wallet](1440x900-wallet.png), [390px wallet](390x844-wallet.png),
[320px wallet](320x640-wallet.png), [desktop motion](1440x900-moving.png),
[mobile motion](390x844-moving.png), [certified paid world](certified-paid-world.png)
and [slow/wrap endpoint](slow-wait-resume-wrap.png) are actual WebGL captures.
The wallet/motion fixtures are synthetic canonical scenarios, not IC authenticity
claims. The separate certified capture uses the actual installed disposable app.
Short actual recordings: [wallet copy/edit](desktop-wallet.webm),
[panels during motion](desktop-panels-motion.webm), [mobile wallet](mobile-wallet.webm),
[certified motion](certified-motion.webm), [suspended return](certified-suspended-return.webm),
[slow wait/resume and wrap](slow-wait-resume-wrap.webm). [Media identities](media.json)
record scope, source hashes and clip boundaries. No concept art was used.

[Performance measurements](performance.json) and [component reuse](performance-reuse.json), Chromium 153.0.8010.12,
Playwright 1.63.0, sandbox enabled, ANGLE Vulkan SwiftShader VM, no video during
each seven-second steady populated 1000×1000-fixture window. These measurements
precede the final native-Copy-only correction; render/camera/model/effect inputs
remain identical. They qualify the rendering-component envelope, not final
hardware/full-bundle performance:

| Viewport | Frame p50/p95 | Draw CPU p95 | Tiles / calls | JS heap |
| --- | --- | --- | --- | --- |
| 1440×900 | 216.6/266.6 ms | 6.6 ms | 1,147 / 7 | 13.48 MB |
| 390×844 | 66.7/116.6 ms | 5.9 ms | 353 / 7 | 13.79 MB |
| 320×640 | 50.0/66.7 ms | 5.7 ms | 241 / 7 | 13.84 MB |

**These results miss the smoothness targets.** Hardware desktop/physical-phone
60/30 fps is unestablished. Automated click-to-visible samples were 3.55–4.02 s,
1.12–1.30 s and 0.89–1.07 s respectively; these include Playwright input/stability
overhead and are not isolated input-handler measurements. JS heap excludes GPU
and total process memory. Certified delivery timing above is a separate bounded
measurement; it does not qualify maximum-population renderer performance.

Measured implementation caps: 8,192 tiles, 4,096 instances per entity batch,
128 fading cosmetic tiles, 25 wrapped copies, DPR ≤2 and one million drawing
pixels. Shared geometry/materials, visible LOD/cached layout, partial instance
uploads, no MSAA/per-ball shadow maps; no million-cell per-frame scan. No alternate
permanent renderer mode or new capacity campaign was introduced.

## Hosted gate correction

The [actual failing check and artifact digest](hosted-391-failure.json),
[hosted browser result](hosted-391-sustained-results.json) and
[900-second analysis](hosted-391-sustained-analysis.json) retain the failed job
honestly. The only failing installed case is
`million_browser_sustained_normal_and_cold_lifeline`: its immediate DOM-label
assertion races the asynchronously refreshed HUD after `target_rate` changes.
The exception capture already shows Slow with advancing verified coverage.
The correction waits, within 15 seconds, for Slow **and** actual advancing
verified presentation. It does not accept buffering/reconnect/authentication as
Slow. All numerical throughput, no-stall, queue/byte, certificate, conservation
and unchanged 900-second assertions remain protected.

[Focused installed result](focused-status-browser.json) and
[execution identity](focused-status-execution.json): PASS, 264.22 seconds, 131
consecutive canonical publications independently replayed. Displayed rates:
Normal 0.974209, Economy 0.485000, Lifeline 0.050350 ticks/s; zero sampled stalls
in those windows; cold reconnect passes. Normal uses exact frozen `612ad0d0…`;
disposable low-funding phases deliberately use the existing test-hook module.
Sixteen analysis/contract tests and current-document links pass. The 900-second
case was not repeated locally, and its passing Normal measurement does not
convert the failed hosted job or its unexecuted slow tail into a pass.

[Runtime-input equivalence](runtime-input-equivalence.json) proves the corrected
qualification commit changes no build/runtime inputs. The complete 15-file set,
JS `1b6a6d26…` and manifest `444d0fda…` remain exact. No artifact was rebuilt merely
to change its provenance. [Final exact-source CI](hosted-ci.json) now passes all six substantive jobs,
including the complete installed-IC gate. Build source `391df3a` and qualification
source `e85f451` remain explicitly separate. Official artifact identity/digest
[metadata](hosted-e85-artifacts.json) is retained; the public final raw-archive
download returned HTTP 500, so no new numerical timing breakdown is inferred
from unavailable raw logs. The official job conclusions are available and verified.

## Frozen identities and preservation

[Release identity](release.json), [complete file manifest](frontend-files.json)
and [build provenance](frontend-build-manifest.json):

- Frontend build source: `391df3a0a4165d4aaa05e3bc35612689b52b061c`, branch
  `release/btz-prelaunch-playability`; clean reviewed builder input.
- Qualified source: `e85f45171e244a92093a779c1b567baf2d2e6650`; all six substantive hosted jobs PASS. Production-inventory BLOCKED remains informational.
- Frontend JS: `1b6a6d26ba6b3669d16d22bd5e39ed383d31280d00b13cbfff307ed54c0aa72c`.
- Complete 15-file manifest: `444d0fda939dd715ac98010f958da470cca0ed163dd82bd215ecabd7f30dcc8c`.
- Preserved installed backend: `612ad0d089c637f32cd1a050cbb9dc01ae6245145b9640086c009dbde8a8e948`.
- DTR: `282d709143dacb4bca769a4d6e72b97fc93ef518`, client 0.15.0;
  immutable dependency/package unchanged. Frozen normal Wasm is separately
  identified and was not replaced by a later test build.

[Certified controller/placement checks](controllers-placement-current.json)
agree with the [before capture](controllers-placement-before.json): backend and
frontend module hashes/controllers unchanged; intended European subnet, 13 nodes.
The [independent frozen/proof verifier](verify-frozen.mjs) checks every asset, the
preserved normal Wasm, IC root/canister/delegation, archived artifacts and source/
destination. Run `node evidence/B2Z/minimal-isometric/verify-frozen.mjs`;
[result](frozen-verification.json) PASS. It explicitly controls the offline Node
clock at the recorded observation time, preserves the normal SDK/DTR freshness
limits, and proves rejection after another 301 seconds. It does not make an old
certificate fresh for live use or change installed/browser verification.

The source diff contains no changes under canisters/native/packages/vendor or
root Cargo inputs. No backend install, upgrade, reset, pause or transition occurred.
There was no controller change, manual transfer, funding purchase or former-target
action. Only the existing European frontend assets were published.

[Authenticated post-publication preservation](production-preservation.json),
2026-11-08 18:30:36 UTC, with [before proof bytes](production-before/result.json)
and [after proof bytes](production-after/result.json): rules 7/schema 6,
1000×1000, epoch/transition 4, existing paid cannon/ball retained. Logical time
progressed from 1568 to 1595; received total remains 100,000,000 e8s and source
cursor 40180669. Source binding is healthy, no pending records/errors; treasury
is Idle without an error/pending plan. Its previous autonomous conversion and
conversion totals are unchanged. No manual financial operation was initiated.

Query-observed backend total **2,824,626,123,527 cycles**, liquid
**2,768,393,821,427**, selected/supported **Lifeline, 0.05 ticks/s**, admission open.
[Controller frontend status](deployment-after-frontend.txt) records
**1,486,018,868,740 total cycles**; frontend liquid is not separately exposed by
that status. Balances/pace are operational observations, not certified game facts.
No platform reservation is subtracted twice. This is verification under the
existing one-cannon/one-ball workload, not an operating-cost or lifetime experiment.
Autonomous paid-world motion/scoring/maintenance continue; preservation does not
mean byte-identical world state.

Principal-first destination independently derives and matches authenticated
default account:

`s5ir5-gqaaa-aaaas-amyna-cai`

`c58487869d46ef0494c7d7c0312b2760abb7164eafd23f0009a42b9545f53bde`

Official Ledger `ryjl3-tyaaa-aaaaa-aaaba-cai` / Index
`qhbym-qaaaa-aaaaa-aaafq-cai`; source identity and rule/config/schema hashes are in
the capture. Actual-paying-account authority, financial journals, receipt/cursor
semantics and Ledger-only commands are unchanged. Trickle entry 1.25T, exit below
1T, 0.01 ticks/s, upper/source/treasury floors, disabled Event Horizon and
independent 60-second fallback remain unchanged. No polling/funding experiment
was performed for this frontend release.

## Publication, deployment and rollback

The [exact-source hosted record](hosted-ci.json) lists all six substantive PASS
conclusions: Source conformance; Native conformance; Packaged DTR/clean consumers;
Runtime-lab Wasm; Browser HTTP/Web Crypto; S14/million-cell installed-IC qualification.
The inventory wrapper remains separately informational/BLOCKED. The failed prior
`391df3a` run and focused correction evidence are retained above, not relabelled.

The [immediate preflight](deployment-preflight.json) and certified
[before](deployment-before-metadata.json)/[after](deployment-after-metadata.json)
metadata confirm the existing targets, unchanged controller sets, backend module
`612ad0d0…`, frontend module `04e565b3…`, expected European subnet and 13 actual nodes.
The independently derived backend/default AccountIdentifier agrees with the
certified source and wallet panel. The already-installed paid game was not treated
as an empty installation target.

The established observer-only command, with existing `codex_local` controller
identity, `--no-wallet` and `--no-asset-upgrade`, published the exact preserved staged
assets once. [Publication log](frontend-publication.log). It did not build/deploy
or upgrade the backend or upgrade the asset-canister module.
[All 14 served public files and every security header](served-verification.json)
match the frozen set, including HTML, CSS, JS, configurations and provenance.
[Complete public inventory](served-asset-inventory.json) has exactly the expected
14 keys; `.ic-assets.json5` is the fifteenth local manifest entry whose policy is
checked against every response. Matching JS alone was not used as the release gate.
CSP remains hardened/self-hosted and browser Web Crypto/certificate checks are real.

[Final production browser result](production-browser.json): **PASS** at 1440×900,
390×844 and 320×640, sandboxed Chromium 153.0.8010.12, real HTTPS/IC-root certificate
verification against the actually served bundle. The verified existing paid world
is visible without declaration. Join uses a public principal only as a local
sending-account declaration, with no key-control claim, wallet or transfer.
Exact canonical amount, principal/legacy recipient, readable memo bytes and payer match;
fee/retention wording is visible and all controls remain reachable. Activity is
backend scoped. Desktop also prepares an existing cannon's canonical Fire draft.
No production entities or payments were fabricated.

The measured post-startup journey windows are 189.70 s desktop, 41.54 s at 390px,
and 29.87 s at 320px. Each preserves the exact clock/queue identity through panels,
aiming/editing, copies and account changes, finishes PLAYING/Slow with fresh
certificates and zero resynchronisations, within queue/byte bounds. Desktop includes
45 seconds of explicit continuing observation after repeated panel use. The browser
made only query/read_state API POSTs, no gameplay updates, and no refresh/page errors.
These are bounded functional journeys, not hardware FPS or production-lifetime claims.

Actual production screenshots: [desktop wallet](production-1440x900-wallet.png),
[390px wallet](production-390x844-wallet.png), [320px wallet](production-320x640-wallet.png)
and [desktop continuing arena](production-1440x900-after-observation.png).
Short actual recordings: [desktop](production-1440.webm), [390px](production-390.webm),
[320px](production-320.webm); [source/clip identities](production-media.json).
Clips are chronological packet copies, with no speed change or generated frames.
The prior disposable recordings qualify scenarios unavailable in this paid world.
One initial browser process received SIGTERM; another desktop attempt passed its
application assertions before a local recording-path ValueError. These are retained
as [interruption](production-smoke-interruption.json)/[packaging failure](production-smoke-packaging-failure.json),
not passes. The path-only correction leaves all application assertions intact;
all three final independent viewport runs complete cleanly.

The [preceding served set/CSP recheck](prior-served-preservation.json) retains the
old complete set separately in `.work/minimal-isometric/rollback/frontend`;
[manifest](rollback-files.json), SHA-256
`2b1da4a704a04644b45693470319b616c3d575e43c2a1f24bcf331cbe0e0d7eb`.
Old JS `b452a8bdd5632bf9c9bc20500e768c725add15b72c21a9b980386dc31b48c07c`.
The operator can verify/stage that exact set and use the same observer-only asset
command after reconciling state. No automatic rollback; frontend rollback cannot
reset or roll back paid backend state.

## Limits

No wallet extension/device was accessible for no-transfer recipient/memo UI
checks. Official ICRC text/subaccount vectors and exact UTF-8/hex bytes pass;
universal wallet compatibility is not claimed. Native browser-zoom shortcut did
not change DPR under this headless setup; 150% root text-size and viewport/keyboard
resize emulations pass, not native OS keyboard/zoom coverage. No physical-phone,
new human research, real-wallet payment or new maximum-population qualification.
Receipt association remains unavailable with current fields; missing retained
history is not payment failure. No refund/payout or resend promise is introduced.
The completed report/evidence and current-document updates are saved in a separate
local documentation commit after qualification, per AGENTS.md's user-owned remote
Git rule. Its exact identity is returned in the completion message. Runtime/build
source and qualified source above remain the published immutable identities;
no artifact was rebuilt for this later record. The European frontend release has
no remaining deployment blocker. Stop expanding the implementation until further
actual human usability feedback. Performance/device/wallet limitations remain
qualifications, not fabricated passes.
