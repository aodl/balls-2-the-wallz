# S12 operating envelope, ledger throughput and projected costs

12 October 2026. **The existing implementation is locally viable inside a bounded, directly tested envelope. Ball density and repeated whole-image persistence/publication dominate compute. Full-ledger scanning is supportable only under narrow, controlled traffic assumptions; expected production traffic and real cycle burn remain unmeasured. Production readiness remains BLOCKED.**

## Provenance and scope

The clean source-bound extended run used BTZ commit `524807a394f80e0e38db163c3e726e8e992c802f` (tree `d9846e2e85e7be78aa5cd0b29a711035765de828`) on `checkpoint/s12-operating-envelope`, rooted in the clean S11 evidence head `a823a3c7d0802daaf5a0c4be6a4034cb1f54cdf9`. Rust still consumes `https://github.com/aodl/dtr.git` at exact revision `71e59e93cf49a3656689679b538b4c3f138787f8`. JavaScript still consumes `@dtr/timeline-runtime@0.11.0`, SHA-256 `dc460b1a5349f022d0ba789fd7e647271f41402de2e57a9c8c4ba860834a4bf8`, npm integrity `sha512-lql0NVgK93P26YRvjhfiCXBIK4ZKJ68F0CZBPCrxZAR0+OqMkxROoheOnLtVy8VcTgbiwGz5S1dVxG5vgLIp6w==`. DTR did not change.

The source-bound run used Linux 6.8.0-1030-azure/x86_64, an Intel Xeon Platinum 8272CL host with 2 visible CPUs and 8,325,529,600 bytes of memory, Rust/Cargo 1.94.1, Python 3.11.14, Node 24.15.0, npm 11.12.1, canbench 0.7.0 and PocketIC 16.1.0. `package-lock.json` was `3bb32e0e…`; the runtime Cargo lock was `4fa6c6de…`. The normal S12 Wasm was 2,238,605 bytes with SHA-256 `4a0e1673612523b690bd45b7c30ca490bc35c422831cb4391f22653dc8096293`; test-hook Wasm was 2,264,096 bytes with SHA-256 `0ab60a381e6c587e28720c5369dd53bc73ce291218a0efef28a9066546cbb31d`; generated Candid identity was `587bddc30097bbbcbe732818b084c98c721292fe38f994898a8ecc145675352c`. Wasm reproducibility is not claimed.

No game rule, stable-memory ID, public Candid method, payment interpretation, publication v6 field, animation v1 field, audit event, scoring rule, certificate check, retention limit or DTR dependency identity changed. Instrumentation is feature-gated; normal Candid explicitly rejects canbench/tracing/test exports. No remote Git operation, public deployment, package publication, wallet action or real-value transfer occurred.

## Tested configurations

The S12 fixture is generated, source-controlled and checked byte-for-byte. Every workload ran with work budgets 1 and 100,000 and produced identical state, event, score and ownership hashes. The current legal limits remain 32×32/1,024 cells, 32 cannons, 64 balls, 32 balls per cannon, 4,096 sealed inputs, 64 ticks per segment, 8 spawn searches and 131,072 audit events.

| Workload | Players/cannons | Balls | Work/segment | Wasm instructions | Heap growth | Stable growth | Published state/events/scores | Outcome |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Small reference | 2 | 2 | 849 | 16,852,473 kernel | 1 page | 0 | 1,067 / 3,664 / 282 B | PASS |
| Empty motion | 1 | 1 | 253 | 8,973,008 kernel | 4 pages | 0 | 590 / 7,431 / 152 B | PASS |
| Dense medium | 2 | 32 | 7,138 | 455,281,320 kernel; 1,007,115,272 coordinator | 22 / 27 pages | 0 | 4,129 / 39,928 / 299 B | PASS |
| Dense high | 2 | 64 | 22,947 | 1,661,578,160 kernel; 2,741,602,784 coordinator | 46 / 56 pages | 0 | 7,307 / 80,017 / 293 B | PASS |
| Many-cannon frontier | 32 | 32 | 360 | 15,478,878 kernel; 276,799,967 coordinator | 3 / 7 pages | 0 | 11,162 / 7,582 / 3,963 B | PASS |
| Fragmentation/severance | 2 initial, 1 final | 2 initial, 1 final | 87 | NOT_MEASURED in canbench | NOT_MEASURED | NOT_MEASURED | 691 / 748 / 276 B | PASS |
| Collision intensive | 2 initial, 0 final | 2 initial, 0 final | 74 | NOT_MEASURED in canbench | NOT_MEASURED | NOT_MEASURED | 511 / 815 / 279 B | PASS |
| Spawn/admission pressure | 6 final | 6 final | 19,556 | NOT_MEASURED in canbench | NOT_MEASURED | NOT_MEASURED | 4,216 / 9,107 / 784 B | PASS |

One canbench page is 64 KiB. Heap values are growth during the benchmark, not peak heap. Stable zero in kernel/coordinator rows is expected because those measurements do not invoke persistence. Initial persistence grew 385 stable pages (25,231,360 bytes) in each measured occupancy due to stable-structure allocation; PocketIC reported exactly 25,231,360 bytes at segments 0, 10, 20, 30, 40 and 50.

## Compute

Ball density is the largest simulation driver. Moving from the two-ball reference to 32 balls raised direct kernel instructions from 16.85M to 455.28M; 64 balls required 1.662B. The 64-ball kernel was 3.65× the 32-ball kernel. The 32-cannon/32-ball frontier was inexpensive by comparison (15.48M kernel instructions), so player count alone is not a capacity predictor; trajectories, crossings, topology and audit output matter.

Coordinator restore/snapshot, hashing and publication are material. The 32-ball coordinator total was 1.007B, including 729.83M in coordinator steps and 277.29M in publication commit, versus 455.28M in the direct kernel. The 64-ball coordinator total was 2.742B. A seal proxy cost 22.04M.

The production-shaped `Step(512)` plus persistence benchmark used 81.85M instructions for the medium workload and 113.33M for the high workload. The latter is 0.283% of the current 40B update-message limit and 0.567% of the report's conservative 20B half-limit criterion. This is direct local instruction evidence for a meaningful callback, not a mainnet throughput guarantee.

## Persistence and publication

Completed-state snapshot/publication/stable writes used 10.04M instructions for small, 13.08M for empty motion, 47.61M for medium, 83.57M for high and 26.66M for the many-cannon frontier. `certified_data_set` is update-only and cannot run in canbench's non-replicated query; that individual system-call cost is therefore `NOT_MEASURED`. Normal PocketIC execution retained genuine certification.

The 50-segment run reached a maximum current publication plus artifacts of 30,581 bytes and a maximum three-publication retained window of 89,430 bytes. Stable length did not grow beyond 25,231,360 bytes. The large initial 385-page allocation is the observed storage high-water bottleneck; recurring byte payload, not further stable growth, dominated the tested window. Heap high-water remains `NOT_MEASURED`; canbench reports only per-operation growth.

## Ledger ingestion

The canbench classifier/anchor cost for one 64-record page was 1,407,764 instructions when all records were irrelevant, 1,476,571 with one relevant input and 5,823,603 when all were relevant. Relevant-input density therefore affects CPU even though the full-ledger design must receive and validate every record.

The controlled PocketIC fixture deliberately mixed overwhelmingly irrelevant transfers with valid, underfunded and invalid-memo incoming transfers, and alternated direct and archive pages:

| Arrival case | Processed | Calls (ledger/archive) | Received Candid bytes | Final backlog | Local rate, min/median/max | Outcome |
|---|---:|---:|---:|---:|---:|---|
| Paused | 256 | 4 / 2 | 38,356 | 0 | 384.89 / 418.32 / 656.98 records/s | DRAINED |
| 32 arrivals/service opportunity | 448 | 7 / 3 | 67,016 | 0 | 379.20 / 403.21 / 705.76 records/s | DRAINED |
| 80 arrivals/service opportunity | 512 | 8 / 4 | 76,712 | 304 (from 256) | 405.39 / 423.42 / 681.29 records/s | SATURATED_BOUNDED_RUN |

The third case is an intentional retained failure: a 64-record service page cannot catch 80 new records per service opportunity. The rates are local controlled-fixture wall times including fixture changes; they are not proof of upstream ledger or mainnet throughput. The pinned real ledger/archive Wasm separately passed transfer, archive handoff, contiguous cursor and native replay, but that upstream-compatible test was functional rather than a large throughput trial. Existing delayed call, rejection, malformed reply, dropped hint, inbox backpressure and interrupted-scan tests remain in the full regression suite.

The cost model deliberately selects the minimum of three paused-arrival samples as controlled `mu = 384.891 records/s`. For `B = 4,096`, the simplified estimate is 10.64 seconds at `lambda = 0`, 21.28 seconds at `lambda = 192.45 records/s`, and non-draining at `lambda = 423.38 records/s`. Observed overload traces agree with the sign of that model. A conservative 50% controlled-fixture margin is therefore `lambda <= 192 records/s`, but this is not a production recommendation because real ICP aggregate traffic, reply latency and archive distribution were not measured.

**Decision: the full-ledger scan is supportable only under narrow traffic assumptions.** Evidence is insufficient to compare its controlled `mu` to expected global ICP traffic, and every irrelevant global block creates communication, validation and persistence cost. The next milestone should evaluate one upstream-supported relevant-account history/index path for authority, archive completeness, rollback behavior and trust before implementing it; S12 does not add that path.

## Continuous execution and fairness

One authorized start advanced the normal application Wasm for 50 consecutive segments. The harness issued no individual Seal, Step or Publish command. With two logical ticks/segment, one-second timer pacing, work budget 512 and a declared 20-second local target cadence, it completed in 464 callback opportunities/virtual seconds and 95.95 host seconds. Every segment was unique and contiguous; callbacks/segment ranged 5–15, work ranged 1,400–6,244, and maximum work in a callback was exactly the 512 bound. All 50 publications were on time; the first committed at virtual second 14 (6 seconds ahead), and no later segment lost that headroom. There was no overlap, skip, duplicate publication, queue growth or runtime error.

The one captured synthetic input at source position 0 was discovered and verified at virtual second 0, sealed at second 1 and assigned exactly once to segment 0. That proves local sealed-prefix behavior only. Actual ledger discovery-to-assignment timestamps were `NOT_MEASURED`; the backlog estimates show the potential delay before discovery. Competitive fairness under production ledger backlog remains a later design decision, not an S12 fairness claim.

## Projected operating costs

Tariffs were retrieved on 2026-10-12 from the official [cycle-cost table](https://docs.internetcomputer.org/references/cycle-costs/), [resource limits](https://docs.internetcomputer.org/references/resource-limits/) and [cycles overview](https://docs.internetcomputer.org/concepts/cycles/). The 13-node model uses 5M cycles/update, 1 cycle/Wasm instruction, 260k per inter-canister request/response, 1,000 cycles/transmitted byte and 127k cycles/GiB-second. The 34-node comparison scales by 34/13. One trillion cycles equals one XDR. No USD conversion is supplied.

The model conservatively applies the completed-state persistence measurement to every callback and adds a 10% allowance for unmeasured execution/certification variation. It uses measured response bytes plus an explicit 32-byte request assumption, zero compute allocation and the measured stable allocation. It does not claim actual production burn.

| Scenario | Segment | 13-node cycles/day | XDR/day | 34-node cycles/day |
|---|---:|---:|---:|---:|
| Quiet existing ball, 60 s, no ledger traffic | 212.92M | 306.60B | 0.3066 | 801.88B |
| Moderate 32-ball, 20 s, 1 record/s | 2.072B | 8.953T | 8.9526 | 23.414T |
| High 64-ball, 60 s, 1 record/s | 7.696B | 11.083T | 11.0827 | 28.986T |
| 32-player frontier, 20 s, 1 record/s | 447.58M | 1.934T | 1.9336 | 5.057T |
| Quiet game, 20 irrelevant records/s | 906.89M | 1.306T | 1.3059 | 3.415T |
| Continuous controlled-`mu` catch-up bound | 13.568B | 19.538T | 19.5381 | 51.100T |

At fixed moderate segment work, modeled 13-node cost is 17.905T cycles/day at 10 seconds, 8.953T at 20 seconds and 2.984T at 60 seconds. Scan cost grows from 49.97B cycles/day at 1 ledger record/s to 999.32B at 20/s and 19.231T at controlled `mu`. An additional fully used 8 MiB retention window contributes only about 85.7M storage cycles/day on 13 nodes, so compute/persistence and scan traffic dominate this model.

Measured locally, tariff estimates and unavailable values are separate fields in `evidence/S12/cost-projections.json`. Actual production cycle burn, mainnet finality/availability, heap high-water, query/gateway infrastructure, exact request bytes, cycle balance and ETH-equivalent compute are `NOT_MEASURED`.

## Conservative tested envelope

The recommended **verified local** envelope is:

- Existing 16×8 medium fixture geometry (128 cells), 2 concurrent cannons and 32 starting balls.
- Two fixed logical ticks per segment; one-second callback pacing; 512 work units/callback.
- A 20-second local target segment cadence. The 50-segment run used 5–15 callbacks and stayed on time.
- At most 8 spawn searches and a tested 10-command pressure batch; capacity/underfunded outcomes remain authoritative receipts rather than hidden drops.
- Source pages of 64 records; controlled incoming traffic at no more than half the conservative measured paused-arrival throughput (about 192 records/s) only as a laboratory guardrail.
- Expected current publication plus artifact payload no more than the observed 30,581 bytes and retained window no more than the observed 89,430 bytes for this continuous workload.
- Stable high-water 25,231,360 bytes and modeled moderate 13-node cost about 8.953T cycles/day under the stated conservative assumptions.

These limits are directly tested together except the 192 records/s traffic guardrail, which is an analytical margin over a separately controlled ledger fixture. The 64-ball and 32-cannon cases are directly tested for single segments, but not for 50 continuous segments; they are not the recommended continuous envelope. Board sizes beyond 16×8, different geometry, production latency/cycles and mixed high player/high ball populations are unverified or extrapolated.

No tested per-message compute value approaches half the 40B update limit: the largest production-shaped 512-work callback was 113.33M. The operational limit observed first is cadence/cost amplification from repeated whole-image persistence and publication, followed by full-ledger communication—not the hard instruction ceiling.

## Verification and status

The bounded extended runner passed deterministic fixtures, 20 canbench measurements, normal Wasm, a precompiled PocketIC harness, 50 autonomous segments, three repetitions of each controlled ledger backlog case, real upstream ledger/archive handoff and the tariff model. The fast smoke tier passed the complete fixture matrix plus measured medium-callback and irrelevant-ledger-page canbench cases and is wired into normal CI. Final regression results were 1,175/1,175 Node tests, 93 Python tests, 18 workspace plus 7 portable Rust tests, normal Wasm/Candid/format/Clippy, and 10 same-version PocketIC tests PASS. The standalone and concurrent browser gates are `BLOCKED` locally because the approved Chromium cannot load the absent host library `libatk-1.0.so.0`; the unchanged browser path's S11 remote PASS remains run 38208721952. DTR remained unchanged; its retained clean baseline passed 186 JavaScript and 29 Rust tests. Remote S12 CI is `NOT_RUN`: the user owns all push/workflow actions.

Machine-readable evidence:

- `benchmarks/s12/workloads.json` and `benchmarks/s12/canbench_results.yml`
- `evidence/S12/benchmark-run.json`
- `evidence/S12/game-compute.json`
- `evidence/S12/autonomous-trace.json`
- `evidence/S12/ledger-ingestion.json`
- `evidence/S12/cost-projections.json`
- `evidence/S12/regression-summary.json`

Reproduce the smoke and extended tiers using `benchmarks/s12/README.md`. S12 stops here. The single recommended next technical decision is whether an upstream-supported relevant-account history source can preserve ledger authority and archive-complete recovery while removing the global irrelevant-traffic cost. Do not begin that change without a separate milestone.
