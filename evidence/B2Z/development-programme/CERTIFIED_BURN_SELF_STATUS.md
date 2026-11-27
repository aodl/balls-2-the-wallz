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
| Browser-native Web Crypto and CSP | **PASS** using a genuine PocketIC capture at its recorded consensus clock, including altered witness and wrong-canister rejection in sandboxed Chromium |
| Existing direct and composed root consumers | **PASS** on 25 focused JavaScript checks, including maintained agent interfaces |

Raw callback logs, certificate captures, build inputs and test reports
are in `.work/burn-balance-probe/`. The browser evidence exercises replay
of the genuine certificate over a real CSP server. Running the complete
maintained observer against a live telemetry-enabled fixture remains
an open gate.

The result establishes a plausible sampling basis for this active
Trickle schedule. A replicated management observation can still carry
reservations from other work. Production read-only observations on
27 November demonstrated an 83.7B rebound in 34 seconds even though the
initial single-bracket consistency checks passed. Establish a repeatable
reservation bound under other timer phases, source workload, protection,
funding and credits before release. Known treasury credit and smaller
external top-up cases need coverage. Reported burn is a net balance
estimate, so a smaller external credit can be hidden inside the interval.
Direct monotonic consumed-cycle counters require a controller or subnet
admin under the current management contract. Matched incremental cost
and complete live consumer acceptance are also pending. The capability
remains disabled in ordinary backend profiles. [IC management counters](https://docs.internetcomputer.org/references/ic-interface-spec/management-canister/#ic-method-canister_metrics)
