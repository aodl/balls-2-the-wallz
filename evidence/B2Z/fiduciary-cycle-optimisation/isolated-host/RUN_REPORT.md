# Frozen fiduciary comparison — completed, overall FAIL / release NO-GO

**One sequential comparison ran on the existing VM. Both original 90-second Normal prelude loops passed, and both full untrimmed 900-second strict windows completed. A0's strict window FAILed its performance-limiting gate. A2's strict window PASSed every original delivery assertion, but its case subsequently FAILed the original history-capture assertion; independent replay did not run. Overall qualification is FAIL, not PASS and not an unstarted-window BLOCKED result.** No test window was repeated.

## Definitive gate matrix

| Gate | Frozen A0 | Frozen approved A2 |
| --- | --- | --- |
| Original quiet-host prerequisite | PASS | PASS |
| Original 90-second Normal prelude | PASS | PASS |
| Full strict Normal duration | 900.264 s | 900.314 s |
| Production/admission/display-rate bounds | PASS | PASS |
| Zero stall/rebuffer | PASS | PASS |
| Zero resynchronisation | PASS | PASS |
| Normal without performance limiting | **FAIL** | PASS |
| Buffer accounting | PASS | PASS |
| Bounded queue / bytes | PASS | PASS |
| No sustained buffer deficit | PASS | PASS |
| Full strict-window result | **FAIL** | **PASS** |
| Browser result | FAIL on strict assertion | PASS, no uncaught page errors |
| Original history-capture gate | NOT_RUN after browser failure | **FAIL** on closed response body |
| Original independent replay | NOT_RUN | NOT_RUN |
| Native case exit | FAIL, 101 | FAIL, 101 |

The existing native harness is fail closed: A2's browser PASS does not erase its later capture failure. The pair's runner exit is 1. No capture error was removed, no replay assertion was skipped to obtain a pass, and no partial window was promoted. Ordinary exact-b96 CI **40846505855** remains the previously accepted six-substantive-job PASS, separately identified from this comparison.

## Exact inputs and scope

Source and native harness code: **b96c64b43a412c022143787cd9d6ed94da2bbc67**. Rust/DTR graph: **77ba46cb2f0acd0b4b2eaeedf7dc9fd2dc0f6c68**, all five graphs fetched normally with committed locks and checked by the unchanged offline provenance checker. The native executable was compiled from that unmodified exported baseline to relocate its embedded source path; its actual hash is pinned below. No comparison Wasm or frontend was rebuilt.

| Identity | SHA-256 |
| --- | --- |
| A0 installed normal | `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51` |
| A0 compressed bytes | `4e7aec89e97329101492b77eb9cff102282d280df43096c12a6e9b64b858923b` |
| A2 installed normal | `2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb` |
| A2 compressed bytes | `2fde8cf962498a8267757ccd4ca505196261f33263ae32c0a04bdcdc6c42b17b` |
| Current-path native harness | `cf67ff38f2313ec1748b2257005f8dbd1f3f1ec2d7d7ad3e4c9446fee368ea7d` |
| Original reference native harness, retained in package | `20ecd7716612a4554e8e753f13d68d41cf05437943ebb27d3a8784312239b507` |
| Portable execution archive | `52e8f090c7dae5d2e366e912f49dacce73e15c56dd0895b630cf611932b376d5` |
| Both cases' identical initial-world bytes | `a2a6915c2eb3c00bdd4ad3058a97701c02ae0e4f38a7698e2fc9375dbe1bc22a` |

Both actual module-identity records confirm **fiduciary=true**, world **v5**, publication **v6**. The unchanged b96 fixture uses the disposable **34-node fiduciary** configuration and original **four-ball 1,000×1,000 world**. Original production frontend bytes and local served assets match their references between cases. All **594** original browser-file hashes passed; Chromium **153.0.8010.12** used its sandbox and the original SDK verification/server/CSP/Web Crypto path. The existing reviewed user-scoped Ubuntu library bundle was recorded and hashed; no OS security policy was disabled.

This is **Normal-only**. It did not execute Economy, Lifeline, low-funding, cold reconnect or a production upgrade. Separate [historical qualification](../REPORT.md) and [paid-v8 reconnect evidence](../qualification-20261028/tests.json) remain unchanged. This synthetic public v5/v6 fixture is not the separately qualified paid-v8 production state.

## Waiting worked; actual workload exposed limited headroom

The user selected the existing two-vCPU / 7.754-GiB VM and requested checks every 30 minutes. The initial diagnostic rejected I/O full PSI **36.3%** and foreign CPU work. All scheduled screens were preserved:

| UTC screen start | Result | Median idle | Peak I/O full PSI |
| --- | --- | ---: | ---: |
| 13:18:19 | BLOCKED: CPU, I/O, foreign work | 42.471% | 3.05% |
| 13:48:19 | BLOCKED: CPU, I/O, foreign work | 69.904% | 28.66% |
| 14:18:19 | BLOCKED: I/O | 93.277% | 6.36% |
| 14:48:19 | **PASS** | 96.395% | 0% |

Polling stopped on PASS. The unchanged runner independently requalified before each case within its existing 180-second cooldown allowance. Its original complete 60-second screen, five-second sampling and all thresholds were preserved. Pre-launch reconstructed sample sets:

| Prerequisite metric | A0 | A2 |
| --- | ---: | ---: |
| Idle median / minimum | 96.248% / 95.804% | 95.095% / 92.277% |
| Available memory minimum | 5.566 GiB | 5.588 GiB |
| CPU PSI avg10 maximum | 0.04% | 1.14% |
| I/O full PSI avg10 maximum | 1.07% | 1.98% |

A0 case ran **14:51:25.977–15:08:43.894 UTC**; A2 **15:10:18.370–15:27:36.724 UTC**. No foreign-work interruption occurred. Own-work resource pressure was retained under the original policy; it is not retroactively converted into an unexecuted-window rejection:

| During the strict window | A0 | A2 |
| --- | ---: | ---: |
| CPU idle median | 11.155% | 13.400% |
| CPU PSI avg10 median / maximum | 31.67% / 36.78% | 30.35% / 33.64% |
| I/O full PSI median / maximum | 2.81% / 15.73% | 4.08% / 13.43% |
| Minimum available memory | 4.536 GiB | 4.386 GiB |
| Swap-out / cgroup throttle delta | 0 / 0 | 0 / 0 |

Chromium processes averaged approximately **1.25 of the two cores** in both cases; PocketIC averaged **0.317 core A0 / 0.221 core A2**. These are host diagnostics, not new cycle-cost measurements. Quietness before starting was necessary, but did not guarantee enough workload headroom for unrestricted A0 Normal.

## Complete playback and HTTP measurements

The original `continuous_summary()` was independently recomputed offline from every saved strict telemetry row and timed backend poll. Stored statuses, all seven checks, rate bounds, buffer conservation and resynchronisation counts reproduce exactly. Dense phase counts also match; nothing was trimmed or replaced.

| Strict-window measurement | A0 | A2 |
| --- | ---: | ---: |
| Production bounds, ticks/s | 0.976380–0.980823 | 0.997430–1.001873 |
| Admission, ticks/s | 0.977491 | 1.000762 |
| Display, ticks/s | 0.977933 | 0.999942 |
| Regular / dense samples | 1,679 / 3,592 | 1,671 / 3,578 |
| Phases | All PLAYING | All PLAYING |
| Stalls / resynchronisations | 0 / 0 | 0 / 0 |
| Buffer start → end, ticks | 17.500122 → 17.101914 | 17.113964 → 17.852406 |
| Conservation error, ticks | −5.812×10⁻¹¹ | 5.441×10⁻¹¹ |
| Maximum queue / bytes | 19 / 720,102 | 19 / 719,525 |
| Verified-certificate counter | 193 → 1,808 | 234 → 2,248 |
| Maximum certificate age | 2,113.496 ms | 1,691.683 ms |
| Delivery failures / bundle fallbacks | 0 / 0 | 0 / 0 |

All proxy responses are HTTP 200 (2,584 A0 / 2,892 A2 over each complete browser case). Requests starting inside strict windows number 2,281 / 2,554, also all HTTP 200. No captured query failures or application delivery/bundle errors were reported. Long successful-response tails still matter:

| Strict-window timing, median / maximum | A0 | A2 |
| --- | ---: | ---: |
| Proxy upstream headers | 23.151 / 11,837.777 ms | 17.974 / 4,163.223 ms |
| Proxy response complete | 23.360 / 11,837.923 ms | 18.137 / 4,163.357 ms |
| Browser frame-sampled fetch | 104.9 / 11,910.6 ms | 98.7 / 4,343.6 ms |
| Browser frame-sampled certificate verification | 37.3 / 126.5 ms | 37.3 / 115.5 ms |

The trace includes actual authenticated observations and counters, not a fixture/offline replacement. Body-capture consistency and independent replay are separate obligations; the failed post-window capture assertion remains material.

## Diagnosis and minimum corrective action

**A0: backend pacing limiter, not an A2 regression.** In `canisters/runtime-lab/src/pace.rs`, three ordinary compute/delivery overruns reduce `performance_milli`; the observer follows the reported supported rate. The controller polls independently recorded 16 limited observations during the strict window, with supported rates **434 → 542 → 677 → 846 milli-ticks/s** before recovery. The browser retained 65 limited samples, 66 non-unit nominal-rate samples, starting **66.481 seconds** and ending **100.296 seconds** into the strict trace. All controller polls remained mode Normal and all browser target rates remained 1. This is not a funding-tier transition, nor just a renderer label. The lower production bounds, heavy own-work CPU pressure and HTTP tails support insufficient headroom/contention in this VM's simulator/browser delivery path. They do not uniquely isolate CPU scheduling, simulator serialization and capture overhead as individual causes. A2 never limited.

**A2: strict delivery PASS, later capture FAIL.** The browser completed every Normal-only check with no uncaught page errors. The native harness then invoked the unchanged `tools/capture_million_history.mjs`, whose first assertion rejects any `wire-index.json` error. Its retained error is exactly `Response.body: Target page, context or browser has been closed`. Thus history generation and independent replay did not run. No error was ignored or index edited.

The existing capture callback synchronously reads `response.body()`. `stop_wire_capture()` records the fence and removes the listener, but does not track/drain already dispatched body callbacks before the normal context/browser close. The original index is written in `finally` after closure. This source ordering and the closed-target error are consistent with an outstanding callback at teardown; the error lacks a timestamp, so the precise failed response is not provable from this capture. A separate **diagnostic content audit**, not the original replay gate, found every catalog **0–999 A0 / 0–1018 A2**, no gaps, no conflicting duplicate catalog bytes and no decoding errors. That supports the teardown explanation but cannot turn the original capture gate into PASS or supply missing replay evidence.

The minimum follow-up is limited to **(1)** enough isolated workload headroom for unrestricted A0, consistent with the originally recommended eight dedicated CPUs/32 GiB/fast local SSD, and **(2)** a narrowly reviewed capture-shutdown lifecycle correction that drains already started callbacks before closing the context while retaining all error, capture-boundary and replay assertions. No such correction was implemented here because the current task freezes the browser acceptance code. Do not alter A2, DTR, gameplay, pacing or any acceptance predicate. A later changed-harness attempt or paid host requires separate authorization and a fresh explicit predeclaration; do not rerun this failed pair automatically.

## Retention and release boundary

The complete original evidence manifest verifies **4,418 files**, SHA-256 `1bacf932e912e1c11c875f71976d6427d6be4d281eb0c822329d582270f43f44`. Full failed/successful strict measurements, errors, raw requests/catalogs, controller polls, host samples, actual executable identities, provisioning failures, waiting screens, unchanged package and analysis are retained in an independently verified archive identified by [run-verification.json](run-verification.json). Earlier historical failures remain untouched.

**Final comparison FAIL; release NO-GO.** A2's successful strict delivery measurement is preserved and separately identified; the required both-window PASS condition and complete native A2 case are not satisfied. Consequently no fresh mainnet preflight, funding estimate or deployment procedure was initiated. The production path remains the existing state-preserving v5→v5 upgrade on its 34-node fiduciary subnet, for separate approval after qualification. No mainnet read/mutation, financial transfer/funding, reinstall, controller change, frontend deployment, merge, remote Git publication or new infrastructure occurred.
