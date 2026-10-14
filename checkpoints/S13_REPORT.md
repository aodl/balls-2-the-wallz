# S13: fixed ledger fallback comparison

**Recommend one-second fallback for the measured local envelope up to 32 offered records/s.** It drained both hint-assisted and fallback-only 32-record/s streams for 128 seconds; five seconds accumulated backlog. Both policies saturated at 128 offered records/s. Faster discovery did not improve publication latency at 8 records/s, and additional polling costs remain a partial estimate.

S13 compares one-second and five-second fallback on the unchanged installed BTZ
application. Findings below are finite controlled-local measurements, not mainnet
capacity, finality or actual cycle burn.

Measured matrix source: `b904ee638180d35b44fee44b0b6639aa29a307ac`, tree
`2cbd15fa03b74cc29c3ae8cbf20a498a9352a0e5`. DTR remains
`71e59e93cf49a3656689679b538b4c3f138787f8`, packaged client 0.11.0 with reviewed
SHA-256 dc460b1a5349f022d0ba789fd7e647271f41402de2e57a9c8c4ba860834a4bf8.
Normal Wasm matches S12 exactly:
`2e26b749927d39b13701b06768f5c854196032d04fd16d5af385f55c12af92c3`.
No application, DTR, pricing, gameplay, Candid, stable schema or production
configuration change was made.

## Controlled design

Every pair starts a separate disposable PocketIC instance at the same fixed
virtual time, with the same canister creation order, initial world, byte-identical
ledger fixture, records, schedule, hints and observation policy. Only
`fallback_seconds` differs. Pair validation rejects differences in source, normal
Wasm, world, fixture, workload, harness, runtime, model identity, game configuration,
arrival schedule, initial backlog, duration and hint policy.

Common configuration: 16×8, two initial cannons, 32 initial balls, two logical ticks
per segment, Step(512), one-second simulation pacing, 64-record source pages,
three-publication/8 MiB retention. Primary windows last 128 virtual seconds.
Arrivals follow the ledger's own virtual clock. Alternate arrival batches are
hinted; alternate hints are omitted. Separate controls deliver no hints after
startup. Fixed initial backlog is 512 records, plus 64 arrivals every eight seconds.
The 8/32 record/s primary pairs are repeated once, in fresh instances.

The harness starts game progression once and observes each virtual second. It
never issues per-page sync_ledger or per-segment Seal/Step/Publish. Each captured
seal/history is independently replayed against native artifact bytes. Different
policies may correctly seal different histories; their final state hashes are not
used as a paired performance criterion.

## Measurement scope

Rates, backlog, discovery and publication observation use PocketIC virtual seconds.
Host elapsed time is separate and includes harness/CPU contention. Source calls
are durable counters of initiated calls; successful source advances and empty
polls are observation classifications, not exact execution counters. Unfinished
calls remain visible. Exact hidden sealing time, transmitted payload bytes,
full update instructions and actual production cycles burned are NOT_MEASURED.

All relevant positions, including underfunded and invalid-memo transfers, appear
in latency output. UNVERIFIED and VERIFIED_UNPUBLISHED records remain censored;
reported completed-sample percentiles are accompanied by unresolved counts.
Publication timestamps are first observations, not exact hidden seal times.

## Tariff and partial cost scope

Official references were retrieved 14 October 2026: [cycle costs](https://docs.internetcomputer.org/references/cycle-costs/),
[resource limits](https://docs.internetcomputer.org/references/resource-limits/) and
[cycles](https://docs.internetcomputer.org/concepts/cycles/). For 13 nodes: one cycle
per instruction, 5M per update, 260k per inter-canister request/response, 1,000 per
transmitted byte, 127k per GiB-second. One trillion cycles corresponds to one XDR.
No dated fiat conversion is supplied.

The model explicitly reuses compatible S12 query samples, with matching normal
Wasm, DTR and workload identities. It projects observed callback, completed-segment,
verified-page, initiated-call and archive counts independently. Empty/pending call
costs remain partial assumptions. Payload sizes and residual execution costs remain
assumed; timer dispatch, certification, full network decoding/awaiting, heap/code
storage and production service costs remain omitted. Repeating a finite window for
24 hours is hypothetical. Startup/archive calls and unfinished tails are included,
not asserted to be a steady-state rate. The sample range is not an upper bound.

The 40B update/timer instruction limit remains documented; full-update worst-case
headroom remains NOT_MEASURED. S13 does not turn S12's 342.37M warm eviction query
scope or 4.09M partial empty-poll scope into complete-update measurements.

## Historical boundaries

S12 evidence remains unchanged. Its manually driven 104–211 host-record/s fresh
samples, earlier approximately 385 host-record/s sample and 50-segment/464-virtual-
second simulation-only run retain their original scopes. Its 5-second combined
8/128 offered-record/s cases provide historical comparison, while new within-source
pairs govern the S13 recommendation. Real pinned upstream ledger/archive tests
remain separate functional compatibility evidence; the controlled fixture is not
proof of upstream throughput.

Previous successful CI 38640723588 at S12 commit 3f94ea05 is baseline evidence.
Remote CI for S13 is NOT_RUN. No remote Git operation occurred. No production
configuration was changed; no index was implemented; S14 was not started.

## Verification and retained failed attempts

Source verification at postprocessing revision `81b8846` passed 1,175 JavaScript and 135 Python tests,
including 19 focused S13 pair/provenance/cost checks and the existing S12 sensitivity
checks. Native workspace 18 and portable 7 tests passed; canister unit 8 passed.
Rust formatting/Clippy, locked normal Wasm, generated Candid comparison and actual
normal/test-hook export checks passed. Browser HTTP/native Web Crypto passed.
Installed-Wasm same-version regression passed 11 regular tests, including one-second
timers during delayed ledger/archive lease handling, stale fencing, fallback recovery,
backpressure, upgrades and real upstream ledger/archive/native/certificate checks.
The concurrent live observer/reconnect/anti-rollback/resynchronization and fresh
certificate snapshot browser checks passed.

Two initial harness mistakes remain recorded: synchronous hint calls completed a
scan before the deliberately delayed observation; native replay then tried to admit
a prefix larger than DTR's existing 256-record limit in one action. Both were fixed
only in test code. One early extended attempt was deliberately terminated during
that correction and recorded FAIL. The final matrix uses bounded 64-record native
replay and retains genuine saturation outcomes. No runtime defect was demonstrated.

Historical cross-version upgrade and remote-cloning clean-consumer preparation
were NOT_RUN in S13; stable schema and application Wasm are unchanged. Verified S12
CI and historical source-bound evidence remain applicable baseline evidence. DTR
standalone code and pins are unchanged; its S12 standalone results remain historical.
Remote CI for S13 is NOT_RUN.

## Interpretation rules

A rate is called sustainable tested only for the specific finite window and schedule.
The maximum backlog and queue size are maxima at sampled observations, not hidden
instantaneous peaks. One-second observation bounds are reported to milliseconds
for readability; nanosecond drift in raw PocketIC time is not real-world precision.
At overload, differing accepted histories also change game work. A smaller segment
count cannot by itself isolate CPU contention caused by polling.

The nominal fallback-only page-opportunity ceilings are 12.8 records/s at five
seconds and 64 at one second. Startup empty calls and window boundaries affect
observed averages; hints add opportunities and leases can coalesce them. These
ceilings are arithmetic, not production capacity or isolated processor limits.

## Findings and fixed-policy decision

At 8 records/s with hints, both policies verified all 1,024 arrivals and completed ten segments. Valid-payment discovery median/max improved from **1.5/3 seconds** to **0/0 at the observation resolution**, but publication stayed at **18.5/24 seconds**, with all four valid payments published. The next eligible checkpoint dominated these samples.

At 32 records/s with hints, one second verified **32 records/s**, five seconds **25.5**. Final backlog was **0/832**. Valid-payment publication medians were **19/29 seconds among completed samples**; **14/16 versus 11/16** valid payments were published. Without hints, rates were **32/12.5**, backlog **0/2,496**, and valid-payment publication completion **14/16 versus 6/16**. The five-second completed-sample median was 49.5 seconds, with ten valid payments still unresolved; it is not the full population's median. No-hints controls prove forward progress without notifications during these windows.

The initial-512-backlog control, with continuing eight arrivals/s and no hints, halved backlog in **4/30 seconds** and first reached zero in **9/85 seconds** at one/five-second fallback. Both published ten segments. Five seconds ended with the final 64-record arrival batch pending. These are measured recovery times, not a steady-state catch-up formula. The window-average verified rates of 12/11.5 records/s include the initial backlog and must not be called continuously sustainable arrival capacity.

At 128 offered records/s, one/five seconds verified **64/39 records/s**, accumulating **8,192/11,392** records. Backlog growth averaged **64/89 records/s** on the same virtual-time base; neither configuration drains under those observed rates. More than 98.8% of offered records were irrelevant, and contiguous verification still processed them. The result is compatible with configured page opportunities and serialized scanning. These tests do not isolate validation CPU, archive delay or real-network in-flight time as the binding cause. They demonstrate scheduling sensitivity and the remaining burden of scanning the full stream.

All first-trial 8/32-record/s primary counts, backlog and segment counts repeated exactly in trial two. Host elapsed time varied and has no deterministic performance gate. Both policies completed ten segments at 8/32 records/s, eleven at idle. At overload, one second completed nine versus ten at five seconds. Accepted input histories also differ, so that observed reduction cannot be attributed solely to polling CPU contention. Primary publication-spacing means were 11.5 seconds idle, 12.444 moderate, 12.333/12.111 higher, and 13.375/13.000 overload. Completed-segment callback min/mean/max and unfinished tails are in [game metrics](../evidence/S13/game-metrics.json); logical duration stayed two ticks and every simulation step used budget 512.

Stable memory was **25,231,360 bytes** at both ends of every case. Maximum sampled queue size was **21 canonical inputs**, and maximum retained publication/artifact bytes **108,264**, under three-publication/8 MiB retention. These are sample footprints, not worst-case limits. Heap high-water, complete-update instructions and verified worst-case instruction headroom remain **NOT_MEASURED**. All current source/run observations were error-free, and native replay checked **203 committed segments across twenty cases**, plus the guarded smoke pair. No duplicate published input position was accepted; records awaiting verification/publication remain explicitly unresolved.

The partial 13-node cost model gives **13.278–22.124T cycles/day** for one-second moderate service versus **12.278–21.123T** for five seconds. Matched-sample incremental estimates are **1.074T/day idle**, **1.001T moderate**, **1.317T higher**, and **2.244–2.514T overload** with hints. No-hints higher traffic adds **2.623T/day** because more records are processed. These increments include productive extra pages as well as empty calls. The model applies instruction tariffs to instruction terms, keeps storage and traffic independent of game cadence, and never treats zero arrivals as zero polling. Payloads and per-call update phase fees are assumptions, not measured full message counts. All-in cost and actual burned cycles remain unavailable.

**Use one second for this finite tested local configuration**, with 64-record batches every two seconds or slower, the stated game/retention settings and either tested hint policy. Five seconds remains a cheaper option for quiet/moderate traffic if its discovery and catch-up delay are acceptable. No production default was changed. The recommendation establishes neither long-term stability nor actual mainnet suitability. A faster fixed timer improves the tested scheduling limitation; it does not make 128-record/s full-ledger ingestion sustainable.

The next narrow decision is to evaluate whether a relevant-account history source can provide authoritative completeness and independent verification at traffic beyond this envelope. Assess archive continuity and rollback/fencing semantics before choosing it. Expected production traffic and actual network response delays are still unmeasured, so an index is not proven necessary for the 8/32-record/s local cases. No index, dynamic scheduler or S14 work was implemented.

The extended measurements remain bound to **b904ee638180d35b44fee44b0b6639aa29a307ac**. Postprocessing revision **81b8846** tightened workload/world/schedule/case checks and rejects a stalled source in traffic smoke. It revalidated all twenty traces and reproduced the cost output exactly; [validation record](../evidence/S13/postprocess-validation.json) distinguishes those revisions. Its guarded smoke pair and source suite passed **1,175 JavaScript / 135 Python**, including **19 focused S13 tests**. CI smoke reuses the existing local-integration harness build and skips historical instruction reuse; extended cost reuse remains fail-closed.

## Measured primary pairs

| Case | Offered/s | Hints | Fallback s | Verified/s | Final / max observed backlog | Ledger / archive / observed empty calls | Segments | Outcome |
|---|---:|---|---:|---:|---:|---:|---:|---|
| idle-r1 | 0 | alternating | 1 | 0.000 | 0 / 0 | 128 / 0 / 128 | 11 | OBSERVED_DRAINED |
| idle-r1 | 0 | alternating | 5 | 0.000 | 0 / 0 | 26 / 0 / 26 | 11 | OBSERVED_DRAINED |
| moderate-r1 | 8 | alternating | 1 | 8.000 | 0 / 0 | 128 / 2 / 112 | 10 | OBSERVED_DRAINED |
| moderate-r1 | 8 | alternating | 5 | 8.000 | 0 / 64 | 33 / 2 / 17 | 10 | OBSERVED_DRAINED |
| higher-r1 | 32 | alternating | 1 | 32.000 | 0 / 0 | 128 / 2 / 64 | 10 | OBSERVED_DRAINED |
| higher-r1 | 32 | alternating | 5 | 25.500 | 832 / 832 | 52 / 2 / 1 | 10 | OBSERVED_GROWING_BACKLOG |
| overload-r1 | 128 | alternating | 1 | 64.000 | 8192 / 8192 | 128 / 2 / 0 | 9 | OBSERVED_GROWING_BACKLOG |
| overload-r1 | 128 | alternating | 5 | 39.000 | 11392 / 11392 | 78 / 2 / 0 | 10 | OBSERVED_GROWING_BACKLOG |

## No-hints controls

| Case | Offered/s | Hints | Fallback s | Verified/s | Final / max observed backlog | Ledger / archive / observed empty calls | Segments | Outcome |
|---|---:|---|---:|---:|---:|---:|---:|---|
| no-hints-idle-r1 | 0 | none | 1 | 0.000 | 0 / 0 | 128 / 0 / 128 | 11 | OBSERVED_DRAINED |
| no-hints-idle-r1 | 0 | none | 5 | 0.000 | 0 / 0 | 26 / 0 / 26 | 11 | OBSERVED_DRAINED |
| no-hints-moderate-r1 | 8 | none | 1 | 8.000 | 0 / 0 | 128 / 2 / 112 | 10 | OBSERVED_DRAINED |
| no-hints-moderate-r1 | 8 | none | 5 | 7.500 | 64 / 64 | 26 / 2 / 11 | 10 | OBSERVED_BOUNDED |
| no-hints-higher-r1 | 32 | none | 1 | 32.000 | 0 / 0 | 128 / 2 / 64 | 10 | OBSERVED_DRAINED |
| no-hints-higher-r1 | 32 | none | 5 | 12.500 | 2496 / 2496 | 26 / 2 / 1 | 10 | OBSERVED_GROWING_BACKLOG |

## Fixed backlog recovery

| Case | Offered/s | Hints | Fallback s | Verified/s | Final / max observed backlog | Ledger / archive / observed empty calls | Segments | Outcome |
|---|---:|---|---:|---:|---:|---:|---:|---|
| backlog-r1 | 8 | none | 1 | 12.000 | 0 / 512 | 128 / 2 / 104 | 10 | OBSERVED_DRAINED |
| backlog-r1 | 8 | none | 5 | 11.500 | 64 / 512 | 26 / 2 / 3 | 10 | OBSERVED_BOUNDED |

## Repeated primary pairs

| Case | Offered/s | Hints | Fallback s | Verified/s | Final / max observed backlog | Ledger / archive / observed empty calls | Segments | Outcome |
|---|---:|---|---:|---:|---:|---:|---:|---|
| moderate-r2 | 8 | alternating | 1 | 8.000 | 0 / 0 | 128 / 2 / 112 | 10 | OBSERVED_DRAINED |
| moderate-r2 | 8 | alternating | 5 | 8.000 | 0 / 64 | 33 / 2 / 17 | 10 | OBSERVED_DRAINED |
| higher-r2 | 32 | alternating | 1 | 32.000 | 0 / 0 | 128 / 2 / 64 | 10 | OBSERVED_DRAINED |
| higher-r2 | 32 | alternating | 5 | 25.500 | 832 / 832 | 52 / 2 / 1 | 10 | OBSERVED_GROWING_BACKLOG |

## Partial daily cost comparison

| Pair | One-second T cycles/day | Five-second T cycles/day | Matched-sample incremental T/day |
|---|---:|---:|---:|
| idle-r1 | 12.904–21.479 | 11.830–20.404 | 1.074–1.074 |
| moderate-r1 | 13.278–22.124 | 12.278–21.123 | 1.001–1.001 |
| higher-r1 | 15.184–24.029 | 13.868–22.713 | 1.317–1.317 |
| overload-r1 | 17.457–26.573 | 15.213–24.059 | 2.244–2.514 |
| no-hints-idle-r1 | 12.904–21.479 | 11.830–20.404 | 1.074–1.074 |
| no-hints-moderate-r1 | 13.278–22.124 | 12.164–21.009 | 1.114–1.114 |
| no-hints-higher-r1 | 15.184–24.029 | 12.561–21.407 | 2.623–2.623 |
| backlog-r1 | 13.596–22.441 | 12.482–21.327 | 1.114–1.114 |
| moderate-r2 | 13.278–22.124 | 12.278–21.123 | 1.001–1.001 |
| higher-r2 | 15.184–24.029 | 13.868–22.713 | 1.317–1.317 |

Backlog daily rows explicitly repeat the fixed backlog every 128-second window; they are recurring-burst illustrations, not the bill for one recovery. [Recovery-window estimates](../evidence/S13/recovery-costs.json) separate the one-time observation. Monthly cycles/XDR and every independent instruction, callback, page, poll, xnet and storage term are in [cost results](../evidence/S13/extended/cost-projections.json). Negative increments reflect changed finite-window game histories/callback amortization; they are not proof of all-in savings.

## Input latency and unresolved records

| Case | Verification median / max s | Publication median / max s | Published / unpublished / unverified relevant records |
|---|---:|---:|---:|
| idle-r1-f1 | NOT_MEASURED / NOT_MEASURED | NOT_MEASURED / NOT_MEASURED | 0 / 0 / 0 |
| idle-r1-f5 | NOT_MEASURED / NOT_MEASURED | NOT_MEASURED / NOT_MEASURED | 0 / 0 / 0 |
| moderate-r1-f1 | 0.000 / 0.000 | 18.500 / 24.000 | 12 / 0 / 0 |
| moderate-r1-f5 | 1.500 / 3.000 | 18.500 / 24.000 | 12 / 0 / 0 |
| higher-r1-f1 | 0.000 / 0.000 | 19.000 / 27.000 | 42 / 6 / 0 |
| higher-r1-f5 | 14.000 / 26.000 | 29.000 / 38.000 | 33 / 6 / 9 |
| overload-r1-f1 | 31.000 / 62.000 | 46.000 / 71.000 | 78 / 18 / 96 |
| overload-r1-f5 | 43.000 / 87.000 | 60.000 / 93.000 | 54 / 6 / 132 |
| no-hints-idle-r1-f1 | NOT_MEASURED / NOT_MEASURED | NOT_MEASURED / NOT_MEASURED | 0 / 0 / 0 |
| no-hints-idle-r1-f5 | NOT_MEASURED / NOT_MEASURED | NOT_MEASURED / NOT_MEASURED | 0 / 0 / 0 |
| no-hints-moderate-r1-f1 | 0.000 / 0.000 | 18.500 / 24.000 | 12 / 0 / 0 |
| no-hints-moderate-r1-f5 | 1.500 / 3.000 | 18.500 / 24.000 | 12 / 0 / 0 |
| no-hints-higher-r1-f1 | 0.000 / 0.000 | 19.000 / 27.000 | 42 / 6 / 0 |
| no-hints-higher-r1-f5 | 39.000 / 75.000 | 49.500 / 83.000 | 18 / 3 / 27 |
| backlog-r1-f1 | 0.500 / 5.000 | 21.000 / 24.000 | 18 / 0 / 0 |
| backlog-r1-f5 | 14.000 / 32.000 | 27.000 / 56.000 | 18 / 0 / 0 |
| moderate-r2-f1 | 0.000 / 0.000 | 18.500 / 24.000 | 12 / 0 / 0 |
| moderate-r2-f5 | 1.500 / 3.000 | 18.500 / 24.000 | 12 / 0 / 0 |
| higher-r2-f1 | 0.000 / 0.000 | 19.000 / 27.000 | 42 / 6 / 0 |
| higher-r2-f5 | 14.000 / 26.000 | 29.000 / 38.000 | 33 / 6 / 9 |

These are all canonical incoming records, including rejection cases; valid-payment-only samples and p95 are separate in [summary](../evidence/S13/extended/summary.json). Every record and its censored status remain in each raw case.

## Reproduction and user-owned remote steps

```bash
cd /home/codexdev/src/btz
npm ci --ignore-scripts
DFX_IDENTITY=codex_local python3.11 -B tools/benchmark_s13.py --profile smoke --output .work/s13/review-smoke --harness-target tools/s09-integration/target
DFX_IDENTITY=codex_local python3.11 -B tools/benchmark_s13.py --profile extended --output .work/s13/review-extended --harness-target tools/s09-integration/target
git status --short
git branch --show-current
git log -6 --oneline
git diff 3f94ea05acbbf47b31ef9c6b366119e3eae3f422..HEAD --stat
# User only, after review:
git push -u origin checkpoint/s13-fallback-policy
```

Inspect and reconcile any remote divergence manually; never force-push. No remote Git command was executed by Codex.
