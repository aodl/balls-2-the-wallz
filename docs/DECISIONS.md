# Decision register — S04 (historical rows retained)

| ID | Current outcome | Evidence/remaining boundary |
|---|---|---|
| D-001 | Explicit seals, inbox reservations and publication acknowledgement | Pure model tested; production cutoff selection remains open. |
| D-003/004/005 | Funding-account identity and dual-transport memo remain S01 contracts | No new live ledger/archive or named-wallet proof. |
| D-006 | Spawn and capture scratch remain hidden; pending effects commit with the world | Node/separate-process evidence; IC stable-memory/upgrade work absent. |
| D-007 | Retain exact geometry and half-open intervals | v3 has causal nonzero fuse, not speculative future-path look-ahead. |
| D-008 | Exhaustive ranked 3x3 spawn with protected anchors, centres and connectivity | 72 independent fixtures; edge-weighted/predictable, not economically fair randomness. |
| D-009 | Account area-time and next cannon ordinal survive death/rejoin | Tested; prize liabilities/payout lifecycle still absent. |
| D-010 | Work metrics outside game state | Actual cycles and ETH-equivalent remain unavailable. |
| D-015 | Delegated spender is not owner command authority | S01 normalized adapter policy retained. |
| D-017 | Unreadable normalized envelope halts a stage | Different from a valid transfer with invalid memo and retained-payment receipt. |
| D-018 | Directly stolen cells destroy resident balls as well as detached-region balls | Preserved in v2/v3. |
| D-019 | Pair actual opposite hits through inclusive fuse; then process due effects | 132 analytical timing/score cases and multiball tests. |
| D-020 | Typed-JSON whole-world cursor is an offline reference format | Complete Rust stable/canonical cursor codec remains open. |
| D-021 | Fixture-label rules hashes are not source/Wasm attestation | Deployment build/config evidence still needed. |
| D-022 | Eight exhaustive spawn searches per segment; excess gets capacity rejection | Explicit test resource/economic rule, not absence of a location. |
| D-023 | At most one pending strike per ball | Short attack cooldown bounds effect storage; motion continues. |
| D-024 | Retain v2 source and reject silent v2/v3 migration | New world/rules/config schema and fresh demo journals. |
| D-025 | Exact large credit state is not narrowed to native i128 | Tested JS >128-bit case; native arbitrary-precision decision/implementation remains. |
| D-026 | Cached/full modes must commit identical bytes | Measured differential work reduction, not a mainnet capacity promise. |

See [ADR 0003](adr/0003-causal-strikes-and-safe-admission.md), [prior ADR 0002](adr/0002-reference-exact-geometry-and-journal.md), and [S00 decisions](../references/S00/docs/DESIGN_DECISIONS.md).

### D027 — Normalize committed input envelopes before kernel entry

Accepted for S03. Equivalent unsigned source positions and identical payload bytes
must yield identical kernel inputs, irrespective of adapter wrapper types or extra
metadata. Both generic hosts normalize the two committed fields. B2Z uses that
normalized batch for spawn entropy. Enforced in generic and full-game regression
tests; no change to historical source commitment bytes.

### S04 supersessions and additions

- D-006/D-020: portable Rust cursor source and actual IC stable-structure laboratory source now exist. Neither has executed; the generic journal's new chunk-backed recovery model is executed. Do not read historical "absent" as the current source inventory.
- D-025: accepted exact-pinned arbitrary-precision libraries in a separate native workspace; full bounded score precision preserved in authored source. Native equivalence remains an explicit gate.
- D-028: complete v3 native port must match all state/event/accounting bytes and bidirectional saved-work fixtures before promotion.
- D-029: chunk-root publication distinguishes durable partial work from committed game head; corruption never authorizes automatic rollback/reset.
- D-030: IC lab writes are single-message/no-await, with all fallible validation before write phase. It is controller-only and is not a permissionless production host.
- D-031: source-delivery completion and compiler/integration promotion remain separate; missing tools do not turn checks into passes.

See [ADR 0004](adr/0004-native-precision-and-persistence.md) and [native contract](specs/NATIVE_V3_CONFORMANCE.md).

## S05 supersessions and additions

- D-001/D-030: atomic v5 coordinator now combines input reservation, kernel progress and publication/retirement. Both JS games execute it; native generic source and controller-only runtime laboratory are authored but uncompiled.
- D-032: coordinator accepts only the complete supplied prefix; interior cutoff anchors and production ledger-time assignment are not invented.
- D-033: native host images must match the executed JS format and resume in both directions. Authored native toy-kernel tests do not substitute for execution.
- D-034: bounded flat artifact catalogs, not a new Merkle framework, are sufficient for the laboratory's <=1 MiB artifacts. Public queries expose committed data only.
- D-035: offline pinned content and certificate authentication are different modes. Missing production certificate verifier fails closed; labelled stubs are not cryptographic evidence.
- D-036: rollback/gap detection and presentation buffering are common client functions. Missing history triggers explicit snapshot recovery, never speculative authoritative playback.

See [ADR 0005](adr/0005-atomic-host-and-bounded-publication.md), [coordinator](specs/ATOMIC_COORDINATOR_V5.md) and [publication](specs/PUBLICATION_V5.md).

## S06 accepted simplifications (current)

- D-028/D-033 superseded: cross-language public outcomes and own-implementation recovery are required; identical private cursor/host bytes are optional historical port diagnostics.
- D-037: publication v6 excludes operational revision/ingestion; a bounded retained window permits old downloads until explicit eviction/resync.
- D-038: one direct typed coordinator replaces nested hot-path stores/validators; full boundary validation and outer atomic retirement/publication remain.
- D-039: versioned B2Z animation projection removes unchanged motion equations without changing the authoritative audit-event codec or game outputs.
- D-040: reviewed pinned standard dependencies are permitted; offline execution capability does not define product dependencies. One current IC lab, not multiple production candidates.

See [current contract](specs/SIMPLIFICATION_V6.md). Old private snapshots and archived sources remain evidence, not permanent implementation obligations.

## S08 execution record

- D-028/D-033's S06 supersession is now exercised: native public outcomes and native-own recovery pass; private cross-language cursor bytes remain optional diagnostics.
- The inherited Rust 1.94.1 candidate is retained after successful locked root/native tests, Clippy, formatting and runtime-lab Wasm compilation.
- The current runtime-lab remains the sole host candidate. Wasm compilation does not promote generated Candid, PocketIC upgrades, ledger authority or certificate verification to PASS.
- Real local HTTP/browser-native Web Crypto replaces the S07 placeholder on this host without weakening CSP or browser sandbox policy. Offline fixture mode remains separate evidence.
