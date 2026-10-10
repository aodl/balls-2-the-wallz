# Porting and storage posture after S02

The executable reference fixes semantics before committing to a canister storage layout. Do not deploy it by mechanically serializing the entire world at every update.

## What the reference has established

Life and BTZ use the same prepare/step/ready/publish host without game imports in the host. Input application occurs before autonomous evolution and is included in canonical event receipts. Source inbox and runtime have separate monotonic frontiers with an explicit reservation/acknowledgement handoff. The test suite exercises hidden partially disconnected capture state and late/stale operation results.

## Rust port order

Keep exact geometry and simple graph reference algorithms until complete native/JS output parity exists. The new `btz-mechanics` crate already provides fractions, next crossing, reflection, CORDIC and a serialized cut-search cursor. It is uncompiled in this environment. Its snapshots are not the same format as the JS whole-world cursor, and no equivalence claim is made for that entire state machine.

Port the world invariants, command receipts, full batch/cascade rules and score accounting next. Freeze language-independent full-state/event/score vectors before replacing the JS typed-JSON reference with compact Rust encodings. Any change to rules or encoding requires a version boundary. Do not equate passing primitive tests with full Rust/JS parity.

## Expected performance work

Maintain per-owner area counters rather than rescanning every cell for each event. Separate authoritative collision/capture events from debug grid passages and coalesce constant-velocity trajectories. Replace repeated all-ball next-event scans only after tie/cascade semantics remain demonstrably unchanged. Introduce the local articulation precheck before considering chunked connectivity.

Profile exact-fraction numerator/denominator sizes and the cost of score accumulation, serialization, certification and replay. A fixed sub-tick scoring scheme is a possible alternative, but it changes authoritative rounding rules and cannot silently replace this baseline. Arbitrary time-window annihilation must not look ahead through walls that have already changed.

One bounded work unit may scan one cell or execute a bounded small-entity batch. The maximum entity counts bound those batch loops; work units are **not** instruction quotas. The eventual Rust host needs measured instruction-safe yield margins. A hard workload refusal must leave an explicitly recoverable halted/pending segment, not silently discard a paid input or publish an incomplete board.

## Prospective stable-memory allocation discipline

Before implementing stable structures, allocate and version a registry for: metadata/config/schema; committed head; verified inbox; reserved seals; staged kernel cursor; snapshots; event chunks; account scores/treasury records; settlement obligations. Assign non-overlapping stable MemoryIds only when actual schemas exist; no IDs have been allocated by S02's model.

Write durable progress incrementally. Commit a final head/root only after its referenced output chunks are available. Preserve source assignments, archived inputs needed for replay, rules/config history and earned obligations through upgrades. Ephemeral scheduling state may be rebuilt, but it must not reset durable operation generations or overwrite work that survives an upgrade.

The [official persistence guidance](https://docs.internetcomputer.org/guides/backends/data-persistence/) and [stable-memory skill](https://skills.internetcomputer.org/skills/stable-memory/) were re-reviewed on 2026-09-20. Their emphasis on stable structures is adopted; sample declarations and versions are not blindly copied or claimed to compile. The [inter-canister call guide](https://docs.internetcomputer.org/guides/canister-calls/inter-canister-calls/) motivates durable boundaries and fencing across asynchronous calls. S02 makes no claim that a file lock substitutes for canister message semantics.

## Verification beyond the reference

The Rust compiler, formatting, Clippy and native vectors must actually run. Then compile the kernel to Wasm, test the stable-memory adapter and upgrades under PocketIC, test real ledger/index/archive fixtures and evaluate certified query witnesses. Target-subnet benchmarks are separate from simulation-test execution: [PocketIC](https://docs.internetcomputer.org/guides/testing/pocket-ic/) is a deterministic canister testing environment, not a measurement of production consensus/network behavior.

Preserve the Jupiter-inspired distinction between effective configuration, source/build identity and operational evidence. No real-money deployment follows merely from the existence of a source ZIP.
