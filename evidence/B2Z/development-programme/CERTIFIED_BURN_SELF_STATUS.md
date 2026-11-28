# Certified burn self-status qualification, 27 November 2026

The earlier four active-Trickle variants remain failed. A fifth diagnostic
instrumented the actual Index send, reply and meter callback. At two
adjacent callback pairs the meter balance rebounded by 42,056,019,325 and
84,151,929,245 cycles between virtual timestamps one nanosecond apart.
The meter saw a clear application-level source lease and the Index
response reported zero attached-cycle refund. The raw `canister_cycle_balance`
sample includes execution and message reservations. They explain the
scale of the former 12.584T/day estimate. The attached-cycle refund API
covers credits attached to the call. [IC System API](https://docs.internetcomputer.org/references/ic-interface-spec/canister-interface/#cycles)

A replicated self `canister_status` call from the independent fallback
timer samples a consistent message boundary in the tested fixture. Every
five minutes it obtains the replica's balance, applies the existing
discontinuity and stale rules, and continues to compose the operational
witness with the authoritative publication. The external controller
management observations are independent. A 60-minute diagnostic had a
40.869B–40.942B offset between the two probes and a stable slope. The offset
includes outstanding execution reservations. The tested estimator uses
raw status endpoints, without offset subtraction or smoothing.
[IC management status](https://docs.internetcomputer.org/references/ic-interface-spec/management-canister/#ic-method-canister_status)

| Executed gate | Result |
| --- | --- |
| Exact feature-and-test-hooks Wasm | `81e6a31bf13c8642c717fadd95c64754faa82a03df81dcf6d6c02991b58f7f6b` |
| Active capped Trickle, 65 simulated minutes | **PASS**, established 12 samples over 55 minutes, **403.851B/day** against **409.211B/day** observed external balance movement |
| Paused sample, external 100B top-up, stale value, same-ID restart and prior-Wasm recovery | **PASS** on the same disposable fixture |
| ReserveProtection below the Index floor | **PASS**, the prior publication and estimate stayed intact, and the witness became stale after 15 simulated minutes |
| Browser-native Web Crypto and CSP | **PASS** using a genuine PocketIC capture at its recorded consensus clock, including altered witness and wrong-canister rejection in sandboxed Chromium |
| Existing direct and composed root consumers | **PASS** on focused JavaScript checks and the installed maintained-agent journey below |
| Active Trickle with 17.321-second shifted Index timer phase | **PASS**, certified 396.135B/day versus settled management 401.432B/day, 1.319% difference |
| Active Trickle with 47.777-second shifted Index timer phase | **PASS**, certified 396.135B/day versus settled management 401.431B/day, 1.319% difference |
| Active Trickle with Index stopped for ten simulated minutes, then restarted | **PASS**, certified 394.730B/day versus settled management 400.112B/day, 1.345% difference |
| Matched optional-meter operating cost, 60 simulated minutes | **PASS**, 407.834B/day candidate versus 403.269B/day exact Rules19 baseline, **4.565B cycles/day incremental** |

Raw callback logs, certificate captures, build inputs and test reports
are in `.work/burn-balance-probe/`. The browser evidence exercises replay
of the genuine certificate over a real CSP server. Running the complete
maintained observer against a live telemetry-enabled fixture remains
an open gate.

The two additional phase runs use the same exact candidate and distinct
pre-upgrade virtual-time offsets. The test kept the 5% relative comparison
limit fixed before execution; both ran 65 active-Trickle minutes with 12
established samples and zero observed source leases at each five-minute
management comparison. Raw results are under
`.work/burn-balance-probe/phase-variants-1/`. These results do not yet
measure a concurrently reserved Index callback or establish that the
replicated status offset remains stable during slow or interrupted Index
replies.

The stopped-Index run used the 17.321-second phase and captured ten
consecutive source errors while the disposable Index was stopped. Source
calls resumed after restart, from 122 at minute 29 to 158 at minute 65.
Its 12-sample established estimate stayed within the preset 5% comparison
bound. None of the minute snapshots caught an in-flight lease: the stopped
canister rejected calls promptly. This qualifies an interrupted Index
service, not a slow held response or a varying live reservation. Raw source
trace, certificates and management samples are under
`.work/burn-balance-probe/slow-index-1/`.

The result establishes a plausible sampling basis for this active
Trickle schedule. A replicated management observation can still carry
reservations from other work. Production read-only observations on
27 November demonstrated an 83.7B rebound in 34 seconds even though the
initial single-bracket consistency checks passed. Establish a repeatable
reservation bound under other timer phases, source workload,
funding and credits before release. Known treasury credit and smaller
external top-up cases need coverage. Reported burn is a net balance
estimate, so a smaller external credit can be hidden inside the interval.
Direct monotonic consumed-cycle counters require a controller or subnet
admin under the current management contract. The measured cost applies to
one matched schedule; complete live consumer acceptance is pending. The capability
remains disabled in ordinary backend profiles. [IC management counters](https://docs.internetcomputer.org/references/ic-interface-spec/management-canister/#ic-method-canister_metrics)

## Live maintained consumer continuation

The actual maintained agent had two independent compatibility gaps when
reading the live Rules19 certified fixture: it allowed only Rules6/7
identities and required event version 6 even though the authenticated
Rules19 world and event envelope are version 11. Its identity list now
includes the reviewed historical identities already accepted by the
frontend, and it requires the event version to match the authenticated
world version. The old archived Rules6 agent tests and 23 focused
certificate, cycles and observer tests pass.

An installed 65-minute active-Trickle disposable case then used the exact
Rules19 backend, the existing telemetry candidate, real PocketIC
certificates and the maintained `VerifiedObserver`. It passed on both the
composed certified root and the restored direct-root backend. Both reads
authenticated head 37 and the same publication root; the composed read
included the operational witness and the direct read did not. The same-ID
recovery kept the publication bytes unchanged. Raw results are under
`.work/burn-balance-probe/live-agent-3/`.

The browser leg reached a live certified fixture and built the observer,
but local Chromium could not start because this Linux host lacks
`libatk-1.0.so.0`. This is a **BLOCKED browser gate**, not a browser pass.
The consumer script retains its query-only browser checks for an equipped
hosted runner. It verifies an established rate on first load and reload,
the compact line, exact publication identity, and absence of mutation
requests. Raw failed attempts are in `live-consumers-4` through
`live-consumers-6`. No system package was installed. Matched incremental
cost, changing reservations, credits and full live browser acceptance
remain open. The telemetry feature remains disabled in normal builds.

The matched-cost fixture used identical fresh worlds, compact cutovers and
active Trickle schedules. Each executable completed 30 publications, 30 game
callbacks and 60 Index calls in the measured hour; both reported zero
treasury credits. Settled management balance fell by 16.802B cycles for the
exact Rules19 baseline and 16.993B for the meter candidate. The 4.565B/day
increment includes the candidate's management calls, callbacks, stable
storage and certification work under this workload. Candidate management
memory was 55.220MB at minute 65 versus 46.683MB for the baseline; this
comparison includes all executable and state differences. One hundred
observation queries consumed 1.566M cycles in either fixture. This single
schedule establishes a measured cost, not a universal operating bound.
Raw results are under `.work/burn-balance-probe/matched-cost-2/`.

The complete source check on published telemetry continuation `29a857fb`
also passed, including the Node suite and source structure; raw output is
under `.work/burn-balance-probe/live-source-1/`. This does not replace the
blocked native browser or remaining operating-cost qualification.

The first hosted developer run on this branch failed the historical
`prelaunch-review-assets.json` checksum for the intentionally changed
observer bundle. The original manufacturing manifest remains untouched.
This branch now uses `certified-burn-review-assets.json` to pin its own
exact observer bytes; the full historical frozen-base reconstruction still
runs. The subsequent hosted frontend and historical-base checks passed.

The hosted developer run
[46059432575](https://github.com/aodl/balls-2-the-wallz/actions/runs/46059432575)
reached the new live Chromium/PocketIC gate. Its composed-root browser and
maintained-agent leg completed; the direct-root browser leg then failed a
test assertion that required identical publication roots across reload.
The live canister legitimately advanced from head 40 to 41 during that
reload, while both direct reads correctly showed no optional burn witness.
The browser acceptance now permits a newer authenticated head and requires
the same root only when the head and operational sample are unchanged. For
composed reads it also
requires a nondecreasing certified sample end and identical rate only when
that end is unchanged. The hosted direct-root fixture now pins the exact
installed Rules19 executable rather than the older compact development
module. This correction still requires a fresh hosted positive run; the
failed run remains a failure, not browser acceptance.

## Hosted live consumer result, 27 November

Published source `b154f28cef0fdb45246c08f0efd9e647790e9af7` passed the
[developer/prelaunch workflow](https://github.com/aodl/balls-2-the-wallz/actions/runs/46062714910),
including the explicitly executed live PocketIC browser and maintained-agent
test. The candidate backend SHA-256 was
`0050509f9664359e713aa1ff5563d711cb431faaf1e2be075611b6da759b4ec5`;
the direct-root recovery leg used the exact installed Rules19 SHA-256
`b19e4ba3a11339b71dc20134bcfac525f63530461f11a593d7d880eb86b5bc90`.
The live test's composed and direct legs each loaded and reloaded the
maintained observer at 390px, checked current authenticated publication,
required the established certified estimate and compact Cycles line on the
composed leg, required no optional witness on the direct leg, and recorded
zero browser mutation requests or page errors. The maintained agent passed
both roots. The hosted integration artifact records the named test as PASS
in 23.211 seconds under `ci-certified-burn-live/results.json`; the two
previous failed hosted attempts remain separately recorded above.

The [financial workflow](https://github.com/aodl/balls-2-the-wallz/actions/runs/46062714895)
passed on this source. The
[standard workflow](https://github.com/aodl/balls-2-the-wallz/actions/runs/46062714860)
failed after its source, native, browser, Wasm, frontend and packaged-consumer
jobs passed: the historical Shout installed browser's Diverter selection did
not settle within its 10-second assertion. This is a real standard-workflow
failure, outside the new operational witness test. Master `cf6605ef` already
contains the focused diagnostic capture for that same selection assertion;
the telemetry branch has now merged it for an exact-source rerun. The new
workflow artifact list also retains composed/direct live browser and agent
captures. A positive standard rerun remains required. The broader reservation,
credit, prolonged unavailability and operating-profile matrix remain open.
The meter remains disabled in ordinary release builds.

## Genuine treasury-credit continuation

The optional installed credit case passed on the pinned disposable meter
candidate `81e6a31bf13c8642c717fadd95c64754faa82a03df81dcf6d6c02991b58f7f6b`
with a 17.321-second Index phase. Its established certified rate was
**396.135B cycles/day** against **401.432B cycles/day** settled management
movement, a **1.319%** difference within the predeclared 5% bound. A genuine
Ledger transfer and the checksum-pinned local CMC fixture then reported one
**1T-cycle treasury credit**. The certified observation became **stale** and
retained the exact prior rate and sample end. The paid world and committed
publication remained identical across the credit. Raw source, certificates,
funding assertions and the test result are under
`.work/burn-balance-probe/treasury-credit-2/`. The preceding
`treasury-credit-1` attempt failed before the credit because that disposable
instance had no CMC canister; it is retained as fixture-setup failure evidence.

This establishes correct treatment of an identified treasury credit in that
schedule. It does not reconstruct unknown external credits or prove a stable
reservation offset under concurrent slow Index replies, Full Speed or all
protected and dormant states. The capability remains disabled in ordinary
release profiles. The new credit case has not yet run in hosted qualification.

## Standard workflow handoff correction

The subsequent [standard workflow](https://github.com/aodl/balls-2-the-wallz/actions/runs/46070975113)
on `7b75e1a4` failed in the historical entry-browser Copy assertion during
`tools/check.py integration`. Its diagnostic recorded an enabled visible
control, unchanged `FIRE 2 0 1` memo, and **no native clipboard attempt**.
The actual handoff predicate also checks latest-head payment authority, which
can briefly lag visible control state. The acceptance now waits for that
predicate and retries only a click that made no write attempt. A rejected
native write or incorrect copied value still fails. Python syntax and diff
checks passed locally; the corrected browser gate requires a fresh hosted
run. The failed standard run is not telemetry qualification.

## Held Index reservation and refund

An additional disposable fixture replaced only the Index transport with the
test-only response-hold executable while retaining the original official
Index reply bytes. With the 17.321-second timer phase and the exact meter
candidate `81e6a31`, a genuine asynchronous Index response stayed pending
for ten simulated minutes. Both five-minute certified observations during
the hold remained established. After release, the fixture resumed immediate
replies and preserved the source cursor. The settled management balance
rebounded **82,593,477,536 cycles** between the minute-10 and minute-15
observations, demonstrating a material changing reservation offset.

The tightened installed case passed under
`.work/burn-balance-probe/held-index-3/`: the final certified rolling rate
was **396.604B/day**, versus **401.963B/day** over the comparable 60-minute
settled management bracket, a **1.33%** difference. Certified rates at both
held samples also remained within the preset 5% bound of that settled rate.
The first `held-index-1` attempt left all later fixture responses held and
therefore had no settled final endpoint; `held-index-2` established the
positive result before the explicit reservation/refund assertions were
added. Neither is substituted for the final tightened test.

This qualifies one controlled ten-minute reservation and refund at one
active-Trickle schedule. At this point, Full Speed and additional concurrent
checkpoint patterns, prolonged unavailable sampling and production workload
diversity remained open. No fixed offset was subtracted, and unknown external
credits remain unobservable. The optional meter stays disabled in normal
profiles.

## Full Speed and exact-window comparison, 28 November

The meter uses the latest bounded rolling window, which can be **55 minutes**
at an established minute-65 sample. The original active-workload test compared
that certified interval against a neighbouring **60-minute** management
bracket. Steady Trickle tolerated the mismatch, but a two-minute Full Speed
burst made it material. In `full-speed-2`, certified burn was
**1,600,656,804,003/day** versus **1,505,108,835,912/day** over the wrong
management interval: a genuine **6.35% gate failure**, not a reason to relax
the predeclared 5% tolerance. The first `full-speed-1` attempt stopped at
the prelaunch operator authorization requirement; the corrected disposable
fixture binds an operator and uses the maintained Full Speed switch.

The acceptance now selects management samples at the certified record's
exact `startNs` and `endNs`. The same Full Speed burst produced **119
authoritative publications in 120 seconds** and passed under
`.work/burn-balance-probe/full-speed-3/`: certified
**1,600,656,804,003/day**, matched settled management
**1,601,507,529,769/day**, **0.053%** difference. The ordinary shifted-phase
Trickle nonregression passed under
`.work/burn-balance-probe/window-comparison-regression-1/` at certified
**396,135,269,442/day** versus matched settled management
**397,496,287,300/day**, **0.342%** difference. Neither test adjusts the
meter's samples or subtracts an assumed reservation offset.

The held-Index window has a different accounting boundary: its certified
start falls **inside a live reservation**, so the simultaneous management
balance is not settled. Attempting exact timestamp matching in
`held-index-window-1` produced a negative management movement when the
**82,593,477,536-cycle** reservation refunded; the attempted subtraction
failed and is retained as a failed comparison design. The retained acceptance
uses settled management endpoints before the hold and after release, and
checks each certified observation during the hold against that independent
rate. The corrected code passed under `held-index-window-2/` with the same
certified **396,603,551,315/day** and settled **401,962,655,256/day**
(**1.33%** difference). This bracket is 60 minutes while the final certified
record spans 55 minutes; the workload was steady apart from the deliberately
held reservation, and the comparison's scope is explicit.

Further concurrent checkpoint schedules, prolonged unavailable sampling,
dormant and empty-world operation, and broader protected and Full Speed
mixes remain open. Unknown external credits cannot be reconstructed. The
optional meter remains disabled in ordinary release profiles.

## Hosted historical browser predicate correction

The exact-source [standard workflow on `fc1b6546`](https://github.com/aodl/balls-2-the-wallz/actions/runs/46078855786)
failed its installed `entry_installed::combined_clearance_on_normal_installed_module`
case after source, native, browser HTTP, Wasm, frontend and packaged-consumer
jobs passed. The previous focused Copy wait referenced
`__b2zExperience.arcade.paymentInstructions()`, but the maintained page
does not expose `arcade` on that diagnostic object. It timed out before a
clipboard attempt. The wait now reads the exposed `status.canPrepare`, the
session's pending-authority fence and the transfer panel's
`data-payment-ready` flag, while preserving the exact memo, native-write
and wrong-byte assertions. This is a browser test correction, not burn-meter
evidence. The corrected source requires another hosted standard run.

The corrected `f504ec08` source subsequently passed hosted financial run
`46086469228` and developer/prelaunch run `46086469194`. Its standard run
`46086469128` passed source, native, frontend, browser HTTP/Web Crypto and
packaged DTR consumer jobs, while the installed-IC job remained in progress
at this observation. These are exact-source workflow conclusions, not proof
of the remaining meter-specific workload and compatibility gates.

A focused local installed Copy acceptance on `f504ec08` passed its normal
Wasm, test-hook Wasm, 61 host tests, disposable Index and CMC builds, and
integration-harness build. The browser launch then stopped because this Linux
host lacks `libatk-1.0.so.0` for the available Playwright Chromium. Raw
results are under `.work/burn-balance-probe/entry-copy-local-1/`; the browser
check is environment-blocked locally and supplied no acceptance result.

## Second Index timer phase with outage and held reservation

The exact `81e6a31` candidate was exercised again with the Index timer phase
shifted to **47.777 seconds**. The ten-minute stopped-Index variant passed
under `.work/burn-balance-probe/slow-index-phase-47777-1/`: its established
12-sample certified rate was **394,728,749,258 cycles/day** against a
settled management comparison of **396,055,008,685 cycles/day** (**0.335%**
relative difference). The record became stale during the outage and
re-established after Index work resumed.

The held-response variant at the same phase passed under
`.work/burn-balance-probe/held-index-phase-47777-1/`. Its final certified
rate was **396,603,975,748 cycles/day** versus the **401,963,361,024
cycles/day** settled management bracket (**1.33%** relative difference).
Established samples were retained during the in-flight hold, and release
returned **82,593,481,811 cycles** of reservation. The comparison uses
settled endpoints around the hold because the in-flight management balance
is not a settled baseline. This is a second genuine timer phase; it does not
prove arbitrary reservation overlap or unknown external credits.

The separate Full Speed burst at this second phase passed under
`.work/burn-balance-probe/full-speed-phase-47777-1/`. It made **119
authoritative publications in 120 seconds**. The established certified rate
was **1,600,657,300,620 cycles/day** against **1,601,508,379,709
cycles/day** over the exact matched management window (**0.053%** relative
difference). Thus the shifted timer phase did not expose the earlier
wrong-window comparison error. It remains a disposable two-minute burst,
not a general Full Speed operating bound.

The genuine CMC credit variant also passed at the **47.777-second** phase
under `.work/burn-balance-probe/treasury-credit-phase-47777-1/`. Its
pre-credit established rate was **396,134,725,986 cycles/day**, against
**397,495,432,464 cycles/day** over matched management samples (**0.342%**).
The maintained funding record identified **1T cycles** of treasury credit.
The meter marked the prior window **stale** rather than reporting a false
negative burn; the authoritative game publication and world were unchanged.
Unknown external credits remain outside this guarantee.

The separate disposable ReserveProtection variant passed at the same timer
phase under `.work/burn-balance-probe/protection-phase-47777-1/`. Its
pre-protection established rate was **396,134,725,986 cycles/day** versus
**397,495,432,464 cycles/day** over matched settled management samples.
After the test-only liquid budget selected protection, the old rate became
**stale** and the game publication stayed fixed. The runner now has an
explicit `--reserve-protection` option; it rejects combinations with the
other active variants so this is a separately interpretable result.

The complete local source suite on the committed telemetry continuation
passed under `.work/burn-balance-probe/source-after-phase-variants-1/`:
historical vectors, Node tests, source structure, documentation links and
Python tool tests. This validates the new phase-runner option and maintained
source checks locally; it does not replace the still-running exact-source
hosted standard workflow.

At the later observation, published source `f504ec083932350b7c5bbcc385230a9d02f0306b`
also passed [standard run 46086469128](https://github.com/aodl/balls-2-the-wallz/actions/runs/46086469128),
completing its three hosted historical workflows. The earlier local browser
dependency failure remains environment-blocked and was not converted into a
browser PASS; the hosted browser HTTP/Web Crypto and separate live consumer
gates supply their own positive evidence. The newer locally committed
ReserveProtection runner and second-phase measurements require a fresh
exact-source hosted run after publication.

## Prolonged backend unavailability and paused re-establishment

At the 47.777-second Index phase, a separate disposable run established an
active Trickle rate, paused gameplay, stopped the backend for **70 virtual
minutes**, then restarted the same module. The independent certificate
consumer reported the unchanged prior **396,134,725,986 cycles/day** rate as
**stale** after restart. A new 12-sample window then established a paused
rate of **129,916,009,721 cycles/day** versus **129,906,820,007 cycles/day**
from management balances at the exact certified endpoints, a **0.0071%**
relative difference. The authoritative game publication stayed unchanged
through the paused restart and fresh meter samples. Raw results are under
`.work/burn-balance-probe/long-outage-phase-47777-2/`.

The first attempt under `long-outage-phase-47777-1/` failed an invalid test
assumption: autonomous gameplay naturally published after a stopped canister
resumed. Its stale and re-established rates had passed. The second run
paused gameplay before the outage so publication constancy tests the
meter rather than normal gameplay. This closes the prolonged unavailable
sampling and paused restart case; dormant or empty-world operation and
wider concurrent reservation schedules remain open at that point.

## Dormant zero-Ball world

A separate genuine installed variant used the retained dormant-world seed:
no Balls, dormant Cannons, and no gameplay publication during the measured
active-Trickle hour. At the 17.321-second Index phase, the 12-sample
certified rate was **115,723,113,899 cycles/day** versus
**116,204,174,332 cycles/day** from matched settled management balances,
a **0.414%** relative difference under the predeclared 5% tolerance.
The prior and final game publication hashes were equal. Raw positive
results are under `.work/burn-balance-probe/dormant-world-phase-17321-2/`.
The first attempt under `dormant-world-phase-17321-1/` was interrupted by
the host filesystem filling during PocketIC module serialization and did
not reach a measurement. The disposable build-cache cleanup restored space
before the successful rerun. A literally player-free world, broader
concurrent reservation schedules and a compatible optional release profile
remain open.

## Player-free empty world, 28 November

The same exact candidate `81e6a31b…58f7f6b` ran on a validated disposable
world with no players, Cannons or Balls. At a third Index phase of 32.321
seconds, its 12-sample established certified rate was **115,352,798,996
cycles/day** against **115,846,286,917 cycles/day** of matched settled
management balance movement, a **0.426%** relative difference under the
predeclared 5% tolerance. The game publication did not change during the
measured hour. Raw source, authenticated certificates and result are under
`.work/burn-balance-probe/empty-world-phase-32321-1/`. This closes the
player-free operating case. Wider overlapping reservations and an optional
release profile remain open; the meter remains disabled in ordinary builds.
The complete local source suite on the player-free continuation passed under
`.work/burn-balance-probe/source-after-empty-world-1/`, including historical
vectors, Node tests, source structure, documentation links and Python tools.

## Concurrent game checkpoints during a held Index response

The retained 47.777-second held-Index capture provides more specific
concurrency evidence than its aggregate refund result alone. During the
60-minute response hold, its authenticated game head advanced from **38**
at minute 5 to **65** at minute 60. Two certified five-minute meter samples
were taken while the Index request was still in flight. The held response
later refunded **82.593B cycles**, and the final established rate was
**396,603,975,748 cycles/day** against **401,963,361,024 cycles/day** of
matched settled management decline, a **1.33%** difference. These are the
original unfiltered samples under
`.work/burn-balance-probe/held-index-phase-47777-1/`.
This closes the named concurrent ordinary-checkpoint and held-reservation
case for that schedule. Wider overlap phases and workload combinations
remain separate optional telemetry gates.

The same held-response test passed at a second Index phase of **17.321
seconds** under `.work/burn-balance-probe/held-index-phase-17321-1/`.
Two certified five-minute samples occurred while the Index request was
still in flight. The genuine response then refunded **82,593,477,536
cycles**. The final 12-sample rate was **396,603,551,315 cycles/day**
against **401,962,655,256 cycles/day** of matched settled management
decline, a **1.33%** relative difference under the predeclared 5% target.
No sample was removed or corrected. This establishes the reservation and
refund behavior at two distinct timer phases; it does not establish every
possible overlap schedule or reconstruct unknown external credits.

## Optional normal executable, 28 November

The pinned Rules19 telemetry source built with the ordinary
`prelaunch-trickle,certified-operational-burn` feature set, committed locks
and no test hooks. The raw executable SHA-256 is
`3bb76656d3c903e858c9b9e373d9baab311b930e0dcb78d19a5807ff5e78376d`.
Its complete exported interface matched the installed prelaunch profile;
there are no synthetic test exports. The feature-specific generated Candid
matches [the declared optional interface](../../../canisters/runtime-lab/runtime-lab-telemetry.did),
which adds the optional certified record to `observation` and
`observation_bundle` without changing the ordinary public-launch service.
The ordinary declared file received a comment-only generated-order correction;
both declared services now match their generated files byte for byte.
A genuine disposable same-ID upgrade at
the 32.321-second Index phase established **395,639,123,935 cycles/day**
versus **396,952,610,797 cycles/day** of matched settled management decline,
a **0.331%** difference. Raw results are under
`.work/burn-balance-probe/optional-normal-phase-32321-1/`.

The maintained agent consumed this exact normal executable on a live
disposable canister with composed and direct certification roots; both legs
passed under `.work/burn-balance-probe/optional-normal-agent-1/`. The local
read-only operator inspection tool was then run against both live roots in
`.work/burn-balance-probe/optional-normal-inspection-3/`. It authenticated
head 37 and the same publication root as the maintained agent, independently
matched `game_info` and `player_state`, and submitted no command. The two
earlier attempts stopped at a local Python environment missing Playwright
and a test assertion that treated a tagged integer as a string; neither
was an operational-record failure. The hosted final-source live gate now
executes this inspection alongside the browser and agent.
The local browser launcher remains blocked by its unchanged sandbox policy in this
host. The hosted developer workflow has been prepared to run the maintained
browser against this exact no-test-hooks executable and publish its raw Wasm,
hash and interface inventory. That new exact-source run is still required.
Matched 60-minute ordinary Trickle on this exact module measured
**408,298,851,408 cycles/day** enabled versus **403,268,643,768
cycles/day** disabled, an incremental **5,030,207,640 cycles/day**.
Each leg had 30 game publications, 30 game callbacks and 60 Index calls;
the certified lane uses the existing source fallback timer and at most
one replicated self-status call plus callback every five minutes. Its
versioned operational record is 35 bytes in a separate stable slot; changed
samples update the composed certificate root without another gameplay
publication. One hundred observation queries cost 1,566,000 cycles in
both measured legs. The feature-enabled module was 31,489 bytes larger;
the measured runtime memory difference also includes code, heap and stable
storage, so it is not an isolated storage charge. Raw matched evidence is
under `.work/burn-balance-probe/optional-normal-cost-1/`.
The feature remains disabled in ordinary release profiles and is not part
of the Rules20 backend candidate.
