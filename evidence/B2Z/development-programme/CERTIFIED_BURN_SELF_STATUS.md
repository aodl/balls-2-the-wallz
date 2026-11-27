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
