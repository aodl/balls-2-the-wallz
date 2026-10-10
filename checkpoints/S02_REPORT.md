# S02 checkpoint report

Date: 2026-09-20. Predecessor: S01, identified by exact archive SHA-256 in CHECKPOINT.json.

## Delivery outcome

A substantial source/conformance checkpoint is delivered: shared staged execution and inbox recovery, actual command application through Life, a moving small-board BTZ reference, portable Rust primitives, independent reference fixtures, a restartable offline demo, and updated engineering disciplines. It is not a deployed or real-money game.

## Implemented and executed

**Shared host.** `SegmentJournal` separates prepare, resumable work, ready output and final publication. It binds source/rules/config/schema and previous commitments, fences stale proposals with revisions, and exposes only the committed head. Snapshots preserve hidden partial work; lost write acknowledgements reconcile without replaying an already published result. The generic journal imports no game kernel.

**Input handling.** `VerifiedInbox` atomically models cursor advancement and selected source effects, ignores no unverified gaps, bounds pending commands, and preserves a sealed reservation until matching gameplay publication is acknowledged. Backpressure rejects a whole proposed page rather than advancing and losing commands. Source authenticity and the production cutoff policy remain outside this model.

**Life.** Synthetic cell mutation commands apply in source order with deterministic receipts before evolution. The existing independent Life codec/reference tests are retained. Both Life and BTZ execute through the new shared journal.

**BTZ.** Balls really move in the headless simulator. Integer motion intercepts and exact fractional collision times avoid epsilon-based geometry. The slice supports all u16 headings through deterministic integer CORDIC; own-territory traversal; external and cannon reflection; capture; resumable graph connectivity; severed-region transfer; resident-ball deletion; last-ball cannon extinction and neutralization; exact-time opposing-ball annihilation; prototype nonlinear ANGLE pricing; MOVE; and area-time scores that survive elimination.

**Runtime tooling.** A local CLI saves its journal after completed host slices. Tests launch a second OS process to resume from inside a severance. Five synthetic scenarios provide reproducible demos. Local workload measurements record actual bytes and abstract work, never invented cycles.

## Important rule clarifications

A live anchor is unchippable. A cannon with no balls is removed. Ball deletion applies to the directly stolen cell as well as detached regions; otherwise a ball can remain in foreign territory.

Older cannon ordinal resolves exact competing-player ties. It cannot by itself define one ball's grid-corner behavior: compound corner rules now cap a hit at one chip and prohibit diagonal entry through a vertex into a foreign cell.

Segments are half-open: a collision exactly at the end is processed after the next checkpoint's commands. Splitting an input-free interval preserves final state. Complete input-bearing results are separately committed, and no presentation-time assumption enters the simulation.

The prototype annihilation window is **zero in time**, not the intended future near-simultaneous window. Position tolerance is implemented. Artificial genesis supplies initial cannons; spawning is not quietly replaced with a different user-facing mechanic.

## Rust evidence boundary

A sixth dependency-free workspace package, `btz-mechanics`, implements portable exact fractions, next-grid crossing, reflection, integer CORDIC and a resumable serialized connectivity search. Shared native geometry/cut fixtures and the vector emitter are wired into the existing Cargo gate.

Rust/Cargo are unavailable here, so none of this is claimed compiled, formatted, linted or native/Wasm-equivalent. The complete BTZ state machine and the new journal remain **executed JS references**, not a finished Rust arena. No Cargo.lock, Wasm or generated Candid is fabricated.

## Executed verification

The complete machine-readable report is [verification.json](../evidence/S02/verification/verification.json). Individual commands and stdout/stderr logs are retained there.

- 578 Node tests passed, with no failures, skips or cancellations. This includes 160 independently generated exact geometry cases, 192 union-find capture cases, analytical game scenarios, 24 mixed-trajectory restart/partition workloads, and the existing S01 tests.
- The heading test sweeps all 65,536 u16 values; this is one test, not 65,536 artificially counted tests.
- 34 Python tests passed, including actual separate-process restart and repository/evidence/package tooling tests.
- Protocol, Life and BTZ reference fixture regeneration checks passed without modifying the frozen fixtures during validation.
- Source-structure and documentation-link checks passed.
- Native Rust/format/Clippy, complete Wasm/Candid, PocketIC, live ledger/wallet, certification and operational-cycle gates remain BLOCKED.

Source-only success is not an overall release pass. The full check command reports **BLOCKED** and exits 2.

## Local workload evidence

[Actual local measurements](../evidence/S02/local-workload.json) cover duel, severance, corner, wall-bounce and a 32-ball/128-cell dense fixture. The dense case completed four logical ticks using 26,618 abstract work units, with 39,258 event bytes and a sampled maximum cursor snapshot of 43,691 bytes in that run.

These are reference-algorithm/data measurements, not instruction or cycle measurements. The snapshot maximum is sampled at 127-unit slice boundaries, not a proven maximum over every possible intermediate state. Elapsed time includes snapshot encoding and is one local Node run, not a mainnet throughput or latency claim. Pricing, caps and future buffer sizes must not be calibrated from it alone.

## Remaining work and next large checkpoint

S03 should bundle frontier/3x3 spawn admission, nonzero temporal-annihilation semantics, full Rust BTZ/reference parity, and measured performance changes against this baseline. The logical units and score representation need evaluation before production encoding is frozen. Keep the explicit runtime/inbox contract while wiring actual stable structures and live source calls later.

Still absent: a production ledger/archive adapter, canonical live cutoff scheduler, IC upgrade tests, certified/public observer, adaptive browser playback, monetary settlement and actual cycle burn/ETH-equivalent telemetry. No real-funds action is authorized.

## Reproduction

Run the commands in the [README](../README.md). `tools/package_checkpoint.py` produces a complete source ZIP with a file manifest and validates a fresh extraction. Freshly extracted source is rerun before delivery; repeated packaging of identical source is compared byte-for-byte. This verifies archive integrity/reproduction, not compiled-Wasm reproducibility.
