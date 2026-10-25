# Million-cell final qualification — NO-GO pending strict sustained Normal and new harness CI

**2026-10-25:** published candidate `ae3ef1ce38cee8a6b33b051c924a66d9bcba3dbf`
passed exact-commit [CI 40144120473](https://github.com/aodl/balls-2-the-wallz/actions/runs/40144120473):
all six substantive jobs, including 40 installed/source cases and 48 runner checks.
All six evidence archives were downloaded and checksum-verified. The informational
BLOCKED inventory job is not deployment approval. New harness code is separately
committed and locally checked; that old CI result does not qualify changed code.

Existing successful 90-second tests remain **PASS**. The video-on 900-second
extension is **FAIL** (16 resynchronizations and stalls). Removing only optional
software video recording resolves delivery stalls in the full comparison while
preserving real sandboxed rendering, authentication, raw wire data, telemetry,
rates and buffer bounds. No production/backend/frontend source or artifact changed.

The video-free **900.23-second** run produces **0.992–0.996 ticks/s** including
backend polling uncertainty, admits **0.99308**, and displays **0.99392**.
Buffer **17.1573 → 16.4035** ticks; all 15 rolling-minute buckets retained;
zero stalls, rebuffering or resynchronizations. These rate/buffer subchecks pass.
**The strict overall gate remains FAIL:** Normal's target stays 1 tick/s, but
performance protection reports supported 0.777 and 0.971 tick/s during one brief
episode (16 sampled rows). This failure is not waived or renamed PASS. Cold
Lifeline reconnect passes across six subsequent authenticated publications.
Independent replay passes 1,040 consecutive captured v5 publications.

The earlier 87 admitted / 89.145 displayed sample consumes exactly 2.145 buffered
ticks. New aligned counters, conservation checks, rolling trends, timed independent
backend polls and supported-rate episodes are preserved in the review evidence.
Suitable exact-commit CI qualification of the extended harness remains required;
no further performance redesign or acceptance relaxation was attempted.

Frozen normal Wasm remains
`7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51`;
the complete frontend set is unchanged (`app.mjs`
`3c593c54fe09997eabada19d3aee02f2cc7c39d1d5a0baea59b3e3516f61b732`).
DTR remains immutable 0.14 at `e1bfcf25071d11190d14f461288e12a21ca26cf8`.
Exact-predecessor paid-state/treasury preservation evidence remains PASS.

[Final acceptance and provenance](evidence/B2Z/million-cell-release/final-qualification.json)
· [Prepared future preflight/activation order](docs/operations/B2Z_MILLION_PREFLIGHT.md).
No mainnet call/mutation, v5 activation, master merge, financial/controller action
or remote Git mutation was performed. Stop at this qualification boundary.

---

# Million-cell v5 — local gates pass; candidate for exact-commit CI

**2026-10-24:** production `master` at `e052f77` is merged without rewriting
history. Rust/npm use immutable DTR `e1bfcf25071d11190d14f461288e12a21ca26cf8`,
client **0.14.0**. Clean isolated consumers reproduce package SHA-256
`ea5e8f471ab15cadb09367c6391b74054918665f797381c776b630c5082938dc`.
The v8 observer test executes: **1 PASS, 0 skipped**.

Current gates pass: **1,379 JS**, **145 Python**, **22 workspace + 14 portable
Rust**, **25 canister host tests**, Wasm/Candid/Clippy, **14 HTTP browser groups**,
**8 isolated DTR-consumer checks**, and the complete installed-IC runner:
**40 selected cases / 48 checks** (30 genuine installed cases plus 10 source units).

Two successive current four-ball Normal samples on the actual normal Wasm
measured **0.946 / 0.968 / 0.992** and **0.947 / 0.969 / 0.993**
produced / authenticated-admitted / displayed ticks per second. Both have zero
stalls/resynchronizations and no performance limit. Economy, Lifeline, cold
reconnect and exact independent replay of **136 / 137** captured publications
pass. Earlier failed probes remain explicitly failed in the evidence.

Production's seven active pacing tiers and Reserve Protection are preserved.
The client queue is 24 segments / 8 MiB, separate from backend retention of
16 publications / 8 MiB. Bounded startup/resume capacity and ordered catch-up
pass all 18 buffering/concurrency regressions; Normal stays exactly 1 tick/s.

The exact installed predecessor `c7c69ddf…` passes state-preserving normal-Wasm
upgrade, followed by a separately authenticated v4→v5 transition. Paid state,
source progress, all retained publication/chunk bytes and enabled treasury are
preserved. Interrupted recovery, manifests, fencing and exact/conflicting
retries pass; actual v8 SDK certificate/artifact verification passes. Pending CMC
notification survives transition/two upgrades and completes once; post-migration
payment ingestion and treasury sweep pass. The 64-ball normal-Wasm fixture passes.

Qualified normal Wasm SHA-256:
`7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51`.
Production frontend `app.mjs` SHA-256:
`3c593c54fe09997eabada19d3aee02f2cc7c39d1d5a0baea59b3e3516f61b732`.

[Reviewed acceptance, artifact hashes, measurements and reproduction paths](evidence/B2Z/million-cell-release/qualification.json).
[Earlier development/failed-probe record](evidence/B2Z/million-cell-release/progress.json).
Exact-candidate remote CI remains pending the **user-owned push**. No mainnet
operation, world activation, financial action or remote Git operation was performed.

---

# Graduated pacing — installed on mainnet

**2026-10-24:** published release `2b5e61746cab6b992afe969d5cc60363d32f6a66`
passed [CI 40091977098](https://github.com/aodl/balls-2-the-wallz/actions/runs/40091977098),
including all 25 host tests and the complete installed-IC runner (37 active cases).
After the user supplied cycles, the existing backend `s34gv-3qaaa-aaaar-qcifa-cai`
was upgraded in place using the exact frozen normal Wasm:
`c7c69ddf938676902def27817bd22e693512f4a05d07e35300c76a281894d3db`.
The CI-built variant was not substituted. DTR remains immutable `c12af747…`,
client **0.13.0**; no million-cell work was performed.

Paused before/after comparisons pass for exact paid 32×32 v4 world, credits,
scores, events, source identity/cursor, current publication, all three retained
publication/chunk sets and pending work. Logical time was **53,428** on both sides.
The advertised retention limit changes from 3 to 16 as intended; existing bytes
and the 8 MiB cap remain preserved. Backend and observer controllers are unchanged.
The existing observer's eight public files match the frozen release; `app.mjs` is
`975769cf19225671830403ac103a1299aa9ac42638eba05f5cabf55413bd140d`.

Resumed with the same `segment_ticks=2`, `pacing_seconds=1`, `work_budget=512`.
Actual liquid cycles are **19,892,335,131,245**, selecting **Economy**, target and
supported rate **0.5 tick/s**, `performance_limited=false`. Certified browser
measurement over **88.9964 seconds**: produced **0.5169**, authenticated admitted
**0.4944**, displayed **0.4940 ticks/s**, zero stalls/resynchronizations or browser
errors. Normal remains exactly 1 tick/s and requires 40T entry; Economy is the
correct funding selection. All seven modes, hysteresis and Lifeline 0.05 remain
covered by the passing release tests.

The independent treasury ran after upgrade on its five-minute timer, with fresh
successful Ledger balance/fee observations. It is enabled, not halted, Idle with
no pending transfer and **zero ICP** available to convert. Its old insufficient
liquid-cycles error is retained history: the zero-balance return does not clear
that field. No real financial probe or agent transfer was performed. Last
successful conversion and funding history survive the upgrade.

[Reviewed activation, exact hashes and preservation evidence](evidence/B2Z/graduated-pacing/activation.json).
Raw deployment/certified/browser records are under `.work/pacing-activation/`.
No reset, reinstall, new canister, settings/controller change or remote Git
operation occurred. Earlier staging and blocked captures below are historical.

---

# Graduated pacing — previous local qualification

**2026-10-24:** the pacing follow-up passes all 25 host tests and the complete
installed-IC runner: 37 active cases, followed by exact captured-history JS replay.
Source, native, HTTP/Web Crypto browser, Wasm/Candid/format/Clippy and all eight
DTR-consumer checks pass. DTR remains immutable `c12af747…`, client **0.13.0**.
No million-cell work was performed.

The failed published CI run [40075939494](https://github.com/aodl/balls-2-the-wallz/actions/runs/40075939494)
expected two retained predecessors after eight publications. The corrected test
checks seven, then forces eviction through 48 publications, verifies exact
publication/chunk hashes and the allocated key set, bounds root/artifact/stable
memory, and recovers the same backing memory. Both exact `e1e7b491…` predecessor
upgrade rehearsals preserve the paid world and original three retained publications;
a second upgrade preserves the full 16-publication window. The client verification
helper now enforces the actual 16-entry/8 MiB policy with storage-integrity checks.

**Four repeated authenticated four-ball runs pass:** approximately 89 seconds each,
produced/admitted **0.962–1.008 ticks/s**, displayed **0.983–1.019 ticks/s**, zero
stalls and zero resynchronizations. Counters exclude resynchronization jumps.
The quiet local and downloaded-CI binaries both pass without another buffer or
retention increase. Host contention dominated the prior 0.112 admitted / 0.108
displayed result. Normal remains exactly **1 tick/s**; Lifeline remains **0.05**.
The default paid browser test now measures after initial buffering completes.

The selected normal Wasm remains
`c7c69ddf938676902def27817bd22e693512f4a05d07e35300c76a281894d3db`;
production observer `app.mjs` is
`975769cf19225671830403ac103a1299aa9ac42638eba05f5cabf55413bd140d`.
The different CI Wasm `99b03642…` contains different checkout paths and Rust
symbol hashes. Relocating the same published source reproduces path-sensitive
variation; cross-directory byte reproducibility is not claimed. Exact binaries
were tested separately. Release manifests record the final source and environment.

**Mainnet unchanged.** At 2026-10-24 10:08 UTC the installed module is still
`e1e7b491…`, total/liquid cycles **516,103,600,769 / 372,241,732,619**, Reserve
Protection, running, with no run/source error. Poll counts advance; the independent
treasury is enabled, not halted, but budget-deferred, with no pending plan and
**zero ICP** in the actual receiving Ledger account. The paid 32×32 world, scores,
cursor and certified publication match the first capture exactly. Current Reserve
is consistent with the old **500B recovery entry**, not the candidate 2.5T floor.
The historical 602B query cannot establish the old update-context selection balance.

**Release gates remaining:** user-owned push, green CI on that exact final commit,
cycle headroom, and immediate predecessor/controller/liquid-cycle/state recheck.
The suggested 1T user-owned top-up provides existing-module headroom; it is not
enough for the candidate's 3T active entry or 40T Normal entry. No deployment,
transfer, settings change or remote Git operation was performed.

[Reviewed follow-up evidence and exact asset hashes](evidence/B2Z/graduated-pacing/followup.json).
Final frozen manifests are under `.work/pacing-followup/production/`.
Earlier blocked results below remain historical evidence.

---

# Graduated pacing — previous qualification attempt

**2026-10-23:** pacing checkout `/home/codexdev/b2z-pacing-release`, branch
`checkpoint/b2z-graduated-pacing-release`, has committed delivery/recovery changes
and frozen artifacts from `54fbf69c8a8558f4d0dcff4a1f1b7f8ef072cf56`.
Normal Wasm is `c7c69ddf938676902def27817bd22e693512f4a05d07e35300c76a281894d3db`.
DTR remains published `c12af747…`, client 0.13.0, with unchanged immutable locks
and package integrity. Seven active modes and their hysteresis are covered;
Normal targets 1 tick/s independently of dimensions and Lifeline targets 0.05.

Source (1,354 JS / 145 Python), native (22 workspace / 10 portable Rust),
normal Wasm/Candid/format/Clippy, standalone HTTP/Web Crypto browser and eight
DTR consumer checks pass. Exact installed `e1e7b491…` predecessor upgrade passes
with paid 32×32 state, source cursor, current publication and **all three retained
publications and artifact chunks unchanged**. Independent treasury recovery passes
in Lifeline and Reserve using disposable Ledger/CMC-mock tests. This is local
state-preservation evidence, not a mainnet upgrade or real conversion.

**Sustained authenticated Normal playback FAILS; complete installed-suite and CI
qualification remain incomplete.** Traces expose multi-second query delays,
resynchronizations, buffer exhaustion and, in one run, genuine supported-rate
reduction to 0.405. Counter fixes now exclude snapshot jumps from measured
admission/playout. Bounded concurrent catch-up, continuous polling after progress,
sixteen-publication retention under the unchanged 8 MiB cap and a larger fast-mode
buffer are committed but are **not performance-qualified**. This two-CPU host had
load averages around 14–15 during isolated runs. A quiet host or isolated CI is
needed to distinguish remaining application limits from contention. No failure is
relabeled a pass; an earlier full suite stopped after a PocketIC compiler RPC
failure and does not establish the complete installed-IC gate.

**Mainnet writes: NONE; pushes: NONE; million-cell work: deferred.** Live module
remains `e1e7b491…`, in Reserve Protection, with final observed total/liquid cycles
746,022,785,849 / 602,160,917,699. Authenticated read-only captures preserve the
same paid cannon/ball, scores, received 1 ICP, source cursor 39,582,091 and
publication. The short certified browser sample produces/displays zero ticks/s,
consistent with Reserve. No Normal mainnet claim is made. The original conditional
upgrade authorization remains gated on exact publication, successful complete CI,
performance and immediate predecessor/controller/liquid-cycle/preservation checks.

[Reviewed gates, exact hashes, live state and retained failures](evidence/B2Z/graduated-pacing/verification.json).
Raw results and frozen artifacts remain under `.work/pacing-release/`. The
million-cell checkout and DTR 0.14.0 pins were not changed while priority 1 is blocked.

---

# Current mainnet — 32×32 torus and prelaunch self-funding active

**2026-10-23:** exact user-approved release `4c0cfa6` is deployed on the existing
backend/frontend, after CI [39908809597](https://github.com/aodl/balls-2-the-wallz/actions/runs/39908809597)
passed including installed-IC integration. The user resolved the earlier replica
installation-cycle blocker. Backend normal module SHA-256 is
`e1e7b491215ba34308d757ec2fc1d59b2c631a9c443674149997f4f146fb3fac`.
All published frontend asset hashes match the frozen production observer.

The authenticated v3→v4 transition is complete: **32×32 wrapping world**, same
paid cannon/ball/accounts, exact migrated credits and received 1 ICP. The host
measured exclusive Ledger cutover **39,581,836**, waited for Index watermark
**39,581,837**, and preserved sparse account cursor **39,526,412**. Original v6
bytes remain history. Certified v7 epoch hash:
`09fea5a79ae9df736eb3d73ec7802e9665f0ccec431562d8cfd6d64cfae2d052`.
Exact JS placement equality and the mainnet certificate/proof pass; identical
commit retry returned the original result. Historical unknown heading remains
neutral. No real gameplay ANGLE/MOVE payment was sent.

The treasury was immediately paused after upgrade, then enabled only after
transition/public-browser verification. Its first automatic conversion sent
**0.9999 ICP + 0.0001 ICP fee**, block **39,582,090**, through the fixed CMC route
for this backend. CMC reported **2,044,295,550,000 cycles**. Exact plan/destination,
memo, amount, fee, timestamp and block match the official Index. The worker is
**enabled, Idle, not halted, with no error**; a later zero-balance maintenance
completed without another transfer. Actual Ledger balance at closeout is zero;
historical received remains 1 ICP. No manual transfer/notification was submitted.
World, credits, events and publication stayed byte-identical during the brief
paused financial observation. The outgoing row advanced source to **39,582,091**
with zero gameplay inputs; autonomous play then resumed with the original run
configuration. Scores continue to accrue normally. Automatic player payouts
remain unavailable.

Public mainnet certificate, square layouts, prices/memos/native copying, camera,
minimap, existing-session epoch crossing, reconnect after eviction and fresh v7
startup pass. Final **88.61s** trace: **0.497 verified / 0.494 displayed ticks/s**
at supported **0.5** pace, **zero stalls and browser errors**. The first prepared-
draft observer timed out before operator preparation; it is retained honestly.
Exact old-MOVE draft staleness/new accepted-heading persistence retain their
release-CI qualification; no synthetic events or gameplay transfers were used.
A moving operator snapshot was reacquired through a fresh verified publication.

Observed 07:00:41 UTC: total **4,955,231,201,394**, liquid
**4,811,369,333,244 cycles**. Source healthy, no pending inputs; game running and
transition complete. Controllers, principals, prices, Event Horizon and scoring
are unchanged. No reset, reinstall, new canister, remote Git operation, unrelated
transfer, prize payout or buyback occurred. DTR remains published `c12af747…`,
client 0.13.0. [Live observer](https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/) /
[reviewed deployment evidence](evidence/B2Z/torus-activation/activation.json) /
[current operator procedure](docs/operations/S14_OPERATOR.md).
Raw results remain under `.work/torus-activation-resume/`. Prior records below
are historical and preserved.

---

# Current activation — blocked by replica installation cycles

**2026-10-23:** the user authorized exact release `4c0cfa6`, torus activation and
fixed CMC self-funding. CI run [39908809597](https://github.com/aodl/balls-2-the-wallz/actions/runs/39908809597)
completed successfully at that exact commit, including installed-IC integration.
Frozen Wasm/Candid/export inventory and all production frontend asset hashes
were verified before the mainnet attempt.

Gameplay was paused and its certified publication plus all three retained
publications/artifacts captured. The replica rejected the exact approved upgrade
with **IC0207**, requiring **at least 144,415,141,736 additional cycles** at that
attempt. The application 500B transition floor passed; the replica installation
reservation is separate. The attempt consumed cycles, so the quoted shortfall
is not a guaranteed later retry amount. No protection threshold or canister
setting was changed and no cycles were transferred.

**The old backend `53b219…` remains installed.** Certified world, scores, events,
source progress, current/retained bytes, pending work and controllers compare
equal before/after rejection. World stays v3 16×8 with its paid cannon/ball,
received 1 ICP, cursor 39,526,412. Gameplay is deliberately **paused**; independent
source polling remains active. Post-rejection total/liquid balances were
992,328,967,216 / 860,372,873,626 cycles. Recheck before a later retry.

Immediate treasury pause/verification calls were attempted; both correctly
reported missing methods on the predecessor. The new treasury is not installed.
No frontend upload, transition prepare/commit, funding activation, ICP transfer,
CMC notification, reset/reinstall, controller change or remote Git operation
occurred. The Ledger still holds 1 ICP; fee remains 10,000 e8s. External cycles
are required before resuming the approved sequence; no manual replacement
ICP/CMC transfer was attempted.

[Reviewed rejection and complete preservation evidence](evidence/B2Z/torus-activation/blocker.json).
Raw operations remain under `.work/torus-activation/`. The combined local
verification and frozen release below remain unchanged.

---

# Current candidate — authenticated torus and treasury combined, locally verified

**2026-10-23:** interrupted transition work was preserved in WIP `f576843`, then
merged with the published self-funding branch in `8f2af4e`. No work was discarded.
The combined implementation is committed locally and frozen from clean source
`96c853752f547a3352a7eab1573478ae2a596271`. The entries below remain historical;
this candidate supersedes their statements about unavailable epoch support.

Local gates PASS: **1,352 JavaScript, 145 Python, 22 workspace Rust, 10 portable
Rust, 24 host/Candid tests**, normal Wasm/export checks, format and strict Clippy,
eight packaged-consumer checks, and 14 standalone HTTP/Web Crypto browser checks.
The complete S14 run passes **36 active harness cases: 26 installed-IC cases and
10 source unit cases**, including all eight treasury cases. Eight historical
predecessor probes remain explicitly ignored. Bundled browser checks pass 18
normal, four epoch and four torus-scene groups, with zero stalls in each measured
playback interval. Genuine prior failures and their corrections remain recorded.

Actual disposable ICP Ledger/Index tests preserve paid history across the exact
installed `53b219…` predecessor upgrade, fence old/new commands at an exclusive
Ledger boundary without replacing the sparse account cursor, and authenticate
the DTR v7 epoch. Delayed Index pagination and upgrades, pending new inputs,
accepted cannon headings, old-session reconnect after eviction and fresh v7
startup pass. Ledger/CMC-mock tests preserve both transfer and notification plans
through the checkpoint and upgrades; outgoing blocks before/during/after cutover
remain non-commands, with no duplicate transfer. CMC evidence is local mock
contract coverage, not a real conversion or production-readiness claim.

DTR is pinned to published `c12af747190f7e24d5e68cdf57dbb1494095a46b`, client
0.13.0, package SHA-256
`324f764deeeeaf1762b2d5a3d1368287009c0c08ba7e2e3806a943e3bf42e86c`.
No DTR source change or development override. Frozen normal Wasm SHA-256:
`e1e7b491215ba34308d757ec2fc1d59b2c631a9c443674149997f4f146fb3fac`.
The production observer is frozen from the same clean source; all file hashes
are in its reviewed manifest. Gameplay economics and the receiving account stay
unchanged; automatic player payouts remain unavailable.

**Mainnet actions: NONE.** Read-only closeout still verifies backend `53b219…`,
publication v6 / world v3, 16×8, one paid cannon/ball, received 1 ICP and account
cursor 39,526,412. Liquid backend cycles were **1,380,891,907,397** at closeout,
above the 500B transition floor; recheck before a later installation. Neither
32×32 nor the treasury is installed. Published DTR and self-funding CI runs were
verified successful; **combined release CI is NOT_RUN until the user pushes the
exact release commit**. No remote Git operation, deployment, reset, reinstall,
mainnet transition, ICP transfer or CMC conversion occurred.

[Reviewed verification and retained failures](evidence/B2Z/transition-release/verification.json),
[recovery](evidence/B2Z/transition-release/recovery.json),
[cutover and finance](evidence/B2Z/transition-release/transition.json),
[backend freeze](evidence/B2Z/transition-release/backend-frozen.json),
[frontend freeze](evidence/B2Z/transition-release/frontend-frozen.json),
[read-only mainnet status](evidence/B2Z/transition-release/deployment.json).
The [combined operator sequence](docs/operations/S14_OPERATOR.md) describes
watermark, drain, commit/retry and independent financial recovery. First mainnet
initialization enables the treasury with a five-minute first timer; review and
assure that activation boundary before any future installation. This recovery
authorizes no real sweep. Raw results and frozen binaries/assets stay under
`.work/torus-recovery/`; no release ZIP was created.

---

# Current preparation — prelaunch self-funding, not deployed

**2026-10-22:** B2Z's small autonomous Ledger/CMC worker is implemented and
verified locally, with durable transfer/notification recovery and controller-only
observed balance/status. **Mainnet actions: NONE; real ICP transfers: NONE.**
The current backend/frontend and paid game are unchanged. Activating the frozen
normal module requires separate authorization because its scheduled sweep moves
real value. No reset, controller change, DTR runtime change or dependency update.

Source (1,349 JS / 138 Python), native, 22 host/Candid tests, strict normal export
inventory and Clippy PASS. Final installed-IC gate: **25 existing + seven funding
cases PASS**, with eight explicitly ignored historical predecessor probes;
exact captured JavaScript replay: 77 publications PASS. Those full regressions
ran on the one-borrow precursor; the final Clippy correction changes only
transfer argument ownership during encoding. The final frozen module separately
passed all seven funding cases, 22 host/Candid tests and strict Clippy. Initial browser receipt
and staged-scene failures plus the 900-second aggregate timeout are retained;
the unchanged full rerun passed. Maintenance adds ~14M cycles per five-minute
zero-balance check over a paused-worker baseline in PocketIC, with zero game
segments. These are local measurements, not mainnet burn forecasts.

Clean implementation `642d45e8fc461450fb877e20ed2cf61be36d7ac5`, frozen normal
Wasm `55ccda3d024ea5ba9cfd7cc7b5e61eb5d55c7864ce7843ef6bf462fc018aeea3`.
[Report](checkpoints/B2Z_PRELAUNCH_SELF_FUNDING.md) /
[reviewed evidence](evidence/B2Z/treasury/verification.json) /
[policy and proposed activation](docs/operations/PRELAUNCH_SELF_FUNDING.md).
DTR stays pinned to published S14 `1f47c1a`, client 0.12.0; its independent local
master audit changes documentation/refs only. The authenticated transition is
not implemented; 32×32 torus and accepted cannon heading remain staged.

The preceding verification correction was user-published and CI run
[39735811814](https://github.com/aodl/balls-2-the-wallz/actions/runs/39735811814)
passed at `d491c204e04bc45491ed6146ab274f678cf78757`. **New treasury CI:
NOT_RUN** until the user publishes this branch. No remote Git operation occurs
in this preparation.

---

# Verification closeout — arena tooling correction, 2026-10-22

Published `af212f2` CI failed source conformance and standalone browser navigation; its installed-IC/native/Wasm/packaged-consumer jobs passed. The focused correction updates the explicit endpoint inventory and navigates Settings through the actual modal UI. Final standard source/browser/installed-IC gates PASS locally: 1,349 JS, 137 Python, 14 browser checks, 25 installed-IC tests with eight unchanged ignored predecessor probes. The first integration receipt timeout is retained alongside the unmodified passing rerun. [Correction and standard gates](checkpoints/B2Z_ARENA_VERIFICATION_FIX.md) / [reviewed results](evidence/B2Z/arena-verification-fix/verification.json). Production deployment evidence below remains historical and unchanged. No live canister operation or DTR change is part of this patch. The 32×32 torus and persistent heading remain staged, pending a separately scoped authenticated history/schema transition. Fresh patch CI is NOT_RUN until user push.

---

# Current status — arena and shared pacing live; torus staged

**2026-10-21:** viewport arena, native control dialogs, camera/minimap and bounded cycle-aware pacing are live on the existing two canisters. Backend module `53b219277b9e1333b29c6a67c94a2d634d04362fa72b9bf65f173a7040cc14ec`; frontend clean source `c0cfc29eccffcc849c21a75fb3d3fa3ccc851c3c`. In-place upgrade preserved certified world/scores/retained bytes/source and unfinished work. Prices, memos, receiving account and controllers are unchanged.

Final mainnet trace: 89.55s, 0.246 produced / 0.248 displayed ticks/s, **zero stalls**, Conserve 0.25 target; public certificates/assets/copy/reconnect pass. Matched local same-state cost is **42.9% lower per segment**; Economy/Conserve spend **48.0%/73.0% less per virtual second**. Latest active management balance 1,390,887,289,912 cycles (2026-10-21T22:42:53.845649+00:00; reservations can affect active readings). Official Index healthy, cursor 39,526,412, one paid cannon/ball, received 1 ICP. No mainnet transfer/reset or remote Git action occurred.

**DTR CHANGE REQUIRED before world activation.** The 32×32 torus, persistent accepted cannon heading and placement helper pass local replay, actual ledger/index and browser/upgrade tests. They remain staged because the pinned DTR cannot authenticate a rules/schema epoch transition. Live world remains 16×8 bounded v3; historical direction stays neutral. No DTR changes or hidden overrides. [Report/screenshots/videos](checkpoints/B2Z_ARENA_CAMERA_AND_PACING.md), [reviewed evidence](evidence/B2Z/arena/verification.json), [staged contract](docs/specs/B2Z_TORUS_V4.md). Local regressions: 1,349 JS / 137 Python plus workspace/native/host Rust PASS. New remote CI: NOT_RUN until user push.

---

# Current status — empty-arena idle mode deployed

**PASS, 2026-10-21.** The existing backend now runs `1510d8677464944d0d2ddad53370f339b75ab627ff0e3c8180467a3e63fa84f3`, followed by verified frontend assets. Empty enabled arenas stop simulation timers while preserving certified publications; the independent 60-second ICP Index poll wakes gameplay for every admitted payment. Active physics, cadence, economics, memos, source/history and DTR remain unchanged. Stable maintenance touches allocated chunk keys.

Measured mainnet empty-arena consumption fell **97.27%**, from **85.34M to 2.33M cycles/second**. During 208.04 seconds with our browser closed: zero simulation callbacks/segments, three Index calls, clear errors. Final balance **2,349,043,894,555 cycles**. Same-state local active cost fell **184.07M → 181.14M cycles/segment**. The user resolved the initial cycle-liquidity blocker; Codex transferred no funds and changed no threshold/controllers.

Upgrade preserved current/retained publication and artifact bytes, world, scores, configuration/source identity and queued/staged work. The already-ready segment completed once after resume, then head **10888 / 10,889 completed segments** stayed fixed. The live observer clearly shows healthy idle and permits authenticated transfer preparation. Mainnet certificates, text/hex copying, all aim quadrants, responsive layouts and reconnect pass without browser errors or gameplay submissions. Join remains **1 ICP** and the receiving account is unchanged.

[Report and screenshots](checkpoints/B2Z_EMPTY_ARENA_CYCLES.md) / [reviewed evidence](evidence/B2Z/cycles/verification.json). Local source, game, recovery, upstream ledger/index, exact predecessor upgrade, replay and corrected browser checks pass; the earlier aggregate browser assertion failure is retained honestly. DTR CHANGES: **NONE**. New remote CI and real mainnet gameplay transfers are **NOT_RUN**. Local checkout remains `/home/codexdev/src/b2z`, branch `checkpoint/b2z-identity-and-memos`; only the user pushes. No next milestone is started.

---

# Current status — B2Z naming and prefix-free memos

**Deployed and verified, 2026-10-20.** B2Z is the sole current product name. Canonical wallet memos are `ANGLE 37.5`, `ANGLE 225` and `MOVE 83`; adapter v3 retains published old forms and preserves queued canonical rows. Eight-byte ASCII commands are distinguished from legacy binary by actual magic/layout. Active paths, packages, symbols, tools, specifications and deployment aliases use B2Z/b2z. Historical protocol bytes and archived evidence remain unchanged.

The existing backend now runs `187df32c5c95623abf13f52a626c9daeb3ee36591e9f6cf0d27cad8b109f4ce1`. Backend-first upgrade and subsequent asset-only frontend upload preserved both principals, controllers, source progress, configuration identity and all three retained publications/artifact bytes. Join remains authenticated 1 ICP and the receiving account is unchanged. Public certificates, native copying, full-circle input, responsive layouts and reconnect pass. Autonomous segments advanced 7167 → 7172 with our browser closed; final certified snapshot reached 7205, with source/run errors clear.

The checkout is `/home/codexdev/src/b2z`, branch `checkpoint/b2z-identity-and-memos`. Source/native/Wasm/browser/real local ICP ledger/index and exact installed-S15 recovery gates pass. [Report/screenshots](checkpoints/B2Z_IDENTITY_AND_MEMOS.md) / [evidence](evidence/B2Z/release.json) record exact scope and artifacts. DTR CHANGES: NONE, pinned revision unchanged. New CI is NOT_RUN pending user push; no real mainnet prefix-free memo payment was sent or verified. Existing intermittent buffering remains; no physics or cadence change was made. No next milestone starts automatically.

<!-- ARCHIVED_STATUS -->

The following S15/S14 records are immutable historical context; current paths and naming are specified above and in the current README.

# Current status — S15 text memos and circular aiming deployed

**PASS, 2026-10-20.** The existing backend was upgraded in place to normal Wasm `c831ecaa2ac1f4b7ed51179e2b880d01f32c19e5d03b3e2214027677f378dde4`, then the existing observer received the frozen readable-memo/aiming assets. No reset, reinstall, new mainnet canister, controller/price/Event Horizon change, DTR modification, fund transfer by Codex or remote Git action occurred. The user resolved a pre-existing backend liquid-cycles shortage before deployment.

The [public observer](https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/) authenticates the unchanged **1 ICP** profile and receiving account, and prepares `BTZ ANGLE 37.5` / `BTZ MOVE 83` through one action card. Full-circle pointer/touch/keyboard aiming works while disconnected; copying remains gated on current verification/health. Existing binary/numeric commands remain compatible. Card refresh is explicit when certified price/eligibility changes. No wallet connection, signing or transaction sending was added.

Mainnet upgrade preserved byte-identical publication/state/events/scores at segment **5392**, the source/configuration identity, controllers, source cursor, pending-input count and an already running kernel stage. Same cadence resumed. Standard-root public browser verification/copy/aim/reconnect checks pass; after browser close, certified heads advanced **5426 → 5429** with clear source/run errors. **A real mainnet text-memo gameplay payment remains NOT_RUN; the user sends all real gameplay transfers.**

Local checks pass: **1,268 JS / 137 Python**, 20 workspace / eight portable Rust tests, independent game/host/Life conformance, normal Wasm/Candid and 11 host tests. Actual upstream local `icrc1_transfer` bytes pass through the actual index into canonical admission, certified game outcomes and exact Rust/JS replay. The exact deployed predecessor upgrade probe passes with two players and two normalized pending payments; old invalid text remains invalid. Corrected built/asset-canister browser variants pass **15 / 19 groups**. Initial aggregate/browser races and the obsolete S09 wrapper's missing target are retained honestly in evidence; the original aggregate is not relabelled green. New CI is **NOT_RUN** until user push.

A small impact-effect reset at segment boundaries is fixed. Existing production cadence can still undersupply the observer and cause stalls; no physics, scheduling/cadence or speed multiplier was changed. The X video returned 403 and was not viewed/matched. DTR remains unchanged at `1f47c1a0a104875bd13475d561b8d5aa10770d99`, client 0.12.0. [Report and screenshots](checkpoints/S15_TEXT_MEMO_AIMING.md), [reviewed evidence](evidence/S15/release.json), [text contract](docs/specs/BTZ_TEXT_MEMOS.md).

Source/artifacts were frozen from clean commit `8765320b15b563c2e1ade9b561fec480579768fd` under `.work/s15/release-frozen/`. The final report commit changes documentation/evidence only. User publication: `git push -u origin checkpoint/s15-text-memo-aiming`. No next milestone is started.

---

The S14 status below is preserved historical context. Its staging/approval instructions are superseded by the S15 deployment and the current task's explicit authorization.

# Current status — S14 arcade UI and 1 ICP mainnet activation

**Mainnet activation PASS, 2026-10-19.** The user confirmed CI 39306785701 passed at `717069497c7e9beb90c37e70320a8b946524531f` and explicitly approved the exact release and one-time empty-game reset. After the user resolved a liquid-cycles shortage, fresh certified state/index/inbox checks again proved no transactions, players, scores or payment obligations. The existing observer received an asset-only upgrade; the existing backend received the authorized frozen module `2cd80ba464a98bcc56c42e3e29996b10b2dd87e60ed9045fea0043992cfe9a3c`. Controllers, principals, receiving account and official index remained unchanged. No funds were transferred by Codex.

The real [mainnet observer](https://s45ab-wiaaa-aaaar-qcifq-cai.icp0.io/) authenticates the standard SDK mainnet root, source/configuration/artifacts and shows **1 ICP**, correct recipient and verified segments **8 → 9 → 10**, with no browser errors. After closing the browser, completed segment counts advanced **18 → 23**. Source/run errors are clear; 60-second fallback is active, Event Horizon disabled, and retention remains three/8 MiB. [Activation evidence](evidence/S14/ux-pricing/mainnet-activation.json) records exact artifacts, authorization, controllers, balances and raw logs/screenshots. This is a no-prize controlled MVP; retained payments/refunds/payout disclosures remain unchanged. No S15 or DTR changes.

The preparation notes below describe the earlier staging/approval state and are superseded by this activation record. Do not repeat the one-time reset.

CI browser follow-up: user-reported run 39288849453 failed the default hosted browser on the missing loopback `Permissions-Policy` header. This was reproduced from `browser.log` before editing. The narrow test fix validates generated hardened production policy in both modes, requires its HTTP header only for actual asset hosting, and retains native exact clipboard writes and all certificate/payment checks. CI now uploads the nested browser log/results. Local full default integration passes **16 tests, zero failures, one intentionally ignored historical probe**; its 12 browser groups and replay of **43 publications**, transactions 1/2/3 once, pass. Source passes **1,187 JS / 137 Python**. Backend/observer/economic/DTR implementation and normal module hash are unchanged. [Corrective evidence](evidence/S14/ux-pricing/ci-closeout.json) preserves the red/green runs. Fresh GitHub CI is **NOT_RUN** pending user push; no mainnet operation or reset approval occurred. Original frozen provenance remains intact; clean-commit manifests must accompany subsequent deployment approval.

The [release report](checkpoints/S14_MVP_UX_PRICING.md) contains screenshots, verification scopes, immutable artifact identities and the transition finding. [Machine-readable evidence](evidence/S14/ux-pricing/release.json) records the tested source **`4a9345349a13b80f5900700f4a01066cec6beebc`**, dependencies, hashes, mainnet read-only observations and preserved failures. The final report/status commit changes metadata only. Frozen artifacts remain in `.work/ux-pricing/release-final/`.

The new observer leads with the real 16×8 arena, authenticated player/ball/territory summaries, understandable direction/address/memo preparation, exact ICP amounts, current occupancy-based ball prices and legal owned-cell MOVE references. Technical details are collapsed. Native clipboard writes are explicitly permitted for this origin; all other hardened Permissions Policy denials, CSP, SDK certificate validation, source/configuration binding, anti-rollback and resynchronization remain. No wallet, login, signing or transaction submission exists. Actual built assets were inspected at 1440×900, 768×1024 and 390×844. A read-only preview against the real mainnet backend correctly displayed its **10 ICP** price, rather than the proposed 1 ICP.

[Canonical economics](config/economics/prelaunch.json) defines the fresh profile: **1 ICP join**, unchanged **0.1 ICP × active-ball-count²** additional ball and **0.0001 ICP** move. A small checked generator supplies identical exact Rust/JS integers and canonical configuration bytes, with drift checks. Historical 10 ICP configuration, goldens and recordings remain unchanged. New configuration hash: `05f9b342c37d7dd5e53d6f12dce90d2ba53988ec3c1ccfeaedd8906f51042a42`.

Local gates pass **1,187 JavaScript, 137 Python, 18 workspace and eight portable Rust test functions**, including six new pricing vectors. Public game/host and Life conformance, formatting/Clippy, normal Wasm/Candid and ten host tests pass. The full installed run is honestly retained as **15 PASS / 1 browser FAIL / 1 explicit historical probe ignored**; its corrected hosted-browser case passes separately using identical normal/test module hashes. That rerun passes 16 browser assertion groups and native/JS replay of **37 publications**, transactions 1/2/3 exactly once. The separate old-module transition probe passes; bundled replay passes 14 HTTP/Web Crypto/CSP checks. New remote CI is **NOT_RUN**. Details and raw paths are in the report; no failed run is reclassified as green.

**Ordinary upgrade preserves the old pricing identity.** The installed old-to-new probe preserved exact historical publication bytes and advanced five to nine segments while retaining 10 ICP. Activating 1 ICP therefore requires the explicitly proposed one-time fresh-game reset, not an ordinary upgrade. No DTR journal rewrite or generic repricing mechanism was added. The [single operator runbook](docs/operations/S14_OPERATOR.md) gates that destructive action on separate approval and immediate fresh empty-account/no-outstanding-transfer checks. Frontend-only approval could deploy the UI while retaining the authenticated 10 ICP price.

Read-only mainnet observations on 2026-10-19 found official-index balance/history empty, certified segment 1263 with no cannons, balls, scores or received-payment tally, and later status at 08:33 UTC with admitted cursor/pending inputs zero and healthy autonomous progression (1,528 completed segments). This finite observation cannot exclude later or index-lagged payments. Backend module remains `15b016b9d156a1b90feeeb9be610fc7ba51d9413509c3c7161ab8e13faacb703`; both existing controllers and receiving account are unchanged. No mainnet write, deployment, pause, reset, payment, controller change, remote Git operation or CI trigger occurred during this release.

Frozen normal Wasm: **`2cd80ba464a98bcc56c42e3e29996b10b2dd87e60ed9045fea0043992cfe9a3c`**. Candid remains `87ace6e282f328df49e3a343e4108ab62991a0ea94df60c1be395162d02ef8cd`. DTR is unchanged at `1f47c1a0a104875bd13475d561b8d5aa10770d99`, client 0.12.0, package SHA-256 `933f42b1187c45083c4f6c69e6851fe2c77e15e8fa8fd198e13187ad3ff13d8f`, through real immutable locks and normal installation.

**Payments and excess are retained; refunds and automatic payouts remain unavailable.** Accrued area-time scores and the intended revenue-sharing product remain. Operator cycles, gameplay ICP and Event Horizon funding are separate. Pokes are disabled on the current deployment; independent 60-second index fallback remains healthy. No capacity, finality, actual cycle-burn or lifetime promise is made.

Next: user reviews screenshots/artifacts, pushes `checkpoint/s14-mvp-ux-pricing`, checks CI, and approves the exact release and any conditional reset. Stop until approval; never reset a participating account. Earlier reports and evidence remain historical and unchanged.
