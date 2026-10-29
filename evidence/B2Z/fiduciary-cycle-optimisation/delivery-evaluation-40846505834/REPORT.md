# Published A2 delivery attempt — environmentally blocked before strict windows

**Release: NO-GO.** Dedicated workflow `40846505834`, exact source `b96c64b43a412c022143787cd9d6ed94da2bbc67`, completed with failure because its predeclared environment monitor interrupted A0 after 20.059 seconds. The corrected provisioning order worked. The initial resource prerequisite passed, but neither strict 900-second measurement started. A2 was never launched. This is not a failed complete A0 playback window, an A2 regression, or evidence that the test host cannot sustain the workload.

## Definitive workflow and measurement boundaries

| Gate | Result |
| --- | --- |
| Locked remote fetches, unchanged offline DTR77 provenance, asset/browser preparation and disposable fixture binding | PASS |
| A0 launch resource prerequisite | PASS, independently reproduced from the retained pre-launch samples using the unchanged predicate |
| A0 90-second Normal prelude | INCOMPLETE; case interrupted during startup/early prelude |
| A0 full 900-second strict Normal window | NOT_RUN |
| A0 case outcome | BLOCKED_ENVIRONMENT, exit `-15` (monitor-requested SIGTERM) |
| A2 prerequisite / prelude / full strict window | NOT_RUN; no A2 case directory or outcome exists |
| Ordinary exact-commit CI | PASS: all six substantive jobs; production inventory excluded |
| Normal-only matched delivery | BLOCKED_ENVIRONMENT; no delivery PASS |

[Dedicated workflow](https://github.com/aodl/balls-2-the-wallz/actions/runs/40846505834) and [ordinary verification](https://github.com/aodl/balls-2-the-wallz/actions/runs/40846505855) both identify the exact published correction head. No workflow dispatch, rerun, push, new qualification invocation, implementation change, merge or production action was performed during this evaluation.

The comparison is explicitly **Normal-only**: sequential A0 then A2, each with its original 90-second prelude and untrimmed 900-second strict measurement if execution reaches them. The scope excludes Economy, Lifeline, low-funding and cold reconnect. Their separate [historical qualification](../REPORT.md) and [paid-v8 reconnect evidence](../qualification-20261028/tests.json) remain unchanged and do not fill the missing Normal windows.

## Resource evidence and actual interruption

The frozen `quiet()` predicate independently passes the last pre-launch sample set; the table below describes that reconstructed set, rather than an unrecorded decision timestamp. The resource monitor retained 24 samples over 115.229 seconds. The initial cooldown rejected residual CPU and I/O pressure; the qualifying set was subsequently reached within the declared 180-second allowance. That set’s 12 retained samples run from 09:05:47.709 to 09:06:42.798 UTC. This is the existing screen's sample convention; no threshold or sampling logic was changed.

| Prerequisite metric | Observed | Unchanged requirement |
| --- | ---: | ---: |
| CPU idle median | 99.8249% | ≥70% |
| CPU idle minimum | 99.2496% | ≥40% |
| Available memory minimum | 14.4606 GiB | ≥2 GiB |
| CPU PSI avg10 maximum | 1.89% | ≤10% |
| I/O full PSI avg10 maximum | 0.93% | ≤2% |
| Swap-out delta | 0 pages | 0 |
| Cgroup throttled-usec delta | 0 in both recorded groups | 0 |
| Foreign heavy work / active compiler | No rejected process in qualifying samples | Original 0.25 / 0.01 core limits |

`prerequisites.jsonl` logs every 15 seconds; its final logged row is still a rejection. The successful check occurs between those log writes and exits the wait loop without writing an accepted row. Launch is corroborated by `outcomes.json`, the A0 fixture files and the independent successful replay of the exact unchanged `quiet()` predicate over the samples available before launch. No assertion is relaxed to infer this PASS.

A0 case start: **09:06:43.728 UTC**. At **09:07:02.872 UTC**, PID **1613**, `provjobd4930979`, consumed **0.759811 CPU core** over the sampler interval, exceeding the predeclared **0.25-core** foreign-process limit. The process is outside the owned test descendants/groups. Its retained ancestry is `provjobd4930979` → `sudo` → `hosted-compute-` → `systemd`; this supports attribution to hosted-runner infrastructure. Those process names were read from the uploaded sample; no sudo command was executed by this evaluation. The monitor terminated the test, with case completion at **09:07:03.787 UTC**. Browser cancellation/TargetClosed messages follow the forced teardown and are not a separate demonstrated application failure.

The host reported four CPUs and four-CPU affinity. The monitor did not reject the case merely for its own workload's CPU/pressure use; it rejected the specifically recorded foreign process. This attempt cannot diagnose sustained four-ball capacity because it ended before a complete prelude, let alone a long window.

## Assertions, authentication, timing and missing measurements

The raw browser report is `status: NOT_RUN`. It records only the production asset-build exclusion check and the million-cell seam/culling/sparse-selector check as PASS. The browser reached the initial certified genesis and enabled verified transfer preparation using the actual verifier and pinned disposable root. The frozen sandbox/browser/frontend inputs passed preparation. These startup facts are not a completed authenticated-playback qualification.

There is no completed Normal prelude telemetry file, strict telemetry, aligned sustained trace or sustained-analysis JSON. Therefore **production/admission/display rate acceptance, buffer conservation and bounds, stall/rebuffer freedom, zero resynchronisations, dense phase sampling and the full authenticated-playback assertions are NOT_EVALUATED** for either strict window. Missing measurements are not recorded as zeros or PASS.

Partial diagnostics are retained without extrapolation:

- Seven controller publication polls observe segments 0 through 13 over a 12.198-second span, all reporting Normal. These are startup observations, not the strict production-rate measurement.
- The proxy records 49 requests, all HTTP 200; 38 captured observation bundles are also HTTP 200 with no wire-capture errors. These responses cover approximately 13.783 seconds of request starts.
- Proxy upstream-header time: median **5.334 ms**, maximum **130.372 ms**. Proxy completion: median **5.417 ms**, maximum **130.457 ms**. Total proxy finished time: median **5.616 ms**, maximum **130.644 ms**.
- Browser observation response-header offsets: median **6.558 ms**, maximum **131.985 ms**; response completion offsets: median **16.433 ms**, maximum **143.211 ms**. These are browser request-timing fields, not separate certificate-verification durations.
- Admission/display counters, complete buffer accounting, stalls and resynchronisations were not persisted for a completed measurement. No numerical qualification can be derived from the HTTP successes alone.

## Successful ordinary verification — separately qualified

Ordinary run `40846505855` is definitively **SUCCESS**, with all six substantive jobs PASS: source, native, runtime-lab Wasm, browser HTTP/Web Crypto, packaged DTR/clean consumers, and S14/million-cell installed-IC qualification. The informational production-inventory job is excluded. The final installed-IC artifact has **50 PASS checks**, including 42 selected installed test invocations (29 index, four million-cell, eight funding, one funding cutover); its inventories separately retain 16 ignored index probes and one ignored million-cell probe. Source reports 1,389 JavaScript / 166 Python tests; native reports 22 workspace / 15 portable tests; HTTP/Web Crypto reports 14 browser groups. Full reports/logs are preserved.

The ordinary suite's already executed sustained Normal case supplies a successful measurement that must also be retained. Its actual identity is **`fiduciary: false`**, module **`da25be812867e40d5bb69f64af776df5f831533460037fbaeeb1daf39f3fcfda`**, world v5 / publication v6. This application-subnet source-CI case is **not** a frozen approved-A2 34-node comparison, has no paired A0 control and supplies no quiet-host/during-window resource qualification. It cannot replace either missing dedicated window.

The original `continuous_summary()` was independently applied offline to every uploaded strict telemetry row and publication poll; all seven original checks and key numerical results reproduce the stored PASS. Dense samples are all PLAYING. This is analysis of the existing artifact, not a new test or altered acceptance rule.

| Ordinary-CI strict Normal result | Observed |
| --- | ---: |
| Full measurement | 900.097300 seconds |
| Production rate bounds | 0.997669919–1.002113883 ticks/s |
| Admission rate | 0.999891901 ticks/s |
| Display rate | 0.999851714 ticks/s |
| Stalls / resynchronisations | 0 / 0 |
| Regular / dense phase samples | 1,769 / 3,600, all PLAYING |
| Buffer start → end | 17.220869398 → 17.257041281 ticks |
| Buffer conservation error | 2.094×10⁻¹⁰ ticks |
| Queue / buffer-byte maxima | 18 segments / 682,205 bytes |
| Verified-certificate counter | 293 → 2,752 |
| Performance limited / uncaught page errors | false / none |

All seven original gates pass: rates, no stall/rebuffer, no resynchronisation, Normal without performance limiting, buffer accounting, bounded queue and no sustained buffer deficit. The saved report also passes the original Normal prelude, Economy, Lifeline and cold-reconnect assertions, **in this separately labelled ordinary-CI fixture**. Those phases were not executed by the dedicated Normal-only comparison.

For requests starting within this ordinary strict window, the retained proxy trace contains **2,909 HTTP 200 responses**. Upstream headers are median **5.376 ms**, maximum **132.597 ms**; complete responses median **5.454 ms**, maximum **132.683 ms**; total proxy time median **5.646 ms**, maximum **132.902 ms**. Frame-sampled browser fetch time is median/max **24.2/144.5 ms**, certificate verification **24.4/51.6 ms**. These successful timings do not supply missing fiduciary-host resource evidence.

## Exact identities and integrity

| Input | SHA-256 |
| --- | --- |
| Frozen A0 normal | `7c078fb373df7115ca73d65645ce59d4a96db0a42504b57ab73d8eb905f5bf51` |
| A0 compressed bytes | `4e7aec89e97329101492b77eb9cff102282d280df43096c12a6e9b64b858923b` |
| Frozen approved A2 normal | `2c289fdf44d05422909ce53be5e058222de6b1f971644b0750c7bc12d148c9cb` |
| A2 compressed bytes | `2fde8cf962498a8267757ccd4ca505196261f33263ae32c0a04bdcdc6c42b17b` |
| Dedicated native harness | `20ecd7716612a4554e8e753f13d68d41cf05437943ebb27d3a8784312239b507` |
| Original dedicated artifact ZIP | `bf610b2081c2f044e54a15bceca91f2208e00b1ded7826a4d56fec81dfa13295` |

Both compressed module hashes verify, and decompression matches the uploaded prepared modules byte-for-byte. A0's actual fixture module-identity record confirms that exact A0 binary, fiduciary configuration, world v5 and publication v6. A2 is only a prepared input; it was not installed in a comparison case.

All **117** entries in the original delivery SHA-256 manifest, **29** preparation-manifest entries, the predeclaration manifest and **38** predeclared input hashes verify. The original ten-entry production frontend manifest matches; prepared and served local asset identities also match. The manifest retains the browser inventory verification performed before the preparation step succeeded. No browser binary, sandbox, source rule, normal artifact, fixture world or 34-node fiduciary setting was changed. Offline decoding of the uploaded dedicated initial world confirms v5, 1,000×1,000, four balls and one cannon.

Ordinary source CI's Wasm build records `da25be812867e40d5bb69f64af776df5f831533460037fbaeeb1daf39f3fcfda`, 2,800,907 bytes. This is exactly the artifact hash recorded by the already accepted original `eae3eb97…` CI. It is separately identified from the frozen approved `2c289fdf…` delivery artifact; no substitution or cross-host byte-reproducibility claim is made. The original CI Wasm evidence ZIP was also downloaded and checksum-verified for this identity comparison.

## Retention and minimum next action

Complete original ZIPs, extracted artifacts, decoded full job logs, API records, host samples, interruption details, partial requests/publications, successful ordinary measurements and original manifests are preserved under `.work/a2-delivery-evaluation/` and an independently checksum-verified archive identified in [verification.json](verification.json). Earlier failed provisioning evidence remains untouched. Reviewed summaries only are committed here.

The minimum corrective action is **a genuinely isolated host without the observed provider workload**, followed only with separate authorization by one unchanged sequential attempt using the same exact frozen artifacts and all original requirements. Do not rerun this hosted attempt automatically, allowlist its provider process, relax the foreign-work predicate, change the world, or edit A2. More capable hardware is warranted only if a qualified host then demonstrates insufficient capacity; this attempt does not establish that diagnosis. No A0/A2 regression comparison exists yet.

Sustained delivery did not pass. Consequently no production preflight, fresh cycle-funding estimate or guarded upgrade execution was initiated. The approved future path remains the existing state-preserving v5→v5 upgrade on the 34-node fiduciary subnet, with separate approval after qualification. No mainnet query/mutation, cycle transfer, financial action, reinstall or deployment occurred.
