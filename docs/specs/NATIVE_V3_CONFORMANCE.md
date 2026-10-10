> Historical checkpoint contract. Conflicting S06 requirements are superseded by [the current simplification contract](SIMPLIFICATION_V6.md).

# Native BTZ v3 conformance — S04

Status: complete gameplay **source port authored**, not compiled or proven equivalent. The executed JavaScript S03 implementation remains the behavioral reference. S04 changes neither game rules nor canonical v3 state/event/score formats.

## Workspace and authority

The original root workspace remains six registry-free local packages. A separate `native/` workspace contains `dtr-wire`, `btz-native` and `native-conformance-v4`. The wire crate is game-independent; the BTZ crate owns all physics, admission, ordering, pending impacts, topology and score rules. No IC or ambient-time dependency belongs in either. The native vector executable reads local fixtures; it does not operate a game service.

`dtr-wire` uses exact-pinned serde/serde_json, num-bigint/num-rational/num-traits and SHA-256. This avoids writing an incidental big-integer engine. Direct pins are candidate inputs, NOT a resolved/audited dependency tree. There is no manufactured Cargo.lock. See [ADR 0004](../adr/0004-native-precision-and-persistence.md).

## Exact wire contract

Preserve S03 canonical typed JSON: ASCII identifier object keys in lexical order, safe ordinary integer values, explicit `{"$integer":"decimal"}` tags, exact reduced fractions as two tagged integers, canonical UTF-8 and exact re-encoding on input. Whitespace, duplicate keys, unordered keys, untagged unsafe numbers, malformed tags and unreduced fractions fail rather than normalize into another committed byte string.

Whole canonical artifacts are bounded at 16 MiB, depth 48 and 300,000 nodes. Tagged integers have the inherited 1,000-character ceiling. Valid persisted world fractions retain the S03 900-character numerator/denominator limits. Arbitrary precision here means no i128/u128 truncation **within that bounded protocol**, not unlimited allocation. Transient rational operations are not prematurely narrowed to the world limit.

`btz-native::Cursor::begin(state_bytes, inputs, context)` validates identity and normalized source order. `step(budget)` produces bounded logical work; it does not measure Wasm instructions. `snapshot()` serializes the same v3 continuation structure, including topology and spawn subphases. `restore(bytes, trusted_hash)` checks integrity, structural bounds and exact schema roundtrip. The hash must come from trusted durable metadata, not an attacker supplying both data and its checksum.

Topology scratch may be disconnected while a capture is incomplete. Applying final-world connectivity validation indiscriminately to every intermediate cursor would reject valid recovery points. Full state validation is required at resolved phases and publication. A failed step must be discarded and reloaded from the durable cursor; callers must not persist a partially mutated local object after an error.

## Implemented source coverage

The Rust port includes world codecs/invariants; command decoding, retained-payment receipts and active-ball prices; integer direction generation; exhaustive hash-ranked protected 3x3 spawn; exact crossings and corners; area accrual; actual-hit pairing and delayed chips; flood/transfer/elimination; semantic events; final accounting and full cursor codecs. Existing root `btz-mechanics` supplies the heading primitive. No gameplay placeholder delegates native simulation to JavaScript.

This is **not yet the complete native DTR host**. Generic seals, ledger ingestion and journal orchestration remain their prior models; the IC laboratory below is a deliberately narrow BTZ adapter. Public ledger/account validation, certification and monetary settlement are still absent.

## Native gate, not self-certification

Seven complete S03 trace fixtures specify initial state, inputs, context and every final output byte. Seventy frozen JavaScript snapshots cover reached phase/subphase combinations across those scenarios. They are implementation-derived regression targets, not independent correctness proofs.

An independent Python `fractions.Fraction` generator supplies 144 large signed arithmetic cases, including values far above 128 bits. The executed JavaScript implementation passes those cases. Once Cargo is available, `tools/verify_portable_native.py` must execute the native runner and check **221 rows** (7 complete traces + 70 imported continuations + 144 arithmetic cases), rejecting missing/extra results. It then requests four actual Rust-produced intermediate snapshots and resumes each in JavaScript against the complete golden result. Native unit replay tests are also authored, not run here.

This is stronger than comparing hashes from two invocations of the same executable. Nevertheless passing these fixtures would establish conformance for the covered cases, not a formal proof or production performance.

## Remaining native promotion gates

Generate a real lockfile; compile and fix compiler errors; run rustfmt/Clippy; run actual unit/conformance tests; audit dependencies/licenses; build Wasm; compare generated Candid for the laboratory; run upgrade/trap tests in PocketIC; measure actual Wasm instruction usage and artifact growth. None may be replaced by source inventory checks.
