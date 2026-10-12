# Current status — S12

**BTZ has a reproducible local operating-envelope measurement checkpoint. The medium 32-ball workload ran autonomously for 50 consecutive segments, while canbench, controlled ledger backlogs, real upstream ledger/archive compatibility and a dated tariff model passed. Production promotion remains BLOCKED.**

The measured implementation is BTZ commit `58ed49a986824291b747affbeeab61cb4dc811fa` on `checkpoint/s12-operating-envelope`. DTR did not change: Rust remains pinned to `71e59e93cf49a3656689679b538b4c3f138787f8`; JavaScript remains `@dtr/timeline-runtime@0.11.0` at the reviewed package/integrity identity. The S11 extraction boundary and historical evidence remain unchanged.

S12 adds nine deterministic workload fixtures, two-budget authoritative equivalence checks, 20 canbench measurements, a bounded smoke/extended runner, a 50-segment normal-Wasm PocketIC trace, three controlled ledger backlog cases and a dated 13-node/34-node cost model. No public Candid, game rule, stable-memory ID, payment rule, publication format, retention bound, security check or DTR dependency changed.

The largest direct kernel measurements are 455.28M instructions for 32 balls and 1.662B for 64 balls. The complete coordinator paths are 1.007B and 2.742B. A production-shaped 512-work step plus persistence is 81.85M/113.33M, far below the conservative 20B half-limit criterion. Initial stable structures allocate 25,231,360 bytes and remained flat through 50 segments. The medium continuous run completed all 50 segments at a 20-second local target cadence with 5–15 callbacks/segment and no overlap, skipped interval, duplicate publication, queue growth or error.

The controlled paused-arrival ledger case sustained 373.13 records/s and drained 256 records through four ledger/two archive calls. A 32-record arrival per service opportunity drained; 80 versus a 64-record service page grew backlog from 256 to 304 and is retained as a saturation result. This is controlled PocketIC evidence, not mainnet or upstream-ledger throughput. The pinned real ledger/archive separately passed functional handoff and replay.

The full-ledger strategy is therefore **supportable only under narrow traffic assumptions**. Its production viability is not established because expected global ICP record rate, archive latency and actual production cycle burn are not measured. The recommended next decision is whether an upstream-supported relevant-account history source can preserve ledger authority, archive completeness and recovery while avoiding global irrelevant traffic.

The verified local continuous envelope is 16×8, 2 cannons, 32 starting balls, two logical ticks/segment, one-second pacing, work budget 512 and a 20-second target cadence. The single-segment 64-ball and 32-cannon fixtures passed but are not continuous-capacity promises. Modeled 13-node cost is 0.3066T cycles/day for the quiet assumption, 8.953T for the moderate assumption and 11.083T for the high legal-occupancy assumption; these are tariff projections, not observed burn.

See [the S12 report](checkpoints/S12_REPORT.md), [workload and reproduction guide](benchmarks/s12/README.md), [source-bound benchmark record](evidence/S12/benchmark-run.json), [continuous trace](evidence/S12/autonomous-trace.json), [ledger trace](evidence/S12/ledger-ingestion.json) and [cost projection](evidence/S12/cost-projections.json).

Remote S12 CI is **NOT_RUN**. The user owns all pushes and workflow invocation. No remote Git operation, public-network deployment, wallet/funds action, controller change, package publication or release was performed. S12 is the stopping point; S13 has not begun.
