# S03 porting and performance boundary

## Executed code versus authored Rust

The authoritative reference is the version-3 JavaScript kernel. It runs through the same game-agnostic journal as Life and the retained v2 test kernel. The reference's whole-document snapshots, local POSIX fsync and checksums do not constitute IC stable-memory or certified-query implementation.

The Rust `btz-mechanics` package adds `spawn` and `strikes` modules plus checked fractional operations and exact motion-position evaluation. Spawn search accepts canonically ranked candidates, verifies complete candidate identities, and yields during masked connectivity work. The host's fixed reviewed SHA-256 must generate those ranks; no public endpoint should accept a caller-selected ranking or protected-centre mask. The native tests include 72 independent fixtures and canonical rank preimages. Clone/step tests exercise the typed continuation shape, not a completed Rust binary cursor codec or IC upgrade.

The full Rust world, command interpreter, effect lifecycle, event codec, arbitrary-precision score accumulator and host journal port are still **not implemented**. Missing Cargo is separately a **verification blocker**, not an explanation that makes these absent features complete. Full JS traces are now frozen for the next porting stage.

## Numeric decision

The S02 native Fraction uses checked i128 and is suitable for the small bounded geometry calculations exercised by its fixtures. The JS authoritative score format supports substantially larger numerators/denominators. S03 explicitly tests existing credits exceeding signed 128-bit capacity. A full port cannot replace BigInt arithmetic with i128 and still claim conformance.

Prefer a reviewed arbitrary-precision rational implementation when a pinned dependency/build environment can be established. Do not invent a large custom bignum library merely to maintain the current registry-free demonstration. Alternatively, a fixed-subtick accounting rule is a protocol change requiring a new rules boundary, explicit rounding semantics and user review. S03 does not choose that change behind the user's back. No fabricated lockfile resolves this decision.

## Measured work improvements

[evidence/S03/local-workload.json](../../evidence/S03/local-workload.json) compares the same v3 rules with full area/cut scans versus area caching/local articulation prechecks. Both modes must return identical state, event and score hashes. The measurements include whole-cursor snapshot encoding every 127 abstract units.

Abstract work units are not instructions. Local elapsed times are a single-run diagnostic, not mainnet throughput, tail latency or cycles. Snapshot maxima are sampled, not exhaustive. The source currently bounds some loops with entity/cell limits, while a candidate sort or validation can still do more work than one BFS visit. A production host needs actual instruction-based profiling and appropriate safe-point margins.

Recent references re-reviewed on 2026-09-20:

- [IC resource limits](https://docs.internetcomputer.org/references/resource-limits/) motivate explicit bounded/resumable processing. No numeric limit is hard-coded from memory.
- [Official stable-memory skill](https://skills.internetcomputer.org/skills/stable-memory/) motivates durable incremental structures and separate storage regions, not serialization of an unbounded heap during upgrade. Its samples are not copied blindly or claimed compiled.
- [PocketIC guide](https://docs.internetcomputer.org/guides/testing/pocket-ic/) is the reference for subsequent actual canister tests; local Node behavior is not a substitute.

## Next substantial implementation bundle

Complete the native world/cursor/codec and numerical contract against the frozen traces, wire compile/native/Wasm gates where executable, and then implement the arena's stable-storage/source orchestration. Do not let spawning/annihilation confidence substitute for live ledger, wallet, archive, certification, monetary settlement or cycle telemetry evidence. No real-value launch or deployment is authorized.
