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
| Existing direct and composed root consumers | **PASS** on 25 focused JavaScript checks, including maintained agent interfaces |
| Active Trickle with 17.321-second shifted Index timer phase | **PASS**, certified 396.135B/day versus settled management 401.432B/day, 1.319% difference |
| Active Trickle with 47.777-second shifted Index timer phase | **PASS**, certified 396.135B/day versus settled management 401.431B/day, 1.319% difference |
| Active Trickle with Index stopped for ten simulated minutes, then restarted | **PASS**, certified 394.730B/day versus settled management 400.112B/day, 1.345% difference |

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
admin under the current management contract. Matched incremental cost
and complete live consumer acceptance are also pending. The capability
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

The complete source check on published telemetry continuation `29a857fb`
also passed, including the Node suite and source structure; raw output is
under `.work/burn-balance-probe/live-source-1/`. This does not replace the
blocked native browser or remaining operating-cost qualification.
