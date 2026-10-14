# S12 corrective closeout

14 October 2026. **The running local service drained independently scheduled 1 and 8 record/s streams while simulating a 32-ball starting world. At 128 record/s, it verified 39 record/s and accumulated 11,392 records of backlog in 128 virtual seconds. Complete update headroom and a conservative all-in daily cost remain unestablished.** This closes measurement methodology; it does not establish production scalability or start S13.

## Source and evidence boundaries

Measured implementation: BTZ `b1d5f0dcef46cf743c18cb8e43eea57faeab68c3`, tree `b999ac0448114a5925f8a8beb2d80e8699e72c33`, branch `checkpoint/s12-operating-envelope`, clean during collection. The final evidence/documentation commit also adjusts the analytical initial-seed callback assumption to 11; it does not change measured application code. Reviewed costs were recomputed with that explicit assumption file before committing it verbatim.

Rust DTR remains `71e59e93cf49a3656689679b538b4c3f138787f8`; JavaScript remains `@dtr/timeline-runtime@0.11.0`, package SHA-256 `dc460b1a5349f022d0ba789fd7e647271f41402de2e57a9c8c4ba860834a4bf8`. DTR was not changed. Its existing checkout `436ec0f940f1179710b6a596d5b64d22f306fba5` differs from the dependency pin only in documentation, workflow and evidence, and passed standalone conformance.

Tools: Python 3.11.14, Node 24.15.0, npm 11.12.1, Rust/Cargo 1.94.1, canbench 0.7.0. Instruction measurements use integrity-checked PocketIC **13.0.0**, SHA-256 `b19a15ba0650a3987e78a8017dee0e99c5518194d1e0c4fd45b53cd32598544e`. Installed application tests use PocketIC **16.1.0**, binary SHA-256 `b44e1eccd66e02328146b3e209e3403e3a3428a25d25555aca2f67500e5ae9db`. These runtime identities are distinct; transferring query instruction samples to update costs is analytical.

Normal Wasm: SHA-256 `2e26b749927d39b13701b06768f5c854196032d04fd16d5af385f55c12af92c3`, 2,238,602 bytes. Benchmark Wasm identity, lock/package/fixture hashes, source fingerprint, runtime and commands are in [provenance](../evidence/S12/closeout/provenance.json) and the current measurement manifests. Build: locked release `wasm32-unknown-unknown`, dedicated `canbench` feature for benchmarks; normal feature set for installed measurements. Observed rustc flags were optimization level 3, one codegen unit, overflow checks on and stripped debug information. The manifest specifies LTO; the captured root rustc command did not show an explicit LTO flag. No independent optimization or reproducible-Wasm claim follows from the build.

The original [S12 report](S12_REPORT.md), S11 reports, historical S12 JSON and committed canbench YAML/CSV remain byte-for-byte unchanged. [Preservation hashes](../evidence/S12/closeout/history-preservation.json) bind them to reviewed commit `364964d0248d9c093571d4d9dd34bc871bd32f0d`. Prior CI run [38598030205](https://github.com/aodl/balls-2-the-wallz/actions/runs/38598030205) remains original S12 evidence; it did not execute these changes. New CI is `NOT_RUN`.

## Fresh capture and regression policy

Each canbench process receives a run-specific configuration and writes precise YAML and CSV with `--persist --csv`. Smoke has two separate files and exactly two cases; extended has 32 executed cases. Existing current-result files are rejected instead of reused. The baseline is never written by the runner.

Current manifests bind source revision/tree/content, DTR/package/lock identities, fixture/rules, budget, logical interval, source mode, tool/runtime, Wasm, profile, timestamp and raw-result hashes. Validation rejects missing, stale, empty, tampered, mismatched or incomplete inventories. Costs require the current manifest and validate its raw numerical totals; no historical-baseline fallback exists.

The instruction gate compares structured results with matching workload/tool/runtime identities at a declared 2% threshold. Missing monitored cases and incompatible comparisons fail; new explicitly informational cases have `NOT_RUN` regression comparisons. All **20 historical cases matched exactly**; all **12 warm cases were measured**, with no claimed historical comparison. Host elapsed time is not a deterministic regression gate. Timeout and arbitrary external exit-2 tests report `FAIL`.

See [smoke](../evidence/S12/closeout/smoke/run-summary.json), [extended](../evidence/S12/closeout/extended/run-summary.json) and [comparison](../evidence/S12/closeout/extended/regression-comparison.json).

## Compute and warm operations

The original microbenchmarks remain valid. Their scopes are narrower than an autonomous callback: direct kernel execution; coordinator execution at budget 100,000 without durable restore; first Step(512) plus a new root (`old=None`); or persistence after completion outside measurement.

| Case | Initial board / cannons / balls | Logical ticks | Direct kernel instructions | Coordinator microbenchmark |
|---|---|---:|---:|---:|
| Small admission reference | 12×8 / 0 / 0; two paid inputs create two balls | 2 | 16,852,473 | Not measured |
| Medium dense | 16×8 / 2 / 32 | 4 | 455,281,320 | 1,007,115,272 |
| High dense | 16×8 / 2 / 64 | 4 | 1,661,578,160 | 2,741,602,784 |
| Many-cannon frontier | 32×8 / 32 / 32 | 1 | 15,478,878 | 276,799,967 |

The high dense kernel costs 3.65× the medium kernel for these fixtures. Trajectories and initial states differ; small/frontier intervals also differ. This is not a controlled occupancy-only scaling curve. Medium coordinator steps/publication used 729.83M/277.29M instructions, so coordination and output processing are material alongside physics. At high density, the direct kernel alone accounts for approximately 61% of the coordinator total.

New warm cases use existing durable roots and real restore/validation/action/persistence paths with Step(512), two logical ticks and the medium seed. Preparation is outside measurement, and each query receives isolated stable state.

| Warm operation | Instructions |
|---|---:|
| Seal | 34,381,976 |
| Early step | 94,586,429 |
| Middle step | 188,437,379 |
| Late step | 228,301,384 |
| Finalization / ready calculation | 304,502,067 |
| Publication | 288,463,923 |
| Publication with one durable input retired | 290,089,354 |
| Publication at retention capacity, with eviction | 342,365,877 |
| Empty-input progression after a committed world | 89,909,620 |
| Validated page admission | 19,004,693 |
| Admission with an unfinished stage | 54,537,893 |
| Local empty-poll begin/at-tip handling | 4,089,302 |

Finalization's action/restore/persistence scopes were **243.12M / 48.04M / 13.33M**. Eviction publication's were **181.90M / 117.24M / 43.21M**. Coordinator actions dominate these sampled operations; restoration also matters. Stable-write persistence alone is a smaller component. The action scope includes kernel progress, cursor handling and output/hash calculations; it is not a pure physics measurement.

Footprints before measurement reached root **5,184 B**, coordinator image **110,844 B**, and working cursor **27,588 B** in the sampled eviction case. These are sample footprints, not global maxima. The retirement case restores durable state after publishing and verifies pending inputs are empty and retired watermark is one. Eviction starts with three committed publications and executes the existing fourth-publication capacity path. [Warm measurements and scopes](../evidence/S12/closeout/warm-operations.json) preserve exact counts.

**No normal-Wasm complete-update instruction measurement was obtained.** `certified_data_set` is unavailable in canbench's query context; timer dispatch is also outside these scopes. Admission excludes network/response decoding and scan setup; the polling microbenchmark excludes awaiting, encoding/decoding and timer dispatch. No new debug endpoint was added. Normal and test-hook Wasm export checks exclude benchmark exports.

The documented update/timer limit is 40B instructions. The largest warm query scope leaves an arithmetic margin of 39,657,634,123 instructions (99.144%); this is **not verified worst-case full-update headroom**. High occupancy, large inboxes and other hidden cursor states remain outside this sample. The official limits also specify a 5B query limit, 4 GiB wasm32 heap, 500 GiB stable memory and 2 MiB replicated responses. [Official resource limits](https://docs.internetcomputer.org/references/resource-limits/) (checked 14 October 2026).

Largest measured heap growth was 56 pages / 3,670,016 B, not heap high-water. Cold stable allocation was 385 pages / **25,231,360 B**. Warm cases grew no stable pages. Installed 50-segment and combined traces retained that stable length. The 50-segment current publication/artifacts and retained history reached **30,581 / 89,430 B**, under the three-publication/8 MiB policy. Full heap/storage and worst-case artifact occupancy remain unmeasured.

## Autonomous simulation and combined ledger load

The fresh simulation-only run reproduced **50 segments, 464 callbacks and 464 virtual seconds**, one explicit start, no per-segment manual commands. Logical duration is two ticks; callback pacing is one virtual second. Whole-window completion period is **9.28 s/segment**; consecutive publication spacing averages **9.184 s**, with 5–15 callbacks per completed segment. Twenty seconds was a declared cumulative target deadline, not measured publication cadence or implemented segment pacing. [Fresh simulation trace](../evidence/S12/closeout/autonomous-trace.json).

The controlled ledger fixture derives tip from its own virtual clock and serves the canister-requested contiguous page. Arrivals are independent of prior service completion. The harness starts simulation once, advances time and sends alternate time-scheduled hints; it never drives `sync_ledger`, Seal, Step or Publish per page/segment. All four cases ran **128 virtual seconds** with the normal installed Wasm: 16×8, two cannons, 32 starting balls, two ticks, Step(512), one-second callback pacing, five-second fallback, 64-record pages, three-publication retention.

| Case | Arrival schedule | Verified records / virtual s | Final / maximum backlog | Completed segments | Completed-segment callbacks min / mean / max |
|---|---|---:|---:|---:|---|
| Idle | None | 0 | 0 / 0 | 11 | 8 / 11.45 / 16 |
| Low | 64 every 64 s | 1 | 0 / 64 | 10 | 8 / 12.00 / 16 |
| Moderate | 64 every 8 s | 8 | 0 / 64 | 10 | 10 / 12.30 / 17 |
| Overload | 128 every 1 s | 39 | 11,392 / 11,392 | 10 | 10 / 12.80 / 18 |

The moderate consecutive publication spacing averaged **12.444 virtual seconds**; window completion period was **12.8**. Window callback amortization also includes five unfinished-tail callbacks; it is not the completed-segment callback mean of 12.3. Exact host elapsed totals are retained separately and reflect harness/CPU load, not mainnet latency. Per-publication host timestamps were not measured.

Idle made 26 observed empty polls. Low/moderate/overload made 27/33/78 ledger calls and two archive calls each. Mostly irrelevant traffic included valid, underfunded and invalid-memo incoming records; canonical inbox admissions were 3/12/60, with 3/12/54 confirmed published assignments and six still pending in overload. Published source ranges and input counts were checked for exactly-once assignment. Low/moderate admitted records while a segment was running. Queue high-water was 3/3/12; simulation continued with multiple callbacks per checkpoint and no observed scan/run errors.

Assignment timestamps record when publication was observed, an upper bound on seal-time assignment, not an exact hidden-stage timestamp. Arrival-to-publication bounds were 22 s low, 13–24 s moderate and 18–93 s overload. Active-stage source watermark and exact seal-time latency are `NOT_MEASURED`; published seals supply the last published watermark. [Full trace](../evidence/S12/closeout/combined-service-trace.json), [derived summary](../evidence/S12/closeout/combined-summary.json).

At 128 arrivals versus 39 verified records per virtual second, backlog grew by approximately **89 records/s**. This configuration is `UNSUSTAINABLE_TESTED`; the expected saturation test passed. Eight records/s drained for this duration, not forever. Five-second fallback alone has a nominal 64/5 = 12.8 record/s page-opportunity ceiling; hints alter opportunities, and actual scheduling/latency can reduce service. The overloaded 39 record/s sample therefore cannot be borrowed as quiet fallback catch-up capacity. No defensible autonomous catch-up time was established.

The original minimum approximately **384.89 host record/s** remains valid for `MANUALLY_DRIVEN_CONTROLLED_PAGE_PROCESSING`. Fresh manually driven samples were **104.15 / 137.90 / 211.48 host record/s** (minimum/median/maximum), including fixture construction/replacement and explicit scans amid other validation. These host-time samples do not define autonomous capacity or a 192 record/s guardrail. The old 80-versus-64 case is service-opportunity arithmetic, not independent arrival-rate overload. [Fresh manual trace](../evidence/S12/closeout/manual-ledger-trace.json).

Evidence classes remain separate: `UPSTREAM_COMPATIBLE_LOCAL_FUNCTIONAL` for the pinned real ICP ledger/archive; `CONTROLLED_PAGE_MICROBENCHMARK` and manually driven page processing; `AUTONOMOUS_CONTROLLED_SERVICE_LOAD` for the new joint test; `PRODUCTION_MEASUREMENT` is unavailable. Controlled fixtures do not establish actual upstream-ledger throughput or mainnet finality.

## Revised costs

Official tariffs were rechecked on 14 October 2026. On a 13-node subnet: 1 cycle/instruction, 5M/update, 260k/inter-canister request-response, 1,000/transmitted byte and 127k/GiB-second. One trillion cycles equals one XDR; a 34-node comparison scales by 34/13. [Cycle costs](https://docs.internetcomputer.org/references/cycle-costs/), [cycles](https://docs.internetcomputer.org/concepts/cycles/).

The model separates instruction execution, update base fees, nonempty pages, empty polls, inter-canister calls/bytes and storage. Combined cases use observed service, empty polls and archive fractions on the same virtual time base. Analytical traffic uses explicit full-page batches; partial-page distributions are not modeled. Empty opportunities are not also charged as nonempty pages. Changing publication cadence recomputes game terms while traffic, polling and held storage remain independent.

Warm game samples match two ticks and budget 512, but their synthetic-source roots and initial/evolving cursor states are transferred analytically to ledger-source operation. The initial seed uses **4,322 work units, nine Step(512) actions and 11 total seal/step/publish callbacks**; combined cases use measured window amortization. The high/quiet rows project direct kernels with explicit four-/32-tick configurations, estimated 512-budget callback fees and missing coordinator/persistence costs. No completed-state persistence proxy or unexplained 10% “conservative” uplift remains.

| Scenario | Cadence basis | 13-node partial cycles/day | XDR/day, same numerical range | Cycles / 30 identical modeled days |
|---|---|---:|---:|---:|
| Active, no new payments; polling enabled | Measured idle window, 11.636 s/completion | 11.830–20.404T | 11.830–20.404 | 354.893–612.127T |
| Moderate combined, 8 record/s | Measured window, 12.8 s/completion | 12.278–21.123T | 12.278–21.123 | 368.329–633.687T |
| 64-ball high simulation | Assumed 60 s, four ticks | 3.084T | 3.084 | 92.519T |
| High irrelevant/background traffic | Measured overloaded service, 39 processed/s; 128 offered/s | 15.213–24.059T | 15.213–24.059 | 456.404–721.761T |
| One 4,096-record catch-up per modeled day | Assumed 8 processed/s, 20 s game cadence; 11 initial callbacks | 6.723–11.345T | 6.723–11.345 | 201.701–340.336T |
| Quiet one-ball game, ledger disabled | Assumed 60 s, 32 ticks; analytical comparison | 0.03478T | 0.03478 | 1.04344T |

**These are partial projections and illustrative sample-extrema ranges, not measured balance deductions, conservative upper bounds or comparable full costs across rows.** In particular, the kernel-only high/quiet rows omit more work and must not be interpreted as cheaper full operating modes. Monthly figures repeat each modeled day, including one catch-up per day in that row. The catch-up processing rate is assumed, not demonstrated.

Measured stable storage contributes approximately 257.85M cycles/day; heap and Wasm-code storage are excluded. The empty-poll model combines measured local begin/at-tip handling with an explicit 1M instruction residual and 256-byte payload assumption. Requests are assumed 32 B and nonempty replies 150 B/record. These assumptions are visible, not calibrated bounds.

Missing components include full timer dispatch and certification instructions/base charges, some request/response encode/decode and archive handling, phase-dependent page costs, heap high-water/storage, actual request bytes, retries outside observed runs, gateway/query service, actual mainnet cycles, finality/availability and fiat conversion. ETH-equivalent compute is `NOT_INCLUDED`. Unmeasured components can raise totals beyond the displayed ranges. The original 8.953T / 11.083T / 1.306T outputs remain illustrative historical model outputs, not validated burn estimates.

Sensitivity tests verify tariff multiplication, nonzero zero-arrival polling, traffic and storage effects, independent cadence terms, changed-budget counts or rejection of unsupported warm budgets, finite catch-up volume, missing measurements and fresh-value dependence. [Reviewed assumptions](../benchmarks/s12/closeout-cost-assumptions.json), [cost projections](../evidence/S12/closeout/cost-projections.json).

## Envelope, verification and decision

The conservative **tested local** recommendation is the low combined configuration: 16×8, two initial cannons, 32 initial balls, two ticks, Step(512), one-second virtual callback pacing, 64-record pages, five-second fallback, 64 arrivals every 64 virtual seconds, alternate hints omitted, retention three/8 MiB. It completed ten checkpoints over 128 virtual seconds and drained its backlog. The 8 record/s variant also drained for 128 seconds. Only these simultaneous source/game configurations are `DIRECTLY_TESTED_COMBINED`; the 50-segment run is `DIRECTLY_TESTED_SIMULATION_ONLY`, page paths are micro/scan evidence, and deployment costs/cadences are analytical. Full hard-limit headroom, long-term stability and production applicability remain unsupported. [Envelope](../evidence/S12/closeout/operating-envelope.json).

Source: **1,175 JavaScript / 116 Python tests PASS**. Native: **18 workspace / 7 portable / 8 canister tests PASS**; format, Clippy, normal Wasm and generated Candid PASS. DTR: **186 JavaScript / 29 Rust PASS**, unchanged implementation. Smoke: two measured cases PASS; extended: 32 measured cases, six installed test invocations, expected saturation and cost generation PASS. S09 and same-version integration: ten tests each, genuine certificates, sandboxed browser-native Web Crypto, live observer/reconnect and snapshot regressions PASS. Historical core: ten tests PASS; isolated live historical upgrade/reconnect PASS, with fresh snapshot validation recorded in [verification summary](../evidence/S12/closeout/verification-summary.json).

Failures are retained: the early empty-poll benchmark compile error (fixed); first extended server expiry at 900 seconds (fixed by finite lifetime covering declared timeouts); one historical live attempt missing initial heads before intentional disconnect (isolated unchanged rerun passed); an incomplete snapshot command (FAIL, not BLOCKED); and rejection of an expired snapshot (freshness correctly remained fail-closed). Initial browser attempts lacked user libraries; existing user-scoped libraries enabled sandboxed runs. No browser assertion or freshness policy was weakened. See the summary for exact attempt status and raw log references.

The multi-segment fixture now executes all **eight consecutive kernel intervals** with budget-independent public outputs, and all eight coordinator snapshot/restore/publication intervals with three-entry memory retention. IC stable writes for that particular JS fixture remain unmeasured; warm canister measurements and installed continuous runs supply separate persistence evidence. Historical goldens were not changed.

The measured joint source limit chiefly reflects **scan scheduling under the configured fallback/hint policy**, rather than the standalone irrelevant-record classifier. Game cost is dominated by coordinator actions/output processing and repeated restoration in these samples. The next narrowly scoped decision is to compare **one-second versus five-second fallback under the same independent 8/128 record/s workloads**, keeping game budget and authority fixed, before deciding whether relevant-account history is necessary. Do not implement that follow-up as part of S12.

## Reproduce and user-owned remote steps

Use new empty output directories. Existing run results are deliberately not reused or overwritten.

```bash
cd /home/codexdev/src/btz
npm ci --ignore-scripts
DFX_IDENTITY=codex_local python3.11 -B tools/benchmark_s12.py \
  --profile smoke --output .work/s12/review-smoke
DFX_IDENTITY=codex_local python3.11 -B tools/benchmark_s12.py \
  --profile extended --output .work/s12/review-extended \
  --harness-target tools/s09-integration/target
```

Omit the harness target for an isolated build. On this host, browser checks used `/home/codexdev/dtr-s08-playwright/bin/python` (Python 3.11) and the existing user library directory `/home/codexdev/playwright-libs-s08/usr/lib/x86_64-linux-gnu`, with Chromium's sandbox enabled. The exact current measurement files are in `evidence/S12/closeout/{smoke,extended}/`; raw logs remain under `.work/s12/`.

Historical upgrade reuse supplied the already verified `.work/s11-historical-4a0e1ae-rerun/wasm/runtime-lab-s10-e4405bbdcfcc.wasm` and its `results.json`. Both `--historical-baseline-wasm` and `--historical-baseline-evidence` are required for that reuse path. Do not invoke the default remote-cloning preparation automatically. The remote-cloning package-consumer wrapper was not rerun; pinned package/source checks and standalone DTR conformance were rerun, and unchanged original CI evidence remains applicable.

No remote Git action, public deployment, controller change, wallet access, real transfer, publication or release archive occurred. The user reviews and performs every remote operation:

```bash
cd /home/codexdev/src/btz
git status --short
git branch --show-current
git log -6 --oneline
git diff 364964d0248d9c093571d4d9dd34bc871bd32f0d..HEAD --stat
# User only, after review and any required reconciliation:
git push origin checkpoint/s12-operating-envelope
```

Remote state was not refreshed. Inspect and reconcile any advancement/divergence; never force-push.
