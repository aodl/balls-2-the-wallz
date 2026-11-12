# Human playtest corrections — frozen frontend candidate

**Not deployed. Final qualification is in progress.** The paid backend, installed
frontend, configuration, prices, Ledger processing and payment execution have not
been changed. No transaction, allowance, transfer, controller/settings action,
backend deployment or ICRC-2 activation occurred.

## Source and installed baseline

Starting checkout: clean `ec15ffd`, branch `release/btz-prelaunch-playability`.
Read-only GitHub inspection found remote `d0d613ecfd4bb6935b2f32e93ea5b690a8b37411`,
still unchanged at the candidate freeze. The local evidence commits after that
remote head were preserved. Reviewed/served runtime was
`b0f6c7a0cb9f3b9f9159d28d8708588fc8bc5af0`.

All 15 served public assets were independently downloaded from
`https://s2jxj-liaaa-aaaas-amynq-cai.icp0.io/` and matched the reviewed inventory.
The consumed upload policy was retained from the corresponding exact prior
freeze. Previous JS SHA256:
`42f30ead0cb709c8a961aa6be1289f37d9a9b103d709eb89edf1aa9ffa888dd5`.
Previous complete 16-file inventory SHA256:
`216fac297573ff42e67ca0641c4a169acfa8bb4ea6b82c5e370e88abb2985fa2`.
Raw bytes/headers are under `.work/human-corrections/baseline/served-assets/` and
`served-all-files.json`; no installed bytes were written.

Read-only cold production sessions reproduced the issue at 1440×900, 390×844 and
320×640: one active ball, H=6861, empty queue, playhead=available=6858,
“Waiting for next update”. Verified world acquisition was 4.363 / 3.579 / 3.739
seconds. These are fresh 12 November observations, distinct from the earlier
ReserveProtection evidence. Nothing changed the live operating mode.

Frozen runtime source: **`4c63a3b97eaa222b332bf04671c09ccbfc12213e`**, clean.
Progress commits `1ccd4b1`, `1dd7fd5` and `4c63a3b` preserve the implementation and
reviewed corrections. Subsequent evidence-only commits must not be represented
as rebuilds or substituted for the frozen source.

## Exact frontend artifacts

The existing playability builder produced
`.work/human-corrections/frozen/frontend/`, with `source_dirty=false`, ordinary
mainnet policy, pinned mainnet root and `local_test_only=false`. No builder,
configuration generator, dependency lock, Candid interface or backend source was
changed. Its 16 files comprise 15 public assets and the consumed upload policy.

- JS SHA256: `cd44e2a35d2904e5af27ea63f6f6700747a28709b672520c7a1adf7a80de7dc0`.
- Build-manifest SHA256: `f2c5cb1bd7b4aee57a3b84fc33acedec5b2e778264f2307fe7f8f5106efae790`.
- Complete [frontend-files.json](frontend-files.json) SHA256:
  `7380a1bf7041be0f96288c1f92b19d820377569ab5f0c1f36e0a019003082d18`.

Only `app.mjs`, `index.html`, `style.css` and provenance `build-manifest.json`
differ from the installed set. JS grows from 1,993,586 to 2,008,761 bytes
(+15,175 bytes; 0.76%, before transfer compression).

Runtime files changed under `apps/b2z-observer/`: `app.mjs`, `arcade.mjs`,
`bounded-observation.mjs`, `experience-status.mjs`, `guide-clearance.mjs`,
`index.html`, `interaction.mjs`, `live-delivery.mjs`, `mainnet.mjs`, `minimap.mjs`,
`public-cycles.mjs`, `render.mjs`, `shell.mjs`, `startup-playback.mjs`, `style.css`.
Build tooling is unchanged. Regression tools/fixtures and the installed-browser
case were updated; existing gates remain and the direct-input acceptance was
added to the Browser gate. UX-01 through UX-13 and the UXR matrix are maintained in
[B2Z_HUMAN_EXPERIENCE.md](../../../docs/specs/B2Z_HUMAN_EXPERIENCE.md).
The [operator procedure](../../../docs/operations/S14_OPERATOR.md) documents the
frontend-only qualification and exact-artifact publication boundary.

## Authenticated startup and authority separation

Startup authenticates the latest publication, source/configuration and artifacts.
Its latest world remains the financial/ownership/receipt reference. Concurrently,
one optional predecessor catalog and its state chunks are acquired, within a
2,000 ms budget. The pinned DTR predecessor verifier, artifact assembler, seals,
deterministic `prepareDerivedSegment` and `SegmentPlayer` establish presentation.
There is no next-state game simulation or prediction.

Initial presentation is committed once. An available complete interval starts at
its authenticated beginning and plays immediately. Missing/pruned/timed-out
history falls back to the latest authenticated snapshot. Late responses cannot
rewind that committed world, start a second queue or accept unverified motion.
A zero-time checkpoint/genesis has no invented interval. Invalid historical proof
is a hard verification error with the latest trusted snapshot retained.

The central acceptance uses the actual pinned disposable IC root, certificate
verification and unchanged normal module, with a completed moving interval at
H=1 and its predecessor retained. The host is paused after publishing H; Rust
asserts H remains unchanged through the entire browser run. The screen moves from
logical time 1 to 2 while the financial reference remains H/time 2, exhausts once,
and remains at 2 after every recovery. No H+1 is required.

[Certified measurements](certified-acceptance.json) record the complete PASS
against clean frozen source. The earlier development summary remains separately
preserved as [certified-development-1ccd4b1.json](certified-development-1ccd4b1.json).
The clean run measured two additional historical queries, 3,822 response-content
bytes and 345.7 ms historical acquisition. The latest reference/world was acquired
at 3.782 s, the first sampled verified frame at 4.844 s and first sampled changed
position at 6.621 s. These include software rendering, shader startup and video
capture; they do not establish physical-device latency or a production speed
comparison. A complete follow-up fixed-H/outage run also passes; its
[startup timing summary](startup-timing-acceptance.json) measures current authority
at 2.884 s, first verified frame and known operating state at 3.619 s, and first
sampled motion at 5.723 s. Its normal mainnet JS equals the frozen JS byte for
byte; the raw development-qualifier provenance is retained separately.
The latest authoritative reference was time 2 in every sampled frame.
A deliberately held predecessor hit its bounded two-second deadline, exposed the
trusted latest world and never rewound when the real response arrived late.
Slow optional operational status did not block the world, and payment preparation
stayed disabled until status was available. Exact measurements are in the JSON.

A separate read-only cold session used the **exact frozen bytes** on loopback
against the actual mainnet backend. [candidate-mainnet-startup.json](candidate-mainnet-startup.json)
records H=6933 throughout its sample window, first presentation behind the latest
financial reference, and an admitted historical interval. Historical acquisition
added two requests / 16,193 content bytes / 599.3 ms. Latest authority was ready at
3.389 s, the first verified frame and known operating state at 4.372 s, and first
sampled motion at 5.794 s. Latest verified state was 12,109 bytes and queued
interval 36,879 bytes. Seventeen total read-only POSTs include normal observation,
status/source/certificate work during the observation window; only the two history
requests are new. This is candidate-on-loopback evidence, **not a deployment**.
[Actual capture](media/candidate-mainnet-startup.png) and
[recording](media/candidate-mainnet-startup.webm).

No recurring backend update or new service is introduced. Observation remains
single-flight with existing hidden scheduling and verified queue/byte bounds.
SDK retries are zero so the application owns bounded retry/backoff rather than
stacking retry loops. Optional status and cycles start independently. Financial
freshness, operational confirmation, certified source identity and all quote
validation remain required even while earlier authenticated motion is shown.

## Recovery and truthful status

Transport availability is explicitly separate from integrity. Timeouts, lifecycle
aborts, 408/429/5xx, retryable fetch failures and past/outdated certificates are
rejected and retried, never accepted as fresh data. Unknown SDK trust errors,
wrong signatures/roots/bindings, conflicting same-height heads, unauthorized
identities, hash/length errors and invalid chains fail closed immediately.

A temporary outage preserves session, clock, unconsumed queue, camera, selection,
draft and saved instructions. Exponential retry has jitter and a 30-second cap;
operational failures have a two-second minimum and bounded backoff. Resume causes
an immediate generation-fenced retry. Last operational state retains its original
age instead of disappearing. Freshness still disables financial copying.
A successful generic response cannot clear a hard integrity barrier. Explicit
**Retry verification** creates a fully verified new session and retains the
previous authenticated sequence floor; it does not just clear an error flag.

The clean-source actual elapsed outages passed as follows. Counts include both
observation and operational query attempts.

| Outage | Injected response | Query attempts | Action-panel drift | Recovery |
| --- | --- | ---: | ---: | --- |
| 5 seconds | 503 | 6 | 0 px | Automatic; same session |
| 30 seconds | 429 | 13 | 0 px | Automatic; same session |
| 90 seconds | 503 | 17 | 0 px | Automatic; same session |
| 180 seconds | 503 | 24 | 0 px | Automatic; same session |

There was no navigation/reload, history replay or advance beyond verified time 2.
Cold load during an outage recovered automatically. A deliberately wrong public
root produced an actual SDK invalid-signature rejection after HTTP availability
returned and remained blocked, with payment controls disabled. Expired/stale
certificates, conflicts, authentic older epochs, source gaps/resync and late
responses also retain their existing source-integrated regressions.

| Condition | Arena/status treatment | Payment preparation |
| --- | --- | --- |
| Initial authenticated acquisition | 52 px ring; **Catching up with on-chain activity ...** | Disabled |
| Genuine authenticated backlog | Same exact catch-up wording | Latest authority/freshness requirements |
| Useful verified motion playing | Central ring removed | Latest authority/freshness requirements |
| Active balls, exhausted available coverage | Ring; **Waiting for next on-chain update** | Latest authority/freshness requirements |
| No balls/players | Meaningful idle status; no fabricated motion | Normal independent requirements |
| Paused/protected world | Applicable pause/protection status | Disabled where admission is closed |
| Temporary delivery interruption | Reconnecting; **Temporarily unable to reach the game. Retrying automatically.** in status details; trusted scene retained | Disabled |
| Integrity failure | **Unable to verify game data.**, explicit Retry verification; no normal waiting ring | Disabled |
| Optional operational failure | Previous state retains its age; no reconnect announcement from that failure alone | Disabled after required freshness expires |
| Optional cycles failure | **Cycle data temporarily unavailable** | Independent of telemetry |

The ring is nonblocking, has no backdrop/countdown, and becomes static under
reduced motion. Initial acquisition is visible immediately. Other central waits
are debounced 350 ms; reconnect labels use 700 ms entry/1,200 ms hold hysteresis.
Readiness changes immediately, independently of label hysteresis.
No live reconnecting paragraph is inserted in the payment form. Existing payment
rows, amounts, memo and draft remain stable, with disabled copy buttons and an
accessible temporary-unavailability label. Optional telemetry never clears the
world/session. No zero-second burn estimate or unavailable/day/reserve prose is
shown. Deadline/abort races retire the telemetry slot and fence late replies;
retry remains minute-scale with a five-minute cap. Caveats stay in diagnostics
and documentation.

## Direct interaction and renderer evidence

[Native-input measurements](interaction-acceptance.json) and recordings exercise
real mouse, emulated touch and keyboard events in populated actual components.
These scenes have canonical historical data; their screenshots do not themselves
claim IC authenticity. The separate installed test supplies that evidence.

- Cannon click selects and warms the whole body, preserving exact centre/scale.
  Explicit Focus remains the navigation action. A real touch retargeting defect
  was reproduced: the compatibility click hit a newly revealed toolbar button.
  A coordinate/time fence now consumes that completed touch click; subsequent
  independent pointer-down events are unaffected.
- Fire click/drag near the body owns aiming at pointer-down; outside drag owns
  pan throughout. Second touch relinquishes aim to pinch. Build's different
  eligible destination takes priority even inside the aim halo. Move remains
  tile selection. Pointer cancel, freeze, visibility and context loss release
  gestures. Existing canonical delayed-cell intent and double-click policy remain.
- Local proposed state is explicit; removed DOM fields are not hidden authorities.
  The quantized barrel/guide/memo agree. Brackets/handle arrows adjust heading,
  Shift uses 5° and Alt uses 0.01°. Alt+arena arrows navigate canonical cells;
  Enter commits legal placement. Join retains a compact accessible direction pad.
- Real, selected, Build and Move use the same base/turret/barrel/muzzle/accent
  transforms. Actual instance matrices are compared. Move retains verified
  heading; Build covers all eight principal directions. Warm translucent ghosts
  have a dark contour and an exact square-world-tile footprint. Cell 0, wrap seam,
  same-cell Move rejection, source identity and edge clearance remain tested.
- Fire/Move/Build contain no angle/cell inputs or eligible-cell dropdown. All exact
  recipient, memo, amount, payer, fee, retained-payment warning and frozen-copy
  Update/Keep requirements remain. No wallet connection/signing was added.
- Ball click follows actual displayed positions with unchanged zoom. Away click,
  empty-terrain drag, cannon selection, explicit navigation and Escape stop
  following at the current camera pose. The persistent Following ball dialogue
  is absent; a restrained screen-reader announcement remains.
- The diamond minimap has no canonical-cut border. A remaining 197-pixel
  translucent cross was caught after removing the explicit stroke. Joining the
  four source rectangles before projection removes it: four origins each sample
  6,310 interior pixels with zero wrong pixels and minimum alpha 255. Ownership,
  markers, DPR, viewport footprint and exact inverse navigation remain intact.
- Guide clipping uses cached actual UI rectangles, preserving origin/direction,
  arrowhead and memo. Eight directions pass at all target sizes. Intermediate
  internal grid ink changes smoothly from 0.13 to 0.22 over the scale range;
  ownership boundaries and close-up legibility remain. Matched before/after grid
  frames use identical populated poses at close/intermediate/widest views.
  Ball tail/wake implementation is unchanged.

Visual closeout passes 1440×900, 390×844 and 320×640, including 430/300 px contracted
viewports, native precise keyboard aiming, one reachable payment scrollport,
forced colours, reduced transparency and reduced motion. The contraction test
found and fixed an offscreen early-return that otherwise prevented action-layout
recovery. Focus, toolbar rectangles, ghost/source separation and financial bytes
remain checked. Actual-speed comparisons at 0.01, 0.05 and 1 tick/second are complete. See
[actual-speed.json](actual-speed.json) and the `media/motion-*` screenshots and
recordings. Wall-clock windows were 22, 8 and 0.65 seconds per variant. The current
normal-speed tail remains clearly visible; the tail/wake implementation is
unchanged. Frame-dependent sample counts are not physics/trajectory claims.

The [viewport status captures](status-viewports.json) additionally pass all three
required sizes using the exact frozen assets and actual mainnet certificates.
Only the initial browser-local observation route is held for acquisition capture;
a browser-local 503 fault then produces Reconnecting and automatic recovery in
the same trusted session. Actual prior-production cold captures are preserved
with their baseline source identity. Intentionally held route tasks produced
harness teardown warnings, recorded in the raw log; application page errors are
empty and every recovery/assertion completes. No production asset changed.

Representative media (all actual browser captures):

- [Prior deployed cold world](media/1440-production-baseline-verified.png),
  [candidate cold spinner](media/1440-mainnet-candidate-cold-spinner.png),
  [390 px reconnecting](media/390-mainnet-candidate-reconnecting.png),
  [320 px recovered](media/320-mainnet-candidate-recovered.png),
  [certified fixed-H recording](media/fixed-H-and-recovery.webm).
- [Selected cannon](media/1440-selected.png), [near-body aiming](media/390-near-click-aim.png),
  [Move](media/1440-move.png), [Build](media/1440-build-45.png).
- [320 px stable payment pane](media/320-stable-status.png),
  [contracted 390×300](media/390-contracted-300.png),
  [upward guide clearance](media/320-upward-guide-clearance.png),
  [following without dialogue](media/390-follow-no-dialogue.png).
- Native-input recordings: [desktop](media/1440-native-input.webm),
  [390 px](media/390-native-input.webm), [320 px](media/320-native-input.webm).
- Matched grid views: [intermediate before](media/1440-grid-intermediate-before.png)
  / [after](media/1440-grid-intermediate-after.png); the media directory also
  retains close/wide pairs at all three sizes.

## Qualification, remaining limits and deployment boundary

PASS: current direct-input acceptance (all three sizes), UXR refinement (all
three), focused contraction recheck, visual closeout (all three), 96 GPU grid
seam comparisons, 16 guide-depth comparisons with a negative control, complete
source conformance (1,845 JS / 199 Python tests plus structure/documentation),
HTTP/Web Crypto, lifecycle wire capture with independent replay, tactical
journeys, elastic return, clean-source installed certified acceptance, and frozen
read-only mainnet observation (all three sizes). The frozen check fetched every
public asset over HTTP and compared its bytes to the freeze. Mobile canonical
copy/Keep used `FIRE 1 255 1`, amount `0.1 ICP`, the verified recipient and exact
payer. Desktop copying remained gated when readiness was unavailable; no safety
bypass was used. See [frozen-read-only.json](frozen-read-only.json).

Genuine native browser visibility also passes. [native-visibility.json](native-visibility.json)
records ordinary Chromium connected with CDP `no_defaults`, actual same-window
tabs and real `document.hidden` transitions. A 35.004-second absence made two
background requests (65,239 encoded bytes), retained session/clock/queue, observed
visibility return in 227 ms and fresh authenticated state in 1,162 ms. A short
3-second return and controlled 8-second frozen suspension also passed. The latter
is labelled controlled; neither is physical-phone/hardware evidence. First warm
render submission was 17.1 ms, which is explicitly not a measured presented-frame
latency. The first ordinary Playwright path failed its same-window setup check;
the maintained CDP path now creates actual tabs and passes without changing any
security/throttling policy. [Returned scene](media/native-hidden-return.png).

[Performance measurements](performance.json) repeat the five-second comparisons
with fresh browser/GPU processes per viewport and no other browser journeys
running. The earlier contended run remains under `.work/human-corrections/performance/`;
it is not used to assert an improvement. These are software WebGL measurements,
not a performance PASS or hardware qualification.

| Viewport | Scene | Before p95 frame ms | Candidate p95 frame ms |
| --- | --- | ---: | ---: |
| 1440×900 | Six entities / seam | 133.4 | 66.7 |
| 1440×900 | Motion / Fire pane | 116.7 | 83.3 |
| 1440×900 | Build preview | 300.0 | 83.4 |
| 390×844 | Six entities / seam | 50.1 | 33.4 |
| 390×844 | Motion / Fire pane | 66.7 | 50.0 |
| 390×844 | Build preview | 66.7 | 50.0 |
| 320×640 | Six entities / seam | 50.0 | 33.4 |
| 320×640 | Motion / Fire pane | 33.4 | 66.7 |
| 320×640 | Build preview | 33.4 | 50.1 |

The narrowest viewport has mixed software frame-cadence results; no blanket
smoothness/improvement claim is made. The five-second CPU-task windows are
saturated near five seconds in both variants. Reported JS heaps are 20.5 MB for
both desktop variants, 23.1 MB for both 390 px variants, and 21.7→23.1 MB at 320 px;
these coarse browser readings are not total native/GPU memory. Selected-body and
complete preview materials add a bounded number of instanced draws, while the
terrain/minimap stay cached and no extra animation loop is added.

The initial prescribed `verify_s14_local.py` attempt failed its 900-second cold
normal-Wasm build deadline and terminated its owned process group. This is
preserved as FAIL, not disguised as a certificate/integration result. The focused
named installed test reuses reviewed normal Wasm SHA256
`74ee4d172801e6d89987950376c4cda2015233ed605c967491e773c5b5a3f510` with unchanged
backend/locks verified against the reviewed runtime. This avoids repeated
unaffected builds and supplies exactly the browser/certificate evidence it
executes, not new Candid, upgrade, ledger-cost or production-readiness evidence.

Exact-source hosted CI is in progress. The owner published qualifier
`47f563b88ee430c3a990715d8e4a1547cbf18511` in
[run 43299116175](https://github.com/aodl/balls-2-the-wallz/actions/runs/43299116175).
Source, Native, Packaged DTR/clean consumers and Wasm passed. Browser failed an
older Locate test setup: direct fixture camera mutation raced unfinished
composition, so its offscreen premise was false. The runtime was not altered to
satisfy the test. The setup now settles entry and explicitly takes manual camera
ownership before its geometric move; the original offscreen/inert/clock checks
remain. A controlled prior-owner negative test reproduces the old premise failure
and confirms native Locate at all three sizes. The complete updated action suite
also passes locally. That failing CI evidence remains tied to `47f563b`.

Qualifier correction `052294d` adds the setup correction, four startup timing
milestones and retained installed-browser artifacts. It changes no frozen runtime,
asset-builder input, lock, configuration or backend. Its owner publication and
six conclusions remain pending. The six substantive jobs are Source conformance,
Native conformance, Packaged DTR and clean consumers, Runtime-lab Wasm, Browser
HTTP and Web Crypto, and S14/million-cell installed-IC qualification. Older green
runs and the informational BLOCKED production inventory do not substitute for
those exact-source conclusions. AGENTS.md reserves remote Git operations for the
owner; no remote write was performed here.

Software WebGL, emulated viewport/touch, and controlled lifecycle input do not
establish physical-device performance, hardware GPU performance or genuine
native hidden-tab/suspension qualification. The extra rebased minimap canvas has
a bounded 4,000,000-byte backing for 1,000×1,000 pixels; native/GPU total memory
cannot be inferred from JS heap. Persistent-outage tests are real elapsed browser
faults, not claims about a production subnet-upgrade incident.

A separate owner decision must approve the exact JS/inventory hashes and the six
exact-source conclusions before publication. Use the established asset-only
route in S14_OPERATOR; do not rebuild or substitute a later bundle. No deployment
is authorized by the correction task. After an authorized frontend deployment,
independently fetch all public bytes/headers and compare the consumed policy.
Only then record it as served.

Rollback remains frontend-only: retain the prior 16-file freeze and consumed
policy already preserved under `.work/human-corrections/baseline/served-assets/`,
restore that exact approved set through the same separately authorized asset
route, and independently verify bytes/headers. Never reinstall/reset/upgrade the
funded backend to change frontend behavior or source configuration. No release
ZIP was created.
